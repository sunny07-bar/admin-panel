"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImageToWebP } from "@/lib/utils/imageCompression";
import { generateUniqueImageFilename } from "@/lib/utils/imageFilename";
import { getImageUrl } from "@/lib/utils/image-utils";
import { floridaDateTimeLocalToUTC, utcToFloridaDateTimeLocal } from "@/lib/utils/timezone";
import BackButton from "@/components/common/BackButton";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import TextArea from "@/components/form/input/TextArea";
import { Modal } from "@/components/ui/modal";
import Badge from "@/components/ui/badge/Badge";

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
    ticket_link: "",
    reservation_price: "",
    action_button_type: "reservation", // "reservation" | "external_tickets" | "custom_tickets"
  });
  const [areaLimits, setAreaLimits] = useState({
    Restaurant: "",
    "Stage Bar": "",
    "Middle Bar": "",
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

  // Ticket Editing State
  const [editingTicket, setEditingTicket] = useState<any | null>(null);
  const [isEditTicketModalOpen, setIsEditTicketModalOpen] = useState(false);
  const [updatingTicket, setUpdatingTicket] = useState(false);

  // Promotions & BOGO State
  const [promotions, setPromotions] = useState<any[]>([]);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any | null>(null);
  const [savingPromo, setSavingPromo] = useState(false);
  const [promoForm, setPromoForm] = useState({
    name: "",
    promo_code: "",
    discount_type: "bogo", // "bogo" | "percentage" | "fixed_amount"
    discount_value: "0",
    buy_quantity: "1",
    get_quantity: "1",
    get_discount_percent: "100",
    ticket_type_id: "",
    min_tickets_required: "2",
    max_uses_total: "",
    is_active: true,
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
          'Event ID': data.id,
          'Event Title': data.title,
          'Stored in DB (UTC)': data.event_start,
          'Converted to Florida (for input)': eventStartLocal,
          'Date part from input': eventStartLocal ? eventStartLocal.split('T')[0] : 'N/A',
          'Time part from input': eventStartLocal ? eventStartLocal.split('T')[1] : 'N/A',
          'Stored end in DB (UTC)': data.event_end,
          'Converted end to Florida (for input)': eventEndLocal,
        })

        // Also log what formatFloridaDateDDMMYYYY would show
        if (data.event_start) {
          const { formatFloridaDateDDMMYYYY } = require('@/lib/utils/timezone');
          const listPageDate = formatFloridaDateDDMMYYYY(data.event_start);
          console.log('EditEventPage - Comparison:', {
            'List page would show': listPageDate,
            'Edit page datetime-local': eventStartLocal,
            'Edit page date part': eventStartLocal ? eventStartLocal.split('T')[0] : 'N/A',
            'Match': listPageDate === (eventStartLocal ? (() => {
              const [y, m, d] = eventStartLocal.split('T')[0].split('-').map(Number);
              return `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}-${y}`;
            })() : 'N/A')
          });
        }

        setFormData({
          title: data.title || "",
          slug: data.slug || "",
          description: data.description || "",
          event_start: eventStartLocal,
          event_end: eventEndLocal,
          location: data.location || "",
          base_ticket_price: data.base_ticket_price ? String(data.base_ticket_price) : "",
          ticket_currency: data.ticket_currency || "USD",
          ticket_link: data.ticket_link || "",
          reservation_price: data.reservation_price ? String(data.reservation_price) : "",
          action_button_type: data.action_button_type || "reservation",
        });
        if (data.image_path) {
          setOriginalImagePath(data.image_path);
          setCurrentImage(
            getImageUrl(data.image_path, 'events') || ''
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

        // Fetch promotions (if table exists)
        try {
          const { data: promos, error: promosError } = await supabase
            .from("event_promotions")
            .select("*")
            .eq("event_id", params.id)
            .order("created_at", { ascending: true });

          if (!promosError && promos) {
            setPromotions(promos);
          }
        } catch (e) {
          console.log("event_promotions table not available or error:", e);
        }
      }
      // Fetch reservation seat limits (ONLY if reservation event)
      const { data: limits, error: limitsError } = await supabase
        .from("event_reservation_limits")
        .select("*")
        .eq("event_id", params.id);

      if (!limitsError && limits) {
        const mapped = {
          Restaurant: "",
          "Stage Bar": "",
          "Middle Bar": "",
        };

        limits.forEach((l) => {
          if (l.area in mapped) {
            mapped[l.area as keyof typeof mapped] = String(l.max_seats);
          }
        });

        setAreaLimits(mapped);
      }

      setFetching(false);
    };

    fetchEvent();
  }, [params.id, supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Either ticket_link OR base_ticket_price OR ticket types must be set
    // If ticket_link is provided, it overrides internal ticket system
    const hasTicketLink = formData.ticket_link && formData.ticket_link.trim() !== ""
    const hasBasePrice = formData.base_ticket_price !== "" && formData.base_ticket_price !== null && !isNaN(parseFloat(formData.base_ticket_price))

    const isReservation = formData.action_button_type === "reservation";

    if (!isReservation) {
      const hasTicketLink =
        formData.ticket_link && formData.ticket_link.trim() !== "";
      const hasBasePrice =
        formData.base_ticket_price !== "" &&
        !isNaN(parseFloat(formData.base_ticket_price));

      if (!hasTicketLink && !hasBasePrice && ticketTypes.length === 0) {
        alert(
          "Please set either an External Ticket Link, a Base Ticket Price, or add at least one Ticket Type."
        );
        return;
      }
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
        // Generate NEW unique filename so browser fetches updated image (cache busting)
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
          ticket_link: formData.ticket_link || null,
          reservation_price: formData.reservation_price !== "" && formData.reservation_price !== null && !isNaN(parseFloat(formData.reservation_price)) ? parseFloat(formData.reservation_price) : null,
          action_button_type: formData.action_button_type || "reservation",
        })
        .eq("id", params.id);

      if (error) throw error;

      // Save reservation seat limits (ONLY for reservation events)
      if (formData.action_button_type === "reservation") {
        // Remove old limits for this event (avoid referencing undefined local 'data')
        const { error: deleteError } = await supabase
          .from("event_reservation_limits")
          .delete()
          .eq("event_id", params.id);

        if (deleteError) {
          throw deleteError;
        }

        const rows = Object.entries(areaLimits)
          .filter(([_, v]) => v && Number(v) > 0)
          .map(([area, max_seats]) => ({
            event_id: params.id,
            area,
            max_seats: Number(max_seats),
          }));

        if (rows.length > 0) {
          await supabase
            .from("event_reservation_limits")
            .insert(rows);
        }
      }


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

    const priceNum = parseFloat(newTicketType.price);
    if (isNaN(priceNum) || priceNum < 0) {
      alert("Please enter a valid price (greater than or equal to 0)");
      return;
    }

    const payload: any = {
      event_id: params.id,
      name: newTicketType.name.trim(),
      price: priceNum,
      currency: newTicketType.currency || formData.ticket_currency || "USD",
      quantity_total: newTicketType.quantity_total ? parseInt(newTicketType.quantity_total) : null,
      quantity_sold: 0,
      is_active: true,
    };

    let { data, error } = await supabase
      .from("event_tickets")
      .insert(payload)
      .select()
      .single();

    // Gracefully handle if is_active column does not exist yet before migration
    if (error && (error.message?.includes("column") || error.code === "42703")) {
      delete payload.is_active;
      const retry = await supabase
        .from("event_tickets")
        .insert(payload)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      alert(error.message);
      return;
    }

    setTicketTypes([...ticketTypes, data]);
    setNewTicketType({ name: "", price: "", currency: "USD", quantity_total: "" });
  };

  const openEditTicket = (ticket: any) => {
    setEditingTicket({
      ...ticket,
      name: ticket.name || "",
      price: ticket.price !== null && ticket.price !== undefined ? String(ticket.price) : "",
      currency: ticket.currency || formData.ticket_currency || "USD",
      quantity_total: ticket.quantity_total !== null && ticket.quantity_total !== undefined ? String(ticket.quantity_total) : "",
      is_active: ticket.is_active !== false,
      description: ticket.description || "",
      quantity_sold: ticket.quantity_sold || 0,
    });
    setIsEditTicketModalOpen(true);
  };

  const handleSaveTicketEdit = async () => {
    if (!editingTicket) return;
    if (!editingTicket.name.trim()) {
      alert("Ticket name is required.");
      return;
    }

    const priceNum = parseFloat(editingTicket.price);
    if (isNaN(priceNum) || priceNum < 0) {
      alert("Please enter a valid price (greater than or equal to 0).");
      return;
    }

    const soldCount = editingTicket.quantity_sold || 0;
    const totalQty = editingTicket.quantity_total !== "" && editingTicket.quantity_total !== null
      ? parseInt(editingTicket.quantity_total)
      : null;

    if (totalQty !== null && totalQty < soldCount) {
      alert(`Total capacity cannot be less than the ${soldCount} ticket(s) already purchased.`);
      return;
    }

    setUpdatingTicket(true);
    try {
      const updatePayload: any = {
        name: editingTicket.name.trim(),
        price: priceNum,
        currency: editingTicket.currency || "USD",
        quantity_total: totalQty,
        updated_at: new Date().toISOString(),
      };

      // Try updating with additive columns
      let updateError = null;
      try {
        const { error } = await supabase
          .from("event_tickets")
          .update({
            ...updatePayload,
            is_active: editingTicket.is_active,
            description: editingTicket.description || null,
          })
          .eq("id", editingTicket.id);
        updateError = error;
      } catch (err: any) {
        updateError = err;
      }

      // If additive columns do not exist yet before migration, fall back to core columns
      if (updateError && (updateError.message?.includes("column") || updateError.code === "42703")) {
        const { error: retryError } = await supabase
          .from("event_tickets")
          .update(updatePayload)
          .eq("id", editingTicket.id);
        if (retryError) throw retryError;
      } else if (updateError) {
        throw updateError;
      }

      // Update local state
      setTicketTypes((prev) =>
        prev.map((t) =>
          t.id === editingTicket.id
            ? {
                ...t,
                ...updatePayload,
                is_active: editingTicket.is_active,
                description: editingTicket.description,
              }
            : t
        )
      );

      setIsEditTicketModalOpen(false);
      setEditingTicket(null);
      alert("Ticket updated! New price and capacity will apply to future purchases.");
    } catch (err: any) {
      alert(err.message || "Failed to update ticket type");
    } finally {
      setUpdatingTicket(false);
    }
  };

  const toggleTicketActive = async (ticket: any) => {
    const newActiveState = ticket.is_active === false;
    try {
      const { error } = await supabase
        .from("event_tickets")
        .update({ is_active: newActiveState, updated_at: new Date().toISOString() })
        .eq("id", ticket.id);

      if (error) {
        if (error.message?.includes("column") || error.code === "42703") {
          alert("Notice: Database migration for 'is_active' column needs to be applied first.");
          return;
        }
        throw error;
      }

      setTicketTypes((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, is_active: newActiveState } : t))
      );
    } catch (err: any) {
      alert(err.message || "Failed to update ticket status");
    }
  };

  const deleteTicketType = async (ticketId: string) => {
    const ticket = ticketTypes.find((t) => t.id === ticketId);
    if (!ticket) return;

    if ((ticket.quantity_sold || 0) > 0) {
      alert(
        `⚠️ Cannot Delete: This ticket type already has sales (${ticket.quantity_sold} ticket(s) sold).\n\nDeleting this would corrupt order receipts and invalidate purchased tickets. Instead, click "Pause Sales" or edit it to mark it Inactive so customers can no longer buy it.`
      );
      return;
    }

    if (!confirm(`Are you sure you want to delete "${ticket.name}"? (No tickets have been sold yet)`)) return;

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

  // ==========================================
  // PROMOTIONS & BOGO HANDLERS
  // ==========================================

  const openAddPromo = () => {
    setEditingPromo(null);
    setPromoForm({
      name: "",
      promo_code: "",
      discount_type: "bogo",
      discount_value: "0",
      buy_quantity: "1",
      get_quantity: "1",
      get_discount_percent: "100",
      ticket_type_id: "",
      min_tickets_required: "2",
      max_uses_total: "",
      is_active: true,
    });
    setIsPromoModalOpen(true);
  };

  const openEditPromo = (promo: any) => {
    setEditingPromo(promo);
    setPromoForm({
      name: promo.name || "",
      promo_code: promo.promo_code || "",
      discount_type: promo.discount_type || "bogo",
      discount_value: promo.discount_value !== null && promo.discount_value !== undefined ? String(promo.discount_value) : "0",
      buy_quantity: promo.buy_quantity ? String(promo.buy_quantity) : "1",
      get_quantity: promo.get_quantity ? String(promo.get_quantity) : "1",
      get_discount_percent: promo.get_discount_percent ? String(promo.get_discount_percent) : "100",
      ticket_type_id: promo.ticket_type_id || "",
      min_tickets_required: promo.min_tickets_required ? String(promo.min_tickets_required) : "1",
      max_uses_total: promo.max_uses_total ? String(promo.max_uses_total) : "",
      is_active: promo.is_active !== false,
    });
    setIsPromoModalOpen(true);
  };

  const savePromo = async () => {
    if (!promoForm.name.trim()) {
      alert("Please provide a name for the promotion (e.g. 'Buy 1 Get 1 Free')");
      return;
    }

    setSavingPromo(true);
    try {
      const payload: any = {
        event_id: params.id,
        name: promoForm.name.trim(),
        promo_code: promoForm.promo_code.trim() ? promoForm.promo_code.trim().toUpperCase() : null,
        discount_type: promoForm.discount_type,
        discount_value: parseFloat(promoForm.discount_value) || 0,
        buy_quantity: parseInt(promoForm.buy_quantity) || 1,
        get_quantity: parseInt(promoForm.get_quantity) || 1,
        get_discount_percent: parseFloat(promoForm.get_discount_percent) || 100,
        ticket_type_id: promoForm.ticket_type_id || null,
        min_tickets_required: parseInt(promoForm.min_tickets_required) || 1,
        max_uses_total: promoForm.max_uses_total ? parseInt(promoForm.max_uses_total) : null,
        is_active: promoForm.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingPromo) {
        const { error } = await supabase
          .from("event_promotions")
          .update(payload)
          .eq("id", editingPromo.id);
        if (error) throw error;

        setPromotions((prev) =>
          prev.map((p) => (p.id === editingPromo.id ? { ...p, ...payload } : p))
        );
      } else {
        const { data, error } = await supabase
          .from("event_promotions")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;

        if (data) {
          setPromotions([...promotions, data]);
        }
      }

      setIsPromoModalOpen(false);
      setEditingPromo(null);
      alert(editingPromo ? "Promotion updated!" : "Promotion created successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to save promotion. Please ensure the migration SQL has been executed.");
    } finally {
      setSavingPromo(false);
    }
  };

  const togglePromoActive = async (promo: any) => {
    const newState = promo.is_active === false;
    try {
      const { error } = await supabase
        .from("event_promotions")
        .update({ is_active: newState, updated_at: new Date().toISOString() })
        .eq("id", promo.id);
      if (error) throw error;

      setPromotions((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, is_active: newState } : p))
      );
    } catch (err: any) {
      alert(err.message || "Failed to update promotion status");
    }
  };

  const deletePromo = async (promoId: string) => {
    if (!confirm("Are you sure you want to delete this promotion?")) return;

    try {
      const { error } = await supabase
        .from("event_promotions")
        .delete()
        .eq("id", promoId);
      if (error) throw error;

      setPromotions(promotions.filter((p) => p.id !== promoId));
    } catch (err: any) {
      alert(err.message || "Failed to delete promotion");
    }
  };

  if (fetching) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <BackButton href="/manager/events" />

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
              {currentImage && (
                <img
                  src={currentImage.split('?')[0]}
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
              className={`p-4 rounded-lg border-2 transition-all ${formData.action_button_type === 'reservation'
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
              className={`p-4 rounded-lg border-2 transition-all ${formData.action_button_type === 'external_tickets'
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
              className={`p-4 rounded-lg border-2 transition-all ${formData.action_button_type === 'custom_tickets'
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
                {/* Reservation Seat Limits */}
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold mb-3">
                    Reservation Seat Limits (Per Area)
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                    Set maximum seats per area for this reservation-based event.
                    Leave empty for unlimited.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(areaLimits).map(([area, value]) => (
                      <div key={area}>
                        <Label>{area}</Label>
                        <Input
                          type="number"
                          min="1"
                          value={value}
                          onChange={(e) =>
                            setAreaLimits({
                              ...areaLimits,
                              [area]: e.target.value,
                            })
                          }
                          placeholder="Unlimited"
                        />
                      </div>
                    ))}
                  </div>
                </div>

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
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ticket Types</h3>
                  <p className="text-xs text-gray-500">
                    Add and manage ticket tiers. You can edit prices and capacity anytime; existing purchases remain locked to their historical price.
                  </p>
                </div>
              </div>

              {/* Existing Ticket Types */}
              {ticketTypes.length > 0 && (
                <div className="mb-6 space-y-3">
                  {ticketTypes.map((ticket) => {
                    const isSold = (ticket.quantity_sold || 0) > 0;
                    const isActive = ticket.is_active !== false;
                    const remaining = ticket.quantity_total !== null && ticket.quantity_total !== undefined
                      ? Math.max(0, ticket.quantity_total - (ticket.quantity_sold || 0))
                      : null;

                    return (
                      <div
                        key={ticket.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isActive
                            ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm"
                            : "bg-gray-50 dark:bg-gray-900/60 border-gray-300 dark:border-gray-800 opacity-80"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-semibold text-base text-gray-900 dark:text-white">
                                {ticket.name}
                              </span>
                              <Badge
                                variant="light"
                                color={isActive ? "success" : "warning"}
                                size="sm"
                              >
                                {isActive ? "Active (On Sale)" : "Paused / Inactive"}
                              </Badge>
                              {isSold && (
                                <Badge variant="light" color="info" size="sm">
                                  {ticket.quantity_sold} Sold
                                </Badge>
                              )}
                              {remaining === 0 && (
                                <Badge variant="light" color="error" size="sm">
                                  Sold Out
                                </Badge>
                              )}
                            </div>

                            <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-3 flex-wrap">
                              <span className="font-bold text-gray-900 dark:text-white text-base">
                                {ticket.currency || formData.ticket_currency || "USD"} ${parseFloat(ticket.price.toString()).toFixed(2)}
                              </span>
                              <span>•</span>
                              <span>
                                {remaining !== null
                                  ? `${remaining} available (${ticket.quantity_sold || 0}/${ticket.quantity_total} sold)`
                                  : `${ticket.quantity_sold || 0} sold (Unlimited capacity)`}
                              </span>
                            </div>

                            {ticket.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {ticket.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openEditTicket(ticket)}
                              className="text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                            >
                              Edit Price & Qty
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => toggleTicketActive(ticket)}
                              className={
                                isActive
                                  ? "text-amber-600 hover:text-amber-700"
                                  : "text-green-600 hover:text-green-700"
                              }
                            >
                              {isActive ? "Pause Sales" : "Resume Sales"}
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => deleteTicketType(ticket.id)}
                              className={
                                isSold
                                  ? "text-gray-400 cursor-not-allowed opacity-50"
                                  : "text-red-600 hover:text-red-700"
                              }
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add New Ticket Type */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">Add New Ticket Tier</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="ticket_name">
                      Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="ticket_name"
                      value={newTicketType.name}
                      onChange={(e) => setNewTicketType({ ...newTicketType, name: e.target.value })}
                      placeholder="e.g., General Admission, VIP"
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
                    <Label htmlFor="ticket_quantity">Total Capacity (Optional)</Label>
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

            {/* ========================================================================= */}
            {/* PROMOTIONS & BOGO DISCOUNTS SECTION */}
            {/* ========================================================================= */}
            <div className="pt-6 border-t border-purple-200 dark:border-purple-900/50">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    🎟️ Ticket Discounts & BOGO Promotions
                  </h3>
                  <p className="text-xs text-gray-500">
                    Configure Buy 1 Get 1 Free, Buy 2 Get 2, percentage discounts, or coupon promo codes.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={openAddPromo}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  + Add Promotion / BOGO
                </Button>
              </div>

              {/* Promotions List */}
              {promotions.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {promotions.map((promo) => {
                    const isActive = promo.is_active !== false;
                    const targetTicket = ticketTypes.find((t) => t.id === promo.ticket_type_id);

                    return (
                      <div
                        key={promo.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isActive
                            ? "bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-900/60 shadow-sm"
                            : "bg-gray-50 dark:bg-gray-900/60 border-gray-200 dark:border-gray-800 opacity-75"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {promo.name}
                              </span>
                              <Badge
                                variant="light"
                                color={
                                  promo.discount_type === "bogo"
                                    ? "primary"
                                    : promo.discount_type === "percentage"
                                    ? "success"
                                    : "info"
                                }
                                size="sm"
                              >
                                {promo.discount_type === "bogo"
                                  ? `BOGO (Buy ${promo.buy_quantity} Get ${promo.get_quantity} Free)`
                                  : promo.discount_type === "percentage"
                                  ? `${promo.discount_value}% OFF`
                                  : `$${promo.discount_value} OFF`}
                              </Badge>
                              {promo.promo_code ? (
                                <Badge variant="light" color="warning" size="sm">
                                  Code: {promo.promo_code}
                                </Badge>
                              ) : (
                                <Badge variant="light" color="light" size="sm">
                                  Automatic in Cart
                                </Badge>
                              )}
                              <Badge
                                variant="light"
                                color={isActive ? "success" : "dark"}
                                size="sm"
                              >
                                {isActive ? "Active" : "Paused"}
                              </Badge>
                            </div>

                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-3 flex-wrap">
                              <span>
                                Applies to:{" "}
                                <strong className="text-gray-700 dark:text-gray-300">
                                  {targetTicket ? targetTicket.name : "All Ticket Tiers"}
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                Min required: {promo.min_tickets_required || 1} ticket(s)
                              </span>
                              {promo.max_uses_total && (
                                <>
                                  <span>•</span>
                                  <span>
                                    Uses: {promo.uses_count || 0} / {promo.max_uses_total}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openEditPromo(promo)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => togglePromoActive(promo)}
                              className={isActive ? "text-amber-600" : "text-green-600"}
                            >
                              {isActive ? "Pause" : "Activate"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => deletePromo(promo.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-purple-50/50 dark:bg-purple-900/10 rounded-xl border border-dashed border-purple-200 dark:border-purple-800 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    No promotions configured for this event. Click <strong>"+ Add Promotion / BOGO"</strong> to create Buy 1 Get 1, Buy 2 Get 2, or discount coupon deals!
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
            {loading ? "Updating..." : "Update Event"}
          </Button>
        </div>
      </form>

      {/* ========================================================================= */}
      {/* EDIT TICKET TYPE MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditTicketModalOpen}
        onClose={() => {
          setIsEditTicketModalOpen(false);
          setEditingTicket(null);
        }}
        className="max-w-xl p-5 sm:p-6"
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800 pr-8">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-inner">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                Edit Ticket Tier
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Updates future purchases. Previously sold tickets retain their historical price.
              </p>
            </div>
          </div>

          {editingTicket && (
            <div className="space-y-3">
              {/* Sold notice banner */}
              {editingTicket.quantity_sold > 0 && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
                  <div className="flex items-center gap-2 text-blue-400 font-semibold">
                    <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
                    <span>{editingTicket.quantity_sold} ticket{editingTicket.quantity_sold !== 1 ? 's' : ''} sold</span>
                  </div>
                  <span className="text-gray-400 text-[11px]">Past orders protected</span>
                </div>
              )}

              {/* Ticket Name */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                  Ticket Tier Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editingTicket.name}
                  onChange={(e) =>
                    setEditingTicket({ ...editingTicket, name: e.target.value })
                  }
                  placeholder="e.g. General Table Seating, VIP Booth"
                  className="w-full h-9.5 px-3 rounded-lg border border-gray-300 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-gray-500"
                  required
                />
              </div>

              {/* Price, Currency & Capacity in a 3-column row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Price <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-xs">
                      {editingTicket.currency === 'EUR' ? '€' : editingTicket.currency === 'GBP' ? '£' : '$'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingTicket.price}
                      onChange={(e) =>
                        setEditingTicket({ ...editingTicket, price: e.target.value })
                      }
                      className="w-full h-9.5 pl-6 pr-2.5 rounded-lg border border-gray-300 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={editingTicket.currency || "USD"}
                    onChange={(e) =>
                      setEditingTicket({ ...editingTicket, currency: e.target.value })
                    }
                    className="w-full h-9.5 px-2.5 rounded-lg border border-gray-300 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD (C$)</option>
                    <option value="AUD">AUD (A$)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Total Capacity
                  </label>
                  <input
                    type="number"
                    min={editingTicket.quantity_sold || 0}
                    value={editingTicket.quantity_total || ""}
                    onChange={(e) =>
                      setEditingTicket({ ...editingTicket, quantity_total: e.target.value })
                    }
                    className="w-full h-9.5 px-2.5 rounded-lg border border-gray-300 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              {/* Description / Perks */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                  Perks / Description (Optional)
                </label>
                <input
                  type="text"
                  value={editingTicket.description || ""}
                  onChange={(e) =>
                    setEditingTicket({ ...editingTicket, description: e.target.value })
                  }
                  placeholder="e.g. Includes complimentary champagne & front-row seating"
                  className="w-full h-9.5 px-3 rounded-lg border border-gray-300 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-gray-500"
                />
              </div>

              {/* Active Toggle Switch Card */}
              <div
                onClick={() =>
                  setEditingTicket({
                    ...editingTicket,
                    is_active: editingTicket.is_active === false ? true : false,
                  })
                }
                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                  editingTicket.is_active !== false
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-gray-800/40 border-gray-700/60"
                }`}
              >
                <div>
                  <span className="font-semibold text-xs block text-gray-900 dark:text-white">
                    {editingTicket.is_active !== false ? "Active (On Sale)" : "Sales Paused"}
                  </span>
                  <p className="text-[10px] text-gray-400">
                    {editingTicket.is_active !== false
                      ? "Available for purchase on website"
                      : "Hidden from customers. Existing tickets remain valid."}
                  </p>
                </div>
                <div
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    editingTicket.is_active !== false ? "bg-green-500" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      editingTicket.is_active !== false ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsEditTicketModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-xs sm:text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTicketEdit}
                  disabled={updatingTicket}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-md shadow-purple-600/30 transition-all flex items-center gap-2"
                >
                  {updatingTicket ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* ADD / EDIT PROMOTION MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isPromoModalOpen}
        onClose={() => {
          setIsPromoModalOpen(false);
          setEditingPromo(null);
        }}
        className="max-w-3xl p-5 sm:p-6"
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800 pr-8">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                {editingPromo ? "Edit Promotion" : "Create New Promotion / BOGO"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Configure Buy 1 Get 1 (BOGO), percentage discounts, or coupon codes.
              </p>
            </div>
          </div>

          {/* 2-Column Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LEFT COLUMN: Deal Details & BOGO config */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                  Promotion Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={promoForm.name}
                  onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })}
                  placeholder="e.g. Buy 1 Get 1 Free, Summer 20% Off"
                  className="w-full h-9.5 px-3 rounded-lg border border-gray-300 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all placeholder:text-gray-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                  Deal Type
                </label>
                <select
                  value={promoForm.discount_type}
                  onChange={(e) => {
                    const type = e.target.value;
                    setPromoForm({
                      ...promoForm,
                      discount_type: type,
                      min_tickets_required: type === "bogo" ? "2" : "1",
                    });
                  }}
                  className="w-full h-9.5 px-3 rounded-lg border border-gray-300 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                >
                  <option value="bogo">Buy X Get Y (BOGO / Bundle)</option>
                  <option value="percentage">Percentage Discount (% Off)</option>
                  <option value="fixed_amount">Fixed Amount ($ Off)</option>
                </select>
              </div>

              {promoForm.discount_type === "bogo" && (
                <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/30 space-y-2.5">
                  <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">
                    BOGO Configuration
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-300 mb-0.5">Buy Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={promoForm.buy_quantity}
                        onChange={(e) => setPromoForm({ ...promoForm, buy_quantity: e.target.value })}
                        className="w-full h-8.5 px-2.5 rounded-md border border-purple-500/30 bg-purple-950/40 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-400"
                      />
                      <span className="text-[10px] text-gray-400 block mt-0.5">e.g. 1 for Buy 1</span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-300 mb-0.5">Get Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={promoForm.get_quantity}
                        onChange={(e) => setPromoForm({ ...promoForm, get_quantity: e.target.value })}
                        className="w-full h-8.5 px-2.5 rounded-md border border-purple-500/30 bg-purple-950/40 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-400"
                      />
                      <span className="text-[10px] text-gray-400 block mt-0.5">e.g. 1 for Get 1</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-300 mb-0.5">Discount on "Get" Ticket (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={promoForm.get_discount_percent}
                      onChange={(e) => setPromoForm({ ...promoForm, get_discount_percent: e.target.value })}
                      className="w-full h-8.5 px-2.5 rounded-md border border-purple-500/30 bg-purple-950/40 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-400"
                    />
                    <span className="text-[10px] text-gray-400 block mt-0.5">100% = Free ticket; 50% = half price</span>
                  </div>
                </div>
              )}

              {promoForm.discount_type === "percentage" && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Discount Percentage (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={promoForm.discount_value}
                      onChange={(e) => setPromoForm({ ...promoForm, discount_value: e.target.value })}
                      placeholder="20"
                      className="w-full h-9.5 px-3 pr-8 rounded-lg border border-gray-300 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">%</span>
                  </div>
                </div>
              )}

              {promoForm.discount_type === "fixed_amount" && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Discount Amount ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={promoForm.discount_value}
                      onChange={(e) => setPromoForm({ ...promoForm, discount_value: e.target.value })}
                      placeholder="5.00"
                      className="w-full h-9.5 pl-7 pr-3 rounded-lg border border-gray-300 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Code, Scope, Limits, Toggle */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                  Coupon Promo Code
                </label>
                <input
                  type="text"
                  value={promoForm.promo_code}
                  onChange={(e) => setPromoForm({ ...promoForm, promo_code: e.target.value.toUpperCase() })}
                  placeholder="Optional coupon (e.g. VIP2026)"
                  className="w-full h-9.5 px-3 rounded-lg border border-gray-300 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-white text-xs sm:text-sm uppercase tracking-wider font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all placeholder:text-gray-500"
                />
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  Leave empty for automatic discount deal
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                  Target Ticket Tier
                </label>
                <select
                  value={promoForm.ticket_type_id}
                  onChange={(e) => setPromoForm({ ...promoForm, ticket_type_id: e.target.value })}
                  className="w-full h-9.5 px-3 rounded-lg border border-gray-300 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                >
                  <option value="">All Ticket Types</option>
                  {ticketTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (${parseFloat(t.price).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Min Tickets
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={promoForm.min_tickets_required}
                    onChange={(e) => setPromoForm({ ...promoForm, min_tickets_required: e.target.value })}
                    className="w-full h-9.5 px-3 rounded-lg border border-gray-300 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Redemption Cap
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={promoForm.max_uses_total}
                    onChange={(e) => setPromoForm({ ...promoForm, max_uses_total: e.target.value })}
                    placeholder="Unlimited"
                    className="w-full h-9.5 px-3 rounded-lg border border-gray-300 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all placeholder:text-gray-500"
                  />
                </div>
              </div>

              {/* Active Toggle Card */}
              <div
                onClick={() => setPromoForm({ ...promoForm, is_active: !promoForm.is_active })}
                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                  promoForm.is_active
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-gray-800/40 border-gray-700/60"
                }`}
              >
                <div>
                  <span className="font-semibold text-xs block text-gray-900 dark:text-white">
                    {promoForm.is_active ? "Promotion Active" : "Promotion Paused"}
                  </span>
                  <p className="text-[10px] text-gray-400">
                    {promoForm.is_active ? "Active at customer checkout" : "Temporarily paused"}
                  </p>
                </div>
                <div
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    promoForm.is_active ? "bg-green-500" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      promoForm.is_active ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setIsPromoModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-xs sm:text-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={savePromo}
              disabled={savingPromo}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-md shadow-amber-600/30 transition-all flex items-center gap-2"
            >
              {savingPromo ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Saving...</span>
                </>
              ) : editingPromo ? (
                "Update Promotion"
              ) : (
                "Create Promotion"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
