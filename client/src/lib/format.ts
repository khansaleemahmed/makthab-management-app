/**
 * Locale-aware formatting helpers. When Arabic is active we use the
 * `ar-SA` locale so numerals and dates render in the expected form.
 */

function localeFor(lang: string): string {
  return lang.startsWith('ar') ? 'ar-SA' : 'en-IN';
}

export function formatCurrency(amount: number, lang = 'en'): string {
  return new Intl.NumberFormat(localeFor(lang), {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

export function formatNumber(value: number, lang = 'en'): string {
  return new Intl.NumberFormat(localeFor(lang)).format(value ?? 0);
}

export function formatDate(value: string | Date | null | undefined, lang = 'en'): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(localeFor(lang), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthName(month: number): string {
  return MONTHS[month - 1] ?? String(month);
}

/** Convert an ISO date string to the value a native <input type="date"> expects. */
export function toDateInput(value?: string | Date | null): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}
