import type { Invoice, InvoiceDraft, Item } from "@/types/invoice";

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
    client: "John Smith",
    clientEmail: "",
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
  };
}

export function invoiceTotal(invoice: Pick<Invoice, "items" | "tax">) {
  const subtotal = invoice.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  return subtotal + (subtotal * invoice.tax) / 100;
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
    typeof value.quantity === "number" &&
    Number.isFinite(value.quantity) &&
    typeof value.price === "number" &&
    Number.isFinite(value.price)
  );
}

export function isInvoice(value: unknown): value is Invoice {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.invoiceNumber === "string" &&
    typeof value.business === "string" &&
    typeof value.businessEmail === "string" &&
    typeof value.client === "string" &&
    typeof value.clientEmail === "string" &&
    typeof value.issueDate === "string" &&
    typeof value.dueDate === "string" &&
    typeof value.currency === "string" &&
    ["KES", "USD", "EUR", "GBP"].includes(value.currency) &&
    typeof value.tax === "number" &&
    Number.isFinite(value.tax) &&
    typeof value.paymentInstructions === "string" &&
    typeof value.notes === "string" &&
    typeof value.paymentTerms === "string" &&
    value.status === "draft" &&
    Array.isArray(value.items) &&
    value.items.every(isItem)
  );
}
