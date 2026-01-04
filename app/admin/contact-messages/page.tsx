"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import BackButton from "@/components/common/BackButton";
import Button from "@/components/ui/button/Button";
import StatusFilter from "@/components/common/StatusFilter";
import { formatFloridaTime, getFloridaDayStartUTC, getFloridaDayEndUTC } from "@/lib/utils/timezone";

export default function ContactMessagesPage() {
  const supabase = createClient();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    fetchMessages();
  }, [statusFilter, dateFilter]);

  const fetchMessages = async () => {
    setLoading(true);
    let query = supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    if (dateFilter) {
      // Use Florida timezone for date filtering
      const startDateUTC = getFloridaDayStartUTC(dateFilter);
      const endDateUTC = getFloridaDayEndUTC(dateFilter);
      query = query
        .gte("created_at", startDateUTC)
        .lte("created_at", endDateUTC);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching messages:", error);
      setMessages([]);
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  const updateMessageStatus = async (messageId: string, newStatus: string) => {
    const { error } = await supabase
      .from("contact_messages")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", messageId);

    if (error) {
      alert("Failed to update message status: " + error.message);
    } else {
      fetchMessages();
    }
  };

  return (
    <div className="space-y-6">
      <BackButton />

      <div className="flex items-center gap-4">
        <StatusFilter
          options={[
            { value: "", label: "All Status" },
            { value: "new", label: "New" },
            { value: "read", label: "Read" },
            { value: "replied", label: "Replied" },
            { value: "archived", label: "Archived" },
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
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Subject
                  </th>
                  <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Message Preview
                  </th>
                  <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {messages.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No messages found
                    </td>
                  </tr>
                ) : (
                  messages.map((message) => (
                    <tr key={message.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="px-6 py-4">
                        <p className="text-theme-sm font-medium text-gray-900 dark:text-white">
                          {message.name}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          {message.email && (
                            <p className="text-theme-sm text-gray-900 dark:text-white">
                              {message.email}
                            </p>
                          )}
                          {message.phone && (
                            <p className="text-theme-xs text-gray-600 dark:text-gray-400">
                              {message.phone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-theme-sm text-gray-900 dark:text-white">
                          {message.subject || "No subject"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-theme-sm text-gray-600 dark:text-gray-400 line-clamp-2 max-w-md">
                          {message.message?.substring(0, 100)}
                          {message.message && message.message.length > 100 ? "..." : ""}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-theme-sm text-gray-600 dark:text-gray-400">
                        {formatFloridaTime(message.created_at, "MM-dd-yyyy h:mm a")}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            message.status === "new"
                              ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                              : message.status === "read"
                              ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                              : message.status === "replied"
                              ? "bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400"
                              : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                          }`}
                        >
                          {message.status || "new"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/admin/contact-messages/${message.id}`}>
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

