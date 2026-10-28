export type CatalogItemType = "product" | "service";

export type CatalogItem = {
  id: string;
  name: string;
  description: string;
  sku: string;
  type: CatalogItemType;
  unitPrice: number;
  currency: string;
  unitLabel: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CatalogItemDraft = Omit<
  CatalogItem,
  "id" | "active" | "createdAt" | "updatedAt"
>;
