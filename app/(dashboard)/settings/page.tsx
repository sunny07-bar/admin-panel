"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImageToWebP } from "@/lib/utils/imageCompression";
import { convert24To12, convert12To24 } from "@/lib/utils/timeFormat";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import TextArea from "@/components/form/input/TextArea";

export default function SettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [openingHours, setOpeningHours] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState({
    restaurant_name: "",
    phone: "",
    email: "",
    address: "",
    logo_path: "",
    instagram_user_id: "",
    facebook_user_id: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [hoursResult, settingsResult] = await Promise.all([
        supabase.from("opening_hours").select("*").order("weekday"),
        supabase.from("site_settings").select("*"),
      ]);

      if (hoursResult.data) {
        // Log what we're receiving from database for debugging
        console.log('Fetched opening hours from database:', hoursResult.data);
        hoursResult.data.forEach((hour: any) => {
          console.log(`Weekday ${hour.weekday}:`, {
            open_time: hour.open_time,
            close_time: hour.close_time,
            open_time_type: typeof hour.open_time,
            close_time_type: typeof hour.close_time,
          });
        });
        setOpeningHours(hoursResult.data);
      }
      if (settingsResult.data) {
        const settings: any = {};
        settingsResult.data.forEach((s: any) => {
          // Handle JSONB values - if it's a string, parse it, otherwise use as-is
          if (typeof s.value === 'string' && (s.value.startsWith('"') || s.value.startsWith('{'))) {
            try {
              settings[s.key] = JSON.parse(s.value);
            } catch {
              settings[s.key] = s.value;
            }
          } else {
            settings[s.key] = s.value;
          }
        });
        setSiteSettings(settings);
        
        // Load logo preview if exists
        if (settings.logo_path) {
          const logoPath = typeof settings.logo_path === 'string' 
            ? settings.logo_path.replace(/^"|"$/g, '') // Remove quotes if stringified
            : settings.logo_path
          
          if (logoPath) {
            const { data: logoData } = await supabase.storage
              .from('site-assets')
              .createSignedUrl(logoPath, 3600);
            if (logoData) {
              setLogoPreview(logoData.signedUrl);
            }
          }
        }
      }
    };

    fetchData();
  }, [supabase]);

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      let logoPath = siteSettings.logo_path;
      
      // Handle logo upload using API route (bypasses RLS)
      if (logoFile) {
        // Compress and convert to WebP (under 100KB, maintains quality)
        const compressedFile = await compressImageToWebP(logoFile);
        
        // Upload via API route that uses service role key
        const formData = new FormData();
        formData.append('file', compressedFile);
        if (logoPath) {
          formData.append('oldLogoPath', logoPath);
        }
        
        const uploadResponse = await fetch('/api/settings/upload-logo', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Failed to upload logo');
        }
        
        const uploadData = await uploadResponse.json();
        logoPath = uploadData.path;
        
        // Update preview
        const { data: logoData } = await supabase.storage
          .from('site-assets')
          .createSignedUrl(logoPath, 3600);
        if (logoData) {
          setLogoPreview(logoData.signedUrl);
        }
      }
      
      // Update site settings via API route (bypasses RLS)
      const updatedSettings = { ...siteSettings, logo_path: logoPath };
      const updateResponse = await fetch('/api/settings/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: updatedSettings }),
      });
      
      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Failed to update settings');
      }
      
      setLogoFile(null);
      alert("Settings saved successfully!");
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert(error.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveHours = async () => {
    setLoading(true);
    try {
      // Ensure times are saved as plain strings (HH:mm format) without any conversion
      for (const hour of openingHours) {
        // Ensure open_time and close_time are strings in HH:mm format
        const dataToSave = {
          ...hour,
          open_time: hour.open_time && typeof hour.open_time === 'string' 
            ? hour.open_time.trim() 
            : hour.open_time,
          close_time: hour.close_time && typeof hour.close_time === 'string' 
            ? hour.close_time.trim() 
            : hour.close_time,
        };
        
        console.log('Saving opening hour:', {
          weekday: dataToSave.weekday,
          open_time: dataToSave.open_time,
          close_time: dataToSave.close_time,
          open_time_type: typeof dataToSave.open_time,
          close_time_type: typeof dataToSave.close_time,
        });
        
        const { data, error } = await supabase.from("opening_hours").upsert(dataToSave).select();
        
        if (error) {
          console.error('Error saving hour:', error);
          throw error;
        }
        
        console.log('Saved successfully:', data);
      }
      alert("Opening hours saved successfully!");
    } catch (error: any) {
      console.error('Error in handleSaveHours:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={[{ label: "Settings" }]} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-dark">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Site Settings</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="restaurant_name">Restaurant Name</Label>
              <Input
                id="restaurant_name"
                value={siteSettings.restaurant_name}
                onChange={(e) =>
                  setSiteSettings({ ...siteSettings, restaurant_name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={siteSettings.phone}
                onChange={(e) => setSiteSettings({ ...siteSettings, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={siteSettings.email}
                onChange={(e) => setSiteSettings({ ...siteSettings, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <TextArea
                id="address"
                value={siteSettings.address}
                onChange={(value) => setSiteSettings({ ...siteSettings, address: value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="instagram_user_id">Instagram User ID</Label>
              <Input
                id="instagram_user_id"
                type="text"
                value={siteSettings.instagram_user_id || ""}
                onChange={(e) => setSiteSettings({ ...siteSettings, instagram_user_id: e.target.value })}
                placeholder="your_instagram_username"
              />
            </div>
            <div>
              <Label htmlFor="facebook_user_id">Facebook User ID</Label>
              <Input
                id="facebook_user_id"
                type="text"
                value={siteSettings.facebook_user_id || ""}
                onChange={(e) => setSiteSettings({ ...siteSettings, facebook_user_id: e.target.value })}
                placeholder="your_facebook_username"
              />
            </div>
            <div>
              <Label htmlFor="logo">Logo</Label>
              <div className="space-y-3">
                {logoPreview && (
                  <div className="relative w-32 h-32 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                />
                <p className="text-xs text-gray-500">
                  Upload your restaurant logo. Recommended size: 200x200px. Will be displayed in the website header.
                </p>
              </div>
            </div>
            <Button onClick={handleSaveSettings} disabled={loading}>
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-dark">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Opening Hours</h3>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Enter times in Florida time (EST/EDT, UTC-5). Times will be displayed on the website in Florida time.
          </p>
          <div className="space-y-4">
            {weekdays.map((day, index) => {
              const hour = openingHours.find((h) => h.weekday === index) || {
                weekday: index,
                open_time: "09:00",
                close_time: "22:00",
                is_closed: false,
              };

              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-24 text-theme-sm font-medium text-gray-900 dark:text-white">
                    {day}
                  </div>
                  {hour.is_closed ? (
                    <span className="text-theme-sm text-gray-600 dark:text-gray-400">Closed</span>
                  ) : (
                    <>
                      <Input
                        type="text"
                        placeholder="9:00 AM"
                        value={hour.open_time ? convert24To12(hour.open_time) : ''}
                        onChange={(e) => {
                          const time24 = convert12To24(e.target.value);
                          const updated = openingHours.map((h) =>
                            h.weekday === index ? { ...h, open_time: time24 } : h
                          );
                          if (!updated.find((h) => h.weekday === index)) {
                            updated.push({ ...hour, open_time: time24 });
                          }
                          setOpeningHours(updated);
                        }}
                        className="w-32"
                      />
                      <span className="text-theme-sm text-gray-600 dark:text-gray-400">to</span>
                      <Input
                        type="text"
                        placeholder="10:00 PM"
                        value={hour.close_time ? convert24To12(hour.close_time) : ''}
                        onChange={(e) => {
                          const time24 = convert12To24(e.target.value);
                          const updated = openingHours.map((h) =>
                            h.weekday === index ? { ...h, close_time: time24 } : h
                          );
                          if (!updated.find((h) => h.weekday === index)) {
                            updated.push({ ...hour, close_time: time24 });
                          }
                          setOpeningHours(updated);
                        }}
                        className="w-32"
                      />
                    </>
                  )}
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={hour.is_closed}
                      onChange={(e) => {
                        const updated = openingHours.map((h) =>
                          h.weekday === index ? { ...h, is_closed: e.target.checked } : h
                        );
                        if (!updated.find((h) => h.weekday === index)) {
                          updated.push({ ...hour, is_closed: e.target.checked });
                        }
                        setOpeningHours(updated);
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-theme-xs text-gray-600 dark:text-gray-400">Closed</span>
                  </label>
                </div>
              );
            })}
            <Button onClick={handleSaveHours} disabled={loading}>
              {loading ? "Saving..." : "Save Hours"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

