"use client";

import { useEffect, useState } from "react";
import InvoiceDashboard from "@/components/invoices/InvoiceDashboard";
import ClientDirectory from "@/components/invoices/ClientDirectory";
import CatalogDirectory from "@/components/invoices/CatalogDirectory";
import BackupRestore from "@/components/invoices/BackupRestore";
import InvoiceEditor from "@/components/invoices/InvoiceEditor";
import InvoicePreview from "@/components/invoices/InvoicePreview";
import PaymentReminderModal from "@/components/invoices/PaymentReminderModal";
import { readInvoices, writeInvoices } from "@/lib/invoice-storage";
import {
  createCatalogItemId,
  readCatalogItems,
  writeCatalogItems,
} from "@/lib/catalog-storage";
import {
  createClientId,
  readClients,
  writeClients,
} from "@/lib/client-storage";
import {
  DEFAULT_BRANDING_SETTINGS,
  readBrandingSettings,
  writeBrandingSettings,
} from "@/lib/invoice-branding-storage";
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
  InvoiceBrandingSettings,
  InvoiceDraft,
  InvoiceFollowUp,
  InvoiceView,
  Item,
  Payment,
  PaymentDraft,
  PaymentReminderType,
  ReminderChannel,
} from "@/types/invoice";
import type { Client, ClientProfileDraft } from "@/types/client";
import type { CatalogItem, CatalogItemDraft } from "@/types/catalog";
import type { InvoiceKitBackup } from "@/types/backup";

export default function Home() {
  const [draft, setDraft] = useState<InvoiceDraft>(createInitialInvoiceDraft);
  const [savedInvoices, setSavedInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [storageMessage, setStorageMessage] = useState("");
  const [clientStorageReady, setClientStorageReady] = useState(false);
  const [clientStorageAvailable, setClientStorageAvailable] = useState(true);
  const [clientStorageMessage, setClientStorageMessage] = useState("");
  const [catalogReady, setCatalogReady] = useState(false);
  const [catalogAvailable, setCatalogAvailable] = useState(true);
  const [catalogMessage, setCatalogMessage] = useState("");
  const [currentView, setCurrentView] = useState<InvoiceView>("dashboard");
  const [brandingSettings, setBrandingSettings] =
    useState<InvoiceBrandingSettings>(DEFAULT_BRANDING_SETTINGS);
  const [brandingReady, setBrandingReady] = useState(false);
  const [brandingAvailable, setBrandingAvailable] = useState(true);
  const [brandingMessage, setBrandingMessage] = useState("");
  const [reminderInvoiceId, setReminderInvoiceId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const result = readInvoices();
    const clientResult = readClients();
    const catalogResult = readCatalogItems();
    const brandingResult = readBrandingSettings();
    const timer = window.setTimeout(() => {
      setDraft((current) => ({ ...current, ...defaultDates() }));

      if (brandingResult.ok) {
        setBrandingSettings(brandingResult.value);
        setBrandingAvailable(true);
        setBrandingMessage(brandingResult.message);
        setDraft((current) => ({
          ...current,
          ...brandingResult.value.businessProfile,
          template: brandingResult.value.defaultTemplate,
        }));
      } else {
        setBrandingAvailable(false);
        setBrandingMessage(brandingResult.message);
      }

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

      if (clientResult.ok) {
        setClients(clientResult.value);
        setClientStorageAvailable(true);
        setClientStorageMessage(clientResult.message);
      } else {
        setClientStorageAvailable(false);
        setClientStorageMessage(clientResult.message);
      }

      if (catalogResult.ok) {
        setCatalogItems(catalogResult.value);
        setCatalogAvailable(true);
        setCatalogMessage("");
      } else {
        setCatalogAvailable(false);
        setCatalogMessage(catalogResult.message);
      }

      setCatalogReady(true);
      setClientStorageReady(true);
      setStorageReady(true);
      setBrandingReady(true);
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

  function updateBrandingSettings(settings: InvoiceBrandingSettings) {
    if (!brandingReady || !brandingAvailable) {
      return "Brand settings are unavailable. Existing settings have been preserved.";
    }

    const result = writeBrandingSettings(settings);
    if (!result.ok) {
      setBrandingMessage(result.message);
      return result.message;
    }

    setBrandingSettings(result.value);
    setBrandingMessage("");
    return null;
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
          id: current.items.reduce(
            (nextId, item) => Math.max(nextId, item.id + 1),
            Date.now()
          ),
          description: "",
          quantity: 1,
          price: 0,
        },
      ],
    }));
    setIsDirty(true);
  }

  function selectCatalogItem(lineItemId: number, catalogItem: CatalogItem) {
    if (!catalogReady || !catalogAvailable) {
      setCatalogMessage(
        "Catalog selection is unavailable. Enter this line item manually."
      );
      return;
    }
    if (!catalogItem.active || catalogItem.currency !== draft.currency) {
      setStorageMessage(
        `This catalog item is inactive or priced in ${catalogItem.currency}; it cannot be applied to a ${draft.currency} invoice.`
      );
      return;
    }

    setDraft((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === lineItemId
          ? {
              ...item,
              description: [catalogItem.name, catalogItem.description]
                .filter(Boolean)
                .join("\n"),
              price: catalogItem.unitPrice,
              catalogItemId: catalogItem.id,
              catalogCurrency: catalogItem.currency,
              unitLabel: catalogItem.unitLabel,
            }
          : item
      ),
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
      ...(selectedClientId ? { clientId: selectedClientId } : {}),
      items: draft.items.map((item) => ({ ...item })),
      status: existing?.status ?? "draft",
      payments: existing?.payments ?? [],
      followUps: existing?.followUps ?? [],
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
      setSelectedClientId(invoice.clientId ?? null);
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
      ...brandingSettings.businessProfile,
      template: brandingSettings.defaultTemplate,
      client: "",
      items: [],
      invoiceNumber: nextInvoiceNumber(savedInvoices, draft.invoiceNumber),
    });
    setActiveInvoiceId(null);
    setSelectedClientId(null);
    setIsDirty(false);
    setStorageMessage("Started a new invoice.");
    setCurrentView("editor");
  }

  function showDashboard() {
    if (!saveBeforeSwitch()) return;
    setCurrentView("dashboard");
  }

  function showClients() {
    if (!saveBeforeSwitch()) return;
    setCurrentView("clients");
  }

  function showCatalog() {
    if (!saveBeforeSwitch()) return;
    setCurrentView("catalog");
  }

  function showBackup() {
    if (!saveBeforeSwitch()) return;
    setCurrentView("backup");
  }

  function applyWorkspaceBackup(backup: InvoiceKitBackup) {
    const restoredInvoices = backup.data.invoices;
    const restoredBranding = backup.data.brandingSettings;
    setSavedInvoices(restoredInvoices);
    setClients(backup.data.clients);
    setCatalogItems(backup.data.catalogItems);
    setBrandingSettings(restoredBranding);
    setDraft({
      ...createInitialInvoiceDraft(),
      ...defaultDates(),
      ...restoredBranding.businessProfile,
      template: restoredBranding.defaultTemplate,
      client: "",
      items: [],
      invoiceNumber: nextInvoiceNumber(restoredInvoices),
    });
    setActiveInvoiceId(null);
    setSelectedClientId(null);
    setIsDirty(false);
    setStorageReady(true);
    setStorageAvailable(true);
    setStorageMessage("");
    setClientStorageReady(true);
    setClientStorageAvailable(true);
    setClientStorageMessage("");
    setCatalogReady(true);
    setCatalogAvailable(true);
    setCatalogMessage("");
    setBrandingReady(true);
    setBrandingAvailable(true);
    setBrandingMessage("");
    setCurrentView("dashboard");
  }

  function saveCatalogItem(
    draftItem: CatalogItemDraft,
    itemId?: string
  ): CatalogItem | null {
    if (!catalogReady || !catalogAvailable) {
      setCatalogMessage(
        "Catalog changes are unavailable because browser storage could not be read."
      );
      return null;
    }
    const existing = catalogItems.find((item) => item.id === itemId);
    const now = new Date().toISOString();
    const catalogItem: CatalogItem = {
      ...draftItem,
      id: existing?.id ?? createCatalogItemId(),
      active: existing?.active ?? true,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const updatedItems = existing
      ? catalogItems.map((item) =>
          item.id === existing.id ? catalogItem : item
        )
      : [...catalogItems, catalogItem];
    const result = writeCatalogItems(updatedItems);
    if (!result.ok) {
      setCatalogMessage(result.message);
      setCatalogAvailable(false);
      return null;
    }

    setCatalogItems(updatedItems);
    setCatalogMessage(
      existing
        ? `${catalogItem.name} updated. Existing invoice line items are unchanged.`
        : `${catalogItem.name} added to the catalog.`
    );
    return catalogItem;
  }

  function toggleCatalogItem(item: CatalogItem) {
    if (!catalogReady || !catalogAvailable) return;
    const updatedItem: CatalogItem = {
      ...item,
      active: !item.active,
      updatedAt: new Date().toISOString(),
    };
    const updatedItems = catalogItems.map((saved) =>
      saved.id === item.id ? updatedItem : saved
    );
    const result = writeCatalogItems(updatedItems);
    if (!result.ok) {
      setCatalogMessage(result.message);
      setCatalogAvailable(false);
      return;
    }
    setCatalogItems(updatedItems);
    setCatalogMessage(
      item.active
        ? `${item.name} archived. Existing invoice line items are unchanged.`
        : `${item.name} reactivated.`
    );
  }

  function updateClientProfile(
    profile: ClientProfileDraft,
    clientId?: string
  ): Client | null {
    if (!clientStorageReady || !clientStorageAvailable) {
      setClientStorageMessage(
        "Client profiles cannot be changed because browser storage is unavailable."
      );
      return null;
    }

    const existing = clients.find((client) => client.id === clientId);
    const now = new Date().toISOString();
    const client: Client = {
      ...profile,
      id: existing?.id ?? createClientId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const updatedClients = existing
      ? clients.map((saved) => (saved.id === existing.id ? client : saved))
      : [...clients, client];
    const result = writeClients(updatedClients);
    if (!result.ok) {
      setClientStorageMessage(result.message);
      setClientStorageAvailable(false);
      return null;
    }

    setClients(updatedClients);
    setClientStorageMessage(
      existing ? `Client ${client.name} updated.` : `Client ${client.name} added.`
    );
    return client;
  }

  function deleteClient(client: Client, relatedInvoiceCount: number) {
    const invoiceMessage =
      relatedInvoiceCount > 0
        ? ` ${relatedInvoiceCount} related invoice(s) and their payment history will remain unchanged with the client details saved on each invoice.`
        : relatedInvoiceCount < 0
          ? " Invoice history could not be read; saved invoice data will not be modified."
          : " Invoices and payment history will not be deleted.";
    if (
      !window.confirm(
        `Delete the saved profile for ${client.name}?${invoiceMessage}`
      )
    ) {
      return false;
    }
    const updatedClients = clients.filter((saved) => saved.id !== client.id);
    const result = writeClients(updatedClients);
    if (!result.ok) {
      setClientStorageMessage(result.message);
      setClientStorageAvailable(false);
      return false;
    }
    setClients(updatedClients);
    setClientStorageMessage(`Client ${client.name} deleted.`);
    return true;
  }

  function linkInvoiceToClient(invoice: Invoice, client: Client) {
    if (
      !window.confirm(
        `Link invoice ${invoice.invoiceNumber} to ${client.name}? Its saved client details and payment history will not be changed.`
      )
    ) {
      return;
    }
    const updatedInvoices = savedInvoices.map((saved) =>
      saved.id === invoice.id ? { ...saved, clientId: client.id } : saved
    );
    const result = writeInvoices(updatedInvoices);
    if (!result.ok) {
      setStorageMessage(result.message);
      return;
    }
    setSavedInvoices(updatedInvoices);
    setStorageMessage(`Invoice ${invoice.invoiceNumber} linked to ${client.name}.`);
  }

  function selectClient(clientId: string) {
    if (!clientId) {
      setSelectedClientId(null);
      setIsDirty(true);
      return;
    }
    const client = clients.find((saved) => saved.id === clientId);
    if (!client) return;
    applyClient(client);
  }

  function applyClient(client: Client) {
    setSelectedClientId(client.id);
    setDraft((current) => ({
      ...current,
      client: client.name,
      clientCompany: client.company,
      clientEmail: client.email,
      clientPhone: client.phone,
      clientAddress: client.billingAddress,
      clientTaxId: client.taxId,
    }));
    setIsDirty(true);
  }

  function updateClientField(
    field:
      | "client"
      | "clientCompany"
      | "clientEmail"
      | "clientPhone"
      | "clientAddress"
      | "clientTaxId",
    value: string
  ) {
    setSelectedClientId(null);
    updateDraft(field, value);
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
      setSelectedClientId(null);
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

  function openPaymentReminder(invoice: Invoice) {
    const saved = savedInvoices.find((item) => item.id === invoice.id);
    if (
      !saved ||
      saved.status !== "sent" ||
      outstandingBalance(saved) <= 0 ||
      !storageAvailable
    ) {
      setStorageMessage(
        "A reminder is available only for a saved sent invoice with an outstanding balance."
      );
      return;
    }
    setReminderInvoiceId(saved.id);
  }

  function recordFollowUp(
    invoiceId: string,
    entry: {
      type: PaymentReminderType;
      message: string;
      channel?: ReminderChannel;
      notes?: string;
    }
  ) {
    if (!storageReady || !storageAvailable) {
      return "Reminder history could not be saved because invoice storage is unavailable.";
    }
    const invoice = savedInvoices.find((saved) => saved.id === invoiceId);
    if (!invoice || invoice.status !== "sent") {
      return "This invoice is no longer available as a sent invoice. Reload and try again.";
    }
    if (outstandingBalance(invoice) <= 0) {
      return "This invoice has no remaining balance, so a reminder was not recorded.";
    }
    if (!entry.message.trim()) {
      return "Enter a reminder message before recording it as sent.";
    }

    const followUp: InvoiceFollowUp = {
      id: createInvoiceId(),
      sentAt: new Date().toISOString(),
      type: entry.type,
      message: entry.message,
      ...(entry.channel ? { channel: entry.channel } : {}),
      ...(entry.notes ? { notes: entry.notes } : {}),
    };
    const updatedInvoice: Invoice = {
      ...invoice,
      followUps: [...invoice.followUps, followUp],
    };
    if (!updatePersistedInvoice(updatedInvoice)) {
      return "Reminder history could not be written to browser storage.";
    }
    setStorageMessage(
      `Follow-up recorded for invoice ${invoice.invoiceNumber}. Invoice status and payments were not changed.`
    );
    return null;
  }

  function deleteFollowUp(invoice: Invoice, followUp: InvoiceFollowUp) {
    if (
      !window.confirm(
        `Delete this reminder history record for invoice ${invoice.invoiceNumber}? The invoice and its payments will not be changed.`
      )
    ) {
      return;
    }
    const currentInvoice = savedInvoices.find(
      (saved) => saved.id === invoice.id
    );
    if (!currentInvoice) return;
    const updatedInvoice: Invoice = {
      ...currentInvoice,
      followUps: currentInvoice.followUps.filter(
        (saved) => saved.id !== followUp.id
      ),
    };
    if (updatePersistedInvoice(updatedInvoice)) {
      setStorageMessage(
        `Reminder history record deleted from invoice ${invoice.invoiceNumber}.`
      );
    }
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
  const reminderInvoice = savedInvoices.find(
    (invoice) => invoice.id === reminderInvoiceId
  );

  return (
    <main
      data-view={currentView}
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
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:flex-nowrap sm:gap-4 sm:px-6 sm:py-0 lg:px-8">
          <button
            type="button"
            onClick={showDashboard}
            className="rounded-md text-xl font-bold tracking-tight focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
            aria-label="Go to invoice dashboard"
          >
            Invoice<span className="text-blue-600">Kit</span>
          </button>
          <nav
            className="flex flex-wrap items-center justify-end gap-1 sm:gap-2"
            aria-label="Workspace actions"
          >
            {currentView !== "dashboard" && (
              <button
                type="button"
                onClick={showDashboard}
                className="min-h-10 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                Dashboard
              </button>
            )}
            {currentView !== "clients" && (
              <button
                type="button"
                onClick={showClients}
                className="min-h-10 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                Clients
              </button>
            )}
            {currentView !== "catalog" && (
              <button
                type="button"
                onClick={showCatalog}
                className="min-h-10 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                Products &amp; Services
              </button>
            )}
            {currentView !== "backup" && (
              <button
                type="button"
                onClick={showBackup}
                className="min-h-10 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                Backup &amp; Restore
              </button>
            )}
            {currentView !== "editor" && (
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
          ) : currentView === "clients" ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                InvoiceKit / Workspace
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Clients
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Manage reusable client profiles and review their invoice history.
              </p>
            </>
          ) : currentView === "catalog" ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                InvoiceKit / Workspace
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Products &amp; Services
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Manage reusable catalog items and their prices for future invoices.
              </p>
            </>
          ) : currentView === "backup" ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                InvoiceKit / Workspace
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Backup &amp; Restore
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Protect your local business data and export records for other
                tools.
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

        <div
          data-dashboard-view
          className={currentView === "dashboard" ? "" : "hidden"}
        >
          <InvoiceDashboard
            invoices={savedInvoices}
            storageReady={storageReady}
            storageAvailable={storageAvailable}
            storageMessage={storageMessage}
            onNewInvoice={startNewInvoice}
            onOpenInvoice={openInvoice}
            onCreateReminder={openPaymentReminder}
            onDeleteInvoice={deleteInvoice}
          />
        </div>

        <div
          data-dashboard-view
          className={currentView === "clients" ? "" : "hidden"}
        >
          <ClientDirectory
            clients={clients}
            invoices={savedInvoices}
            storageReady={clientStorageReady}
            storageAvailable={clientStorageAvailable}
            storageMessage={clientStorageMessage}
            invoiceStorageAvailable={storageReady && storageAvailable}
            onSaveClient={updateClientProfile}
            onDeleteClient={deleteClient}
            onLinkInvoice={linkInvoiceToClient}
            onOpenInvoice={openInvoice}
          />
        </div>

        <div
          data-dashboard-view
          className={currentView === "catalog" ? "" : "hidden"}
        >
          <CatalogDirectory
            items={catalogItems}
            invoices={savedInvoices}
            storageReady={catalogReady}
            storageAvailable={catalogAvailable}
            storageMessage={catalogMessage}
            invoiceStorageAvailable={storageReady && storageAvailable}
            onSaveItem={saveCatalogItem}
            onToggleActive={toggleCatalogItem}
          />
        </div>

        <div
          data-dashboard-view
          className={currentView === "backup" ? "" : "hidden"}
        >
          <BackupRestore
            invoices={savedInvoices}
            clients={clients}
            catalogItems={catalogItems}
            brandingSettings={brandingSettings}
            storageReady={storageReady}
            storageAvailable={storageAvailable}
            clientStorageReady={clientStorageReady}
            clientStorageAvailable={clientStorageAvailable}
            catalogReady={catalogReady}
            catalogAvailable={catalogAvailable}
            brandingReady={brandingReady}
            brandingAvailable={brandingAvailable}
            onRestore={applyWorkspaceBackup}
          />
        </div>

        <div
          className={`invoice-layout grid items-start gap-8 lg:grid-cols-2 ${
            currentView !== "editor" ? "hidden" : ""
          }`}
        >
          <InvoiceEditor
            draft={draft}
            status={activeStatus}
            payments={activeInvoice?.payments ?? []}
            savedInvoice={activeInvoice ?? null}
            balance={activeBalance}
            brandingSettings={brandingSettings}
            brandingReady={brandingReady}
            brandingAvailable={brandingAvailable}
            brandingMessage={brandingMessage}
            storageReady={storageReady}
            storageAvailable={storageAvailable}
            storageMessage={storageMessage}
            clients={clients}
            clientStorageReady={clientStorageReady}
            clientStorageAvailable={clientStorageAvailable}
            selectedClientId={selectedClientId}
            catalogItems={catalogItems}
            catalogReady={catalogReady}
            catalogAvailable={catalogAvailable}
            onChange={updateDraft}
            onItemChange={updateItem}
            onAddItem={addItem}
            onRemoveItem={removeItem}
            onSave={saveInvoice}
            onBrandingChange={updateBrandingSettings}
            onMarkSent={markInvoiceSent}
            onSavePayment={savePayment}
            onDeletePayment={deletePayment}
            onCreateReminder={openPaymentReminder}
            onDeleteFollowUp={deleteFollowUp}
            onNewInvoice={startNewInvoice}
            onDashboard={showDashboard}
            onSelectClient={selectClient}
            onApplyClient={applyClient}
            onClientFieldChange={updateClientField}
            onSaveClient={updateClientProfile}
            onSelectCatalogItem={selectCatalogItem}
          />
          <InvoicePreview
            invoice={draft}
            status={activeStatus}
            brandingSettings={brandingSettings}
            amountPaid={
              activeInvoice ? totalPaid(activeInvoice.payments) : 0
            }
            balance={activeBalance}
          />
        </div>

        {reminderInvoice && reminderInvoice.status === "sent" && (
          <PaymentReminderModal
            key={reminderInvoice.id}
            invoice={reminderInvoice}
            onClose={() => setReminderInvoiceId(null)}
            onRecordSent={(entry) =>
              recordFollowUp(reminderInvoice.id, entry)
            }
          />
        )}

        <footer className="no-print mt-8 border-t border-slate-200/80 py-6 text-center text-xs text-slate-400">
          InvoiceKit · Simple invoicing, done right.
        </footer>
      </div>
    </main>
  );
}
