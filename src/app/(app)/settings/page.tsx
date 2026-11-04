"use client";

import { ThemeControl } from "@/components/settings/ThemeControl";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-[1100px] mx-auto w-full">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Settings</h1>
      </div>

      <div className="rounded-card border border-border bg-surface p-6 flex flex-col gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold">Appearance</h2>
          <p className="text-sm text-text-muted mt-1">
            Choose how Margin looks to you. "System" will match your device settings.
          </p>
        </div>
        <ThemeControl />
      </div>
    </div>
  );
}