"use client";

import { useMemo, useState } from "react";
import CatalogItemFormModal from "@/components/invoices/CatalogItemFormModal";
import { formatCurrency } from "@/lib/invoice-utils";
import type { CatalogItem, CatalogItemDraft } from "@/types/catalog";
import type { Invoice } from "@/types/invoice";

type CatalogDirectoryProps = {
  items: CatalogItem[];
  invoices: Invoice[];
  storageReady: boolean;
  storageAvailable: boolean;
  storageMessage: string;
  invoiceStorageAvailable: boolean;
  onSaveItem: (
    draft: CatalogItemDraft,
    itemId?: string
  ) => CatalogItem | null;
  onToggleActive: (item: CatalogItem) => void;
};

type ItemFilter = "all" | "product" | "service";
type StatusFilter = "active" | "archived";

function normalized(value: string) {
  return value.trim().toLocaleLowerCase();
}

export default function CatalogDirectory({
  items,
  invoices,
  storageReady,
  storageAvailable,
  storageMessage,
  invoiceStorageAvailable,
  onSaveItem,
  onToggleActive,
}: CatalogDirectoryProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ItemFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [formItem, setFormItem] = useState<CatalogItem | null | undefined>(
    undefined
  );
  const usageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const invoice of invoices) {
      for (const lineItem of invoice.items) {
        if (lineItem.catalogItemId) {
          counts.set(
            lineItem.catalogItemId,
            (counts.get(lineItem.catalogItemId) ?? 0) + 1
          );
        }
      }
    }
    return counts;
  }, [invoices]);
  const visibleItems = useMemo(() => {
    const search = normalized(query);
    return items.filter((item) => {
      const matchesStatus = statusFilter === "active" ? item.active : !item.active;
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesQuery =
        !search ||
        [item.name, item.description, item.sku].some((value) =>
          normalized(value).includes(search)
        );
      return matchesStatus && matchesType && matchesQuery;
    });
  }, [items, query, statusFilter, typeFilter]);

  function toggleActive(item: CatalogItem) {
    if (
      item.active &&
      !window.confirm(
        `Archive ${item.name}? It will no longer be offered for new invoice line items. Existing invoices will keep their saved descriptions and prices.`
      )
    ) {
      return;
    }
    onToggleActive(item);
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

      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:p-6">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {storageReady && storageAvailable
              ? `${items.filter((item) => item.active).length} active · ${
                  items.filter((item) => !item.active).length
                } archived`
              : storageReady
                ? "Catalog data unavailable"
                : "Loading catalog…"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Reuse priced products and services on new invoices.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormItem(null)}
          disabled={!storageReady || !storageAvailable}
          className="min-h-11 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add item
        </button>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Products &amp; Services
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Catalog prices are copied into invoices and won’t change when
                this catalog is edited.
              </p>
            </div>
            <label className="w-full text-sm font-medium text-slate-700 sm:max-w-sm">
              <span className="sr-only">Search catalog</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, description, or SKU…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="text-xs font-medium text-slate-500">
              Type
              <select
                aria-label="Filter by item type"
                value={typeFilter}
                onChange={(event) => {
                  if (
                    event.target.value === "all" ||
                    event.target.value === "product" ||
                    event.target.value === "service"
                  ) {
                    setTypeFilter(event.target.value);
                  }
                }}
                className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                <option value="all">All types</option>
                <option value="product">Products</option>
                <option value="service">Services</option>
              </select>
            </label>
            <label className="text-xs font-medium text-slate-500">
              Status
              <select
                aria-label="Filter by catalog status"
                value={statusFilter}
                onChange={(event) => {
                  if (
                    event.target.value === "active" ||
                    event.target.value === "archived"
                  ) {
                    setStatusFilter(event.target.value);
                  }
                }}
                className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>
        </div>

        {!storageReady ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            Loading saved catalog items…
          </p>
        ) : !storageAvailable ? (
          <p className="px-5 py-10 text-center text-sm text-amber-800">
            Catalog items cannot be changed until browser storage is available.
          </p>
        ) : visibleItems.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <h3 className="font-semibold text-slate-900">
              {items.length === 0
                ? "No catalog items yet"
                : query
                  ? "No matching items"
                  : `No ${statusFilter} items${typeFilter === "all" ? "" : ` of type ${typeFilter}`}`}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {items.length === 0
                ? "Add a product or service to reuse its details and price on invoices. You can still add custom line items."
                : "Try changing the search or filters."}
            </p>
            {items.length === 0 && (
              <button
                type="button"
                onClick={() => setFormItem(null)}
                className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Add your first item
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Name</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Type</th>
                    <th scope="col" className="px-4 py-3 font-semibold">SKU</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Unit price</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Unit</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleItems.map((item) => (
                    <tr key={item.id}>
                      <td className="max-w-64 px-5 py-4">
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        {item.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                            {item.description}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-slate-400">
                          {invoiceStorageAvailable
                            ? `Used on ${usageCounts.get(item.id) ?? 0} invoice line(s)`
                            : "Invoice usage unavailable"}
                        </p>
                      </td>
                      <td className="px-4 py-4 capitalize text-slate-600">{item.type}</td>
                      <td className="px-4 py-4 text-slate-600">{item.sku || "—"}</td>
                      <td className="px-4 py-4 text-right font-medium tabular-nums text-slate-900">
                        {formatCurrency(item.unitPrice, item.currency)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">{item.unitLabel || "—"}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {item.active ? "Active" : "Archived"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setFormItem(item)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActive(item)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                          >
                            {item.active ? "Archive" : "Reactivate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 md:hidden">
              {visibleItems.map((item) => (
                <li key={item.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-slate-900">{item.name}</p>
                      {item.description && (
                        <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-500">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">{item.type}</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-slate-400">Unit price</dt>
                      <dd className="mt-1 font-semibold tabular-nums">{formatCurrency(item.unitPrice, item.currency)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">SKU · Unit</dt>
                      <dd className="mt-1 text-slate-700">{[item.sku, item.unitLabel].filter(Boolean).join(" · ") || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">Status · Usage</dt>
                      <dd className="mt-1 text-slate-700">
                        {item.active ? "Active" : "Archived"} ·{" "}
                        {invoiceStorageAvailable
                          ? `${usageCounts.get(item.id) ?? 0} invoice line(s)`
                          : "usage unavailable"}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormItem(item)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(item)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {item.active ? "Archive" : "Reactivate"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {formItem !== undefined && (
        <CatalogItemFormModal
          item={formItem ?? undefined}
          onClose={() => setFormItem(undefined)}
          onSave={onSaveItem}
        />
      )}
    </section>
  );
}
