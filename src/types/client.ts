export type Client = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  billingAddress: string;
  taxId: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ClientProfileDraft = Omit<Client, "id" | "createdAt" | "updatedAt">;
