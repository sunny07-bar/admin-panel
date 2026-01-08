"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import Select from "@/components/form/Select";
import { TrashBinIcon } from "@/icons";
import { convert24To12 } from "@/lib/utils/timeFormat";
import toast from "react-hot-toast";

interface ReservationListProps {
    reservations: any[];
    selectedDate: Date;
    onRefresh?: () => void;
}

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

export default function ReservationList({ reservations, selectedDate, onRefresh }: ReservationListProps) {
    const supabase = createClient();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [reservationToDelete, setReservationToDelete] = useState<{ id: string; customerName: string } | null>(null);

    const handleStatusUpdate = async (reservationId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from("reservations")
                .update({ status: newStatus })
                .eq("id", reservationId);

            if (error) throw error;
            toast.success(`Status updated to ${newStatus}`);
            if (onRefresh) onRefresh();
        } catch (error: any) {
            toast.error(error.message || "Failed to update status");
        }
    };

    const handleDeleteClick = (id: string, customerName: string) => {
        if (deletingId === id) return;
        setReservationToDelete({ id, customerName });
        setShowConfirmModal(true);
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
            toast.success("Reservation deleted successfully!");
            if (onRefresh) onRefresh();
        } catch (error: any) {
            console.error("Delete error:", error);
            toast.error(`Error deleting reservation: ${error.message || 'Unknown error occurred'}`);
        } finally {
            setDeletingId(null);
        }
    };

    if (!reservations || reservations.length === 0) {
        return (
            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400">No reservations found for {format(selectedDate, 'MMM d, yyyy')}</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <h3 className="font-bold text-gray-900 dark:text-white">
                    Reservations for {format(selectedDate, 'MMMM d, yyyy')}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                        ({reservations.length})
                    </span>
                </h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                        <tr>
                            <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">Reservation #</th>
                            <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">Customer</th>
                            <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">Email</th>
                            <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">Time</th>
                            <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">Guests</th>
                            <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">Area</th>
                            <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                            <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">Payment</th>
                            <th className="px-6 py-4 text-right text-theme-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {reservations.map((reservation) => (
                            <tr key={reservation.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                                <td className="px-6 py-4">
                                    <p className="text-theme-sm font-semibold font-mono text-gray-900 dark:text-white">
                                        {reservation.id.slice(0, 8).toUpperCase()}
                                    </p>
                                </td>
                                <td className="px-6 py-4">
                                    <div>
                                        <p className="text-theme-sm font-medium text-gray-900 dark:text-white">{reservation.customer_name}</p>
                                        <p className="text-theme-xs text-gray-600 dark:text-gray-400">{reservation.customer_phone}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-theme-sm text-gray-600 dark:text-gray-400">
                                    {reservation.customer_email ? (
                                        <a href={`mailto:${reservation.customer_email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                                            {reservation.customer_email}
                                        </a>
                                    ) : <span className="text-gray-400">—</span>}
                                </td>
                                <td className="px-6 py-4 text-theme-sm text-gray-600 dark:text-gray-400">
                                    {convert24To12(reservation.reservation_time || '')}
                                </td>
                                <td className="px-6 py-4 text-theme-sm text-gray-600 dark:text-gray-400">{reservation.guests_count}</td>
                                <td className="px-6 py-4 text-theme-sm text-gray-600 dark:text-gray-400">
                                    {reservation.area || <span className="text-gray-400">—</span>}
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
                                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${reservation.prepayment_status === "paid" || reservation.payment_status === "paid"
                                            ? "bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400"
                                            : (reservation.prepayment_status === "unpaid" || reservation.payment_status === "unpaid")
                                                ? "bg-warning-100 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400"
                                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                            }`}>
                                            {reservation.prepayment_status === "paid" || reservation.payment_status === "paid"
                                                ? "Paid"
                                                : (reservation.prepayment_status === "unpaid" || reservation.payment_status === "unpaid")
                                                    ? "Unpaid"
                                                    : "N/A"}
                                        </span>
                                        {reservation.prepayment_amount && (
                                            <span className="text-xs text-gray-600 dark:text-gray-400">${parseFloat(reservation.prepayment_amount).toFixed(2)}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Link href={`/reservations/${reservation.id}`}>
                                            <Button variant="outline" size="sm">View</Button>
                                        </Link>
                                        <button
                                            onClick={() => handleDeleteClick(reservation.id, reservation.customer_name)}
                                            disabled={deletingId === reservation.id}
                                            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 dark:bg-gray-800 dark:text-red-500 dark:border-gray-700 transition-colors cursor-pointer"
                                        >
                                            <TrashBinIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showConfirmModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Reservation?</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to delete the reservation for <strong>{reservationToDelete?.customerName}</strong>?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" size="sm" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
                            <Button size="sm" onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
                                {deletingId ? "Deleting..." : "Delete"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
