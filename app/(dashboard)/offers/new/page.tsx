"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImageToWebP } from "@/lib/utils/imageCompression";
import { floridaDateTimeLocalToUTC } from "@/lib/utils/timezone";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import TextArea from "@/components/form/input/TextArea";

export default function NewOfferPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    offer_type: "percentage_discount",
    discount_value: "",
    scope: "entire_order",
    start_date: "",
    end_date: "",
    min_order_amount: "",
    is_active: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imagePath = null;

      if (imageFile) {
        // Compress and convert to WebP
        // Compress and convert to WebP (under 100KB, maintains quality)
        const compressedFile = await compressImageToWebP(imageFile);
        const fileName = `${Math.random()}.webp`;
        const filePath = `offers/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("offers")
          .upload(filePath, compressedFile);

        if (uploadError) throw uploadError;
        imagePath = filePath;
      }

      const { error } = await supabase.from("offers").insert({
        ...formData,
        discount_value: parseFloat(formData.discount_value),
        start_date: formData.start_date ? floridaDateTimeLocalToUTC(formData.start_date) : null,
        end_date: formData.end_date ? floridaDateTimeLocalToUTC(formData.end_date) : null,
        min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : null,
        image_path: imagePath,
      });

      if (error) throw error;

      router.push("/offers");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={[{ label: "Offers", href: "/offers" }, { label: "New" }]} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-dark">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="offer_type">Offer Type</Label>
              <select
                id="offer_type"
                value={formData.offer_type}
                onChange={(e) => setFormData({ ...formData, offer_type: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-theme-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <option value="percentage_discount">Percentage Discount</option>
                <option value="flat_discount">Flat Discount</option>
                <option value="bogo">Buy One Get One</option>
                <option value="bundle">Bundle</option>
              </select>
            </div>

            <div>
              <Label htmlFor="discount_value">Discount Value</Label>
              <Input
                id="discount_value"
                type="number"
                step={0.01}
                value={formData.discount_value || ""}
                onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="scope">Scope</Label>
              <select
                id="scope"
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-theme-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <option value="entire_order">Entire Order</option>
                <option value="category">Category</option>
                <option value="item">Item</option>
              </select>
            </div>

            <div>
              <Label htmlFor="start_date">Start Date & Time (Florida Time)</Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter time in Florida timezone (EST/EDT, UTC-5)
              </p>
            </div>

            <div>
              <Label htmlFor="end_date">End Date & Time (Florida Time)</Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter time in Florida timezone (EST/EDT, UTC-5)
              </p>
            </div>

            <div>
              <Label htmlFor="min_order_amount">Min Order Amount</Label>
              <Input
                id="min_order_amount"
                type="number"
                step={0.01}
                value={formData.min_order_amount || ""}
                onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="image">Image (Optional)</Label>
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
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-theme-sm text-gray-700 dark:text-gray-300">Active</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Offer"}
          </Button>
        </div>
      </form>
    </div>
  );
}

