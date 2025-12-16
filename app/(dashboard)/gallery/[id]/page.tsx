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
import Select from "@/components/form/Select";

export default function EditGalleryImagePage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    caption: "",
    category: "other" as "food" | "ambience" | "events" | "other",
    display_order: 100,
    is_active: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [originalImagePath, setOriginalImagePath] = useState<string | null>(null);

  useEffect(() => {
    fetchImage();
  }, [params.id]);

  const fetchImage = async () => {
    const { data, error } = await supabase
      .from("gallery_images")
      .select("*")
      .eq("id", params.id)
      .single();

    if (data) {
      setFormData({
        caption: data.caption || "",
        category: data.category || "other",
        display_order: data.display_order || 100,
        is_active: data.is_active ?? true,
      });
      if (data.image_path) {
        setOriginalImagePath(data.image_path);
        setCurrentImage(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gallery/${data.image_path}?t=${Date.now()}`
        );
      }
    }
    setFetching(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imagePath = originalImagePath;

      if (imageFile) {
        // Delete old image if exists
        if (originalImagePath) {
          await supabase.storage.from("gallery").remove([originalImagePath]);
        }

        // Compress and convert to WebP
        const compressedFile = await compressImageToWebP(imageFile, 200);
        const fileName = `${Math.random()}.webp`;
        const filePath = `${formData.category}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("gallery")
          .upload(filePath, compressedFile);

        if (uploadError) throw uploadError;
        imagePath = filePath;
      }

      const { error } = await supabase
        .from("gallery_images")
        .update({
          ...formData,
          image_path: imagePath,
        })
        .eq("id", params.id);

      if (error) throw error;

      router.refresh();
      router.push("/gallery");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb items={[{ label: "Gallery", href: "/gallery" }, { label: "Edit" }]} />
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={[{ label: "Gallery", href: "/gallery" }, { label: "Edit" }]} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-dark">
          {currentImage && (
            <div className="mb-6">
              <Label>Current Image</Label>
              <img 
                src={`${currentImage.split('?')[0]}?t=${Date.now()}`} 
                alt="Current" 
                className="mt-2 h-48 w-48 rounded object-cover" 
                key={Date.now()}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="image">New Image (optional)</Label>
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
            {loading ? "Updating..." : "Update Image"}
          </Button>
        </div>
      </form>
    </div>
  );
}

