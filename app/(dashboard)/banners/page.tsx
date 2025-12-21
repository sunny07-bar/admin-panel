"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import { PlusIcon, TrashBinIcon } from "@/icons";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export default function BannersPage() {
  const supabase = createClient();
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<{ id: string; imagePath: string | null } | null>(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    const { data } = await supabase
      .from("banners")
      .select("*")
      .order("display_order", { ascending: true });
    setBanners(data || []);
    setLoading(false);
  };

  const handleDeleteClick = (id: string, imagePath: string | null) => {
    if (deletingId === id || loading) {
      return;
    }
    setBannerToDelete({ id, imagePath });
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!bannerToDelete) return;
    
    setShowConfirmModal(false);
    const { id, imagePath } = bannerToDelete;
    setBannerToDelete(null);
    setDeletingId(id);

    try {
      setLoading(true);
      console.log("Starting deletion for banner:", id);

      // Step 1: Delete image from storage
      if (imagePath) {
        console.log("Step 1: Deleting image from storage...", imagePath);
        try {
          // Clean the path: remove URL parts if present, otherwise use as-is
          let cleanPath = imagePath;
          if (imagePath.includes('/storage/v1/object/public/banners/')) {
            cleanPath = imagePath.split('/storage/v1/object/public/banners/')[1];
          }
          // Remove query parameters if any
          cleanPath = cleanPath.split('?')[0];
          
          console.log("Cleaned image path for deletion:", cleanPath);
          console.log("Using bucket: banners");
          
          const { data: deleteData, error: storageError } = await supabase
            .storage
            .from("banners")
            .remove([cleanPath]);
          
          if (storageError) {
            console.error("Error deleting image from storage:", {
              error: storageError,
              path: cleanPath,
              originalPath: imagePath,
              bucket: "banners"
            });
          } else {
            console.log("Image deleted successfully from storage:", deleteData);
          }
        } catch (storageError) {
          console.error("Exception deleting image from storage:", storageError);
        }
      }

      // Step 2: Delete the banner itself
      console.log("Step 2: Deleting banner...");
      const { error, data } = await supabase
        .from("banners")
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
        throw new Error(`Failed to delete banner: ${error.message}. ${error.details || ''} ${error.hint ? `Hint: ${error.hint}` : ''}`);
      }

      console.log("Banner deleted successfully:", data);

      // Refresh the banners list
      await fetchBanners();
      
      alert("Banner deleted successfully!");
    } catch (error: any) {
      console.error("Delete error:", error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
      console.error("Full error object:", error);
      alert(`Error deleting banner: ${errorMessage}\n\nPlease check the browser console for more details.`);
    } finally {
      setLoading(false);
      setDeletingId(null);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setBannerToDelete(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb items={[{ label: "Banners" }]} />
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageBreadcrumb items={[{ label: "Banners" }]} />
        <Link href="/banners/new">
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Banner
          </Button>
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Image
                </th>
                <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Title
                </th>
                <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Order
                </th>
                <th className="px-6 py-4 text-right text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {banners?.map((banner) => (
                <tr key={banner.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-6 py-4">
                    {banner.image_path ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/banners/${banner.image_path}?t=${Date.now()}`}
                        alt={banner.title || "Banner"}
                        className="h-16 w-32 rounded object-cover"
                        key={`${banner.id}-${banner.updated_at || Date.now()}`}
                      />
                    ) : (
                      <div className="h-16 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                    )}
                  </td>
                  <td className="px-6 py-4 text-theme-sm text-gray-900 dark:text-white">
                    {banner.title || "Untitled"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        banner.is_active
                          ? "bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {banner.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-theme-sm text-gray-600 dark:text-gray-400">
                    {banner.display_order}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/banners/${banner.id}`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteClick(banner.id, banner.image_path);
                        }}
                        disabled={loading || deletingId === banner.id}
                        className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg border border-gray-300 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 dark:bg-gray-800 dark:text-red-500 dark:border-gray-700 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        style={{ 
                          minWidth: '44px',
                          minHeight: '44px'
                        }}
                      >
                        <TrashBinIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simple Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Banner?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this banner? This action cannot be undone.
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

