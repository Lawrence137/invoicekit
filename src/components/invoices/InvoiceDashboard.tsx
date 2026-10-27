"use client";

import { useState } from "react";
import {
  dateInputValue,
  formatCurrency,
  formatInvoiceDate,
  invoiceTotal,
} from "@/lib/invoice-utils";
import type { DashboardFilter, Invoice } from "@/types/invoice";

type InvoiceDashboardProps = {
  invoices: Invoice[];
  storageReady: boolean;
  storageAvailable: boolean;
  storageMessage: string;
  onNewInvoice: () => void;
  onOpenInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
};

const filters: ReadonlyArray<[DashboardFilter, string]> = [
  ["all", "All invoices"],
  ["drafts", "Drafts"],
  ["overdue", "Overdue"],
  ["due-soon", "Due in 7 days"],
];

export default function InvoiceDashboard({
  invoices,
  storageReady,
  storageAvailable,
  storageMessage,
  onNewInvoice,
  onOpenInvoice,
  onDeleteInvoice,
}: InvoiceDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<DashboardFilter>("all");
  const today = dateInputValue(new Date());
  const nextSevenDays = new Date();
  nextSevenDays.setUTCDate(nextSevenDays.getUTCDate() + 7);
  const dueWithinSevenDays = dateInputValue(nextSevenDays);
  const overdueCount = invoices.filter(
    (invoice) => invoice.dueDate && invoice.dueDate < today
  ).length;
  const totalsByCurrency = invoices.reduce<Record<string, number>>(
    (totals, invoice) => {
      totals[invoice.currency] =
        (totals[invoice.currency] ?? 0) + invoiceTotal(invoice);
      return totals;
    },
    {}
  );
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      !normalizedSearch ||
      [invoice.invoiceNumber, invoice.client, invoice.clientEmail].some(
        (value) => value.toLocaleLowerCase().includes(normalizedSearch)
      );
    const isOverdue = !!invoice.dueDate && invoice.dueDate < today;
    const matchesFilter =
      filter === "all" ||
      (filter === "drafts" && invoice.status === "draft") ||
      (filter === "overdue" && isOverdue) ||
      (filter === "due-soon" &&
        !!invoice.dueDate &&
        invoice.dueDate >= today &&
        invoice.dueDate <= dueWithinSevenDays);

    return matchesSearch && matchesFilter;
  });

  return (
    <section className="no-print space-y-8">
      {storageMessage && (
        <p
          className={`rounded-lg border p-3 text-sm ${
            storageAvailable
              ? "border-slate-200 bg-white text-slate-600"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
          role="status"
          aria-live="polite"
        >
          {storageMessage}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total invoices</p>
          <p className="mt-3 text-3xl font-bold tracking-tight">
            {storageReady ? invoices.length : "—"}
          </p>
          <p className="mt-1 text-sm text-slate-500">Saved invoices</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Total invoice value
          </p>
          {storageReady && Object.keys(totalsByCurrency).length > 0 ? (
            <ul className="mt-3 space-y-1">
              {Object.entries(totalsByCurrency).map(
                ([currency, amount]) => (
                  <li
                    key={currency}
                    className="text-xl font-bold tracking-tight"
                  >
                    {formatCurrency(amount, currency)}
                  </li>
                )
              )}
            </ul>
          ) : (
            <p className="mt-3 text-2xl font-bold tracking-tight">—</p>
          )}
          <p className="mt-1 text-sm text-slate-500">
            Totals shown separately by currency
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Overdue invoices
          </p>
          <p className="mt-3 text-3xl font-bold tracking-tight">
            {storageReady ? overdueCount : "—"}
          </p>
          <p className="mt-1 text-sm text-slate-500">Past their due date</p>
        </article>
      </div>

      <section
        aria-labelledby="invoice-list-heading"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 id="invoice-list-heading" className="text-lg font-semibold">
              Invoices
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {storageReady
                ? `${filteredInvoices.length} of ${invoices.length} invoices`
                : "Loading saved invoices…"}
            </p>
          </div>
          <button
            type="button"
            onClick={onNewInvoice}
            disabled={!storageReady}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + New invoice
          </button>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <label className="block max-w-md text-sm font-medium">
            Search invoices
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Invoice number, client, or email"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="flex flex-wrap gap-2" aria-label="Filter invoices">
            {filters.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={`rounded-full px-3 py-2 text-sm font-semibold ${
                  filter === value
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {!storageReady ? (
          <p className="px-6 pb-6 text-sm text-slate-500" role="status">
            Loading saved invoices…
          </p>
        ) : filteredInvoices.length === 0 ? (
          <div className="mx-5 mb-5 rounded-xl bg-slate-50 p-8 text-center sm:mx-6 sm:mb-6">
            <h3 className="font-semibold text-slate-800">
              {invoices.length === 0 ? "No invoices yet" : "No invoices match"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {invoices.length === 0
                ? "Create your first invoice to see it here."
                : "Try another search or choose a different filter."}
            </p>
            {invoices.length === 0 && (
              <button
                type="button"
                onClick={onNewInvoice}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Create your first invoice
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-slate-200">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Invoice
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Client
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Issue date
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Due date
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Total
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((invoice) => {
                  const isOverdue =
                    !!invoice.dueDate && invoice.dueDate < today;

                  return (
                    <tr key={invoice.id} className="hover:bg-slate-50">
                      <th
                        scope="row"
                        className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900"
                      >
                        {invoice.invoiceNumber}
                      </th>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">
                          {invoice.client || "Client name"}
                        </p>
                        {invoice.clientEmail && (
                          <p className="mt-1 text-xs text-slate-500">
                            {invoice.clientEmail}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatInvoiceDate(invoice.issueDate)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatInvoiceDate(invoice.dueDate)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-medium text-slate-800">
                        {formatCurrency(invoiceTotal(invoice), invoice.currency)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isOverdue
                              ? "bg-red-50 text-red-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isOverdue ? "Overdue" : "Draft"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenInvoice(invoice)}
                            aria-label={`Open invoice ${invoice.invoiceNumber}`}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteInvoice(invoice)}
                            aria-label={`Delete invoice ${invoice.invoiceNumber}`}
                            className="rounded-lg border border-red-100 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
