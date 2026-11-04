"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/local/db";
import { toLocalMonthString } from "@/lib/dates";
import { formatKoboParts } from "@/lib/money";
import { calculateOverview } from "@/lib/overview";
import { Expense, Category } from "@/lib/types";
import { SpendingChart } from "@/components/overview/SpendingChart";
import { useActiveUser } from "@/hooks/useActiveUser";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Plus } from "lucide-react";

export default function OverviewPage() {
  const { userId } = useActiveUser();
  const [currentMonth, setCurrentMonth] = useState(toLocalMonthString(new Date()));

  const db = userId ? getDb(userId) : null;

  const expenses = useLiveQuery(
    () => db ? db.expenses.toArray() : Promise.resolve([] as Expense[]),
    [db]
  );
  const categories = useLiveQuery(
    () => db ? db.categories.toArray() : Promise.resolve([] as Category[]),
    [db]
  );

  if (!expenses || !categories || categories.length === 0) {
    return <div className="p-4 text-center text-sm text-text-muted">Loading...</div>;
  }

  const data = calculateOverview(expenses, categories, currentMonth);
  const { whole, decimal } = formatKoboParts(data.totalKobo);

  const [y, m] = currentMonth.split("-").map(Number);
  const monthLabel = new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
  
  const now = new Date();
  const isCurrentMonth = y === now.getFullYear() && m === now.getMonth() + 1;

  const handlePrevMonth = () => {
    const d = new Date(y, m - 2, 1);
    setCurrentMonth(toLocalMonthString(d));
  };

  const handleNextMonth = () => {
    const d = new Date(y, m, 1);
    setCurrentMonth(toLocalMonthString(d));
  };

  const isPositiveChange = data.percentageChange !== null && data.percentageChange > 0;
  const prevMonthLabel = new Intl.DateTimeFormat("en-NG", { month: "long" }).format(new Date(y, m - 2, 1));

  return (
    <div className="flex flex-col gap-6 max-w-[1100px] mx-auto w-full">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Overview</h1>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-add-sheet"))}
          className="hidden md:flex items-center gap-2 rounded-control bg-primary px-4 py-2 text-sm font-medium text-primary-text hover:bg-primary-hover transition-colors"
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-text-muted">Total Spent</span>
              <div className="flex items-center gap-1">
                <button onClick={handlePrevMonth} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-raised" aria-label="Previous month">
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-medium tabular-nums min-w-[100px] text-center">{monthLabel}</span>
                <button 
                  onClick={handleNextMonth} 
                  disabled={isCurrentMonth}
                  className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-raised disabled:opacity-30 disabled:hover:bg-transparent" 
                  aria-label="Next month"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
            <div className="font-heading font-bold tabular-nums tracking-tight flex items-baseline gap-1 text-[clamp(2.5rem,8vw,4rem)]" aria-label={`Total spent: ${whole}${decimal}`}>
              <span>{whole}</span>
              <span className="text-[0.6em] text-text-muted">{decimal}</span>
            </div>
            
            <div className="mt-4 flex items-center gap-1.5 text-sm text-text-muted">
              {data.percentageChange !== null ? (
                <>
                  {isPositiveChange ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span>
                    {Math.abs(Math.round(data.percentageChange))}% {isPositiveChange ? "more" : "less"} than {prevMonthLabel}
                  </span>
                </>
              ) : (
                <span>No spending in {prevMonthLabel}</span>
              )}
            </div>
          </div>

          {data.topCategory && (
            <div className="rounded-card border border-border bg-surface p-6 flex flex-col gap-1">
              <span className="text-sm text-text-muted">Top Category</span>
              <span className="font-heading text-xl font-bold">{data.topCategory.name}</span>
              <span className="text-sm font-medium tabular-nums text-text-muted">
                {formatKoboParts(data.topCategory.amountKobo).whole}{formatKoboParts(data.topCategory.amountKobo).decimal}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-card border border-border bg-surface p-6">
          <h2 className="font-heading text-lg font-bold mb-4">Spending by Category</h2>
          <SpendingChart data={data.categoryBreakdown} />
        </div>
      </div>
    </div>
  );
}