"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import TextArea from "@/components/form/input/TextArea";

export default function ContentPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<any>(null);

  useEffect(() => {
    const fetchSections = async () => {
      const { data } = await supabase.from("static_sections").select("*");
      if (data) setSections(data);
    };
    fetchSections();
  }, [supabase]);

  const handleSave = async () => {
    if (!selectedSection) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("static_sections")
        .upsert({
          id: selectedSection.id,
          section_key: selectedSection.section_key,
          title: selectedSection.title,
          body: selectedSection.body,
        });

      if (error) throw error;
      alert("Content saved successfully!");
      const { data } = await supabase.from("static_sections").select("*");
      if (data) setSections(data);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={[{ label: "Content" }]} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-dark">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Sections</h3>
          <div className="space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section)}
                className={`w-full rounded-lg border p-3 text-left text-theme-sm transition-colors ${
                  selectedSection?.id === section.id
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                    : "border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                }`}
              >
                {section.section_key}
              </button>
            ))}
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                setSelectedSection({
                  id: null,
                  section_key: "",
                  title: "",
                  body: "",
                })
              }
            >
              + New Section
            </Button>
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedSection ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-dark">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Edit Section</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="section_key">Section Key</Label>
                  <Input
                    id="section_key"
                    value={selectedSection.section_key}
                    onChange={(e) =>
                      setSelectedSection({ ...selectedSection, section_key: e.target.value })
                    }
                    placeholder="e.g. about, footer_about"
                  />
                </div>
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={selectedSection.title || ""}
                    onChange={(e) =>
                      setSelectedSection({ ...selectedSection, title: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="body">Content</Label>
                  <TextArea
                    id="body"
                    value={selectedSection.body || ""}
                    onChange={(value) =>
                      setSelectedSection({ ...selectedSection, body: value })
                    }
                    rows={10}
                  />
                </div>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? "Saving..." : "Save Section"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-dark">
              <p className="text-theme-sm text-gray-600 dark:text-gray-400">
                Select a section to edit or create a new one
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

