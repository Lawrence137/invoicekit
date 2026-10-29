import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PaymentReminderModal from "@/components/invoices/PaymentReminderModal";
import {
  BRANDING_STORAGE_KEY,
  DEFAULT_BRANDING_SETTINGS,
} from "@/lib/invoice-branding-storage";
import {
  CATALOG_STORAGE_KEY,
  isCatalogItem,
} from "@/lib/catalog-storage";
import { CLIENT_STORAGE_KEY } from "@/lib/client-storage";
import {
  calculateSubtotal,
  defaultDates,
  getInvoiceDisplayStatus,
  getPaymentFollowUpState,
  invoiceTotal,
  outstandingBalance,
  totalPaid,
  validatePayment,
  formatCurrency,
} from "@/lib/invoice-utils";
import {
  appendInvoiceFollowUp,
  buildPaymentReminderMessage,
} from "@/lib/payment-reminders";
import {
  INVOICE_STORAGE_KEY,
  readInvoices,
  writeInvoices,
} from "@/lib/invoice-storage";
import {
  createWorkspaceBackup,
  exportClientsCsv,
  exportInvoicesCsv,
  parseWorkspaceBackup,
  restoreWorkspaceBackup,
  validateWorkspaceBackup,
} from "@/lib/workspace-backup";
import type { Invoice, InvoiceFollowUp } from "@/types/invoice";
import type { Client } from "@/types/client";
import type { CatalogItem } from "@/types/catalog";
import type { InvoiceKitBackup } from "@/types/backup";

const invoiceFixture: Invoice = {
  id: "invoice-1",
  invoiceNumber: "INV-001",
  business: "Northwind Studio",
  businessEmail: "billing@northwind.example",
  businessAddress: "1 Market Street",
  businessPhone: "+1 555 0100",
  businessWebsite: "https://northwind.example",
  businessTaxId: "TAX-1",
  client: "Ada Lovelace",
  clientCompany: "Analytical Engines",
  clientEmail: "ada@example.test",
  clientPhone: "+1 555 0101",
  clientAddress: "2 Client Road",
  clientTaxId: "CLIENT-TAX",
  issueDate: "2025-02-01",
  dueDate: "2025-02-05",
  currency: "USD",
  items: [
    { id: 1, description: "Consulting", quantity: 2, price: 100 },
    { id: 2, description: "Support", quantity: 1, price: 50 },
  ],
  tax: 16,
  paymentInstructions: "Pay by bank transfer.",
  notes: "Thank you.",
  paymentTerms: "Net 30",
  template: "modern",
  status: "sent",
  payments: [],
  followUps: [],
};

const clientFixture: Client = {
  id: "client-1",
  name: "Ada Lovelace",
  company: "Analytical Engines",
  email: "ada@example.test",
  phone: "+1 555 0101",
  billingAddress: "2 Client Road",
  taxId: "CLIENT-TAX",
  notes: "Preferred contact: email",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-02T00:00:00.000Z",
};

const catalogFixture: CatalogItem = {
  id: "catalog-1",
  name: "Consulting",
  description: "Hourly consulting",
  sku: "CONSULT",
  type: "service",
  unitPrice: 100,
  currency: "USD",
  unitLabel: "hour",
  active: true,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-02T00:00:00.000Z",
};

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return { ...invoiceFixture, ...overrides };
}

function makeBackup(): InvoiceKitBackup {
  return createWorkspaceBackup({
    invoices: [invoiceFixture],
    clients: [clientFixture],
    catalogItems: [catalogFixture],
    brandingSettings: {
      ...DEFAULT_BRANDING_SETTINGS,
      logoDataUrl: "data:image/png;base64,AA==",
    },
  });
}

function legacyInvoiceWithoutFollowUps(invoice: Invoice) {
  const legacy: Record<string, unknown> = { ...invoice };
  delete legacy.followUps;
  return legacy;
}

describe("invoice calculations and payment validation", () => {
  it("calculates subtotal, tax, total, paid amount, and outstanding balance", () => {
    const invoice = makeInvoice({
      payments: [
        { id: "payment-1", date: "2025-02-02", amount: 90 },
        { id: "payment-2", date: "2025-02-03", amount: 10 },
      ],
    });

    expect(calculateSubtotal(invoice.items)).toBe(250);
    expect(invoiceTotal(invoice)).toBe(290);
    expect(totalPaid(invoice.payments)).toBe(100);
    expect(outstandingBalance(invoice)).toBe(190);
  });

  it("handles partial payments and fully paid invoices", () => {
    const partial = makeInvoice({
      payments: [{ id: "payment-1", date: "2025-02-02", amount: 100 }],
    });
    const paid = makeInvoice({
      status: "paid",
      payments: [{ id: "payment-1", date: "2025-02-02", amount: 290 }],
    });

    expect(outstandingBalance(partial)).toBe(190);
    expect(outstandingBalance(paid)).toBe(0);
    expect(getInvoiceDisplayStatus(paid, "2025-02-10")).toBe("paid");
  });

  it("formats monetary values with the selected currency", () => {
    const formatted = formatCurrency(1234.5, "USD");

    expect(formatted).toContain("1,234.50");
    expect(formatted).toContain("$");
  });

  it("rejects payments that exceed the remaining balance", () => {
    expect(
      validatePayment(
        { date: "2025-02-04", amount: 190.01 },
        outstandingBalance(
          makeInvoice({
            payments: [
              { id: "payment-1", date: "2025-02-03", amount: 100 },
            ],
          })
        )
      )
    ).toBe("Payment amount cannot exceed the outstanding balance.");
    expect(
      validatePayment({ date: "2025-02-04", amount: 190 }, 190)
    ).toBeNull();
  });
});

describe("local dates and payment follow-up state", () => {
  it("uses the user's local calendar date for default issue and due dates", () => {
    const previousTimezone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:30:00.000Z"));

    try {
      expect(defaultDates()).toEqual({
        issueDate: "2024-12-31",
        dueDate: "2025-01-30",
      });
    } finally {
      vi.useRealTimers();
      if (previousTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimezone;
    }
  });

  it("classifies overdue, due-today, and due-within-seven-day invoices", () => {
    expect(
      getPaymentFollowUpState(makeInvoice(), "2025-02-08")
    ).toEqual({ kind: "overdue", daysOverdue: 3 });
    expect(
      getPaymentFollowUpState(makeInvoice(), "2025-02-05")
    ).toEqual({ kind: "due-today" });
    expect(
      getPaymentFollowUpState(
        makeInvoice({ dueDate: "2025-02-12" }),
        "2025-02-05"
      )
    ).toEqual({ kind: "due-soon", daysUntilDue: 7 });
    expect(
      getPaymentFollowUpState(
        makeInvoice({ dueDate: "2025-02-13" }),
        "2025-02-05"
      )
    ).toEqual({ kind: "none" });
  });

  it("does not classify drafts, fully paid, or invalid-due-date invoices", () => {
    expect(
      getPaymentFollowUpState(
        makeInvoice({ status: "draft" }),
        "2025-02-08"
      )
    ).toEqual({ kind: "none" });
    expect(
      getPaymentFollowUpState(
        makeInvoice({
          payments: [
            { id: "payment-1", date: "2025-02-02", amount: 290 },
          ],
        }),
        "2025-02-08"
      )
    ).toEqual({ kind: "none" });
    expect(
      getPaymentFollowUpState(
        makeInvoice({ dueDate: "2025-02-30" }),
        "2025-02-08"
      )
    ).toEqual({ kind: "none" });
    expect(
      getPaymentFollowUpState(makeInvoice({ dueDate: "" }), "2025-02-08")
    ).toEqual({ kind: "none" });
  });

  it("computes calendar-day differences across local midnight and timezone offsets", async () => {
    const previousTimezone = process.env.TZ;
    process.env.TZ = "Pacific/Kiritimati";
    try {
      const { localCalendarDateValue, calendarDaysBetween } = await import(
        "@/lib/invoice-utils"
      );
      const justAfterLocalMidnight = new Date("2025-01-01T10:01:00.000Z");
      expect(localCalendarDateValue(justAfterLocalMidnight)).toBe("2025-01-02");
      expect(calendarDaysBetween("2025-01-01", "2025-01-02")).toBe(1);
    } finally {
      if (previousTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimezone;
    }
  });
});

describe("reminder generation and follow-up history", () => {
  it("requests only the remaining balance in a partial-payment reminder", () => {
    const invoice = makeInvoice({
      payments: [{ id: "payment-1", date: "2025-02-02", amount: 100 }],
    });
    const message = buildPaymentReminderMessage(invoice, "overdue");

    expect(message).toContain(
      `Original invoice total: ${formatCurrency(290, "USD")}.`
    );
    expect(message).toContain(
      `Amount received: ${formatCurrency(100, "USD")}.`
    );
    expect(message).toContain(
      `Remaining balance: ${formatCurrency(190, "USD")}.`
    );
    expect(message).not.toContain(
      `Remaining balance: ${formatCurrency(290, "USD")}.`
    );
  });

  it("generates upcoming, overdue, and final reminder wording", () => {
    const upcoming = buildPaymentReminderMessage(
      makeInvoice({ dueDate: "9999-12-31" }),
      "upcoming"
    );
    const overdue = buildPaymentReminderMessage(
      makeInvoice({ dueDate: "2000-01-01" }),
      "overdue"
    );
    const final = buildPaymentReminderMessage(
      makeInvoice({ dueDate: "2000-01-01" }),
      "final"
    );

    expect(upcoming).toContain("coming due");
    expect(overdue).toContain("now overdue");
    expect(final).toContain("following up once more");
  });

  it("omits unavailable contact and payment details without inventing them", () => {
    const invoice = makeInvoice({
      business: "",
      businessEmail: "",
      businessAddress: "",
      businessPhone: "",
      businessWebsite: "",
      client: "",
      paymentInstructions: "",
    });
    const message = buildPaymentReminderMessage(invoice, "upcoming");

    expect(message).toContain("Hello,");
    expect(message).not.toContain("billing@northwind.example");
    expect(message).not.toContain("Pay by bank transfer.");
    expect(message).not.toContain("undefined");
  });

  it("appends sent history without changing financial data or invoice status", () => {
    const invoice = makeInvoice({
      payments: [{ id: "payment-1", date: "2025-02-02", amount: 100 }],
    });
    const followUp: InvoiceFollowUp = {
      id: "follow-up-1",
      sentAt: "2025-02-04T12:30:00.000Z",
      type: "overdue",
      message: "Please pay the remaining balance.",
      channel: "email",
    };
    const updated = appendInvoiceFollowUp(invoice, followUp);

    expect(updated.status).toBe(invoice.status);
    expect(updated.items).toBe(invoice.items);
    expect(updated.payments).toBe(invoice.payments);
    expect(invoiceTotal(updated)).toBe(invoiceTotal(invoice));
    expect(outstandingBalance(updated)).toBe(outstandingBalance(invoice));
    expect(updated.followUps).toEqual([followUp]);
  });

  it("does not record a reminder merely because the user copies it", async () => {
    const onRecordSent = vi.fn(() => null);
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    vi.stubGlobal("navigator", { clipboard });
    render(
      <PaymentReminderModal
        invoice={makeInvoice({ dueDate: "9999-12-31" })}
        onClose={vi.fn()}
        onRecordSent={onRecordSent}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy reminder" }));
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain(
        "Reminder copied."
      );
    });

    expect(clipboard.writeText).toHaveBeenCalledOnce();
    expect(onRecordSent).not.toHaveBeenCalled();
  });

  it("records the edited message only after explicit sent confirmation", () => {
    const onRecordSent = vi.fn(() => null);
    render(
      <PaymentReminderModal
        invoice={makeInvoice({ dueDate: "9999-12-31" })}
        onClose={vi.fn()}
        onRecordSent={onRecordSent}
      />
    );
    fireEvent.change(screen.getByLabelText("Editable reminder message"), {
      target: { value: "Edited message to send." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record as sent" }));

    expect(onRecordSent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "upcoming",
        message: "Edited message to send.",
      })
    );
    expect(screen.getByRole("status").textContent).toContain(
      "Recorded as sent."
    );
  });
});

describe("invoice persistence and backup integrity", () => {
  it("migrates older invoices without follow-up history", () => {
    localStorage.setItem(
      INVOICE_STORAGE_KEY,
      JSON.stringify([legacyInvoiceWithoutFollowUps(invoiceFixture)])
    );

    const result = readInvoices();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value[0].followUps).toEqual([]);
    expect(JSON.parse(localStorage.getItem(INVOICE_STORAGE_KEY) ?? "[]")[0])
      .toHaveProperty("followUps", []);
  });

  it("leaves malformed saved invoices untouched", () => {
    const malformed = JSON.stringify([{ ...invoiceFixture, tax: "16%" }]);
    localStorage.setItem(INVOICE_STORAGE_KEY, malformed);

    const result = readInvoices();

    expect(result.ok).toBe(false);
    expect(localStorage.getItem(INVOICE_STORAGE_KEY)).toBe(malformed);
  });

  it("reports invoice persistence failures instead of claiming a save", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    const result = writeInvoices([invoiceFixture]);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toContain("could not be saved");
    expect(localStorage.getItem(INVOICE_STORAGE_KEY)).toBeNull();
  });

  it("rejects duplicate follow-up IDs and duplicate dataset IDs", () => {
    const duplicatedFollowUp: InvoiceFollowUp = {
      id: "follow-up-1",
      sentAt: "2025-02-04T12:30:00.000Z",
      type: "overdue",
      message: "Please pay.",
    };
    const duplicateHistoryBackup = {
      ...makeBackup(),
      data: {
        ...makeBackup().data,
        invoices: [makeInvoice({
          followUps: [duplicatedFollowUp, duplicatedFollowUp],
        })],
      },
    };
    expect(validateWorkspaceBackup(duplicateHistoryBackup).ok).toBe(false);

    const duplicateClientBackup = {
      ...makeBackup(),
      data: {
        ...makeBackup().data,
        clients: [clientFixture, clientFixture],
      },
    };
    expect(validateWorkspaceBackup(duplicateClientBackup).ok).toBe(false);
  });

  it("round-trips invoices, payments, reminders, clients, catalog, and branding", () => {
    const backup = makeBackup();
    const invoice = makeInvoice({
      payments: [{ id: "payment-1", date: "2025-02-02", amount: 50 }],
      followUps: [
        {
          id: "follow-up-1",
          sentAt: "2025-02-03T10:00:00.000Z",
          type: "upcoming",
          message: "Your invoice is due soon.",
        },
      ],
    });
    const input = {
      ...backup,
      data: { ...backup.data, invoices: [invoice] },
    };
    const result = parseWorkspaceBackup(JSON.stringify(input));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.data).toEqual(input.data);
    expect(result.summary).toMatchObject({
      invoiceCount: 1,
      clientCount: 1,
      catalogItemCount: 1,
      paymentCount: 1,
      followUpCount: 1,
      logoIncluded: true,
    });
    expect(isCatalogItem(result.backup.data.catalogItems[0])).toBe(true);
  });

  it("accepts version-1 backups without reminder history and normalizes it", () => {
    const backup = makeBackup();
    const legacy = {
      ...backup,
      data: {
        ...backup.data,
        invoices: [
          legacyInvoiceWithoutFollowUps(backup.data.invoices[0]),
        ],
      },
    };
    const result = parseWorkspaceBackup(JSON.stringify(legacy));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.data.invoices[0].followUps).toEqual([]);
  });

  it("rejects invalid JSON and newer backup schemas", () => {
    expect(parseWorkspaceBackup("{ invalid").ok).toBe(false);
    const newerVersion = validateWorkspaceBackup({
      ...makeBackup(),
      schemaVersion: 2,
    });
    expect(!newerVersion.ok && newerVersion.message).toContain(
      "newer InvoiceKit version"
    );
  });

  it("exports CSV with quotes, commas, line breaks, and formula safety", () => {
    const csv = exportClientsCsv([
      {
        ...clientFixture,
        name: '=HYPERLINK("https://example.test","open")',
        notes: 'line one, "quoted"\nline two',
      },
    ]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain(
      `"'=HYPERLINK(""https://example.test"",""open"")"`
    );
    expect(csv).toContain(`"line one, ""quoted""\nline two"`);
    expect(csv).toContain("\r\n");
  });

  it("escapes invoice line-item fields and keeps currency and totals in CSV", () => {
    const csv = exportInvoicesCsv([
      makeInvoice({
        items: [
          {
            id: 1,
            description: "=2+2, \"review\"\nnext line",
            quantity: 1,
            price: 250,
          },
        ],
      }),
    ]);

    expect(csv).toContain(`"'=2+2, ""review""\nnext line"`);
    expect(csv).toContain('"USD"');
    expect(csv).toContain('"290"');
  });
});

describe("workspace restore safety", () => {
  it("leaves every stored value unchanged when backup validation fails", () => {
    const initial = {
      invoices: JSON.stringify([invoiceFixture]),
      clients: JSON.stringify([clientFixture]),
      catalog: JSON.stringify([catalogFixture]),
      branding: JSON.stringify(DEFAULT_BRANDING_SETTINGS),
    };
    localStorage.setItem(INVOICE_STORAGE_KEY, initial.invoices);
    localStorage.setItem(CLIENT_STORAGE_KEY, initial.clients);
    localStorage.setItem(CATALOG_STORAGE_KEY, initial.catalog);
    localStorage.setItem(BRANDING_STORAGE_KEY, initial.branding);
    const invalid = {
      ...makeBackup(),
      data: { ...makeBackup().data, invoices: [{ ...invoiceFixture, tax: "bad" }] },
    };

    expect(validateWorkspaceBackup(invalid).ok).toBe(false);
    expect(localStorage.getItem(INVOICE_STORAGE_KEY)).toBe(initial.invoices);
    expect(localStorage.getItem(CLIENT_STORAGE_KEY)).toBe(initial.clients);
    expect(localStorage.getItem(CATALOG_STORAGE_KEY)).toBe(initial.catalog);
    expect(localStorage.getItem(BRANDING_STORAGE_KEY)).toBe(initial.branding);
  });

  it("restores every known workspace key while preserving unrelated keys", () => {
    localStorage.setItem("unrelated_app_key", "keep this");
    const backup = makeBackup();

    const result = restoreWorkspaceBackup(backup);

    expect(result.ok).toBe(true);
    expect(JSON.parse(localStorage.getItem(INVOICE_STORAGE_KEY) ?? "[]"))
      .toEqual(backup.data.invoices);
    expect(JSON.parse(localStorage.getItem(CLIENT_STORAGE_KEY) ?? "[]"))
      .toEqual(backup.data.clients);
    expect(JSON.parse(localStorage.getItem(CATALOG_STORAGE_KEY) ?? "[]"))
      .toEqual(backup.data.catalogItems);
    expect(JSON.parse(localStorage.getItem(BRANDING_STORAGE_KEY) ?? "{}"))
      .toEqual(backup.data.brandingSettings);
    expect(localStorage.getItem("unrelated_app_key")).toBe("keep this");
  });

  it("normalizes older backup invoices before writing them", () => {
    const backup = makeBackup();
    const parsed = parseWorkspaceBackup(
      JSON.stringify({
        ...backup,
        data: {
          ...backup.data,
          invoices: [
            legacyInvoiceWithoutFollowUps(backup.data.invoices[0]),
          ],
        },
      })
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = restoreWorkspaceBackup(parsed.backup);

    expect(result.ok).toBe(true);
    expect(
      JSON.parse(localStorage.getItem(INVOICE_STORAGE_KEY) ?? "[]")[0]
    ).toHaveProperty("followUps", []);
  });

  it("rolls back attempted writes after a storage failure", () => {
    const oldValues = [
      [INVOICE_STORAGE_KEY, "old invoices"],
      [CLIENT_STORAGE_KEY, "old clients"],
      [CATALOG_STORAGE_KEY, "old catalog"],
      [BRANDING_STORAGE_KEY, "old branding"],
    ] as const;
    for (const [key, value] of oldValues) localStorage.setItem(key, value);
    localStorage.setItem("unrelated_app_key", "keep this");
    const backup = makeBackup();
    const failingValue = JSON.stringify(backup.data.catalogItems);
    const originalSetItem = Storage.prototype.setItem.bind(localStorage);
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    setItem.mockImplementation((key, value) => {
      if (key === CATALOG_STORAGE_KEY && value === failingValue) {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }
      originalSetItem(key, value);
    });

    const result = restoreWorkspaceBackup(backup);

    expect(result.ok).toBe(false);
    expect(result.message).toContain("previous workspace values were restored");
    for (const [key, value] of oldValues) {
      expect(localStorage.getItem(key)).toBe(value);
    }
    expect(localStorage.getItem("unrelated_app_key")).toBe("keep this");
    expect(
      setItem.mock.calls.some(
        ([key, value]) => key === INVOICE_STORAGE_KEY && value === "old invoices"
      )
    ).toBe(true);
    expect(
      setItem.mock.calls.some(
        ([key, value]) => key === CLIENT_STORAGE_KEY && value === "old clients"
      )
    ).toBe(true);
  });

  it("reports when rollback is also rejected by browser storage", () => {
    const backup = makeBackup();
    const failingValue = JSON.stringify(backup.data.catalogItems);
    const originalSetItem = Storage.prototype.setItem.bind(localStorage);
    const removeItem = Storage.prototype.removeItem.bind(localStorage);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(
      function (key, value) {
        if (key === CATALOG_STORAGE_KEY && value === failingValue) {
          throw new DOMException("Quota exceeded", "QuotaExceededError");
        }
        return originalSetItem(key, value);
      }
    );
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation((key) => {
      if (key === CATALOG_STORAGE_KEY) {
        throw new DOMException("Storage unavailable", "QuotaExceededError");
      }
      removeItem(key);
    });

    const result = restoreWorkspaceBackup(backup);

    expect(result.ok).toBe(false);
    expect(result.message).toContain("also rejected rollback");
  });
});
