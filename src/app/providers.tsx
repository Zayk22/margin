"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { initializeSyncTriggers } from "@/sync/triggers";
import { getDb } from "@/local/db";
import { seedDefaultCategories } from "@/local/seed";
import { getDeviceId } from "@/lib/device";

function SyncInitializer() {
  const { userId, getToken, isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;

    localStorage.setItem("margin-last-user-id", userId);

    const db = getDb(userId);
    seedDefaultCategories(db, getDeviceId());

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