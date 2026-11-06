"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { getDb } from "@/local/db";
import { saveBudget } from "@/local/repositories";
import { parseKobo, formatKobo } from "@/lib/money";
import { Budget } from "@/lib/types";
import { getDeviceId } from "@/lib/device";
import { triggerDebouncedSync } from "@/sync/triggers";
import { X, Delete, Trash2 } from "lucide-react";

export function BudgetSheet({ 
  isOpen, onClose, categoryId, categoryName, month, existingBudget 
}: { 
  isOpen: boolean; onClose: () => void; categoryId: string; categoryName: string; month: string; existingBudget: Budget | null; 
}) {
  const { userId, getToken } = useAuth();
  const [amount, setAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = "budget-sheet-title";

  useEffect(() => {
    if (isOpen) {
      setAmount(existingBudget ? String(existingBudget.amountKobo) : "");
    }
  }, [isOpen, existingBudget]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = () => {
      if (!dialogRef.current) return [];
      return Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
    };

    const focusable = getFocusable();
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const items = getFocusable();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }

      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (isInput) return;

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        setAmount((prev) => (prev.length < 10 ? prev + e.key : prev));
      } else if (e.key === "Backspace") {
        e.preventDefault();
        setAmount((prev) => prev.slice(0, -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (amount) {
          const btn = dialogRef.current?.querySelector<HTMLButtonElement>('[data-save-button="true"]');
          btn?.click();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [isOpen, onClose, amount]);

  if (!isOpen) return null;

  const handleKeypadPress = (val: string) => {
    if (val === "backspace") setAmount((prev) => prev.slice(0, -1));
    else if (val === "00") { if (amount.length < 10) setAmount((prev) => prev + "00"); }
    else { if (amount.length < 10) setAmount((prev) => prev + val); }
  };

  const handleSave = async () => {
    if (!userId || !amount) return;
    setIsSaving(true);
    try {
      const db = getDb(userId);
      const now = new Date().toISOString();
      
      const budget: Budget = {
        id: existingBudget ? existingBudget.id : crypto.randomUUID(),
        categoryId,
        month,
        amountKobo: parseKobo(amount),
        createdAt: existingBudget ? existingBudget.createdAt : now,
        updatedAt: now,
        deletedAt: null,
        deviceId: getDeviceId(),
      };
      
      await saveBudget(db, budget);
      triggerDebouncedSync({ userId, getToken });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userId || !existingBudget) return;
    setIsSaving(true);
    try {
      const db = getDb(userId);
      const now = new Date().toISOString();
      const tombstone: Budget = {
        ...existingBudget,
        deletedAt: now,
        updatedAt: now,
        deviceId: getDeviceId(),
      };
      
      await saveBudget(db, tombstone);
      triggerDebouncedSync({ userId, getToken });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const saveDisabled = !amount || isSaving;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 md:items-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="flex w-full max-w-md flex-col rounded-t-card bg-surface p-4 shadow-xl md:rounded-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="font-heading text-lg font-bold truncate pr-4">
            {existingBudget ? "Edit Budget" : "Set Budget"}: {categoryName}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-raised" aria-label="Close"><X size={20} /></button>
        </div>

        <div className="mb-4 text-center">
          <span className="font-heading text-4xl font-bold tabular-nums text-text">
            {amount ? formatKobo(parseKobo(amount)) : "₦0.00"}
          </span>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, "00", 0, "backspace"].map((key) => (
            <button
              key={key}
              onClick={() => handleKeypadPress(String(key))}
              className="flex h-12 items-center justify-center rounded-control bg-surface-raised text-xl font-medium hover:bg-border/50 active:bg-border transition-colors"
            >
              {key === "backspace" ? <Delete size={20} /> : key}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {existingBudget && (
            <button
              onClick={handleDelete}
              disabled={isSaving}
              className="flex h-12 w-12 items-center justify-center rounded-control bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
              aria-label="Remove budget"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saveDisabled}
            data-save-button="true"
            className="flex-1 rounded-control bg-primary py-3 text-center font-medium text-primary-text transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save Budget"}
          </button>
        </div>
      </div>
    </div>
  );
}