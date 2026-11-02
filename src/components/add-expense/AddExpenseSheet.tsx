"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { getDb } from "@/local/db";
import { saveExpense } from "@/local/repositories";
import { parseKobo, formatKobo } from "@/lib/money";
import { toLocalDateString } from "@/lib/dates";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import { triggerDebouncedSync } from "@/sync/triggers";
import { X, Delete } from "lucide-react";

export function AddExpenseSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { userId, getToken } = useAuth();
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(DEFAULT_CATEGORIES[0].id);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(toLocalDateString(new Date()));
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setNote("");
      setDate(toLocalDateString(new Date()));
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeypadPress = (val: string) => {
    if (val === "backspace") {
      setAmount((prev) => prev.slice(0, -1));
    } else if (val === "00") {
      if (amount.length < 10) setAmount((prev) => prev + "00");
    } else {
      if (amount.length < 10) setAmount((prev) => prev + val);
    }
  };

  const handleSave = async () => {
    if (!userId || !amount) return;
    setIsSaving(true);

    try {
      const db = getDb(userId);
      const amountKobo = parseKobo(amount);
      const now = new Date().toISOString();

      await saveExpense(db, {
        id: crypto.randomUUID(),
        amountKobo,
        categoryId,
        note,
        occurredOn: date,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deviceId: "browser",
      });

      if (getToken) {
        triggerDebouncedSync({ userId, getToken });
      }

      onClose();
    } catch (err) {
      console.error("Failed to save expense", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 md:items-center">
      <div className="flex w-full max-w-md flex-col rounded-t-card bg-surface p-4 shadow-xl md:rounded-card">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">Add Expense</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-raised"><X size={20} /></button>
        </div>

        {/* Amount Display */}
        <div className="mb-4 text-center">
          <span className="font-heading text-4xl font-bold tabular-nums text-text">
            {amount ? formatKobo(parseKobo(amount)) : "₦0.00"}
          </span>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              setAmount(val);
            }}
            className="absolute opacity-0 pointer-events-none"
            aria-label="Amount"
          />
        </div>

        {/* Category Chips */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {DEFAULT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryId(cat.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-pill border px-3 py-1.5 text-xs transition-colors ${
                categoryId === cat.id
                  ? "border-primary bg-primary/10 text-text font-medium"
                  : "border-border bg-surface text-text-muted"
              }`}
            >
              <span className={`h-2 w-2 rounded-full bg-success`} />
              {cat.name}
            </button>
          ))}
        </div>

        {/* Details */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="flex-1 rounded-control border border-border bg-surface-raised px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-control border border-border bg-surface-raised px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        {/* Keypad */}
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

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!amount || isSaving}
          className="w-full rounded-control bg-primary py-3 text-center font-medium text-primary-text disabled:opacity-50 transition-opacity"
        >
          {isSaving ? "Saving..." : "Save Expense"}
        </button>
      </div>
    </div>
  );
}