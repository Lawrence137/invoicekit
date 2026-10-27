"use client";

import {
  calculateSubtotal,
  formatCurrency,
  formatInvoiceDate,
} from "@/lib/invoice-utils";
import type { InvoiceDraft } from "@/types/invoice";

type InvoicePreviewProps = {
  invoice: InvoiceDraft;
};

export default function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const subtotal = calculateSubtotal(invoice.items);
  const taxAmount = (subtotal * invoice.tax) / 100;
  const total = subtotal + taxAmount;
  const money = (amount: number) => formatCurrency(amount, invoice.currency);

  return (
    <section className="preview-section lg:sticky lg:top-6">
      <div className="no-print mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Live preview</h2>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Print / Save PDF
        </button>
      </div>

      <article className="invoice-paper min-h-[600px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-bold tracking-tight">
              {invoice.business || "Your business"}
            </p>
            <p className="mt-2 text-sm text-slate-500">Invoice issued by</p>
            {invoice.businessEmail && (
              <p className="mt-1 break-words text-sm text-slate-500">
                {invoice.businessEmail}
              </p>
            )}
          </div>
          <div className="text-right">
            <h3 className="text-3xl font-light tracking-widest text-blue-600">
              INVOICE
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              #{invoice.invoiceNumber}
            </p>
          </div>
        </div>

        <div className="my-8 border-t border-slate-200" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Bill to
            </p>
            <p className="mt-2 font-semibold">{invoice.client || "Client name"}</p>
            {invoice.clientEmail && (
              <p className="mt-1 break-words text-sm text-slate-500">
                {invoice.clientEmail}
              </p>
            )}
          </div>
          <div className="space-y-4 text-right">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Date issued
              </p>
              <p className="mt-1 text-sm">
                {formatInvoiceDate(invoice.issueDate)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Due date
              </p>
              <p className="mt-1 text-sm">
                {formatInvoiceDate(invoice.dueDate)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-9 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-3 font-medium">Description</th>
                <th className="pb-3 text-right font-medium">Qty</th>
                <th className="pb-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-4 pr-2">
                    {item.description || "Untitled item"}
                  </td>
                  <td className="py-4 text-right">{item.quantity}</td>
                  <td className="whitespace-nowrap py-4 text-right">
                    {money(item.quantity * item.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto mt-8 max-w-xs space-y-3 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Tax ({invoice.tax}%)</span>
            <span>{money(taxAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-4 text-lg font-bold">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
        </div>

        {(invoice.paymentInstructions || invoice.paymentTerms || invoice.notes) && (
          <div className="mt-10 space-y-5 border-t border-slate-200 pt-5 text-sm">
            {invoice.paymentInstructions && (
              <div>
                <h4 className="font-semibold">Payment instructions</h4>
                <p className="mt-1 whitespace-pre-wrap break-words text-slate-600">
                  {invoice.paymentInstructions}
                </p>
              </div>
            )}
            {invoice.paymentTerms && (
              <div>
                <h4 className="font-semibold">Payment terms</h4>
                <p className="mt-1 whitespace-pre-wrap break-words text-slate-600">
                  {invoice.paymentTerms}
                </p>
              </div>
            )}
            {invoice.notes && (
              <div>
                <h4 className="font-semibold">Notes</h4>
                <p className="mt-1 whitespace-pre-wrap break-words text-slate-600">
                  {invoice.notes}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-14 border-t border-slate-200 pt-5">
          <p className="font-semibold">Thank you for your business!</p>
          <p className="mt-1 text-xs text-slate-400">
            Please contact us if you have any questions about this invoice.
          </p>
        </div>
      </article>
    </section>
  );
}
