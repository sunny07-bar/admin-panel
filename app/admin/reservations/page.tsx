"use client";

import React from "react";
import BackButton from "@/components/common/BackButton";
import ReservationCalendar from "@/components/reservations/ReservationCalendar";

export default function ReservationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <BackButton />
        {/* No toggle anymore - Calendar is Master View */}
      </div>

      <ReservationCalendar />
    </div>
  );
}
