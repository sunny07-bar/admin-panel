"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImageToWebP } from "@/lib/utils/imageCompression";
import { generateUniqueImageFilename } from "@/lib/utils/imageFilename";
import { getImageUrl } from "@/lib/utils/image-utils";
import BackButton from "@/components/common/BackButton";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";

export default function EditHomeFeaturePage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    display_order: 100,
    is_active: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [originalImagePath, setOriginalImagePath] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeature = async () => {
      const { data, error } = await supabase
        .from("home_features")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) {
        alert(error.message);
        router.push("/home-features");
        return;
      }

      if (data) {
        setFormData({
          title: data.title || "",
          display_order: data.display_order || 100,
          is_active: data.is_active ?? true,
        });
        if (data.image_path) {
          setOriginalImagePath(data.image_path);
          setCurrentImage(
            getImageUrl(data.image_path, 'home-features') || ''
          );
        }
      }
      setFetching(false);
    };

    fetchFeature();
  }, [params.id, supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imagePath = currentImage ? 
        currentImage.split('/storage/v1/object/public/home-features/')[1] : null;

      if (imageFile) {
        // Delete old image if exists
        if (originalImagePath) {
          let cleanPath = originalImagePath;
          if (originalImagePath.includes('/storage/v1/object/public/home-features/')) {
            cleanPath = originalImagePath.split('/storage/v1/object/public/home-features/')[1];
          }
          cleanPath = cleanPath.split('?')[0];
          
          await supabase.storage.from("home-features").remove([cleanPath]);
        }

        // Compress and convert to WebP
        const compressedFile = await compressImageToWebP(imageFile);
        const fileName = generateUniqueImageFilename(imageFile.name);
        const filePath = `features/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("home-features")
          .upload(filePath, compressedFile);

        if (uploadError) throw uploadError;
        imagePath = filePath;
      }

      const { error } = await supabase
        .from("home_features")
        .update({
          ...formData,
          image_path: imagePath,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id);

      if (error) throw error;

      router.push("/home-features");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="space-y-6">
        <BackButton href="/admin/offers" />
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton href="/admin/offers" />

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
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({ ...formData, display_order: parseInt(e.target.value) || 100 })
                }
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="image">Image (Square Recommended)</Label>
              {currentImage && (
                <div className="mb-4">
                  <img
                    src={currentImage}
                    alt="Current"
                    className="h-32 w-32 rounded object-cover"
                  />
                </div>
              )}
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                📐 Recommended: Square aspect ratio (1:1) for best display (e.g., 800x800px)
              </p>
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
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Feature"}
          </Button>
        </div>
      </form>
    </div>
  );
}

