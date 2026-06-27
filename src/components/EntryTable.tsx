import { useMemo, useState } from "react";
import { downloadEntriesPdfReport } from "../api/entryApi";
import type { DailyEntry } from "../types/entry";
import { formatCurrency, formatDate } from "../utils/formatters";

type EntryTableProps = {
  entries: DailyEntry[];
  isOnline: boolean;
  month: number;
  year: number;
  onEdit: (entry: DailyEntry) => void;
  onDelete: (entry: DailyEntry) => void;
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

export default function EntryTable({
  entries,
  isOnline,
  month,
  year,
  onEdit,
  onDelete,
}: EntryTableProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const totals = useMemo(() => {
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
      const fileName = `dayledger-${monthName}-${year}-report.pdf`;

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
          <h2>Daily Entries</h2>
        </div>

        <button
          type="button"
          className="download-report-button"
          onClick={handleDownloadPdf}
          disabled={!isOnline || isDownloading || entries.length === 0}
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
      </div>

      {entries.length === 0 ? (
        <p className="empty-state">No entries found for this month.</p>
      ) : (
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
                <th>Profit</th>
                <th>Note</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry._id}
                  className={entry.isHoliday ? "holiday-row" : ""}
                >
                  <td data-label="Date">
                    <div className="date-cell">
                      <strong>{formatDate(entry.date)}</strong>

                      {entry.isHoliday ? (
                        <span className="tag">Holiday</span>
                      ) : null}
                    </div>
                  </td>

                  <td data-label="Sales">{entry.salesCount ?? 0}</td>

                  <td data-label="Cash">{formatCurrency(entry.cash)}</td>

                  <td data-label="PhonePe">{formatCurrency(entry.phonePe)}</td>

                  <td data-label="Total">{formatCurrency(entry.total)}</td>

                  <td data-label="Expense">{formatCurrency(entry.expense)}</td>

                  <td
                    data-label="Profit"
                    className={entry.profit >= 0 ? "profit-text" : "loss-text"}
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
                        disabled={!isOnline}
                        onClick={() => onEdit(entry)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={!isOnline}
                        className="danger-button"
                        onClick={() => onDelete(entry)}
                      >
                        Delete
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
                  <strong>{totals.salesCount}</strong>
                </td>

                <td data-label="Total Cash">
                  <strong>{formatCurrency(totals.cash)}</strong>
                </td>

                <td data-label="Total PhonePe">
                  <strong>{formatCurrency(totals.phonePe)}</strong>
                </td>

                <td data-label="Total Collection">
                  <strong>{formatCurrency(totals.total)}</strong>
                </td>

                <td data-label="Total Expense">
                  <strong>{formatCurrency(totals.expense)}</strong>
                </td>

                <td
                  data-label="Total Profit"
                  className={totals.profit >= 0 ? "profit-text" : "loss-text"}
                >
                  <strong>{formatCurrency(totals.profit)}</strong>
                </td>

                <td className="total-empty-cell" />

                <td className="total-empty-cell" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
