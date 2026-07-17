import { useEffect, useMemo, useState } from "react";
import { clearToken } from "../api/apiClient";
import {
  createEntry,
  deleteEntry,
  getEntries,
  getYearlySummary,
  updateEntry,
} from "../api/entryApi";
import {
  getFixedMonthlyExpense,
  upsertFixedMonthlyExpense,
} from "../api/fixedExpenseApi";
import EntryForm from "../components/EntryForm";
import EntryTable from "../components/EntryTable";
import Header from "../components/Header";
import OfflineBanner from "../components/OfflineBanner";
import SummaryCards from "../components/SummaryCards";
import CustomSelect from "../components/CustomSelect";
import PurchaseDashboard from "../components/PurchaseDashboard";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import type { User } from "../types/auth";
import type {
  DailyEntry,
  EntryPayload,
  MonthlySummary,
  ViewMode,
  YearlyMonthSummary,
} from "../types/entry";
import type {
  FixedMonthlyExpense,
  FixedMonthlyExpensePayload,
} from "../types/fixedMonthlyExpense";
import { calculateMonthlySummary } from "../utils/calculations";

type DashboardPageProps = {
  user: User;
  onLogout: () => void;
};

const getCurrentMonth = () => new Date().getMonth() + 1;
const getCurrentYear = () => new Date().getFullYear();

const VIEW_MODE_OPTIONS: { label: string; value: ViewMode }[] = [
  { label: "Monthly View", value: "monthly" },
  { label: "Yearly View", value: "yearly" },
];

const MONTH_OPTIONS = [
  { label: "January", value: 1 },
  { label: "February", value: 2 },
  { label: "March", value: 3 },
  { label: "April", value: 4 },
  { label: "May", value: 5 },
  { label: "June", value: 6 },
  { label: "July", value: 7 },
  { label: "August", value: 8 },
  { label: "September", value: 9 },
  { label: "October", value: 10 },
  { label: "November", value: 11 },
  { label: "December", value: 12 },
];

const getYearOptions = () => {
  const startYear = 2025;
  const currentYear = getCurrentYear();

  return Array.from({ length: currentYear - startYear + 1 }, (_, index) => ({
    label: String(startYear + index),
    value: startYear + index,
  }));
};

const EMPTY_SUMMARY: MonthlySummary = {
  totalSales: 0,
  totalCash: 0,
  totalPhonePe: 0,
  totalCollection: 0,
  totalExpense: 0,
  totalProfit: 0,
  totalFixedExpense: 0,
  netProfit: 0,
};

export default function DashboardPage({ user, onLogout }: DashboardPageProps) {
  const isOnline = useOnlineStatus();

  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [ledgerSection, setLedgerSection] = useState<"sales" | "purchases">(
    "sales",
  );
  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());

  const yearOptions = useMemo(() => getYearOptions(), []);

  const monthlyCacheKey = `saleledger-cache-monthly-${user.id}-${year}-${month}`;
  const yearlyCacheKey = `saleledger-cache-yearly-${user.id}-${year}`;
  const fixedExpenseCacheKey = `saleledger-cache-fixed-expense-${user.id}-${year}-${month}`;

  const [cachedEntries, setCachedEntries] = useLocalStorage<DailyEntry[]>(
    monthlyCacheKey,
    [],
  );

  const [cachedYearlyRows, setCachedYearlyRows] = useLocalStorage<
    YearlyMonthSummary[]
  >(yearlyCacheKey, []);

  const [cachedFixedExpense, setCachedFixedExpense] =
    useLocalStorage<FixedMonthlyExpense | null>(fixedExpenseCacheKey, null);

  const [entries, setEntries] = useState<DailyEntry[]>(cachedEntries);
  const [yearlyRows, setYearlyRows] =
    useState<YearlyMonthSummary[]>(cachedYearlyRows);

  const [fixedExpense, setFixedExpense] = useState<FixedMonthlyExpense | null>(
    cachedFixedExpense,
  );

  const [editingEntry, setEditingEntry] = useState<DailyEntry | null>(null);
  const [yearlySummary, setYearlySummary] =
    useState<MonthlySummary>(EMPTY_SUMMARY);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFixedExpenseSaving, setIsFixedExpenseSaving] = useState(false);

  const fetchMonthlyEntries = async () => {
    if (!isOnline) {
      setEntries(cachedEntries);
      setFixedExpense(cachedFixedExpense);
      return;
    }

    const [serverEntries, serverFixedExpense] = await Promise.all([
      getEntries(month, year),
      getFixedMonthlyExpense(month, year),
    ]);

    setEntries(serverEntries);
    setCachedEntries(serverEntries);

    setFixedExpense(serverFixedExpense);
    setCachedFixedExpense(serverFixedExpense);
  };

  const fetchYearlyEntries = async () => {
    if (!isOnline) {
      setYearlyRows(cachedYearlyRows);
      return;
    }

    const response = await getYearlySummary(year);

    setYearlyRows(response.months);
    setYearlySummary(response.summary);
    setCachedYearlyRows(response.months);
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError("");

    try {
      if (viewMode === "monthly") {
        await fetchMonthlyEntries();
      } else {
        await fetchYearlyEntries();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to fetch entries");

      if (viewMode === "monthly") {
        setEntries(cachedEntries);
        setFixedExpense(cachedFixedExpense);
      } else {
        setYearlyRows(cachedYearlyRows);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, month, year, isOnline]);

  useEffect(() => {
    if (viewMode === "yearly") {
      setEditingEntry(null);
    }
  }, [viewMode]);

  const monthlySummary = useMemo(() => {
    const baseSummary = calculateMonthlySummary(entries);

    const totalFixedExpense = fixedExpense?.totalFixedExpense ?? 0;

    return {
      ...baseSummary,
      totalFixedExpense,
      netProfit: baseSummary.totalProfit - totalFixedExpense,
    };
  }, [entries, fixedExpense]);

  const summary = viewMode === "monthly" ? monthlySummary : yearlySummary;

  const handleSubmit = async (payload: EntryPayload) => {
    setError("");

    try {
      if (editingEntry) {
        await updateEntry(editingEntry._id, payload);
        setEditingEntry(null);
      } else {
        await createEntry(payload);
      }

      await fetchDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save entry");
    }
  };

  const handleSaveFixedExpenses = async (
    payload: FixedMonthlyExpensePayload,
  ) => {
    setError("");
    setIsFixedExpenseSaving(true);

    try {
      const savedFixedExpense = await upsertFixedMonthlyExpense(
        month,
        year,
        payload,
      );

      setFixedExpense(savedFixedExpense);
      setCachedFixedExpense(savedFixedExpense);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save fixed expenses",
      );
    } finally {
      setIsFixedExpenseSaving(false);
    }
  };

  const handleDelete = async (entry: DailyEntry) => {
    const confirmed = window.confirm(
      `Delete entry for ${entry.date}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteEntry(entry._id);
      await fetchDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete entry");
    }
  };

  const handleLogout = () => {
    clearToken();
    onLogout();
  };

  return (
    <main className="app-shell">
      <Header user={user} isOnline={isOnline} onLogout={handleLogout} />

      <OfflineBanner isOnline={isOnline} />

      <nav className="ledger-tabs" aria-label="Ledger section">
        <button
          type="button"
          className={ledgerSection === "sales" ? "active" : ""}
          onClick={() => setLedgerSection("sales")}
        >
          Sales
        </button>
        <button
          type="button"
          className={ledgerSection === "purchases" ? "active" : ""}
          onClick={() => setLedgerSection("purchases")}
        >
          Purchases
        </button>
      </nav>

      {ledgerSection === "purchases" ? (
        <PurchaseDashboard isOnline={isOnline} />
      ) : (
        <>

      <section className="card filter-card">
        <div className="filter-card-header">
          <p className="section-kicker">Filter</p>
          <h2>{viewMode === "monthly" ? "Monthly View" : "Yearly View"}</h2>
        </div>

        <div className="filter-controls">
          <CustomSelect
            className="view-select"
            label="View"
            value={viewMode}
            options={VIEW_MODE_OPTIONS}
            onChange={setViewMode}
          />

          {viewMode === "monthly" ? (
            <CustomSelect
              label="Month"
              value={month}
              options={MONTH_OPTIONS}
              onChange={setMonth}
            />
          ) : null}

          <CustomSelect
            label="Year"
            value={year}
            options={yearOptions}
            onChange={setYear}
          />
        </div>
      </section>

      {error ? <p className="error-message">{error}</p> : null}

      <SummaryCards
        summary={summary}
        isLoading={isLoading}
        fixedExpense={viewMode === "monthly" ? fixedExpense : null}
        totalFixedExpense={
          viewMode === "yearly" ? (summary.totalFixedExpense ?? 0) : undefined
        }
        canEditFixedExpenses={viewMode === "monthly"}
        isFixedExpenseSaving={isFixedExpenseSaving}
        onSaveFixedExpenses={handleSaveFixedExpenses}
      />

      <div
        className={
          viewMode === "yearly"
            ? "dashboard-grid yearly-dashboard-grid entry-wrapper"
            : "dashboard-grid entry-wrapper"
        }
      >
        {viewMode === "monthly" ? (
          <EntryForm
            editingEntry={editingEntry}
            isOnline={isOnline}
            onCancelEdit={() => setEditingEntry(null)}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        ) : null}

        <EntryTable
          viewMode={viewMode}
          entries={entries}
          yearlyRows={yearlyRows}
          summary={summary}
          fixedExpense={viewMode === "monthly" ? fixedExpense : null}
          isOnline={isOnline}
          month={month}
          year={year}
          onEdit={setEditingEntry}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      </div>
        </>
      )}
    </main>
  );
}
