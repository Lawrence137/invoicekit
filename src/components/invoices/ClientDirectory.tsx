"use client";

import { useMemo, useState } from "react";
import ClientFormModal from "@/components/invoices/ClientFormModal";
import {
  formatCurrency,
  formatInvoiceDate,
  getInvoiceDisplayStatus,
  invoiceTotal,
  outstandingBalance,
  totalPaid,
} from "@/lib/invoice-utils";
import type { Client, ClientProfileDraft } from "@/types/client";
import type { Invoice } from "@/types/invoice";

type ClientDirectoryProps = {
  clients: Client[];
  invoices: Invoice[];
  storageReady: boolean;
  storageAvailable: boolean;
  storageMessage: string;
  invoiceStorageAvailable: boolean;
  onSaveClient: (
    profile: ClientProfileDraft,
    clientId?: string
  ) => Client | null;
  onDeleteClient: (client: Client, relatedInvoiceCount: number) => boolean;
  onLinkInvoice: (invoice: Invoice, client: Client) => void;
  onOpenInvoice: (invoice: Invoice) => void;
};

function normalized(value: string) {
  return value.trim().toLocaleLowerCase();
}

function isLegacyMatch(invoice: Invoice, client: Client, clients: Client[]) {
  if (invoice.clientId || !invoice.client.trim()) return false;
  const email = normalized(invoice.clientEmail);
  if (email) {
    const sameEmail = clients.filter(
      (candidate) => normalized(candidate.email) === email
    );
    return sameEmail.length === 1 && sameEmail[0].id === client.id;
  }

  const name = normalized(invoice.client);
  const sameName = clients.filter(
    (candidate) => normalized(candidate.name) === name
  );
  return sameName.length === 1 && sameName[0].id === client.id;
}

function StatusTag({ invoice }: { invoice: Invoice }) {
  const status = getInvoiceDisplayStatus(invoice);
  const style =
    status === "paid"
      ? "bg-emerald-50 text-emerald-700"
      : status === "overdue"
        ? "bg-rose-50 text-rose-700"
        : status === "sent"
          ? "bg-blue-50 text-blue-700"
          : "bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${style}`}
    >
      {status}
    </span>
  );
}

export default function ClientDirectory({
  clients,
  invoices,
  storageReady,
  storageAvailable,
  storageMessage,
  invoiceStorageAvailable,
  onSaveClient,
  onDeleteClient,
  onLinkInvoice,
  onOpenInvoice,
}: ClientDirectoryProps) {
  const [query, setQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [formClient, setFormClient] = useState<Client | null | undefined>(
    undefined
  );
  const selectedClient = clients.find(
    (client) => client.id === selectedClientId
  );
  const matchingClients = useMemo(() => {
    const search = normalized(query);
    if (!search) return clients;
    return clients.filter((client) =>
      [client.name, client.company, client.email].some((value) =>
        normalized(value).includes(search)
      )
    );
  }, [clients, query]);

  const relatedInvoices = selectedClient
    ? invoices.filter(
        (invoice) =>
          invoice.clientId === selectedClient.id ||
          isLegacyMatch(invoice, selectedClient, clients)
      )
    : [];
  const relatedInvoiceIds = new Set(
    relatedInvoices.map((invoice) => invoice.id)
  );
  const unlinkedInvoices = selectedClient && invoiceStorageAvailable
    ? invoices.filter(
        (invoice) =>
          (!invoice.clientId ||
            !clients.some((client) => client.id === invoice.clientId)) &&
          !relatedInvoiceIds.has(invoice.id)
      )
    : [];
  const totalsByCurrency = relatedInvoices.reduce<
    Record<string, { total: number; paid: number; balance: number }>
  >((totals, invoice) => {
    const summary = (totals[invoice.currency] ??= {
      total: 0,
      paid: 0,
      balance: 0,
    });
    summary.total += invoiceTotal(invoice);
    summary.paid += totalPaid(invoice.payments);
    summary.balance += outstandingBalance(invoice);
    return totals;
  }, {});
  const overdueCount = relatedInvoices.filter(
    (invoice) => getInvoiceDisplayStatus(invoice) === "overdue"
  ).length;

  function deleteSelectedClient() {
    if (!selectedClient) return;
    if (
      onDeleteClient(
        selectedClient,
        invoiceStorageAvailable ? relatedInvoices.length : -1
      )
    ) {
      setSelectedClientId(null);
    }
  }

  return (
    <section className="no-print space-y-6">
      {storageMessage && (
        <p
          role={storageAvailable ? "status" : "alert"}
          aria-live="polite"
          className={`rounded-lg border px-4 py-3 text-sm ${
            storageAvailable
              ? "border-slate-200 bg-white text-slate-600"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {storageMessage}
        </p>
      )}
      {!invoiceStorageAvailable && (
        <p
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Invoice history is unavailable, so client statistics and invoice
          associations cannot currently be verified. Client profiles remain
          available.
        </p>
      )}

      {selectedClient ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setSelectedClientId(null)}
                className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                Back to clients
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                  Client profile
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                  {selectedClient.name}
                </h2>
                {selectedClient.company && (
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedClient.company}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormClient(selectedClient)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Edit client
              </button>
              <button
                type="button"
                onClick={deleteSelectedClient}
                className="rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
              >
                Delete client
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">Contact details</h3>
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  ["Email", selectedClient.email],
                  ["Phone", selectedClient.phone],
                  ["Billing address", selectedClient.billingAddress],
                  ["Tax ID", selectedClient.taxId],
                  ["Internal notes", selectedClient.notes],
                ]
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        {label}
                      </dt>
                      <dd className="mt-1 whitespace-pre-line break-words text-slate-700">
                        {value}
                      </dd>
                    </div>
                  ))}
                {!selectedClient.email &&
                  !selectedClient.phone &&
                  !selectedClient.billingAddress &&
                  !selectedClient.taxId &&
                  !selectedClient.notes && (
                    <p className="text-slate-500">No additional contact details.</p>
                  )}
              </dl>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">Invoice summary</h3>
              <p className="mt-1 text-sm text-slate-500">
                {invoiceStorageAvailable
                  ? `${relatedInvoices.length} ${
                      relatedInvoices.length === 1 ? "invoice" : "invoices"
                    } · ${overdueCount} overdue`
                  : "Invoice history unavailable"}
              </p>
              {!invoiceStorageAvailable ? (
                <p className="mt-4 text-sm text-amber-800">
                  Financial totals are not available until saved invoices can be
                  read.
                </p>
              ) : Object.keys(totalsByCurrency).length > 0 ? (
                <div className="mt-4 space-y-4">
                  {Object.entries(totalsByCurrency).map(([currency, totals]) => (
                    <dl
                      key={currency}
                      className="grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-sm"
                    >
                      <div>
                        <dt className="text-xs text-slate-500">Invoiced</dt>
                        <dd className="mt-1 font-semibold tabular-nums">
                          {formatCurrency(totals.total, currency)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Collected</dt>
                        <dd className="mt-1 font-semibold tabular-nums">
                          {formatCurrency(totals.paid, currency)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Outstanding</dt>
                        <dd className="mt-1 font-semibold tabular-nums">
                          {formatCurrency(totals.balance, currency)}
                        </dd>
                      </div>
                    </dl>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  No invoices are associated with this client yet.
                </p>
              )}
            </section>
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="font-semibold text-slate-900">Invoice history</h3>
              <p className="mt-1 text-sm text-slate-500">
                Invoices keep their own saved client details as historical snapshots.
              </p>
            </div>
            {!invoiceStorageAvailable ? (
              <p className="px-5 py-8 text-center text-sm text-amber-800">
                Saved invoice data could not be read. Invoice history has not been
                modified.
              </p>
            ) : relatedInvoices.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {relatedInvoices.map((invoice) => {
                  const legacy = !invoice.clientId;
                  return (
                    <li
                      key={invoice.id}
                      className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onOpenInvoice(invoice)}
                          className="font-semibold text-blue-700 hover:text-blue-800"
                        >
                          {invoice.invoiceNumber}
                        </button>
                        <p className="mt-1 text-xs text-slate-500">
                          Issued {formatInvoiceDate(invoice.issueDate)} · Due{" "}
                          {formatInvoiceDate(invoice.dueDate)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Saved as: {invoice.client || "Client name"}
                          {invoice.clientEmail ? ` · ${invoice.clientEmail}` : ""}
                        </p>
                        {legacy && (
                          <p className="mt-1 text-xs text-amber-700">
                            Matched to this profile using exact saved contact details.
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-right text-sm tabular-nums">
                          <p className="font-semibold text-slate-900">
                            {formatCurrency(invoiceTotal(invoice), invoice.currency)}
                          </p>
                          <p className="text-xs text-slate-500">
                            Balance{" "}
                            {formatCurrency(
                              outstandingBalance(invoice),
                              invoice.currency
                            )}
                          </p>
                        </div>
                        <StatusTag invoice={invoice} />
                        {legacy && (
                          <button
                            type="button"
                            onClick={() => onLinkInvoice(invoice, selectedClient)}
                            disabled={!invoiceStorageAvailable}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Link profile
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                Invoices created before the client directory are matched only when
                saved details identify this client unambiguously.
              </p>
            )}
          </section>

          {unlinkedInvoices.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">
                Associate an existing invoice
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Linking adds a profile reference only. The invoice’s saved client
                details and payment history will not change.
              </p>
              <ul className="mt-3 divide-y divide-slate-100">
                {unlinkedInvoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <p className="text-sm text-slate-700">
                      {invoice.invoiceNumber} · {invoice.client || "Client name"}{" "}
                      {invoice.clientEmail && `· ${invoice.clientEmail}`}
                    </p>
                    <button
                      type="button"
                      onClick={() => onLinkInvoice(invoice, selectedClient)}
                      disabled={!invoiceStorageAvailable}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Link to {selectedClient.name}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <>
          <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:p-6">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {storageReady && storageAvailable
                  ? `${clients.length} ${clients.length === 1 ? "client" : "clients"}`
                  : storageReady
                    ? "Client data unavailable"
                    : "Loading clients…"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Keep client details ready to reuse on future invoices.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormClient(null)}
              disabled={!storageReady || !storageAvailable}
              className="min-h-11 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add client
            </button>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Client directory</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Search saved profiles by name, company, or email.
                </p>
              </div>
              <label className="w-full text-sm font-medium text-slate-700 sm:max-w-sm">
                <span className="sr-only">Search clients</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search clients…"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
            {!storageReady ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500">
                Loading saved clients…
              </p>
            ) : !storageAvailable ? (
              <p className="px-5 py-10 text-center text-sm text-amber-800">
                Client profiles cannot be changed until browser storage is available.
              </p>
            ) : matchingClients.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <h3 className="font-semibold text-slate-900">
                  {clients.length === 0 ? "No clients yet" : "No matching clients"}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {clients.length === 0
                    ? "Add a client profile to reuse their details on invoices. You can still create invoices without saving a profile."
                    : "Try another name, company, or email address."}
                </p>
                {clients.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setFormClient(null)}
                    className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Add your first client
                  </button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {matchingClients.map((client) => (
                  <li
                    key={client.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{client.name}</p>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {[client.company, client.email, client.phone]
                          .filter(Boolean)
                          .join(" · ") || "No additional contact details"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedClientId(client.id)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        View profile
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormClient(client)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {formClient !== undefined && (
        <ClientFormModal
          client={formClient ?? undefined}
          onClose={() => setFormClient(undefined)}
          onSave={(profile) =>
            onSaveClient(profile, formClient?.id)
          }
        />
      )}
    </section>
  );
}
