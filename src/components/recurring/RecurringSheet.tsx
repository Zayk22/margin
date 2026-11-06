"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { getDb } from "@/local/db";
import { saveRecurringRule } from "@/local/repositories";
import { parseKobo, formatKobo } from "@/lib/money";
import { toLocalDateString } from "@/lib/dates";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import { getDeviceId } from "@/lib/device";
import { RecurringRule } from "@/lib/types";
import { triggerDebouncedSync } from "@/sync/triggers";
import { X, Delete, Trash2, Check } from "lucide-react";
import { CategoryChip } from "@/components/shared/CategoryChip";

export function RecurringSheet({
  isOpen,
  onClose,
  existingRule,
}: {
  isOpen: boolean;
  onClose: () => void;
  existingRule: RecurringRule | null;
}) {
  const { userId, getToken } = useAuth();
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(DEFAULT_CATEGORIES[0].id);
  const [note, setNote] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("monthly");
  const [startOn, setStartOn] = useState(toLocalDateString(new Date()));
  const [endOn, setEndOn] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = "recurring-sheet-title";

  useEffect(() => {
    if (isOpen) {
      if (existingRule) {
        setAmount(String(existingRule.amountKobo));
        setCategoryId(existingRule.categoryId);
        setNote(existingRule.note || "");
        setFrequency(existingRule.frequency);
        setStartOn(existingRule.startOn);
        setEndOn(existingRule.endOn || "");
      } else {
        setAmount("");
        setCategoryId(DEFAULT_CATEGORIES[0].id);
        setNote("");
        setFrequency("monthly");
        setStartOn(toLocalDateString(new Date()));
        setEndOn("");
      }
    }
  }, [isOpen, existingRule]);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    
    const getFocusable = () => {
      if (!dialogRef.current) return [];
      return Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"]), input'
        )
      );
    };
    
    const focusable = getFocusable();
    if (focusable.length > 0) focusable[0].focus();

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
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused) previouslyFocused.focus();
    };
  }, [isOpen, onClose]);

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

      const rule: RecurringRule = {
        id: existingRule ? existingRule.id : crypto.randomUUID(),
        categoryId,
        amountKobo: parseKobo(amount),
        note,
        frequency,
        startOn,
        endOn: endOn || null,
        lastGeneratedOn: existingRule ? existingRule.lastGeneratedOn : null,
        createdAt: existingRule ? existingRule.createdAt : now,
        updatedAt: now,
        deletedAt: null,
        deviceId: getDeviceId(),
      };

      await saveRecurringRule(db, rule);
      triggerDebouncedSync({ userId, getToken });
      onClose();
    } catch (err) {
      console.error("Failed to save rule", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userId || !existingRule) return;
    setIsSaving(true);
    try {
      const db = getDb(userId);
      const now = new Date().toISOString();
      const tombstone: RecurringRule = {
        ...existingRule,
        deletedAt: now,
        updatedAt: now,
        deviceId: getDeviceId(),
      };
      await saveRecurringRule(db, tombstone);
      triggerDebouncedSync({ userId, getToken });
      onClose();
    } catch (err) {
      console.error("Failed to delete rule", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 md:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full max-w-md flex-col rounded-t-card bg-surface shadow-xl md:rounded-card max-h-[calc(100dvh-2rem)]"
      >
        {/* Fixed Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-border p-4">
          <h2 id={titleId} className="font-heading text-lg font-bold">
            {existingRule ? "Edit Recurring Expense" : "Add Recurring Expense"}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-raised" aria-label="Close"><X size={20} /></button>
        </div>

        {/* Fixed Amount Display */}
        <div className="shrink-0 p-4 text-center">
          <span className="font-heading text-4xl font-bold tabular-nums text-text">
            {amount ? formatKobo(parseKobo(amount)) : "₦0.00"}
          </span>
        </div>

        {/* Scrolling Middle Section */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Category Grid */}
          <div role="radiogroup" className="grid grid-cols-3 gap-2">
            {DEFAULT_CATEGORIES.map((cat) => {
              const isSelected = categoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  role="radio"
                  aria-checked={isSelected}
                  className={`relative flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-control border p-1 transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/10 text-text"
                      : "border-border bg-surface text-text-muted hover:bg-surface-raised"
                  }`}
                >
                  <CategoryChip category={cat} size="sm" />
                  <span className="text-[13px] leading-tight text-center">{cat.name}</span>
                  {isSelected && (
                    <span className="absolute top-1 right-1 bg-primary text-primary-text rounded-full p-0.5">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-sm text-text-muted mb-1 block">Frequency</label>
              <div role="radiogroup" className="flex gap-2">
                <button
                  role="radio"
                  aria-checked={frequency === "weekly"}
                  onClick={() => setFrequency("weekly")}
                  className={`flex-1 rounded-control border py-2 text-sm transition-colors ${frequency === "weekly" ? "border-primary bg-primary/10 text-text font-medium" : "border-border text-text-muted hover:bg-surface-raised"}`}
                >
                  Weekly
                </button>
                <button
                  role="radio"
                  aria-checked={frequency === "monthly"}
                  onClick={() => setFrequency("monthly")}
                  className={`flex-1 rounded-control border py-2 text-sm transition-colors ${frequency === "monthly" ? "border-primary bg-primary/10 text-text font-medium" : "border-border text-text-muted hover:bg-surface-raised"}`}
                >
                  Monthly
                </button>
              </div>
            </div>

            <input
              type="text"
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-control border border-border bg-surface-raised px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            
            <div className="flex flex-col gap-3">
              <div>
                <label htmlFor="start-date" className="text-sm font-medium mb-1 block">Start Date</label>
                <input
                  id="start-date"
                  type="date"
                  value={startOn}
                  onChange={(e) => setStartOn(e.target.value)}
                  className="w-full rounded-control border border-border bg-surface-raised px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <p className="text-xs text-text-muted mt-1">Day, month, year follows your device.</p>
              </div>
              <div>
                <label htmlFor="end-date" className="text-sm font-medium mb-1 block">End Date (optional)</label>
                <input
                  id="end-date"
                  type="date"
                  value={endOn}
                  onChange={(e) => setEndOn(e.target.value)}
                  className="w-full rounded-control border border-border bg-surface-raised px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <p className="text-xs text-text-muted mt-1">Day, month, year follows your device.</p>
                {/* Note: A custom dd/mm/yyyy control is a later task. */}
              </div>
            </div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, "00", 0, "backspace"].map((key) => (
              <button
                key={key}
                onClick={() => handleKeypadPress(String(key))}
                className="flex h-[44px] items-center justify-center rounded-control bg-surface-raised text-lg font-medium hover:bg-border/50 active:bg-border transition-colors"
              >
                {key === "backspace" ? <Delete size={18} /> : key}
              </button>
            ))}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 p-4 border-t border-border flex gap-2 bg-surface rounded-b-card md:rounded-b-card">
          {existingRule && (
            <button
              onClick={handleDelete}
              disabled={isSaving}
              className="flex h-12 w-12 items-center justify-center rounded-control bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
              aria-label="Delete rule"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!amount || isSaving}
            className="flex-1 rounded-control bg-primary py-3 text-center font-medium text-primary-text transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}