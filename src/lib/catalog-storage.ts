import type { CatalogItem, CatalogItemType } from "@/types/catalog";

export const CATALOG_STORAGE_KEY = "invoicekit_catalog_v1";
export const CATALOG_CURRENCIES = ["KES", "USD", "EUR", "GBP"] as const;

export type CatalogStorageResult =
  | { ok: true; value: CatalogItem[] }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCatalogCurrency(
  value: unknown
): value is (typeof CATALOG_CURRENCIES)[number] {
  return CATALOG_CURRENCIES.some((currency) => currency === value);
}

function isCatalogItemType(value: unknown): value is CatalogItemType {
  return value === "product" || value === "service";
}

function isCatalogItem(value: unknown): value is CatalogItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    typeof value.description === "string" &&
    typeof value.sku === "string" &&
    isCatalogItemType(value.type) &&
    typeof value.unitPrice === "number" &&
    Number.isFinite(value.unitPrice) &&
    value.unitPrice >= 0 &&
    isCatalogCurrency(value.currency) &&
    typeof value.unitLabel === "string" &&
    typeof value.active === "boolean" &&
    typeof value.createdAt === "string" &&
    !Number.isNaN(Date.parse(value.createdAt)) &&
    typeof value.updatedAt === "string" &&
    !Number.isNaN(Date.parse(value.updatedAt))
  );
}

export function readCatalogItems(): CatalogStorageResult {
  try {
    const stored = window.localStorage.getItem(CATALOG_STORAGE_KEY);
    let parsed: unknown = [];
    if (stored) {
      try {
        parsed = JSON.parse(stored);
      } catch {
        return {
          ok: false,
          message:
            "Saved catalog data is malformed and has been left untouched.",
        };
      }
    }
    if (
      !Array.isArray(parsed) ||
      !parsed.every(isCatalogItem) ||
      new Set(parsed.map((item) => item.id)).size !== parsed.length
    ) {
      return {
        ok: false,
        message:
          "Saved catalog data is invalid and has been left untouched.",
      };
    }

    return { ok: true, value: parsed };
  } catch {
    return {
      ok: false,
      message:
        "Catalog items could not be loaded. Browser storage may be unavailable.",
    };
  }
}

export function writeCatalogItems(
  items: CatalogItem[]
): { ok: true } | { ok: false; message: string } {
  try {
    window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(items));
    return { ok: true };
  } catch {
    return {
      ok: false,
      message:
        "Catalog items could not be saved. Check available browser storage and try again.",
    };
  }
}

export function createCatalogItemId() {
  return crypto.randomUUID();
}
