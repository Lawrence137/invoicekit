"use client";

import InvoicePayments from "@/components/invoices/InvoicePayments";
import InvoiceFollowUpHistory from "@/components/invoices/InvoiceFollowUpHistory";
import InvoiceCustomization from "@/components/invoices/InvoiceCustomization";
import ClientFormModal from "@/components/invoices/ClientFormModal";
import type { CatalogItem } from "@/types/catalog";
import { formatCurrency, invoiceTotal } from "@/lib/invoice-utils";
import { useState } from "react";
import type { Client, ClientProfileDraft } from "@/types/client";
import type {
  InvoiceBrandingSettings,
  InvoiceDisplayStatus,
  InvoiceDraft,
  Invoice,
  InvoiceFollowUp,
  InvoiceTemplate,
  Item,
  Payment,
  PaymentDraft,
} from "@/types/invoice";

type InvoiceEditorProps = {
  draft: InvoiceDraft;
  status: InvoiceDisplayStatus;
  payments: Payment[];
  savedInvoice: Invoice | null;
  balance: number;
  brandingSettings: InvoiceBrandingSettings;
  brandingReady: boolean;
  brandingAvailable: boolean;
  brandingMessage: string;
  storageReady: boolean;
  storageAvailable: boolean;
  storageMessage: string;
  clients: Client[];
  clientStorageReady: boolean;
  clientStorageAvailable: boolean;
  selectedClientId: string | null;
  catalogItems: CatalogItem[];
  catalogReady: boolean;
  catalogAvailable: boolean;
  onChange: <K extends keyof InvoiceDraft>(
    field: K,
    value: InvoiceDraft[K]
  ) => void;
  onItemChange: (
    id: number,
    field: keyof Item,
    value: string | number
  ) => void;
  onAddItem: () => void;
  onRemoveItem: (id: number) => void;
  onSave: () => void;
  onBrandingChange: (
    settings: InvoiceBrandingSettings
  ) => string | null;
  onMarkSent: () => void;
  onSavePayment: (payment: PaymentDraft, paymentId?: string) => string | null;
  onDeletePayment: (payment: Payment) => void;
  onCreateReminder: (invoice: Invoice) => void;
  onDeleteFollowUp: (invoice: Invoice, followUp: InvoiceFollowUp) => void;
  onNewInvoice: () => void;
  onDashboard: () => void;
  onSelectClient: (clientId: string) => void;
  onApplyClient: (client: Client) => void;
  onClientFieldChange: (
    field:
      | "client"
      | "clientCompany"
      | "clientEmail"
      | "clientPhone"
      | "clientAddress"
      | "clientTaxId",
    value: string
  ) => void;
  onSaveClient: (profile: ClientProfileDraft) => Client | null;
  onSelectCatalogItem: (lineItemId: number, item: CatalogItem) => void;
};

const inputClass =
  "mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function InvoiceEditor({
  draft,
  status,
  payments,
  savedInvoice,
  balance,
  brandingSettings,
  brandingReady,
  brandingAvailable,
  brandingMessage,
  storageReady,
  storageAvailable,
  storageMessage,
  clients,
  clientStorageReady,
  clientStorageAvailable,
  selectedClientId,
  catalogItems,
  catalogReady,
  catalogAvailable,
  onChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onSave,
  onBrandingChange,
  onMarkSent,
  onSavePayment,
  onDeletePayment,
  onCreateReminder,
  onDeleteFollowUp,
  onNewInvoice,
  onDashboard,
  onSelectClient,
  onApplyClient,
  onClientFieldChange,
  onSaveClient,
  onSelectCatalogItem,
}: InvoiceEditorProps) {
  const financialFieldsLocked = status !== "draft";
  const [saveAsClientOpen, setSaveAsClientOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState<Record<number, string>>({});

  function changeCurrency(currency: string) {
    const catalogCurrencyChanges = draft.items.some(
      (item) =>
        item.catalogItemId &&
        item.catalogCurrency &&
        item.catalogCurrency !== currency
    );
    if (
      catalogCurrencyChanges &&
      !window.confirm(
        `Some line-item prices were copied from catalog items priced in a different currency. Changing the invoice to ${currency} will change how those saved amounts are displayed and calculated. Continue?`
      )
    ) {
      return;
    }
    onChange("currency", currency);
  }

  return (
    <section className="no-print space-y-6">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={!storageReady || !storageAvailable}
          aria-label={`Save invoice ${draft.invoiceNumber}`}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save Invoice
        </button>
        <button
          type="button"
          onClick={onNewInvoice}
          disabled={!storageReady}
          aria-label="Start a new invoice"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          New Invoice
        </button>
        <button
          type="button"
          onClick={onDashboard}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to dashboard
        </button>
      </div>

      {storageMessage && (
        <p
          className={`text-sm ${storageAvailable ? "text-slate-500" : "text-amber-700"}`}
          role="status"
          aria-live="polite"
        >
          {storageMessage}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-sm text-slate-500">Invoice status</p>
          <p className="mt-1 font-semibold capitalize text-slate-900">
            {status}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Outstanding: {formatCurrency(balance, draft.currency)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Invoice total: {formatCurrency(invoiceTotal(draft), draft.currency)}
          </p>
        </div>
        {status === "draft" && (
          <button
            type="button"
            onClick={onMarkSent}
            disabled={!storageAvailable}
            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark as sent
          </button>
        )}
        {financialFieldsLocked && (
          <p className="max-w-md text-sm text-slate-500">
            Financial details are locked after sending to keep the invoice and
            recorded payments consistent.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Invoice details</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Your business
            <input
              value={draft.business}
              onChange={(event) => onChange("business", event.target.value)}
              className={inputClass}
              placeholder="Your business name"
            />
          </label>

          <label className="text-sm font-medium">
            Business email
            <input
              type="email"
              value={draft.businessEmail}
              onChange={(event) =>
                onChange("businessEmail", event.target.value)
              }
              className={inputClass}
              placeholder="you@business.com"
            />
          </label>

          <label className="text-sm font-medium">
            Business address (optional)
            <textarea
              value={draft.businessAddress}
              onChange={(event) =>
                onChange("businessAddress", event.target.value)
              }
              rows={2}
              className={inputClass}
              placeholder="Street address, city, postal code…"
            />
          </label>

          <label className="text-sm font-medium">
            Business phone (optional)
            <input
              type="tel"
              value={draft.businessPhone}
              onChange={(event) =>
                onChange("businessPhone", event.target.value)
              }
              className={inputClass}
              placeholder="+1 555 0100…"
            />
          </label>

          <label className="text-sm font-medium">
            Website (optional)
            <input
              type="url"
              value={draft.businessWebsite}
              onChange={(event) =>
                onChange("businessWebsite", event.target.value)
              }
              className={inputClass}
              placeholder="https://example.com…"
            />
          </label>

          <label className="text-sm font-medium">
            Tax ID / registration number (optional)
            <input
              value={draft.businessTaxId}
              onChange={(event) =>
                onChange("businessTaxId", event.target.value)
              }
              className={inputClass}
              placeholder="Tax identification number…"
            />
          </label>

          <div className="sm:col-span-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <label className="min-w-52 flex-1 text-sm font-medium">
                Use saved client
                <select
                  aria-label="Select a saved client"
                  value={selectedClientId ?? ""}
                  disabled={!clientStorageReady || !clientStorageAvailable}
                  onChange={(event) => onSelectClient(event.target.value)}
                  className={`${inputClass} bg-white`}
                >
                  <option value="">Enter client details manually</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                      {client.company ? ` · ${client.company}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setSaveAsClientOpen(true)}
                disabled={
                  !clientStorageReady ||
                  !clientStorageAvailable ||
                  !draft.client.trim()
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save as client
              </button>
            </div>
            {!clientStorageReady || !clientStorageAvailable ? (
              <p className="mt-2 text-xs text-amber-700" role="status">
                Saved client profiles are unavailable. You can still enter client
                details manually.
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Saved profiles fill invoice snapshots. Later profile edits will not
                change existing invoices.
              </p>
            )}
          </div>

          <label className="text-sm font-medium">
            Client name
            <input
              value={draft.client}
              onChange={(event) =>
                onClientFieldChange("client", event.target.value)
              }
              className={inputClass}
              placeholder="Client name"
            />
          </label>

          <label className="text-sm font-medium">
            Company (optional)
            <input
              value={draft.clientCompany}
              onChange={(event) =>
                onClientFieldChange("clientCompany", event.target.value)
              }
              className={inputClass}
              placeholder="Company name"
            />
          </label>

          <label className="text-sm font-medium">
            Client email
            <input
              type="email"
              value={draft.clientEmail}
              onChange={(event) =>
                onClientFieldChange("clientEmail", event.target.value)
              }
              className={inputClass}
              placeholder="client@example.com"
            />
          </label>

          <label className="text-sm font-medium">
            Client phone (optional)
            <input
              type="tel"
              value={draft.clientPhone}
              onChange={(event) =>
                onClientFieldChange("clientPhone", event.target.value)
              }
              className={inputClass}
              placeholder="+1 555 0100"
            />
          </label>

          <label className="text-sm font-medium">
            Client billing address (optional)
            <textarea
              value={draft.clientAddress}
              onChange={(event) =>
                onClientFieldChange("clientAddress", event.target.value)
              }
              rows={2}
              className={inputClass}
              placeholder="Street address, city, postal code…"
            />
          </label>

          <label className="text-sm font-medium">
            Client tax ID (optional)
            <input
              value={draft.clientTaxId}
              onChange={(event) =>
                onClientFieldChange("clientTaxId", event.target.value)
              }
              className={inputClass}
              placeholder="Tax or registration number"
            />
          </label>

          <label className="text-sm font-medium">
            Invoice number
            <input
              value={draft.invoiceNumber}
              onChange={(event) =>
                onChange("invoiceNumber", event.target.value)
              }
              disabled={financialFieldsLocked}
              className={inputClass}
            />
          </label>

          <label className="text-sm font-medium">
            Currency
            <select
              value={draft.currency}
              onChange={(event) => changeCurrency(event.target.value)}
              disabled={financialFieldsLocked}
              className={`${inputClass} bg-white`}
            >
              <option value="KES">KES — Kenyan Shilling</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
            </select>
          </label>

          <label className="text-sm font-medium">
            Issue date
            <input
              type="date"
              value={draft.issueDate}
              onChange={(event) => onChange("issueDate", event.target.value)}
              disabled={financialFieldsLocked}
              className={inputClass}
            />
          </label>

          <label className="text-sm font-medium">
            Due date
            <input
              type="date"
              value={draft.dueDate}
              onChange={(event) => onChange("dueDate", event.target.value)}
              disabled={financialFieldsLocked}
              className={inputClass}
            />
          </label>
        </div>
      </div>

      <InvoiceCustomization
        invoice={draft}
        settings={brandingSettings}
        brandingReady={brandingReady}
        brandingAvailable={brandingAvailable}
        brandingMessage={brandingMessage}
        onTemplateChange={(template: InvoiceTemplate) =>
          onChange("template", template)
        }
        onBrandingChange={onBrandingChange}
      />

      {saveAsClientOpen && (
        <ClientFormModal
          initialProfile={{
            name: draft.client,
            company: draft.clientCompany,
            email: draft.clientEmail,
            phone: draft.clientPhone,
            billingAddress: draft.clientAddress,
            taxId: draft.clientTaxId,
            notes: "",
          }}
          onClose={() => setSaveAsClientOpen(false)}
          onSave={(profile) => {
            const client = onSaveClient(profile);
            if (client) onApplyClient(client);
            return client;
          }}
        />
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Line items</h2>
          <button
            type="button"
            onClick={onAddItem}
            disabled={financialFieldsLocked}
            className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            + Add item
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {draft.items.map((item, index) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Item {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  disabled={financialFieldsLocked}
                  className="text-sm text-red-500 hover:text-red-700"
                  aria-label={`Remove item ${index + 1}`}
                >
                  Remove
                </button>
              </div>

              <div className="mb-3">
                <label
                  htmlFor={`catalog-search-${item.id}`}
                  className="block text-xs font-medium text-slate-500"
                >
                  Add from catalog (optional)
                </label>
                <input
                  id={`catalog-search-${item.id}`}
                  type="search"
                  value={catalogSearch[item.id] ?? ""}
                  disabled={
                    financialFieldsLocked || !catalogReady || !catalogAvailable
                  }
                  onChange={(event) =>
                    setCatalogSearch((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                  placeholder="Search active items by name or SKU…"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                />
                {(() => {
                  const search = (catalogSearch[item.id] ?? "")
                    .trim()
                    .toLocaleLowerCase();
                  const options = catalogItems.filter((catalogItem) => {
                    if (
                      !catalogItem.active ||
                      catalogItem.currency !== draft.currency
                    ) {
                      return false;
                    }
                    return (
                      !search ||
                      [
                        catalogItem.name,
                        catalogItem.description,
                        catalogItem.sku,
                      ].some((value) =>
                        value.toLocaleLowerCase().includes(search)
                      )
                    );
                  });
                  const otherCurrencyItems = catalogItems.some(
                    (catalogItem) =>
                      catalogItem.active &&
                      catalogItem.currency !== draft.currency &&
                      (!search ||
                        [catalogItem.name, catalogItem.description, catalogItem.sku]
                          .some((value) =>
                            value.toLocaleLowerCase().includes(search)
                          ))
                  );
                  const selectedCatalogItem = catalogItems.find(
                    (catalogItem) => catalogItem.id === item.catalogItemId
                  );

                  return (
                    <>
                      {selectedCatalogItem && (
                        <p className="mt-1 text-xs text-slate-500">
                          Catalog selection saved as an invoice snapshot.
                          {!selectedCatalogItem.active
                            ? " The catalog item is now archived."
                            : ""}
                          {item.catalogCurrency &&
                            item.catalogCurrency !== draft.currency &&
                            ` Originally priced in ${item.catalogCurrency}; invoice currency is ${draft.currency}.`}
                        </p>
                      )}
                      {search && options.length > 0 && (
                        <ul
                          aria-label={`Catalog matches for line item ${item.id}`}
                          className="mt-2 max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white"
                        >
                          {options.map((catalogItem) => (
                            <li key={catalogItem.id}>
                              <button
                                type="button"
                                disabled={financialFieldsLocked}
                                onClick={() => {
                                  onSelectCatalogItem(item.id, catalogItem);
                                  setCatalogSearch((current) => ({
                                    ...current,
                                    [item.id]: "",
                                  }));
                                }}
                                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 disabled:cursor-not-allowed"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold text-slate-800">
                                    {catalogItem.name}
                                    {catalogItem.sku
                                      ? ` · ${catalogItem.sku}`
                                      : ""}
                                  </span>
                                  {catalogItem.description && (
                                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                                      {catalogItem.description}
                                    </span>
                                  )}
                                </span>
                                <span className="shrink-0 font-medium tabular-nums text-slate-700">
                                  {formatCurrency(
                                    catalogItem.unitPrice,
                                    catalogItem.currency
                                  )}
                                  {catalogItem.unitLabel
                                    ? ` / ${catalogItem.unitLabel}`
                                    : ""}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {search && options.length === 0 && (
                        <p className="mt-2 text-xs text-slate-500">
                          {otherCurrencyItems
                            ? `Matching catalog items use a different currency. Choose ${draft.currency} for this invoice to select them.`
                            : "No active catalog items match. You can continue with a custom line item."}
                        </p>
                      )}
                      {!catalogReady && (
                        <p className="mt-2 text-xs text-slate-500" role="status">
                          Loading catalog…
                        </p>
                      )}
                      {catalogReady && !catalogAvailable && (
                        <p className="mt-2 text-xs text-amber-700" role="status">
                          Catalog unavailable. You can enter this line item manually.
                        </p>
                      )}
                      {catalogAvailable &&
                        catalogReady &&
                        !catalogItems.some(
                          (catalogItem) =>
                            catalogItem.active &&
                            catalogItem.currency === draft.currency
                        ) &&
                        !search && (
                          <p className="mt-2 text-xs text-slate-500">
                            No active catalog items in {draft.currency}. Custom
                            line items are still available.
                          </p>
                        )}
                    </>
                  );
                })()}
              </div>

              <label className="block text-xs font-medium text-slate-500">
                Description
                <input
                  value={item.description}
                  onChange={(event) =>
                    onItemChange(item.id, "description", event.target.value)
                  }
                  disabled={financialFieldsLocked}
                  placeholder="Description of service"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-blue-500"
                />
              </label>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-xs font-medium text-slate-500">
                  Quantity
                  <input
                    type="number"
                    min="0"
                    value={item.quantity}
                    disabled={financialFieldsLocked}
                    onChange={(event) =>
                      onItemChange(
                        item.id,
                        "quantity",
                        Math.max(0, Number(event.target.value))
                      )
                    }
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                  />
                </label>
                <label className="text-xs font-medium text-slate-500">
                  Unit price
                  <input
                    type="number"
                    min="0"
                    value={item.price}
                    disabled={financialFieldsLocked}
                    onChange={(event) =>
                      onItemChange(
                        item.id,
                        "price",
                        Math.max(0, Number(event.target.value))
                      )
                    }
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                  />
                </label>
              </div>
            </div>
          ))}

          {draft.items.length === 0 && (
            <p className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">
              No items yet. Click Add item to get started.
            </p>
          )}
        </div>

        <label className="mt-5 block text-sm font-medium">
          Tax rate (%)
          <input
            type="number"
            min="0"
            max="100"
            value={draft.tax}
            disabled={financialFieldsLocked}
            onChange={(event) =>
              onChange(
                "tax",
                Math.min(100, Math.max(0, Number(event.target.value)))
              )
            }
            className={inputClass}
          />
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Additional information</h2>
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium">
            Payment instructions
            <textarea
              value={draft.paymentInstructions}
              onChange={(event) =>
                onChange("paymentInstructions", event.target.value)
              }
              rows={3}
              className={inputClass}
              placeholder="Bank transfer details or other payment instructions"
            />
          </label>

          <label className="block text-sm font-medium">
            Payment terms (optional)
            <textarea
              value={draft.paymentTerms}
              onChange={(event) => onChange("paymentTerms", event.target.value)}
              rows={2}
              className={inputClass}
              placeholder="e.g. Payment due within 30 days"
            />
          </label>

          <label className="block text-sm font-medium">
            Invoice notes (optional)
            <textarea
              value={draft.notes}
              onChange={(event) => onChange("notes", event.target.value)}
              rows={3}
              className={inputClass}
              placeholder="Add any other information for your client"
            />
          </label>
        </div>
      </div>

      {status !== "draft" && (
        <InvoicePayments
          payments={payments}
          currency={draft.currency}
          status={status}
          balance={balance}
          storageAvailable={storageAvailable}
          onSavePayment={onSavePayment}
          onDeletePayment={onDeletePayment}
        />
      )}
      {savedInvoice && (
        <InvoiceFollowUpHistory
          invoice={savedInvoice}
          balance={balance}
          storageAvailable={storageAvailable}
          onCreateReminder={onCreateReminder}
          onDeleteFollowUp={onDeleteFollowUp}
        />
      )}
    </section>
  );
}
