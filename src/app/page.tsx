"use client";

import { useEffect, useState } from "react";
import InvoiceDashboard from "@/components/invoices/InvoiceDashboard";
import InvoiceEditor from "@/components/invoices/InvoiceEditor";
import InvoicePreview from "@/components/invoices/InvoicePreview";
import { readInvoices, writeInvoices } from "@/lib/invoice-storage";
import {
  createInitialInvoiceDraft,
  createInvoiceId,
  defaultDates,
  getInvoiceDisplayStatus,
  invoiceTotal,
  nextInvoiceNumber,
  outstandingBalance,
  totalPaid,
  validatePayment,
} from "@/lib/invoice-utils";
import type {
  Invoice,
  InvoiceDraft,
  InvoiceView,
  Item,
  Payment,
  PaymentDraft,
} from "@/types/invoice";

export default function Home() {
  const [draft, setDraft] = useState<InvoiceDraft>(createInitialInvoiceDraft);
  const [savedInvoices, setSavedInvoices] = useState<Invoice[]>([]);
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [storageMessage, setStorageMessage] = useState("");
  const [currentView, setCurrentView] = useState<InvoiceView>("dashboard");

  useEffect(() => {
    const result = readInvoices();
    const timer = window.setTimeout(() => {
      setDraft((current) => ({ ...current, ...defaultDates() }));

      if (result.ok) {
        setSavedInvoices(result.value);
        setStorageAvailable(result.storageAvailable);
        setStorageMessage(result.message);
        setDraft((current) => ({
          ...current,
          invoiceNumber: nextInvoiceNumber(result.value),
        }));
      } else {
        setStorageAvailable(false);
        setStorageMessage(result.message);
      }

      setStorageReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function updateDraft<K extends keyof InvoiceDraft>(
    field: K,
    value: InvoiceDraft[K]
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    setIsDirty(true);
  }

  function updateItem(id: number, field: keyof Item, value: string | number) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
    setIsDirty(true);
  }

  function addItem() {
    setDraft((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id: Date.now(),
          description: "",
          quantity: 1,
          price: 0,
        },
      ],
    }));
    setIsDirty(true);
  }

  function removeItem(id: number) {
    setDraft((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== id),
    }));
    setIsDirty(true);
  }

  function saveInvoice(): Invoice | null {
    if (!storageReady || !storageAvailable) {
      setStorageMessage(
        "Saving is unavailable because browser storage could not be read."
      );
      return null;
    }

    const existing = savedInvoices.find(
      (invoice) => invoice.id === activeInvoiceId
    );
    const invoice: Invoice = {
      ...draft,
      id: existing?.id ?? createInvoiceId(),
      items: draft.items.map((item) => ({ ...item })),
      status: existing?.status ?? "draft",
      payments: existing?.payments ?? [],
    };
    if (
      savedInvoices.some(
        (saved) =>
          saved.id !== invoice.id &&
          saved.invoiceNumber.toLocaleLowerCase() ===
            invoice.invoiceNumber.toLocaleLowerCase()
      )
    ) {
      setStorageMessage("Invoice number is already in use.");
      return null;
    }

    const updatedInvoices = existing
      ? savedInvoices.map((saved) =>
          saved.id === existing.id ? invoice : saved
        )
      : [...savedInvoices, invoice];
    const result = writeInvoices(updatedInvoices);

    if (!result.ok) {
      setStorageMessage(result.message);
      return null;
    }

    setSavedInvoices(updatedInvoices);
    setActiveInvoiceId(invoice.id);
    setIsDirty(false);
    setStorageMessage(`Invoice ${invoice.invoiceNumber} saved.`);
    return invoice;
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

    return saveInvoice() !== null;
  }

  function openInvoice(invoice: Invoice) {
    const openingCurrentInvoice = invoice.id === activeInvoiceId;
    if (openingCurrentInvoice && !isDirty) {
      setCurrentView("editor");
      return;
    }
    if (!saveBeforeSwitch()) return;

    if (!openingCurrentInvoice) {
      const { id, ...invoiceDraft } = invoice;
      setDraft({
        ...invoiceDraft,
        items: invoice.items.map((item) => ({ ...item })),
      });
      setActiveInvoiceId(id);
      setIsDirty(false);
      setStorageMessage(`Opened invoice ${invoice.invoiceNumber}.`);
    }

    setCurrentView("editor");
  }

  function startNewInvoice() {
    if (!saveBeforeSwitch()) return;

    const dates = defaultDates();
    setDraft({
      ...createInitialInvoiceDraft(),
      ...dates,
      client: "",
      items: [],
      invoiceNumber: nextInvoiceNumber(savedInvoices, draft.invoiceNumber),
    });
    setActiveInvoiceId(null);
    setIsDirty(false);
    setStorageMessage("Started a new invoice.");
    setCurrentView("editor");
  }

  function showDashboard() {
    if (!saveBeforeSwitch()) return;
    setCurrentView("dashboard");
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
    const result = writeInvoices(updatedInvoices);

    if (!result.ok) {
      setStorageMessage(result.message);
      return;
    }

    setSavedInvoices(updatedInvoices);
    if (activeInvoiceId === invoice.id) {
      setActiveInvoiceId(null);
      setIsDirty(false);
    }
    setStorageMessage(`Invoice ${invoice.invoiceNumber} deleted.`);
  }

  function updatePersistedInvoice(updatedInvoice: Invoice) {
    const alreadySaved = savedInvoices.some(
      (invoice) => invoice.id === updatedInvoice.id
    );
    const updatedInvoices = alreadySaved
      ? savedInvoices.map((invoice) =>
          invoice.id === updatedInvoice.id ? updatedInvoice : invoice
        )
      : [...savedInvoices, updatedInvoice];
    const result = writeInvoices(updatedInvoices);
    if (!result.ok) {
      setStorageMessage(result.message);
      return false;
    }
    setSavedInvoices(updatedInvoices);
    return true;
  }

  function markInvoiceSent() {
    if (!storageAvailable) return;
    if (!window.confirm("Mark this invoice as sent? Its financial details will be locked.")) {
      return;
    }

    const invoice = saveInvoice();
    if (!invoice) return;
    const sentInvoice: Invoice = { ...invoice, status: "sent" };
    if (updatePersistedInvoice(sentInvoice)) {
      setIsDirty(false);
      setStorageMessage(`Invoice ${sentInvoice.invoiceNumber} marked as sent.`);
    }
  }

  function savePayment(paymentDraft: PaymentDraft, paymentId?: string) {
    const invoice = savedInvoices.find(
      (saved) => saved.id === activeInvoiceId
    );
    if (!invoice || invoice.status === "draft") {
      return "Save and mark this invoice as sent before recording payments.";
    }

    const existingPayment = paymentId
      ? invoice.payments.find((payment) => payment.id === paymentId)
      : undefined;
    if (paymentId && !existingPayment) {
      return "This payment could not be found. Reload the invoice and try again.";
    }
    const availableBalance =
      outstandingBalance(invoice) + (existingPayment?.amount ?? 0);
    const validationMessage = validatePayment(paymentDraft, availableBalance);
    if (validationMessage) return validationMessage;

    const payment: Payment = {
      ...paymentDraft,
      id: existingPayment?.id ?? createInvoiceId(),
    };
    const payments = existingPayment
      ? invoice.payments.map((saved) =>
          saved.id === existingPayment.id ? payment : saved
        )
      : [...invoice.payments, payment];
    const updatedInvoice: Invoice = {
      ...invoice,
      payments,
      status:
        invoiceTotal(invoice) > 0 &&
        totalPaid(payments) >= invoiceTotal(invoice)
          ? "paid"
          : "sent",
    };

    if (!updatePersistedInvoice(updatedInvoice)) {
      return "Payment could not be saved to browser storage.";
    }
    setStorageMessage(
      existingPayment
        ? `Payment for invoice ${invoice.invoiceNumber} corrected.`
        : `Payment recorded for invoice ${invoice.invoiceNumber}.`
    );
    return null;
  }

  function deletePayment(invoicePayment: Payment) {
    const invoice = savedInvoices.find(
      (saved) => saved.id === activeInvoiceId
    );
    if (!invoice) return;
    if (
      !window.confirm(
        `Delete this ${invoice.currency} ${invoicePayment.amount.toFixed(2)} payment?`
      )
    ) {
      return;
    }
    const payments = invoice.payments.filter(
      (payment) => payment.id !== invoicePayment.id
    );
    const updatedInvoice: Invoice = {
      ...invoice,
      payments,
      status:
        invoiceTotal(invoice) > 0 &&
        totalPaid(payments) >= invoiceTotal(invoice)
          ? "paid"
          : "sent",
    };
    if (updatePersistedInvoice(updatedInvoice)) {
      setStorageMessage(`Payment deleted from invoice ${invoice.invoiceNumber}.`);
    }
  }

  const activeInvoice = savedInvoices.find(
    (invoice) => invoice.id === activeInvoiceId
  );
  const activeStatus = activeInvoice
    ? getInvoiceDisplayStatus(activeInvoice)
    : "draft";
  const activeBalance = activeInvoice
    ? outstandingBalance(activeInvoice)
    : invoiceTotal(draft);

  return (
    <main
      id="main-content"
      className="min-h-screen bg-[#f8f9fc] text-slate-900"
    >
      <a
        href="#main-content"
        className="no-print sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:text-slate-900 focus:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
      >
        Skip to main content
      </a>
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={showDashboard}
            className="rounded-md text-xl font-bold tracking-tight focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
            aria-label="Go to invoice dashboard"
          >
            Invoice<span className="text-blue-600">Kit</span>
          </button>
          <nav
            className="flex items-center gap-2"
            aria-label="Workspace actions"
          >
            {currentView === "editor" ? (
              <button
                type="button"
                onClick={showDashboard}
                className="min-h-10 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                Dashboard
              </button>
            ) : (
              <button
                type="button"
                onClick={startNewInvoice}
                disabled={!storageReady}
                className="min-h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                New invoice
              </button>
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="no-print mb-6 sm:mb-7">
          {currentView === "dashboard" ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                InvoiceKit / Workspace
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Invoice dashboard
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                A clear view of what you’ve invoiced, what’s been paid, and
                what needs your attention.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                InvoiceKit / Invoices
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Create an invoice
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Add your details and preview the invoice as you work.
              </p>
            </>
          )}
        </div>

        <div className={currentView === "dashboard" ? "" : "hidden"}>
          <InvoiceDashboard
            invoices={savedInvoices}
            storageReady={storageReady}
            storageAvailable={storageAvailable}
            storageMessage={storageMessage}
            onNewInvoice={startNewInvoice}
            onOpenInvoice={openInvoice}
            onDeleteInvoice={deleteInvoice}
          />
        </div>

        <div
          className={`invoice-layout grid items-start gap-8 lg:grid-cols-2 ${
            currentView === "dashboard" ? "hidden" : ""
          }`}
        >
          <InvoiceEditor
            draft={draft}
            status={activeStatus}
            payments={activeInvoice?.payments ?? []}
            balance={activeBalance}
            storageReady={storageReady}
            storageAvailable={storageAvailable}
            storageMessage={storageMessage}
            onChange={updateDraft}
            onItemChange={updateItem}
            onAddItem={addItem}
            onRemoveItem={removeItem}
            onSave={saveInvoice}
            onMarkSent={markInvoiceSent}
            onSavePayment={savePayment}
            onDeletePayment={deletePayment}
            onNewInvoice={startNewInvoice}
            onDashboard={showDashboard}
          />
          <InvoicePreview
            invoice={draft}
            status={activeStatus}
            amountPaid={
              activeInvoice ? totalPaid(activeInvoice.payments) : 0
            }
            balance={activeBalance}
          />
        </div>

        <footer className="no-print mt-8 border-t border-slate-200/80 py-6 text-center text-xs text-slate-400">
          InvoiceKit · Simple invoicing, done right.
        </footer>
      </div>
    </main>
  );
}
