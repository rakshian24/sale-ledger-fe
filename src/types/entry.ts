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
};
