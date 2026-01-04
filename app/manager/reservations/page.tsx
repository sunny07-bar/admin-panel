"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import StatusFilter from "@/components/common/StatusFilter";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { getFloridaToday } from "@/lib/utils/timezone";
import { convert24To12 } from "@/lib/utils/timeFormat";

export default function ReservationsPage() {
  const supabase = createClient();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Reservations</h1>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
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
          currentValue={statusFilter}
        />
        <input
          type="date"
          value={dateFilter}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-2.5 text-theme-sm dark:border-gray-800 dark:bg-gray-900"
        />
        {(statusFilter || dateFilter) && (
          <Button variant="outline" size="sm" onClick={() => {
            setStatusFilter("");
            setDateFilter(getFloridaToday());
          }}>
            Clear Filters
          </Button>
        )}
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {reservations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
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
                              const [year, month, day] = reservation.reservation_date.split('-').map(Number);
                            return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${year}`;
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
                              onChange={() => {}} // Read-only
                              options={[
                                { value: "pending", label: "Pending" },
                                { value: "confirmed", label: "Confirmed" },
                                { value: "cancelled", label: "Cancelled" },
                                { value: "completed", label: "Completed" },
                                { value: "no_show", label: "No Show" },
                              ]}
                              className={`h-8 text-xs !w-full py-1 px-2 font-medium !border-2 ${getStatusColorClasses(reservation.status || "")}`}
                              disabled={true}
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {reservations.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No reservations found
              </div>
            ) : (
              reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 shadow-sm"
                >
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      {reservation.customer_name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {reservation.customer_phone}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Date & Time</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {reservation.reservation_date ? (() => {
                          try {
                              const [year, month, day] = reservation.reservation_date.split('-').map(Number);
                            return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${year}`;
                          } catch {
                            return reservation.reservation_date;
                          }
                        })() : ''} at {convert24To12(reservation.reservation_time || '')}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Guests</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {reservation.guests_count}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
                        <Select
                          value={reservation.status || ""}
                          onChange={() => {}}
                          options={[
                            { value: "pending", label: "Pending" },
                            { value: "confirmed", label: "Confirmed" },
                            { value: "cancelled", label: "Cancelled" },
                            { value: "completed", label: "Completed" },
                            { value: "no_show", label: "No Show" },
                          ]}
                          className={`h-8 text-xs !w-full py-1 px-2 font-medium !border-2 ${getStatusColorClasses(reservation.status || "")}`}
                          disabled={true}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Payment</p>
                      <div className="flex items-center gap-2 flex-wrap">
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
                    </div>
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

