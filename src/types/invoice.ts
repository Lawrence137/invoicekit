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

export type Invoice = InvoiceDraft & {
  id: string;
  status: "draft";
};

export type DashboardFilter = "all" | "drafts" | "overdue" | "due-soon";

export type InvoiceView = "dashboard" | "editor";
