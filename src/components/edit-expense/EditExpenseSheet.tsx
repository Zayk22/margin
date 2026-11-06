"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { getDb } from "@/local/db";
import { saveExpense, deleteExpense } from "@/local/repositories";
import { parseKobo, formatKobo } from "@/lib/money";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import { getDeviceId } from "@/lib/device";
import { Expense } from "@/lib/types";
import { triggerDebouncedSync } from "@/sync/triggers";
import { X, Delete, Trash2 } from "lucide-react";
import { CategoryChip } from "@/components/shared/CategoryChip";

export function EditExpenseSheet({ 
  expense, 
  isOpen, 
  onClose,
  onDelete
}: { 
  expense: Expense | null; 
  isOpen: boolean; 
  onClose: () => void;
  onDelete: (expense: Expense) => void;
}) {
  const { userId, getToken } = useAuth();
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && expense) {
      setAmount(String(expense.amountKobo));
      setCategoryId(expense.categoryId);
      setNote(expense.note || "");
      setDate(expense.occurredOn);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, expense]);

  if (!isOpen || !expense) return null;

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
        ...expense,
        amountKobo,
        categoryId,
        note,
        occurredOn: date,
        updatedAt: now,
        deviceId: getDeviceId(),
      });

      triggerDebouncedSync({ userId, getToken });
      onClose();
    } catch (err) {
      console.error("Failed to update expense", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
      const db = getDb(userId);
      const tombstone = {
        ...expense,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deviceId: getDeviceId(),
      };
      await deleteExpense(db, tombstone);
      triggerDebouncedSync({ userId, getToken });
      onDelete(expense);
      onClose();
    } catch (err) {
      console.error("Failed to delete expense", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 md:items-center">
      <div className="flex w-full max-w-md flex-col rounded-t-card bg-surface p-4 shadow-xl md:rounded-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">Edit Expense</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-raised"><X size={20} /></button>
        </div>

        <div className="mb-4 text-center">
          <span className="font-heading text-4xl font-bold tabular-nums text-text">
            {amount ? formatKobo(parseKobo(amount)) : "₦0.00"}
          </span>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
            className="absolute opacity-0 pointer-events-none"
            aria-label="Amount"
          />
        </div>

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
              <CategoryChip category={cat} size="sm" />
              {cat.name}
            </button>
          ))}
        </div>

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
          <button
            onClick={handleDelete}
            disabled={isSaving}
            className="flex h-12 w-12 items-center justify-center rounded-control bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
            aria-label="Delete expense"
          >
            <Trash2 size={20} />
          </button>
          <button
            onClick={handleSave}
            disabled={!amount || isSaving}
            className="flex-1 rounded-control bg-primary py-3 text-center font-medium text-primary-text disabled:opacity-50 transition-opacity"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}