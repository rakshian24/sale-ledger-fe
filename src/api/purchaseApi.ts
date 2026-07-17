import { apiClient } from "./apiClient";
import type {
  CategoryPurchaseTotal,
  ProductHistoryResponse,
  Purchase,
  PurchaseCategory,
  PurchasePayload,
  PurchaseProduct,
  PurchaseSummary,
} from "../types/purchase";

const rangeQuery = (from: string, to: string) =>
  new URLSearchParams({ from, to }).toString();

export const getPurchaseCategories = async () =>
  (
    await apiClient<{ categories: PurchaseCategory[] }>(
      "/purchase-categories",
    )
  ).categories;

export const createPurchaseCategory = async (name: string) =>
  (
    await apiClient<{ category: PurchaseCategory }>("/purchase-categories", {
      method: "POST",
      body: JSON.stringify({ name }),
    })
  ).category;

export const getPurchaseProducts = async () =>
  (
    await apiClient<{ products: PurchaseProduct[] }>("/purchase-products")
  ).products;

export const createPurchaseProduct = async (payload: {
  name: string;
  categoryId: string;
  defaultUnit: string;
}) =>
  (
    await apiClient<{ product: PurchaseProduct }>("/purchase-products", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  ).product;

export const getPurchases = async (from: string, to: string) =>
  (
    await apiClient<{ purchases: Purchase[] }>(
      `/purchases?${rangeQuery(from, to)}`,
    )
  ).purchases;

export const createPurchase = async (payload: PurchasePayload) =>
  (
    await apiClient<{ purchase: Purchase }>("/purchases", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  ).purchase;

export const updatePurchase = async (id: string, payload: PurchasePayload) =>
  (
    await apiClient<{ purchase: Purchase }>(`/purchases/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  ).purchase;

export const deletePurchase = async (id: string) =>
  apiClient<{ message: string }>(`/purchases/${id}`, { method: "DELETE" });

export const getPurchaseSummary = async (from: string, to: string) =>
  apiClient<{
    summary: PurchaseSummary;
    dailyTotals: { _id: string; totalSpent: number }[];
    categoryTotals: CategoryPurchaseTotal[];
  }>(`/purchases/summary?${rangeQuery(from, to)}`);

export const getProductPurchaseHistory = async (
  productId: string,
  from: string,
  to: string,
) =>
  apiClient<ProductHistoryResponse>(
    `/purchases/products/${productId}/history?${rangeQuery(from, to)}`,
  );
