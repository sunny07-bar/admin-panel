"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImageToWebP } from "@/lib/utils/imageCompression";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";

export default function EditBannerPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    cta_label: "",
    cta_link: "",
    display_order: 100,
    is_active: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [originalImagePath, setOriginalImagePath] = useState<string | null>(null);

  useEffect(() => {
    const fetchBanner = async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) {
        alert(error.message);
        router.push("/banners");
        return;
      }

      if (data) {
        setFormData({
          title: data.title || "",
          subtitle: data.subtitle || "",
          cta_label: data.cta_label || "",
          cta_link: data.cta_link || "",
          display_order: data.display_order || 100,
          is_active: data.is_active ?? true,
        });
        if (data.image_path) {
          setOriginalImagePath(data.image_path);
          setCurrentImage(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/banners/${data.image_path}?t=${Date.now()}`
          );
        }
      }
      setFetching(false);
    };

    fetchBanner();
  }, [params.id, supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imagePath = currentImage ? 
        currentImage.split('/storage/v1/object/public/banners/')[1] : null;

      if (imageFile) {
        // Delete old image if exists
        if (originalImagePath) {
          // Clean the path: remove URL parts if present, otherwise use as-is
          let cleanPath = originalImagePath;
          if (originalImagePath.includes('/storage/v1/object/public/banners/')) {
            cleanPath = originalImagePath.split('/storage/v1/object/public/banners/')[1];
          }
          cleanPath = cleanPath.split('?')[0];
          
          console.log("Deleting old banner image:", cleanPath, "from bucket: banners");
          await supabase.storage.from("banners").remove([cleanPath]);
        }

        // Compress and convert to WebP
        // Compress and convert to WebP (under 100KB, maintains quality)
        const compressedFile = await compressImageToWebP(imageFile);
        const fileName = `${Math.random()}.webp`;
        const filePath = `hero/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("banners")
          .upload(filePath, compressedFile);

        if (uploadError) throw uploadError;
        imagePath = filePath;
      }

      const { error } = await supabase
        .from("banners")
        .update({
          ...formData,
          image_path: imagePath,
        })
        .eq("id", params.id);

      if (error) throw error;

      router.refresh();
      router.push("/banners");
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
      <PageBreadcrumb items={[{ label: "Banners", href: "/banners" }, { label: "Edit" }]} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-dark">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="cta_label">CTA Label</Label>
              <Input
                id="cta_label"
                value={formData.cta_label}
                onChange={(e) => setFormData({ ...formData, cta_label: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="cta_link">CTA Link</Label>
              <Input
                id="cta_link"
                value={formData.cta_link}
                onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })}
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
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                📐 Recommended: 16:10 aspect ratio (e.g., 1920x1200px) for best display on all devices
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
            {loading ? "Updating..." : "Update Banner"}
          </Button>
        </div>
      </form>
    </div>
  );
}

