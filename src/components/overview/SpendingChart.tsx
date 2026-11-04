"use client";

import { formatKobo } from "@/lib/money";
import { CategoryChip, categoryColorVar } from "@/components/shared/CategoryChip";

export function SpendingChart({ data }: { data: { categoryId: string; name: string; icon: string; colorToken: string; amountKobo: number; percentage: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-text-muted">No spending this month.</p>;
  }

  return (
    <div className="flex flex-col gap-4 mt-4">
      {/* Stacked Share Bar */}
      <div className="flex h-4 w-full overflow-hidden rounded-pill border border-border bg-surface-raised gap-[2px]" aria-hidden="true">
        {data.map((item) => (
          <div
            key={item.categoryId}
            className="h-full transition-all duration-150 ease-out motion-reduce:transition-none first:rounded-l-pill last:rounded-r-pill"
            style={{
              flexGrow: item.percentage,
              backgroundColor: categoryColorVar(item.colorToken),
            }}
          />
        ))}
      </div>

      {/* Category Rows */}
      <div className="flex flex-col gap-2 mt-2">
        {data.map((item) => (
          <div key={item.categoryId} className="flex items-center justify-between p-2">
            <div className="flex items-center gap-3">
              <CategoryChip category={item} size="sm" />
              <span className="font-medium text-sm">{item.name}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="tabular-nums text-text-muted w-12 text-right">
                {Math.round(item.percentage)}%
              </span>
              <span className="font-medium tabular-nums w-24 text-right">
                {formatKobo(item.amountKobo)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}