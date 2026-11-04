import { useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";

export type ActiveUser = {
  userId: string | null;
  mode: "loading" | "authenticated" | "stored" | "unauthenticated";
};

export function useActiveUser(): ActiveUser {
  const { isLoaded, userId } = useAuth();
  const [storedId, setStoredId] = useState<string | null>(null);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const localId = localStorage.getItem("margin-last-user-id");
      setStoredId(localId);
      setHasCheckedStorage(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && userId) {
      localStorage.setItem("margin-last-user-id", userId);
      setStoredId(userId);
    }
  }, [isLoaded, userId]);

  if (!isLoaded || !hasCheckedStorage) {
    return { userId: storedId, mode: "loading" };
  }

  if (userId) {
    return { userId, mode: "authenticated" };
  }

  if (storedId) {
    return { userId: storedId, mode: "stored" };
  }

  return { userId: null, mode: "unauthenticated" };
}