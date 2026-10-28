import type { InvoiceBrandingSettings, Invoice } from "@/types/invoice";
import type { Client } from "@/types/client";
import type { CatalogItem } from "@/types/catalog";

export type InvoiceKitBackupPayload = {
  invoices: Invoice[];
  clients: Client[];
  catalogItems: CatalogItem[];
  brandingSettings: InvoiceBrandingSettings;
};

export type InvoiceKitBackup = {
  application: "invoicekit";
  schemaVersion: 1;
  exportedAt: string;
  data: InvoiceKitBackupPayload;
};

export type BackupSummary = {
  exportedAt: string;
  invoiceCount: number;
  clientCount: number;
  catalogItemCount: number;
  paymentCount: number;
  logoIncluded: boolean;
};
