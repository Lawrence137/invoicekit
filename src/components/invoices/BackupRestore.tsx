"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import {
  backupExportDate,
  createWorkspaceBackup,
  exportCatalogCsv,
  exportClientsCsv,
  exportInvoicesCsv,
  exportPaymentsCsv,
  MAX_BACKUP_FILE_BYTES,
  parseWorkspaceBackup,
  restoreWorkspaceBackup,
} from "@/lib/workspace-backup";
import type { BackupSummary, InvoiceKitBackup } from "@/types/backup";
import type { Client } from "@/types/client";
import type { CatalogItem } from "@/types/catalog";
import type { Invoice, InvoiceBrandingSettings } from "@/types/invoice";

type Props = {
  invoices: Invoice[];
  clients: Client[];
  catalogItems: CatalogItem[];
  brandingSettings: InvoiceBrandingSettings;
  storageReady: boolean;
  storageAvailable: boolean;
  clientStorageReady: boolean;
  clientStorageAvailable: boolean;
  catalogReady: boolean;
  catalogAvailable: boolean;
  brandingReady: boolean;
  brandingAvailable: boolean;
  onRestore: (backup: InvoiceKitBackup) => void;
};

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatExportDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function BackupRestore({
  invoices,
  clients,
  catalogItems,
  brandingSettings,
  storageReady,
  storageAvailable,
  clientStorageReady,
  clientStorageAvailable,
  catalogReady,
  catalogAvailable,
  brandingReady,
  brandingAvailable,
  onRestore,
}: Props) {
  const [backup, setBackup] = useState<InvoiceKitBackup | null>(null);
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [recoveryBackupReady, setRecoveryBackupReady] = useState(false);
  const [recoveryConfirmed, setRecoveryConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const storageIsReady =
    storageReady &&
    clientStorageReady &&
    catalogReady &&
    brandingReady;
  const storageIsAvailable =
    storageAvailable &&
    clientStorageAvailable &&
    catalogAvailable &&
    brandingAvailable;
  const canManageWorkspace = storageIsReady && storageIsAvailable;
  const date = backupExportDate(new Date());

  function makeBackup() {
    return createWorkspaceBackup({
      invoices,
      clients,
      catalogItems,
      brandingSettings,
    });
  }

  function downloadFullBackup() {
    try {
      const backupData = makeBackup();
      downloadFile(
        `invoicekit-backup-${date}.json`,
        `${JSON.stringify(backupData, null, 2)}\n`,
        "application/json;charset=utf-8"
      );
      setError("");
      setMessage(
        "Full workspace backup download started. Check your browser downloads."
      );
      return true;
    } catch {
      setError("The workspace backup could not be generated or downloaded.");
      setMessage("");
      return false;
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    setBackup(null);
    setSummary(null);
    setRecoveryBackupReady(false);
    setRecoveryConfirmed(false);
    setMessage("");
    setError("");
    if (!file) return;
    if (file.size > MAX_BACKUP_FILE_BYTES) {
      setError("This backup is larger than the 20 MB limit.");
      event.currentTarget.value = "";
      return;
    }

    setBusy(true);
    try {
      const result = await parseWorkspaceBackup(await file.text());
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setBackup(result.backup);
      setSummary(result.summary);
      setMessage("Backup validated. Review the contents before restoring.");
    } catch {
      setError("The selected backup could not be read.");
    } finally {
      setBusy(false);
    }
  }

  function restoreBackup() {
    if (!backup || !recoveryConfirmed || busy) return;
    if (
      !window.confirm(
        "Replace the current InvoiceKit invoices, clients, catalog, and branding with this backup? This also discards any unsaved invoice edits in this tab. The download of your current workspace is your pre-restore recovery copy."
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    const result = restoreWorkspaceBackup(backup);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage(result.message);
    onRestore(backup);
  }

  function downloadCsv(filename: string, createCsv: () => string) {
    try {
      downloadFile(filename, createCsv(), "text/csv;charset=utf-8");
      setError("");
      setMessage(
        `${filename} download started. CSV records are UTF-8 encoded.`
      );
    } catch {
      setError(`${filename} could not be generated or downloaded.`);
      setMessage("");
    }
  }

  return (
    <section className="space-y-6" aria-labelledby="backup-title">
      {!canManageWorkspace && (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
        >
          {storageIsReady
            ? "Backup and restore are unavailable because one or more stored datasets could not be read safely. Existing data has not been changed."
            : "Loading saved workspace data…"}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="max-w-3xl">
          <h2
            id="backup-title"
            className="text-lg font-semibold text-slate-950"
          >
            Full workspace backup
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Download a versioned JSON copy of invoices and payment history,
            client profiles, products and services, invoice templates, brand
            colors, and any stored logo. The file is created in this browser
            and is never uploaded.
          </p>
          <button
            type="button"
            onClick={downloadFullBackup}
            disabled={!canManageWorkspace || busy}
            className="mt-5 min-h-11 rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download full backup
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-slate-950">
          Restore a workspace
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Choose an InvoiceKit backup to validate it and preview its contents.
          Restoring replaces only the four InvoiceKit datasets shown here;
          unrelated browser storage is left alone. There is no merge mode.
        </p>
        <label className="mt-5 block text-sm font-semibold text-slate-800">
          InvoiceKit backup file (JSON)
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            disabled={!canManageWorkspace || busy}
            className="mt-2 block min-h-11 w-full max-w-xl rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-800 hover:file:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className="mt-2 block text-xs font-normal text-slate-500">
            Maximum file size: 20 MB.
          </span>
        </label>

        {busy && (
          <p className="mt-4 text-sm font-medium text-slate-600" role="status">
            Validating or restoring backup…
          </p>
        )}

        {summary && backup && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <h3 className="font-semibold text-slate-900">
              Backup preview
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Exported {formatExportDate(summary.exportedAt)}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {[
                ["Invoices", summary.invoiceCount],
                ["Payments", summary.paymentCount],
                ["Clients", summary.clientCount],
                ["Catalog items", summary.catalogItemCount],
                ["Logo", summary.logoIncluded ? "Included" : "Not included"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm leading-6 text-amber-900">
              Restoring will replace saved invoices and their payments, clients,
              catalog items, and branding settings. A download of your current
              workspace is required before replacement. Browser storage cannot
              make multiple key writes truly atomic; if a write fails, InvoiceKit
              attempts to roll back the previous values.
            </p>
            <button
              type="button"
              onClick={() => {
                if (downloadFullBackup()) {
                  setRecoveryBackupReady(true);
                  setRecoveryConfirmed(false);
                }
              }}
              disabled={!canManageWorkspace || busy}
              className="mt-4 min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Download current workspace backup
            </button>
            <label className="mt-4 flex max-w-2xl items-start gap-3 text-sm leading-6 text-slate-700">
              <input
                type="checkbox"
                checked={recoveryConfirmed}
                onChange={(event) =>
                  setRecoveryConfirmed(event.currentTarget.checked)
                }
                disabled={!recoveryBackupReady || busy}
                className="mt-1 size-4 rounded border-slate-300 text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed"
              />
              <span>
                I have saved the current workspace backup and understand that
                restoring replaces my saved InvoiceKit data.
              </span>
            </label>
            <button
              type="button"
              onClick={restoreBackup}
              disabled={!canManageWorkspace || busy || !recoveryConfirmed}
              className="ml-0 mt-3 min-h-10 rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-3"
            >
              Replace workspace with this backup
            </button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-slate-950">
          Download CSV files
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          CSV exports use one row per invoice line item (with invoice totals
          repeated on each row) and a separate one-row-per-payment file.
          Currency codes are included, and formula-like text is escaped for
          spreadsheet safety.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {[
            {
              label: "Invoices CSV",
              filename: `invoicekit-invoices-${date}.csv`,
              createCsv: () => exportInvoicesCsv(invoices),
            },
            {
              label: "Clients CSV",
              filename: `invoicekit-clients-${date}.csv`,
              createCsv: () => exportClientsCsv(clients),
            },
            {
              label: "Products & services CSV",
              filename: `invoicekit-catalog-${date}.csv`,
              createCsv: () => exportCatalogCsv(catalogItems),
            },
            {
              label: "Payments CSV",
              filename: `invoicekit-payments-${date}.csv`,
              createCsv: () => exportPaymentsCsv(invoices),
            },
          ].map(({ label, filename, createCsv }) => (
            <button
              key={label}
              type="button"
              onClick={() => downloadCsv(filename, createCsv)}
              disabled={!canManageWorkspace || busy}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {(message || error) && (
        <p
          role={error ? "alert" : "status"}
          className={`rounded-xl border p-4 text-sm leading-6 ${
            error
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error || message}
        </p>
      )}
    </section>
  );
}
