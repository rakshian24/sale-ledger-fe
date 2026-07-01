import { apiClient } from "./apiClient";
import type {
  FixedMonthlyExpense,
  FixedMonthlyExpensePayload,
  FixedMonthlyExpenseResponse,
} from "../types/fixedMonthlyExpense";

export const getFixedMonthlyExpense = async (
  month: number,
  year: number,
): Promise<FixedMonthlyExpense> => {
  const response = await apiClient<FixedMonthlyExpenseResponse>(
    `/fixed-expenses?month=${month}&year=${year}`,
  );

  return response.fixedExpense;
};

export const upsertFixedMonthlyExpense = async (
  month: number,
  year: number,
  payload: FixedMonthlyExpensePayload,
): Promise<FixedMonthlyExpense> => {
  const response = await apiClient<FixedMonthlyExpenseResponse>(
    `/fixed-expenses?month=${month}&year=${year}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );

  return response.fixedExpense;
};
