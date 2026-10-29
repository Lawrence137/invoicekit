"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatCurrency,
  invoiceTotal,
  outstandingBalance,
  totalPaid,
} from "@/lib/invoice-utils";
import {
  buildPaymentReminderMessage,
  getDefaultReminderType,
  paymentReminderTypeLabel,
} from "@/lib/payment-reminders";
import type {
  Invoice,
  PaymentReminderType,
  ReminderChannel,
} from "@/types/invoice";

type Props = {
  invoice: Invoice;
  onClose: () => void;
  onRecordSent: (entry: {
    type: PaymentReminderType;
    message: string;
    channel?: ReminderChannel;
    notes?: string;
  }) => string | null;
};

const reminderTypes: PaymentReminderType[] = [
  "upcoming",
  "overdue",
  "final",
];

export default function PaymentReminderModal({
  invoice,
  onClose,
  onRecordSent,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState(() => getDefaultReminderType(invoice));
  const [message, setMessage] = useState(() =>
    buildPaymentReminderMessage(invoice, getDefaultReminderType(invoice))
  );
  const [channel, setChannel] = useState<ReminderChannel | "">("");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackError, setFeedbackError] = useState(false);
  const [recorded, setRecorded] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setFeedback("Reminder copied. Send it through your preferred channel.");
      setFeedbackError(false);
    } catch {
      setFeedback(
        "Could not copy the reminder. Check clipboard permissions and try again."
      );
      setFeedbackError(true);
    }
  }

  function recordSent() {
    const error = onRecordSent({
      type,
      message,
      ...(channel ? { channel } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
    if (error) {
      setFeedback(error);
      setFeedbackError(true);
      return;
    }
    setRecorded(true);
    setFeedback("Recorded as sent. Invoice status and payment details are unchanged.");
    setFeedbackError(false);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="reminder-title"
      className="no-print m-auto max-h-[min(90dvh,900px)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="reminder-title"
              className="text-xl font-semibold tracking-tight"
            >
              Payment reminder
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {invoice.invoiceNumber} · {invoice.client || "Client"}
            </p>
            {invoice.clientEmail && (
              <p className="mt-1 text-xs text-slate-500">
                Recipient: {invoice.clientEmail}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment reminder"
            className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Invoice total</p>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {formatCurrency(invoiceTotal(invoice), invoice.currency)}
            </p>
          </div>
          {totalPaid(invoice.payments) > 0 && (
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Paid</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatCurrency(totalPaid(invoice.payments), invoice.currency)}
              </p>
            </div>
          )}
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-xs text-blue-700">Remaining balance</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-blue-900">
              {formatCurrency(outstandingBalance(invoice), invoice.currency)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-7">
        <label className="block text-sm font-medium">
          Reminder style
          <select
            autoFocus
            value={type}
            disabled={recorded}
            onChange={(event) => {
              const nextType = reminderTypes.find(
                (reminderType) => reminderType === event.currentTarget.value
              );
              if (!nextType) return;
              setType(nextType);
              setMessage(buildPaymentReminderMessage(invoice, nextType));
              setFeedback("");
            }}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
          >
            {reminderTypes.map((reminderType) => (
              <option key={reminderType} value={reminderType}>
                {paymentReminderTypeLabel(reminderType)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Editable reminder message
          <textarea
            value={message}
            disabled={recorded}
            onChange={(event) => setMessage(event.currentTarget.value)}
            rows={12}
            className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-3 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Channel (optional)
            <select
              value={channel}
              disabled={recorded}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setChannel(
                  value === "email" ||
                    value === "whatsapp" ||
                    value === "other"
                    ? value
                    : ""
                );
              }}
              className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
            >
              <option value="">Not specified</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Notes (optional)
            <input
              value={notes}
              disabled={recorded}
              onChange={(event) => setNotes(event.currentTarget.value)}
              className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              placeholder="Private follow-up note"
            />
          </label>
        </div>

        <p className="text-xs leading-5 text-slate-500">
          InvoiceKit does not send this message. Copy it to send using your own
          email or messaging app.
        </p>

        {feedback && (
          <p
            role={feedbackError ? "alert" : "status"}
            aria-live={feedbackError ? "assertive" : "polite"}
            className={`rounded-lg px-3 py-2 text-sm ${
              feedbackError
                ? "bg-rose-50 text-rose-800"
                : "bg-emerald-50 text-emerald-800"
            }`}
          >
            {feedback}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
          >
            {recorded ? "Close" : "Cancel"}
          </button>
          {!recorded && (
            <>
              <button
                type="button"
                onClick={copyMessage}
                disabled={!message.trim()}
                className="min-h-11 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-800 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Copy reminder
              </button>
              <button
                type="button"
                onClick={recordSent}
                disabled={!message.trim()}
                className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Record as sent
              </button>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
