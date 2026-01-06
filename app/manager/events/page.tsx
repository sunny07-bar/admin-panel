"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { formatFloridaDateDDMMYYYY, formatFloridaTime } from "@/lib/utils/timezone";
import { getImageUrl } from "@/lib/utils/image-utils";

export default function EventsPage() {
  const supabase = createClient();
  const [events, setEvents] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data: eventsData } = await supabase
      .from("events")
      .select("*")
      .order("event_start", { ascending: true });
    
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

    setAllEvents(eventsWithStats);
    setEvents(eventsWithStats);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setEvents(allEvents);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = allEvents.filter((event) => {
      const title = event.title?.toLowerCase() || "";
      const location = event.location?.toLowerCase() || "";
      const slug = event.slug?.toLowerCase() || "";
      return title.includes(query) || location.includes(query) || slug.includes(query);
    });

    setEvents(filtered);
  }, [searchQuery, allEvents]);

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

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
        <div className="flex-1 max-w-full sm:max-w-md">
          <Input
            type="text"
            placeholder="Search events by name..."
            value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
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

      {/* Events List - Mobile-friendly cards */}
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
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Image
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Tickets Sold
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Total Orders
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {events.map((event) => (
                      <tr
                        key={event.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          {event.image_path ? (
                            <img
                              src={getImageUrl(event.image_path, 'events') || ''}
                              alt={event.title}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                              <span className="text-xs text-gray-400">No image</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {event.title}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {formatFloridaDateDDMMYYYY(event.event_start)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {formatFloridaTime(event.event_start, 'h:mm a')}
                          {event.event_end && ` - ${formatFloridaTime(event.event_end, 'h:mm a')}`}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {event.location || "-"}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white font-medium">
                          {event.ticketStats?.ticketsSold || 0}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-400">
                          {event.ticketStats?.totalOrders || 0}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-green-600 dark:text-green-400">
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

