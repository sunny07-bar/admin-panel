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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this special hour? This will also delete all related configurations.")) return;

    try {
      const { error } = await supabase.from("special_hours").delete().eq("id", id);
      if (error) throw error;
      fetchSpecialHours();
    } catch (error: any) {
      alert(error.message);
    }
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(sh.id)}
                          className="text-error-500 hover:text-error-600 hover:border-error-500"
                        >
                          <TrashBinIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

