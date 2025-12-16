"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";

type TabType = "general" | "seatings" | "limits" | "payment" | "fields";

export default function EditSpecialHoursPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // General Tab
  const [general, setGeneral] = useState({
    title: "",
    date: "",
    is_open: true,
    time_from: "",
    time_to: "",
    note: "",
    waitlist_enabled: false,
    status: "draft" as "draft" | "active" | "cancelled",
  });

  // Seatings Tab
  const [seatings, setSeatings] = useState({
    interval_minutes: 30,
    default_duration_minutes: 90,
    duration_rule_type: "fixed" as "fixed" | "per_guest" | "custom",
    duration_rules: {} as Record<string, number>,
  });

  // Limits Tab
  const [limits, setLimits] = useState({
    max_bookings_total: null as number | null,
    max_guests_per_booking: null as number | null,
    max_guests_total: null as number | null,
    per_interval_limit: null as number | null,
    online_only: false,
  });

  // Payment Tab
  const [payment, setPayment] = useState({
    prepayment_required: false,
    prepayment_rule_type: "per_guest" as "per_guest" | "per_booking" | "percentage" | null,
    prepayment_amount: null as number | null,
    prepayment_percentage: null as number | null,
    no_show_fee: null as number | null,
    cancellation_policy: "moderate" as "flexible" | "moderate" | "strict" | "custom",
    cancellation_policy_custom: "",
    cancellation_hours_before: null as number | null,
  });

  // Fields Tab
  const [fields, setFields] = useState<
    Array<{
      id?: string;
      field_key: string;
      field_label: string;
      field_type: string;
      field_options: string[];
      is_required: boolean;
      display_order: number;
    }>
  >([]);

  useEffect(() => {
    if (params.id) {
      loadSpecialHours(params.id as string);
    }
  }, [params.id]);

  const loadSpecialHours = async (id: string) => {
    setLoading(true);
    try {
      // Load general
      const { data: sh, error: shError } = await supabase
        .from("special_hours")
        .select("*")
        .eq("id", id)
        .single();

      if (shError) throw shError;

      setGeneral({
        title: sh.title,
        date: sh.date,
        is_open: sh.is_open,
        time_from: sh.time_from || "",
        time_to: sh.time_to || "",
        note: sh.note || "",
        waitlist_enabled: sh.waitlist_enabled,
        status: sh.status,
      });

      // Load seatings
      const { data: seatingsData } = await supabase
        .from("special_hours_seatings")
        .select("*")
        .eq("special_hours_id", id)
        .single();

      if (seatingsData) {
        setSeatings({
          interval_minutes: seatingsData.interval_minutes,
          default_duration_minutes: seatingsData.default_duration_minutes,
          duration_rule_type: seatingsData.duration_rule_type,
          duration_rules: seatingsData.duration_rules || {},
        });
      }

      // Load limits
      const { data: limitsData } = await supabase
        .from("special_hours_limits")
        .select("*")
        .eq("special_hours_id", id)
        .single();

      if (limitsData) {
        setLimits({
          max_bookings_total: limitsData.max_bookings_total,
          max_guests_per_booking: limitsData.max_guests_per_booking,
          max_guests_total: limitsData.max_guests_total,
          per_interval_limit: limitsData.per_interval_limit,
          online_only: limitsData.online_only,
        });
      }

      // Load payment
      const { data: paymentData } = await supabase
        .from("special_hours_payment")
        .select("*")
        .eq("special_hours_id", id)
        .single();

      if (paymentData) {
        setPayment({
          prepayment_required: paymentData.prepayment_required,
          prepayment_rule_type: paymentData.prepayment_rule_type,
          prepayment_amount: paymentData.prepayment_amount,
          prepayment_percentage: paymentData.prepayment_percentage,
          no_show_fee: paymentData.no_show_fee,
          cancellation_policy: paymentData.cancellation_policy,
          cancellation_policy_custom: paymentData.cancellation_policy_custom || "",
          cancellation_hours_before: paymentData.cancellation_hours_before,
        });
      }

      // Load fields
      const { data: fieldsData } = await supabase
        .from("special_hours_fields")
        .select("*")
        .eq("special_hours_id", id)
        .order("display_order", { ascending: true });

      if (fieldsData) {
        setFields(
          fieldsData.map((f) => ({
            id: f.id,
            field_key: f.field_key,
            field_label: f.field_label,
            field_type: f.field_type,
            field_options: f.field_options || [],
            is_required: f.is_required,
            display_order: f.display_order,
          }))
        );
      }

      setLoading(false);
    } catch (error: any) {
      alert(error.message);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!general.title || !general.date) {
      alert("Please fill in title and date");
      return;
    }

    setSaving(true);
    try {
      const id = params.id as string;

      // Update special hours
      const { error: shError } = await supabase
        .from("special_hours")
        .update({
          title: general.title,
          date: general.date,
          is_open: general.is_open,
          time_from: general.time_from || null,
          time_to: general.time_to || null,
          note: general.note || null,
          waitlist_enabled: general.waitlist_enabled,
          status: general.status,
        })
        .eq("id", id);

      if (shError) throw shError;

      // Update or create seatings
      const { data: existingSeatings } = await supabase
        .from("special_hours_seatings")
        .select("id")
        .eq("special_hours_id", id)
        .single();

      if (existingSeatings) {
        await supabase
          .from("special_hours_seatings")
          .update({
            interval_minutes: seatings.interval_minutes,
            default_duration_minutes: seatings.default_duration_minutes,
            duration_rule_type: seatings.duration_rule_type,
            duration_rules: Object.keys(seatings.duration_rules).length > 0 ? seatings.duration_rules : null,
          })
          .eq("id", existingSeatings.id);
      } else {
        await supabase.from("special_hours_seatings").insert({
          special_hours_id: id,
          interval_minutes: seatings.interval_minutes,
          default_duration_minutes: seatings.default_duration_minutes,
          duration_rule_type: seatings.duration_rule_type,
          duration_rules: Object.keys(seatings.duration_rules).length > 0 ? seatings.duration_rules : null,
        });
      }

      // Update or create limits
      const { data: existingLimits } = await supabase
        .from("special_hours_limits")
        .select("id")
        .eq("special_hours_id", id)
        .single();

      if (existingLimits) {
        await supabase
          .from("special_hours_limits")
          .update({
            max_bookings_total: limits.max_bookings_total,
            max_guests_per_booking: limits.max_guests_per_booking,
            max_guests_total: limits.max_guests_total,
            per_interval_limit: limits.per_interval_limit,
            online_only: limits.online_only,
          })
          .eq("id", existingLimits.id);
      } else {
        await supabase.from("special_hours_limits").insert({
          special_hours_id: id,
          max_bookings_total: limits.max_bookings_total,
          max_guests_per_booking: limits.max_guests_per_booking,
          max_guests_total: limits.max_guests_total,
          per_interval_limit: limits.per_interval_limit,
          online_only: limits.online_only,
        });
      }

      // Update or create payment
      const { data: existingPayment } = await supabase
        .from("special_hours_payment")
        .select("id")
        .eq("special_hours_id", id)
        .single();

      if (existingPayment) {
        await supabase
          .from("special_hours_payment")
          .update({
            prepayment_required: payment.prepayment_required,
            prepayment_rule_type: payment.prepayment_rule_type,
            prepayment_amount: payment.prepayment_amount,
            prepayment_percentage: payment.prepayment_percentage,
            no_show_fee: payment.no_show_fee,
            cancellation_policy: payment.cancellation_policy,
            cancellation_policy_custom: payment.cancellation_policy_custom || null,
            cancellation_hours_before: payment.cancellation_hours_before,
          })
          .eq("id", existingPayment.id);
      } else {
        await supabase.from("special_hours_payment").insert({
          special_hours_id: id,
          prepayment_required: payment.prepayment_required,
          prepayment_rule_type: payment.prepayment_rule_type,
          prepayment_amount: payment.prepayment_amount,
          prepayment_percentage: payment.prepayment_percentage,
          no_show_fee: payment.no_show_fee,
          cancellation_policy: payment.cancellation_policy,
          cancellation_policy_custom: payment.cancellation_policy_custom || null,
          cancellation_hours_before: payment.cancellation_hours_before,
        });
      }

      // Delete existing fields and recreate
      await supabase.from("special_hours_fields").delete().eq("special_hours_id", id);

      if (fields.length > 0) {
        await supabase.from("special_hours_fields").insert(
          fields.map((field, index) => ({
            special_hours_id: id,
            field_key: field.field_key,
            field_label: field.field_label,
            field_type: field.field_type,
            field_options: field.field_options.length > 0 ? field.field_options : null,
            is_required: field.is_required,
            display_order: field.display_order || (index + 1) * 100,
          }))
        );
      }

      router.push("/reservations/special-hours");
    } catch (error: any) {
      alert(error.message);
      setSaving(false);
    }
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: "general", label: "General" },
    { id: "seatings", label: "Seatings" },
    { id: "limits", label: "Limits" },
    { id: "payment", label: "Payment" },
    { id: "fields", label: "Fields" },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb
          items={[
            { label: "Reservations" },
            { label: "Special Hours", href: "/reservations/special-hours" },
            { label: "Edit" },
          ]}
        />
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  // Reuse the same form structure as new page - just copy the JSX from new/page.tsx
  // For brevity, I'll create a simplified version that uses the same structure
  return (
    <div className="space-y-6">
      <PageBreadcrumb
        items={[
          { label: "Reservations" },
          { label: "Special Hours", href: "/reservations/special-hours" },
          { label: "Edit" },
        ]}
      />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-800">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-theme-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-brand-500 text-brand-500"
                    : "border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content - Same as new page, just with loaded data */}
        <div className="p-6">
          {/* General Tab */}
          {activeTab === "general" && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="title">Title *</Label>
                <InputField
                  id="title"
                  value={general.title}
                  onChange={(e) => setGeneral({ ...general, title: e.target.value })}
                  placeholder="e.g., New Year's Eve, VIP Brunch"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <InputField
                    id="date"
                    type="date"
                    value={general.date}
                    onChange={(e) => setGeneral({ ...general, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={general.status}
                    onChange={(value) => setGeneral({ ...general, status: value as any })}
                    options={[
                      { value: "draft", label: "Draft" },
                      { value: "active", label: "Active" },
                      { value: "cancelled", label: "Cancelled" },
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={general.is_open}
                    onChange={(e) => setGeneral({ ...general, is_open: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-theme-sm">Restaurant is open on this date</span>
                </label>
              </div>

              {general.is_open && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="time_from">From Time</Label>
                    <InputField
                      id="time_from"
                      type="time"
                      value={general.time_from}
                      onChange={(e) => setGeneral({ ...general, time_from: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="time_to">To Time</Label>
                    <InputField
                      id="time_to"
                      type="time"
                      value={general.time_to}
                      onChange={(e) => setGeneral({ ...general, time_to: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="note">Note</Label>
                <TextArea
                  id="note"
                  value={general.note}
                  onChange={(value) => setGeneral({ ...general, note: value })}
                  rows={3}
                  placeholder="Additional information about this special hour"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={general.waitlist_enabled}
                    onChange={(e) => setGeneral({ ...general, waitlist_enabled: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-theme-sm">Enable waitlist when fully booked</span>
                </label>
              </div>
            </div>
          )}

          {/* Seatings Tab */}
          {activeTab === "seatings" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="interval_minutes">Interval (minutes) *</Label>
                  <InputField
                    id="interval_minutes"
                    type="number"
                    min="15"
                    step={15}
                    value={
                      // @ts-ignore
                      seatings.interval_minutes != null ? String(seatings.interval_minutes) : ""
                    }
                    onChange={(e) =>
                      setSeatings({ ...seatings, interval_minutes: parseInt(e.target.value) || 30 })
                    }
                  />
                  <p className="text-theme-xs text-gray-500 mt-1">Time slots available every X minutes</p>
                </div>
                <div>
                  <Label htmlFor="default_duration_minutes">Default Duration (minutes) *</Label>
                  <InputField
                    id="default_duration_minutes"
                    type="number"
                    min="30"
                    step={15}
                    value={
                      // @ts-ignore
                      seatings.default_duration_minutes != null ? String(seatings.default_duration_minutes) : ""
                    }
                    onChange={(e) =>
                      setSeatings({
                        ...seatings,
                        default_duration_minutes: parseInt(e.target.value) || 90,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="duration_rule_type">Duration Rule Type</Label>
                <Select
                  value={seatings.duration_rule_type}
                  onChange={(value) =>
                    setSeatings({ ...seatings, duration_rule_type: value as any })
                  }
                  options={[
                    { value: "fixed", label: "Fixed (all bookings same duration)" },
                    { value: "per_guest", label: "Per Guest (duration based on guest count)" },
                    { value: "custom", label: "Custom Rules" },
                  ]}
                />
              </div>

              {seatings.duration_rule_type !== "fixed" && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <Label>Duration Rules (e.g., "1-2": 60, "3-4": 90, "5+": 120)</Label>
                  <p className="text-theme-xs text-gray-500 mt-1 mb-2">
                    Format: Guest range = minutes. One per line.
                  </p>
                  <TextArea
                    rows={4}
                    value={Object.entries(seatings.duration_rules)
                      .map(([range, minutes]) => `${range}: ${minutes}`)
                      .join("\n")}
                    placeholder='1-2: 60\n3-4: 90\n5+: 120'
                    onChange={(value) => {
                      const rules: Record<string, number> = {};
                      value.split("\n").forEach((line: string) => {
                        const [range, minutes] = line.split(":").map((s: string) => s.trim());
                        if (range && minutes) {
                          rules[range] = parseInt(minutes);
                        }
                      });
                      setSeatings({ ...seatings, duration_rules: rules });
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Limits Tab */}
          {activeTab === "limits" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_bookings_total">Max Bookings Total</Label>
                  <InputField
                    id="max_bookings_total"
                    type="number"
                    min="1"
                    value={limits.max_bookings_total || ""}
                    onChange={(e) =>
                      setLimits({
                        ...limits,
                        max_bookings_total: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Leave empty for unlimited"
                  />
                </div>
                <div>
                  <Label htmlFor="max_guests_per_booking">Max Guests Per Booking</Label>
                  <InputField
                    id="max_guests_per_booking"
                    type="number"
                    min="1"
                    value={limits.max_guests_per_booking || ""}
                    onChange={(e) =>
                      setLimits({
                        ...limits,
                        max_guests_per_booking: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Leave empty for no limit"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_guests_total">Max Guests Total</Label>
                  <InputField
                    id="max_guests_total"
                    type="number"
                    min="1"
                    value={limits.max_guests_total || ""}
                    onChange={(e) =>
                      setLimits({
                        ...limits,
                        max_guests_total: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Leave empty for unlimited"
                  />
                </div>
                <div>
                  <Label htmlFor="per_interval_limit">Per Interval Limit</Label>
                  <InputField
                    id="per_interval_limit"
                    type="number"
                    min="1"
                    value={limits.per_interval_limit || ""}
                    onChange={(e) =>
                      setLimits({
                        ...limits,
                        per_interval_limit: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Max bookings per time slot"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={limits.online_only}
                    onChange={(e) => setLimits({ ...limits, online_only: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-theme-sm">Online bookings only (no phone reservations)</span>
                </label>
              </div>
            </div>
          )}

          {/* Payment Tab */}
          {activeTab === "payment" && (
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={payment.prepayment_required}
                    onChange={(e) => setPayment({ ...payment, prepayment_required: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-theme-sm">Require prepayment</span>
                </label>
              </div>

              {payment.prepayment_required && (
                <>
                  <div>
                    <Label htmlFor="prepayment_rule_type">Prepayment Rule Type</Label>
                    <Select
                      value={payment.prepayment_rule_type || ""}
                      onChange={(value) =>
                        setPayment({
                          ...payment,
                          prepayment_rule_type: value as any,
                        })
                      }
                      options={[
                        { value: "per_guest", label: "Per Guest" },
                        { value: "per_booking", label: "Per Booking" },
                        { value: "percentage", label: "Percentage of Total" },
                      ]}
                    />
                  </div>

                  {payment.prepayment_rule_type === "percentage" ? (
                    <div>
                      <Label htmlFor="prepayment_percentage">Prepayment Percentage</Label>
                      <InputField
                        id="prepayment_percentage"
                        type="number"
                        min="0"
                        max="100"
                        step={0.01}
                        value={
                          // @ts-ignore
                          payment.prepayment_percentage != null ? String(payment.prepayment_percentage) : ""
                        }
                        onChange={(e) =>
                          setPayment({
                            ...payment,
                            prepayment_percentage: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                      />
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="prepayment_amount">Prepayment Amount ($)</Label>
                      <InputField
                        id="prepayment_amount"
                        type="number"
                        min="0"
                        step={0.01}
                        value={
                          // @ts-ignore
                          payment.prepayment_amount != null ? String(payment.prepayment_amount) : ""
                        }
                        onChange={(e) =>
                          setPayment({
                            ...payment,
                            prepayment_amount: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                      />
                    </div>
                  )}
                </>
              )}

              <div>
                <Label htmlFor="no_show_fee">No-Show Fee ($)</Label>
                <InputField
                  id="no_show_fee"
                  type="number"
                  min="0"
                  step={0.01}
                  value={
                    // @ts-ignore
                    payment.no_show_fee != null ? String(payment.no_show_fee) : ""
                  }
                  onChange={(e) =>
                    setPayment({
                      ...payment,
                      no_show_fee: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="Leave empty for no fee"
                />
              </div>

              <div>
                <Label htmlFor="cancellation_policy">Cancellation Policy</Label>
                <Select
                  value={payment.cancellation_policy}
                  onChange={(value) =>
                    setPayment({
                      ...payment,
                      cancellation_policy: value as any,
                    })
                  }
                  options={[
                    { value: "flexible", label: "Flexible" },
                    { value: "moderate", label: "Moderate" },
                    { value: "strict", label: "Strict" },
                    { value: "custom", label: "Custom" },
                  ]}
                />
              </div>

              {payment.cancellation_policy === "custom" && (
                <div>
                  <Label htmlFor="cancellation_policy_custom">Custom Policy Text</Label>
                  <TextArea
                    id="cancellation_policy_custom"
                    value={payment.cancellation_policy_custom}
                    onChange={(value) =>
                      setPayment({ ...payment, cancellation_policy_custom: value })
                    }
                    rows={3}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="cancellation_hours_before">Cancellation Hours Before</Label>
                <InputField
                  id="cancellation_hours_before"
                  type="number"
                  min="0"
                  value={payment.cancellation_hours_before || ""}
                  onChange={(e) =>
                    setPayment({
                      ...payment,
                      cancellation_hours_before: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="Hours before reservation to cancel without penalty"
                />
              </div>
            </div>
          )}

          {/* Fields Tab */}
          {activeTab === "fields" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Custom Booking Form Fields</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFields([
                      ...fields,
                      {
                        id: undefined,
                        field_key: `field_${Date.now()}`,
                        field_label: "",
                        field_type: "text",
                        field_options: [],
                        is_required: false,
                        display_order: (fields.length + 1) * 100,
                      },
                    ]);
                  }}
                >
                  Add Field
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id || index} className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Field Key</Label>
                      <InputField
                        value={field.field_key}
                        onChange={(e) => {
                          const newFields = [...fields];
                          newFields[index].field_key = e.target.value;
                          setFields(newFields);
                        }}
                        placeholder="e.g., dietary_restrictions"
                      />
                    </div>
                    <div>
                      <Label>Field Label</Label>
                      <InputField
                        value={field.field_label}
                        onChange={(e) => {
                          const newFields = [...fields];
                          newFields[index].field_label = e.target.value;
                          setFields(newFields);
                        }}
                        placeholder="e.g., Dietary Restrictions"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Field Type</Label>
                      <Select
                        value={field.field_type}
                        onChange={(value) => {
                          const newFields = [...fields];
                          newFields[index].field_type = value;
                          setFields(newFields);
                        }}
                        options={[
                          { value: "text", label: "Text" },
                          { value: "textarea", label: "Textarea" },
                          { value: "select", label: "Select" },
                          { value: "checkbox", label: "Checkbox" },
                          { value: "number", label: "Number" },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 mt-6">
                        <input
                          type="checkbox"
                          checked={field.is_required}
                          onChange={(e) => {
                            const newFields = [...fields];
                            newFields[index].is_required = e.target.checked;
                            setFields(newFields);
                          }}
                          className="rounded"
                        />
                        <span className="text-theme-sm">Required</span>
                      </label>
                    </div>
                  </div>

                  {(field.field_type === "select" || field.field_type === "checkbox") && (
                    <div>
                      <Label>Options (comma-separated)</Label>
                      <InputField
                        value={field.field_options.join(", ")}
                        onChange={(e) => {
                          const newFields = [...fields];
                          newFields[index].field_options = e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          setFields(newFields);
                        }}
                        placeholder="Option 1, Option 2, Option 3"
                      />
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFields(fields.filter((_, i) => i !== index));
                    }}
                    className="text-error-500"
                  >
                    Remove Field
                  </Button>
                </div>
              ))}

              {fields.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No custom fields added. Click "Add Field" to create one.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-6 flex justify-end gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

