"use client";

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { Bus } from "lucide-react";

function SyncPill({ status }: { status: string }) {
  const isWarning = status === "Offline" || status.includes("waiting");
  const colorClass = isWarning
    ? "bg-warn/10 text-warn-strong border-warn/20"
    : "bg-success/10 text-success-strong border-success/20";
  return (
    <div className={`inline-flex items-center rounded-pill border px-2.5 py-1 text-[12px] font-medium tabular-nums ${colorClass}`}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </div>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState("system");

  useEffect(() => {
    const stored = localStorage.getItem("margin-theme");
    if (stored) setTheme(stored);
  }, []);

  const applyTheme = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("margin-theme", newTheme);
    if (newTheme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.dataset.theme = isDark ? "dark" : "light";
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    } else {
      document.documentElement.dataset.theme = newTheme;
      document.documentElement.style.colorScheme = newTheme;
    }
  };

  return (
    <div className="fixed top-4 right-4 flex gap-2 rounded-control border border-border bg-surface p-1">
      {["system", "dark", "light"].map((t) => (
        <button
          key={t}
          onClick={() => applyTheme(t)}
          className={`px-3 py-1 text-sm rounded-control capitalize ${theme === t ? "bg-primary text-primary-text font-medium" : "text-text-muted hover:text-text"}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export default function TokensPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const colours = [
    ["bg", "bg-bg", "#0F1110 / #F6F5F1"],
    ["surface", "bg-surface", "#171A18 / #FFFFFF"],
    ["surface-raised", "bg-surface-raised", "#1E2220 / #FBFAF7"],
    ["primary", "bg-primary", "#F2F1ED / #151715"],
    ["success", "bg-success", "#4CC9A0 / #1E9E78"],
    ["warn", "bg-warn", "#F2B544 / #B7791F"],
    ["danger", "bg-danger", "#F0705A / #C2412D"],
  ];

  return (
    <div className="min-h-screen bg-bg p-8 text-text pb-24">
      <ThemeToggle />
      <h1 className="font-heading text-4xl font-bold">Design tokens</h1>
      <p className="mt-2 text-text-muted">
        Verify at 360, 390, 768, and 1280px.
      </p>

      <section className="mt-10">
        <h2 className="font-heading text-2xl font-semibold">Colour</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          {colours.map(([name, cls, hex]) => (
            <div key={name} className="rounded-card border border-border bg-surface p-3">
              <div className={`h-10 rounded-control border border-border ${cls}`} />
              <p className="mt-2 font-sans text-sm font-medium">{name}</p>
              <p className="font-sans text-xs text-text-muted">{hex}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-2xl font-semibold">Type</h2>
        <h2 className="mt-4 font-heading text-5xl font-bold">Bricolage 5xl</h2>
        <h2 className="font-heading text-3xl font-semibold">Bricolage 3xl</h2>
        <p className="mt-4 font-sans text-base">
          DM Sans body. The quick brown fox jumps over the lazy dog.
        </p>
        <p className="mt-2 font-heading text-4xl font-bold tabular-nums">
          ₦ 1,250,000.00
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-2xl font-semibold">Buttons</h2>
        <div className="mt-4 flex gap-3">
          <button className="rounded-control bg-primary px-4 py-2 font-sans text-sm font-medium text-primary-text hover:bg-primary-hover transition-colors">
            Primary
          </button>
          <button className="rounded-control border border-border bg-surface px-4 py-2 font-sans text-sm font-medium text-text">
            Secondary
          </button>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-2xl font-semibold">Category chip</h2>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1.5 font-sans text-xs text-text">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-success/10 text-success-strong">
            <Bus size={12} />
          </span>
          Transport
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-2xl font-semibold">Budget bars</h2>
        <div className="mt-4 flex flex-col gap-4">
          {[
            ["Calm", 40, "bg-success"],
            ["Near limit", 90, "bg-warn"],
            ["Over", 120, "bg-danger"],
          ].map(([label, pct, cls]) => (
            <div key={label as string}>
              <div className="flex justify-between font-sans text-sm">
                <span>{label}</span>
                <span className="tabular-nums">{pct}%</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-pill bg-surface-raised border border-border">
                <div
                  className={`h-full rounded-pill ${cls}`}
                  style={{ width: `${Math.min(Number(pct), 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-2xl font-semibold">Sync pill</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <SyncPill status="Synced" />
          <SyncPill status="Offline" />
          <SyncPill status="Syncing" />
          <SyncPill status="3 changes waiting" />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-2xl font-semibold">Card</h2>
        <div className="mt-4 rounded-card border border-border bg-surface p-6">
          <p className="font-sans text-sm text-text-muted">
            This card uses rounded-card, border-border, and bg-surface.
          </p>
        </div>
      </section>
    </div>
  );
}