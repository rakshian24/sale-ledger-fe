export type FixedMonthlyExpense = {
  _id?: string;
  month: number;
  year: number;
  shopRent: number;
  shopkeeperSalary: number;
  electricityBill: number;
  totalFixedExpense: number;
  isDefault?: boolean;
};

export type FixedMonthlyExpensePayload = {
  shopRent: number;
  shopkeeperSalary: number;
  electricityBill: number;
};

export type FixedMonthlyExpenseResponse = {
  fixedExpense: FixedMonthlyExpense;
};
