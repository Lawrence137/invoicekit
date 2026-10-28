import type {
  Invoice,
  InvoiceDisplayStatus,
  InvoiceDraft,
  InvoiceTemplate,
  Item,
  Payment,
  PaymentDraft,
} from "@/types/invoice";

export function dateInputValue(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function formatInvoiceDate(value: string) {
  if (!value) return "—";

  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
  });
}

export function defaultDates() {
  const issueDate = new Date();
  const dueDate = new Date(issueDate);
  dueDate.setUTCDate(dueDate.getUTCDate() + 30);

  return {
    issueDate: dateInputValue(issueDate),
    dueDate: dateInputValue(dueDate),
  };
}

export function createInitialInvoiceDraft(): InvoiceDraft {
  return {
    invoiceNumber: "INV-001",
    business: "Acme Studio",
    businessEmail: "",
    businessAddress: "",
    businessPhone: "",
    businessWebsite: "",
    businessTaxId: "",
    client: "John Smith",
    clientCompany: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
    clientTaxId: "",
    issueDate: "",
    dueDate: "",
    currency: "KES",
    items: [
      { id: 1, description: "Website design", quantity: 1, price: 25000 },
      { id: 2, description: "Development", quantity: 1, price: 40000 },
    ],
    tax: 0,
    paymentInstructions: "",
    notes: "",
    paymentTerms: "",
    template: "modern",
  };
}

export function isInvoiceTemplate(value: unknown): value is InvoiceTemplate {
  return value === "classic" || value === "modern" || value === "minimal";
}

export function invoiceTotal(invoice: Pick<Invoice, "items" | "tax">) {
  const subtotal = calculateSubtotal(invoice.items);
  return roundCurrency(subtotal + (subtotal * invoice.tax) / 100);
}

export function calculateSubtotal(items: Item[]) {
  return items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
}

export function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function roundCurrency(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function totalPaid(payments: Payment[]) {
  return roundCurrency(
    payments.reduce((total, payment) => total + payment.amount, 0)
  );
}

export function outstandingBalance(invoice: Invoice) {
  return roundCurrency(Math.max(0, invoiceTotal(invoice) - totalPaid(invoice.payments)));
}

export function paymentProgress(invoice: Invoice) {
  const total = invoiceTotal(invoice);
  if (total <= 0) return invoice.status === "paid" ? 100 : 0;
  return Math.min(100, Math.round((totalPaid(invoice.payments) / total) * 100));
}

export function getInvoiceDisplayStatus(
  invoice: Invoice,
  today = dateInputValue(new Date())
): InvoiceDisplayStatus {
  if (outstandingBalance(invoice) === 0 && invoice.status === "paid") {
    return "paid";
  }
  if (
    invoice.status === "sent" &&
    invoice.dueDate &&
    invoice.dueDate < today &&
    outstandingBalance(invoice) > 0
  ) {
    return "overdue";
  }
  return invoice.status;
}

export function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && dateInputValue(date) === value;
}

export function validatePayment(
  payment: PaymentDraft,
  availableBalance: number
): string | null {
  if (!isValidIsoDate(payment.date)) return "Enter a valid payment date.";
  if (!Number.isFinite(payment.amount) || payment.amount <= 0) {
    return "Payment amount must be greater than zero.";
  }
  if (roundCurrency(payment.amount) > roundCurrency(availableBalance)) {
    return "Payment amount cannot exceed the outstanding balance.";
  }
  return null;
}

export function nextInvoiceNumber(invoices: Invoice[], currentNumber = "") {
  const usedNumbers = new Set(invoices.map((invoice) => invoice.invoiceNumber));
  const numbers = [...usedNumbers, currentNumber]
    .map((number) => number.match(/^INV-(\d+)$/i)?.[1])
    .filter((number): number is string => number !== undefined)
    .map(Number);
  let next = Math.max(0, ...numbers) + 1;
  let invoiceNumber = `INV-${String(next).padStart(3, "0")}`;

  while (usedNumbers.has(invoiceNumber)) {
    next += 1;
    invoiceNumber = `INV-${String(next).padStart(3, "0")}`;
  }

  return invoiceNumber;
}

export function createInvoiceId() {
  return crypto.randomUUID();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function isItem(value: unknown): value is Item {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "number" &&
    Number.isFinite(value.id) &&
    typeof value.description === "string" &&
    (value.catalogItemId === undefined ||
      (typeof value.catalogItemId === "string" &&
        value.catalogItemId.length > 0)) &&
    (value.catalogCurrency === undefined ||
      (typeof value.catalogCurrency === "string" &&
        ["KES", "USD", "EUR", "GBP"].includes(value.catalogCurrency))) &&
    (value.unitLabel === undefined || typeof value.unitLabel === "string") &&
    typeof value.quantity === "number" &&
    Number.isFinite(value.quantity) &&
    value.quantity >= 0 &&
    typeof value.price === "number" &&
    Number.isFinite(value.price) &&
    value.price >= 0
  );
}

function isPayment(value: unknown): value is Payment {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.date === "string" &&
    isValidIsoDate(value.date) &&
    typeof value.amount === "number" &&
    Number.isFinite(value.amount) &&
    value.amount > 0 &&
    (value.method === undefined || typeof value.method === "string") &&
    (value.reference === undefined || typeof value.reference === "string")
  );
}

export function isInvoice(value: unknown): value is Invoice {
  if (!isRecord(value)) return false;

  if (
    typeof value.id !== "string" ||
    (value.clientId !== undefined &&
      (typeof value.clientId !== "string" || value.clientId.length === 0)) ||
    typeof value.invoiceNumber !== "string" ||
    typeof value.business !== "string" ||
    typeof value.businessEmail !== "string" ||
    typeof value.businessAddress !== "string" ||
    typeof value.businessPhone !== "string" ||
    typeof value.businessWebsite !== "string" ||
    typeof value.businessTaxId !== "string" ||
    typeof value.client !== "string" ||
    typeof value.clientCompany !== "string" ||
    typeof value.clientEmail !== "string" ||
    typeof value.clientPhone !== "string" ||
    typeof value.clientAddress !== "string" ||
    typeof value.clientTaxId !== "string" ||
    typeof value.issueDate !== "string" ||
    typeof value.dueDate !== "string" ||
    typeof value.currency !== "string" ||
    typeof value.tax !== "number" ||
    typeof value.paymentInstructions !== "string" ||
    typeof value.notes !== "string" ||
    typeof value.paymentTerms !== "string" ||
    !isInvoiceTemplate(value.template) ||
    !Array.isArray(value.items) ||
    !Array.isArray(value.payments)
  ) {
    return false;
  }

  if (
    (value.issueDate !== "" && !isValidIsoDate(value.issueDate)) ||
    (value.dueDate !== "" && !isValidIsoDate(value.dueDate)) ||
    !["KES", "USD", "EUR", "GBP"].includes(value.currency) ||
    !Number.isFinite(value.tax) ||
    value.tax < 0 ||
    value.tax > 100 ||
    (value.status !== "draft" &&
      value.status !== "sent" &&
      value.status !== "paid") ||
    !value.items.every(isItem) ||
    !value.payments.every(isPayment)
  ) {
    return false;
  }

  const items = value.items.filter(isItem);
  const payments = value.payments.filter(isPayment);
  if (
    new Set(payments.map((payment) => payment.id)).size !== payments.length
  ) {
    return false;
  }

  const paid = totalPaid(payments);
  const subtotal = calculateSubtotal(items);
  const total = roundCurrency(subtotal + (subtotal * value.tax) / 100);
  return (
    paid <= total &&
    (value.status !== "paid" || paid >= total) &&
    (value.status !== "draft" || payments.length === 0)
  );
}

export function normalizeInvoice(value: unknown): Invoice | null {
  if (!isRecord(value)) return null;
  const normalized = {
    ...value,
    payments: value.payments === undefined ? [] : value.payments,
    businessAddress:
      value.businessAddress === undefined ? "" : value.businessAddress,
    businessPhone:
      value.businessPhone === undefined ? "" : value.businessPhone,
    businessWebsite:
      value.businessWebsite === undefined ? "" : value.businessWebsite,
    businessTaxId:
      value.businessTaxId === undefined ? "" : value.businessTaxId,
    clientCompany: value.clientCompany === undefined ? "" : value.clientCompany,
    clientPhone: value.clientPhone === undefined ? "" : value.clientPhone,
    clientAddress: value.clientAddress === undefined ? "" : value.clientAddress,
    clientTaxId: value.clientTaxId === undefined ? "" : value.clientTaxId,
    template: value.template === undefined ? "modern" : value.template,
  };
  if (!isInvoice(normalized)) return null;
  if (
    normalized.status === "sent" &&
    invoiceTotal(normalized) > 0 &&
    outstandingBalance(normalized) === 0
  ) {
    return { ...normalized, status: "paid" };
  }
  return normalized;
}
