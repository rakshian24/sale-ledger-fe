export type DailyEntry = {
  _id: string;
  userId: string;
  date: string;
  salesCount: number;
  cash: number;
  phonePe: number;
  total: number;
  expense: number;
  profit: number;
  isHoliday: boolean;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type EntryPayload = {
  date: string;
  salesCount: number;
  cash: number;
  phonePe: number;
  expense: number;
  isHoliday: boolean;
  note?: string;
};

export type EntryFormState = EntryPayload;

export type MonthlySummary = {
  totalSales: number;
  totalCash: number;
  totalPhonePe: number;
  totalCollection: number;
  totalExpense: number;
  totalProfit: number;
  totalFixedExpense?: number;
  netProfit?: number;
};

export type ViewMode = "monthly" | "yearly";

export type YearlyMonthSummary = MonthlySummary & {
  month: number;
  monthName: string;

  /*
   * True when the selected month contains at least one daily entry.
   */
  hasEntries: boolean;
  entryCount: number;

  /*
   * Fixed monthly expense values returned by the yearly API.
   */
  shopRent: number;
  shopkeeperSalary: number;
  electricityBill: number;
  totalFixedExpense: number;

  /*
   * totalProfit - totalFixedExpense
   */
  netProfit: number;
};

export type YearlySummaryResponse = {
  year: number;
  summary: MonthlySummary;
  months: YearlyMonthSummary[];
};
