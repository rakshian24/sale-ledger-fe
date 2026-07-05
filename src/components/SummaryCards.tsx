import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { MonthlySummary } from "../types/entry";
import { formatCurrency } from "../utils/formatters";
import type {
  FixedMonthlyExpense,
  FixedMonthlyExpensePayload,
} from "../types/fixedMonthlyExpense";

type SummaryCardsProps = {
  summary: MonthlySummary;
  isLoading: boolean;
  fixedExpense?: FixedMonthlyExpense | null;
  totalFixedExpense?: number;
  canEditFixedExpenses?: boolean;
  isFixedExpenseSaving?: boolean;
  onSaveFixedExpenses?: (
    payload: FixedMonthlyExpensePayload,
  ) => Promise<void> | void;
};

const SUMMARY_CARD_COUNT = 8;

const DEFAULT_FIXED_EXPENSE: FixedMonthlyExpensePayload = {
  shopRent: 5000,
  shopkeeperSalary: 10000,
  electricityBill: 0,
};

const getFixedExpenseTotal = (
  expense?: Partial<FixedMonthlyExpensePayload> | null,
) => {
  const shopRent = Number(expense?.shopRent ?? DEFAULT_FIXED_EXPENSE.shopRent);

  const shopkeeperSalary = Number(
    expense?.shopkeeperSalary ?? DEFAULT_FIXED_EXPENSE.shopkeeperSalary,
  );

  const electricityBill = Number(
    expense?.electricityBill ?? DEFAULT_FIXED_EXPENSE.electricityBill,
  );

  return shopRent + shopkeeperSalary + electricityBill;
};

function PencilIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M19.5 7.125L16.875 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FixedExpenseModal({
  fixedExpense,
  isSaving,
  onClose,
  onSave,
}: {
  fixedExpense?: FixedMonthlyExpense | null;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (payload: FixedMonthlyExpensePayload) => Promise<void> | void;
}) {
  const [form, setForm] = useState({
    shopRent: String(fixedExpense?.shopRent ?? DEFAULT_FIXED_EXPENSE.shopRent),
    shopkeeperSalary: String(
      fixedExpense?.shopkeeperSalary ?? DEFAULT_FIXED_EXPENSE.shopkeeperSalary,
    ),
    electricityBill:
      fixedExpense?.electricityBill && fixedExpense.electricityBill > 0
        ? String(fixedExpense.electricityBill)
        : "",
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const updateField = (name: keyof typeof form, value: string) => {
    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  };

  const toAmount = (value: string) => {
    const amount = Number(value);

    if (!Number.isFinite(amount) || amount < 0) {
      return 0;
    }

    return amount;
  };

  const totalFixedExpense = useMemo(() => {
    return (
      toAmount(form.shopRent) +
      toAmount(form.shopkeeperSalary) +
      toAmount(form.electricityBill)
    );
  }, [form]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSave({
      shopRent: toAmount(form.shopRent),
      shopkeeperSalary: toAmount(form.shopkeeperSalary),
      electricityBill: toAmount(form.electricityBill),
    });

    onClose();
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="fixed-expense-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fixed-expense-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="fixed-expense-modal-header">
          <div>
            <p className="section-kicker">Fixed Expenses</p>

            <h2 id="fixed-expense-modal-title">Fixed Monthly Expenses</h2>

            <p>
              Save shop rent, shopkeeper salary, and electricity bill for this
              selected month.
            </p>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close fixed monthly expenses modal"
          >
            ×
          </button>
        </div>

        <form className="fixed-expense-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Shop Rent</span>

            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={form.shopRent}
              onChange={(event) => updateField("shopRent", event.target.value)}
              placeholder="5000"
            />
          </label>

          <label className="field">
            <span>Shopkeeper Salary</span>

            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={form.shopkeeperSalary}
              onChange={(event) =>
                updateField("shopkeeperSalary", event.target.value)
              }
              placeholder="10000"
            />
          </label>

          <label className="field">
            <span>Electricity Bill</span>

            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={form.electricityBill}
              onChange={(event) =>
                updateField("electricityBill", event.target.value)
              }
              placeholder="Enter bill amount"
            />
          </label>

          <div className="fixed-expense-total-preview">
            <span>Total Fixed Expenses</span>

            <strong>{formatCurrency(totalFixedExpense)}</strong>
          </div>

          <div className="fixed-expense-modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>

            <button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Fixed Expenses"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SummaryCards({
  summary,
  isLoading,
  fixedExpense,
  totalFixedExpense,
  canEditFixedExpenses = false,
  isFixedExpenseSaving = false,
  onSaveFixedExpenses,
}: SummaryCardsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  /*
   * DashboardPage passes totalFixedExpense only in yearly view.
   */
  const isYearlyView =
    typeof totalFixedExpense === "number" &&
    !fixedExpense &&
    !canEditFixedExpenses;

  const fixedExpenseTotal =
    typeof totalFixedExpense === "number"
      ? totalFixedExpense
      : (fixedExpense?.totalFixedExpense ?? getFixedExpenseTotal(fixedExpense));

  const shopRent = fixedExpense?.shopRent ?? DEFAULT_FIXED_EXPENSE.shopRent;

  const shopkeeperSalary =
    fixedExpense?.shopkeeperSalary ?? DEFAULT_FIXED_EXPENSE.shopkeeperSalary;

  const electricityBill =
    fixedExpense?.electricityBill ?? DEFAULT_FIXED_EXPENSE.electricityBill;

  /*
   * Yearly API supplies summary.netProfit.
   * Monthly view falls back to the normal calculation.
   */
  const netProfitAfterFixedExpenses =
    typeof summary.netProfit === "number"
      ? summary.netProfit
      : summary.totalProfit - fixedExpenseTotal;

  if (isLoading) {
    return (
      <section
        className="summary-grid"
        aria-busy="true"
        aria-label="Loading summary"
      >
        {Array.from({
          length: SUMMARY_CARD_COUNT,
        }).map((_, index) => (
          <article className="summary-card summary-skeleton-card" key={index}>
            <span className="skeleton-line skeleton-label" />
            <strong className="skeleton-line skeleton-value" />
          </article>
        ))}
      </section>
    );
  }

  return (
    <>
      <section className="summary-grid">
        <article className="summary-card">
          <span>Sales</span>
          <strong>{summary.totalSales}</strong>
        </article>

        <article className="summary-card">
          <span>Cash</span>

          <strong>{formatCurrency(summary.totalCash)}</strong>
        </article>

        <article className="summary-card">
          <span>PhonePe / UPI</span>

          <strong>{formatCurrency(summary.totalPhonePe)}</strong>
        </article>

        <article className="summary-card">
          <span>Total Collection</span>

          <strong>{formatCurrency(summary.totalCollection)}</strong>
        </article>

        <article className="summary-card">
          <span>Expense</span>

          <strong>{formatCurrency(summary.totalExpense)}</strong>
        </article>

        <article className="summary-card fixed-expense-summary-card">
          <div className="summary-card-header">
            <span>
              {isYearlyView ? "Total Fixed Expenses" : "Fixed Monthly Expenses"}
            </span>

            {canEditFixedExpenses && onSaveFixedExpenses ? (
              <button
                type="button"
                className="summary-edit-button"
                onClick={() => setIsModalOpen(true)}
                aria-label="Edit fixed monthly expenses"
              >
                <PencilIcon />
              </button>
            ) : null}
          </div>

          <strong>{formatCurrency(fixedExpenseTotal)}</strong>

          <small className="summary-card-meta">
            {isYearlyView ? (
              "Combined fixed expenses for months containing daily entries"
            ) : (
              <>
                Rent {formatCurrency(shopRent)} • Salary{" "}
                {formatCurrency(shopkeeperSalary)} • EB{" "}
                {formatCurrency(electricityBill)}
              </>
            )}
          </small>
        </article>

        <article
          className={
            summary.totalProfit >= 0
              ? "summary-card profit"
              : "summary-card loss"
          }
        >
          <span>Sales Profit</span>

          <strong>{formatCurrency(summary.totalProfit)}</strong>
        </article>

        <article
          className={
            netProfitAfterFixedExpenses >= 0
              ? "summary-card net-profit-summary-card profit"
              : "summary-card net-profit-summary-card loss"
          }
        >
          <span>Net Profit After Fixed Expenses</span>

          <strong>{formatCurrency(netProfitAfterFixedExpenses)}</strong>
        </article>
      </section>

      {isModalOpen && onSaveFixedExpenses ? (
        <FixedExpenseModal
          fixedExpense={fixedExpense}
          isSaving={isFixedExpenseSaving}
          onClose={() => setIsModalOpen(false)}
          onSave={onSaveFixedExpenses}
        />
      ) : null}
    </>
  );
}
