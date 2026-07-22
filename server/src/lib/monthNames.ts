// English full month names — PDFs are ASCII-only (CLAUDE.md), so no i18n here.
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
// 3-letter abbreviations for compact subtitles/filenames (e.g. "Jan-2026").
export const MONTH_ABBR = MONTH_NAMES.map((m) => m.slice(0, 3));
