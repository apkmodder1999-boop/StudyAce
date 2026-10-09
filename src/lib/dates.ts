const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Deterministic batch date formatter (Month Year)
 * Uses UTC components to guarantee identical server and client rendered strings.
 */
export function formatBatchDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  } catch {
    return dateStr;
  }
}

/**
 * Deterministic simple date formatter (DD Mon YYYY)
 * Uses UTC components to avoid hydration mismatch across client/server timezones.
 */
export function formatSimpleDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = MONTHS[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Deterministic date-time formatter
 */
export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const datePart = formatSimpleDate(dateStr);
    const hours = String(d.getUTCHours()).padStart(2, "0");
    const minutes = String(d.getUTCMinutes()).padStart(2, "0");
    return `${datePart} ${hours}:${minutes} UTC`;
  } catch {
    return dateStr;
  }
}
