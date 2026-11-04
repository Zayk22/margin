"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Home, List, PieChart, Settings, Plus } from "lucide-react";
import { useSyncExternalStore, useEffect, useState } from "react";
import { syncStatusStore } from "@/sync/status";
import { useActiveUser } from "@/hooks/useActiveUser";
import { AddExpenseSheet } from "@/components/add-expense/AddExpenseSheet";

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
  const { userId, mode } = useActiveUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsSheetOpen(true);
    window.addEventListener("open-add-sheet", handleOpen);
    return () => window.removeEventListener("open-add-sheet", handleOpen);
  }, []);

  useEffect(() => {
    if (mode === "unauthenticated") {
      router.push("/sign-in");
    }
  }, [mode, router]);

  if (mode === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-4">
        <div className="h-6 w-32 animate-pulse rounded-pill bg-surface-raised"></div>
      </div>
    );
  }

  if (!userId) return null;

  const navItems = [
    { name: "Overview", href: "/", icon: Home },
    { name: "History", href: "/history", icon: List },
    { name: "Budgets", href: "/budgets", icon: PieChart },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-bg">
      <aside className="hidden w-64 flex-col border-r border-border bg-surface p-4 md:flex">
        <div className="mb-8 flex items-center justify-between">
          <span className="font-heading text-xl font-bold">Margin</span>
          <SyncPill />
        </div>
        <nav className="flex flex-col gap-1" aria-label="Main navigation">
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

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border bg-surface p-4 md:hidden">
          <span className="font-heading text-lg font-bold">Margin</span>
          <SyncPill />
        </div>
        <main className="flex-1 pb-24 md:pb-0">
          <div className="mx-auto w-full max-w-5xl p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-surface pt-2 md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }} aria-label="Mobile navigation">
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
        
        <button 
          onClick={() => setIsSheetOpen(true)}
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

      <AddExpenseSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
    </div>
  );
}