import { Bus, Utensils, Smartphone, Home, FileText, Heart, ShoppingBag, PiggyBank, MoreHorizontal } from "lucide-react";

export const ICON_MAP: Record<string, React.ElementType> = {
  "bus": Bus,
  "utensils": Utensils,
  "smartphone": Smartphone,
  "home": Home,
  "file-text": FileText,
  "heart": Heart,
  "shopping-bag": ShoppingBag,
  "piggy-bank": PiggyBank,
  "more-horizontal": MoreHorizontal,
};

export function categoryColorVar(token: string): string {
  if (/^cat-[1-9]$/.test(token)) {
    return `var(--${token})`;
  }
  return "var(--cat-9)";
}

export function getCategoryIcon(iconName: string): React.ElementType {
  return ICON_MAP[iconName] || ICON_MAP["more-horizontal"];
}

export function CategoryChip({ category, size = "md" }: { category: { name: string; icon: string; colorToken: string }, size?: "sm" | "md" }) {
  const Icon = getCategoryIcon(category.icon);
  const colorVar = categoryColorVar(category.colorToken);
  
  const sizeClasses = size === "md" ? "h-8 w-8 rounded-control" : "h-6 w-6 rounded-md";
  const iconSize = size === "md" ? 16 : 12;

  return (
    <div
      className={`flex items-center justify-center ${sizeClasses}`}
      style={{ backgroundColor: `color-mix(in srgb, ${colorVar} 14%, transparent)`, color: colorVar }}
      aria-hidden="true"
    >
      <Icon size={iconSize} strokeWidth={2} />
    </div>
  );
}