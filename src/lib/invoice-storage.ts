import { normalizeInvoice } from "@/lib/invoice-utils";
import type { Invoice } from "@/types/invoice";

export const INVOICE_STORAGE_KEY = "invoicekit_invoices_v1";

export type InvoiceStorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export type InvoiceReadResult =
  | {
      ok: true;
      value: Invoice[];
      storageAvailable: boolean;
      message: string;
    }
  | { ok: false; message: string };

export function readInvoices(): InvoiceReadResult {
  try {
    const storedInvoices = window.localStorage.getItem(INVOICE_STORAGE_KEY);
    const parsed: unknown = storedInvoices ? JSON.parse(storedInvoices) : [];

    if (!Array.isArray(parsed)) {
      return {
        ok: false,
        message: "Saved invoice data is invalid. It has been left untouched.",
      };
    }

    const invoices = parsed.map(normalizeInvoice);
    if (
      invoices.some((invoice) => invoice === null) ||
      new Set(invoices.map((invoice) => invoice?.id)).size !== invoices.length
    ) {
      return {
        ok: false,
        message: "Saved invoice data is invalid. It has been left untouched.",
      };
    }

    const normalizedInvoices = invoices.filter(
      (invoice): invoice is Invoice => invoice !== null
    );
    const needsMigration = parsed.some((invoice, index) => {
      if (typeof invoice !== "object" || invoice === null) return false;
      return (
        !("payments" in invoice) ||
        !("businessAddress" in invoice) ||
        !("businessPhone" in invoice) ||
        !("businessWebsite" in invoice) ||
        !("businessTaxId" in invoice) ||
        !("clientCompany" in invoice) ||
        !("clientPhone" in invoice) ||
        !("clientAddress" in invoice) ||
        !("clientTaxId" in invoice) ||
        !("template" in invoice) ||
        invoices[index]?.status !== invoice.status
      );
    });

    if (needsMigration) {
      const migrationResult = writeInvoices(normalizedInvoices);
      if (!migrationResult.ok) {
        return {
          ok: true,
          value: normalizedInvoices,
          storageAvailable: false,
          message:
            "Legacy invoices were loaded, but payment fields could not be migrated to browser storage. Existing data was preserved.",
        };
      }
    }

    return {
      ok: true,
      value: normalizedInvoices,
      storageAvailable: true,
      message: "",
    };
  } catch {
    return {
      ok: false,
      message:
        "Saved invoices could not be loaded. Browser storage may be unavailable.",
    };
  }
}

export function writeInvoices(
  invoices: Invoice[]
): InvoiceStorageResult<undefined> {
  try {
    window.localStorage.setItem(
      INVOICE_STORAGE_KEY,
      JSON.stringify(invoices)
    );
    return { ok: true, value: undefined };
  } catch {
    return {
      ok: false,
      message:
        "Invoices could not be saved. Check available browser storage and try again.",
    };
  }
}
