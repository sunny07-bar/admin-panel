"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import { PlusIcon, TrashBinIcon, PencilIcon } from "@/icons";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { formatFloridaTime } from "@/lib/utils/timezone";

export default function SpecialHoursPage() {
  const supabase = createClient();
  const [specialHours, setSpecialHours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [specialHourToDelete, setSpecialHourToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchSpecialHours();
  }, []);

  const fetchSpecialHours = async () => {
    const { data } = await supabase
      .from("special_hours")
      .select("*")
      .order("date", { ascending: false });
    setSpecialHours(data || []);
    setLoading(false);
  };

  const handleDeleteClick = (id: string) => {
    if (deletingId === id || loading) {
      return;
    }
    setSpecialHourToDelete(id);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!specialHourToDelete) return;
    
    setShowConfirmModal(false);
    const id = specialHourToDelete;
    setSpecialHourToDelete(null);
    setDeletingId(id);

    try {
      setLoading(true);
      console.log("Starting deletion for special hour:", id);

      // Step 1: Get all reservations linked to this special hour
      console.log("Step 1: Fetching related reservations...");
      const { data: relatedReservations, error: reservationsFetchError } = await supabase
        .from("reservations")
        .select("id, reservation_date, reservation_time, status")
        .eq("special_hours_id", id);

      if (reservationsFetchError) {
        console.error("Error fetching related reservations:", reservationsFetchError);
        // Continue anyway - might not have reservations
      } else {
        console.log(`Found ${relatedReservations?.length || 0} reservations linked to this special hour`);
      }

      // Step 2: Handle related reservations
      // Option 1: Remove the special_hours_id reference (set to null)
      // This is safer than deleting reservations
      if (relatedReservations && relatedReservations.length > 0) {
        console.log("Step 2: Removing special_hours_id from related reservations...");
        const { error: updateError } = await supabase
          .from("reservations")
          .update({ special_hours_id: null })
          .eq("special_hours_id", id);

        if (updateError) {
          console.error("Error updating reservations:", {
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code
          });
          // Continue with deletion anyway - might be a constraint issue
        } else {
          console.log("Successfully removed special_hours_id from related reservations");
        }
      }

      // Step 3: Delete related special_hours configuration tables
      console.log("Step 3: Deleting special hours configuration...");
      
      // Delete special_hours_seatings
      const { error: seatingsError } = await supabase
        .from("special_hours_seatings")
        .delete()
        .eq("special_hours_id", id);
      if (seatingsError) {
        console.error("Error deleting seatings:", seatingsError);
      }

      // Delete special_hours_limits
      const { error: limitsError } = await supabase
        .from("special_hours_limits")
        .delete()
        .eq("special_hours_id", id);
      if (limitsError) {
        console.error("Error deleting limits:", limitsError);
      }

      // Delete special_hours_payment
      const { error: paymentError } = await supabase
        .from("special_hours_payment")
        .delete()
        .eq("special_hours_id", id);
      if (paymentError) {
        console.error("Error deleting payment config:", paymentError);
      }

      // Delete special_hours_fields
      const { error: fieldsError } = await supabase
        .from("special_hours_fields")
        .delete()
        .eq("special_hours_id", id);
      if (fieldsError) {
        console.error("Error deleting fields:", fieldsError);
      }

      // Step 4: Finally, delete the special hour itself
      console.log("Step 4: Deleting special hour...");
      const { error, data } = await supabase
        .from("special_hours")
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
        throw new Error(`Failed to delete special hour: ${error.message}. ${error.details || ''} ${error.hint ? `Hint: ${error.hint}` : ''}`);
      }

      console.log("Special hour deleted successfully:", data);

      // Refresh the special hours list
      await fetchSpecialHours();
      
      alert("Special hour deleted successfully!");
    } catch (error: any) {
      console.error("Delete error:", error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
      console.error("Full error object:", error);
      alert(`Error deleting special hour: ${errorMessage}\n\nPlease check the browser console for more details.`);
    } finally {
      setLoading(false);
      setDeletingId(null);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setSpecialHourToDelete(null);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'draft' : 'active';
    try {
      const { error } = await supabase
        .from("special_hours")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      fetchSpecialHours();
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb items={[{ label: "Reservations" }, { label: "Special Hours" }]} />
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageBreadcrumb items={[{ label: "Reservations" }, { label: "Special Hours" }]} />
        <Link href="/reservations/special-hours/new">
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Special Hours
          </Button>
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Title
                </th>
                <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Time
                </th>
                <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Open/Closed
                </th>
                <th className="px-6 py-4 text-right text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {specialHours.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No special hours configured. Create one to override regular hours for specific dates.
                  </td>
                </tr>
              ) : (
                specialHours.map((sh) => (
                  <tr key={sh.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="px-6 py-4 text-theme-sm font-medium text-gray-900 dark:text-white">
                      {sh.title}
                    </td>
                    <td className="px-6 py-4 text-theme-sm text-gray-600 dark:text-gray-400">
                      {formatFloridaTime(sh.date, 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-theme-sm text-gray-600 dark:text-gray-400">
                      {sh.time_from && sh.time_to
                        ? `${sh.time_from} - ${sh.time_to}`
                        : sh.is_open
                        ? "All Day"
                        : "Closed"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          sh.status === "active"
                            ? "bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400"
                            : sh.status === "draft"
                            ? "bg-warning-100 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {sh.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          sh.is_open
                            ? "bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400"
                            : "bg-error-100 text-error-600 dark:bg-error-500/20 dark:text-error-400"
                        }`}
                      >
                        {sh.is_open ? "Open" : "Closed"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(sh.id, sh.status)}
                        >
                          {sh.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Link href={`/reservations/special-hours/${sh.id}`}>
                          <Button variant="outline" size="sm">
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteClick(sh.id);
                          }}
                          disabled={loading || deletingId === sh.id}
                          className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg border border-gray-300 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 dark:bg-gray-800 dark:text-red-500 dark:border-gray-700 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          style={{ 
                            minWidth: '44px',
                            minHeight: '44px'
                          }}
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
              Delete Special Hour?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this special hour? This action cannot be undone.
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

