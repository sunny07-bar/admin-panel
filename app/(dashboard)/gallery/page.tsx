"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import { PlusIcon } from "@/icons";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export default function GalleryPage() {
  const router = useRouter();
  const supabase = createClient();
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    const { data } = await supabase
      .from("gallery_images")
      .select("*")
      .order("display_order", { ascending: true });
    setImages(data || []);
    setLoading(false);
  };

  const handleDelete = async (id: string, imagePath: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;

    try {
      // Delete from storage
      if (imagePath) {
        await supabase.storage.from("gallery").remove([imagePath]);
      }

      // Delete from database
      const { error } = await supabase.from("gallery_images").delete().eq("id", id);

      if (error) throw error;

      fetchImages();
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb items={[{ label: "Gallery" }]} />
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageBreadcrumb items={[{ label: "Gallery" }]} />
        <Link href="/gallery/new">
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Image
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {images?.map((image) => (
          <div
            key={image.id}
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark"
          >
            <img
              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gallery/${image.image_path}?t=${Date.now()}`}
              alt={image.caption || "Gallery image"}
              className="h-64 w-full object-cover transition-transform group-hover:scale-105"
              key={`${image.id}-${image.updated_at || Date.now()}`}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex h-full items-center justify-center gap-2">
                <Link href={`/gallery/${image.id}`}>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(image.id, image.image_path)}
                >
                  Delete
                </Button>
              </div>
            </div>
            {image.caption && (
              <p className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 text-theme-xs text-white">
                {image.caption}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

