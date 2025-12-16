"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Select from "@/components/form/Select";
import Label from "@/components/form/Label";
import { formatFloridaTime } from "@/lib/utils/timezone";

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [reservation, setReservation] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadReservation();
    }
  }, [params.id]);

  const loadReservation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("reservations")
        .select(`
          *,
          special_hours (
            id,
            title,
            date
          ),
          reservation_field_responses (
            *,
            special_hours_fields (
              field_label,
              field_key
            )
          )
        `)
        .eq("id", params.id)
        .single();

      if (error) throw error;
      setReservation(data);

      // Load payments
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .eq("reservation_id", params.id)
        .order("created_at", { ascending: false });

      setPayments(paymentsData || []);
      setLoading(false);
    } catch (error: any) {
      alert(error.message);
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("reservations")
        .update({ status: newStatus })
        .eq("id", params.id);

      if (error) throw error;
      loadReservation();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkNoShow = async () => {
    if (!confirm("Mark this reservation as no-show? This may apply a no-show fee if configured.")) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("reservations")
        .update({ 
          status: "no_show",
          no_show_fee_applied: true
        })
        .eq("id", params.id);

      if (error) throw error;
      loadReservation();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb items={[{ label: "Reservations" }, { label: "Details" }]} />
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb items={[{ label: "Reservations" }, { label: "Details" }]} />
        <div className="text-center py-12">Reservation not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb
        items={[
          { label: "Reservations", href: "/reservations" },
          { label: "Details" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark p-6">
            <h2 className="text-xl font-semibold mb-4">Reservation Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-theme-sm text-gray-600 dark:text-gray-400">Customer Name</p>
                <p className="font-semibold">{reservation.customer_name}</p>
              </div>
              <div>
                <p className="text-theme-sm text-gray-600 dark:text-gray-400">Phone</p>
                <p className="font-semibold">{reservation.customer_phone}</p>
              </div>
              {reservation.customer_email && (
                <div>
                  <p className="text-theme-sm text-gray-600 dark:text-gray-400">Email</p>
                  <p className="font-semibold">{reservation.customer_email}</p>
                </div>
              )}
              <div>
                <p className="text-theme-sm text-gray-600 dark:text-gray-400">Date & Time</p>
                <p className="font-semibold">
                  {formatFloridaTime(reservation.reservation_date, 'MMM d, yyyy')} at {reservation.reservation_time}
                </p>
              </div>
              <div>
                <p className="text-theme-sm text-gray-600 dark:text-gray-400">Guests</p>
                <p className="font-semibold">{reservation.guests_count}</p>
              </div>
              {reservation.special_hours && (
                <div>
                  <p className="text-theme-sm text-gray-600 dark:text-gray-400">Special Hours</p>
                  <p className="font-semibold">{reservation.special_hours.title}</p>
                </div>
              )}
              {reservation.notes && (
                <div>
                  <p className="text-theme-sm text-gray-600 dark:text-gray-400">Notes</p>
                  <p className="font-semibold">{reservation.notes}</p>
                </div>
              )}

              {/* Custom Fields */}
              {reservation.reservation_field_responses &&
                reservation.reservation_field_responses.length > 0 && (
                  <div>
                    <p className="text-theme-sm text-gray-600 dark:text-gray-400 mb-2">
                      Custom Fields
                    </p>
                    <div className="space-y-2">
                      {reservation.reservation_field_responses.map((response: any) => (
                        <div key={response.id} className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {response.special_hours_fields?.field_label ||
                              response.special_hours_fields?.field_key}
                          </p>
                          <p className="font-semibold">{response.field_value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark p-6">
              <h2 className="text-xl font-semibold mb-4">Payment History</h2>
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold">${payment.amount.toFixed(2)}</p>
                      <p className="text-theme-xs text-gray-600 dark:text-gray-400">
                        {payment.payment_method.toUpperCase()} • {payment.status}
                      </p>
                      {payment.transaction_id && (
                        <p className="text-theme-xs text-gray-500 dark:text-gray-500">
                          Transaction: {payment.transaction_id}
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        payment.status === "completed"
                          ? "bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400"
                          : payment.status === "pending"
                          ? "bg-warning-100 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {payment.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark p-6">
            <h2 className="text-xl font-semibold mb-4">Status & Actions</h2>
            <div className="space-y-4">
              <div>
                <Label>Current Status</Label>
                <Select
                  value={reservation.status}
                  onChange={(value) => handleStatusUpdate(value)}
                  disabled={updating}
                  options={[
                    { value: "pending", label: "Pending" },
                    { value: "confirmed", label: "Confirmed" },
                    { value: "cancelled", label: "Cancelled" },
                    { value: "completed", label: "Completed" },
                    { value: "no_show", label: "No Show" },
                  ]}
                />
              </div>

              <div>
                <p className="text-theme-sm text-gray-600 dark:text-gray-400 mb-2">
                  Payment Status
                </p>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    reservation.prepayment_status === "paid" ||
                    reservation.payment_status === "paid"
                      ? "bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400"
                      : reservation.prepayment_status === "unpaid"
                      ? "bg-warning-100 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {reservation.prepayment_status === "paid" ||
                  reservation.payment_status === "paid"
                    ? "Paid"
                    : reservation.prepayment_status === "unpaid"
                    ? "Unpaid"
                    : "N/A"}
                </span>
                {reservation.prepayment_amount && (
                  <p className="text-theme-sm mt-2">
                    Amount: ${parseFloat(reservation.prepayment_amount).toFixed(2)}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleMarkNoShow}
                  className="w-full text-error-500 hover:text-error-600 hover:border-error-500"
                >
                  Mark as No Show
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
