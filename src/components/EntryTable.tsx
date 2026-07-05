import { useEffect, useMemo, useRef, useState } from "react";
import { downloadEntriesPdfReport } from "../api/entryApi";
import type {
  DailyEntry,
  MonthlySummary,
  ViewMode,
  YearlyMonthSummary,
} from "../types/entry";
import type { FixedMonthlyExpense } from "../types/fixedMonthlyExpense";
import { formatCurrency, formatDate } from "../utils/formatters";

type EntryTableProps = {
  viewMode: ViewMode;
  entries: DailyEntry[];
  yearlyRows: YearlyMonthSummary[];
  summary: MonthlySummary;
  fixedExpense?: FixedMonthlyExpense | null;
  isOnline: boolean;
  month: number;
  year: number;
  onEdit: (entry: DailyEntry) => void;
  onDelete: (entry: DailyEntry) => void;
  isLoading: boolean;
};

const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DEFAULT_FIXED_EXPENSE = {
  shopRent: 5000,
  shopkeeperSalary: 10000,
  electricityBill: 0,
};

const getAverage = (total: number, count: number) => {
  if (count === 0) {
    return 0;
  }

  return Math.round(total / count);
};

/**
 * Mobile/tablet date formatter.
 *
 * It handles the common API value "YYYY-MM-DD" without timezone conversion.
 * A Date fallback is included for ISO date-time strings.
 */
const formatCompactDate = (value: string) => {
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return `${day}/${month}/${year}`;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsedDate);
};

function PencilActionIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16.862 4.487L19.55 7.175M5.25 18.75L8.45 17.95C8.87 17.845 9.255 17.63 9.562 17.323L20.237 6.648C20.94 5.945 20.94 4.805 20.237 4.102L19.898 3.763C19.195 3.06 18.055 3.06 17.352 3.763L6.677 14.438C6.37 14.745 6.155 15.13 6.05 15.55L5.25 18.75Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashActionIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7H20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9 3H15L16 7H8L9 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 7L7.25 20H16.75L17.5 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M10 11V16M14 11V16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 10.75L12 3.5L21 10.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 9.5V20H18.5V9.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 20V14H14.5V20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M4.5 20C5.6 16.9 8.4 15 12 15C15.6 15 18.4 16.9 19.5 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M13 2L5 14H11L10 22L19 9H13L13 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SalesProfitIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 19V13"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <path
        d="M12 19V8"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <path
        d="M18 19V5"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CalculatorIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="6"
        y="3.5"
        width="12"
        height="17"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M9 7H15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9 11H9.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M12 11H12.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M15 11H15.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M9 15H9.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M12 15H12.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M15 15H15.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NetLossIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7L10 12L14 9L20 15"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 15V10"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <path
        d="M20 15H15"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function EntryTable({
  viewMode,
  entries,
  yearlyRows,
  summary,
  fixedExpense,
  isOnline,
  month,
  year,
  onEdit,
  onDelete,
  isLoading,
}: EntryTableProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DailyEntry | null>(null);

  const lastTappedEntryIdRef = useRef<string | null>(null);
  const lastTapTimeRef = useRef(0);
  const doubleTapResetTimerRef = useRef<number | null>(null);

  const monthlyTotals = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        acc.salesCount += entry.salesCount ?? 0;
        acc.cash += entry.cash ?? 0;
        acc.phonePe += entry.phonePe ?? 0;
        acc.total += entry.total ?? 0;
        acc.expense += entry.expense ?? 0;
        acc.profit += entry.profit ?? 0;
        return acc;
      },
      {
        salesCount: 0,
        cash: 0,
        phonePe: 0,
        total: 0,
        expense: 0,
        profit: 0,
      },
    );
  }, [entries]);

  const monthlyAverages = useMemo(() => {
    const workingEntries = entries.filter((entry) => !entry.isHoliday);
    const workingDaysCount = workingEntries.length;

    const totals = workingEntries.reduce(
      (acc, entry) => {
        acc.salesCount += entry.salesCount ?? 0;
        acc.cash += entry.cash ?? 0;
        acc.phonePe += entry.phonePe ?? 0;
        acc.total += entry.total ?? 0;
        acc.expense += entry.expense ?? 0;
        acc.profit += entry.profit ?? 0;
        return acc;
      },
      {
        salesCount: 0,
        cash: 0,
        phonePe: 0,
        total: 0,
        expense: 0,
        profit: 0,
      },
    );

    return {
      workingDaysCount,
      salesCount: getAverage(totals.salesCount, workingDaysCount),
      cash: getAverage(totals.cash, workingDaysCount),
      phonePe: getAverage(totals.phonePe, workingDaysCount),
      total: getAverage(totals.total, workingDaysCount),
      expense: getAverage(totals.expense, workingDaysCount),
      profit: getAverage(totals.profit, workingDaysCount),
    };
  }, [entries]);

  const fixedExpenseBreakdown = useMemo(() => {
    const shopRent = fixedExpense?.shopRent ?? DEFAULT_FIXED_EXPENSE.shopRent;
    const shopkeeperSalary =
      fixedExpense?.shopkeeperSalary ?? DEFAULT_FIXED_EXPENSE.shopkeeperSalary;
    const electricityBill =
      fixedExpense?.electricityBill ?? DEFAULT_FIXED_EXPENSE.electricityBill;

    const totalFixedExpense =
      fixedExpense?.totalFixedExpense ??
      shopRent + shopkeeperSalary + electricityBill;

    return {
      shopRent,
      shopkeeperSalary,
      electricityBill,
      totalFixedExpense,
    };
  }, [fixedExpense]);

  const netProfitAfterFixedExpenses =
    monthlyTotals.profit - fixedExpenseBreakdown.totalFixedExpense;

  const isMonthlyView = viewMode === "monthly";
  const isYearlyView = viewMode === "yearly";

  const hasYearlyData =
    summary.totalSales > 0 ||
    summary.totalCash > 0 ||
    summary.totalPhonePe > 0 ||
    summary.totalCollection > 0 ||
    summary.totalExpense > 0 ||
    summary.totalProfit !== 0;

  useEffect(() => {
    if (!selectedEntry) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedEntry(null);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [selectedEntry]);

  const handleEntryRowTap = (entry: DailyEntry) => {
    const isMobileOrTablet = window.matchMedia("(max-width: 980px)").matches;

    if (!isMobileOrTablet) {
      return;
    }

    const now = Date.now();
    const entryId = String(entry._id);
    const isSameEntry = lastTappedEntryIdRef.current === entryId;
    const isWithinDoubleTapDelay = now - lastTapTimeRef.current <= 350;

    if (isSameEntry && isWithinDoubleTapDelay) {
      if (doubleTapResetTimerRef.current !== null) {
        window.clearTimeout(doubleTapResetTimerRef.current);
      }

      lastTappedEntryIdRef.current = null;
      lastTapTimeRef.current = 0;
      doubleTapResetTimerRef.current = null;
      setSelectedEntry(entry);
      return;
    }

    lastTappedEntryIdRef.current = entryId;
    lastTapTimeRef.current = now;

    if (doubleTapResetTimerRef.current !== null) {
      window.clearTimeout(doubleTapResetTimerRef.current);
    }

    doubleTapResetTimerRef.current = window.setTimeout(() => {
      lastTappedEntryIdRef.current = null;
      lastTapTimeRef.current = 0;
      doubleTapResetTimerRef.current = null;
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (doubleTapResetTimerRef.current !== null) {
        window.clearTimeout(doubleTapResetTimerRef.current);
      }
    };
  }, []);

  const handleModalEdit = () => {
    if (!selectedEntry) {
      return;
    }

    const entry = selectedEntry;
    setSelectedEntry(null);
    onEdit(entry);
  };

  const handleModalDelete = () => {
    if (!selectedEntry) {
      return;
    }

    const entry = selectedEntry;
    setSelectedEntry(null);
    onDelete(entry);
  };

  const handleDownloadPdf = async () => {
    if (!isOnline) {
      window.alert(
        "You are offline. Please connect to the internet to download the PDF report.",
      );
      return;
    }

    if (entries.length === 0) {
      window.alert("No entries found to download.");
      return;
    }

    setIsDownloading(true);

    try {
      const blob = await downloadEntriesPdfReport(month, year);
      const url = window.URL.createObjectURL(blob);
      const monthName = MONTH_OPTIONS[month - 1] || "monthly";
      const fileName = `SaleLedger-${monthName}-${year}-report.pdf`;

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to download PDF report. Please try again.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <section className="card records-card">
      <div className="section-heading records-heading">
        <div>
          <p className="section-kicker">Records</p>
          <h2>{isMonthlyView ? "Daily Entries" : "Monthly Summary"}</h2>
        </div>

        {isMonthlyView ? (
          <button
            type="button"
            className="download-report-button"
            onClick={handleDownloadPdf}
            disabled={
              !isOnline || isDownloading || entries.length === 0 || isLoading
            }
            title="Download PDF report"
            aria-label="Download PDF report"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 3V15M12 15L7 10M12 15L17 10"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5 19H19"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>

            <span>{isDownloading ? "Downloading..." : "Download Report"}</span>
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <div
          className="records-loader"
          aria-busy="true"
          aria-label="Loading entries"
        />
      ) : isMonthlyView && entries.length === 0 ? (
        <p className="empty-state">No entries found for this month.</p>
      ) : isYearlyView && !hasYearlyData ? (
        <p className="empty-state">No entries found for this year.</p>
      ) : isMonthlyView ? (
        <>
          <section className="average-strip" aria-label="Daily averages">
            <div className="average-strip-heading">
              <div>
                <span>Daily Averages</span>
                <small>
                  Based on {monthlyAverages.workingDaysCount} working days
                </small>
              </div>
            </div>

            <div className="average-item">
              <span>Avg Sales</span>
              <strong>{monthlyAverages.salesCount}</strong>
            </div>

            <div className="average-item">
              <span>Avg Cash</span>
              <strong>{formatCurrency(monthlyAverages.cash)}</strong>
            </div>

            <div className="average-item">
              <span>Avg PhonePe</span>
              <strong>{formatCurrency(monthlyAverages.phonePe)}</strong>
            </div>

            <div className="average-item">
              <span>Avg Total</span>
              <strong>{formatCurrency(monthlyAverages.total)}</strong>
            </div>

            <div className="average-item">
              <span>Avg Expense</span>
              <strong>{formatCurrency(monthlyAverages.expense)}</strong>
            </div>

            <div
              className={
                monthlyAverages.profit >= 0
                  ? "average-item average-profit"
                  : "average-item average-loss"
              }
            >
              <span>Avg Profit</span>
              <strong>{formatCurrency(monthlyAverages.profit)}</strong>
            </div>
          </section>

          <section
            className="fixed-expense-breakdown"
            aria-label="Fixed monthly expenses breakdown"
          >
            <div className="fixed-expense-breakdown-title">
              Fixed Expenses (Monthly Breakdown)
            </div>

            <div className="fixed-expense-breakdown-grid">
              <article className="fixed-expense-breakdown-item">
                <span className="fixed-expense-icon">
                  <HomeIcon />
                </span>
                <div>
                  <span>Rent</span>
                  <strong>
                    {formatCurrency(fixedExpenseBreakdown.shopRent)}
                  </strong>
                </div>
              </article>

              <article className="fixed-expense-breakdown-item">
                <span className="fixed-expense-icon">
                  <UserIcon />
                </span>
                <div>
                  <span>Salary</span>
                  <strong>
                    {formatCurrency(fixedExpenseBreakdown.shopkeeperSalary)}
                  </strong>
                </div>
              </article>

              <article className="fixed-expense-breakdown-item">
                <span className="fixed-expense-icon">
                  <LightningIcon />
                </span>
                <div>
                  <span>Electricity</span>
                  <strong>
                    {formatCurrency(fixedExpenseBreakdown.electricityBill)}
                  </strong>
                </div>
              </article>

              <div className="fixed-expense-divider" aria-hidden="true" />

              <article className="fixed-expense-breakdown-total">
                <span>Total</span>
                <strong>
                  {formatCurrency(fixedExpenseBreakdown.totalFixedExpense)}
                </strong>
              </article>
            </div>
          </section>

          <div className="table-wrapper">
            <table className="entries-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sales</th>
                  <th>Cash</th>
                  <th>PhonePe</th>
                  <th>Total</th>
                  <th>Expense</th>
                  <th>Sales Profit</th>
                  <th>Note</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry._id}
                    className={`${entry.isHoliday ? "holiday-row " : ""}entry-data-row`}
                    onClick={() => handleEntryRowTap(entry)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        setSelectedEntry(entry);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`Double tap or double click to view details for ${formatDate(entry.date)}`}
                  >
                    <td data-label="Date">
                      <div className="date-cell">
                        <time dateTime={entry.date}>
                          <strong
                            className="entry-date-desktop"
                            aria-hidden="true"
                          >
                            {formatDate(entry.date)}
                          </strong>

                          <strong
                            className="entry-date-compact"
                            aria-hidden="true"
                          >
                            {formatCompactDate(entry.date)}
                          </strong>

                          <span className="sr-only">
                            {formatDate(entry.date)}
                          </span>
                        </time>

                        {entry.isHoliday ? (
                          <span className="tag">Holiday</span>
                        ) : null}
                      </div>
                    </td>

                    <td data-label="Sales">{entry.salesCount ?? 0}</td>
                    <td data-label="Cash">{formatCurrency(entry.cash)}</td>
                    <td data-label="PhonePe">
                      {formatCurrency(entry.phonePe)}
                    </td>
                    <td data-label="Total">{formatCurrency(entry.total)}</td>
                    <td data-label="Expense">
                      {formatCurrency(entry.expense)}
                    </td>

                    <td
                      data-label="Sales Profit"
                      className={
                        entry.profit >= 0 ? "profit-text" : "loss-text"
                      }
                    >
                      {formatCurrency(entry.profit)}
                    </td>

                    <td data-label="Note" className="note-cell">
                      {entry.note || "-"}
                    </td>

                    <td data-label="Actions">
                      <div className="table-actions">
                        <button
                          type="button"
                          className="table-action-button edit-action-button"
                          disabled={!isOnline}
                          onClick={(event) => {
                            event.stopPropagation();
                            onEdit(entry);
                          }}
                          aria-label={`Edit entry for ${formatDate(entry.date)}`}
                          title="Edit entry"
                        >
                          <span className="table-action-text">Edit</span>
                          <span className="table-action-icon">
                            <PencilActionIcon />
                          </span>
                        </button>

                        <button
                          type="button"
                          className="table-action-button delete-action-button danger-button"
                          disabled={!isOnline}
                          onClick={(event) => {
                            event.stopPropagation();
                            onDelete(entry);
                          }}
                          aria-label={`Delete entry for ${formatDate(entry.date)}`}
                          title="Delete entry"
                        >
                          <span className="table-action-text">Delete</span>
                          <span className="table-action-icon">
                            <TrashActionIcon />
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className="total-row">
                  <td data-label="Summary">
                    <strong>Totals</strong>
                  </td>
                  <td data-label="Total Sales">
                    <strong>{monthlyTotals.salesCount}</strong>
                  </td>
                  <td data-label="Total Cash">
                    <strong>{formatCurrency(monthlyTotals.cash)}</strong>
                  </td>
                  <td data-label="Total PhonePe">
                    <strong>{formatCurrency(monthlyTotals.phonePe)}</strong>
                  </td>
                  <td data-label="Total Collection">
                    <strong>{formatCurrency(monthlyTotals.total)}</strong>
                  </td>
                  <td data-label="Total Expense">
                    <strong>{formatCurrency(monthlyTotals.expense)}</strong>
                  </td>
                  <td
                    data-label="Total Sales Profit"
                    className={
                      monthlyTotals.profit >= 0 ? "profit-text" : "loss-text"
                    }
                  >
                    <strong>{formatCurrency(monthlyTotals.profit)}</strong>
                  </td>
                  <td className="total-empty-cell" data-label="Note">
                    <strong>-</strong>
                  </td>
                  <td className="total-empty-cell" data-label="Actions">
                    <strong>-</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <section
            className="business-summary-panel"
            aria-label="Business summary after fixed expenses"
          >
            <div className="business-summary-heading">
              <div className="business-summary-heading-left">
                <span>Business Summary After fixed expenses</span>
              </div>
            </div>

            <div className="business-summary-grid">
              <article className="business-summary-card business-summary-profit">
                <span className="business-summary-icon">
                  <SalesProfitIcon />
                </span>
                <div className="business-summary-content">
                  <span>Sales Profit (All Entries)</span>
                  <strong>{formatCurrency(monthlyTotals.profit)}</strong>
                  <small>Sum of Sales Profit column above</small>
                </div>
              </article>

              <article className="business-summary-card business-summary-fixed">
                <span className="business-summary-icon">
                  <CalculatorIcon />
                </span>
                <div className="business-summary-content">
                  <span>Fixed Monthly Expense</span>
                  <strong>
                    {formatCurrency(fixedExpenseBreakdown.totalFixedExpense)}
                  </strong>
                  <small>Rent + Salary + Electricity</small>
                </div>
              </article>

              <article
                className={
                  netProfitAfterFixedExpenses >= 0
                    ? "business-summary-card business-summary-net business-summary-net-positive"
                    : "business-summary-card business-summary-net business-summary-net-negative"
                }
              >
                <span className="business-summary-icon">
                  <NetLossIcon />
                </span>
                <div className="business-summary-content">
                  <span>Net Profit After Fixed Expenses</span>
                  <strong>{formatCurrency(netProfitAfterFixedExpenses)}</strong>
                  <small>Sales Profit - Fixed Monthly Expense</small>
                </div>
              </article>
            </div>
          </section>

          {selectedEntry ? (
            <div
              className="entry-details-backdrop"
              role="presentation"
              onMouseDown={() => setSelectedEntry(null)}
            >
              <section
                className="entry-details-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="entry-details-title"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <header className="entry-details-modal-header">
                  <div>
                    <p className="section-kicker">Daily Entry</p>
                    <h2 id="entry-details-title">Entry Details</h2>
                  </div>

                  <button
                    type="button"
                    className="entry-details-close-button"
                    onClick={() => setSelectedEntry(null)}
                    aria-label="Close entry details"
                    title="Close"
                  >
                    <CloseIcon />
                  </button>
                </header>

                <div className="entry-details-list">
                  <div className="entry-details-row">
                    <span>Date</span>
                    <strong>{formatCompactDate(selectedEntry.date)}</strong>
                  </div>

                  {selectedEntry.isHoliday ? (
                    <div className="entry-details-row">
                      <span>Status</span>
                      <strong>
                        <span className="tag">Holiday</span>
                      </strong>
                    </div>
                  ) : null}

                  <div className="entry-details-row">
                    <span>Sales</span>
                    <strong>{selectedEntry.salesCount ?? 0}</strong>
                  </div>

                  <div className="entry-details-row">
                    <span>Cash</span>
                    <strong>{formatCurrency(selectedEntry.cash)}</strong>
                  </div>

                  <div className="entry-details-row">
                    <span>PhonePe / UPI</span>
                    <strong>{formatCurrency(selectedEntry.phonePe)}</strong>
                  </div>

                  <div className="entry-details-row">
                    <span>Total</span>
                    <strong>{formatCurrency(selectedEntry.total)}</strong>
                  </div>

                  <div className="entry-details-row">
                    <span>Expense</span>
                    <strong>{formatCurrency(selectedEntry.expense)}</strong>
                  </div>

                  <div className="entry-details-row">
                    <span>Sales Profit</span>
                    <strong
                      className={
                        selectedEntry.profit >= 0 ? "profit-text" : "loss-text"
                      }
                    >
                      {formatCurrency(selectedEntry.profit)}
                    </strong>
                  </div>

                  <div className="entry-details-row entry-details-note-row">
                    <span>Note</span>
                    <strong>{selectedEntry.note || "-"}</strong>
                  </div>
                </div>

                <footer className="entry-details-actions">
                  <button
                    type="button"
                    className="entry-details-edit-button"
                    disabled={!isOnline}
                    onClick={handleModalEdit}
                  >
                    <PencilActionIcon />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    className="entry-details-delete-button"
                    disabled={!isOnline}
                    onClick={handleModalDelete}
                  >
                    <TrashActionIcon />
                    <span>Delete</span>
                  </button>
                </footer>
              </section>
            </div>
          ) : null}
        </>
      ) : (
        <div className="table-wrapper">
          <table className="entries-table yearly-entries-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Sales</th>
                <th>Cash</th>
                <th>PhonePe</th>
                <th>Total</th>
                <th>Expense</th>
                <th>Profit</th>
              </tr>
            </thead>

            <tbody>
              {yearlyRows.map((row) => (
                <tr key={row.month}>
                  <td data-label="Month">
                    <strong>{row.monthName}</strong>
                  </td>
                  <td data-label="Sales">{row.totalSales}</td>
                  <td data-label="Cash">{formatCurrency(row.totalCash)}</td>
                  <td data-label="PhonePe">
                    {formatCurrency(row.totalPhonePe)}
                  </td>
                  <td data-label="Total">
                    {formatCurrency(row.totalCollection)}
                  </td>
                  <td data-label="Expense">
                    {formatCurrency(row.totalExpense)}
                  </td>
                  <td
                    data-label="Profit"
                    className={
                      row.totalProfit >= 0 ? "profit-text" : "loss-text"
                    }
                  >
                    {formatCurrency(row.totalProfit)}
                  </td>
                </tr>
              ))}
            </tbody>

            <tfoot>
              <tr className="total-row">
                <td data-label="Summary">
                  <strong>Totals</strong>
                </td>
                <td data-label="Total Sales">
                  <strong>{summary.totalSales}</strong>
                </td>
                <td data-label="Total Cash">
                  <strong>{formatCurrency(summary.totalCash)}</strong>
                </td>
                <td data-label="Total PhonePe">
                  <strong>{formatCurrency(summary.totalPhonePe)}</strong>
                </td>
                <td data-label="Total Collection">
                  <strong>{formatCurrency(summary.totalCollection)}</strong>
                </td>
                <td data-label="Total Expense">
                  <strong>{formatCurrency(summary.totalExpense)}</strong>
                </td>
                <td
                  data-label="Total Profit"
                  className={
                    summary.totalProfit >= 0 ? "profit-text" : "loss-text"
                  }
                >
                  <strong>{formatCurrency(summary.totalProfit)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
