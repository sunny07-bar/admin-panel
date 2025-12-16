"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import StatusFilter from "@/components/common/StatusFilter";
import { formatFloridaTime } from "@/lib/utils/timezone";

export default function ReservationsPage() {
  const supabase = createClient();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

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
                        {formatFloridaTime(reservation.reservation_date, 'MMM d, yyyy')} at{" "}
                        {reservation.reservation_time}
                      </td>
                      <td className="px-6 py-4 text-theme-sm text-gray-600 dark:text-gray-400">
                        {reservation.guests_count}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            reservation.status === "confirmed"
                              ? "bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400"
                              : reservation.status === "pending"
                              ? "bg-warning-100 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {reservation.status}
                        </span>
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
                        <Link href={`/reservations/${reservation.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
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

