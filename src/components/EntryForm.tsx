import { useEffect, useState } from "react";
import type { DailyEntry, EntryFormState, EntryPayload } from "../types/entry";
import {
  calculateEntryProfit,
  calculateEntryTotal,
} from "../utils/calculations";
import { formatCurrency, getTodayDateInputValue } from "../utils/formatters";

type EntryFormProps = {
  editingEntry: DailyEntry | null;
  isOnline: boolean;
  onCancelEdit: () => void;
  onSubmit: (payload: EntryPayload) => Promise<void>;
};

const defaultForm: EntryFormState = {
  date: getTodayDateInputValue(),
  salesCount: 0,
  cash: 0,
  phonePe: 0,
  expense: 0,
  isHoliday: false,
  note: "",
};

export default function EntryForm({
  editingEntry,
  isOnline,
  onCancelEdit,
  onSubmit,
}: EntryFormProps) {
  const [form, setForm] = useState<EntryFormState>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingEntry) {
      setForm({
        date: editingEntry.date,
        salesCount: editingEntry.salesCount ?? 0,
        cash: editingEntry.cash,
        phonePe: editingEntry.phonePe,
        expense: editingEntry.expense,
        isHoliday: editingEntry.isHoliday,
        note: editingEntry.note || "",
      });
    }
  }, [editingEntry]);

  const updateNumber = (
    field: "salesCount" | "cash" | "phonePe" | "expense",
    value: string,
  ) => {
    const nextValue = Number(value);

    setForm((prev) => ({
      ...prev,
      [field]: Number.isNaN(nextValue) || nextValue < 0 ? 0 : nextValue,
    }));
  };

  const updateHoliday = (checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      isHoliday: checked,
      salesCount: checked ? 0 : prev.salesCount,
      cash: checked ? 0 : prev.cash,
      phonePe: checked ? 0 : prev.phonePe,
      expense: checked ? 0 : prev.expense,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isOnline) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(form);

      if (!editingEntry) {
        setForm(defaultForm);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const total = calculateEntryTotal(form);
  const profit = calculateEntryProfit(form);

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <p className="section-kicker">{editingEntry ? "Edit" : "Add"}</p>
          <h2>{editingEntry ? "Edit Daily Entry" : "Add Daily Entry"}</h2>
        </div>
      </div>

      <form className="entry-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Date</span>
          <input
            type="date"
            value={form.date}
            disabled={!isOnline}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, date: event.target.value }))
            }
          />
        </label>

        <label className="field">
          <span>Number of Sales</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={form.salesCount === 0 ? "" : form.salesCount}
            disabled={!isOnline || form.isHoliday}
            onChange={(event) => updateNumber("salesCount", event.target.value)}
            placeholder="Example: 25"
          />
        </label>

        <label className="field">
          <span>Cash Collection</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={form.cash === 0 ? "" : form.cash}
            disabled={!isOnline || form.isHoliday}
            onChange={(event) => updateNumber("cash", event.target.value)}
            placeholder="Example: 1530"
          />
        </label>

        <label className="field">
          <span>PhonePe / UPI Collection</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={form.phonePe === 0 ? "" : form.phonePe}
            disabled={!isOnline || form.isHoliday}
            onChange={(event) => updateNumber("phonePe", event.target.value)}
            placeholder="Example: 525"
          />
        </label>

        <label className="field">
          <span>Expense</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={form.expense === 0 ? "" : form.expense}
            disabled={!isOnline || form.isHoliday}
            onChange={(event) => updateNumber("expense", event.target.value)}
            placeholder="Example: 670"
          />
        </label>

        <label className="field">
          <span>Note</span>
          <input
            type="text"
            value={form.note || ""}
            disabled={!isOnline}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, note: event.target.value }))
            }
            placeholder="Example: Holiday / normal day"
          />
        </label>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={form.isHoliday}
            disabled={!isOnline}
            onChange={(event) => updateHoliday(event.target.checked)}
          />
          <span>Mark as holiday / closed day</span>
        </label>

        <div className="calculated-preview">
          <div>
            <span>Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>

          <div>
            <span>Profit</span>
            <strong>{formatCurrency(profit)}</strong>
          </div>
        </div>

        <div className="actions">
          <button type="submit" disabled={!isOnline || isSubmitting}>
            {editingEntry ? "Update Entry" : "Save Entry"}
          </button>

          {editingEntry ? (
            <button
              type="button"
              className="secondary-button"
              onClick={onCancelEdit}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
