"use client";

import { useState, useEffect } from "react";
import { readThemeChoice, setTheme, ThemeChoice } from "@/lib/theme";

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

export function ThemeControl() {
  const [selected, setSelected] = useState<ThemeChoice | null>(null);

  useEffect(() => {
    setSelected(readThemeChoice());
  }, []);

  if (selected === null) {
    // Render a neutral skeleton to avoid hydration mismatch
    return <div className="h-11 w-full max-w-[300px] rounded-control bg-surface-raised animate-pulse" />;
  }

  const handleSelect = (value: ThemeChoice) => {
    setSelected(value);
    setTheme(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      nextIndex = (index + 1) % OPTIONS.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      nextIndex = (index - 1 + OPTIONS.length) % OPTIONS.length;
    } else {
      return;
    }
    
    e.preventDefault();
    const nextValue = OPTIONS[nextIndex].value;
    handleSelect(nextValue);
    
    // Focus the newly selected element
    const container = e.currentTarget.parentElement;
    if (container) {
      const buttons = container.querySelectorAll('[role="radio"]');
      (buttons[nextIndex] as HTMLElement).focus();
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex w-full max-w-[300px] rounded-control border border-border bg-surface p-1"
    >
      {OPTIONS.map((opt, index) => {
        const isSelected = selected === opt.value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => handleSelect(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`flex-1 flex items-center justify-center h-9 text-sm rounded-[8px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
              isSelected
                ? "bg-primary text-primary-text font-medium"
                : "text-text-muted hover:text-text"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}