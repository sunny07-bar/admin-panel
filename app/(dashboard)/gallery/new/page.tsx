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
import Select from "@/components/form/Select";

export default function NewGalleryImagePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    caption: "",
    category: "other" as "food" | "ambience" | "events" | "other",
    display_order: 100,
    is_active: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!imageFile) {
        alert("Please select an image");
        setLoading(false);
        return;
      }

      console.log("Starting image upload process...");
      console.log("Original file:", imageFile.name, imageFile.size, "bytes");

      // Compress and convert to WebP (under 100KB, maintains quality)
      console.log("Compressing image...");
      const compressedFile = await compressImageToWebP(imageFile);
      console.log("Compressed file:", compressedFile.name, compressedFile.size, "bytes");

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
      const filePath = `${formData.category}/${fileName}`;
      console.log("Uploading to path:", filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      console.log("Upload successful:", uploadData);

      const { error } = await supabase.from("gallery_images").insert({
        ...formData,
        image_path: filePath,
      });

      if (error) {
        console.error("Database error:", error);
        // Try to delete the uploaded file if database insert fails
        if (uploadData?.path) {
          await supabase.storage.from("gallery").remove([uploadData.path]);
        }
        throw new Error(`Failed to save image record: ${error.message}`);
      }

      console.log("Gallery image saved successfully");
      router.push("/gallery");
    } catch (error: any) {
      console.error("Error details:", error);
      alert(error.message || "An error occurred while uploading the image. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={[{ label: "Gallery", href: "/gallery" }, { label: "New" }]} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-dark">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="image">Image *</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                required
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                  if (file) {
                    // Preview image
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      setImagePreview(e.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  } else {
                    setImagePreview(null);
                  }
                }}
              />
              {imagePreview && (
                <div className="mt-4">
                  <Label>Preview</Label>
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="mt-2 h-48 w-48 rounded object-cover border border-gray-300 dark:border-gray-700" 
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                id="category"
                options={[
                  { value: "food", label: "Food" },
                  { value: "ambience", label: "Ambience" },
                  { value: "events", label: "Events" },
                  { value: "other", label: "Other" },
                ]}
                value={formData.category}
                onChange={(value) => setFormData({ ...formData, category: value as any })}
              />
            </div>

            <div>
              <Label htmlFor="caption">Caption</Label>
              <TextArea
                id="caption"
                value={formData.caption}
                onChange={(value) => setFormData({ ...formData, caption: value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({ ...formData, display_order: parseInt(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="mt-6">
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

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Uploading..." : "Upload Image"}
          </Button>
        </div>
      </form>
    </div>
  );
}

