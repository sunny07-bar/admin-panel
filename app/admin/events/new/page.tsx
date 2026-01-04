"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImageToWebP } from "@/lib/utils/imageCompression";
import { generateUniqueImageFilename } from "@/lib/utils/imageFilename";
import { floridaDateTimeLocalToUTC } from "@/lib/utils/timezone";
import BackButton from "@/components/common/BackButton";
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
    base_ticket_price: "",
    ticket_currency: "USD",
    ticket_link: "",
    reservation_price: "",
    action_button_type: "reservation", // "reservation" | "external_tickets" | "custom_tickets"
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ticketTypes, setTicketTypes] = useState<Array<{
    name: string;
    price: string;
    currency: string;
    quantity_total: string;
  }>>([]);
  const [newTicketType, setNewTicketType] = useState({
    name: "",
    price: "",
    currency: "USD",
    quantity_total: "",
  });

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

  const addTicketType = () => {
    if (!newTicketType.name || !newTicketType.price) {
      alert("Please fill in ticket name and price");
      return;
    }

    setTicketTypes([...ticketTypes, { ...newTicketType }]);
    setNewTicketType({ name: "", price: "", currency: "USD", quantity_total: "" });
  };

  const deleteTicketType = (index: number) => {
    if (!confirm("Are you sure you want to remove this ticket type?")) return;
    setTicketTypes(ticketTypes.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Either ticket_link OR base_ticket_price OR ticket types must be set
    // If ticket_link is provided, it overrides internal ticket system
    const hasTicketLink = formData.ticket_link && formData.ticket_link.trim() !== ""
    const hasBasePrice = formData.base_ticket_price !== "" && formData.base_ticket_price !== null && !isNaN(parseFloat(formData.base_ticket_price))
    
    if (!hasTicketLink && !hasBasePrice && ticketTypes.length === 0) {
      alert("Please set either an External Ticket Link, a Base Ticket Price (can be 0 for free events), or add at least one Ticket Type. Events need tickets to be purchasable.");
      return;
    }

    setLoading(true);

    try {
      let imagePath = null;

      if (imageFile) {
        // Compress and convert to WebP (under 100KB, maintains quality)
        const compressedFile = await compressImageToWebP(imageFile);
        // Generate unique filename to ensure cache busting when images are updated
        const fileName = generateUniqueImageFilename(imageFile.name);
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

      console.log('Creating event - TIME CONVERSION:', {
        'User entered (Florida time)': formData.event_start,
        'Stored in DB (UTC)': eventStartUTC,
        'User entered end (Florida time)': formData.event_end,
        'Stored end in DB (UTC)': eventEndUTC,
      })

      // Create the event
      const { data: newEvent, error: eventError } = await supabase
        .from("events")
        .insert({
        ...formData,
          event_start: eventStartUTC,
          event_end: eventEndUTC,
        image_path: imagePath,
          base_ticket_price: formData.base_ticket_price !== "" && formData.base_ticket_price !== null && !isNaN(parseFloat(formData.base_ticket_price)) ? parseFloat(formData.base_ticket_price) : null,
        ticket_currency: formData.ticket_currency || "USD",
        ticket_link: formData.ticket_link || null,
        reservation_price: formData.reservation_price !== "" && formData.reservation_price !== null && !isNaN(parseFloat(formData.reservation_price)) ? parseFloat(formData.reservation_price) : null,
        action_button_type: formData.action_button_type || "reservation",
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Create ticket types if any
      if (ticketTypes.length > 0 && newEvent) {
        const ticketTypesToInsert = ticketTypes.map((ticket) => ({
          event_id: newEvent.id,
          name: ticket.name,
          price: parseFloat(ticket.price),
          currency: ticket.currency || "USD",
          quantity_total: ticket.quantity_total ? parseInt(ticket.quantity_total) : null,
          quantity_sold: 0,
        }));

        const { error: ticketsError } = await supabase
          .from("event_tickets")
          .insert(ticketTypesToInsert);

        if (ticketsError) {
          console.error("Error creating ticket types:", ticketsError);
          // Continue even if ticket types fail to create - user can add them later
        }
      }

      router.push("/events");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <BackButton href="/admin/events" />

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
                Start Date & Time (Florida Time) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="event_start"
                type="datetime-local"
                value={formData.event_start}
                onChange={(e) => setFormData({ ...formData, event_start: e.target.value })}
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                All times are in Florida timezone (America/New_York, EST/EDT)
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
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                All times are in Florida timezone (America/New_York, EST/EDT)
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

          </div>
        </div>

        {/* Action Button Type Selection */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-dark">
          <h2 className="text-xl font-semibold mb-4">Action Button Type</h2>
          <p className="text-sm text-gray-600 mb-4 dark:text-gray-400">
            Select which action button to display for this event. The form below will update based on your selection.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, action_button_type: 'reservation' })}
              className={`p-4 rounded-lg border-2 transition-all ${
                formData.action_button_type === 'reservation'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold mb-1 flex items-center gap-2">
                Make a Reservation
                {formData.action_button_type === 'reservation' && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">Active</span>
                )}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Users can make a reservation for this event
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, action_button_type: 'external_tickets' })}
              className={`p-4 rounded-lg border-2 transition-all ${
                formData.action_button_type === 'external_tickets'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold mb-1 flex items-center gap-2">
                Get Tickets (External)
                {formData.action_button_type === 'external_tickets' && (
                  <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">Active</span>
                )}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Redirect to external ticket link
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, action_button_type: 'custom_tickets' })}
              className={`p-4 rounded-lg border-2 transition-all ${
                formData.action_button_type === 'custom_tickets'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold mb-1 flex items-center gap-2">
                Get Ticket (Custom)
                {formData.action_button_type === 'custom_tickets' && (
                  <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded">Active</span>
                )}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Use internal ticket system
              </div>
            </button>
          </div>
        </div>

        {/* Dynamic Form Section - Only show selected type */}
        
        {/* Reservation Configuration - Only show when reservation is selected */}
        {formData.action_button_type === 'reservation' && (
          <div className="rounded-2xl border-2 border-blue-500 bg-blue-50/30 dark:bg-blue-900/10 p-6 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Reservation Configuration</h2>
              <span className="text-xs bg-blue-500 text-white px-3 py-1 rounded-full font-semibold">Currently Active</span>
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="font-semibold mb-3">Reservation Price Per Person (Optional)</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Set a price per person for making a reservation for this event. If set, users will be charged this amount multiplied by the number of guests when they make a reservation for this event's date and time.
              </p>
              <div>
                <Label htmlFor="reservation_price">Reservation Price Per Person</Label>
                <Input
                  id="reservation_price"
                  type="number"
                  min="0"
                  step={0.01}
                  value={formData.reservation_price}
                  onChange={(e) => setFormData({ ...formData, reservation_price: e.target.value })}
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for free reservations. This price is per person - the total will be calculated by multiplying by the number of guests.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* External Tickets Configuration - Only show when external_tickets is selected */}
        {formData.action_button_type === 'external_tickets' && (
          <div className="rounded-2xl border-2 border-green-500 bg-green-50/30 dark:bg-green-900/10 p-6 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">External Tickets Configuration</h2>
              <span className="text-xs bg-green-500 text-white px-3 py-1 rounded-full font-semibold">Currently Active</span>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold mb-3">External Ticket Link</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Add the external ticket purchase URL. Users will be redirected to this URL when they click "Get Tickets".
              </p>
              <div>
                <Label htmlFor="ticket_link">External Ticket Purchase URL</Label>
                <Input
                  id="ticket_link"
                  type="url"
                  value={formData.ticket_link}
                  onChange={(e) => setFormData({ ...formData, ticket_link: e.target.value })}
                  placeholder="https://example.com/tickets"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Users will be redirected to this URL when clicking "Get Tickets" button.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Custom Tickets Configuration - Only show when custom_tickets is selected */}
        {formData.action_button_type === 'custom_tickets' && (
          <div className="rounded-2xl border-2 border-purple-500 bg-purple-50/30 dark:bg-purple-900/10 p-6 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Custom Tickets Configuration</h2>
              <span className="text-xs bg-purple-500 text-white px-3 py-1 rounded-full font-semibold">Currently Active</span>
            </div>
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
                  {ticketTypes.map((ticket, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-semibold">{ticket.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {ticket.currency} {parseFloat(ticket.price || "0").toFixed(2)}
                          {ticket.quantity_total && ` • ${ticket.quantity_total} total`}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => deleteTicketType(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
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
        )}

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

