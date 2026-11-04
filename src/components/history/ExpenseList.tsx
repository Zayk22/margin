"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "@clerk/nextjs";
import { getDb } from "@/local/db";
import { formatKobo } from "@/lib/money";
import { toLocalDateString } from "@/lib/dates";
import { Expense, Category } from "@/lib/types";
import { CategoryChip } from "@/components/shared/CategoryChip";

function formatDateGroup(dateStr: string) {
  const today = toLocalDateString(new Date());
  const yesterday = toLocalDateString(new Date(Date.now() - 86400000));
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  
  const [y, m, d] = dateStr.split("-");
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Number(y), Number(m) - 1, Number(d)));
}

export function ExpenseList({
  search,
  categoryFilter,
  monthFilter,
  onEdit,
}: {
  search: string;
  categoryFilter: string;
  monthFilter: string;
  onEdit: (expense: Expense) => void;
}) {
  const { userId } = useAuth();
  const db = userId ? getDb(userId) : null;

  const rawExpenses = useLiveQuery(
    () => db ? db.expenses.toArray() : Promise.resolve([] as Expense[]),
    [db]
  );

  const categories = useLiveQuery(
    () => db ? db.categories.toArray() : Promise.resolve([] as Category[]),
    [db]
  );

  if (!rawExpenses || !categories) {
    return <div className="p-4 text-center text-sm text-text-muted">Loading...</div>;
  }

  const catMap = categories.reduce((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {} as Record<string, Category>);

  const filtered = rawExpenses.filter((e) => {
    if (e.deletedAt) return false;
    if (monthFilter && !e.occurredOn.startsWith(monthFilter)) return false;
    if (categoryFilter && e.categoryId !== categoryFilter) return false;
    if (search && !e.note.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface p-8 text-center flex flex-col items-center gap-3">
        <p className="text-sm text-text-muted">No expenses found for this period.</p>
      </div>
    );
  }

  const grouped = filtered.reduce((acc, exp) => {
    if (!acc[exp.occurredOn]) acc[exp.occurredOn] = [];
    acc[exp.occurredOn].push(exp);
    return acc;
  }, {} as Record<string, Expense[]>);

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex flex-col gap-6">
      {sortedDates.map((date) => {
        const dayExpenses = grouped[date].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amountKobo, 0);
        
        return (
          <div key={date} className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-heading text-sm font-semibold">{formatDateGroup(date)}</h3>
              <span className="text-sm font-medium tabular-nums text-text-muted">
                {formatKobo(dayTotal)}
              </span>
            </div>
            
            <div className="overflow-hidden rounded-card border border-border bg-surface">
              {dayExpenses.map((expense, idx) => {
                const category = catMap[expense.categoryId] || { 
                  name: "Unknown", icon: "more-horizontal", colorToken: "cat-9" 
                };
                
                const title = expense.note || category.name;
                const subtitle = expense.note ? category.name : null;
                
                return (
                  <button
                    key={expense.id}
                    onClick={() => onEdit(expense)}
                    className={`flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-surface-raised ${
                      idx !== dayExpenses.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CategoryChip category={category} />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{title}</span>
                        {subtitle && (
                          <span className="text-xs text-text-muted">{subtitle}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-heading text-base font-semibold tabular-nums">
                        {formatKobo(expense.amountKobo)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}