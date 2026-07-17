import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createPurchase,
  createPurchaseCategory,
  createPurchaseProduct,
  deletePurchase,
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
import { formatCurrency, getTodayDateInputValue } from "../utils/formatters";

type PurchaseDashboardProps = {
  isOnline: boolean;
};

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
  const [categoryTotals, setCategoryTotals] = useState<CategoryPurchaseTotal[]>([]);
  const [history, setHistory] = useState<ProductHistoryResponse | null>(null);
  const [historyProductId, setHistoryProductId] = useState("");
  const [form, setForm] = useState<PurchasePayload>(emptyPurchaseForm);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [productForm, setProductForm] = useState({
    name: "",
    categoryId: "",
    defaultUnit: "kg",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
        setError(err instanceof Error ? err.message : "Unable to load price history"),
      );
  }, [historyProductId, from, to, isOnline, purchases]);

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
      setError(err instanceof Error ? err.message : "Unable to create category");
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
    if (!form.productId || form.quantity <= 0) return;
    setIsSaving(true);
    setError("");
    try {
      if (editing) await updatePurchase(editing._id, form);
      else await createPurchase(form);
      setEditing(null);
      setForm(emptyPurchaseForm());
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
      setError(err instanceof Error ? err.message : "Unable to delete purchase");
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

  return (
    <div className="purchase-dashboard">
      <section className="card purchase-filter-card">
        <div>
          <p className="section-kicker">Purchase period</p>
          <h2>Purchase Report</h2>
        </div>
        <div className="purchase-date-filters">
          <label className="field"><span>From</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="field"><span>To</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
      </section>

      {error ? <p className="error-message">{error}</p> : null}

      <section className="summary-grid purchase-summary-grid">
        <article className="summary-card"><span>Total purchased</span><strong>{formatCurrency(summary.totalSpent)}</strong></article>
        <article className="summary-card"><span>Purchase entries</span><strong>{summary.purchaseCount}</strong></article>
        <article className="summary-card"><span>Highest-spend category</span><strong>{categoryTotals[0]?.categoryName || "—"}</strong><small>{categoryTotals[0] ? formatCurrency(categoryTotals[0].totalSpent) : "No purchases"}</small></article>
        <article className="summary-card"><span>Products available</span><strong>{products.length}</strong></article>
      </section>

      <div className="purchase-main-grid">
        <section className="card">
          <div className="section-heading"><div><p className="section-kicker">{editing ? "Edit" : "Add"}</p><h2>{editing ? "Edit Purchase" : "New Purchase"}</h2></div></div>
          {products.length === 0 ? <p className="empty-state">Create a category and product first.</p> : null}
          <form className="entry-form" onSubmit={submitPurchase}>
            <label className="field"><span>Date</span><input required type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></label>
            <label className="field"><span>Product</span><select required value={form.productId} onChange={(e) => selectProduct(e.target.value)}><option value="">Select product</option>{products.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}</select></label>
            <div className="purchase-form-row">
              <label className="field"><span>Quantity</span><input required min="0.001" step="any" type="number" value={form.quantity || ""} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></label>
              <label className="field"><span>Unit</span><input required value={form.unit} placeholder="kg, piece, litre" onChange={(e) => setForm({ ...form, unit: e.target.value })} /></label>
            </div>
            <label className="field"><span>Price per unit</span><input required min="0" step="0.01" type="number" value={form.unitPrice || ""} onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} /></label>
            <label className="field"><span>Supplier (optional)</span><input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></label>
            <label className="field"><span>Note (optional)</span><textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
            <div className="calculated-preview"><div><span>Purchase total</span><strong>{formatCurrency(form.quantity * form.unitPrice)}</strong></div></div>
            <div className="actions"><button disabled={!isOnline || isSaving || products.length === 0} type="submit">{editing ? "Update Purchase" : "Save Purchase"}</button>{editing ? <button className="secondary-button" type="button" onClick={() => { setEditing(null); setForm(emptyPurchaseForm()); }}>Cancel</button> : null}</div>
          </form>
        </section>

        <section className="card purchase-setup-card">
          <div className="section-heading"><div><p className="section-kicker">Setup</p><h2>Categories & Products</h2></div></div>
          <form className="compact-setup-form" onSubmit={submitCategory}>
            <label className="field"><span>New category</span><input value={categoryName} placeholder="Eg: Vegetables" onChange={(e) => setCategoryName(e.target.value)} /></label>
            <button disabled={!isOnline || isSaving || !categoryName.trim()} type="submit">Add Category</button>
          </form>
          <div className="purchase-chip-list">{categories.map((category) => <span className="purchase-chip" key={category._id}>{category.name}</span>)}</div>
          <form className="compact-setup-form product-setup-form" onSubmit={submitProduct}>
            <label className="field"><span>Product name</span><input value={productForm.name} placeholder="Eg: Beans" onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} /></label>
            <label className="field"><span>Category</span><select value={productForm.categoryId} onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}><option value="">Select category</option>{categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
            <label className="field"><span>Default unit</span><input value={productForm.defaultUnit} onChange={(e) => setProductForm({ ...productForm, defaultUnit: e.target.value })} /></label>
            <button disabled={!isOnline || isSaving || !productForm.name.trim() || !productForm.categoryId} type="submit">Add Product</button>
          </form>
        </section>
      </div>

      <section className="card records-card">
        <div className="section-heading records-heading"><div><p className="section-kicker">History</p><h2>Purchase Entries</h2></div></div>
        {isLoading ? <div className="records-loader" /> : purchases.length === 0 ? <p className="empty-state">No purchases in this period.</p> : <div className="table-wrapper"><table className="entries-table purchase-table"><thead><tr><th>Date</th><th>Product</th><th>Category</th><th>Quantity</th><th>Unit price</th><th>Total</th><th>Supplier</th><th>Actions</th></tr></thead><tbody>{purchases.map((purchase) => <tr key={purchase._id}><td>{purchase.purchaseDate}</td><td>{purchase.productName}</td><td>{purchase.categoryName}</td><td>{purchase.quantity} {purchase.unit}</td><td>{formatCurrency(purchase.unitPrice)}</td><td><strong>{formatCurrency(purchase.totalAmount)}</strong></td><td>{purchase.supplier || "—"}</td><td><div className="table-actions"><button onClick={() => startEditing(purchase)}>Edit</button><button className="danger-button" onClick={() => removePurchase(purchase)}>Delete</button></div></td></tr>)}</tbody><tfoot><tr className="total-row"><td>Total</td><td colSpan={4}>{purchases.length} entries</td><td>{formatCurrency(summary.totalSpent)}</td><td colSpan={2} /></tr></tfoot></table></div>}
      </section>

      <div className="purchase-report-grid">
        <section className="card">
          <div className="section-heading"><div><p className="section-kicker">Spending</p><h2>By Category</h2></div></div>
          {categoryTotals.length === 0 ? <p className="empty-state">No category spending yet.</p> : <div className="category-spend-list">{categoryTotals.map((category) => <div key={category._id}><span>{category.categoryName}<small>{category.purchaseCount} entries</small></span><strong>{formatCurrency(category.totalSpent)}</strong></div>)}</div>}
        </section>
        <section className="card">
          <div className="section-heading"><div><p className="section-kicker">Product report</p><h2>Price History</h2></div></div>
          <label className="field"><span>Product</span><select value={historyProductId} onChange={(e) => setHistoryProductId(e.target.value)}><option value="">Select product</option>{products.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}</select></label>
          {history ? <><div className="price-stats"><div><span>Quantity</span><strong>{history.summary.totalQuantity}</strong></div><div><span>Total spent</span><strong>{formatCurrency(history.summary.totalSpent)}</strong></div><div><span>Average price</span><strong>{formatCurrency(history.summary.averageUnitPrice)}</strong></div><div><span>Price range</span><strong>{formatCurrency(history.summary.lowestUnitPrice)} – {formatCurrency(history.summary.highestUnitPrice)}</strong></div></div><div className="price-history-list">{history.priceHistory.map((row) => <div key={row._id}><span>{row.purchaseDate}</span><span>{row.quantity} {row.unit}</span><strong>{formatCurrency(row.unitPrice)}/{row.unit}</strong></div>)}</div></> : <p className="empty-state purchase-history-empty">Select a product to inspect its historic prices.</p>}
        </section>
      </div>
    </div>
  );
}
