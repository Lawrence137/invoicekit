import {
  BRANDING_STORAGE_KEY,
  isInvoiceBrandingSettings,
} from "@/lib/invoice-branding-storage";
import {
  CATALOG_STORAGE_KEY,
  isCatalogItem,
} from "@/lib/catalog-storage";
import { CLIENT_STORAGE_KEY, isClient } from "@/lib/client-storage";
import { INVOICE_STORAGE_KEY } from "@/lib/invoice-storage";
import {
  isInvoice,
  invoiceTotal,
  outstandingBalance,
  roundCurrency,
  totalPaid,
} from "@/lib/invoice-utils";
import type { BackupSummary, InvoiceKitBackup } from "@/types/backup";
import type { Client } from "@/types/client";
import type { CatalogItem } from "@/types/catalog";
import type { Invoice } from "@/types/invoice";

export const MAX_BACKUP_FILE_BYTES = 20 * 1024 * 1024;
export const BACKUP_SCHEMA_VERSION = 1;

const WORKSPACE_KEYS = [
  INVOICE_STORAGE_KEY,
  CLIENT_STORAGE_KEY,
  CATALOG_STORAGE_KEY,
  BRANDING_STORAGE_KEY,
] as const;

type BackupValidationResult =
  | { ok: true; backup: InvoiceKitBackup; summary: BackupSummary }
  | { ok: false; message: string };

type RestoreResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateUniqueIds<T extends { id: string }>(
  records: T[],
  label: string
): string | null {
  if (new Set(records.map((record) => record.id)).size !== records.length) {
    return `Backup contains duplicate ${label} IDs.`;
  }
  return null;
}

function hasOnlyKeys(
  record: Record<string, unknown>,
  allowedKeys: string[]
) {
  return Object.keys(record).every((key) => allowedKeys.includes(key));
}

function summarize(backup: InvoiceKitBackup): BackupSummary {
  return {
    exportedAt: backup.exportedAt,
    invoiceCount: backup.data.invoices.length,
    clientCount: backup.data.clients.length,
    catalogItemCount: backup.data.catalogItems.length,
    paymentCount: backup.data.invoices.reduce(
      (count, invoice) => count + invoice.payments.length,
      0
    ),
    logoIncluded: backup.data.brandingSettings.logoDataUrl !== null,
  };
}

export function createWorkspaceBackup(data: {
  invoices: Invoice[];
  clients: Client[];
  catalogItems: CatalogItem[];
  brandingSettings: InvoiceKitBackup["data"]["brandingSettings"];
}): InvoiceKitBackup {
  return {
    application: "invoicekit",
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      invoices: data.invoices,
      clients: data.clients,
      catalogItems: data.catalogItems,
      brandingSettings: data.brandingSettings,
    },
  };
}

export function validateWorkspaceBackup(
  input: unknown
): BackupValidationResult {
  if (!isRecord(input)) {
    return { ok: false, message: "The backup must be a JSON object." };
  }
  if (!hasOnlyKeys(input, ["application", "schemaVersion", "exportedAt", "data"])) {
    return {
      ok: false,
      message: "The backup contains unsupported top-level fields.",
    };
  }
  if (input.application !== "invoicekit") {
    return {
      ok: false,
      message: "This file is not an InvoiceKit workspace backup.",
    };
  }
  if (input.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      message:
        typeof input.schemaVersion === "number" &&
        input.schemaVersion > BACKUP_SCHEMA_VERSION
          ? "This backup was created by a newer InvoiceKit version. Update InvoiceKit before restoring it."
          : `Unsupported backup version. Expected schema ${BACKUP_SCHEMA_VERSION}.`,
    };
  }
  if (
    typeof input.exportedAt !== "string" ||
    Number.isNaN(Date.parse(input.exportedAt)) ||
    new Date(input.exportedAt).toISOString() !== input.exportedAt ||
    !isRecord(input.data)
  ) {
    return {
      ok: false,
      message: "The backup timestamp or data section is invalid.",
    };
  }

  const data = input.data;
  if (
    !hasOnlyKeys(data, [
      "invoices",
      "clients",
      "catalogItems",
      "brandingSettings",
    ])
  ) {
    return {
      ok: false,
      message: "The backup contains unsupported datasets.",
    };
  }
  if (
    !Array.isArray(data.invoices) ||
    !Array.isArray(data.clients) ||
    !Array.isArray(data.catalogItems) ||
    !("brandingSettings" in data)
  ) {
    return {
      ok: false,
      message:
        "The backup is missing required invoices, clients, catalog, or branding datasets.",
    };
  }
  if (!data.invoices.every(isInvoice)) {
    return {
      ok: false,
      message:
        "The backup contains an invalid invoice or payment record. No data was changed.",
    };
  }
  if (!data.clients.every(isClient)) {
    return {
      ok: false,
      message:
        "The backup contains an invalid client record. No data was changed.",
    };
  }
  if (!data.catalogItems.every(isCatalogItem)) {
    return {
      ok: false,
      message:
        "The backup contains an invalid catalog item. No data was changed.",
    };
  }
  if (!isInvoiceBrandingSettings(data.brandingSettings)) {
    return {
      ok: false,
      message:
        "The backup contains invalid branding settings or logo data. No data was changed.",
    };
  }

  const invoices = data.invoices as Invoice[];
  const clients = data.clients as Client[];
  const catalogItems = data.catalogItems as CatalogItem[];
  const duplicateInvoices = validateUniqueIds(invoices, "invoice");
  if (duplicateInvoices) return { ok: false, message: duplicateInvoices };
  if (invoices.some((invoice) => !invoice.id.trim())) {
    return {
      ok: false,
      message: "Backup contains an invoice without a valid ID.",
    };
  }
  const duplicateClients = validateUniqueIds(clients, "client");
  if (duplicateClients) return { ok: false, message: duplicateClients };
  const duplicateCatalog = validateUniqueIds(catalogItems, "catalog item");
  if (duplicateCatalog) return { ok: false, message: duplicateCatalog };

  const invoiceNumbers = invoices.map((invoice) =>
    invoice.invoiceNumber.trim().toLocaleLowerCase()
  );
  if (
    new Set(invoiceNumbers).size !== invoices.length ||
    invoiceNumbers.some((invoiceNumber) => !invoiceNumber)
  ) {
    return {
      ok: false,
      message: "Backup contains duplicate invoice numbers.",
    };
  }

  const paymentIds = invoices.flatMap((invoice) =>
    invoice.payments.map((payment) => payment.id)
  );
  if (new Set(paymentIds).size !== paymentIds.length) {
    return {
      ok: false,
      message: "Backup contains duplicate payment IDs.",
    };
  }
  if (paymentIds.some((id) => !id)) {
    return {
      ok: false,
      message: "Backup contains a payment without a valid ID.",
    };
  }
  if (
    invoices.some(
      (invoice) =>
        new Set(invoice.items.map((item) => item.id)).size !==
          invoice.items.length ||
        invoice.items.some(
          (item) => !Number.isSafeInteger(item.id) || item.id < 1
        )
    )
  ) {
    return {
      ok: false,
      message:
        "Backup contains an invalid or duplicate line-item ID within an invoice.",
    };
  }

  const backup: InvoiceKitBackup = {
    application: "invoicekit",
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: input.exportedAt,
    data: {
      invoices,
      clients,
      catalogItems,
      brandingSettings: data.brandingSettings,
    },
  };
  return { ok: true, backup, summary: summarize(backup) };
}

export function parseWorkspaceBackup(text: string): BackupValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      message: "The selected file is not valid JSON.",
    };
  }
  return validateWorkspaceBackup(parsed);
}

export function restoreWorkspaceBackup(
  backup: InvoiceKitBackup
): RestoreResult {
  const validated = validateWorkspaceBackup(backup);
  if (!validated.ok) return validated;

  const nextValues = new Map<string, string>([
    [INVOICE_STORAGE_KEY, JSON.stringify(backup.data.invoices)],
    [CLIENT_STORAGE_KEY, JSON.stringify(backup.data.clients)],
    [CATALOG_STORAGE_KEY, JSON.stringify(backup.data.catalogItems)],
    [BRANDING_STORAGE_KEY, JSON.stringify(backup.data.brandingSettings)],
  ]);
  const previousValues = new Map<string, string | null>();

  try {
    for (const key of WORKSPACE_KEYS) {
      previousValues.set(key, window.localStorage.getItem(key));
    }
  } catch {
    return {
      ok: false,
      message:
        "Current workspace data could not be read for rollback. Nothing was restored.",
    };
  }

  try {
    for (const key of WORKSPACE_KEYS) {
      const value = nextValues.get(key);
      if (value === undefined) {
        throw new Error("A required backup dataset was missing.");
      }
      window.localStorage.setItem(key, value);
    }
  } catch {
    let rollbackSucceeded = true;
    for (const key of [...WORKSPACE_KEYS].reverse()) {
      try {
        const previousValue = previousValues.get(key);
        if (previousValue === null || previousValue === undefined) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, previousValue);
        }
      } catch {
        rollbackSucceeded = false;
      }
    }
    return {
      ok: false,
      message: rollbackSucceeded
        ? "Restore could not be completed because browser storage rejected a write. The previous workspace values were restored."
        : "Restore failed and browser storage also rejected rollback. Some datasets may have changed; reload and check your downloaded pre-restore backup before continuing.",
    };
  }

  return {
    ok: true,
    message:
      "Workspace restored successfully.",
  };
}

function csvCell(value: string | number | boolean | null | undefined) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[\s\u0000-\u001f]*[=+\-@]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function csvDocument(
  headers: string[],
  rows: Array<Array<string | number | boolean>>
) {
  return `\uFEFF${[headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n")}\r\n`;
}

export function exportInvoicesCsv(invoices: Invoice[]) {
  const headers = [
    "invoice_id",
    "invoice_number",
    "status",
    "business",
    "client",
    "client_company",
    "client_email",
    "issue_date",
    "due_date",
    "currency",
    "line_item_id",
    "line_description",
    "quantity",
    "unit_price",
    "unit_label",
    "line_total",
    "tax_rate_percent",
    "invoice_total",
    "amount_paid",
    "outstanding_balance",
  ];
  const rows = invoices.flatMap((invoice) =>
    invoice.items.length
      ? invoice.items.map((item) => [
          invoice.id,
          invoice.invoiceNumber,
          invoice.status,
          invoice.business,
          invoice.client,
          invoice.clientCompany,
          invoice.clientEmail,
          invoice.issueDate,
          invoice.dueDate,
          invoice.currency,
          item.id,
          item.description,
          item.quantity,
          item.price,
          item.unitLabel ?? "",
          roundCurrency(item.quantity * item.price),
          invoice.tax,
          invoiceTotal(invoice),
          totalPaid(invoice.payments),
          outstandingBalance(invoice),
        ])
      : [[
          invoice.id,
          invoice.invoiceNumber,
          invoice.status,
          invoice.business,
          invoice.client,
          invoice.clientCompany,
          invoice.clientEmail,
          invoice.issueDate,
          invoice.dueDate,
          invoice.currency,
          "",
          "",
          "",
          "",
          "",
          "",
          invoice.tax,
          invoiceTotal(invoice),
          totalPaid(invoice.payments),
          outstandingBalance(invoice),
        ]]
  );
  return csvDocument(headers, rows);
}

export function exportClientsCsv(clients: Client[]) {
  return csvDocument(
    [
      "client_id",
      "name",
      "company",
      "email",
      "phone",
      "billing_address",
      "tax_id",
      "notes",
      "created_at",
      "updated_at",
    ],
    clients.map((client) => [
      client.id,
      client.name,
      client.company,
      client.email,
      client.phone,
      client.billingAddress,
      client.taxId,
      client.notes,
      client.createdAt,
      client.updatedAt,
    ])
  );
}

export function exportCatalogCsv(catalogItems: CatalogItem[]) {
  return csvDocument(
    [
      "catalog_item_id",
      "name",
      "description",
      "sku",
      "type",
      "unit_price",
      "currency",
      "unit_label",
      "active",
      "created_at",
      "updated_at",
    ],
    catalogItems.map((item) => [
      item.id,
      item.name,
      item.description,
      item.sku,
      item.type,
      item.unitPrice,
      item.currency,
      item.unitLabel,
      item.active,
      item.createdAt,
      item.updatedAt,
    ])
  );
}

export function exportPaymentsCsv(invoices: Invoice[]) {
  return csvDocument(
    [
      "payment_id",
      "invoice_id",
      "invoice_number",
      "client",
      "payment_date",
      "amount",
      "currency",
      "payment_method",
      "reference",
    ],
    invoices.flatMap((invoice) =>
      invoice.payments.map((payment) => [
        payment.id,
        invoice.id,
        invoice.invoiceNumber,
        invoice.client,
        payment.date,
        payment.amount,
        invoice.currency,
        payment.method ?? "",
        payment.reference ?? "",
      ])
    )
  );
}

export function backupExportDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
