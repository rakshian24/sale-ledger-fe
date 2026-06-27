import { useEffect, useMemo, useState } from "react";
import { clearToken } from "../api/apiClient";
import {
  createEntry,
  deleteEntry,
  getEntries,
  updateEntry,
} from "../api/entryApi";
import EntryForm from "../components/EntryForm";
import EntryTable from "../components/EntryTable";
import Header from "../components/Header";
import OfflineBanner from "../components/OfflineBanner";
import SummaryCards from "../components/SummaryCards";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import type { User } from "../types/auth";
import type { DailyEntry, EntryPayload } from "../types/entry";
import { calculateMonthlySummary } from "../utils/calculations";
import CustomSelect from "../components/CustomSelect";

type DashboardPageProps = {
  user: User;
  onLogout: () => void;
};

const getCurrentMonth = () => new Date().getMonth() + 1;
const getCurrentYear = () => new Date().getFullYear();

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

export default function DashboardPage({ user, onLogout }: DashboardPageProps) {
  const isOnline = useOnlineStatus();

  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());

  const yearOptions = useMemo(() => getYearOptions(), []);

  const cacheKey = `saleledger-cache-${user.id}-${year}-${month}`;

  const [cachedEntries, setCachedEntries] = useLocalStorage<DailyEntry[]>(
    cacheKey,
    [],
  );

  const [entries, setEntries] = useState<DailyEntry[]>(cachedEntries);
  const [editingEntry, setEditingEntry] = useState<DailyEntry | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchEntries = async () => {
    if (!isOnline) {
      setEntries(cachedEntries);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const serverEntries = await getEntries(month, year);
      setEntries(serverEntries);
      setCachedEntries(serverEntries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to fetch entries");
      setEntries(cachedEntries);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, isOnline]);

  const summary = useMemo(() => calculateMonthlySummary(entries), [entries]);

  const handleSubmit = async (payload: EntryPayload) => {
    setError("");

    try {
      if (editingEntry) {
        await updateEntry(editingEntry._id, payload);
        setEditingEntry(null);
      } else {
        await createEntry(payload);
      }

      await fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save entry");
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
      await fetchEntries();
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

      <section className="card filter-card">
        <div className="filter-card-header">
          <p className="section-kicker">Filter</p>
          <h2>Monthly View</h2>
        </div>

        <div className="filter-controls">
          <CustomSelect
            label="Month"
            value={month}
            options={MONTH_OPTIONS}
            onChange={setMonth}
          />

          <CustomSelect
            label="Year"
            value={year}
            options={yearOptions}
            onChange={setYear}
          />
        </div>
      </section>

      {isLoading ? <p className="status-message">Loading entries...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      <SummaryCards summary={summary} />

      <div className="dashboard-grid">
        <EntryForm
          editingEntry={editingEntry}
          isOnline={isOnline}
          onCancelEdit={() => setEditingEntry(null)}
          onSubmit={handleSubmit}
        />

        <EntryTable
          entries={entries}
          isOnline={isOnline}
          month={month}
          year={year}
          onEdit={setEditingEntry}
          onDelete={handleDelete}
        />
      </div>
    </main>
  );
}
