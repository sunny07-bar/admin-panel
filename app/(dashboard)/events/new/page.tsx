"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImageToWebP } from "@/lib/utils/imageCompression";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import TextArea from "@/components/form/input/TextArea";

export default function NewEventPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    event_start: "",
    event_end: "",
    location: "",
    is_featured: false,
    base_ticket_price: "",
    ticket_currency: "USD",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleTitleChange = (title: string) => {
    // Auto-generate slug from title if slug is empty or matches previous title
    const newSlug = generateSlug(title);
    setFormData({ ...formData, title, slug: formData.slug || newSlug });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Base ticket price should be set (can be 0 for free events)
    if (formData.base_ticket_price === "" || formData.base_ticket_price === null || isNaN(parseFloat(formData.base_ticket_price))) {
      alert(
        "Please set a Base Ticket Price for the event. You can set it to 0 for free events."
      );
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let imagePath = null;

      if (imageFile) {
        // Compress and convert to WebP
        const compressedFile = await compressImageToWebP(imageFile, 200);
        const fileName = `${Math.random()}.webp`;
        const filePath = `events/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("events")
          .upload(filePath, compressedFile);

        if (uploadError) throw uploadError;
        imagePath = filePath;
      }

      const { error } = await supabase.from("events").insert({
        ...formData,
        event_start: formData.event_start ? new Date(formData.event_start).toISOString() : null,
        event_end: formData.event_end ? new Date(formData.event_end).toISOString() : null,
        image_path: imagePath,
        base_ticket_price: formData.base_ticket_price ? parseFloat(formData.base_ticket_price) : null,
        ticket_currency: formData.ticket_currency || "USD",
      });

      if (error) throw error;

      router.push("/events");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={[{ label: "Events", href: "/events" }, { label: "New" }]} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-dark">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="slug">
                Slug <span className="text-red-500">*</span>
              </Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="event_start">
                Start Date & Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="event_start"
                type="datetime-local"
                value={formData.event_start}
                onChange={(e) => setFormData({ ...formData, event_start: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="event_end">End Date & Time</Label>
              <Input
                id="event_end"
                type="datetime-local"
                value={formData.event_end}
                onChange={(e) => setFormData({ ...formData, event_end: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="base_ticket_price">
                Base Ticket Price <span className="text-red-500">*</span>
              </Label>
              <Input
                id="base_ticket_price"
                type="number"
                min="0"
                step={0.01}
                value={formData.base_ticket_price}
                onChange={(e) => setFormData({ ...formData, base_ticket_price: e.target.value })}
                placeholder="0.00"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Required. Set to 0 for free events. You can add specific ticket types after creating the event.
              </p>
            </div>

            <div>
              <Label htmlFor="ticket_currency">Currency</Label>
              <select
                id="ticket_currency"
                value={formData.ticket_currency}
                onChange={(e) => setFormData({ ...formData, ticket_currency: e.target.value })}
                className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>

            <div>
              <Label htmlFor="image">Image</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <TextArea
                id="description"
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                rows={4}
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-theme-sm text-gray-700 dark:text-gray-300">Featured</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </form>
    </div>
  );
}

