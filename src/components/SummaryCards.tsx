import type { MonthlySummary } from "../types/entry";
import { formatCurrency } from "../utils/formatters";

type SummaryCardsProps = {
  summary: MonthlySummary;
  isLoading: boolean;
};

const SUMMARY_CARD_COUNT = 6;

export default function SummaryCards({
  summary,
  isLoading,
}: SummaryCardsProps) {
  if (isLoading) {
    return (
      <section
        className="summary-grid"
        aria-busy="true"
        aria-label="Loading summary"
      >
        {Array.from({ length: SUMMARY_CARD_COUNT }).map((_, index) => (
          <article className="summary-card summary-skeleton-card" key={index}>
            <span className="skeleton-line skeleton-label" />
            <strong className="skeleton-line skeleton-value" />
          </article>
        ))}
      </section>
    );
  }

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
