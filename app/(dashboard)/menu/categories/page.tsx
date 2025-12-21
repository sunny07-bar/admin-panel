"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import { PlusIcon, TrashBinIcon } from "@/icons";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export default function MenuCategoriesPage() {
  const supabase = createClient();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("menu_categories")
      .select("*")
      .order("display_order", { ascending: true });
    setCategories(data || []);
    setLoading(false);
  };

  const handleDeleteClick = (id: string) => {
    if (deletingId === id || loading) {
      return;
    }
    setCategoryToDelete(id);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    
    setShowConfirmModal(false);
    const id = categoryToDelete;
    setCategoryToDelete(null);
    setDeletingId(id);

    try {
      setLoading(true);
      console.log("Starting deletion for category:", id);

      // Step 1: Delete all menu items in this category first
      console.log("Step 1: Fetching menu items in category...");
      const { data: menuItems, error: itemsFetchError } = await supabase
        .from("menu_items")
        .select("id, image_path")
        .eq("category_id", id);

      if (itemsFetchError) {
        console.error("Error fetching menu items:", itemsFetchError);
      } else {
        console.log(`Found ${menuItems?.length || 0} menu items in category`);
      }

      // Step 2: Delete menu items and their images
      if (menuItems && menuItems.length > 0) {
        console.log("Step 2: Deleting menu items and their variants...");
        for (const item of menuItems) {
          // Delete variants first
          await supabase
            .from("menu_item_variants")
            .delete()
            .eq("menu_item_id", item.id);

          // Delete item image if exists
          if (item.image_path) {
            let cleanPath = item.image_path;
            if (item.image_path.includes('/storage/v1/object/public/menu-items/')) {
              cleanPath = item.image_path.split('/storage/v1/object/public/menu-items/')[1];
            }
            cleanPath = cleanPath.split('?')[0];
            
            try {
              await supabase.storage.from("menu-items").remove([cleanPath]);
            } catch (err) {
              console.error("Error deleting item image:", err);
            }
          }
        }

        // Delete all menu items
        const { error: itemsDeleteError } = await supabase
          .from("menu_items")
          .delete()
          .eq("category_id", id);

        if (itemsDeleteError) {
          console.error("Error deleting menu items:", itemsDeleteError);
        } else {
          console.log("Menu items deleted successfully");
        }
      }

      // Step 3: Delete the category itself
      console.log("Step 3: Deleting category...");
      const { error, data } = await supabase
        .from("menu_categories")
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
        throw new Error(`Failed to delete category: ${error.message}. ${error.details || ''} ${error.hint ? `Hint: ${error.hint}` : ''}`);
      }

      console.log("Category deleted successfully:", data);

      // Refresh the categories list
      await fetchCategories();
      
      alert("Category deleted successfully!");
    } catch (error: any) {
      console.error("Delete error:", error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
      console.error("Full error object:", error);
      alert(`Error deleting category: ${errorMessage}\n\nPlease check the browser console for more details.`);
    } finally {
      setLoading(false);
      setDeletingId(null);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setCategoryToDelete(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb items={[{ label: "Menu", href: "/menu" }, { label: "Categories" }]} />
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageBreadcrumb items={[{ label: "Menu", href: "/menu" }, { label: "Categories" }]} />
        <Link href="/menu/categories/new">
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Category
          </Button>
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Slug
                </th>
                <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Order
                </th>
                <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Type
                </th>
                <th className="px-6 py-4 text-right text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {categories?.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-6 py-4 text-theme-sm font-medium text-gray-900 dark:text-white">
                    {category.name}
                  </td>
                  <td className="px-6 py-4 text-theme-sm text-gray-600 dark:text-gray-400">
                    {category.slug}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        category.is_active
                          ? "bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {category.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-theme-sm text-gray-600 dark:text-gray-400">
                    {category.display_order}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        category.category_type === 'food'
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                      }`}
                    >
                      {category.category_type === 'food' ? 'Food' : 'Drink'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/menu/categories/${category.id}`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteClick(category.id);
                        }}
                        disabled={loading || deletingId === category.id}
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
              Delete Category?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this category? This action cannot be undone and will delete all menu items and their variants in this category.
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

