import { Expense, Category } from "./types";
import { getPreviousMonth } from "./dates";

export type OverviewData = {
  totalKobo: number;
  previousMonthTotalKobo: number;
  percentageChange: number | null;
  topCategory: { name: string; amountKobo: number } | null;
  categoryBreakdown: {
    categoryId: string;
    name: string;
    icon: string;
    colorToken: string;
    amountKobo: number;
    percentage: number;
  }[];
};

export function calculateOverview(
  expenses: Expense[],
  categories: Category[],
  currentMonth: string
): OverviewData {
  const currentExpenses = expenses.filter(
    (e) => !e.deletedAt && e.occurredOn.startsWith(currentMonth)
  );

  const totalKobo = currentExpenses.reduce((sum, e) => sum + e.amountKobo, 0);

  const prevMonth = getPreviousMonth(currentMonth);
  const prevExpenses = expenses.filter(
    (e) => !e.deletedAt && e.occurredOn.startsWith(prevMonth)
  );
  const previousMonthTotalKobo = prevExpenses.reduce((sum, e) => sum + e.amountKobo, 0);

  let percentageChange: number | null = null;
  if (previousMonthTotalKobo > 0) {
    percentageChange = ((totalKobo - previousMonthTotalKobo) / previousMonthTotalKobo) * 100;
  }

  const catMap = categories.reduce((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {} as Record<string, Category>);

  const categoryTotals = currentExpenses.reduce((acc, exp) => {
    if (!acc[exp.categoryId]) acc[exp.categoryId] = 0;
    acc[exp.categoryId] += exp.amountKobo;
    return acc;
  }, {} as Record<string, number>);

  const categoryBreakdown = Object.entries(categoryTotals)
    .map(([categoryId, amountKobo]) => {
      const cat = catMap[categoryId] || { name: "Uncategorised", icon: "more-horizontal", colorToken: "cat-9" };
      return {
        categoryId,
        name: cat.name,
        icon: cat.icon,
        colorToken: cat.colorToken,
        amountKobo,
        percentage: totalKobo > 0 ? (amountKobo / totalKobo) * 100 : 0,
      };
    })
    .sort((a, b) => b.amountKobo - a.amountKobo);

  const topCategory = categoryBreakdown.length > 0
    ? { name: categoryBreakdown[0].name, amountKobo: categoryBreakdown[0].amountKobo }
    : null;

  return {
    totalKobo,
    previousMonthTotalKobo,
    percentageChange,
    topCategory,
    categoryBreakdown,
  };
}