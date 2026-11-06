"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/local/db";
import { saveBudget } from "@/local/repositories";
import { toLocalMonthString, getPreviousMonth } from "@/lib/dates";
import { formatKobo } from "@/lib/money";
import { getBudgetState, createCopiedBudgets } from "@/lib/budget";
import { Budget, Expense, Category } from "@/lib/types";
import { MonthSwitcher } from "@/components/shared/MonthSwitcher";
import { CategoryChip } from "@/components/shared/CategoryChip";
import { BudgetSheet } from "@/components/budgets/BudgetSheet";
import { triggerDebouncedSync } from "@/sync/triggers";
import { Copy, ChevronRight } from "lucide-react";

export default function BudgetsPage() {
  const { userId, getToken } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(toLocalMonthString(new Date()));
  const [sheetConfig, setSheetConfig] = useState<{ categoryId: string; existingBudget: Budget | null } | null>(null);

  const db = userId ? getDb(userId) : null;

  const budgets = useLiveQuery(() => db ? db.budgets.toArray() : Promise.resolve([] as Budget[]), [db]);
  const expenses = useLiveQuery(() => db ? db.expenses.toArray() : Promise.resolve([] as Expense[]), [db]);
  const categories = useLiveQuery(() => db ? db.categories.toArray() : Promise.resolve([] as Category[]), [db]);

  if (!budgets || !expenses || !categories) return <div className="p-4 text-center text-sm text-text-muted">Loading...</div>;

  const currentBudgets = budgets.filter(b => !b.deletedAt && b.month === currentMonth);
  
  const spentByCategory = expenses
    .filter(e => !e.deletedAt && e.occurredOn.startsWith(currentMonth))
    .reduce((acc, e) => {
      acc[e.categoryId] = (acc[e.categoryId] || 0) + e.amountKobo;
      return acc;
    }, {} as Record<string, number>);

  const totalBudgeted = currentBudgets.reduce((sum, b) => sum + b.amountKobo, 0);
  const totalSpent = currentBudgets.reduce((sum, b) => sum + (spentByCategory[b.categoryId] || 0), 0);
  const remaining = totalBudgeted - totalSpent;
  const isOver = remaining < 0;

  const prevMonth = getPreviousMonth(currentMonth);
  const prevBudgets = budgets.filter(b => !b.deletedAt && b.month === prevMonth);
  const canCopy = currentBudgets.length === 0 && prevBudgets.length > 0;

  const handleCopy = async () => {
    if (!userId) return;
    const copied = createCopiedBudgets(prevBudgets, currentMonth, currentBudgets, "browser");
    for (const b of copied) {
      await saveBudget(db!, b);
    }
    triggerDebouncedSync({ userId, getToken });
  };

  const categoryMap = categories.reduce((acc, c) => { acc[c.id] = c; return acc; }, {} as Record<string, Category>);
  
  const categoriesWithoutBudgets = categories.filter(c => !currentBudgets.some(b => b.categoryId === c.id));

  return (
    <div className="flex flex-col gap-6 max-w-[1100px] mx-auto w-full">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Budgets</h1>
        <MonthSwitcher currentMonth={currentMonth} onChange={setCurrentMonth} />
      </div>

      {currentBudgets.length > 0 ? (
        <div className="rounded-card border border-border bg-surface p-6 flex flex-col gap-4">
          {/* Mobile Layout */}
          <div className="flex flex-col md:hidden">
            <p className="text-sm text-text-muted">Remaining</p>
            <div className="flex items-baseline gap-2">
              <p className={`font-heading text-4xl font-bold tabular-nums ${isOver ? "text-danger" : "text-success-strong"}`}>
                {formatKobo(remaining)}
              </p>
              {isOver && <span className="text-sm font-medium text-danger">over</span>}
            </div>
            <div className="flex justify-between mt-4">
              <div>
                <p className="text-xs text-text-muted">Total Budgeted</p>
                <p className="font-medium tabular-nums">{formatKobo(totalBudgeted)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Total Spent</p>
                <p className="font-medium tabular-nums">{formatKobo(totalSpent)}</p>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-text-muted">Total Budgeted</p>
              <p className="font-heading text-xl font-bold tabular-nums">{formatKobo(totalBudgeted)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Total Spent</p>
              <p className="font-heading text-xl font-bold tabular-nums">{formatKobo(totalSpent)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Remaining</p>
              <p className={`font-heading text-xl font-bold tabular-nums flex items-baseline gap-1 ${isOver ? "text-danger" : "text-success-strong"}`}>
                {formatKobo(remaining)}
                {isOver && <span className="text-sm font-medium">over</span>}
              </p>
            </div>
          </div>
        </div>
      ) : canCopy ? (
        <div className="rounded-card border border-border bg-surface p-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-text-muted">No budgets for this month.</p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-control bg-primary px-4 py-2 text-sm font-medium text-primary-text"
          >
            <Copy size={16} /> Copy last month's budgets
          </button>
        </div>
      ) : null}

      {currentBudgets.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="font-heading text-lg font-bold">Active Budgets</h2>
          <div className="flex flex-col gap-3">
            {currentBudgets.map(b => {
              const category = categoryMap[b.categoryId];
              if (!category) return null;
              const spent = spentByCategory[b.categoryId] || 0;
              const state = getBudgetState(spent, b.amountKobo);
              const percent = Math.min((spent / b.amountKobo) * 100, 100);
              
              let barColor = "bg-success";
              let textLabel = "Under budget";
              let textColor = "text-success-strong";
              
              if (state === "near") {
                barColor = "bg-warn";
                textColor = "text-warn-strong";
                textLabel = "Near limit";
              } else if (state === "over") {
                barColor = "bg-danger";
                textColor = "text-danger";
                textLabel = `Over by ${formatKobo(spent - b.amountKobo)}`;
              }

              return (
                <button
                  key={b.id}
                  onClick={() => setSheetConfig({ categoryId: b.categoryId, existingBudget: b })}
                  className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4 text-left hover:bg-surface-raised transition-colors w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <CategoryChip category={category} size="sm" />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <span className="text-sm font-medium tabular-nums text-text-muted">
                      {formatKobo(spent)} of {formatKobo(b.amountKobo)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-pill bg-surface-raised border border-border" role="progressbar" aria-valuenow={spent} aria-valuemin={0} aria-valuemax={b.amountKobo}>
                    <div className={`h-full rounded-pill ${barColor}`} style={{ width: `${percent}%` }} />
                  </div>
                  <div className="flex justify-between text-[12px] mt-1 w-full">
                    <span className={`font-medium ${textColor}`}>{textLabel}</span>
                    <span className="text-text-muted">{Math.round((spent / b.amountKobo) * 100)}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(categoriesWithoutBudgets.length > 0 || currentBudgets.length === 0) && (
        <div className="flex flex-col gap-4">
          {currentBudgets.length > 0 ? (
            <h2 className="font-heading text-lg font-bold">Without a budget</h2>
          ) : (
            <p className="text-sm text-text-muted">No budgets for this month. Set one for a category you want to watch.</p>
          )}
          <div className="flex flex-col gap-2">
            {categoriesWithoutBudgets.map(c => {
              const spent = spentByCategory[c.id] || 0;
              return (
                <button
                  key={c.id}
                  onClick={() => setSheetConfig({ categoryId: c.id, existingBudget: null })}
                  className="flex min-h-[44px] items-center justify-between rounded-card border border-border bg-surface p-4 hover:bg-surface-raised transition-colors w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  <div className="flex items-center gap-3">
                    <CategoryChip category={c} size="sm" />
                    <div className="flex flex-col">
                      <span className="font-medium">{c.name}</span>
                      {spent > 0 && (
                        <span className="text-xs text-text-muted">{formatKobo(spent)} spent this month</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-text-muted" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {sheetConfig && (
        <BudgetSheet
          isOpen={true}
          onClose={() => setSheetConfig(null)}
          categoryId={sheetConfig.categoryId}
          categoryName={categoryMap[sheetConfig.categoryId]?.name || ""}
          month={currentMonth}
          existingBudget={sheetConfig.existingBudget}
        />
      )}
    </div>
  );
}