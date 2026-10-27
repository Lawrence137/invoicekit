import { isInvoiceTemplate } from "@/lib/invoice-utils";
import type {
  BusinessProfile,
  InvoiceBrandingSettings,
} from "@/types/invoice";

export const BRANDING_STORAGE_KEY = "invoicekit_branding_v1";
export const MAX_LOGO_DATA_URL_LENGTH = 360_000;

export const DEFAULT_BRANDING_SETTINGS: InvoiceBrandingSettings = {
  logoDataUrl: null,
  accentColor: "#1d4ed8",
  defaultTemplate: "modern",
  businessProfile: {
    business: "Acme Studio",
    businessEmail: "",
    businessAddress: "",
    businessPhone: "",
    businessWebsite: "",
    businessTaxId: "",
  },
};

export type BrandingStorageResult<T> =
  | { ok: true; value: T; message: string }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidLogo(value: unknown): value is string | null {
  return (
    value === null ||
    (typeof value === "string" &&
      value.length <= MAX_LOGO_DATA_URL_LENGTH &&
      /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value))
  );
}

export function hasReadableAccentContrast(color: string) {
  if (!/^#[\da-f]{6}$/i.test(color)) return false;
  const channels = [1, 3, 5].map((index) =>
    parseInt(color.slice(index, index + 2), 16) / 255
  );
  const luminance = channels
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    )
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);

  return (1.05 / (luminance + 0.05)) >= 4.5;
}

function isBusinessProfile(value: unknown): value is BusinessProfile {
  if (!isRecord(value)) return false;
  return [
    "business",
    "businessEmail",
    "businessAddress",
    "businessPhone",
    "businessWebsite",
    "businessTaxId",
  ].every(
    (key) =>
      typeof value[key] === "string" &&
      value[key].length <= 1000
  );
}

export function isInvoiceBrandingSettings(
  value: unknown
): value is InvoiceBrandingSettings {
  return (
    isRecord(value) &&
    isValidLogo(value.logoDataUrl) &&
    typeof value.accentColor === "string" &&
    hasReadableAccentContrast(value.accentColor) &&
    isInvoiceTemplate(value.defaultTemplate) &&
    isBusinessProfile(value.businessProfile)
  );
}

export function readBrandingSettings(): BrandingStorageResult<InvoiceBrandingSettings> {
  try {
    const stored = window.localStorage.getItem(BRANDING_STORAGE_KEY);
    if (stored === null) {
      return {
        ok: true,
        value: {
          ...DEFAULT_BRANDING_SETTINGS,
          businessProfile: { ...DEFAULT_BRANDING_SETTINGS.businessProfile },
        },
        message: "",
      };
    }

    const parsed: unknown = JSON.parse(stored);
    if (!isInvoiceBrandingSettings(parsed)) {
      return {
        ok: false,
        message:
          "Brand settings are invalid and were left untouched. You can still edit and save invoices.",
      };
    }
    return { ok: true, value: parsed, message: "" };
  } catch {
    return {
      ok: false,
      message:
        "Brand settings could not be loaded from browser storage. Existing data was left untouched.",
    };
  }
}

export function writeBrandingSettings(
  settings: InvoiceBrandingSettings
): BrandingStorageResult<InvoiceBrandingSettings> {
  if (!isInvoiceBrandingSettings(settings)) {
    return {
      ok: false,
      message:
        "These brand settings are invalid. Correct the highlighted values and try again.",
    };
  }

  try {
    window.localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(settings));
    return { ok: true, value: settings, message: "" };
  } catch {
    return {
      ok: false,
      message:
        "Brand settings could not be saved. The logo may be too large for available browser storage.",
    };
  }
}
