"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { toLocalMonthString } from "@/lib/dates";

export function MonthSwitcher({ currentMonth, onChange }: { currentMonth: string; onChange: (month: string) => void }) {
  const [y, m] = currentMonth.split("-").map(Number);
  const monthLabel = new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
  
  const now = new Date();
  const isCurrentMonth = y === now.getFullYear() && m === now.getMonth() + 1;

  const handlePrev = () => {
    const d = new Date(y, m - 2, 1);
    onChange(toLocalMonthString(d));
  };

  const handleNext = () => {
    const d = new Date(y, m, 1);
    onChange(toLocalMonthString(d));
  };

  return (
    <div className="flex items-center gap-1">
      <button 
        onClick={handlePrev} 
        className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-raised" 
        aria-label="Previous month"
      >
        <ChevronLeft size={20} />
      </button>
      <span className="text-sm font-medium tabular-nums min-w-[100px] text-center">
        {monthLabel}
      </span>
      <button 
        onClick={handleNext} 
        disabled={isCurrentMonth}
        className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-raised disabled:opacity-30 disabled:hover:bg-transparent" 
        aria-label="Next month"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}