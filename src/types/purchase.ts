export type PurchaseCategory = {
  _id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseProduct = {
  _id: string;
  userId: string;
  categoryId: string | { _id: string; name: string };
  name: string;
  defaultUnit: string;
  createdAt: string;
  updatedAt: string;
};

export type Purchase = {
  _id: string;
  userId: string;
  purchaseDate: string;
  productId: string;
  categoryId: string;
  productName: string;
  categoryName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  supplier: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type PurchasePayload = {
  purchaseDate: string;
  productId: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  supplier?: string;
  note?: string;
};

export type PurchaseSummary = {
  totalSpent: number;
  purchaseCount: number;
  totalQuantity: number;
};

export type CategoryPurchaseTotal = {
  _id: string;
  categoryName: string;
  totalSpent: number;
  purchaseCount: number;
};

export type ProductHistoryResponse = {
  product: PurchaseProduct;
  summary: PurchaseSummary & {
    averageUnitPrice: number;
    lowestUnitPrice: number;
    highestUnitPrice: number;
  };
  priceHistory: Purchase[];
};
