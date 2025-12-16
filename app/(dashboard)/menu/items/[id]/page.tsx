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

export default function EditMenuItemPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    category_id: "",
    name: "",
    slug: "",
    description: "",
    base_price: "",
    is_veg: false,
    spicy_level: 0,
    is_featured: false,
    is_available: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [originalImagePath, setOriginalImagePath] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [itemResult, categoriesResult, variantsResult] = await Promise.all([
        supabase.from("menu_items").select("*").eq("id", params.id).single(),
        supabase.from("menu_categories").select("id, name").eq("is_active", true),
        supabase.from("menu_item_variants").select("*").eq("item_id", params.id),
      ]);

      if (itemResult.data) {
        const item = itemResult.data;
        setFormData({
          category_id: item.category_id,
          name: item.name || "",
          slug: item.slug || "",
          description: item.description || "",
          base_price: item.base_price?.toString() || "",
          is_veg: item.is_veg || false,
          spicy_level: item.spicy_level || 0,
          is_featured: item.is_featured || false,
          is_available: item.is_available ?? true,
        });
        if (item.image_path) {
          setOriginalImagePath(item.image_path);
          setCurrentImage(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu-items/${item.image_path}?t=${Date.now()}`
          );
        }
      }
      if (categoriesResult.data) setCategories(categoriesResult.data);
      if (variantsResult.data) setVariants(variantsResult.data);
      setFetching(false);
    };

    fetchData();
  }, [params.id, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imagePath = currentImage
        ? currentImage.split("/storage/v1/object/public/menu-items/")[1]
        : null;

      if (imageFile) {
        // Delete old image if exists
        if (originalImagePath) {
          await supabase.storage.from("menu-items").remove([originalImagePath]);
        }

        // Compress and convert to WebP
        const compressedFile = await compressImageToWebP(imageFile, 200);
        const fileName = `${Math.random()}.webp`;
        const filePath = `items/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("menu-items")
          .upload(filePath, compressedFile);

        if (uploadError) throw uploadError;
        imagePath = filePath;
      }

      const { error } = await supabase
        .from("menu_items")
        .update({
          ...formData,
          base_price: formData.base_price ? parseFloat(formData.base_price) : null,
          spicy_level: parseInt(formData.spicy_level.toString()),
          image_path: imagePath,
        })
        .eq("id", params.id);

      if (error) throw error;

      router.refresh();
      router.push("/menu/items");
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
      <PageBreadcrumb
        items={[
          { label: "Menu", href: "/menu" },
          { label: "Items", href: "/menu/items" },
          { label: "Edit" },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-dark">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="category_id">Category</Label>
              <select
                id="category_id"
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-theme-sm dark:border-gray-800 dark:bg-gray-900"
                required
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="base_price">Base Price</Label>
              <Input
                id="base_price"
                type="number"
                step={0.01}
                value={formData.base_price || ""}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
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
              <Label htmlFor="spicy_level">Spicy Level (0-3)</Label>
              <Input
                id="spicy_level"
                type="number"
                min="0"
                max="3"
                value={formData.spicy_level}
                onChange={(e) => setFormData({ ...formData, spicy_level: parseInt(e.target.value) })}
              />
            </div>

            <div>
              <Label htmlFor="image">Image</Label>
              {currentImage && (
                <img 
                  src={`${currentImage.split('?')[0]}?t=${Date.now()}`} 
                  alt="Current" 
                  className="mb-2 h-32 w-32 rounded object-cover" 
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

            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_veg}
                  onChange={(e) => setFormData({ ...formData, is_veg: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-theme-sm text-gray-700 dark:text-gray-300">Vegetarian</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-theme-sm text-gray-700 dark:text-gray-300">Featured</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-theme-sm text-gray-700 dark:text-gray-300">Available</span>
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-dark">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Variants</h3>
          <div className="space-y-4">
            {variants.map((variant) => (
              <div key={variant.id} className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{variant.name}</p>
                  <p className="text-theme-sm text-gray-600 dark:text-gray-400">${variant.price}</p>
                </div>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm">
              Add Variant
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Item"}
          </Button>
        </div>
      </form>
    </div>
  );
}

