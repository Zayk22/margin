"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Home, List, PieChart, Settings, Plus } from "lucide-react";
import { useSyncExternalStore, useEffect } from "react";
import { syncStatusStore } from "@/sync/status";

function SyncPill() {
  const status = useSyncExternalStore(
    syncStatusStore.subscribe,
    syncStatusStore.getStatus,
    () => "Offline"
  );

  let colorClass = "bg-success/10 text-success-strong border-success/20";
  if (status === "Offline" || status.includes("waiting")) {
    colorClass = "bg-warn/10 text-warn-strong border-warn/20";
  } else if (status === "Sign in to sync") {
    colorClass = "bg-surface-raised text-text-muted border-border";
  }

  return (
    <div
      aria-live="polite"
      className={`inline-flex items-center rounded-pill border px-2.5 py-1 text-xs font-medium tabular-nums ${colorClass}`}
    >
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${status === "Syncing" ? "animate-pulse bg-current" : "bg-current"}`}></span>
      {status}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  let activeUserId = userId;
  if (!activeUserId && typeof window !== "undefined") {
    activeUserId = localStorage.getItem("margin-last-user-id");
  }

  useEffect(() => {
    if (isLoaded && !activeUserId) {
      router.push("/sign-in");
    }
  }, [isLoaded, activeUserId, router]);

  if (!isLoaded || !activeUserId) {
    return <div className="flex min-h-screen items-center justify-center p-4 text-sm text-text-muted">Loading...</div>;
  }

  const navItems = [
    { name: "Overview", href: "/", icon: Home },
    { name: "History", href: "/history", icon: List },
    { name: "Budgets", href: "/budgets", icon: PieChart },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-bg">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border bg-surface p-4 md:flex">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-heading text-xl font-bold">Margin</h1>
          <SyncPill />
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors ${
                  isActive ? "bg-surface-raised font-medium text-text" : "text-text-muted hover:bg-surface-raised hover:text-text"
                }`}
              >
                <item.icon size={18} /> {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface p-4 md:hidden">
          <h1 className="font-heading text-lg font-bold">Margin</h1>
          <SyncPill />
        </div>
        <main className="flex-1 pb-24 md:pb-0">
          {/* Constrain content width and center on desktop */}
          <div className="mx-auto w-full max-w-5xl p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-surface pt-2 md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
        {navItems.slice(0, 2).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center p-2 ${
                isActive ? "text-text font-medium" : "text-text-muted hover:text-text"
              }`}
            >
              <item.icon size={20} />
              <span className="mt-1 text-[11px]">{item.name}</span>
            </Link>
          );
        })}
        
        {/* Central Add Button */}
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent("open-add-sheet"))}
          className="flex h-14 w-14 -translate-y-4 items-center justify-center rounded-full bg-primary text-primary-text shadow-lg active:scale-95 transition-transform"
          aria-label="Add expense"
        >
          <Plus size={24} />
        </button>
        
        {navItems.slice(2).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center p-2 ${
                isActive ? "text-text font-medium" : "text-text-muted hover:text-text"
              }`}
            >
              <item.icon size={20} />
              <span className="mt-1 text-[11px]">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}