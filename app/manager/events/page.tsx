"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { formatFloridaDateDDMMYYYY, formatFloridaTime } from "@/lib/utils/timezone";
import { getImageUrl } from "@/lib/utils/image-utils";

export default function EventsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [events, setEvents] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc"); // "desc" = Upcoming/Newest first, older in last

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data: eventsData } = await supabase
      .from("events")
      .select("*")
      .order("event_start", { ascending: false }); // Upcoming / newest first, older in last
    
    if (!eventsData) {
      setAllEvents([]);
      setEvents([]);
      setLoading(false);
      return;
    }

    // Fetch ticket statistics for all events
    const eventsWithStats = await Promise.all(
      eventsData.map(async (event) => {
        const { data: orders } = await supabase
          .from("ticket_orders")
          .select("id, total_amount, payment_status")
          .eq("event_id", event.id);

        const totalOrders = orders?.length || 0;
        const paidOrders = orders?.filter((o) => o.payment_status === "paid") || [];
        const totalRevenue = paidOrders.reduce(
          (sum, order) => sum + (parseFloat(order.total_amount?.toString() || "0") || 0),
          0
        );

        let ticketsSold = 0;
        if (orders && orders.length > 0) {
          const orderIds = orders.map((o) => o.id);
          const { count: ticketsCount } = await supabase
            .from("purchased_tickets")
            .select("*", { count: "exact", head: true })
            .in("ticket_order_id", orderIds);
          ticketsSold = ticketsCount || 0;
        }

        return {
          ...event,
          ticketStats: {
            ticketsSold,
            totalOrders,
            totalRevenue,
          },
        };
      })
    );

    // Initial sort: upcoming / newest first (timeB - timeA)
    const sorted = [...eventsWithStats].sort((a, b) => {
      const timeA = new Date(a.event_start || 0).getTime();
      const timeB = new Date(b.event_start || 0).getTime();
      return timeB - timeA;
    });

    setAllEvents(sorted);
    setEvents(sorted);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let result = [...allEvents];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((event) => {
        const title = event.title?.toLowerCase() || "";
        const location = event.location?.toLowerCase() || "";
        const slug = event.slug?.toLowerCase() || "";
        return title.includes(query) || location.includes(query) || slug.includes(query);
      });
    }

    result.sort((a, b) => {
      const timeA = new Date(a.event_start || 0).getTime();
      const timeB = new Date(b.event_start || 0).getTime();
      return sortDirection === "desc" ? timeB - timeA : timeA - timeB;
    });

    setEvents(result);
  }, [searchQuery, allEvents, sortDirection]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Events</h1>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Events</h1>
      </div>

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-2 items-center flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search events by name..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-full"
          />
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Sort Pill Buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium mr-1">Sort:</span>
          <button
            type="button"
            onClick={() => setSortDirection("desc")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              sortDirection === "desc"
                ? "bg-[#F59E0B] text-black border-[#F59E0B] shadow-sm font-bold"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-gray-400"
            }`}
          >
            Upcoming First
          </button>
          <button
            type="button"
            onClick={() => setSortDirection("asc")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              sortDirection === "asc"
                ? "bg-[#F59E0B] text-black border-[#F59E0B] shadow-sm font-bold"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-gray-400"
            }`}
          >
            Oldest First
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {events.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {searchQuery ? "No events found matching your search." : "No events found."}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        Image
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Title
                      </th>
                      <th
                        onClick={() => setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-[#F59E0B] transition-colors select-none whitespace-nowrap"
                        title="Click to toggle sorting"
                      >
                        <div className="inline-flex items-center gap-1">
                          <span>Date</span>
                          <span className="text-[#F59E0B] font-bold text-xs">
                            {sortDirection === "desc" ? "↓" : "↑"}
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        Location
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        Tickets Sold
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        Total Orders
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {events.map((event) => (
                      <tr
                        key={event.id}
                        onClick={() => router.push(`/manager/events/${event.id}`)}
                        className="hover:bg-gray-100/70 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          {event.image_path ? (
                            <img
                              src={getImageUrl(event.image_path, 'events') || ''}
                              alt={event.title}
                              className="w-12 h-14 object-cover rounded-lg border border-gray-200 dark:border-gray-800"
                            />
                          ) : (
                            <div className="w-12 h-14 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-[10px] text-gray-400">
                              No img
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900 dark:text-white text-sm max-w-[240px] truncate group-hover:text-brand-500 transition-colors" title={event.title}>
                            {event.title}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 font-mono whitespace-nowrap">
                          {(() => {
                            const formatted = formatFloridaDateDDMMYYYY(event.event_start);
                            return formatted ? formatted.replace(/-/g, "/") : "-";
                          })()}
                        </td>
                        <td className="px-4 py-2.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {formatFloridaTime(event.event_start, 'h:mm a')}
                          {event.event_end && ` - ${formatFloridaTime(event.event_end, 'h:mm a')}`}
                        </td>
                        <td className="px-4 py-2.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-[160px] truncate" title={event.location || ''}>
                          {event.location || "-"}
                        </td>
                        <td className="px-4 py-2.5 text-center text-sm text-gray-900 dark:text-white font-medium whitespace-nowrap">
                          {event.ticketStats?.ticketsSold || 0}
                        </td>
                        <td className="px-4 py-2.5 text-center text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {event.ticketStats?.totalOrders || 0}
                        </td>
                        <td className="px-4 py-2.5 text-center text-sm font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                          ${(event.ticketStats?.totalRevenue || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 shadow-sm"
                >
                  {event.image_path && (
                    <img
                      src={getImageUrl(event.image_path, 'events') || ''}
                      alt={event.title}
                      className="w-full h-40 sm:h-48 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      {event.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {formatFloridaDateDDMMYYYY(event.event_start)} at {formatFloridaTime(event.event_start, 'h:mm a')}
                    </p>
                    {event.location && (
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                        📍 {event.location}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Tickets Sold</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {event.ticketStats?.ticketsSold || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Orders</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {event.ticketStats?.totalOrders || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                        ${(event.ticketStats?.totalRevenue || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

