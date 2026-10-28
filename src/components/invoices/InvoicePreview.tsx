"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import {
  calculateSubtotal,
  formatCurrency,
  formatInvoiceDate,
  invoiceTotal,
} from "@/lib/invoice-utils";
import type {
  InvoiceBrandingSettings,
  InvoiceDisplayStatus,
  InvoiceDraft,
  InvoiceTemplate,
} from "@/types/invoice";

type InvoicePreviewProps = {
  invoice: InvoiceDraft;
  status: InvoiceDisplayStatus;
  amountPaid: number;
  balance: number;
  brandingSettings: InvoiceBrandingSettings;
};

function BusinessBlock({
  invoice,
  logoDataUrl,
  align = "left",
}: {
  invoice: InvoiceDraft;
  logoDataUrl: string | null;
  align?: "left" | "right";
}) {
  const alignment = align === "right" ? "text-right" : "";

  return (
    <div className={`min-w-0 ${alignment}`}>
      {logoDataUrl && (
        <Image
          src={logoDataUrl}
          alt={`${invoice.business || "Business"} logo`}
          width={150}
          height={72}
          unoptimized
          className={`mb-3 h-14 w-32 object-contain ${
            align === "right" ? "ml-auto" : ""
          }`}
        />
      )}
      <p className="break-words text-lg font-semibold tracking-tight text-slate-900">
        {invoice.business || "Your business"}
      </p>
      {invoice.businessEmail && (
        <p className="mt-1 break-words text-sm text-slate-600">
          {invoice.businessEmail}
        </p>
      )}
      {invoice.businessPhone && (
        <p className="mt-1 break-words text-sm text-slate-600">
          {invoice.businessPhone}
        </p>
      )}
      {invoice.businessAddress && (
        <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-600">
          {invoice.businessAddress}
        </p>
      )}
      {invoice.businessWebsite && (
        <p className="mt-1 break-all text-sm text-slate-600">
          {invoice.businessWebsite}
        </p>
      )}
      {invoice.businessTaxId && (
        <p className="mt-1 break-words text-sm text-slate-600">
          Tax ID: {invoice.businessTaxId}
        </p>
      )}
    </div>
  );
}

function InvoiceDetails({
  invoice,
  status,
  variant,
}: {
  invoice: InvoiceDraft;
  status: InvoiceDisplayStatus;
  variant: InvoiceTemplate;
}) {
  const modern = variant === "modern";

  return (
    <div
      className={`grid gap-5 sm:grid-cols-2 ${
        modern ? "rounded-xl bg-slate-50 p-5" : "border-y border-slate-200 py-5"
      }`}
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Bill to
        </p>
        <p className="mt-2 break-words font-semibold text-slate-900">
          {invoice.client || "Client name"}
        </p>
        {invoice.clientCompany && (
          <p className="mt-1 break-words text-sm text-slate-600">
            {invoice.clientCompany}
          </p>
        )}
        {invoice.clientEmail && (
          <p className="mt-1 break-all text-sm text-slate-600">
            {invoice.clientEmail}
          </p>
        )}
        {invoice.clientPhone && (
          <p className="mt-1 break-words text-sm text-slate-600">
            {invoice.clientPhone}
          </p>
        )}
        {invoice.clientAddress && (
          <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-600">
            {invoice.clientAddress}
          </p>
        )}
        {invoice.clientTaxId && (
          <p className="mt-1 break-words text-sm text-slate-600">
            Tax ID: {invoice.clientTaxId}
          </p>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:text-right">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Issue date
          </dt>
          <dd className="mt-1 text-sm text-slate-700">
            {formatInvoiceDate(invoice.issueDate)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Due date
          </dt>
          <dd className="mt-1 text-sm text-slate-700">
            {formatInvoiceDate(invoice.dueDate)}
          </dd>
        </div>
        <div className="col-span-2 sm:mt-1">
          <dt className="sr-only">Invoice status</dt>
          <dd className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {status}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function InvoiceItemsTable({
  invoice,
  template,
  currency,
}: {
  invoice: InvoiceDraft;
  template: InvoiceTemplate;
  currency: string;
}) {
  const classic = template === "classic";
  const modern = template === "modern";

  return (
    <div className="invoice-items mt-7 overflow-x-auto">
      <table className="w-full min-w-[430px] text-left text-sm">
        <thead>
          <tr
            className={
              modern
                ? "bg-[var(--invoice-accent)] text-white"
                : classic
                  ? "border-y-2 border-slate-700 text-slate-700"
                  : "border-b border-slate-300 text-slate-600"
            }
          >
            <th scope="col" className="px-3 py-3 font-semibold">
              Description
            </th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">
              Qty
            </th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">
              Unit price
            </th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr
              key={item.id}
              className={
                classic
                  ? "border-b border-slate-200"
                  : "border-b border-slate-100"
              }
            >
              <td className="max-w-[220px] whitespace-pre-wrap break-words px-3 py-3.5 text-slate-800">
                {item.description || "Untitled item"}
              </td>
              <td className="whitespace-nowrap px-3 py-3.5 text-right tabular-nums text-slate-700">
                {item.quantity}
                {item.unitLabel ? ` ${item.unitLabel}` : ""}
              </td>
              <td className="whitespace-nowrap px-3 py-3.5 text-right tabular-nums text-slate-700">
                {formatCurrency(item.price, currency)}
              </td>
              <td className="whitespace-nowrap px-3 py-3.5 text-right font-medium tabular-nums text-slate-900">
                {formatCurrency(item.quantity * item.price, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function InvoicePreview({
  invoice,
  status,
  amountPaid,
  balance,
  brandingSettings,
}: InvoicePreviewProps) {
  const subtotal = calculateSubtotal(invoice.items);
  const total = invoiceTotal(invoice);
  const taxAmount = total - subtotal;
  const money = (amount: number) => formatCurrency(amount, invoice.currency);
  const template = invoice.template;
  const accentStyle = {
    "--invoice-accent": brandingSettings.accentColor,
  } as CSSProperties;

  return (
    <section className="preview-section min-w-0 lg:sticky lg:top-6">
      <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Live preview</h2>
          <p className="mt-1 text-xs text-slate-500">
            {template.charAt(0).toUpperCase() + template.slice(1)} layout
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
        >
          Print / Save PDF
        </button>
      </div>

      <article
        className={`invoice-paper invoice-template-${template} min-h-[600px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 ${
          template === "minimal" ? "sm:p-10" : ""
        }`}
        style={accentStyle}
      >
        {template === "classic" && (
          <>
            <div className="flex items-start justify-between gap-5">
              <BusinessBlock
                invoice={invoice}
                logoDataUrl={brandingSettings.logoDataUrl}
              />
              <div className="shrink-0 text-right">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  INVOICE
                </h1>
                <p className="mt-2 font-semibold text-[var(--invoice-accent)]">
                  #{invoice.invoiceNumber}
                </p>
              </div>
            </div>
            <div
              className="my-6 border-t-2 border-[var(--invoice-accent)]"
              aria-hidden="true"
            />
            <InvoiceDetails
              invoice={invoice}
              status={status}
              variant="classic"
            />
          </>
        )}

        {template === "modern" && (
          <>
            <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--invoice-accent)]">
                  Invoice {invoice.invoiceNumber}
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  INVOICE
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  {formatInvoiceDate(invoice.issueDate)} · Due{" "}
                  {formatInvoiceDate(invoice.dueDate)}
                </p>
              </div>
              <BusinessBlock
                invoice={invoice}
                logoDataUrl={brandingSettings.logoDataUrl}
                align="right"
              />
            </div>
            <div
              className="my-7 h-1 rounded-full bg-[var(--invoice-accent)]"
              aria-hidden="true"
            />
            <InvoiceDetails invoice={invoice} status={status} variant="modern" />
          </>
        )}

        {template === "minimal" && (
          <>
            <div className="flex items-start justify-between gap-5">
              <BusinessBlock
                invoice={invoice}
                logoDataUrl={brandingSettings.logoDataUrl}
              />
              <div className="shrink-0 text-right">
                <h1 className="text-2xl font-medium tracking-tight text-slate-900">
                  Invoice
                </h1>
                <p className="mt-2 text-sm tabular-nums text-slate-600">
                  {invoice.invoiceNumber}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                  {status}
                </p>
              </div>
            </div>
            <div className="my-7 border-t border-slate-300" />
            <InvoiceDetails
              invoice={invoice}
              status={status}
              variant="minimal"
            />
          </>
        )}

        <InvoiceItemsTable
          invoice={invoice}
          template={template}
          currency={invoice.currency}
        />

        <div
          className={`invoice-totals ml-auto mt-7 w-full max-w-sm ${
            template === "modern"
              ? "rounded-xl bg-slate-50 p-5"
              : template === "classic"
                ? "border-t border-slate-300 pt-4"
                : "pt-2"
          }`}
        >
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-4 text-slate-600">
              <span>Subtotal</span>
              <span className="tabular-nums">{money(subtotal)}</span>
            </div>
            <div className="flex justify-between gap-4 text-slate-600">
              <span>Tax ({invoice.tax}%)</span>
              <span className="tabular-nums">{money(taxAmount)}</span>
            </div>
            <div
              className={`flex justify-between gap-4 border-t border-slate-200 pt-3 font-semibold text-slate-900 ${
                template === "modern" ? "text-lg" : "text-base"
              }`}
            >
              <span>Total</span>
              <span className="tabular-nums">{money(total)}</span>
            </div>
            {amountPaid > 0 && (
              <div className="flex justify-between gap-4 text-slate-600">
                <span>Paid</span>
                <span className="tabular-nums">{money(amountPaid)}</span>
              </div>
            )}
            {status !== "draft" && (
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 font-semibold text-[var(--invoice-accent)]">
                <span>Balance due</span>
                <span className="tabular-nums">{money(balance)}</span>
              </div>
            )}
          </div>
        </div>

        {(invoice.paymentInstructions || invoice.paymentTerms || invoice.notes) && (
          <div
            className={`invoice-notes mt-8 space-y-4 border-t pt-5 text-sm ${
              template === "minimal" ? "border-slate-200" : "border-slate-100"
            }`}
          >
            {invoice.paymentInstructions && (
              <div>
                <h2 className="font-semibold text-slate-900">
                  Payment instructions
                </h2>
                <p className="mt-1 whitespace-pre-wrap break-words leading-6 text-slate-600">
                  {invoice.paymentInstructions}
                </p>
              </div>
            )}
            {invoice.paymentTerms && (
              <div>
                <h2 className="font-semibold text-slate-900">Payment terms</h2>
                <p className="mt-1 whitespace-pre-wrap break-words leading-6 text-slate-600">
                  {invoice.paymentTerms}
                </p>
              </div>
            )}
            {invoice.notes && (
              <div>
                <h2 className="font-semibold text-slate-900">Notes</h2>
                <p className="mt-1 whitespace-pre-wrap break-words leading-6 text-slate-600">
                  {invoice.notes}
                </p>
              </div>
            )}
          </div>
        )}

        <div
          className={`invoice-footer mt-10 border-t pt-4 ${
            template === "minimal" ? "border-slate-200" : "border-slate-100"
          }`}
        >
          <p className="text-sm font-semibold text-slate-800">
            Thank you for your business.
          </p>
        </div>
      </article>
    </section>
  );
}
