"use client";

import React from "react";
import Header from "@/components/layout/Header";
import MobileNavBar from "@/components/layout/MobileNavBar";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0">
      <Header />
      <main className="p-4 mx-auto max-w-7xl sm:p-6">
        {children}
      </main>
      <MobileNavBar />
    </div>
  );
}
