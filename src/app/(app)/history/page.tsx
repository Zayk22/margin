"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { getDb } from "@/local/db";
import { undoDeleteExpense } from "@/local/repositories";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import { toLocalMonthString } from "@/lib/dates";
import { Expense } from "@/lib/types";
import { ExpenseList } from "@/components/history/ExpenseList";
import { UndoToast } from "@/components/shared/UndoToast";
import { AddExpenseSheet } from "@/components/add-expense/AddExpenseSheet";
import { EditExpenseSheet } from "@/components/edit-expense/EditExpenseSheet";
import { MonthSwitcher } from "@/components/shared/MonthSwitcher";
import { triggerDebouncedSync } from "@/sync/triggers";
import { Search, Plus, ChevronDown, X } from "lucide-react";

export default function HistoryPage() {
  const { userId, getToken } = useAuth();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState(toLocalMonthString(new Date()));
  
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  const [deletedExpense, setDeletedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsAddSheetOpen(true);
    window.addEventListener("open-add-sheet", handleOpen);
    return () => window.removeEventListener("open-add-sheet", handleOpen);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const hasActiveFilters = search !== "" || categoryFilter !== "";

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("");
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1100px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold">History</h1>
        <div className="flex items-center justify-between w-full md:w-auto">
          <MonthSwitcher currentMonth={monthFilter} onChange={setMonthFilter} />
          <button
            onClick={() => setIsAddSheetOpen(true)}
            className="hidden md:flex items-center gap-2 rounded-control bg-primary px-4 py-2 text-sm font-medium text-primary-text hover:bg-primary-hover transition-colors ml-4"
          >
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-control border border-border bg-surface py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none h-11"
          />
        </div>

        <div className="relative w-full md:w-48" ref={categoryRef}>
          <button
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            className="flex w-full items-center justify-between rounded-control border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none h-11"
          >
            <span className="truncate">
              {categoryFilter ? DEFAULT_CATEGORIES.find((c) => c.id === categoryFilter)?.name : "All categories"}
            </span>
            <ChevronDown size={16} className={`text-text-muted transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
          </button>
          
          {isCategoryOpen && (
            <div className="absolute z-10 mt-1 w-full rounded-control border border-border bg-surface py-1 shadow-lg">
              <button
                onClick={() => { setCategoryFilter(""); setIsCategoryOpen(false); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-surface-raised"
              >
                All categories
              </button>
              {DEFAULT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setCategoryFilter(cat.id); setIsCategoryOpen(false); }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-surface-raised"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-text-muted hover:text-text px-2 h-11"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      <ExpenseList 
        search={search} 
        categoryFilter={categoryFilter} 
        monthFilter={monthFilter}
        onEdit={setEditingExpense} 
      />

      <UndoToast
        isOpen={!!deletedExpense}
        message="Expense deleted."
        onUndo={handleUndo}
        onClose={() => setDeletedExpense(null)}
      />

      <AddExpenseSheet isOpen={isAddSheetOpen} onClose={() => setIsAddSheetOpen(false)} />
      
      <EditExpenseSheet
        expense={editingExpense}
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        onDelete={handleDelete}
      />
    </div>
  );
}