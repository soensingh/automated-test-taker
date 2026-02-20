"use client";

import { ChangeEvent, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { LogoutButton } from "@/components/auth/logout-button";

type SettingsPageClientProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

export function SettingsPageClient({ user }: SettingsPageClientProps) {
  const { setTheme, theme } = useTheme();
  const [profileImage, setProfileImage] = useState<string | null | undefined>(user.image);
  const [uploading, setUploading] = useState(false);

  async function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !user.email) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);

      const response = await fetch("/api/users/upload-profile", {
        method: "POST",
        body: formData,
        headers: {
          "x-user-email": user.email,
        },
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { profileImagePath?: string };

      if (payload.profileImagePath) {
        setProfileImage(payload.profileImagePath);
      }
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="grid gap-6">
      {/* Profile Section */}
      <div className="ui-panel p-6">
        <h2 className="text-lg font-semibold border-b pb-2 mb-4">Profile</h2>
        <div className="flex items-start gap-6">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border bg-muted">
            {profileImage ? (
              <Image
                src={profileImage}
                alt="Profile"
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
                {user.email?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Email
              </label>
              <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
            </div>
            
            <div>
              <label className="ui-button-outline cursor-pointer">
                {uploading ? "Uploading..." : "Change Photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileSelected}
                  disabled={uploading}
                />
              </label>
              <p className="text-[0.8rem] text-muted-foreground mt-2">
                Click to upload a new profile picture.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="ui-panel p-6">
        <h2 className="text-lg font-semibold border-b pb-2 mb-4">Appearance</h2>
        <div className="space-y-4">
          <div>
            <label className="text-base font-medium">Theme</label>
            <p className="text-sm text-muted-foreground">
              Select the theme for the dashboard.
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setTheme("light")}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 hover:bg-accent hover:text-accent-foreground ${
                theme === "light" ? "border-primary bg-accent" : "border-muted bg-transparent"
              }`}
            >
              <div className="h-20 w-32 rounded-md bg-[#ffffff] border border-slate-200 shadow-sm"></div>
              <span className="text-sm font-medium">Light</span>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 hover:bg-accent hover:text-accent-foreground ${
                theme === "dark" ? "border-primary bg-accent" : "border-muted bg-transparent"
              }`}
            >
              <div className="h-20 w-32 rounded-md bg-[#0f1220] border border-slate-800 shadow-sm"></div>
              <span className="text-sm font-medium">Dark</span>
            </button>
          </div>
        </div>
      </div>

      {/* Account Section */}
      <div className="ui-panel p-6 border-destructive/20">
        <h2 className="text-lg font-semibold border-b pb-2 mb-4 text-destructive">Account Actions</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Sign out</p>
            <p className="text-sm text-muted-foreground">
              Sign out of your account on this device.
            </p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
