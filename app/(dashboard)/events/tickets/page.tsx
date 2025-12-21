"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import StatusFilter from "@/components/common/StatusFilter";
import Select from "@/components/form/Select";
import { formatFloridaTime } from "@/lib/utils/timezone";
import { TrashBinIcon } from "@/icons";

export default function EventTicketsPage() {
  const supabase = createClient();
  const [tickets, setTickets] = useState<any[]>([]);
  const [allTickets, setAllTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<{ id: string; ticketNumber: string } | null>(null);

  useEffect(() => {
    fetchEvents();
    fetchTickets();
  }, [statusFilter, eventFilter]);

  useEffect(() => {
    // Client-side search filtering on the fetched tickets
    if (!searchQuery.trim()) {
      // If no search query, show all fetched tickets (already filtered by status/event)
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
    const ticketsData = data || [];
    setAllTickets(ticketsData);
    setTickets(ticketsData);
    setLoading(false);
  };

  const handleDeleteClick = (id: string, ticketNumber: string) => {
    if (deletingId === id || loading) {
      return;
    }
    setTicketToDelete({ id, ticketNumber });
    setShowConfirmModal(true);
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setTicketToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!ticketToDelete) return;
    
    setShowConfirmModal(false);
    const { id } = ticketToDelete;
    setTicketToDelete(null);
    setDeletingId(id);

    try {
      const { error } = await supabase
        .from("purchased_tickets")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Refresh the tickets list
      await fetchTickets();
      alert("Ticket deleted successfully!");
    } catch (error: any) {
      console.error("Delete error:", error);
      alert(`Error deleting ticket: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusUpdate = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("purchased_tickets")
        .update({ status: newStatus })
        .eq("id", ticketId);

      if (error) throw error;
      
      // Update the local state to reflect the change immediately
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
        )
      );
      setAllTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
        )
      );
    } catch (error: any) {
      alert(error.message || "Failed to update status");
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
    <div className="space-y-6">
      <PageBreadcrumb items={[{ label: "Events" }, { label: "Tickets" }]} />

      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
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
          <input
            type="text"
            placeholder="Search by ticket number, customer name, email, ticket type, event, or order number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-800"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-4">
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
          </div>
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
                            onChange={(newStatus) => handleStatusUpdate(ticket.id, newStatus)}
                            options={[
                              { value: "valid", label: "Valid" },
                              { value: "used", label: "Used" },
                              { value: "cancelled", label: "Cancelled" },
                              { value: "refunded", label: "Refunded" },
                            ]}
                            className={`h-8 text-xs !w-full py-1 px-2 font-medium !border-2 ${getStatusColorClasses(ticket.status || "")}`}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-theme-sm text-gray-600 dark:text-gray-400">
                        {ticket.redeemed_at
                          ? formatFloridaTime(ticket.redeemed_at, 'MMM d, yyyy h:mm a')
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDeleteClick(ticket.id, ticket.ticket_number)}
                            disabled={loading || deletingId === ticket.id}
                            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 dark:bg-gray-800 dark:text-red-500 dark:border-gray-700 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            title="Delete ticket"
                          >
                            <TrashBinIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Ticket?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete ticket <strong>{ticketToDelete?.ticketNumber}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelDelete}
                disabled={deletingId !== null}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDelete}
                disabled={deletingId !== null}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deletingId ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

