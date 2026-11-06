"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { initializeSyncTriggers, triggerDebouncedSync } from "@/sync/triggers";
import { getDb } from "@/local/db";
import { seedDefaultCategories } from "@/local/seed";
import { getDeviceId } from "@/lib/device";
import { runRecurringGeneration } from "@/local/recurring-engine";
import { toLocalDateString } from "@/lib/dates";
import { syncStatusStore } from "@/sync/status";

function SyncInitializer() {
  const { userId, getToken, isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    // If not signed in, use the "guest" database
    const activeUserId = isSignedIn && userId ? userId : "guest";
    const db = getDb(activeUserId);
    const deviceId = getDeviceId();

    const initialize = async () => {
      try {
        await seedDefaultCategories(db, deviceId);
        await runRecurringGeneration(
          db, 
          deviceId, 
          toLocalDateString(new Date()), 
          new Date().toISOString()
        );
        if (isSignedIn) {
          triggerDebouncedSync({ userId: activeUserId, getToken });
        }
      } catch (err) {
        console.error("Initialization failed", err);
      }
    };

    initialize();

    if (isSignedIn && userId) {
      localStorage.setItem("margin-last-user-id", userId);
      const config = {
        userId,
        getToken: () => getToken(),
      };
      const cleanup = initializeSyncTriggers(config);
      return cleanup;
    } else {
      // If guest, do not start the sync engine. Just set the status.
      syncStatusStore.setStatus("Sign in to sync");
    }
  }, [userId, getToken, isSignedIn, isLoaded]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <SyncInitializer />
      {children}
    </ClerkProvider>
  );
}