export function formatDate(
  value: string | Date | null | undefined,
  locale = "th-TH"
): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "-";
  // handles ISO datetime (e.g. "1970-01-01T08:00:00.000Z"), "HH:mm:ss", or "HH:mm"
  const date = new Date(value);
  if (!isNaN(date.getTime()) && value.includes("T")) {
    const h = String(date.getUTCHours()).padStart(2, "0");
    const m = String(date.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
  const parts = value.split(":");
  if (parts.length < 2) return value;
  const h = parts[0].padStart(2, "0");
  const m = parts[1].padStart(2, "0");
  return `${h}:${m}`;
}

export function titleCase(value: string | null | undefined): string {
  if (!value) return "-";
  return value
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export function formatMoney(
  value: number | string | null | undefined,
  currency = "THB"
): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (num === null || num === undefined || isNaN(num)) return "-";
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(num);
}
