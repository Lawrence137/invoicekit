"use client";

import { useState, type FormEvent } from "react";
import type { CatalogItem, CatalogItemDraft } from "@/types/catalog";
import { CATALOG_CURRENCIES } from "@/lib/catalog-storage";

type CatalogItemFormModalProps = {
  item?: CatalogItem;
  onClose: () => void;
  onSave: (draft: CatalogItemDraft, itemId?: string) => CatalogItem | null;
};

type FormValues = {
  name: string;
  description: string;
  sku: string;
  type: CatalogItemDraft["type"];
  unitPrice: string;
  currency: string;
  unitLabel: string;
};

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function CatalogItemFormModal({
  item,
  onClose,
  onSave,
}: CatalogItemFormModalProps) {
  const [values, setValues] = useState<FormValues>({
    name: item?.name ?? "",
    description: item?.description ?? "",
    sku: item?.sku ?? "",
    type: item?.type ?? "service",
    unitPrice: item ? String(item.unitPrice) : "",
    currency: item?.currency ?? "KES",
    unitLabel: item?.unitLabel ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = values.name.trim();
    const unitPrice = Number(values.unitPrice);
    if (!name) {
      setError("Enter an item name.");
      return;
    }
    if (
      values.unitPrice.trim() === "" ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      setError("Enter a valid unit price of zero or more.");
      return;
    }
    if ((values.unitPrice.split(".")[1] ?? "").length > 2) {
      setError("Enter a price with no more than two decimal places.");
      return;
    }
    if (!CATALOG_CURRENCIES.some((currency) => currency === values.currency)) {
      setError("Choose a supported currency.");
      return;
    }

    setSaving(true);
    setError("");
    const saved = onSave(
      {
        name,
        description: values.description.trim(),
        sku: values.sku.trim(),
        type: values.type,
        unitPrice,
        currency: values.currency,
        unitLabel: values.unitLabel.trim(),
      },
      item?.id
    );
    if (saved) {
      onClose();
    } else {
      setSaving(false);
      setError(
        "The item could not be saved. Check storage availability and try again."
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-form-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="catalog-form-title"
              className="text-xl font-semibold text-slate-950"
            >
              {item ? "Edit catalog item" : "Add product or service"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Catalog updates never change invoice line items already created.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
          >
            Close
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Name <span className="text-rose-600">*</span>
              <input
                autoFocus
                required
                value={values.name}
                onChange={(event) => update("name", event.target.value)}
                className={fieldClass}
                maxLength={120}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Type
              <select
                value={values.type}
                onChange={(event) => {
                  if (
                    event.target.value === "product" ||
                    event.target.value === "service"
                  ) {
                    update("type", event.target.value);
                  }
                }}
                className={fieldClass}
              >
                <option value="product">Product</option>
                <option value="service">Service</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              SKU / reference (optional)
              <input
                value={values.sku}
                onChange={(event) => update("sku", event.target.value)}
                className={fieldClass}
                maxLength={64}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Unit price <span className="text-rose-600">*</span>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                inputMode="decimal"
                value={values.unitPrice}
                onChange={(event) => update("unitPrice", event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Currency
              <select
                value={values.currency}
                onChange={(event) => update("currency", event.target.value)}
                className={fieldClass}
              >
                {CATALOG_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Unit label (optional)
              <input
                value={values.unitLabel}
                onChange={(event) => update("unitLabel", event.target.value)}
                placeholder="hour, item, day…"
                className={fieldClass}
                maxLength={32}
              />
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Description (optional)
              <textarea
                rows={3}
                value={values.description}
                onChange={(event) => update("description", event.target.value)}
                className={fieldClass}
                maxLength={500}
              />
            </label>
          </div>
          {error && (
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {item ? "Save changes" : "Add item"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
