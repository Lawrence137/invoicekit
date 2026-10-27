"use client";

import Image from "next/image";
import { useState } from "react";
import {
  hasReadableAccentContrast,
  MAX_LOGO_DATA_URL_LENGTH,
} from "@/lib/invoice-branding-storage";
import type {
  InvoiceBrandingSettings,
  InvoiceDraft,
  InvoiceTemplate,
} from "@/types/invoice";

type InvoiceCustomizationProps = {
  invoice: InvoiceDraft;
  settings: InvoiceBrandingSettings;
  brandingReady: boolean;
  brandingAvailable: boolean;
  brandingMessage: string;
  onTemplateChange: (template: InvoiceTemplate) => void;
  onBrandingChange: (settings: InvoiceBrandingSettings) => string | null;
};

const presets = [
  { name: "InvoiceKit Blue", value: "#1d4ed8" },
  { name: "Forest", value: "#047857" },
  { name: "Plum", value: "#6d28d9" },
  { name: "Rose", value: "#be123c" },
  { name: "Slate", value: "#334155" },
] as const;

const templates: ReadonlyArray<{
  value: InvoiceTemplate;
  label: string;
  description: string;
}> = [
  {
    value: "classic",
    label: "Classic",
    description: "Formal layout with structured business and invoice details.",
  },
  {
    value: "modern",
    label: "Modern",
    description: "A bold heading, grouped details, and a highlighted total.",
  },
  {
    value: "minimal",
    label: "Minimal",
    description: "Compact spacing and restrained rules for a clean document.",
  },
];

export default function InvoiceCustomization({
  invoice,
  settings,
  brandingReady,
  brandingAvailable,
  brandingMessage,
  onTemplateChange,
  onBrandingChange,
}: InvoiceCustomizationProps) {
  const [logoError, setLogoError] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const profileChanged =
    invoice.business !== settings.businessProfile.business ||
    invoice.businessEmail !== settings.businessProfile.businessEmail ||
    invoice.businessAddress !== settings.businessProfile.businessAddress ||
    invoice.businessPhone !== settings.businessProfile.businessPhone ||
    invoice.businessWebsite !== settings.businessProfile.businessWebsite ||
    invoice.businessTaxId !== settings.businessProfile.businessTaxId;

  function updateBranding(nextSettings: InvoiceBrandingSettings) {
    const message = onBrandingChange(nextSettings);
    setSettingsError(message ?? "");
  }

  function handleLogoFile(file: File | undefined) {
    setLogoError("");
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setLogoError("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 256 * 1024) {
      setLogoError("Choose a logo smaller than 256 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setLogoError("The selected logo could not be read. Try another image.");
    };
    reader.onload = () => {
      if (
        typeof reader.result !== "string" ||
        reader.result.length > MAX_LOGO_DATA_URL_LENGTH
      ) {
        setLogoError(
          "This logo is too large to store safely in this browser. Choose a smaller image."
        );
        return;
      }

      const message = onBrandingChange({
        ...settings,
        logoDataUrl: reader.result,
      });
      setSettingsError(message ?? "");
      if (message) {
        setLogoError(message);
      }
    };
    reader.readAsDataURL(file);
  }

  function saveBusinessDefaults() {
    const message = onBrandingChange({
      ...settings,
      businessProfile: {
        business: invoice.business,
        businessEmail: invoice.businessEmail,
        businessAddress: invoice.businessAddress,
        businessPhone: invoice.businessPhone,
        businessWebsite: invoice.businessWebsite,
        businessTaxId: invoice.businessTaxId,
      },
    });
    setSettingsError(message ?? "");
  }

  return (
    <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer list-none rounded-2xl px-6 py-5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 [&::-webkit-details-marker]:hidden">
        <span className="flex flex-wrap items-center justify-between gap-3">
          <span>
            <span className="block text-base font-semibold text-slate-900">
              Customize invoice
            </span>
            <span className="mt-1 block text-sm text-slate-500">
              Logo, brand color, business defaults, and layout
            </span>
          </span>
          <span className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">
            {templates.find((template) => template.value === invoice.template)?.label}
          </span>
        </span>
      </summary>

      <div className="space-y-7 border-t border-slate-100 px-6 py-6">
        {brandingMessage && (
          <p
            role={brandingAvailable ? "status" : "alert"}
            className={`rounded-lg border px-3 py-2 text-sm ${
              brandingAvailable
                ? "border-slate-200 bg-slate-50 text-slate-600"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {brandingMessage}
          </p>
        )}
        {!brandingReady && (
          <p role="status" className="text-sm text-slate-500">
            Loading saved branding…
          </p>
        )}

        <section aria-labelledby="invoice-template-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3
                id="invoice-template-heading"
                className="text-sm font-semibold text-slate-900"
              >
                Invoice layout
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Choose a layout for this invoice.
              </p>
            </div>
            {invoice.template !== settings.defaultTemplate && (
              <button
                type="button"
                disabled={!brandingReady || !brandingAvailable}
                onClick={() =>
                  updateBranding({
                    ...settings,
                    defaultTemplate: invoice.template,
                  })
                }
                className="min-h-9 rounded-lg px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Set as default
              </button>
            )}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {templates.map((template) => (
              <button
                key={template.value}
                type="button"
                onClick={() => onTemplateChange(template.value)}
                aria-pressed={invoice.template === template.value}
                disabled={!brandingReady}
                className={`rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 ${
                  invoice.template === template.value
                    ? "border-blue-600 bg-blue-50/40 ring-1 ring-blue-600"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mb-3 block h-16 rounded-lg bg-white p-2 ${
                    template.value === "classic"
                      ? "border border-slate-200"
                      : template.value === "modern"
                        ? "border-t-4 border-blue-600 shadow-sm"
                        : "border-y border-slate-100"
                  }`}
                >
                  {template.value === "classic" ? (
                    <span className="flex h-full flex-col justify-between">
                      <span className="flex justify-between">
                        <span className="h-2 w-10 rounded-sm bg-slate-700" />
                        <span className="h-3 w-7 rounded-sm bg-blue-100" />
                      </span>
                      <span className="h-px w-full bg-slate-200" />
                      <span className="h-2 w-14 rounded-sm bg-slate-200" />
                    </span>
                  ) : template.value === "modern" ? (
                    <span className="flex h-full flex-col justify-between">
                      <span className="h-3 w-16 rounded-sm bg-slate-700" />
                      <span className="flex justify-between">
                        <span className="h-2 w-9 rounded-sm bg-slate-200" />
                        <span className="h-3 w-8 rounded-sm bg-blue-100" />
                      </span>
                    </span>
                  ) : (
                    <span className="flex h-full flex-col justify-between px-1">
                      <span className="h-2 w-12 rounded-sm bg-slate-700" />
                      <span className="h-px w-full bg-slate-200" />
                      <span className="h-2 w-8 rounded-sm bg-slate-200" />
                    </span>
                  )}
                </span>
                <span className="block text-sm font-semibold text-slate-900">
                  {template.label}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  {template.description}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="business-branding-heading"
          className="border-t border-slate-100 pt-6"
        >
          <h3
            id="business-branding-heading"
            className="text-sm font-semibold text-slate-900"
          >
            Business branding
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Saved separately from this invoice. Defaults apply to invoices you
            create later.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            {settings.logoDataUrl ? (
              <Image
                src={settings.logoDataUrl}
                alt="Current business logo"
                width={120}
                height={72}
                unoptimized
                className="h-16 w-28 rounded-lg border border-slate-200 bg-white object-contain p-2"
              />
            ) : (
              <div className="grid h-16 w-28 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs font-medium text-slate-400">
                No logo
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-within:ring-4 focus-within:ring-blue-100">
                {settings.logoDataUrl ? "Replace logo" : "Upload logo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Upload business logo (PNG, JPEG, or WebP)"
                  disabled={!brandingReady || !brandingAvailable}
                  onChange={(event) => {
                    handleLogoFile(event.currentTarget.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                  className="sr-only"
                />
              </label>
              {settings.logoDataUrl && (
                <button
                  type="button"
                  disabled={!brandingReady || !brandingAvailable}
                  onClick={() =>
                    updateBranding({ ...settings, logoDataUrl: null })
                  }
                  className="min-h-10 rounded-lg px-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            PNG, JPEG, or WebP · maximum 256 KB · stored only in this browser
          </p>
          {logoError && (
            <p className="mt-2 text-sm text-rose-700" role="alert">
              {logoError}
            </p>
          )}

          <div className="mt-5">
            <p className="text-sm font-medium text-slate-700">
              Accent color
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() =>
                    updateBranding({
                      ...settings,
                      accentColor: preset.value,
                    })
                  }
                  aria-label={`Use ${preset.name} accent`}
                  aria-pressed={settings.accentColor === preset.value}
                  disabled={!brandingReady || !brandingAvailable}
                  className={`grid size-9 place-items-center rounded-full border-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50 ${
                    settings.accentColor === preset.value
                      ? "border-slate-900"
                      : "border-white shadow-sm ring-1 ring-slate-200"
                  }`}
                  style={{ backgroundColor: preset.value }}
                >
                  {settings.accentColor === preset.value && (
                    <span aria-hidden="true" className="text-sm text-white">
                      ✓
                    </span>
                  )}
                </button>
              ))}
              <label className="ml-1 inline-flex items-center gap-2 text-sm text-slate-600">
                Custom
                <input
                  type="color"
                  aria-label="Choose a custom invoice accent color"
                  value={settings.accentColor}
                  disabled={!brandingReady || !brandingAvailable}
                  onChange={(event) => {
                    const color = event.target.value;
                    if (!hasReadableAccentContrast(color)) {
                      setSettingsError(
                        "Choose a darker color for readable text on white."
                      );
                      return;
                    }
                    updateBranding({ ...settings, accentColor: color });
                  }}
                  className="size-9 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Text accents must meet contrast requirements on a white invoice.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">
                {invoice.business || "Business details not set"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {profileChanged
                  ? "Business details differ from your saved defaults."
                  : "Current business details match your saved defaults."}
              </p>
            </div>
            <button
              type="button"
              disabled={
                !brandingReady ||
                !brandingAvailable ||
                !profileChanged
              }
              onClick={saveBusinessDefaults}
              className="min-h-10 shrink-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save business defaults
            </button>
          </div>
          {settingsError && (
            <p className="mt-3 text-sm text-rose-700" role="alert">
              {settingsError}
            </p>
          )}
        </section>
      </div>
    </details>
  );
}
