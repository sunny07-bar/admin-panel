"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import { PlusIcon, TrashBinIcon } from "@/icons";
import BackButton from "@/components/common/BackButton";
import { formatFloridaDateDDMMYYYY, formatFloridaTime, toFloridaTime } from "@/lib/utils/timezone";
import { getImageUrl } from "@/lib/utils/image-utils";
import { parseISO, format } from "date-fns";

export default function EventsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [events, setEvents] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<{ id: string; imagePath: string | null } | null>(null);
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
        // Get ticket orders for this event
        const { data: orders } = await supabase
          .from("ticket_orders")
          .select("id, total_amount, payment_status")
          .eq("event_id", event.id);

        // Calculate statistics
        const totalOrders = orders?.length || 0;
        const paidOrders = orders?.filter((o) => o.payment_status === "paid") || [];
        const totalRevenue = paidOrders.reduce(
          (sum, order) => sum + (parseFloat(order.total_amount?.toString() || "0") || 0),
          0
        );

        // Get purchased tickets count for this event
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

    // Apply initial sort: upcoming / newest first (timeB - timeA)
    const sorted = [...eventsWithStats].sort((a, b) => {
      const timeA = new Date(a.event_start || 0).getTime();
      const timeB = new Date(b.event_start || 0).getTime();
      return timeB - timeA;
    });

    setAllEvents(sorted);
    setEvents(sorted);
    setLoading(false);
  }, [supabase]);

  // Filter and sort events whenever searchQuery or sortDirection changes
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

  const handleDeleteClick = (id: string, imagePath: string | null) => {
    if (deletingId === id || loading) {
      return;
    }
    setEventToDelete({ id, imagePath });
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    
    setShowConfirmModal(false);
    const { id, imagePath } = eventToDelete;
    setEventToDelete(null);
    setDeletingId(id);

    try {
      setLoading(true);
      console.log("Starting deletion for event:", id);

      // Step 1: Get all ticket orders for this event
      console.log("Step 1: Fetching ticket orders...");
      const { data: orders, error: ordersFetchError } = await supabase
        .from("ticket_orders")
        .select("id")
        .eq("event_id", id);

      if (ordersFetchError) {
        console.error("Error fetching orders:", ordersFetchError);
        // Continue - might not have orders
      } else {
        console.log(`Found ${orders?.length || 0} ticket orders`);
      }

      // Step 2: Delete purchased tickets (which reference ticket_orders)
      if (orders && orders.length > 0) {
        console.log("Step 2: Deleting purchased tickets...");
        const orderIds = orders.map((o) => o.id);
        const { error: ticketsError } = await supabase
          .from("purchased_tickets")
          .delete()
          .in("order_id", orderIds);

        if (ticketsError) {
          console.error("Error deleting purchased tickets:", ticketsError);
          // Continue anyway - might not have tickets
        } else {
          console.log("Purchased tickets deleted successfully");
        }
      }

      // Step 3: Delete ticket orders (which reference events)
      console.log("Step 3: Deleting ticket orders...");
      const { error: ordersError } = await supabase
        .from("ticket_orders")
        .delete()
        .eq("event_id", id);

      if (ordersError) {
        console.error("Error deleting ticket orders:", ordersError);
        // Continue anyway - might not have orders
      } else {
        console.log("Ticket orders deleted successfully");
      }

      // Step 4: Delete event tickets (ticket types) (which reference events)
      console.log("Step 4: Deleting event tickets...");
      const { error: eventTicketsError } = await supabase
        .from("event_tickets")
        .delete()
        .eq("event_id", id);

      if (eventTicketsError) {
        console.error("Error deleting event tickets:", eventTicketsError);
        // Continue anyway - might not have ticket types
      } else {
        console.log("Event tickets deleted successfully");
      }

      // Step 5: Delete image from storage
      if (imagePath) {
        console.log("Step 5: Deleting image from storage...", imagePath);
        try {
          // Clean the path: remove URL parts if present, otherwise use as-is
          let cleanPath = imagePath;
          if (imagePath.includes('/storage/v1/object/public/events/')) {
            cleanPath = imagePath.split('/storage/v1/object/public/events/')[1];
          }
          // Remove query parameters if any
          cleanPath = cleanPath.split('?')[0];
          
          console.log("Cleaned image path for deletion:", cleanPath);
          console.log("Using bucket: events");
          
          const { data: deleteData, error: storageError } = await supabase
            .storage
            .from("events")
            .remove([cleanPath]);
          
          if (storageError) {
            console.error("Error deleting image from storage:", {
              error: storageError,
              path: cleanPath,
              originalPath: imagePath,
              bucket: "events"
            });
            // Continue with database deletion even if image deletion fails
          } else {
            console.log("Image deleted successfully from storage:", deleteData);
          }
        } catch (storageError) {
          console.error("Exception deleting image from storage:", storageError);
          // Continue with database deletion even if image deletion fails
        }
      }

      // Step 6: Finally, delete the event itself
      console.log("Step 6: Deleting event...");
      const { error, data } = await supabase
        .from("events")
        .delete()
        .eq("id", id)
        .select();

      if (error) {
        console.error("Delete error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Failed to delete event: ${error.message}. ${error.details || ''} ${error.hint ? `Hint: ${error.hint}` : ''}`);
      }

      console.log("Event deleted successfully:", data);

      // Refresh the events list
      await fetchEvents();
      
      alert("Event deleted successfully!");
    } catch (error: any) {
      console.error("Delete error:", error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
      console.error("Full error object:", error);
      alert(`Error deleting event: ${errorMessage}\n\nPlease check the browser console for more details.`);
    } finally {
      setLoading(false);
      setDeletingId(null);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setEventToDelete(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <BackButton />
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <BackButton />
        <Link href="/admin/events/new">
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Event
          </Button>
        </Link>
      </div>

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-2 items-center flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search events by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

      {/* Events Table - Horizontal Rows */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark overflow-hidden">
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
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {loading ? "Loading events..." : searchQuery ? "No events found matching your search." : "No events found."}
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr
                    key={event.id}
                    onClick={() => router.push(`/admin/events/${event.id}`)}
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
                      <div className="font-semibold text-gray-900 dark:text-white text-sm max-w-[220px] truncate group-hover:text-brand-500 transition-colors" title={event.title}>
                        {event.title}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-mono whitespace-nowrap">
                      {(() => {
                        const formatted = formatFloridaDateDDMMYYYY(event.event_start);
                        return formatted ? formatted.replace(/-/g, "/") : "-";
                      })()}
                    </td>
                    <td className="px-4 py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatFloridaTime(event.event_start, 'h:mm a')}
                      {event.event_end && ` - ${formatFloridaTime(event.event_end, 'h:mm a')}`}
                    </td>
                    <td className="px-4 py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-[150px] truncate" title={event.location || ''}>
                      {event.location || "-"}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white font-medium whitespace-nowrap">
                      {event.ticketStats?.ticketsSold || 0}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {event.ticketStats?.totalOrders || 0}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                      ${(event.ticketStats?.totalRevenue || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {/* Action Button for Public Website */}
                        {(() => {
                          const eventStart = typeof event.event_start === 'string' ? toFloridaTime(parseISO(event.event_start)) : toFloridaTime(event.event_start);
                          const eventDate = format(eventStart, 'yyyy-MM-dd');
                          const eventTime = format(eventStart, 'HH:mm');
                          const websiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3000';
                          const actionType = event.action_button_type || 'reservation';
                          
                          if (actionType === 'reservation') {
                            return (
                              <a
                                href={`${websiteUrl}/reservations?eventDate=${eventDate}&eventTime=${eventTime}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-blue-400/50 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all shadow-xs"
                              >
                                Reserve
                              </a>
                            );
                          } else if (actionType === 'external_tickets' && event.ticket_link) {
                            return (
                              <a
                                href={event.ticket_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-green-400/50 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-all shadow-xs"
                              >
                                Tickets
                              </a>
                            );
                          } else if (actionType === 'custom_tickets' && ((event.base_ticket_price !== null && event.base_ticket_price !== undefined) || (event.event_tickets && event.event_tickets.length > 0))) {
                            return (
                              <a
                                href={`${websiteUrl}/events/${encodeURIComponent(event.slug)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-purple-400/50 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-all shadow-xs"
                              >
                                Tickets
                              </a>
                            );
                          }
                          return null;
                        })()}

                        <Link href={`/admin/events/${event.id}`}>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center px-4 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-600 transition-all cursor-pointer shadow-xs"
                          >
                            Edit
                          </button>
                        </Link>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteClick(event.id, event.image_path);
                          }}
                          disabled={loading || deletingId === event.id}
                          className="inline-flex items-center justify-center p-2 text-xs sm:text-sm font-medium rounded-lg border border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-800 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                          title="Delete Event"
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

      {/* Simple Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Event?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this event? This action cannot be undone and will delete all associated tickets and orders.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelDelete}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDelete}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

