
"use client";

import { useEffect, useState } from "react";

type Item = {
  id: number;
  description: string;
  quantity: number;
  price: number;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  business: string;
  businessEmail: string;
  client: string;
  clientEmail: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  items: Item[];
  tax: number;
  paymentInstructions: string;
  notes: string;
  paymentTerms: string;
  status: "draft";
};

const STORAGE_KEY = "invoicekit_invoices_v1";

function dateInputValue(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function formatInvoiceDate(value: string) {
  if (!value) return "—";

  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
  });
}

function defaultDates() {
  const issueDate = new Date();
  const dueDate = new Date(issueDate);
  dueDate.setUTCDate(dueDate.getUTCDate() + 30);

  return {
    issueDate: dateInputValue(issueDate),
    dueDate: dateInputValue(dueDate),
  };
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

function isInvoice(value: unknown): value is Invoice {
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

function nextInvoiceNumber(invoices: Invoice[], currentNumber = "") {
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

function createInvoiceId() {
  return crypto.randomUUID();
}

export default function Home() {
  const [business, setBusiness] = useState("Acme Studio");
  const [businessEmail, setBusinessEmail] = useState("");
  const [client, setClient] = useState("John Smith");
  const [clientEmail, setClientEmail] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("INV-001");
  const [dates, setDates] = useState({ issueDate: "", dueDate: "" });
  const [currency, setCurrency] = useState("KES");
  const [tax, setTax] = useState(0);
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [items, setItems] = useState<Item[]>([
    { id: 1, description: "Website design", quantity: 1, price: 25000 },
    { id: 2, description: "Development", quantity: 1, price: 40000 },
  ]);
  const [savedInvoices, setSavedInvoices] = useState<Invoice[]>([]);
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [storageMessage, setStorageMessage] = useState("");

  useEffect(() => {
    let invoices: Invoice[] = [];
    let available = true;
    let message = "";

    try {
      const storedInvoices = window.localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = storedInvoices ? JSON.parse(storedInvoices) : [];

      if (
        !Array.isArray(parsed) ||
        !parsed.every(isInvoice) ||
        new Set(parsed.map((invoice) => invoice.id)).size !== parsed.length
      ) {
        available = false;
        message = "Saved invoice data is invalid. It has been left untouched.";
      } else {
        invoices = parsed;
      }
    } catch {
      available = false;
      message =
        "Saved invoices could not be loaded. Browser storage may be unavailable.";
    }

    const frame = window.requestAnimationFrame(() => {
      setDates(defaultDates());
      setSavedInvoices(invoices);
      setStorageAvailable(available);
      setStorageMessage(message);
      if (available) setInvoiceNumber(nextInvoiceNumber(invoices));
      setStorageReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const total = subtotal + (subtotal * tax) / 100;

  const money = (amount: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);

  function updateItem(
    id: number,
    field: keyof Item,
    value: string | number
  ) {
    setIsDirty(true);
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  function addItem() {
    setIsDirty(true);
    setItems((current) => [
      ...current,
      {
        id: Date.now(),
        description: "",
        quantity: 1,
        price: 0,
      },
    ]);
  }

  function removeItem(id: number) {
    setIsDirty(true);
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function saveInvoice() {
    if (!storageReady || !storageAvailable) {
      setStorageMessage("Saving is unavailable because browser storage could not be read.");
      return false;
    }

    const existing = savedInvoices.find(
      (invoice) => invoice.id === activeInvoiceId
    );
    const invoice: Invoice = {
      id: existing?.id ?? createInvoiceId(),
      invoiceNumber,
      business,
      businessEmail,
      client,
      clientEmail,
      issueDate: dates.issueDate,
      dueDate: dates.dueDate,
      currency,
      items: items.map((item) => ({ ...item })),
      tax,
      paymentInstructions,
      notes,
      paymentTerms,
      status: "draft",
    };
    const updatedInvoices = existing
      ? savedInvoices.map((saved) =>
          saved.id === existing.id ? invoice : saved
        )
      : [...savedInvoices, invoice];

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedInvoices));
      setSavedInvoices(updatedInvoices);
      setActiveInvoiceId(invoice.id);
      setIsDirty(false);
      setStorageMessage(`Invoice ${invoice.invoiceNumber} saved.`);
      return true;
    } catch {
      setStorageMessage(
        "The invoice could not be saved. Check available browser storage and try again."
      );
      return false;
    }
  }

  function saveBeforeSwitch() {
    if (!isDirty) return true;
    if (
      !window.confirm(
        "Save your current invoice changes before switching? Cancel will keep you on this invoice."
      )
    ) {
      return false;
    }

    return saveInvoice();
  }

  function openInvoice(invoice: Invoice) {
    const openingCurrentInvoice = invoice.id === activeInvoiceId;
    if (openingCurrentInvoice && !isDirty) return;
    if (!saveBeforeSwitch()) return;
    if (openingCurrentInvoice) return;

    setBusiness(invoice.business);
    setBusinessEmail(invoice.businessEmail);
    setClient(invoice.client);
    setClientEmail(invoice.clientEmail);
    setInvoiceNumber(invoice.invoiceNumber);
    setDates({ issueDate: invoice.issueDate, dueDate: invoice.dueDate });
    setCurrency(invoice.currency);
    setItems(invoice.items.map((item) => ({ ...item })));
    setTax(invoice.tax);
    setPaymentInstructions(invoice.paymentInstructions);
    setNotes(invoice.notes);
    setPaymentTerms(invoice.paymentTerms);
    setActiveInvoiceId(invoice.id);
    setIsDirty(false);
    setStorageMessage(`Opened invoice ${invoice.invoiceNumber}.`);
  }

  function startNewInvoice() {
    if (!saveBeforeSwitch()) return;

    setBusiness("Acme Studio");
    setBusinessEmail("");
    setClient("");
    setClientEmail("");
    setInvoiceNumber(nextInvoiceNumber(savedInvoices, invoiceNumber));
    setDates(defaultDates());
    setCurrency("KES");
    setItems([]);
    setTax(0);
    setPaymentInstructions("");
    setNotes("");
    setPaymentTerms("");
    setActiveInvoiceId(null);
    setIsDirty(false);
    setStorageMessage("Started a new invoice.");
  }

  function deleteInvoice(invoice: Invoice) {
    if (
      !window.confirm(
        `Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`
      )
    ) {
      return;
    }

    const updatedInvoices = savedInvoices.filter(
      (saved) => saved.id !== invoice.id
    );

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedInvoices));
      setSavedInvoices(updatedInvoices);
      if (activeInvoiceId === invoice.id) {
        setActiveInvoiceId(null);
        setIsDirty(true);
      }
      setStorageMessage(`Invoice ${invoice.invoiceNumber} deleted.`);
    } catch {
      setStorageMessage(
        "The invoice could not be deleted. Check available browser storage and try again."
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a href="/" className="text-xl font-bold tracking-tight">
            Invoice<span className="text-blue-600">Kit</span>
          </a>
          <span className="text-sm text-slate-500">
            Simple invoicing for everyone
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8">
        <div className="no-print mb-8">
          <p className="text-sm font-medium text-blue-600">
            WORKSPACE / INVOICES
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Create an invoice
          </h1>
          <p className="mt-2 text-slate-500">
            Add your details and preview your invoice in real time.
          </p>
        </div>

        <div className="invoice-layout grid items-start gap-8 lg:grid-cols-2">
          {/* Invoice editor */}
          <section className="no-print space-y-6">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveInvoice}
                disabled={!storageReady || !storageAvailable}
                aria-label={`Save invoice ${invoiceNumber}`}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save Invoice
              </button>
              <button
                type="button"
                onClick={startNewInvoice}
                disabled={!storageReady}
                aria-label="Start a new invoice"
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                New Invoice
              </button>
            </div>

            <section
              aria-labelledby="saved-invoices-heading"
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2
                  id="saved-invoices-heading"
                  className="text-lg font-semibold"
                >
                  Saved invoices
                </h2>
                <span className="text-sm text-slate-500">
                  {savedInvoices.length} saved
                </span>
              </div>

              {storageMessage && (
                <p
                  className={`mt-3 text-sm ${storageAvailable ? "text-slate-500" : "text-amber-700"}`}
                  role="status"
                  aria-live="polite"
                >
                  {storageMessage}
                </p>
              )}

              {!storageReady ? (
                <p className="mt-4 text-sm text-slate-500">
                  Loading saved invoices…
                </p>
              ) : savedInvoices.length === 0 ? (
                <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                  No saved invoices yet. Complete the details and select Save
                  Invoice to keep one here.
                </p>
              ) : (
                <ul className="mt-4 max-h-96 space-y-3 overflow-y-auto">
                  {savedInvoices.map((invoice) => {
                    const invoiceTotal =
                      invoice.items.reduce(
                        (sum, item) => sum + item.quantity * item.price,
                        0
                      ) *
                      (1 + invoice.tax / 100);

                    return (
                      <li
                        key={invoice.id}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold">
                              {invoice.invoiceNumber}
                            </p>
                            <p className="mt-1 break-words text-sm text-slate-600">
                              {invoice.client || "Client name"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Issued {formatInvoiceDate(invoice.issueDate)} ·
                              Due {formatInvoiceDate(invoice.dueDate)}
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-700">
                              {new Intl.NumberFormat("en-KE", {
                                style: "currency",
                                currency: invoice.currency,
                                maximumFractionDigits: 2,
                              }).format(invoiceTotal)}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => openInvoice(invoice)}
                              aria-label={`Open invoice ${invoice.invoiceNumber}`}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteInvoice(invoice)}
                              aria-label={`Delete invoice ${invoice.invoiceNumber}`}
                              className="rounded-lg border border-red-100 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Invoice details</h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Your business
                  <input
                    value={business}
                    onChange={(e) => {
                      setBusiness(e.target.value);
                      setIsDirty(true);
                    }}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Your business name"
                  />
                </label>

                <label className="text-sm font-medium">
                  Business email
                  <input
                    type="email"
                    value={businessEmail}
                    onChange={(e) => {
                      setBusinessEmail(e.target.value);
                      setIsDirty(true);
                    }}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="you@business.com"
                  />
                </label>

                <label className="text-sm font-medium">
                  Client name
                  <input
                    value={client}
                    onChange={(e) => {
                      setClient(e.target.value);
                      setIsDirty(true);
                    }}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Client name"
                  />
                </label>

                <label className="text-sm font-medium">
                  Client email
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => {
                      setClientEmail(e.target.value);
                      setIsDirty(true);
                    }}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="client@example.com"
                  />
                </label>

                <label className="text-sm font-medium">
                  Invoice number
                  <input
                    value={invoiceNumber}
                    onChange={(e) => {
                      setInvoiceNumber(e.target.value);
                      setIsDirty(true);
                    }}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="text-sm font-medium">
                  Currency
                  <select
                    value={currency}
                    onChange={(e) => {
                      setCurrency(e.target.value);
                      setIsDirty(true);
                    }}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500"
                  >
                    <option value="KES">KES — Kenyan Shilling</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                  </select>
                </label>

                <label className="text-sm font-medium">
                  Issue date
                  <input
                    type="date"
                    value={dates.issueDate}
                    onChange={(e) => {
                      setDates((current) => ({
                        ...current,
                        issueDate: e.target.value,
                      }));
                      setIsDirty(true);
                    }}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="text-sm font-medium">
                  Due date
                  <input
                    type="date"
                    value={dates.dueDate}
                    onChange={(e) => {
                      setDates((current) => ({
                        ...current,
                        dueDate: e.target.value,
                      }));
                      setIsDirty(true);
                    }}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Line items</h2>
                <button
                  type="button"
                  onClick={addItem}
                  className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  + Add item
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Item {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-sm text-red-500 hover:text-red-700"
                        aria-label={`Remove item ${index + 1}`}
                      >
                        Remove
                      </button>
                    </div>

                    <label className="block text-xs font-medium text-slate-500">
                      Description
                      <input
                        value={item.description}
                        onChange={(e) =>
                          updateItem(item.id, "description", e.target.value)
                        }
                        placeholder="Description of service"
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-blue-500"
                      />
                    </label>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label className="text-xs font-medium text-slate-500">
                        Quantity
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.id, "quantity", Math.max(0, Number(e.target.value)))
                          }
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                        />
                      </label>

                      <label className="text-xs font-medium text-slate-500">
                        Unit price
                        <input
                          type="number"
                          min="0"
                          value={item.price}
                          onChange={(e) =>
                            updateItem(item.id, "price", Math.max(0, Number(e.target.value)))
                          }
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                        />
                      </label>
                    </div>
                  </div>
                ))}

                {items.length === 0 && (
                  <p className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">
                    No items yet. Click Add item to get started.
                  </p>
                )}
              </div>

              <label className="mt-5 block text-sm font-medium">
                Tax rate (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={tax}
                  onChange={(e) => {
                    setTax(Math.min(100, Math.max(0, Number(e.target.value))))
                    setIsDirty(true);
                  }}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Additional information</h2>
              <div className="mt-5 space-y-4">
                <label className="block text-sm font-medium">
                  Payment instructions
                  <textarea
                    value={paymentInstructions}
                    onChange={(e) => {
                      setPaymentInstructions(e.target.value);
                      setIsDirty(true);
                    }}
                    rows={3}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Bank transfer details or other payment instructions"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Payment terms (optional)
                  <textarea
                    value={paymentTerms}
                    onChange={(e) => {
                      setPaymentTerms(e.target.value);
                      setIsDirty(true);
                    }}
                    rows={2}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. Payment due within 30 days"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Invoice notes (optional)
                  <textarea
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      setIsDirty(true);
                    }}
                    rows={3}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Add any other information for your client"
                  />
                </label>
              </div>
            </div>
          </section>

          {/* Live invoice preview */}
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
                    {business || "Your business"}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Invoice issued by
                  </p>
                  {businessEmail && (
                    <p className="mt-1 break-words text-sm text-slate-500">
                      {businessEmail}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <h3 className="text-3xl font-light tracking-widest text-blue-600">
                    INVOICE
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    #{invoiceNumber}
                  </p>
                </div>
              </div>

              <div className="my-8 border-t border-slate-200" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Bill to
                  </p>
                  <p className="mt-2 font-semibold">
                    {client || "Client name"}
                  </p>
                  {clientEmail && (
                    <p className="mt-1 break-words text-sm text-slate-500">
                      {clientEmail}
                    </p>
                  )}
                </div>
                <div className="space-y-4 text-right">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Date issued
                    </p>
                    <p className="mt-1 text-sm">
                      {formatInvoiceDate(dates.issueDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Due date
                    </p>
                    <p className="mt-1 text-sm">
                      {formatInvoiceDate(dates.dueDate)}
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
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-4 pr-2">
                          {item.description || "Untitled item"}
                        </td>
                        <td className="py-4 text-right">{item.quantity}</td>
                        <td className="py-4 text-right whitespace-nowrap">
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
                  <span>Tax ({tax}%)</span>
                  <span>{money((subtotal * tax) / 100)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-4 text-lg font-bold">
                  <span>Total</span>
                  <span>{money(total)}</span>
                </div>
              </div>

              {(paymentInstructions || paymentTerms || notes) && (
                <div className="mt-10 space-y-5 border-t border-slate-200 pt-5 text-sm">
                  {paymentInstructions && (
                    <div>
                      <h4 className="font-semibold">Payment instructions</h4>
                      <p className="mt-1 whitespace-pre-wrap break-words text-slate-600">
                        {paymentInstructions}
                      </p>
                    </div>
                  )}
                  {paymentTerms && (
                    <div>
                      <h4 className="font-semibold">Payment terms</h4>
                      <p className="mt-1 whitespace-pre-wrap break-words text-slate-600">
                        {paymentTerms}
                      </p>
                    </div>
                  )}
                  {notes && (
                    <div>
                      <h4 className="font-semibold">Notes</h4>
                      <p className="mt-1 whitespace-pre-wrap break-words text-slate-600">
                        {notes}
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
        </div>

        <footer className="no-print py-8 text-center text-xs text-slate-400">
          InvoiceKit · Simple invoicing, done right.
        </footer>
      </div>
    </main>
  );
}
