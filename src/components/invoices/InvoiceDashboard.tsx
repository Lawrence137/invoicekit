"use client";

import { useState } from "react";
import {
  dateInputValue,
  formatCurrency,
  formatInvoiceDate,
  getInvoiceDisplayStatus,
  getPaymentFollowUpState,
  invoiceTotal,
  localCalendarDateValue,
  outstandingBalance,
  paymentProgress,
  totalPaid,
} from "@/lib/invoice-utils";
import type { DashboardFilter, Invoice } from "@/types/invoice";

type InvoiceDashboardProps = {
  invoices: Invoice[];
  storageReady: boolean;
  storageAvailable: boolean;
  storageMessage: string;
  onNewInvoice: () => void;
  onOpenInvoice: (invoice: Invoice) => void;
  onCreateReminder: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
};

const filters: ReadonlyArray<[DashboardFilter, string]> = [
  ["all", "All invoices"],
  ["draft", "Draft"],
  ["sent", "Sent"],
  ["overdue", "Overdue"],
  ["paid", "Paid"],
  ["due-soon", "Due in 7 days"],
];

const statusClassNames = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-50 text-blue-700",
  overdue: "bg-rose-50 text-rose-700",
  paid: "bg-emerald-50 text-emerald-700",
} as const;

function CurrencyValues({
  values,
  amountKey,
}: {
  values: Record<string, { total: number; outstanding: number; collected: number }>;
  amountKey: "total" | "outstanding" | "collected";
}) {
  const entries = Object.entries(values);

  if (entries.length === 0) {
    return <p className="mt-4 text-sm text-slate-400">No invoices yet</p>;
  }

  return (
    <ul className="mt-4 space-y-2">
      {entries.map(([currency, amounts]) => (
        <li
          key={currency}
          className="flex items-baseline justify-between gap-3 tabular-nums"
        >
          <span className="text-xs font-medium text-slate-400">{currency}</span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            {formatCurrency(amounts[amountKey], currency)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ status }: { status: keyof typeof statusClassNames }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${statusClassNames[status]}`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${
          status === "draft"
            ? "bg-slate-400"
            : status === "sent"
              ? "bg-blue-500"
              : status === "overdue"
                ? "bg-rose-500"
                : "bg-emerald-500"
        }`}
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function InvoiceDashboard({
  invoices,
  storageReady,
  storageAvailable,
  storageMessage,
  onNewInvoice,
  onOpenInvoice,
  onCreateReminder,
  onDeleteInvoice,
}: InvoiceDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<DashboardFilter>("all");
  const today = localCalendarDateValue();
  const dueSoonLimit = new Date(`${today}T00:00:00Z`);
  dueSoonLimit.setUTCDate(dueSoonLimit.getUTCDate() + 7);
  const dueWithinSevenDays = dateInputValue(dueSoonLimit);
  const followUpInvoices = invoices
    .flatMap((invoice) => {
      const state = getPaymentFollowUpState(invoice, today);
      return state.kind === "none" ? [] : [{ invoice, state }];
    })
    .sort((a, b) => a.invoice.dueDate.localeCompare(b.invoice.dueDate));
  const overdueByCurrency = followUpInvoices.reduce<Record<string, number>>(
    (totals, { invoice, state }) => {
      if (state.kind === "overdue") {
        totals[invoice.currency] =
          (totals[invoice.currency] ?? 0) + outstandingBalance(invoice);
      }
      return totals;
    },
    {}
  );
  const dueTodayCount = followUpInvoices.filter(
    ({ state }) => state.kind === "due-today"
  ).length;
  const dueSoonCount = followUpInvoices.filter(
    ({ state }) => state.kind === "due-soon"
  ).length;

  const counts = invoices.reduce(
    (result, invoice) => {
      result[invoice.status] += 1;
      if (getInvoiceDisplayStatus(invoice, today) === "overdue") {
        result.overdue += 1;
      }
      return result;
    },
    { draft: 0, sent: 0, overdue: 0, paid: 0 }
  );
  const totalsByCurrency = invoices.reduce<
    Record<string, { total: number; outstanding: number; collected: number }>
  >((totals, invoice) => {
    const amounts = (totals[invoice.currency] ??= {
      total: 0,
      outstanding: 0,
      collected: 0,
    });
    amounts.total += invoiceTotal(invoice);
    amounts.outstanding += outstandingBalance(invoice);
    amounts.collected += totalPaid(invoice.payments);
    return totals;
  }, {});

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      !normalizedSearch ||
      [invoice.invoiceNumber, invoice.client, invoice.clientEmail].some(
        (value) => value.toLocaleLowerCase().includes(normalizedSearch)
      );
    const status = getInvoiceDisplayStatus(invoice, today);
    const matchesFilter =
      filter === "all" ||
      (filter === "draft" && invoice.status === "draft") ||
      (filter === "sent" && invoice.status === "sent") ||
      (filter === "paid" && invoice.status === "paid") ||
      (filter === "overdue" && status === "overdue") ||
      (filter === "due-soon" &&
        invoice.status === "sent" &&
        !!invoice.dueDate &&
        invoice.dueDate >= today &&
        invoice.dueDate <= dueWithinSevenDays);

    return matchesSearch && matchesFilter;
  });

  return (
    <section className="no-print space-y-6">
      {storageMessage && (
        <p
          className={`rounded-lg border px-4 py-3 text-sm ${
            storageAvailable
              ? "border-slate-200 bg-white text-slate-600"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
          role={storageAvailable ? "status" : "alert"}
          aria-live="polite"
        >
          {storageMessage}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="min-h-36 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Total invoiced</p>
          {storageReady && storageAvailable ? (
            <CurrencyValues values={totalsByCurrency} amountKey="total" />
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              {storageReady ? "Data unavailable" : "Loading…"}
            </p>
          )}
        </article>
        <article className="min-h-36 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Outstanding balance
          </p>
          {storageReady && storageAvailable ? (
            <CurrencyValues
              values={totalsByCurrency}
              amountKey="outstanding"
            />
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              {storageReady ? "Data unavailable" : "Loading…"}
            </p>
          )}
        </article>
        <article className="min-h-36 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Payments collected
          </p>
          {storageReady && storageAvailable ? (
            <CurrencyValues
              values={totalsByCurrency}
              amountKey="collected"
            />
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              {storageReady ? "Data unavailable" : "Loading…"}
            </p>
          )}
        </article>
        <article className="min-h-36 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Overdue invoices</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums text-slate-900">
            {storageReady && storageAvailable ? counts.overdue : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Draft {storageReady && storageAvailable ? counts.draft : "—"} · Sent{" "}
            {storageReady && storageAvailable ? counts.sent : "—"} · Paid{" "}
            {storageReady && storageAvailable ? counts.paid : "—"}
          </p>
        </article>
      </div>

      <section
        aria-labelledby="payment-follow-up-heading"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2
              id="payment-follow-up-heading"
              className="text-base font-semibold text-slate-900"
            >
              Payment follow-up
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Sent invoices with a balance due today, within 7 days, or overdue.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(overdueByCurrency).map(([currency, amount]) => (
              <span
                key={currency}
                className="rounded-full bg-rose-50 px-3 py-1.5 font-semibold text-rose-800"
              >
                Overdue {formatCurrency(amount, currency)}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          <div className="px-5 py-3 sm:px-6">
            <p className="text-xs text-slate-500">Overdue</p>
            <p className="mt-1 font-semibold tabular-nums text-rose-700">
              {storageReady && storageAvailable
                ? followUpInvoices.filter(({ state }) => state.kind === "overdue")
                    .length
                : "—"}
            </p>
          </div>
          <div className="px-5 py-3 sm:px-6">
            <p className="text-xs text-slate-500">Due today</p>
            <p className="mt-1 font-semibold tabular-nums text-slate-900">
              {storageReady && storageAvailable ? dueTodayCount : "—"}
            </p>
          </div>
          <div className="px-5 py-3 sm:px-6">
            <p className="text-xs text-slate-500">Due in 7 days</p>
            <p className="mt-1 font-semibold tabular-nums text-slate-900">
              {storageReady && storageAvailable ? dueSoonCount : "—"}
            </p>
          </div>
        </div>
        {!storageReady ? (
          <p className="p-5 text-sm text-slate-500" role="status">
            Loading follow-up data…
          </p>
        ) : !storageAvailable ? (
          <p className="p-5 text-sm text-amber-800" role="alert">
            Follow-up data is unavailable until saved invoices can be read.
          </p>
        ) : followUpInvoices.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">
            Nothing needs follow-up right now. Sent invoices with outstanding
            balances will appear here as their due dates approach.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {followUpInvoices.map(({ invoice, state }) => (
              <li
                key={invoice.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenInvoice(invoice)}
                      className="font-semibold text-slate-900 hover:text-blue-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      {invoice.invoiceNumber}
                    </button>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        state.kind === "overdue"
                          ? "bg-rose-50 text-rose-700"
                          : state.kind === "due-today"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {state.kind === "overdue"
                        ? `Overdue · ${state.daysOverdue} ${
                            state.daysOverdue === 1 ? "day" : "days"
                          }`
                        : state.kind === "due-today"
                          ? "Due today"
                          : `Due in ${state.daysUntilDue} ${
                              state.daysUntilDue === 1 ? "day" : "days"
                            }`}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-600">
                    {invoice.client || "Client name"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Due {formatInvoiceDate(invoice.dueDate)}
                    {invoice.followUps.length > 0 &&
                      ` · Last follow-up ${new Date(
                        invoice.followUps.reduce((latest, item) =>
                          item.sentAt > latest.sentAt ? item : latest
                        ).sentAt
                      ).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <p className="mr-auto whitespace-nowrap text-sm font-semibold tabular-nums text-slate-900 sm:mr-2">
                    {formatCurrency(
                      outstandingBalance(invoice),
                      invoice.currency
                    )}
                    <span className="ml-1 text-xs font-normal text-slate-500">
                      due
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenInvoice(invoice)}
                    className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => onCreateReminder(invoice)}
                    disabled={outstandingBalance(invoice) <= 0}
                    aria-label={`Create payment reminder for ${invoice.invoiceNumber}`}
                    className="min-h-10 rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Create reminder
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="invoice-list-heading"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
      >
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2
            id="invoice-list-heading"
            className="text-base font-semibold text-slate-900"
          >
            Invoices
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {storageReady && storageAvailable
              ? `${filteredInvoices.length} of ${invoices.length} ${
                  invoices.length === 1 ? "invoice" : "invoices"
                }`
              : storageReady
                ? "Saved invoice data is unavailable"
                : "Loading saved invoices…"}
          </p>
        </div>

        <div className="space-y-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <label className="block max-w-sm text-sm font-medium text-slate-700">
            <span className="sr-only">Search invoices</span>
            <input
              type="search"
              name="invoice-search"
              autoComplete="off"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search number, client, or email…"
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />
          </label>

          <div
            className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
            aria-label="Filter invoices"
          >
            {filters.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={`min-h-9 shrink-0 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${
                  filter === value
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {!storageReady ? (
          <p className="p-6 text-sm text-slate-500" role="status">
            Loading saved invoices…
          </p>
        ) : !storageAvailable ? (
          <div className="px-6 py-10 text-center">
            <h3 className="font-semibold text-slate-800">
              Couldn’t load your invoices
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Your saved data has not been replaced. Check browser storage
              availability, then refresh to try again.
            </p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="px-6 py-10 text-center sm:py-12">
            <h3 className="font-semibold text-slate-800">
              {invoices.length === 0
                ? "Create your first invoice"
                : "No invoices match"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {invoices.length === 0
                ? "Save an invoice to keep track of client details, due dates, and payments."
                : "Try another search or choose a different status filter."}
            </p>
            {invoices.length === 0 && (
              <button
                type="button"
                onClick={onNewInvoice}
                disabled={!storageReady}
                className="mt-4 min-h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create your first invoice
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[790px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-5 py-3.5">Invoice / Client</th>
                    <th scope="col" className="px-4 py-3.5">Dates</th>
                    <th scope="col" className="px-4 py-3.5 text-right">Total</th>
                    <th scope="col" className="px-4 py-3.5">Balance</th>
                    <th scope="col" className="px-4 py-3.5">Status</th>
                    <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((invoice) => {
                    const status = getInvoiceDisplayStatus(invoice, today);
                    const progress = paymentProgress(invoice);

                    return (
                      <tr
                        key={invoice.id}
                        className="transition-colors hover:bg-slate-50/70"
                      >
                        <th scope="row" className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => onOpenInvoice(invoice)}
                            className="font-semibold text-slate-900 hover:text-blue-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            {invoice.invoiceNumber}
                          </button>
                          <p className="mt-1 max-w-48 truncate text-xs font-normal text-slate-500">
                            {invoice.client || "Client name"}
                            {invoice.clientEmail ? ` · ${invoice.clientEmail}` : ""}
                          </p>
                        </th>
                        <td className="whitespace-nowrap px-4 py-4 text-xs leading-5 text-slate-500">
                          <p>
                            Issued{" "}
                            <span className="text-slate-700">
                              {formatInvoiceDate(invoice.issueDate)}
                            </span>
                          </p>
                          <p>
                            Due{" "}
                            <span className="text-slate-700">
                              {formatInvoiceDate(invoice.dueDate)}
                            </span>
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right font-medium tabular-nums text-slate-800">
                          {formatCurrency(invoiceTotal(invoice), invoice.currency)}
                        </td>
                        <td className="px-4 py-4">
                          <p className="whitespace-nowrap font-medium tabular-nums text-slate-800">
                            {formatCurrency(
                              outstandingBalance(invoice),
                              invoice.currency
                            )}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <div
                              className="h-1 w-16 overflow-hidden rounded-full bg-slate-100"
                              role="progressbar"
                              aria-label={`Payment progress for ${invoice.invoiceNumber}`}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={progress}
                            >
                              <div
                                className="h-full rounded-full bg-blue-600"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-[11px] tabular-nums text-slate-400">
                              {progress}% paid
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <StatusBadge status={status} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenInvoice(invoice)}
                              aria-label={`Open invoice ${invoice.invoiceNumber}`}
                              className="min-h-9 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteInvoice(invoice)}
                              disabled={!storageAvailable}
                              aria-label={`Delete invoice ${invoice.invoiceNumber}`}
                              className="min-h-9 rounded-lg px-3 text-sm font-medium text-rose-600 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
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

            <ul className="divide-y divide-slate-100 md:hidden">
              {filteredInvoices.map((invoice) => {
                const status = getInvoiceDisplayStatus(invoice, today);
                const progress = paymentProgress(invoice);

                return (
                  <li key={invoice.id} className="p-4 sm:px-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onOpenInvoice(invoice)}
                          className="font-semibold text-slate-900 hover:text-blue-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          {invoice.invoiceNumber}
                        </button>
                        <p className="mt-1 truncate text-sm text-slate-600">
                          {invoice.client || "Client name"}
                        </p>
                      </div>
                      <StatusBadge status={status} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-400">Due date</p>
                        <p className="mt-1 font-medium text-slate-700">
                          {formatInvoiceDate(invoice.dueDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Invoice total</p>
                        <p className="mt-1 font-medium tabular-nums text-slate-800">
                          {formatCurrency(invoiceTotal(invoice), invoice.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">
                          Balance · {progress}% paid
                        </p>
                        <p className="mt-1 font-semibold tabular-nums text-slate-900">
                          {formatCurrency(
                            outstandingBalance(invoice),
                            invoice.currency
                          )}
                        </p>
                      </div>
                      <div className="flex items-end justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenInvoice(invoice)}
                          className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteInvoice(invoice)}
                          disabled={!storageAvailable}
                          aria-label={`Delete invoice ${invoice.invoiceNumber}`}
                          className="min-h-10 rounded-lg border border-rose-100 px-3 text-sm font-medium text-rose-600 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </section>
  );
}
