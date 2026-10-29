"use client";

import type { Invoice, InvoiceFollowUp } from "@/types/invoice";

type Props = {
  invoice: Invoice;
  balance: number;
  storageAvailable: boolean;
  onCreateReminder: (invoice: Invoice) => void;
  onDeleteFollowUp: (invoice: Invoice, followUp: InvoiceFollowUp) => void;
};

const typeLabels = {
  upcoming: "Upcoming-due reminder",
  overdue: "Overdue reminder",
  final: "Final follow-up",
} as const;

export default function InvoiceFollowUpHistory({
  invoice,
  balance,
  storageAvailable,
  onCreateReminder,
  onDeleteFollowUp,
}: Props) {
  const history = [...invoice.followUps].sort((a, b) =>
    b.sentAt.localeCompare(a.sentAt)
  );
  const canCreateReminder =
    invoice.status === "sent" && balance > 0;

  return (
    <section
      aria-labelledby="follow-up-history-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="follow-up-history-heading"
            className="text-lg font-semibold text-slate-900"
          >
            Payment follow-up history
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Only reminders you confirm as sent are recorded here.
          </p>
        </div>
        {canCreateReminder && (
          <button
            type="button"
            onClick={() => onCreateReminder(invoice)}
            disabled={!storageAvailable}
            className="min-h-10 rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create reminder
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
          No sent reminders recorded for this invoice.
        </p>
      ) : (
        <ol className="mt-4 divide-y divide-slate-100">
          {history.map((followUp) => (
            <li key={followUp.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">
                    {typeLabels[followUp.type]}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Sent{" "}
                    {new Date(followUp.sentAt).toLocaleString()}
                    {followUp.channel
                      ? ` · ${
                          followUp.channel === "whatsapp"
                            ? "WhatsApp"
                            : followUp.channel === "email"
                              ? "Email"
                              : "Other"
                        }`
                      : ""}
                  </p>
                  {followUp.notes && (
                    <p className="mt-1 text-sm text-slate-600">
                      {followUp.notes}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteFollowUp(invoice, followUp)}
                  disabled={!storageAvailable}
                  aria-label={`Delete ${typeLabels[followUp.type]} recorded ${new Date(
                    followUp.sentAt
                  ).toLocaleDateString()}`}
                  className="min-h-9 rounded-lg px-3 text-sm font-medium text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete record
                </button>
              </div>
              <details className="mt-3">
                <summary className="min-h-8 cursor-pointer text-sm font-medium text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  Review sent message
                </summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 font-sans text-sm leading-6 text-slate-700">
                  {followUp.message}
                </pre>
              </details>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
