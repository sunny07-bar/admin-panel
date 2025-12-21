"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import { PlusIcon, TrashBinIcon } from "@/icons";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export default function GalleryPage() {
  const router = useRouter();
  const supabase = createClient();
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<{ id: string; imagePath: string } | null>(null);

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

  const handleDeleteClick = (id: string, imagePath: string) => {
    if (deletingId === id || loading) {
      return;
    }
    setImageToDelete({ id, imagePath });
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!imageToDelete) return;
    
    setShowConfirmModal(false);
    const { id, imagePath } = imageToDelete;
    setImageToDelete(null);
    setDeletingId(id);

    try {
      setLoading(true);
      console.log("Starting deletion for gallery image:", id);

      // Step 1: Delete image from storage
      if (imagePath) {
        console.log("Step 1: Deleting image from storage...", imagePath);
        try {
          // Clean the path: remove URL parts if present, otherwise use as-is
          let cleanPath = imagePath;
          if (imagePath.includes('/storage/v1/object/public/gallery/')) {
            cleanPath = imagePath.split('/storage/v1/object/public/gallery/')[1];
          }
          // Remove query parameters if any
          cleanPath = cleanPath.split('?')[0];
          
          console.log("Cleaned image path for deletion:", cleanPath);
          console.log("Using bucket: gallery");
          
          const { data: deleteData, error: storageError } = await supabase
            .storage
            .from("gallery")
            .remove([cleanPath]);
          
          if (storageError) {
            console.error("Error deleting image from storage:", {
              error: storageError,
              path: cleanPath,
              originalPath: imagePath,
              bucket: "gallery"
            });
          } else {
            console.log("Image deleted successfully from storage:", deleteData);
          }
        } catch (storageError) {
          console.error("Exception deleting image from storage:", storageError);
        }
      }

      // Step 2: Delete the gallery image record
      console.log("Step 2: Deleting gallery image record...");
      const { error, data } = await supabase
        .from("gallery_images")
        .delete()
        .eq("id", id)
        .select();

      if (error) {
        console.error("Delete error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Failed to delete gallery image: ${error.message}. ${error.details || ''} ${error.hint ? `Hint: ${error.hint}` : ''}`);
      }

      console.log("Gallery image deleted successfully:", data);

      // Refresh the images list
      await fetchImages();
      
      alert("Gallery image deleted successfully!");
    } catch (error: any) {
      console.error("Delete error:", error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
      console.error("Full error object:", error);
      alert(`Error deleting gallery image: ${errorMessage}\n\nPlease check the browser console for more details.`);
    } finally {
      setLoading(false);
      setDeletingId(null);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setImageToDelete(null);
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
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteClick(image.id, image.image_path);
                  }}
                  disabled={loading || deletingId === image.id}
                  className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg border border-gray-300 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 dark:bg-gray-800 dark:text-red-500 dark:border-gray-700 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Delete
                </button>
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

      {/* Simple Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Gallery Image?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this gallery image? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelDelete}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDelete}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

