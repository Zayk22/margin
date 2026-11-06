"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { useUser, useClerk, useAuth } from "@clerk/nextjs";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { getDb } from "@/local/db";
import { generateCsvString, getDefaultCsvFilename } from "@/lib/csv";
import { runSync } from "@/sync/engine";
import { syncStatusStore } from "@/sync/status";
import { useActiveUser } from "@/hooks/useActiveUser";
import { ThemeControl } from "@/components/settings/ThemeControl";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Download, LogOut, RefreshCw, ChevronRight } from "lucide-react";

const APP_VERSION = "0.1.0";

export default function SettingsPage() {
  const { userId } = useActiveUser();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [storagePersisted, setStoragePersisted] = useState<boolean | null>(null);
  const [freshPendingCount, setFreshPendingCount] = useState<number>(0);

  const syncStatus = useSyncExternalStore(
    syncStatusStore.subscribe,
    syncStatusStore.getStatus,
    () => "Offline"
  );

  const db = userId ? getDb(userId) : null;

  const expenseCount = useLiveQuery(
    () => db ? db.expenses.filter(e => !e.deletedAt).count() : Promise.resolve(0),
    [db]
  );

  useEffect(() => {
    // TODO: Move storage persistence request to sign-in.
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(setStoragePersisted);
    } else {
      setStoragePersisted(null);
    }
  }, []);

  const handleExportCsv = async () => {
    if (!db) return;
    const expenses = await db.expenses.toArray();
    const categories = await db.categories.toArray();
    const liveExpenses = expenses.filter(e => !e.deletedAt);
    const csvString = generateCsvString(liveExpenses, categories);
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", getDefaultCsvFilename());
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSignOutClick = async () => {
    if (!db) return;
    setSignOutError(null);
    
    const currentCount = await db.outbox.count();
    
    if (currentCount > 0 && navigator.onLine && userId) {
      await runSync({ userId, getToken });
    }
    
    const freshCount = await db.outbox.count();
    setFreshPendingCount(freshCount);
    
    if (freshCount > 0) {
      setIsSignOutDialogOpen(true);
    } else {
      executeSignOut();
    }
  };

  const executeSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
      if (db) await db.delete();
      localStorage.removeItem("margin-last-user-id");
      window.location.assign("/sign-in");
    } catch (err) {
      console.error("Sign out failed", err);
      setSignOutError("Failed to sign out. Please try again.");
      setIsSigningOut(false);
      setIsSignOutDialogOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[800px] mx-auto w-full">
      <h1 className="font-heading text-2xl font-bold">Settings</h1>

      <div className="rounded-card border border-border bg-surface p-6 flex flex-col gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold">Appearance</h2>
          <p className="text-sm text-text-muted mt-1">
            Choose how Margin looks to you. "System" will match your device settings.
          </p>
        </div>
        <ThemeControl />
      </div>

      <div className="rounded-card border border-border bg-surface p-6 flex flex-col gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold">Recurring Expenses</h2>
          <p className="text-sm text-text-muted mt-1">
            Manage your automatic weekly and monthly expenses.
          </p>
        </div>
        <Link
          href="/recurring"
          className="flex w-fit items-center gap-2 rounded-control border border-border bg-surface-raised px-4 py-2 text-sm font-medium hover:bg-border/50 transition-colors"
        >
          <RefreshCw size={16} /> Manage Recurring Rules
        </Link>
      </div>

      <div className="rounded-card border border-border bg-surface p-6 flex flex-col gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold">Data</h2>
          <p className="text-sm text-text-muted mt-1">
            Export all your data to a CSV file. You currently have {expenseCount ?? 0} live {expenseCount === 1 ? "expense" : "expenses"}.
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={!expenseCount || expenseCount === 0}
          className="flex w-fit items-center gap-2 rounded-control border border-border bg-surface-raised px-4 py-2 text-sm font-medium hover:bg-border/50 transition-colors disabled:opacity-50"
        >
          <Download size={16} /> Export to CSV
        </button>
      </div>

      <div className="rounded-card border border-border bg-surface p-6 flex flex-col gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold">Account</h2>
          {user?.primaryEmailAddress && (
            <p className="text-sm text-text-muted mt-1">
              Signed in as <span className="font-medium text-text">{user.primaryEmailAddress.emailAddress}</span>
            </p>
          )}
          <p className="text-sm text-text-muted mt-1">
            Sync status: <span className="font-medium text-text">{syncStatus}</span>
          </p>
        </div>
        <button
          onClick={handleSignOutClick}
          disabled={isSigningOut}
          className="flex w-fit items-center gap-2 rounded-control border border-border bg-surface-raised px-4 py-2 text-sm font-medium hover:bg-border/50 transition-colors disabled:opacity-50"
        >
          <LogOut size={16} /> {isSigningOut ? "Signing out..." : "Sign Out"}
        </button>
        {signOutError && (
          <p className="text-sm text-danger">{signOutError}</p>
        )}
      </div>

      <div className="rounded-card border border-border bg-surface p-6 flex flex-col gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold">About</h2>
          <p className="text-sm text-text-muted mt-1">Currency: Naira (NGN), fixed.</p>
          <p className="text-sm text-text-muted mt-1">Version: {APP_VERSION}</p>
          <p className="text-sm text-text-muted mt-1">
            {storagePersisted === true && "Storage persistence granted."}
            {storagePersisted === false && "Storage persistence denied."}
            {storagePersisted === null && "Storage persistence not supported."}
          </p>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isSignOutDialogOpen}
        title="Unsynced changes"
        description={`${freshPendingCount} change${freshPendingCount === 1 ? " has" : "s have"} not synced. Signing out will delete them.`}
        confirmText="Sign out anyway"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={executeSignOut}
        onCancel={() => setIsSignOutDialogOpen(false)}
      />
    </div>
  );
}