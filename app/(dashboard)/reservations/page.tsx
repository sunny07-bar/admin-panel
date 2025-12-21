"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import StatusFilter from "@/components/common/StatusFilter";
import Select from "@/components/form/Select";
import { formatFloridaTime, getFloridaToday } from "@/lib/utils/timezone";
import { convert24To12 } from "@/lib/utils/timeFormat";
import { format, parse } from "date-fns";
import { TrashBinIcon } from "@/icons";

export default function ReservationsPage() {
  const supabase = createClient();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState<{ id: string; customerName: string } | null>(null);
  
  // Initialize date filter with today's date (Florida timezone)
  const [dateFilter, setDateFilter] = useState(getFloridaToday());

  useEffect(() => {
    fetchReservations();
  }, [statusFilter, dateFilter]);

  const fetchReservations = async () => {
    setLoading(true);
    let query = supabase
      .from("reservations")
      .select("*")
      .order("reservation_date", { ascending: false })
      .order("reservation_time", { ascending: false })
      .limit(50);

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    if (dateFilter) {
      query = query.eq("reservation_date", dateFilter);
    }

    const { data } = await query;
    setReservations(data || []);
    setLoading(false);
  };

  const getStatusColorClasses = (status: string) => {
    switch (status) {
      case "confirmed":
        return "!bg-success-100 !text-success-600 !border-success-200 dark:!bg-success-500/20 dark:!text-success-400 dark:!border-success-500/30";
      case "pending":
        return "!bg-warning-100 !text-warning-600 !border-warning-200 dark:!bg-warning-500/20 dark:!text-warning-400 dark:!border-warning-500/30";
      case "cancelled":
        return "!bg-error-100 !text-error-600 !border-error-200 dark:!bg-error-500/20 dark:!text-error-400 dark:!border-error-500/30";
      case "completed":
        return "!bg-success-100 !text-success-600 !border-success-200 dark:!bg-success-500/20 dark:!text-success-400 dark:!border-success-500/30";
      case "no_show":
        return "!bg-error-100 !text-error-600 !border-error-200 dark:!bg-error-500/20 dark:!text-error-400 dark:!border-error-500/30";
      default:
        return "!bg-gray-100 !text-gray-600 !border-gray-200 dark:!bg-gray-800 dark:!text-gray-400 dark:!border-gray-700";
    }
  };

  const handleStatusUpdate = async (reservationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("reservations")
        .update({ status: newStatus })
        .eq("id", reservationId);

      if (error) throw error;
      
      // Update the local state to reflect the change immediately
      setReservations((prev) =>
        prev.map((res) =>
          res.id === reservationId ? { ...res, status: newStatus } : res
        )
      );
    } catch (error: any) {
      alert(error.message || "Failed to update status");
    }
  };

  const handleDeleteClick = (id: string, customerName: string) => {
    if (deletingId === id || loading) {
      return;
    }
    setReservationToDelete({ id, customerName });
    setShowConfirmModal(true);
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setReservationToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!reservationToDelete) return;
    
    setShowConfirmModal(false);
    const { id } = reservationToDelete;
    setReservationToDelete(null);
    setDeletingId(id);

    try {
      const { error } = await supabase
        .from("reservations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Refresh the reservations list
      await fetchReservations();
      alert("Reservation deleted successfully!");
    } catch (error: any) {
      console.error("Delete error:", error);
      alert(`Error deleting reservation: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={[{ label: "Reservations" }]} />

      <div className="flex items-center gap-4">
        <StatusFilter
          options={[
            { value: "", label: "All Status" },
            { value: "pending", label: "Pending" },
            { value: "confirmed", label: "Confirmed" },
            { value: "cancelled", label: "Cancelled" },
            { value: "completed", label: "Completed" },
            { value: "no_show", label: "No Show" },
          ]}
          onFilterChange={(value) => setStatusFilter(value)}
        />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-2.5 text-theme-sm dark:border-gray-800 dark:bg-gray-900"
        />
        {(statusFilter || dateFilter) && (
          <Button variant="outline" size="sm" onClick={() => {
            setStatusFilter("");
            setDateFilter("");
          }}>
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
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Date & Time
                  </th>
                  <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Guests
                  </th>
                <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Payment
                </th>
                <th className="px-6 py-4 text-right text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Actions
                </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {reservations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No reservations found
                    </td>
                  </tr>
                ) : (
                  reservations.map((reservation) => (
                    <tr key={reservation.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-theme-sm font-medium text-gray-900 dark:text-white">
                            {reservation.customer_name}
                          </p>
                          <p className="text-theme-xs text-gray-600 dark:text-gray-400">
                            {reservation.customer_phone}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-theme-sm text-gray-600 dark:text-gray-400">
                        {reservation.reservation_date ? (() => {
                          try {
                            // Parse DATE type (YYYY-MM-DD) as local date without timezone conversion
                            const date = parse(reservation.reservation_date, 'yyyy-MM-dd', new Date());
                            return format(date, 'MMM d, yyyy');
                          } catch {
                            return reservation.reservation_date;
                          }
                        })() : ''} at{" "}
                        {convert24To12(reservation.reservation_time || '')}
                      </td>
                      <td className="px-6 py-4 text-theme-sm text-gray-600 dark:text-gray-400">
                        {reservation.guests_count}
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-[140px]">
                          <Select
                            value={reservation.status || ""}
                            onChange={(newStatus) => handleStatusUpdate(reservation.id, newStatus)}
                            options={[
                              { value: "pending", label: "Pending" },
                              { value: "confirmed", label: "Confirmed" },
                              { value: "cancelled", label: "Cancelled" },
                              { value: "completed", label: "Completed" },
                              { value: "no_show", label: "No Show" },
                            ]}
                            className={`h-8 text-xs !w-full py-1 px-2 font-medium !border-2 ${getStatusColorClasses(reservation.status || "")}`}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              reservation.prepayment_status === "paid" || reservation.payment_status === "paid"
                                ? "bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400"
                                : reservation.prepayment_status === "unpaid"
                                ? "bg-warning-100 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {reservation.prepayment_status === "paid" || reservation.payment_status === "paid"
                              ? "Paid"
                              : reservation.prepayment_status === "unpaid"
                              ? "Unpaid"
                              : "N/A"}
                          </span>
                          {reservation.prepayment_amount && (
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              ${parseFloat(reservation.prepayment_amount).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/reservations/${reservation.id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(reservation.id, reservation.customer_name)}
                            disabled={loading || deletingId === reservation.id}
                            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 dark:bg-gray-800 dark:text-red-500 dark:border-gray-700 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            title="Delete reservation"
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
              Delete Reservation?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete the reservation for <strong>{reservationToDelete?.customerName}</strong>? This action cannot be undone.
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

