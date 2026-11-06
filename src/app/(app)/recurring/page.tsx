"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/local/db";
import { useActiveUser } from "@/hooks/useActiveUser";
import { formatKobo } from "@/lib/money";
import { toLocalDateString, formatNextDate } from "@/lib/dates";
import { RecurringRule, Category } from "@/lib/types";
import { CategoryChip } from "@/components/shared/CategoryChip";
import { RecurringSheet } from "@/components/recurring/RecurringSheet";
import { Plus, ChevronRight } from "lucide-react";

function getNextDate(rule: RecurringRule): string {
  if (!rule.lastGeneratedOn) return rule.startOn;
  
  const [y, m, d] = rule.lastGeneratedOn.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  
  if (rule.frequency === "weekly") {
    date.setDate(date.getDate() + 7);
  } else {
    const originalDay = date.getDate();
    date.setMonth(date.getMonth() + 1);
    if (date.getDate() !== originalDay) date.setDate(0);
  }
  return toLocalDateString(date);
}

export default function RecurringPage() {
  const { userId } = useActiveUser();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);

  const db = userId ? getDb(userId) : null;

  const rules = useLiveQuery(
    () => db ? db.recurringRules.filter(r => !r.deletedAt).toArray() : Promise.resolve([] as RecurringRule[]),
    [db]
  );
  const categories = useLiveQuery(
    () => db ? db.categories.toArray() : Promise.resolve([] as Category[]),
    [db]
  );

  if (!rules || !categories) return <div className="p-4 text-center text-sm text-text-muted">Loading...</div>;

  const catMap = categories.reduce((acc, c) => { acc[c.id] = c; return acc; }, {} as Record<string, Category>);
  const today = toLocalDateString(new Date());

  const handleAdd = () => {
    setEditingRule(null);
    setIsSheetOpen(true);
  };

  const handleEdit = (rule: RecurringRule) => {
    setEditingRule(rule);
    setIsSheetOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1100px] mx-auto w-full">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Recurring Expenses</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-control bg-primary px-4 py-2 text-sm font-medium text-primary-text hover:bg-primary-hover transition-colors"
        >
          <Plus size={16} /> Add Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted mb-4">No recurring expenses yet. Automate your rent or airtime.</p>
          <button onClick={handleAdd} className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-primary-text">
            Add Recurring Expense
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rules.map((rule) => {
            const category = catMap[rule.categoryId];
            if (!category) return null;
            const nextDate = getNextDate(rule);
            const nextLabel = formatNextDate(nextDate, today);
            
            return (
              <button
                key={rule.id}
                onClick={() => handleEdit(rule)}
                className="flex items-center justify-between rounded-card border border-border bg-surface p-4 hover:bg-surface-raised transition-colors w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                <div className="flex items-center gap-3">
                  <CategoryChip category={category} size="sm" />
                  <div className="flex flex-col">
                    <span className="font-medium">{rule.note || category.name}</span>
                    {rule.note && <span className="text-xs text-text-muted">{category.name}</span>}
                    <span className="text-xs text-text-muted">
                      {formatKobo(rule.amountKobo)} · {rule.frequency === "weekly" ? "Weekly" : "Monthly"} · {nextLabel}
                    </span>
                  </div>
                </div>
                <ChevronRight size={20} className="text-text-muted" />
              </button>
            );
          })}
        </div>
      )}

      <RecurringSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        existingRule={editingRule}
      />
    </div>
  );
}