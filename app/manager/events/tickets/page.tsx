"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import StatusFilter from "@/components/common/StatusFilter";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import { formatFloridaTime } from "@/lib/utils/timezone";

export default function EventTicketsPage() {
  const supabase = createClient();
  const [tickets, setTickets] = useState<any[]>([]);
  const [allTickets, setAllTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchEvents();
    fetchTickets();
  }, [statusFilter, eventFilter]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setTickets(allTickets);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = allTickets.filter((ticket) => {
      const ticketNumber = ticket.ticket_number?.toLowerCase() || "";
      const customerName = ticket.customer_name?.toLowerCase() || "";
      const customerEmail = ticket.ticket_orders?.customer_email?.toLowerCase() || "";
      const ticketType = ticket.ticket_type_name?.toLowerCase() || "";
      const eventTitle = ticket.ticket_orders?.events?.title?.toLowerCase() || "";
      const orderNumber = ticket.ticket_orders?.order_number?.toLowerCase() || "";

      return (
        ticketNumber.includes(query) ||
        customerName.includes(query) ||
        customerEmail.includes(query) ||
        ticketType.includes(query) ||
        eventTitle.includes(query) ||
        orderNumber.includes(query)
      );
    });

    setTickets(filtered);
  }, [searchQuery, allTickets]);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("id, title")
      .order("event_start", { ascending: false });
    setEvents(data || []);
  };

  const fetchTickets = async () => {
    setLoading(true);
    
    try {
      // If event filter is set, first get all ticket_order_ids for that event
      let ticketOrderIds: string[] = [];
      if (eventFilter) {
        const { data: ticketOrders } = await supabase
          .from("ticket_orders")
          .select("id")
          .eq("event_id", eventFilter);
        
        if (ticketOrders && ticketOrders.length > 0) {
          ticketOrderIds = ticketOrders.map((order) => order.id);
        } else {
          // No ticket orders for this event, so no tickets to show
          setAllTickets([]);
          setTickets([]);
          setLoading(false);
          return;
        }
      }

      // Build the query for purchased_tickets
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

      // Apply status filter
      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      // Apply event filter by filtering on ticket_order_id
      if (eventFilter && ticketOrderIds.length > 0) {
        query = query.in("ticket_order_id", ticketOrderIds);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching tickets:", error);
        setAllTickets([]);
        setTickets([]);
      } else {
        const ticketsData = data || [];
        setAllTickets(ticketsData);
        setTickets(ticketsData);
      }
    } catch (error) {
      console.error("Error in fetchTickets:", error);
      setAllTickets([]);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColorClasses = (status: string) => {
    switch (status) {
      case "valid":
        return "!bg-success-100 !text-success-600 !border-success-200 dark:!bg-success-500/20 dark:!text-success-400 dark:!border-success-500/30";
      case "used":
        return "!bg-blue-100 !text-blue-600 !border-blue-200 dark:!bg-blue-500/20 dark:!text-blue-400 dark:!border-blue-500/30";
      case "cancelled":
        return "!bg-error-100 !text-error-600 !border-error-200 dark:!bg-error-500/20 dark:!text-error-400 dark:!border-error-500/30";
      case "refunded":
        return "!bg-gray-100 !text-gray-600 !border-gray-200 dark:!bg-gray-800 dark:!text-gray-400 dark:!border-gray-700";
      default:
        return "!bg-gray-100 !text-gray-600 !border-gray-200 dark:!bg-gray-800 dark:!text-gray-400 dark:!border-gray-700";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Event Tickets</h1>

      <div className="space-y-3 sm:space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <Input
            type="text"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-full pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
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
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEventFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-theme-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <option value="">All Events</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
          {(statusFilter || eventFilter || searchQuery) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusFilter("");
                setEventFilter("");
                setSearchQuery("");
              }}
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark">
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {tickets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
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
                          <div className="w-[140px]">
                            <Select
                              value={ticket.status || ""}
                              onChange={() => {}} // Read-only
                              options={[
                                { value: "valid", label: "Valid" },
                                { value: "used", label: "Used" },
                                { value: "cancelled", label: "Cancelled" },
                                { value: "refunded", label: "Refunded" },
                              ]}
                              className={`h-8 text-xs !w-full py-1 px-2 font-medium !border-2 ${getStatusColorClasses(ticket.status || "")}`}
                              disabled={true}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-theme-sm text-gray-600 dark:text-gray-400">
                          {ticket.redeemed_at
                            ? formatFloridaTime(ticket.redeemed_at, 'MM-dd-yyyy h:mm a')
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {tickets.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No tickets found
              </div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 shadow-sm"
                >
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      {ticket.ticket_number}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {ticket.ticket_orders?.events?.title || "N/A"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Customer</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {ticket.customer_name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {ticket.ticket_orders?.customer_email}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Type</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {ticket.ticket_type_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
                        <Select
                          value={ticket.status || ""}
                          onChange={() => {}}
                          options={[
                            { value: "valid", label: "Valid" },
                            { value: "used", label: "Used" },
                            { value: "cancelled", label: "Cancelled" },
                            { value: "refunded", label: "Refunded" },
                          ]}
                          className={`h-8 text-xs !w-full py-1 px-2 font-medium !border-2 ${getStatusColorClasses(ticket.status || "")}`}
                          disabled={true}
                        />
                      </div>
                    </div>
                    {ticket.redeemed_at && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Redeemed At</p>
                        <p className="text-xs sm:text-sm text-gray-900 dark:text-white">
                          {formatFloridaTime(ticket.redeemed_at, 'MM-dd-yyyy h:mm a')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

