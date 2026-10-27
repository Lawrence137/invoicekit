import { isInvoice } from "@/lib/invoice-utils";
import type { Invoice } from "@/types/invoice";

export const INVOICE_STORAGE_KEY = "invoicekit_invoices_v1";

export type InvoiceStorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export function readInvoices(): InvoiceStorageResult<Invoice[]> {
  try {
    const storedInvoices = window.localStorage.getItem(INVOICE_STORAGE_KEY);
    const parsed: unknown = storedInvoices ? JSON.parse(storedInvoices) : [];

    if (
      !Array.isArray(parsed) ||
      !parsed.every(isInvoice) ||
      new Set(parsed.map((invoice) => invoice.id)).size !== parsed.length
    ) {
      return {
        ok: false,
        message: "Saved invoice data is invalid. It has been left untouched.",
      };
    }

    return { ok: true, value: parsed };
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
