"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import { PlusIcon, TrashBinIcon } from "@/icons";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export default function EventsPage() {
  const supabase = createClient();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("event_start", { ascending: false });
    setEvents(data || []);
    setLoading(false);
  };

  const handleDelete = async (id: string, imagePath: string | null) => {
    if (!confirm("Are you sure you want to delete this event? This will also delete all tickets.")) return;

    try {
      // Delete from storage
      if (imagePath) {
        await supabase.storage.from("events").remove([imagePath]);
      }

      // Delete from database (tickets will be deleted via cascade)
      const { error } = await supabase.from("events").delete().eq("id", id);

      if (error) throw error;

      fetchEvents();
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb items={[{ label: "Events" }]} />
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageBreadcrumb items={[{ label: "Events" }]} />
        <Link href="/events/new">
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Event
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events?.map((event) => (
          <div
            key={event.id}
            className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark"
          >
            {event.image_path && (
              <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/events/${event.image_path}?t=${Date.now()}`}
                alt={event.title}
                className="h-48 w-full rounded-t-2xl object-cover"
                key={`${event.id}-${event.updated_at || Date.now()}`}
              />
            )}
            <div className="p-6">
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {event.title}
              </h3>
              <p className="mb-4 text-theme-sm text-gray-600 dark:text-gray-400">
                {new Date(event.event_start).toLocaleDateString()}
              </p>
              <div className="flex gap-2">
                <Link href={`/events/${event.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(event.id, event.image_path)}
                  className="text-error-500 hover:text-error-600 hover:border-error-500"
                >
                  <TrashBinIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

