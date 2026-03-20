import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const formatCurrency = (amountMinor: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(amountMinor / 100);

const formatNumber = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numeric = typeof value === "string" ? Number(value) : value;

  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-US").format(numeric);
};

const formatJsonValue = (value: unknown) => {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value === null || value === undefined) {
    return "null";
  }

  return JSON.stringify(value, null, 2);
};

const formatDisplayName = (
  profile?: {
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null,
  fallback?: string | null
) => {
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();
  return profile?.displayName || fullName || fallback || "Unknown user";
};

const formatRelativeDate = (value: string | Date) => {
  const input = value instanceof Date ? value : new Date(value);
  const diffMs = input.getTime() - Date.now();
  const minutes = Math.round(diffMs / 60000);

  if (Math.abs(minutes) < 60) {
    return `${Math.abs(minutes)}m ${minutes >= 0 ? "from now" : "ago"}`;
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return `${Math.abs(hours)}h ${hours >= 0 ? "from now" : "ago"}`;
  }

  const days = Math.round(hours / 24);
  return `${Math.abs(days)}d ${days >= 0 ? "from now" : "ago"}`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
};

export { cn, formatCurrency, formatDateTime, formatDisplayName, formatJsonValue, formatNumber, formatRelativeDate };
