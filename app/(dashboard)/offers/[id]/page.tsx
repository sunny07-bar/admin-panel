"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImageToWebP } from "@/lib/utils/imageCompression";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import TextArea from "@/components/form/input/TextArea";

export default function EditOfferPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
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
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [originalImagePath, setOriginalImagePath] = useState<string | null>(null);

  useEffect(() => {
    const fetchOffer = async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) {
        alert(error.message);
        router.push("/offers");
        return;
      }

      if (data) {
        setFormData({
          title: data.title || "",
          description: data.description || "",
          offer_type: data.offer_type || "percentage_discount",
          discount_value: data.discount_value?.toString() || "",
          scope: data.scope || "entire_order",
          start_date: data.start_date ? new Date(data.start_date).toISOString().slice(0, 16) : "",
          end_date: data.end_date ? new Date(data.end_date).toISOString().slice(0, 16) : "",
          min_order_amount: data.min_order_amount?.toString() || "",
          is_active: data.is_active ?? true,
        });
        if (data.image_path) {
          setOriginalImagePath(data.image_path);
          setCurrentImage(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/offers/${data.image_path}?t=${Date.now()}`
          );
        }
      }
      setFetching(false);
    };

    fetchOffer();
  }, [params.id, supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imagePath = currentImage
        ? currentImage.split("/storage/v1/object/public/offers/")[1]
        : null;

      if (imageFile) {
        // Delete old image if exists
        if (originalImagePath) {
          await supabase.storage.from("offers").remove([originalImagePath]);
        }

        // Compress and convert to WebP
        const compressedFile = await compressImageToWebP(imageFile, 200);
        const fileName = `${Math.random()}.webp`;
        const filePath = `offers/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("offers")
          .upload(filePath, compressedFile);

        if (uploadError) throw uploadError;
        imagePath = filePath;
      }

      const { error } = await supabase
        .from("offers")
        .update({
          ...formData,
          discount_value: parseFloat(formData.discount_value),
          start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
          end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
          min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : null,
          image_path: imagePath,
        })
        .eq("id", params.id);

      if (error) throw error;

      router.refresh();
      router.push("/offers");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={[{ label: "Offers", href: "/offers" }, { label: "Edit" }]} />

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
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
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
            {loading ? "Updating..." : "Update Offer"}
          </Button>
        </div>
      </form>
    </div>
  );
}

