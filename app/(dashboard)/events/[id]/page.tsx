"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImageToWebP } from "@/lib/utils/imageCompression";
import { floridaDateTimeLocalToUTC, utcToFloridaDateTimeLocal } from "@/lib/utils/timezone";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import TextArea from "@/components/form/input/TextArea";

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    event_start: "",
    event_end: "",
    location: "",
    base_ticket_price: "",
    ticket_currency: "USD",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [originalImagePath, setOriginalImagePath] = useState<string | null>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [newTicketType, setNewTicketType] = useState({
    name: "",
    price: "",
    currency: "USD",
    quantity_total: "",
  });

  useEffect(() => {
    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) {
        alert(error.message);
        router.push("/events");
        return;
      }

      if (data) {
        // Convert UTC dates from database to Florida datetime-local format
        const eventStartLocal = data.event_start ? utcToFloridaDateTimeLocal(data.event_start) : ""
        const eventEndLocal = data.event_end ? utcToFloridaDateTimeLocal(data.event_end) : ""
        
        console.log('EditEventPage - Loaded from DB:', {
          'Stored in DB (UTC)': data.event_start,
          'Converted to Florida (for input)': eventStartLocal,
          'Stored end in DB (UTC)': data.event_end,
          'Converted end to Florida (for input)': eventEndLocal,
        })
        
        setFormData({
          title: data.title || "",
          slug: data.slug || "",
          description: data.description || "",
          event_start: eventStartLocal,
          event_end: eventEndLocal,
          location: data.location || "",
          base_ticket_price: data.base_ticket_price ? String(data.base_ticket_price) : "",
          ticket_currency: data.ticket_currency || "USD",
        });
        if (data.image_path) {
          setOriginalImagePath(data.image_path);
          setCurrentImage(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/events/${data.image_path}?t=${Date.now()}`
          );
        }

        // Fetch ticket types
        const { data: tickets, error: ticketsError } = await supabase
          .from("event_tickets")
          .select("*")
          .eq("event_id", params.id)
          .order("created_at", { ascending: true });

        if (!ticketsError && tickets) {
          setTicketTypes(tickets);
        }
      }
      setFetching(false);
    };

    fetchEvent();
  }, [params.id, supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Either base_ticket_price OR ticket types must be set (base_ticket_price can be 0 for free events)
    const hasBasePrice = formData.base_ticket_price !== "" && formData.base_ticket_price !== null && !isNaN(parseFloat(formData.base_ticket_price))
    if (!hasBasePrice && ticketTypes.length === 0) {
      alert("Please set either a Base Ticket Price (can be 0 for free events) or add at least one Ticket Type. Events need tickets to be purchasable.");
      return;
    }

    setLoading(true);

    try {
      let imagePath = currentImage
        ? currentImage.split("/storage/v1/object/public/events/")[1]
        : null;

      if (imageFile) {
        // Delete old image if exists
        if (originalImagePath) {
          // Clean the path: remove URL parts if present, otherwise use as-is
          let cleanPath = originalImagePath;
          if (originalImagePath.includes('/storage/v1/object/public/events/')) {
            cleanPath = originalImagePath.split('/storage/v1/object/public/events/')[1];
          }
          cleanPath = cleanPath.split('?')[0];
          
          console.log("Deleting old event image:", cleanPath, "from bucket: events");
          await supabase.storage.from("events").remove([cleanPath]);
        }

        // Compress and convert to WebP (under 100KB, maintains quality)
        const compressedFile = await compressImageToWebP(imageFile);
        const fileName = `${Math.random()}.webp`;
        const filePath = `events/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("events")
          .upload(filePath, compressedFile);

        if (uploadError) throw uploadError;
        imagePath = filePath;
      }

      // Convert Florida datetime to UTC for database storage
      const eventStartUTC = formData.event_start ? floridaDateTimeLocalToUTC(formData.event_start) : null
      const eventEndUTC = formData.event_end ? floridaDateTimeLocalToUTC(formData.event_end) : null

      console.log('Updating event:', {
        event_start_local: formData.event_start,
        event_start_utc: eventStartUTC,
        event_end_local: formData.event_end,
        event_end_utc: eventEndUTC,
      })

      const { error } = await supabase
        .from("events")
        .update({
          ...formData,
          event_start: eventStartUTC,
          event_end: eventEndUTC,
          image_path: imagePath,
          base_ticket_price: formData.base_ticket_price !== "" && formData.base_ticket_price !== null && !isNaN(parseFloat(formData.base_ticket_price)) ? parseFloat(formData.base_ticket_price) : null,
          ticket_currency: formData.ticket_currency || "USD",
        })
        .eq("id", params.id);

      if (error) throw error;

      // Force refresh by navigating with cache bypass
      router.refresh();
      router.push("/events");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addTicketType = async () => {
    if (!newTicketType.name || !newTicketType.price) {
      alert("Please fill in ticket name and price");
      return;
    }

    const { data, error } = await supabase
      .from("event_tickets")
      .insert({
        event_id: params.id,
        name: newTicketType.name,
        price: parseFloat(newTicketType.price),
        currency: newTicketType.currency || "USD",
        quantity_total: newTicketType.quantity_total ? parseInt(newTicketType.quantity_total) : null,
        quantity_sold: 0,
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setTicketTypes([...ticketTypes, data]);
    setNewTicketType({ name: "", price: "", currency: "USD", quantity_total: "" });
  };

  const deleteTicketType = async (ticketId: string) => {
    if (!confirm("Are you sure you want to delete this ticket type?")) return;

    const { error } = await supabase
      .from("event_tickets")
      .delete()
      .eq("id", ticketId);

    if (error) {
      alert(error.message);
      return;
    }

    setTicketTypes(ticketTypes.filter((t) => t.id !== ticketId));
  };

  if (fetching) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={[{ label: "Events", href: "/events" }, { label: "Edit" }]} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Event Details */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-dark">
          <h2 className="text-xl font-semibold mb-4">Event Details</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                Start Date & Time (Florida Time) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="event_start"
                type="datetime-local"
                value={formData.event_start}
                onChange={(e) => setFormData({ ...formData, event_start: e.target.value })}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter time in Florida timezone (EST/EDT, UTC-5)
              </p>
            </div>

            <div>
              <Label htmlFor="event_end">End Date & Time (Florida Time)</Label>
              <Input
                id="event_end"
                type="datetime-local"
                value={formData.event_end}
                onChange={(e) => setFormData({ ...formData, event_end: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter time in Florida timezone (EST/EDT, UTC-5)
              </p>
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
              <Label htmlFor="image">Image</Label>
              {currentImage && (
                <img 
                  src={`${currentImage.split('?')[0]}?t=${Date.now()}`} 
                  alt="Current" 
                  className="mb-2 h-32 w-64 rounded object-cover" 
                  key={Date.now()}
                />
              )}
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                  if (file) {
                    // Preview new image immediately
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      setCurrentImage(e.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
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

          </div>
        </div>

        {/* Ticket Configuration */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-dark">
          <h2 className="text-xl font-semibold mb-4">Ticket Configuration</h2>
          <p className="text-sm text-gray-600 mb-4">
            <span className="text-red-500">*</span> You must set either a <strong>Base Ticket Price</strong> OR add <strong>Ticket Types</strong> for customers to purchase tickets.
          </p>

          {/* Base Ticket Price */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h3 className="font-semibold mb-3">Base Ticket Price (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="base_ticket_price">Base Ticket Price</Label>
                <Input
                  id="base_ticket_price"
                  type="number"
                  min="0"
                  step={0.01}
                  value={formData.base_ticket_price}
                  onChange={(e) => setFormData({ ...formData, base_ticket_price: e.target.value })}
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">Use this if you have a single price for all tickets</p>
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
            </div>
          </div>

          {/* Ticket Types */}
          <div>
            <h3 className="font-semibold mb-3">Ticket Types (Optional)</h3>
            <p className="text-xs text-gray-500 mb-4">Add multiple ticket types (e.g., General Admission, VIP, Early Bird)</p>

            {/* Existing Ticket Types */}
            {ticketTypes.length > 0 && (
              <div className="mb-4 space-y-2">
                {ticketTypes.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-semibold">{ticket.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {ticket.currency} {parseFloat(ticket.price.toString()).toFixed(2)}
                        {ticket.quantity_total && ` • ${ticket.quantity_total - ticket.quantity_sold} available`}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => deleteTicketType(ticket.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Ticket Type */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <h4 className="font-medium mb-3">Add New Ticket Type</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="ticket_name">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="ticket_name"
                    value={newTicketType.name}
                    onChange={(e) => setNewTicketType({ ...newTicketType, name: e.target.value })}
                    placeholder="e.g., General Admission"
                  />
                </div>
                <div>
                  <Label htmlFor="ticket_price">
                    Price <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="ticket_price"
                    type="number"
                    min="0"
                    step={0.01}
                    value={newTicketType.price}
                    onChange={(e) => setNewTicketType({ ...newTicketType, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="ticket_quantity">Total Quantity (Optional)</Label>
                  <Input
                    id="ticket_quantity"
                    type="number"
                    min="0"
                    value={newTicketType.quantity_total}
                    onChange={(e) => setNewTicketType({ ...newTicketType, quantity_total: e.target.value })}
                    placeholder="Leave empty for unlimited"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={addTicketType}
                    className="w-full"
                  >
                    Add Ticket Type
                  </Button>
                </div>
              </div>
            </div>

            {/* Warning if no tickets configured */}
            {!formData.base_ticket_price && ticketTypes.length === 0 && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>⚠️ Warning:</strong> No tickets configured. Please set a Base Ticket Price or add at least one Ticket Type for customers to purchase tickets.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Event"}
          </Button>
        </div>
      </form>
    </div>
  );
}
