"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BackButton from "@/components/common/BackButton";
import Button from "@/components/ui/button/Button";
import Select from "@/components/form/Select";
import Label from "@/components/form/Label";
import { formatFloridaTime } from "@/lib/utils/timezone";

export default function ContactMessageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [message, setMessage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadMessage();
    }
  }, [params.id]);

  const loadMessage = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) throw error;
      setMessage(data);

      // Mark as read if it's new
      if (data.status === "new") {
        await supabase
          .from("contact_messages")
          .update({ status: "read", updated_at: new Date().toISOString() })
          .eq("id", params.id);
      }

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
        .from("contact_messages")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", params.id);

      if (error) throw error;
      setMessage({ ...message, status: newStatus });
    } catch (error: any) {
      alert("Failed to update status: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <BackButton href="/admin/offers" />
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="space-y-6">
        <BackButton href="/admin/offers" />
        <div className="text-center py-12">Message not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton href="/admin/offers" />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Contact Message
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label>Status:</Label>
            <Select
              value={message.status || "new"}
              onChange={handleStatusUpdate}
              disabled={updating}
              className="min-w-[150px]"
              options={[
                { value: "new", label: "New" },
                { value: "read", label: "Read" },
                { value: "replied", label: "Replied" },
                { value: "archived", label: "Archived" },
              ]}
            />
          </div>
          <Button variant="outline" onClick={() => router.push("/admin/contact-messages")}>
            Back to Messages
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark p-6 space-y-6">
        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <p className="text-theme-sm text-gray-600 dark:text-gray-400 mb-1">Name</p>
            <p className="font-semibold text-gray-900 dark:text-white">{message.name}</p>
          </div>
          {message.email && (
            <div>
              <p className="text-theme-sm text-gray-600 dark:text-gray-400 mb-1">Email</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                <a href={`mailto:${message.email}`} className="text-brand-500 hover:underline">
                  {message.email}
                </a>
              </p>
            </div>
          )}
          {message.phone && (
            <div>
              <p className="text-theme-sm text-gray-600 dark:text-gray-400 mb-1">Phone</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                <a href={`tel:${message.phone}`} className="text-brand-500 hover:underline">
                  {message.phone}
                </a>
              </p>
            </div>
          )}
          <div>
            <p className="text-theme-sm text-gray-600 dark:text-gray-400 mb-1">Date Received</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {formatFloridaTime(message.created_at, "MM-dd-yyyy 'at' h:mm a")}
            </p>
          </div>
          <div>
            <p className="text-theme-sm text-gray-600 dark:text-gray-400 mb-1">Status</p>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
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
          </div>
        </div>

        {/* Subject */}
        {message.subject && (
          <div>
            <p className="text-theme-sm text-gray-600 dark:text-gray-400 mb-2">Subject</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{message.subject}</p>
          </div>
        )}

        {/* Message */}
        <div>
          <p className="text-theme-sm text-gray-600 dark:text-gray-400 mb-2">Message</p>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{message.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

