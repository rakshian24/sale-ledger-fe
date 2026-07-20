import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createPurchase,
  createPurchaseCategory,
  createPurchaseProduct,
  deletePurchase,
  downloadPurchasePdfReport,
  getProductPurchaseHistory,
  getPurchaseCategories,
  getPurchases,
  getPurchaseProducts,
  getPurchaseSummary,
  updatePurchase,
} from "../api/purchaseApi";
import type {
  CategoryPurchaseTotal,
  ProductHistoryResponse,
  Purchase,
  PurchaseCategory,
  PurchasePayload,
  PurchaseProduct,
  PurchaseSummary,
} from "../types/purchase";
import {
  formatCurrency,
  formatDateDDMMMYYYY,
  getTodayDateInputValue,
} from "../utils/formatters";

type PurchaseDashboardProps = {
  isOnline: boolean;
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

const getMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const localDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  return {
    from: localDate(new Date(year, month, 1)),
    to: localDate(new Date(year, month + 1, 0)),
  };
};

const EMPTY_SUMMARY: PurchaseSummary = {
  totalSpent: 0,
  purchaseCount: 0,
  totalQuantity: 0,
};

const emptyPurchaseForm = (): PurchasePayload => ({
  purchaseDate: getTodayDateInputValue(),
  productId: "",
  quantity: 0,
  unit: "kg",
  unitPrice: 0,
  supplier: "",
  note: "",
});

type PurchaseItemDraft = Pick<
  PurchasePayload,
  "productId" | "quantity" | "unit" | "unitPrice"
>;

const emptyPurchaseItem = (): PurchaseItemDraft => ({
  productId: "",
  quantity: 0,
  unit: "kg",
  unitPrice: 0,
});

const getDatesInRange = (from: string, to: string) => {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  ) {
    return [];
  }

  const dates: string[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
};

const getDairyLitres = (
  categoryName: string,
  productName: string,
  quantity: number,
  unit: string,
) => {
  if (
    categoryName.trim().toLocaleLowerCase("en-IN") !== "dairy" ||
    unit.trim().toLocaleLowerCase("en-IN") !== "packets"
  ) {
    return null;
  }

  const volumeMatch = productName.match(/\b(200|500)\s*ml\b/i);
  if (!volumeMatch) return null;

  return quantity * (Number(volumeMatch[1]) / 1000);
};

const formatLitres = (value: number) =>
  `${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 3,
  }).format(value)} L`;

export default function PurchaseDashboard({
  isOnline,
}: PurchaseDashboardProps) {
  const initialRange = useMemo(getMonthRange, []);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [categories, setCategories] = useState<PurchaseCategory[]>([]);
  const [products, setProducts] = useState<PurchaseProduct[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [summary, setSummary] = useState<PurchaseSummary>(EMPTY_SUMMARY);
  const [categoryTotals, setCategoryTotals] = useState<CategoryPurchaseTotal[]>(
    [],
  );
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(
    null,
  );
  const [expandedPurchaseDates, setExpandedPurchaseDates] = useState<
    Set<string>
  >(new Set());
  const [selectedPurchaseDate, setSelectedPurchaseDate] = useState<
    string | null
  >(null);
  const [selectedPurchaseEntry, setSelectedPurchaseEntry] =
    useState<Purchase | null>(null);
  const lastTappedPurchaseIdRef = useRef<string | null>(null);
  const lastPurchaseTapTimeRef = useRef(0);
  const purchaseDoubleTapTimerRef = useRef<number | null>(null);
  const [history, setHistory] = useState<ProductHistoryResponse | null>(null);
  const [historyProductId, setHistoryProductId] = useState("");
  const [form, setForm] = useState<PurchasePayload>(emptyPurchaseForm);
  const [batchDate, setBatchDate] = useState(getTodayDateInputValue());
  const [batchSupplier, setBatchSupplier] = useState("");
  const [batchNote, setBatchNote] = useState("");
  const [batchItems, setBatchItems] = useState<PurchaseItemDraft[]>([
    emptyPurchaseItem(),
  ]);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [productForm, setProductForm] = useState({
    name: "",
    categoryId: "",
    defaultUnit: "kg",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [error, setError] = useState("");

  const loadReferenceData = useCallback(async () => {
    const [nextCategories, nextProducts] = await Promise.all([
      getPurchaseCategories(),
      getPurchaseProducts(),
    ]);
    setCategories(nextCategories);
    setProducts(nextProducts);
    setProductForm((current) => ({
      ...current,
      categoryId: current.categoryId || nextCategories[0]?._id || "",
    }));
  }, []);

  const loadPurchases = useCallback(async () => {
    const [nextPurchases, summaryResponse] = await Promise.all([
      getPurchases(from, to),
      getPurchaseSummary(from, to),
    ]);
    setPurchases(nextPurchases);
    setSummary(summaryResponse.summary);
    setCategoryTotals(summaryResponse.categoryTotals);
  }, [from, to]);

  const loadAll = useCallback(async () => {
    if (!isOnline) return;
    setIsLoading(true);
    setError("");
    try {
      await Promise.all([loadReferenceData(), loadPurchases()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load purchases");
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, loadPurchases, loadReferenceData]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!historyProductId || !isOnline) {
      setHistory(null);
      return;
    }
    getProductPurchaseHistory(historyProductId, from, to)
      .then(setHistory)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Unable to load price history",
        ),
      );
  }, [historyProductId, from, to, isOnline, purchases]);

  useEffect(() => {
    if (!selectedPurchaseDate) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedPurchaseDate(null);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [selectedPurchaseDate]);

  useEffect(() => {
    if (!selectedPurchaseEntry) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedPurchaseEntry(null);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedPurchaseEntry]);

  useEffect(() => {
    return () => {
      if (purchaseDoubleTapTimerRef.current !== null) {
        window.clearTimeout(purchaseDoubleTapTimerRef.current);
      }
    };
  }, []);

  const submitCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!categoryName.trim()) return;
    setIsSaving(true);
    setError("");
    try {
      await createPurchaseCategory(categoryName.trim());
      setCategoryName("");
      await loadReferenceData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create category",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const submitProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!productForm.name.trim() || !productForm.categoryId) return;
    setIsSaving(true);
    setError("");
    try {
      await createPurchaseProduct(productForm);
      setProductForm((current) => ({ ...current, name: "" }));
      await loadReferenceData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create product");
    } finally {
      setIsSaving(false);
    }
  };

  const submitPurchase = async (event: React.FormEvent) => {
    event.preventDefault();

    const validBatchItems = batchItems.filter(
      (item) => item.productId && item.quantity > 0,
    );

    if (
      editing
        ? !form.productId || form.quantity <= 0
        : validBatchItems.length !== batchItems.length
    ) {
      setError("Complete the product and quantity for every purchase item");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      if (editing) {
        await updatePurchase(editing._id, form);
      } else {
        const results = await Promise.allSettled(
          validBatchItems.map((item) =>
            createPurchase({
              purchaseDate: batchDate,
              supplier: batchSupplier,
              note: batchNote,
              ...item,
            }),
          ),
        );

        const failedItems = validBatchItems.filter(
          (_, index) => results[index].status === "rejected",
        );

        if (failedItems.length > 0) {
          setBatchItems(failedItems);
          await loadPurchases();
          throw new Error(
            `${validBatchItems.length - failedItems.length} purchase(s) saved; ${failedItems.length} failed. Only the unsaved items remain in the form.`,
          );
        }
      }

      setEditing(null);
      setForm(emptyPurchaseForm());
      setBatchItems([emptyPurchaseItem()]);
      setBatchSupplier("");
      setBatchNote("");
      await loadPurchases();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save purchase");
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (purchase: Purchase) => {
    setEditing(purchase);
    setForm({
      purchaseDate: purchase.purchaseDate,
      productId: purchase.productId,
      quantity: purchase.quantity,
      unit: purchase.unit,
      unitPrice: purchase.unitPrice,
      supplier: purchase.supplier,
      note: purchase.note,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removePurchase = async (purchase: Purchase) => {
    if (!window.confirm(`Delete ${purchase.productName} purchase?`)) return;
    setError("");
    try {
      await deletePurchase(purchase._id);
      await loadPurchases();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete purchase",
      );
    }
  };

  const handlePurchaseRowTap = (purchase: Purchase) => {
    if (!window.matchMedia("(max-width: 980px)").matches) return;

    const now = Date.now();
    const purchaseId = String(purchase._id);
    const isSamePurchase = lastTappedPurchaseIdRef.current === purchaseId;
    const isWithinDoubleTapDelay = now - lastPurchaseTapTimeRef.current <= 350;

    if (isSamePurchase && isWithinDoubleTapDelay) {
      if (purchaseDoubleTapTimerRef.current !== null) {
        window.clearTimeout(purchaseDoubleTapTimerRef.current);
      }
      lastTappedPurchaseIdRef.current = null;
      lastPurchaseTapTimeRef.current = 0;
      purchaseDoubleTapTimerRef.current = null;
      setSelectedPurchaseEntry(purchase);
      return;
    }

    lastTappedPurchaseIdRef.current = purchaseId;
    lastPurchaseTapTimeRef.current = now;
    if (purchaseDoubleTapTimerRef.current !== null) {
      window.clearTimeout(purchaseDoubleTapTimerRef.current);
    }
    purchaseDoubleTapTimerRef.current = window.setTimeout(() => {
      lastTappedPurchaseIdRef.current = null;
      lastPurchaseTapTimeRef.current = 0;
      purchaseDoubleTapTimerRef.current = null;
    }, 350);
  };

  const editSelectedPurchase = () => {
    if (!selectedPurchaseEntry) return;
    const purchase = selectedPurchaseEntry;
    setSelectedPurchaseEntry(null);
    startEditing(purchase);
  };

  const deleteSelectedPurchase = () => {
    if (!selectedPurchaseEntry) return;
    const purchase = selectedPurchaseEntry;
    setSelectedPurchaseEntry(null);
    removePurchase(purchase);
  };

  const downloadReport = async () => {
    setError("");
    setIsDownloadingReport(true);
    try {
      const report = await downloadPurchasePdfReport(from, to);
      const url = URL.createObjectURL(report);
      const link = document.createElement("a");
      link.href = url;
      link.download = `purchase-report-${from}-to-${to}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to download purchase report",
      );
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const selectProduct = (productId: string) => {
    const product = products.find((item) => item._id === productId);
    setForm((current) => ({
      ...current,
      productId,
      unit: product?.defaultUnit || current.unit,
    }));
  };

  const updateBatchItem = (
    index: number,
    changes: Partial<PurchaseItemDraft>,
  ) => {
    setBatchItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    );
  };

  const selectBatchProduct = (index: number, productId: string) => {
    const product = products.find((item) => item._id === productId);
    updateBatchItem(index, {
      productId,
      unit: product?.defaultUnit || batchItems[index].unit,
    });
  };

  const addBatchItem = () => {
    setBatchItems((current) => [...current, emptyPurchaseItem()]);
  };

  const removeBatchItem = (index: number) => {
    setBatchItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const batchTotal = batchItems.reduce(
    (total, item) => total + item.quantity * item.unitPrice,
    0,
  );

  const categoryProductTotals = useMemo(() => {
    const grouped = new Map<
      string,
      {
        productId: string;
        productName: string;
        unit: string;
        totalQuantity: number;
        totalSpent: number;
        purchaseCount: number;
      }[]
    >();

    purchases.forEach((purchase) => {
      const categoryId = String(purchase.categoryId);
      const categoryProducts = grouped.get(categoryId) ?? [];
      const existingProduct = categoryProducts.find(
        (item) =>
          item.productId === String(purchase.productId) &&
          item.unit === purchase.unit,
      );

      if (existingProduct) {
        existingProduct.totalQuantity += purchase.quantity;
        existingProduct.totalSpent += purchase.totalAmount;
        existingProduct.purchaseCount += 1;
      } else {
        categoryProducts.push({
          productId: String(purchase.productId),
          productName: purchase.productName,
          unit: purchase.unit,
          totalQuantity: purchase.quantity,
          totalSpent: purchase.totalAmount,
          purchaseCount: 1,
        });
      }

      grouped.set(categoryId, categoryProducts);
    });

    grouped.forEach((items) =>
      items.sort((first, second) => second.totalSpent - first.totalSpent),
    );

    return grouped;
  }, [purchases]);

  const purchaseDays = useMemo(() => {
    const purchasedDates = new Set(purchases.map((item) => item.purchaseDate));

    return getDatesInRange(from, to).map((date) => ({
      date,
      dayNumber: Number(date.slice(8, 10)),
      hasPurchases: purchasedDates.has(date),
    }));
  }, [from, to, purchases]);

  const purchasedDayCount = purchaseDays.filter(
    (day) => day.hasPurchases,
  ).length;

  const selectedDayPurchases = selectedPurchaseDate
    ? purchases
        .filter((purchase) => purchase.purchaseDate === selectedPurchaseDate)
        .sort((first, second) => second.totalAmount - first.totalAmount)
    : [];

  const selectedDayTotal = selectedDayPurchases.reduce(
    (total, purchase) => total + purchase.totalAmount,
    0,
  );

  const purchasesByDate = useMemo(() => {
    const grouped = new Map<
      string,
      { date: string; purchases: Purchase[]; totalAmount: number }
    >();

    purchases.forEach((purchase) => {
      const group = grouped.get(purchase.purchaseDate) ?? {
        date: purchase.purchaseDate,
        purchases: [],
        totalAmount: 0,
      };
      group.purchases.push(purchase);
      group.totalAmount += purchase.totalAmount;
      grouped.set(purchase.purchaseDate, group);
    });

    return [...grouped.values()];
  }, [purchases]);

  const hasExpandedPurchaseRows = purchasesByDate.some((group) =>
    expandedPurchaseDates.has(group.date),
  );

  const togglePurchaseDate = (date: string) => {
    setExpandedPurchaseDates((current) => {
      const next = new Set(current);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  return (
    <div className="purchase-dashboard">
      <section className="card purchase-filter-card">
        <div>
          <p className="section-kicker">Purchase period</p>
          <h2>Purchase Report</h2>
        </div>
        <div className="purchase-report-controls">
          <button
            type="button"
            className="download-report-button purchase-report-download"
            disabled={
              !isOnline || isDownloadingReport || purchases.length === 0
            }
            onClick={downloadReport}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3V15M12 15L7 10M12 15L17 10"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5 20H19"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
            {isDownloadingReport
              ? "Preparing report..."
              : "Download Purchased Report"}
          </button>
          <div className="purchase-date-filters">
            <label className="field">
              <span>From</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="field">
              <span>To</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
        </div>
      </section>

      {error ? <p className="error-message">{error}</p> : null}

      <section className="summary-grid purchase-summary-grid">
        <article className="summary-card">
          <span>Total purchased</span>
          <strong>{formatCurrency(summary.totalSpent)}</strong>
        </article>
        <article className="summary-card">
          <span>Purchase entries</span>
          <strong>{summary.purchaseCount}</strong>
        </article>
        <article className="summary-card">
          <span>Highest-spend category</span>
          <strong>{categoryTotals[0]?.categoryName || "—"}</strong>
          <small>
            {categoryTotals[0]
              ? formatCurrency(categoryTotals[0].totalSpent)
              : "No purchases"}
          </small>
        </article>
        <article className="summary-card purchase-days-card">
          <div className="purchase-days-heading">
            <span>Days purchased</span>
            <strong>
              {purchasedDayCount}/{purchaseDays.length}
            </strong>
          </div>
          <div className="purchase-days-grid">
            {purchaseDays.map((day) => (
              <button
                type="button"
                key={day.date}
                className={
                  day.hasPurchases
                    ? "purchase-day purchased"
                    : "purchase-day not-purchased"
                }
                title={`${formatDateDDMMMYYYY(day.date)}: ${
                  day.hasPurchases ? "purchased" : "no purchases"
                }`}
                aria-label={`View ${
                  day.hasPurchases ? "purchases" : "no purchases"
                } for ${formatDateDDMMMYYYY(day.date)}`}
                onClick={() => setSelectedPurchaseDate(day.date)}
              >
                {day.dayNumber}
              </button>
            ))}
          </div>
          <div className="purchase-days-legend">
            <span>
              <i className="purchased" /> Purchased
            </span>
            <span>
              <i className="not-purchased" /> Not purchased
            </span>
          </div>
        </article>
      </section>

      <div className="purchase-main-grid">
        <section className="card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">{editing ? "Edit" : "Add"}</p>
              <h2>{editing ? "Edit Purchase" : "New Purchase"}</h2>
            </div>
          </div>
          {products.length === 0 ? (
            <p className="empty-state">Create a category and product first.</p>
          ) : null}
          <form className="entry-form" onSubmit={submitPurchase}>
            <label className="field">
              <span>Date</span>
              <input
                required
                type="date"
                value={editing ? form.purchaseDate : batchDate}
                onChange={(event) =>
                  editing
                    ? setForm({ ...form, purchaseDate: event.target.value })
                    : setBatchDate(event.target.value)
                }
              />
            </label>

            {editing ? (
              <>
                <label className="field">
                  <span>Product</span>
                  <select
                    required
                    value={form.productId}
                    onChange={(e) => selectProduct(e.target.value)}
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="purchase-form-row">
                  <label className="field">
                    <span>Quantity</span>
                    <input
                      required
                      min="0.001"
                      step="any"
                      type="number"
                      value={form.quantity || ""}
                      onChange={(e) =>
                        setForm({ ...form, quantity: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Unit</span>
                    <input
                      required
                      value={form.unit}
                      placeholder="kg, piece, litre"
                      onChange={(e) =>
                        setForm({ ...form, unit: e.target.value })
                      }
                    />
                  </label>
                </div>
                <label className="field">
                  <span>Price per unit</span>
                  <input
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    value={form.unitPrice || ""}
                    onChange={(e) =>
                      setForm({ ...form, unitPrice: Number(e.target.value) })
                    }
                  />
                </label>
              </>
            ) : (
              <div className="purchase-items-editor">
                {batchItems.map((item, index) => (
                  <div className="purchase-item-row" key={index}>
                    <div className="purchase-item-heading">
                      <strong>Item {index + 1}</strong>
                      {batchItems.length > 1 ? (
                        <button
                          type="button"
                          className="remove-purchase-item"
                          aria-label={`Remove item ${index + 1}`}
                          onClick={() => removeBatchItem(index)}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <label className="field">
                      <span>Product</span>
                      <select
                        required
                        value={item.productId}
                        onChange={(e) =>
                          selectBatchProduct(index, e.target.value)
                        }
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product._id} value={product._id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="purchase-form-row">
                      <label className="field">
                        <span>Quantity</span>
                        <input
                          required
                          min="0.001"
                          step="any"
                          type="number"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            updateBatchItem(index, {
                              quantity: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Unit</span>
                        <input
                          required
                          value={item.unit}
                          placeholder="kg, piece, litre"
                          onChange={(e) =>
                            updateBatchItem(index, { unit: e.target.value })
                          }
                        />
                      </label>
                    </div>
                    <label className="field">
                      <span>Price per unit</span>
                      <input
                        required
                        min="0"
                        step="0.01"
                        type="number"
                        value={item.unitPrice || ""}
                        onChange={(e) =>
                          updateBatchItem(index, {
                            unitPrice: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <div className="purchase-item-subtotal">
                      <span>Item total</span>
                      <strong>
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </strong>
                    </div>
                  </div>
                ))}
                <button
                  className="add-purchase-item secondary-button"
                  type="button"
                  disabled={!isOnline || isSaving || products.length === 0}
                  onClick={addBatchItem}
                >
                  + Add another item
                </button>
              </div>
            )}

            <label className="field">
              <span>Supplier (optional)</span>
              <input
                value={editing ? form.supplier : batchSupplier}
                onChange={(e) =>
                  editing
                    ? setForm({ ...form, supplier: e.target.value })
                    : setBatchSupplier(e.target.value)
                }
              />
            </label>
            <label className="field">
              <span>Note (optional)</span>
              <textarea
                rows={2}
                value={editing ? form.note : batchNote}
                onChange={(e) =>
                  editing
                    ? setForm({ ...form, note: e.target.value })
                    : setBatchNote(e.target.value)
                }
              />
            </label>
            <div className="calculated-preview">
              <div>
                <span>{editing ? "Purchase total" : "All items total"}</span>
                <strong>
                  {formatCurrency(
                    editing ? form.quantity * form.unitPrice : batchTotal,
                  )}
                </strong>
              </div>
            </div>
            <div className="actions">
              <button
                disabled={!isOnline || isSaving || products.length === 0}
                type="submit"
              >
                {editing
                  ? "Update Purchase"
                  : `Save ${batchItems.length} Purchase${batchItems.length === 1 ? "" : "s"}`}
              </button>
              {editing ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setForm(emptyPurchaseForm());
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="card purchase-setup-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Setup</p>
              <h2>Categories & Products</h2>
            </div>
          </div>
          <form className="compact-setup-form" onSubmit={submitCategory}>
            <label className="field">
              <span>New category</span>
              <input
                value={categoryName}
                placeholder="Eg: Vegetables"
                onChange={(e) => setCategoryName(e.target.value)}
              />
            </label>
            <button
              disabled={!isOnline || isSaving || !categoryName.trim()}
              type="submit"
            >
              Add Category
            </button>
          </form>
          <div className="purchase-chip-list">
            {categories.map((category) => (
              <span className="purchase-chip" key={category._id}>
                {category.name}
              </span>
            ))}
          </div>
          <form
            className="compact-setup-form product-setup-form"
            onSubmit={submitProduct}
          >
            <label className="field">
              <span>Product name</span>
              <input
                value={productForm.name}
                placeholder="Eg: Beans"
                onChange={(e) =>
                  setProductForm({ ...productForm, name: e.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Category</span>
              <select
                value={productForm.categoryId}
                onChange={(e) =>
                  setProductForm({ ...productForm, categoryId: e.target.value })
                }
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Default unit</span>
              <input
                value={productForm.defaultUnit}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    defaultUnit: e.target.value,
                  })
                }
              />
            </label>
            <button
              disabled={
                !isOnline ||
                isSaving ||
                !productForm.name.trim() ||
                !productForm.categoryId
              }
              type="submit"
            >
              Add Product
            </button>
          </form>
        </section>
      </div>

      <section className="card records-card">
        <div className="section-heading records-heading">
          <div>
            <p className="section-kicker">History</p>
            <h2>Purchase Entries</h2>
          </div>
        </div>
        {isLoading ? (
          <div className="records-loader" />
        ) : purchases.length === 0 ? (
          <p className="empty-state">No purchases in this period.</p>
        ) : (
          <div className="table-wrapper">
            <table
              className={`entries-table purchase-table${
                hasExpandedPurchaseRows ? "" : " purchase-table-collapsed"
              }`}
            >
              <thead>
                <tr>
                  <th>Date</th>
                  <th>{hasExpandedPurchaseRows ? "Product" : "Entries"}</th>
                  {hasExpandedPurchaseRows ? (
                    <>
                      <th>Category</th>
                      <th>Quantity</th>
                      <th>Unit price</th>
                    </>
                  ) : null}
                  <th>Total</th>
                  {hasExpandedPurchaseRows ? <th>Supplier</th> : null}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchasesByDate.map((dateGroup) => {
                  const isExpanded = expandedPurchaseDates.has(dateGroup.date);

                  return (
                    <Fragment key={dateGroup.date}>
                      <tr
                        className="purchase-date-summary-row"
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        onClick={() => togglePurchaseDate(dateGroup.date)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            togglePurchaseDate(dateGroup.date);
                          }
                        }}
                      >
                        <td>
                          <strong>{formatDateDDMMMYYYY(dateGroup.date)}</strong>
                        </td>
                        <td>
                          <strong>{dateGroup.purchases.length} entries</strong>
                        </td>
                        {hasExpandedPurchaseRows ? (
                          <>
                            <td />
                            <td />
                            <td />
                          </>
                        ) : null}
                        <td>
                          <strong>
                            {formatCurrency(dateGroup.totalAmount)}
                          </strong>
                        </td>
                        {hasExpandedPurchaseRows ? <td /> : null}
                        <td>
                          <span
                            className="purchase-date-expand-icon"
                            aria-hidden="true"
                          >
                            {isExpanded ? "−" : "+"}
                          </span>
                        </td>
                      </tr>

                      {isExpanded
                        ? dateGroup.purchases.map((purchase) => (
                            <tr
                              className="purchase-date-detail-row purchase-entry-data-row"
                              key={purchase._id}
                              tabIndex={0}
                              aria-label={`Double tap or double click to view details for ${purchase.productName}`}
                              onClick={() => handlePurchaseRowTap(purchase)}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" &&
                                  window.matchMedia("(max-width: 980px)")
                                    .matches
                                ) {
                                  event.preventDefault();
                                  setSelectedPurchaseEntry(purchase);
                                }
                              }}
                            >
                              <td>
                                <span className="purchase-detail-marker">
                                  ↳
                                </span>
                              </td>
                              <td>{purchase.productName}</td>
                              {hasExpandedPurchaseRows ? (
                                <>
                                  <td>{purchase.categoryName}</td>
                                  <td>
                                    {purchase.quantity} {purchase.unit}
                                  </td>
                                  <td>{formatCurrency(purchase.unitPrice)}</td>
                                </>
                              ) : null}
                              <td>
                                <strong>
                                  {formatCurrency(purchase.totalAmount)}
                                </strong>
                              </td>
                              {hasExpandedPurchaseRows ? (
                                <td>{purchase.supplier || "—"}</td>
                              ) : null}
                              <td>
                                <div className="table-actions">
                                  <button
                                    type="button"
                                    className="table-action-button edit-action-button"
                                    disabled={!isOnline}
                                    aria-label={`Edit ${purchase.productName} purchase for ${formatDateDDMMMYYYY(purchase.purchaseDate)}`}
                                    title="Edit purchase"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      startEditing(purchase);
                                    }}
                                  >
                                    <span className="table-action-text">
                                      Edit
                                    </span>
                                    <span className="table-action-icon">
                                      <PencilActionIcon />
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    className="table-action-button delete-action-button danger-button"
                                    disabled={!isOnline}
                                    aria-label={`Delete ${purchase.productName} purchase for ${formatDateDDMMMYYYY(purchase.purchaseDate)}`}
                                    title="Delete purchase"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      removePurchase(purchase);
                                    }}
                                  >
                                    <span className="table-action-text">
                                      Delete
                                    </span>
                                    <span className="table-action-icon">
                                      <TrashActionIcon />
                                    </span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        : null}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td>Total</td>
                  <td colSpan={hasExpandedPurchaseRows ? 4 : 1}>
                    {purchases.length} entries
                  </td>
                  <td>{formatCurrency(summary.totalSpent)}</td>
                  <td colSpan={hasExpandedPurchaseRows ? 2 : 1} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <div className="purchase-report-grid">
        <section className="card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Spending</p>
              <h2>By Category</h2>
            </div>
          </div>
          {categoryTotals.length === 0 ? (
            <p className="empty-state">No category spending yet.</p>
          ) : (
            <div className="category-spend-list">
              {categoryTotals.map((category) => {
                const categoryId = String(category._id);
                const isExpanded = expandedCategoryId === categoryId;
                const productTotals =
                  categoryProductTotals.get(categoryId) ?? [];

                return (
                  <div className="category-spend-group" key={categoryId}>
                    <button
                      type="button"
                      className="category-spend-row"
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setExpandedCategoryId(isExpanded ? null : categoryId)
                      }
                    >
                      <span>
                        {category.categoryName}
                        <small>{category.purchaseCount} entries</small>
                      </span>
                      <span className="category-spend-value">
                        <strong>{formatCurrency(category.totalSpent)}</strong>
                        <span
                          className="category-expand-icon"
                          aria-hidden="true"
                        >
                          {isExpanded ? "−" : "+"}
                        </span>
                      </span>
                    </button>

                    {isExpanded ? (
                      <div className="category-product-breakdown">
                        <div className="category-product-heading">
                          <span>Product</span>
                          <span>Quantity</span>
                          <span>Total</span>
                        </div>
                        {productTotals.map((item) => {
                          const dairyLitres = getDairyLitres(
                            category.categoryName,
                            item.productName,
                            item.totalQuantity,
                            item.unit,
                          );

                          return (
                            <div
                              className="category-product-row"
                              key={`${item.productId}-${item.unit}`}
                            >
                              <span>
                                <strong>{item.productName}</strong>
                                <small>{item.purchaseCount} entries</small>
                              </span>
                              <span className="category-product-quantity">
                                <strong>
                                  {item.totalQuantity} {item.unit}
                                </strong>
                                {dairyLitres !== null ? (
                                  <small>{formatLitres(dairyLitres)}</small>
                                ) : null}
                              </span>
                              <strong>{formatCurrency(item.totalSpent)}</strong>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <section className="card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Product report</p>
              <h2>Price History</h2>
            </div>
          </div>
          <label className="field">
            <span>Product</span>
            <select
              value={historyProductId}
              onChange={(e) => setHistoryProductId(e.target.value)}
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          {history ? (
            <>
              <div className="price-stats">
                <div>
                  <span>Quantity</span>
                  <strong>{history.summary.totalQuantity}</strong>
                </div>
                <div>
                  <span>Total spent</span>
                  <strong>{formatCurrency(history.summary.totalSpent)}</strong>
                </div>
                <div>
                  <span>Average price</span>
                  <strong>
                    {formatCurrency(history.summary.averageUnitPrice)}
                  </strong>
                </div>
                <div>
                  <span>Price range</span>
                  <strong>
                    {formatCurrency(history.summary.lowestUnitPrice)} –{" "}
                    {formatCurrency(history.summary.highestUnitPrice)}
                  </strong>
                </div>
              </div>
              <div className="price-history-list">
                {history.priceHistory.map((row) => (
                  <div key={row._id}>
                    <span>{formatDateDDMMMYYYY(row.purchaseDate)}</span>
                    <span>
                      {row.quantity} {row.unit}
                    </span>
                    <strong>
                      {formatCurrency(row.unitPrice)}/{row.unit}
                    </strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="empty-state purchase-history-empty">
              Select a product to inspect its historic prices.
            </p>
          )}
        </section>
      </div>

      {selectedPurchaseEntry ? (
        <div
          className="entry-details-backdrop"
          role="presentation"
          onMouseDown={() => setSelectedPurchaseEntry(null)}
        >
          <section
            className="entry-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-entry-details-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="entry-details-modal-header">
              <div>
                <p className="section-kicker">Purchase entry</p>
                <h2 id="purchase-entry-details-title">Purchase Details</h2>
              </div>
              <button
                type="button"
                className="entry-details-close-button"
                onClick={() => setSelectedPurchaseEntry(null)}
                aria-label="Close purchase details"
                title="Close"
              >
                <CloseIcon />
              </button>
            </header>

            <div className="entry-details-list">
              <div className="entry-details-row">
                <span>Date</span>
                <strong>
                  {formatDateDDMMMYYYY(selectedPurchaseEntry.purchaseDate)}
                </strong>
              </div>
              <div className="entry-details-row">
                <span>Product</span>
                <strong>{selectedPurchaseEntry.productName}</strong>
              </div>
              <div className="entry-details-row">
                <span>Category</span>
                <strong>{selectedPurchaseEntry.categoryName}</strong>
              </div>
              <div className="entry-details-row">
                <span>Quantity</span>
                <strong>
                  {selectedPurchaseEntry.quantity} {selectedPurchaseEntry.unit}
                </strong>
              </div>
              <div className="entry-details-row">
                <span>Unit price</span>
                <strong>
                  {formatCurrency(selectedPurchaseEntry.unitPrice)}
                </strong>
              </div>
              <div className="entry-details-row">
                <span>Total</span>
                <strong>
                  {formatCurrency(selectedPurchaseEntry.totalAmount)}
                </strong>
              </div>
              <div className="entry-details-row">
                <span>Supplier</span>
                <strong>{selectedPurchaseEntry.supplier || "-"}</strong>
              </div>
            </div>

            <footer className="entry-details-actions">
              <button
                type="button"
                className="entry-details-edit-button"
                disabled={!isOnline}
                onClick={editSelectedPurchase}
              >
                <PencilActionIcon />
                <span>Edit</span>
              </button>
              <button
                type="button"
                className="entry-details-delete-button"
                disabled={!isOnline}
                onClick={deleteSelectedPurchase}
              >
                <TrashActionIcon />
                <span>Delete</span>
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {selectedPurchaseDate ? (
        <div
          className="purchase-day-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedPurchaseDate(null);
            }
          }}
        >
          <section
            className="purchase-day-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-day-modal-title"
          >
            <header className="purchase-day-modal-header">
              <div>
                <p className="section-kicker">Daily purchases</p>
                <h2 id="purchase-day-modal-title">
                  {formatDateDDMMMYYYY(selectedPurchaseDate)}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close daily purchases"
                onClick={() => setSelectedPurchaseDate(null)}
              >
                ×
              </button>
            </header>

            <div className="purchase-day-modal-summary">
              <span>
                <strong>{selectedDayPurchases.length}</strong> items
              </span>
              <span>
                Total <strong>{formatCurrency(selectedDayTotal)}</strong>
              </span>
            </div>

            {selectedDayPurchases.length === 0 ? (
              <p className="empty-state purchase-day-empty">
                No items were purchased on this date.
              </p>
            ) : (
              <div className="table-wrapper purchase-day-table-wrapper">
                <table className="entries-table purchase-day-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Quantity</th>
                      <th>Unit price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDayPurchases.map((purchase) => (
                      <tr key={purchase._id}>
                        <td>{purchase.productName}</td>
                        <td>{purchase.categoryName}</td>
                        <td>
                          {purchase.quantity} {purchase.unit}
                        </td>
                        <td>{formatCurrency(purchase.unitPrice)}</td>
                        <td>
                          <strong>
                            {formatCurrency(purchase.totalAmount)}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="total-row">
                      <td>Total</td>
                      <td colSpan={3}>{selectedDayPurchases.length} items</td>
                      <td>{formatCurrency(selectedDayTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
