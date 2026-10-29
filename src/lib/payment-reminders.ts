import {
  formatCurrency,
  formatInvoiceDate,
  getPaymentFollowUpState,
  invoiceTotal,
  outstandingBalance,
  totalPaid,
} from "@/lib/invoice-utils";
import type {
  Invoice,
  PaymentReminderType,
} from "@/types/invoice";

export function getDefaultReminderType(
  invoice: Invoice,
  today?: string
): PaymentReminderType {
  return getPaymentFollowUpState(invoice, today).kind === "overdue"
    ? "overdue"
    : "upcoming";
}

export function buildPaymentReminderMessage(
  invoice: Invoice,
  type: PaymentReminderType
) {
  const clientName = invoice.client.trim();
  const businessName = invoice.business.trim();
  const balance = outstandingBalance(invoice);
  const paid = totalPaid(invoice.payments);
  const followUpState = getPaymentFollowUpState(invoice);
  const greeting = clientName ? `Hello ${clientName},` : "Hello,";
  const dueText = invoice.dueDate ? ` (due ${formatInvoiceDate(invoice.dueDate)})` : "";
  const intro =
    type === "upcoming"
      ? followUpState.kind === "overdue"
        ? `This is a friendly reminder that invoice ${invoice.invoiceNumber}${dueText} is past its due date.`
        : followUpState.kind === "due-today"
          ? `This is a friendly reminder that invoice ${invoice.invoiceNumber} is due today.`
          : `This is a friendly reminder that invoice ${invoice.invoiceNumber}${dueText} is coming due.`
      : type === "overdue"
        ? followUpState.kind === "overdue"
          ? `Our records show that invoice ${invoice.invoiceNumber}${dueText} is now overdue.`
          : `This is a polite reminder that invoice ${invoice.invoiceNumber}${dueText} still has an outstanding balance.`
        : followUpState.kind === "overdue"
          ? `I’m following up once more regarding overdue invoice ${invoice.invoiceNumber}${dueText}.`
          : `I’m following up once more regarding the outstanding balance on invoice ${invoice.invoiceNumber}${dueText}.`;
  const paymentSummary = [
    `Original invoice total: ${formatCurrency(
      invoiceTotal(invoice),
      invoice.currency
    )}.`,
    ...(paid > 0
      ? [`Amount received: ${formatCurrency(paid, invoice.currency)}.`]
      : []),
    `Remaining balance: ${formatCurrency(balance, invoice.currency)}.`,
  ].join("\n");
  const businessContact = [
    invoice.businessAddress.trim(),
    invoice.businessEmail.trim(),
    invoice.businessPhone.trim(),
    invoice.businessWebsite.trim(),
  ].filter(Boolean);

  return [
    greeting,
    "",
    intro,
    "",
    paymentSummary,
    ...(invoice.paymentInstructions.trim()
      ? ["", "Payment instructions:", invoice.paymentInstructions.trim()]
      : []),
    "",
    "Please let me know if you have already made this payment or have any questions.",
    "",
    "Kind regards,",
    ...(businessName ? [businessName] : []),
    ...businessContact,
  ].join("\n");
}

export function paymentReminderTypeLabel(type: PaymentReminderType) {
  switch (type) {
    case "upcoming":
      return "Friendly upcoming-due reminder";
    case "overdue":
      return "Polite overdue reminder";
    case "final":
      return "Final follow-up";
  }
}
