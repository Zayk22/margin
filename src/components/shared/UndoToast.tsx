"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function UndoToast({
  isOpen,
  message,
  onUndo,
  onClose,
}: {
  isOpen: boolean;
  message: string;
  onUndo: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 left-1/2 z-[70] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center justify-between rounded-card border border-border bg-surface-raised px-4 py-3 shadow-lg md:bottom-8"
    >
      <span className="text-sm text-text">{message}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={onUndo}
          className="text-sm font-medium text-success-strong hover:underline"
        >
          Undo
        </button>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-text-muted hover:bg-surface"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}