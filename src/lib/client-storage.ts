import type { Client } from "@/types/client";

export const CLIENT_STORAGE_KEY = "invoicekit_clients_v1";

export type ClientStorageResult =
  | { ok: true; value: Client[]; message: string }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isClient(value: unknown): value is Client {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    typeof value.company === "string" &&
    typeof value.email === "string" &&
    (!value.email ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim())) &&
    typeof value.phone === "string" &&
    typeof value.billingAddress === "string" &&
    typeof value.taxId === "string" &&
    typeof value.notes === "string" &&
    typeof value.createdAt === "string" &&
    !Number.isNaN(Date.parse(value.createdAt)) &&
    typeof value.updatedAt === "string" &&
    !Number.isNaN(Date.parse(value.updatedAt))
  );
}

export function readClients(): ClientStorageResult {
  try {
    const storedClients = window.localStorage.getItem(CLIENT_STORAGE_KEY);
    const parsed: unknown = storedClients ? JSON.parse(storedClients) : [];

    if (
      !Array.isArray(parsed) ||
      !parsed.every(isClient) ||
      new Set(parsed.map((client) => client.id)).size !== parsed.length
    ) {
      return {
        ok: false,
        message: "Saved client data is invalid and has been left untouched.",
      };
    }

    return { ok: true, value: parsed, message: "" };
  } catch {
    return {
      ok: false,
      message:
        "Saved clients could not be loaded. Browser storage may be unavailable.",
    };
  }
}

export function writeClients(
  clients: Client[]
): { ok: true } | { ok: false; message: string } {
  try {
    window.localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(clients));
    return { ok: true };
  } catch {
    return {
      ok: false,
      message:
        "Clients could not be saved. Check available browser storage and try again.",
    };
  }
}

export function createClientId() {
  return crypto.randomUUID();
}
