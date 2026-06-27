import type { MonthlySummary } from "../types/entry";
import { formatCurrency } from "../utils/formatters";

type SummaryCardsProps = {
  summary: MonthlySummary;
};

export default function SummaryCards({ summary }: SummaryCardsProps) {
  return (
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

      <article
        className={
          summary.totalProfit >= 0 ? "summary-card profit" : "summary-card loss"
        }
      >
        <span>Profit</span>
        <strong>{formatCurrency(summary.totalProfit)}</strong>
      </article>
    </section>
  );
}
