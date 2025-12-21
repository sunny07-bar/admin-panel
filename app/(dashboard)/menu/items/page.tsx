"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import { PlusIcon, TrashBinIcon } from "@/icons";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export default function MenuItemsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; imagePath: string | null } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("menu_items")
      .select(`
        *,
        menu_categories(name),
        menu_item_variants(id, name, price)
      `)
      .order("created_at", { ascending: false });
    const itemsData = data || [];
    setAllItems(itemsData);
    setItems(itemsData);
    setLoading(false);
  }, [supabase]);

  // Filter items by search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setItems(allItems);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = allItems.filter((item) => {
      const name = item.name?.toLowerCase() || "";
      const categoryName = item.menu_categories?.name?.toLowerCase() || "";
      const description = item.description?.toLowerCase() || "";
      return name.includes(query) || categoryName.includes(query) || description.includes(query);
    });

    setItems(filtered);
  }, [searchQuery, allItems]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDeleteClick = (id: string, imagePath: string | null) => {
    if (deletingId === id || loading) {
      return;
    }
    setItemToDelete({ id, imagePath });
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    
    setShowConfirmModal(false);
    const { id, imagePath } = itemToDelete;
    setItemToDelete(null);
    setDeletingId(id);

    try {
      setLoading(true);
      console.log("Starting deletion for menu item:", id);

      // Step 1: Delete menu item variants first
      console.log("Step 1: Deleting menu item variants...");
      const { error: variantsError } = await supabase
        .from("menu_item_variants")
        .delete()
        .eq("menu_item_id", id);

      if (variantsError) {
        console.error("Error deleting variants:", variantsError);
        // Continue anyway - might not have variants
      } else {
        console.log("Menu item variants deleted successfully");
      }

      // Step 2: Delete image from storage
      if (imagePath) {
        console.log("Step 2: Deleting image from storage...", imagePath);
        try {
          // Clean the path: remove URL parts if present, otherwise use as-is
          let cleanPath = imagePath;
          if (imagePath.includes('/storage/v1/object/public/menu-items/')) {
            cleanPath = imagePath.split('/storage/v1/object/public/menu-items/')[1];
          }
          // Remove query parameters if any
          cleanPath = cleanPath.split('?')[0];
          
          console.log("Cleaned image path for deletion:", cleanPath);
          console.log("Using bucket: menu-items");
          
          const { data: deleteData, error: storageError } = await supabase
            .storage
            .from("menu-items")
            .remove([cleanPath]);
          
          if (storageError) {
            console.error("Error deleting image from storage:", {
              error: storageError,
              path: cleanPath,
              originalPath: imagePath,
              bucket: "menu-items"
            });
            // Continue with database deletion even if image deletion fails
          } else {
            console.log("Image deleted successfully from storage:", deleteData);
          }
        } catch (storageError) {
          console.error("Exception deleting image from storage:", storageError);
          // Continue with database deletion even if image deletion fails
        }
      } else {
        console.log("No image path to delete");
      }

      // Step 3: Delete the menu item itself
      console.log("Step 3: Deleting menu item...");
      const { error, data } = await supabase
        .from("menu_items")
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
        throw new Error(`Failed to delete menu item: ${error.message}. ${error.details || ''} ${error.hint ? `Hint: ${error.hint}` : ''}`);
      }

      console.log("Menu item deleted successfully:", data);

      // Refresh the items list
      await fetchItems();
      
      alert("Menu item deleted successfully!");
    } catch (error: any) {
      console.error("Delete error:", error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
      console.error("Full error object:", error);
      alert(`Error deleting menu item: ${errorMessage}\n\nPlease check the browser console for more details.`);
    } finally {
      setLoading(false);
      setDeletingId(null);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setItemToDelete(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb items={[{ label: "Menu", href: "/menu" }, { label: "Items" }]} />
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageBreadcrumb items={[{ label: "Menu", href: "/menu" }, { label: "Items" }]} />
        <Link href="/menu/items/new">
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Item
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search items by name, category, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        {searchQuery && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchQuery("")}
          >
            Clear
          </Button>
        )}
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
                  Name
                </th>
                <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Price
                </th>
                <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {items?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {loading ? "Loading items..." : searchQuery ? "No items found matching your search." : "No menu items found."}
                  </td>
                </tr>
              ) : (
                items?.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-6 py-4">
                    {item.image_path ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu-items/${item.image_path}?t=${Date.now()}`}
                        alt={item.name}
                        className="h-16 w-16 rounded object-cover"
                        key={`${item.id}-${item.updated_at || Date.now()}`}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                    )}
                  </td>
                  <td className="px-6 py-4 text-theme-sm font-medium text-gray-900 dark:text-white">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 text-theme-sm text-gray-600 dark:text-gray-400">
                    {item.menu_categories?.name || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-theme-sm text-gray-600 dark:text-gray-400">
                    {item.base_price ? `$${item.base_price}` : "Variants"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        item.is_available
                          ? "bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {item.is_available ? "Available" : "Unavailable"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/menu/items/${item.id}`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteClick(item.id, item.image_path);
                        }}
                        disabled={loading || deletingId === item.id}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simple Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Menu Item?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this menu item? This action cannot be undone and will delete all associated variants.
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

