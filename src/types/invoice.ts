export type Item = {
  id: number;
  description: string;
  quantity: number;
  price: number;
};

export type InvoiceDraft = {
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
};

export type Payment = {
  id: string;
  date: string;
  amount: number;
  method?: string;
  reference?: string;
};

export type PaymentDraft = Omit<Payment, "id">;
export type InvoiceLifecycleStatus = "draft" | "sent" | "paid";
export type InvoiceDisplayStatus = InvoiceLifecycleStatus | "overdue";

export type Invoice = InvoiceDraft & {
  id: string;
  status: InvoiceLifecycleStatus;
  payments: Payment[];
};

export type DashboardFilter =
  | "all"
  | "draft"
  | "sent"
  | "overdue"
  | "paid"
  | "due-soon";

export type InvoiceView = "dashboard" | "editor";
