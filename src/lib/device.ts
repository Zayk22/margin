let cachedId: string | null = null;

export function getDeviceId(): string {
  if (cachedId) return cachedId;

  try {
    const stored = localStorage.getItem("margin-device-id");
    if (stored) {
      cachedId = stored;
      return stored;
    }
  } catch (e) {
    // Ignore storage access errors
  }

  const newId = crypto.randomUUID();
  
  try {
    localStorage.setItem("margin-device-id", newId);
  } catch (e) {
    // Ignore storage access errors (will just remain in-memory)
  }

  cachedId = newId;
  return newId;
}

export function resetDeviceId(): void {
  cachedId = null;
  try {
    localStorage.removeItem("margin-device-id");
  } catch (e) {
    // Ignore
  }
}