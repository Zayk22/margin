"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { initializeSyncTriggers } from "@/sync/triggers";
import { getDb } from "@/local/db";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

function SyncInitializer() {
  const { userId, getToken, isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;

    localStorage.setItem("margin-last-user-id", userId);

    // Seed default categories if the database is empty
    const db = getDb(userId);
    db.categories.count().then(async (count) => {
      if (count === 0) {
        const now = new Date().toISOString();
        const seeded = DEFAULT_CATEGORIES.map((c) => ({
          ...c,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          deviceId: "browser",
        }));
        await db.categories.bulkAdd(seeded);
      }
    });

    const config = {
      userId,
      getToken: () => getToken(),
    };

    const cleanup = initializeSyncTriggers(config);
    return cleanup;
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