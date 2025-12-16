"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import StatusFilter from "@/components/common/StatusFilter";
import { formatFloridaTime } from "@/lib/utils/timezone";

export default function EventTicketsPage() {
  const supabase = createClient();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchEvents();
    fetchTickets();
  }, [statusFilter, eventFilter]);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("id, title")
      .order("event_start", { ascending: false });
    setEvents(data || []);
  };

  const fetchTickets = async () => {
    setLoading(true);
    let query = supabase
      .from("purchased_tickets")
      .select(`
        *,
        ticket_orders (
          order_number,
          customer_name,
          customer_email,
          events (
            id,
            title,
            event_start
          )
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    if (eventFilter) {
      query = query.eq("ticket_orders.event_id", eventFilter);
    }

    const { data } = await query;
    setTickets(data || []);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={[{ label: "Events" }, { label: "Tickets" }]} />

      <div className="flex items-center gap-4 flex-wrap">
        <StatusFilter
          options={[
            { value: "", label: "All Status" },
            { value: "valid", label: "Valid" },
            { value: "used", label: "Used" },
            { value: "cancelled", label: "Cancelled" },
            { value: "refunded", label: "Refunded" },
          ]}
          onFilterChange={(value) => setStatusFilter(value)}
          currentValue={statusFilter}
        />
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-2.5 text-theme-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <option value="">All Events</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
        {(statusFilter || eventFilter) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStatusFilter("");
              setEventFilter("");
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Ticket Number
                  </th>
                  <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Event
                  </th>
                  <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Redeemed
                  </th>
                  <th className="px-6 py-4 text-right text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No tickets found
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {ticket.ticket_number}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-theme-sm text-gray-600 dark:text-gray-400">
                        {ticket.ticket_orders?.events?.title || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-theme-sm font-medium text-gray-900 dark:text-white">
                          {ticket.customer_name}
                        </p>
                        <p className="text-theme-xs text-gray-600 dark:text-gray-400">
                          {ticket.ticket_orders?.customer_email}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-theme-sm text-gray-600 dark:text-gray-400">
                        {ticket.ticket_type_name}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            ticket.status === "valid"
                              ? "bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400"
                              : ticket.status === "used"
                              ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {ticket.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-theme-sm text-gray-600 dark:text-gray-400">
                        {ticket.redeemed_at
                          ? formatFloridaTime(ticket.redeemed_at, 'MMM d, yyyy h:mm a')
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

