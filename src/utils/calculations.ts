import type {
  DailyEntry,
  EntryFormState,
  MonthlySummary,
} from "../types/entry";

export const calculateEntryTotal = (
  entry: Pick<EntryFormState, "cash" | "phonePe">,
) => {
  return (Number(entry.cash) || 0) + (Number(entry.phonePe) || 0);
};

export const calculateEntryProfit = (
  entry: Pick<EntryFormState, "cash" | "phonePe" | "expense">,
) => {
  return calculateEntryTotal(entry) - (Number(entry.expense) || 0);
};

export const calculateMonthlySummary = (
  entries: DailyEntry[],
): MonthlySummary => {
  return entries.reduce(
    (summary, entry) => {
      summary.totalSales += entry.salesCount ?? 0;
      summary.totalCash += entry.cash ?? 0;
      summary.totalPhonePe += entry.phonePe ?? 0;
      summary.totalCollection += entry.total ?? 0;
      summary.totalExpense += entry.expense ?? 0;
      summary.totalProfit += entry.profit ?? 0;

      return summary;
    },
    {
      totalSales: 0,
      totalCash: 0,
      totalPhonePe: 0,
      totalCollection: 0,
      totalExpense: 0,
      totalProfit: 0,
    },
  );
};
