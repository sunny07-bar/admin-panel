"use client";

import React, { useState, useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid"; // Keeping just in case, but unused for main flow
import interactionPlugin from "@fullcalendar/interaction";
import {
  EventContentArg,
  DatesSetArg,
  EventClickArg,
} from "@fullcalendar/core";
import { createClient } from "@/lib/supabase/client";
import { format, isSameDay } from "date-fns";
import ReservationList from "./ReservationList";

interface ReservationCalendarProps {
  initialDate?: Date;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    area?: string;
    status?: string;
    guests?: number | string;
    email?: string;
    phone?: string;
    customerName?: string;
    isSummary?: boolean;
    date?: string;
    colorData?: any;
    formattedTime?: string;
  };
  display?: string;
  classNames?: string[];
}

const AREA_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  "Restaurant": {
    bg: "#2563EB",
    border: "#1D4ED8",
    text: "#FFFFFF",
    label: "Restaurant"
  },
  "Stage Bar": {
    bg: "#9333EA",
    border: "#7E22CE",
    text: "#FFFFFF",
    label: "Stage Bar"
  },
  "Middle Bar": {
    bg: "#D97706",
    border: "#B45309",
    text: "#FFFFFF",
    label: "Middle Bar"
  },
  "default": {
    bg: "#4B5563",
    border: "#374151",
    text: "#FFFFFF",
    label: "Other"
  },
};

const getStatusIndicator = (status?: string) => {
  switch (status) {
    case 'confirmed': return { emoji: '✅', color: 'text-green-600', label: 'Confirmed' };
    case 'pending': return { emoji: '⏳', color: 'text-yellow-600', label: 'Pending' };
    case 'cancelled': return { emoji: '❌', color: 'text-red-600', label: 'Cancelled' };
    case 'completed': return { emoji: '🏁', color: 'text-blue-600', label: 'Completed' };
    case 'no_show': return { emoji: '🚫', color: 'text-red-600', label: 'No Show' };
    default: return { emoji: '❓', color: 'text-gray-400', label: 'Unknown' };
  }
};

export default function ReservationCalendar({ initialDate }: ReservationCalendarProps) {
  const supabase = createClient();
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [allReservations, setAllReservations] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentViewType, setCurrentViewType] = useState<string>("dayGridMonth");

  const fetchReservations = async (start: Date, end: Date) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .gte("reservation_date", format(start, "yyyy-MM-dd"))
        .lte("reservation_date", format(end, "yyyy-MM-dd"));

      if (error) throw error;
      setAllReservations(data || []);
    } catch (error) {
      console.error("Error fetching reservations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!allReservations.length) {
      setEvents([]);
      return;
    }

    if (currentViewType === "dayGridMonth") {
      // Month View Aggregation
      const summaryMap = new Map<string, { [key: string]: number }>();

      allReservations.forEach(res => {
        const date = res.reservation_date;
        const area = res.area || "Unknown";

        if (!summaryMap.has(date)) {
          summaryMap.set(date, {});
        }
        const dayCounts = summaryMap.get(date)!;
        dayCounts[area] = (dayCounts[area] || 0) + (res.guests_count || 0);
      });

      const summaryEvents: CalendarEvent[] = [];
      summaryMap.forEach((counts, date) => {
        Object.entries(counts).forEach(([area, count]) => {
          const colors = AREA_COLORS[area] || AREA_COLORS["default"];
          summaryEvents.push({
            id: `summary-${date}-${area}`,
            title: ``,
            start: date,
            backgroundColor: colors.bg,
            borderColor: colors.border,
            textColor: colors.text,
            extendedProps: {
              isSummary: true,
              area: area,
              guests: count,
              date: date
            },
            display: 'block'
          });
        });
      });
      setEvents(summaryEvents);

    } else {
      // Logic for TimeGrid / Detail views
      const detailEvents: CalendarEvent[] = allReservations.map((res) => {
        const startDateStr = `${res.reservation_date}T${res.reservation_time}`;
        const startDate = new Date(startDateStr);
        // End date irrelevant for list view sorting usually, but good to have valid
        const endDate = new Date(startDate.getTime() + 60 * 60000);

        const area = res.area || "default";
        const colors = AREA_COLORS[area] || AREA_COLORS["default"];
        const formattedTime = format(startDate, 'h:mm a');

        return {
          id: res.id,
          title: `${res.customer_name} (${res.guests_count})`,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          // List view often ignores bg color for the row, but we use it for our dot/border
          backgroundColor: colors.bg,
          borderColor: colors.border,
          textColor: colors.text,
          extendedProps: {
            isSummary: false,
            area: res.area || "Unknown Area",
            status: res.status,
            guests: res.guests_count,
            email: res.customer_email,
            phone: res.customer_phone,
            customerName: res.customer_name,
            date: res.reservation_date,
            colorData: colors,
            formattedTime: formattedTime
          },
        };
      });
      setEvents(detailEvents);
    }

  }, [allReservations, currentViewType]);

  const handleDatesSet = (arg: DatesSetArg) => {
    setCurrentViewType(arg.view.type);
    fetchReservations(arg.start, arg.end);
  };

  const handleEventClick = (info: EventClickArg) => {
    if (info.event.extendedProps.isSummary) {
      const dateStr = info.event.extendedProps.date;
      if (dateStr) {
        // Parse date string (YYYY-MM-DD) to Date object in local time
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        setSelectedDate(date);
      }
    } else {
      // Handle individual event click if needed
    }
  };

  const renderEventContent = (eventInfo: EventContentArg) => {
    const props = eventInfo.event.extendedProps;

    // Month View Summary Chip
    if (props.isSummary && eventInfo.view.type === 'dayGridMonth') {
      return (
        <div className="flex items-center justify-between w-full px-2 py-1 overflow-hidden h-full">
          <span className="font-semibold text-xs truncate text-white">{props.area}</span>
          <span className="font-bold text-xs bg-white/20 px-1.5 rounded-full min-w-[1.25rem] text-center text-white">
            {props.guests}
          </span>
        </div>
      )
    }

    const isTimeGrid = eventInfo.view.type.startsWith('timeGrid');

    const statusInfo = getStatusIndicator(props.status);
    const colors = props.colorData || AREA_COLORS['default'];

    if (isTimeGrid) {
      // Compact Block for Week View (TimeGrid)
      return (
        <div className="flex flex-col h-full w-full overflow-hidden p-0.5" style={{ fontSize: '0.75rem' }}>
          <div className="flex items-center gap-1 min-w-0">
            <span className="font-bold truncate" style={{ color: colors.text }}>
              {props.customerName}
            </span>
            {props.area && (
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colors.bg }}></span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[0.7rem] opacity-90 truncate" style={{ color: colors.text }}>
            {props.formattedTime} • 👥 {props.guests}
          </div>
        </div>
      );
    }

    return null;
  };

  useEffect(() => {
    if (selectedDate && calendarRef.current) {
      const api = calendarRef.current.getApi();
      api.gotoDate(selectedDate);
    }
  }, [selectedDate]);

  return (
    <div className="space-y-4">
      {/* Day View (Detailed Drill-Down) */}
      {selectedDate && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedDate(null)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                ← Back to Month
              </button>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {format(selectedDate, 'MMMM d, yyyy')}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate(prev => prev ? new Date(prev.setDate(prev.getDate() - 1)) : null)}
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Previous Day"
              >
                ← Previous
              </button>
              <button
                onClick={() => setSelectedDate(prev => prev ? new Date(prev.setDate(prev.getDate() + 1)) : null)}
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Next Day"
              >
                Next →
              </button>
            </div>
          </div>

          <ReservationList
            selectedDate={selectedDate}
            reservations={allReservations.filter(res => res.reservation_date === format(selectedDate, 'yyyy-MM-dd'))}
            onRefresh={() => {
              if (calendarRef.current) {
                const api = calendarRef.current.getApi();
                fetchReservations(api.view.currentStart, api.view.currentEnd);
              }
            }}
          />
        </div>
      )}

      {/* Month View (Calendar) - Hidden when date selected, but kept mounted for API access */}
      <div className={selectedDate ? "hidden" : "block space-y-4"}>
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Areas:</span>
          {Object.entries(AREA_COLORS).map(([area, colors]) => {
            if (area === 'default') return null;
            return (
              <div key={area} className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-md shadow-sm"
                  style={{ backgroundColor: colors.bg }}
                />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{colors.label}</span>
              </div>
            )
          })}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 shadow-sm calendar-wrapper">
          <style jsx global>{`
            .fc-theme-standard .fc-scrollgrid { border: none; }
            .fc-theme-standard td, .fc-theme-standard th { border-color: #f3f4f6; }
            .dark .fc-theme-standard td, .dark .fc-theme-standard th { border-color: #374151; }
            .fc-list { border: none !important; }
            /* Remove end time from TimeGrid event text if standard rendering used */
            .fc-event-time { font-weight: bold; }
          `}</style>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth",
            }}
            buttonText={{
              today: "Today",
              month: "Month",
            }}
            selectable={true}
            dateClick={(arg) => setSelectedDate(arg.date)}
            navLinks={true}
            navLinkDayClick={(date) => setSelectedDate(date)}
            events={events}
            datesSet={handleDatesSet}
            eventContent={renderEventContent}
            eventClick={handleEventClick}
            height="auto"
            stickyHeaderDates={true}
            dayMaxEvents={true}
            displayEventEnd={false}
          />
        </div>
      </div>
    </div>
  );
}
