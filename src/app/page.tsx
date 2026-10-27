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
  nextInvoiceNumber,
} from "@/lib/invoice-utils";
import type { Invoice, InvoiceDraft, InvoiceView, Item } from "@/types/invoice";

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

  function saveInvoice() {
    if (!storageReady || !storageAvailable) {
      setStorageMessage(
        "Saving is unavailable because browser storage could not be read."
      );
      return false;
    }

    const existing = savedInvoices.find(
      (invoice) => invoice.id === activeInvoiceId
    );
    const invoice: Invoice = {
      ...draft,
      id: existing?.id ?? createInvoiceId(),
      items: draft.items.map((item) => ({ ...item })),
      status: "draft",
    };
    const updatedInvoices = existing
      ? savedInvoices.map((saved) =>
          saved.id === existing.id ? invoice : saved
        )
      : [...savedInvoices, invoice];
    const result = writeInvoices(updatedInvoices);

    if (!result.ok) {
      setStorageMessage(result.message);
      return false;
    }

    setSavedInvoices(updatedInvoices);
    setActiveInvoiceId(invoice.id);
    setIsDirty(false);
    setStorageMessage(`Invoice ${invoice.invoiceNumber} saved.`);
    return true;
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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <button
            type="button"
            onClick={showDashboard}
            className="text-xl font-bold tracking-tight"
            aria-label="Go to invoice dashboard"
          >
            Invoice<span className="text-blue-600">Kit</span>
          </button>
          <nav
            className="flex items-center gap-2 sm:gap-4"
            aria-label="Main navigation"
          >
            <button
              type="button"
              onClick={showDashboard}
              aria-current={
                currentView === "dashboard" ? "page" : undefined
              }
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                currentView === "dashboard"
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={startNewInvoice}
              disabled={!storageReady}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
            >
              New invoice
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8">
        <div className="no-print mb-8">
          {currentView === "dashboard" ? (
            <>
              <p className="text-sm font-medium text-blue-600">
                WORKSPACE / OVERVIEW
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                Invoice dashboard
              </h1>
              <p className="mt-2 text-slate-500">
                Keep track of your invoices and what needs attention.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-blue-600">
                WORKSPACE / INVOICES
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                Create an invoice
              </h1>
              <p className="mt-2 text-slate-500">
                Add your details and preview your invoice in real time.
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
            storageReady={storageReady}
            storageAvailable={storageAvailable}
            storageMessage={storageMessage}
            onChange={updateDraft}
            onItemChange={updateItem}
            onAddItem={addItem}
            onRemoveItem={removeItem}
            onSave={saveInvoice}
            onNewInvoice={startNewInvoice}
            onDashboard={showDashboard}
          />
          <InvoicePreview invoice={draft} />
        </div>

        <footer className="no-print py-8 text-center text-xs text-slate-400">
          InvoiceKit · Simple invoicing, done right.
        </footer>
      </div>
    </main>
  );
}
