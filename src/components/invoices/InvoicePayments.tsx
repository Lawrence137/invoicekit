"use client";

import { useState } from "react";
import { formatCurrency, formatInvoiceDate } from "@/lib/invoice-utils";
import type { InvoiceDisplayStatus, Payment, PaymentDraft } from "@/types/invoice";

type InvoicePaymentsProps = {
  payments: Payment[];
  currency: string;
  status: InvoiceDisplayStatus;
  balance: number;
  storageAvailable: boolean;
  onSavePayment: (payment: PaymentDraft, paymentId?: string) => string | null;
  onDeletePayment: (payment: Payment) => void;
};

const emptyPayment = (): PaymentDraft => ({
  date: "",
  amount: 0,
  method: "",
  reference: "",
});

export default function InvoicePayments({
  payments,
  currency,
  status,
  balance,
  storageAvailable,
  onSavePayment,
  onDeletePayment,
}: InvoicePaymentsProps) {
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>(emptyPayment);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const editingPayment = payments.find(
    (payment) => payment.id === editingPaymentId
  );
  const availableBalance = balance + (editingPayment?.amount ?? 0);

  function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = onSavePayment(paymentDraft, editingPaymentId ?? undefined);
    if (message) {
      setError(message);
      return;
    }

    setError("");
    setEditingPaymentId(null);
    setPaymentDraft(emptyPayment());
  }

  function editPayment(payment: Payment) {
    setEditingPaymentId(payment.id);
    setPaymentDraft({
      date: payment.date,
      amount: payment.amount,
      method: payment.method ?? "",
      reference: payment.reference ?? "",
    });
    setError("");
  }

  function cancelEdit() {
    setEditingPaymentId(null);
    setPaymentDraft(emptyPayment());
    setError("");
  }

  return (
    <section
      aria-labelledby="payments-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="payments-heading" className="text-lg font-semibold">
            Payments
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Outstanding: {formatCurrency(balance, currency)}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
          {status}
        </span>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold">Payment history</h3>
        {payments.length === 0 ? (
          <p className="mt-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
            No payments recorded.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-medium">
                    {formatCurrency(payment.amount, currency)}
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      {formatInvoiceDate(payment.date)}
                    </span>
                  </p>
                  {(payment.method || payment.reference) && (
                    <p className="mt-1 text-xs text-slate-500">
                      {[payment.method, payment.reference]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => editPayment(payment)}
                    aria-label={`Edit payment ${payment.id}`}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePayment(payment)}
                    aria-label={`Delete payment ${payment.id}`}
                    className="rounded-lg border border-red-100 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {status !== "draft" && (
        <form
          onSubmit={submitPayment}
          className="mt-5 space-y-4 border-t border-slate-200 pt-5"
        >
          <h3 className="font-semibold">
            {editingPaymentId ? "Correct payment" : "Record a payment"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Payment date
              <input
                type="date"
                required
                value={paymentDraft.date}
                onChange={(event) =>
                  setPaymentDraft((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
              />
            </label>
            <label className="text-sm font-medium">
              Amount
              <input
                type="number"
                required
                min="0.01"
                max={availableBalance}
                step="0.01"
                value={paymentDraft.amount || ""}
                onChange={(event) =>
                  setPaymentDraft((current) => ({
                    ...current,
                    amount: Number(event.target.value),
                  }))
                }
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Available: {formatCurrency(availableBalance, currency)}
              </span>
            </label>
            <label className="text-sm font-medium">
              Payment method (optional)
              <input
                value={paymentDraft.method}
                onChange={(event) =>
                  setPaymentDraft((current) => ({
                    ...current,
                    method: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
                placeholder="Bank transfer, cash, etc."
              />
            </label>
            <label className="text-sm font-medium">
              Reference (optional)
              <input
                value={paymentDraft.reference}
                onChange={(event) =>
                  setPaymentDraft((current) => ({
                    ...current,
                    reference: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
                placeholder="Transaction or receipt number"
              />
            </label>
          </div>
          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!storageAvailable || availableBalance <= 0}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editingPaymentId ? "Save correction" : "Record payment"}
            </button>
            {editingPaymentId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
