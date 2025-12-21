"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import { PlusIcon, TrashBinIcon } from "@/icons";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { formatFloridaDateDDMMYYYY, formatFloridaTime } from "@/lib/utils/timezone";

export default function EventsPage() {
  const supabase = createClient();
  const [events, setEvents] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<{ id: string; imagePath: string | null } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data: eventsData } = await supabase
      .from("events")
      .select("*")
      .order("event_start", { ascending: true }); // Changed to ascending (earliest first)
    
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

    setAllEvents(eventsWithStats);
    setEvents(eventsWithStats);
    setLoading(false);
  }, [supabase]);

  // Filter events by search query
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
        <PageBreadcrumb items={[{ label: "Events" }]} />
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageBreadcrumb items={[{ label: "Events" }]} />
        <Link href="/events/new">
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Event
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search events by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

      {/* Events Table - Horizontal Rows */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark overflow-hidden">
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
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
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
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
          >
                    <td className="px-6 py-4">
                      {event.image_path ? (
              <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/events/${event.image_path}?t=${Date.now()}`}
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
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Link href={`/events/${event.id}`}>
                          <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteClick(event.id, event.image_path);
                  }}
                  disabled={loading || deletingId === event.id}
                          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 dark:bg-gray-800 dark:text-red-500 dark:border-gray-700 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
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

