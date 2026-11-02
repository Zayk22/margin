"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { getDb } from "@/local/db";
import { undoDeleteExpense } from "@/local/repositories";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import { Expense } from "@/lib/types";
import { ExpenseList } from "@/components/history/ExpenseList";
import { UndoToast } from "@/components/shared/UndoToast";
import { AddExpenseSheet } from "@/components/add-expense/AddExpenseSheet";
import { triggerDebouncedSync } from "@/sync/triggers";
import { Search, Plus } from "lucide-react";

export default function HistoryPage() {
  const { userId, getToken } = useAuth();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [deletedExpense, setDeletedExpense] = useState<Expense | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsSheetOpen(true);
    window.addEventListener("open-add-sheet", handleOpen);
    return () => window.removeEventListener("open-add-sheet", handleOpen);
  }, []);

  const handleDelete = (expense: Expense) => {
    setDeletedExpense(expense);
    if (userId) {
      triggerDebouncedSync({ userId, getToken });
    }
  };

  const handleUndo = async () => {
    if (!deletedExpense || !userId) return;
    const db = getDb(userId);
    await undoDeleteExpense(db, deletedExpense);
    setDeletedExpense(null);
    triggerDebouncedSync({ userId, getToken });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold">History</h2>
        <button
          onClick={() => setIsSheetOpen(true)}
          className="hidden md:flex items-center gap-2 rounded-control bg-primary px-4 py-2 text-sm font-medium text-primary-text hover:bg-primary-hover transition-colors"
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-control border border-border bg-surface py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-control border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none md:w-48"
        >
          <option value="">All categories</option>
          {DEFAULT_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <ExpenseList search={search} categoryFilter={categoryFilter} onDelete={handleDelete} />

      <UndoToast
        isOpen={!!deletedExpense}
        message="Expense deleted."
        onUndo={handleUndo}
        onClose={() => setDeletedExpense(null)}
      />

      <AddExpenseSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
    </div>
  );
}