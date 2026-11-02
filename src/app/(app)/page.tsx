"use client";

import { useState, useEffect } from "react";
import { AddExpenseSheet } from "@/components/add-expense/AddExpenseSheet";
import { Plus } from "lucide-react";

export default function OverviewPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsSheetOpen(true);
    window.addEventListener("open-add-sheet", handleOpen);
    return () => window.removeEventListener("open-add-sheet", handleOpen);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold">Overview</h2>
        <button 
          onClick={() => setIsSheetOpen(true)}
          className="hidden md:flex items-center gap-2 rounded-control bg-primary px-4 py-2 text-sm font-medium text-primary-text hover:bg-primary-hover transition-colors"
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>
      
      <div className="flex flex-col items-center justify-center rounded-card border border-border bg-surface p-12 text-center">
        <p className="text-text-muted text-sm mb-4">No expenses yet. Add your first one.</p>
        <button 
          onClick={() => setIsSheetOpen(true)}
          className="flex items-center gap-2 rounded-control bg-primary px-4 py-2 text-sm font-medium text-primary-text md:hidden"
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>

      <AddExpenseSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
    </div>
  );
}