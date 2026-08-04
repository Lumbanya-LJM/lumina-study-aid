import { format, parseISO } from "date-fns";

const currencySymbols: Record<string, string> = {
  ZMW: "K",
  USD: "$",
  ZAR: "R",
  KES: "KSh",
  NGN: "₦",
};

export function formatMoney(amount: number | null | undefined, currencyCode = "ZMW"): string {
  const symbol = currencySymbols[currencyCode] ?? currencyCode + " ";
  const value = Number(amount ?? 0);
  return `${symbol} ${value.toLocaleString("en-US", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return format(parseISO(iso), "d MMM yyyy");
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return format(parseISO(iso), "d MMM yyyy, HH:mm");
}

export function formatNumber(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString("en-US");
}
