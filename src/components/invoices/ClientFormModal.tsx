"use client";

import { useState, type FormEvent } from "react";
import type { Client, ClientProfileDraft } from "@/types/client";

type ClientFormModalProps = {
  client?: Client;
  initialProfile?: ClientProfileDraft;
  onClose: () => void;
  onSave: (profile: ClientProfileDraft) => Client | null;
};

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const emptyProfile: ClientProfileDraft = {
  name: "",
  company: "",
  email: "",
  phone: "",
  billingAddress: "",
  taxId: "",
  notes: "",
};

export default function ClientFormModal({
  client,
  initialProfile,
  onClose,
  onSave,
}: ClientFormModalProps) {
  const [profile, setProfile] = useState<ClientProfileDraft>(
    initialProfile ??
      (client
        ? {
          name: client.name,
          company: client.company,
          email: client.email,
          phone: client.phone,
          billingAddress: client.billingAddress,
          taxId: client.taxId,
          notes: client.notes,
        }
        : emptyProfile)
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update<K extends keyof ClientProfileDraft>(
    field: K,
    value: ClientProfileDraft[K]
  ) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = {
      ...profile,
      name: profile.name.trim(),
      company: profile.company.trim(),
      email: profile.email.trim(),
      phone: profile.phone.trim(),
      billingAddress: profile.billingAddress.trim(),
      taxId: profile.taxId.trim(),
      notes: profile.notes.trim(),
    };
    if (!normalized.name) {
      setError("Enter a client name.");
      return;
    }
    if (
      normalized.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)
    ) {
      setError("Enter a valid email address or leave it blank.");
      return;
    }

    setSaving(true);
    setError("");
    const result = onSave(normalized);
    if (result) {
      onClose();
    } else {
      setSaving(false);
      setError(
        "The client could not be saved. Check storage availability and try again."
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-form-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="client-form-title"
              className="text-xl font-semibold text-slate-950"
            >
              {client ? "Edit client" : "Add client"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Save reusable contact details for future invoices.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
          >
            Close
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Client name <span className="text-rose-600">*</span>
              <input
                autoFocus
                required
                value={profile.name}
                onChange={(event) => update("name", event.target.value)}
                className={fieldClass}
                autoComplete="name"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Company (optional)
              <input
                value={profile.company}
                onChange={(event) => update("company", event.target.value)}
                className={fieldClass}
                autoComplete="organization"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Email (optional)
              <input
                type="email"
                value={profile.email}
                onChange={(event) => update("email", event.target.value)}
                className={fieldClass}
                autoComplete="email"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Phone (optional)
              <input
                type="tel"
                value={profile.phone}
                onChange={(event) => update("phone", event.target.value)}
                className={fieldClass}
                autoComplete="tel"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Tax ID (optional)
              <input
                value={profile.taxId}
                onChange={(event) => update("taxId", event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Billing address (optional)
              <textarea
                value={profile.billingAddress}
                onChange={(event) =>
                  update("billingAddress", event.target.value)
                }
                rows={3}
                className={fieldClass}
                autoComplete="street-address"
              />
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Internal notes (optional)
              <textarea
                value={profile.notes}
                onChange={(event) => update("notes", event.target.value)}
                rows={3}
                className={fieldClass}
              />
            </label>
          </div>
          {error && (
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {client ? "Save changes" : "Add client"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
