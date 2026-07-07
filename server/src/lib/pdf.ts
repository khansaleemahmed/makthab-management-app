/**
 * Minimal, dependency-free PDF writer.
 *
 * The architecture doc calls for Puppeteer-rendered HTML PDFs (for rich
 * Arabic/RTL layout). For the MVP — and to keep the server installable offline
 * without a 300 MB headless browser — documents are produced by this small
 * generator using the built-in Helvetica fonts. It emits valid, openable A4
 * PDFs for receipts, vouchers, payslips and tabular reports.
 *
 * Swap `renderPdf` for a Puppeteer-backed implementation later without touching
 * callers: the public API is `renderPdf(doc): Buffer`.
 */

export interface PdfDoc {
  title: string;
  subtitle?: string;
  /** Key/value lines (receipts) or plain strings (notes). */
  lines?: Array<[string, string] | string>;
  /** Tabular data (reports). Rendered after `lines`. */
  table?: {
    headers: string[];
    rows: Array<Array<string | number>>;
    /** 0-based header indexes holding currency amounts — formatted with a Rs. prefix (PDF text is ASCII-only). */
    currencyCols?: number[];
    /** Append a bold "Total" row summing each currencyCols column after the last data row. */
    totalsRow?: boolean;
  };
  /** Footer note centred at the bottom of the last page. */
  footer?: string;
}

const PAGE_W = 595; // A4 @ 72dpi
const PAGE_H = 842;
const MARGIN_X = 50;
const MARGIN_TOP = 800;
const MARGIN_BOTTOM = 60;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

interface Cmd {
  x: number;
  y: number;
  size: number;
  bold: boolean;
  text: string;
}

// Standard-14 Helvetica supports ASCII cleanly; drop anything outside that
// range (Arabic needs a Puppeteer/embedded-font path — out of scope for MVP).
function toAscii(s: string): string {
  let out = "";
  for (const ch of String(s ?? "")) {
    const code = ch.codePointAt(0) ?? 0;
    out += code >= 32 && code <= 126 ? ch : code === 8377 ? "Rs." : "?";
  }
  return out;
}

function esc(s: string): string {
  return toAscii(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// PDF text is ASCII-only (see toAscii above), so the ₹ glyph is written out
// and toAscii maps it to "Rs." at render time — kept as a real ₹ char here so
// the mapping stays in one place.
function formatCurrency(n: number): string {
  return "₹" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function truncate(s: string, maxChars: number): string {
  const a = toAscii(s);
  return a.length <= maxChars ? a : a.slice(0, Math.max(0, maxChars - 1)) + "…".replace("…", "~");
}

// Lay a PdfDoc out into a list of pages, each a list of draw commands.
function layout(doc: PdfDoc): Cmd[][] {
  const pages: Cmd[][] = [[]];
  let page = 0;
  let y = MARGIN_TOP;

  const newPage = () => {
    pages.push([]);
    page += 1;
    y = MARGIN_TOP;
  };
  const push = (text: string, size: number, bold: boolean, x = MARGIN_X, advance = size + 7) => {
    if (y - advance < MARGIN_BOTTOM) newPage();
    pages[page].push({ x, y, size, bold, text });
    y -= advance;
  };
  const cellAt = (text: string, size: number, bold: boolean, x: number) => {
    pages[page].push({ x, y, size, bold, text });
  };

  push(doc.title, 18, true);
  if (doc.subtitle) push(doc.subtitle, 11, false);
  y -= 6;

  for (const line of doc.lines ?? []) {
    if (Array.isArray(line)) {
      if (y - 18 < MARGIN_BOTTOM) newPage();
      cellAt(line[0], 11, true, MARGIN_X);
      cellAt(String(line[1]), 11, false, MARGIN_X + 170);
      y -= 18;
    } else {
      push(line, 11, false);
    }
  }

  if (doc.table && doc.table.headers.length > 0) {
    y -= 8;
    const { headers, rows, currencyCols = [], totalsRow = false } = doc.table;
    const cols = headers.length;
    const colW = CONTENT_W / cols;
    const maxChars = Math.max(4, Math.floor(colW / 6));
    const fmt = (v: string | number, i: number) =>
      currencyCols.includes(i) && typeof v === "number" ? formatCurrency(v) : String(v);
    const drawRow = (cells: Array<string | number>, bold: boolean) => {
      if (y - 16 < MARGIN_BOTTOM) newPage();
      cells.forEach((c, i) => {
        cellAt(truncate(fmt(c, i), maxChars), 10, bold, MARGIN_X + i * colW);
      });
      y -= 16;
    };
    drawRow(headers, true);
    for (const row of rows) drawRow(row, false);
    if (totalsRow && currencyCols.length > 0) {
      const totals: Array<string | number> = headers.map((_, i) =>
        currencyCols.includes(i)
          ? rows.reduce((sum, r) => sum + (Number(r[i]) || 0), 0)
          : i === 0
            ? "Total"
            : ""
      );
      drawRow(totals, true);
    }
  }

  if (doc.footer) {
    pages[page].push({ x: MARGIN_X, y: 40, size: 9, bold: false, text: doc.footer });
  }

  return pages;
}

function contentStream(cmds: Cmd[]): string {
  return cmds
    .map(
      (c) =>
        `BT /${c.bold ? "F2" : "F1"} ${c.size} Tf ${c.x} ${c.y} Td (${esc(c.text)}) Tj ET`
    )
    .join("\n");
}

export function renderPdf(doc: PdfDoc): Buffer {
  const pages = layout(doc);
  const nPages = pages.length;

  // Object numbering: 1 catalog, 2 pages, 3 F1, 4 F2, then per page a page obj
  // and a content obj.
  const objects: string[] = [];
  const pageObjNums: number[] = [];
  for (let i = 0; i < nPages; i++) pageObjNums.push(5 + i * 2);

  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${nPages} >>`;
  objects[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  objects[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;

  pages.forEach((cmds, i) => {
    const pageNum = 5 + i * 2;
    const contentNum = 6 + i * 2;
    const stream = contentStream(cmds);
    objects[pageNum] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>`;
    objects[contentNum] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
  });

  // Serialise with a proper xref table.
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  const total = objects.length - 1; // highest object number
  for (let n = 1; n <= total; n++) {
    offsets[n] = Buffer.byteLength(body, "latin1");
    body += `${n} 0 obj\n${objects[n]}\nendobj\n`;
  }

  const xrefStart = Buffer.byteLength(body, "latin1");
  let xref = `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n <= total; n++) {
    xref += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(body + xref + trailer, "latin1");
}
