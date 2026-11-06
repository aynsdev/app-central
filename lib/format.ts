const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en");

export const formatNumber = (n: number) => (Math.abs(n) >= 10_000 ? compact.format(n) : full.format(n));

export const formatPercent = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;

export function formatChange(now: number, before: number): { label: string; trend: "up" | "down" | "neutral" } | null {
  if (before === 0) return now > 0 ? { label: "New", trend: "up" } : null;
  const d = (now - before) / before;
  if (Math.abs(d) < 0.005) return { label: "0%", trend: "neutral" };
  return { label: `${d > 0 ? "+" : "−"}${Math.abs(Math.round(d * 100))}%`, trend: d > 0 ? "up" : "down" };
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function formatRelative(date: Date | string | null, now = Date.now()): string {
  if (!date) return "never";
  const s = Math.round((new Date(date).getTime() - now) / 1000);
  const abs = Math.abs(s);
  if (abs < 45) return "just now";
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(s / 3600), "hour");
  if (abs < 30 * 86_400) return rtf.format(Math.round(s / 86_400), "day");
  if (abs < 365 * 86_400) return rtf.format(Math.round(s / (30 * 86_400)), "month");
  return rtf.format(Math.round(s / (365 * 86_400)), "year");
}

export function formatDateTime(date: Date | string, timeZone?: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(date));
}

/** "2026-11-06" → "Nov 6" without timezone shifts. */
export function formatDay(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(Date.UTC(y, m - 1, d));
}

export function formatDuration(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86_400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86_400).toFixed(1)}d`;
}
