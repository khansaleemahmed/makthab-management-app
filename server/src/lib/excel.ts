import ExcelJS from "exceljs";

export interface XlsxDoc {
  sheetName: string;
  /** Institution letterhead (name + address), centered above the title. */
  org?: { name: string; address: string };
  title?: string;
  headers: string[];
  rows: Array<Array<string | number | null>>;
  /** 0-based header indexes holding currency amounts — rendered as real numbers with a ₹ format, not text. */
  currencyCols?: number[];
  /** Append a bold "Total" row summing each currencyCols column after the last data row. */
  totalsRow?: boolean;
}

const CURRENCY_FMT = '"₹"#,##0.00';

// Letterhead palette — a muted navy/blue pair reads as "official" without
// the harsh contrast of pure black on a document meant to be skimmed.
const ORG_NAME_COLOR = "FF1F4E79";
const ORG_ADDRESS_COLOR = "FF595959";
const TITLE_COLOR = "FF2E75B6";

// Render a single-sheet workbook to an .xlsx Buffer.
export async function renderXlsx(doc: XlsxDoc): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Makthab";
  const ws = wb.addWorksheet(doc.sheetName.slice(0, 31) || "Sheet1");
  const currencyCols = doc.currencyCols ?? [];

  const totalCols = Math.max(1, doc.headers.length);
  let headerRowIdx = 1;
  if (doc.org) {
    const NAME_SIZE = 14;
    const ADDR_SIZE = 10;
    ws.mergeCells(headerRowIdx, 1, headerRowIdx, totalCols);
    const orgName = ws.getCell(headerRowIdx, 1);
    orgName.value = doc.org.name;
    orgName.font = { bold: true, size: NAME_SIZE, color: { argb: ORG_NAME_COLOR } };
    orgName.alignment = { horizontal: "center" };
    headerRowIdx += 1;

    if (doc.org.address) {
      ws.mergeCells(headerRowIdx, 1, headerRowIdx, totalCols);
      const orgAddress = ws.getCell(headerRowIdx, 1);
      orgAddress.value = doc.org.address;
      orgAddress.font = { size: ADDR_SIZE, color: { argb: ORG_ADDRESS_COLOR } };
      orgAddress.alignment = { horizontal: "center" };
      headerRowIdx += 1;
    }

    // Two blank rows between the letterhead and the report title.
    headerRowIdx += 2;
  }
  if (doc.title) {
    // Deliberately smaller than the org name above (14pt) so the letterhead
    // reads as the primary heading and the report title as secondary.
    const TITLE_SIZE = 12;
    ws.mergeCells(headerRowIdx, 1, headerRowIdx, totalCols);
    const t = ws.getCell(headerRowIdx, 1);
    t.value = doc.title;
    t.font = { bold: true, size: TITLE_SIZE, color: { argb: TITLE_COLOR } };
    t.alignment = { horizontal: "center" };
    headerRowIdx += 1;
  }

  const header = ws.getRow(headerRowIdx);
  header.values = doc.headers;
  header.font = { bold: true };
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
  });

  doc.rows.forEach((r) => {
    const row = ws.addRow(r);
    currencyCols.forEach((i) => {
      const cell = row.getCell(i + 1);
      if (typeof cell.value === "number") cell.numFmt = CURRENCY_FMT;
    });
  });

  if (doc.totalsRow && currencyCols.length > 0) {
    const totals: Array<string | number> = doc.headers.map((_, i) =>
      currencyCols.includes(i)
        ? doc.rows.reduce((sum, r) => sum + (Number(r[i]) || 0), 0)
        : i === 0
          ? "Total"
          : ""
    );
    const totalRow = ws.addRow(totals);
    totalRow.font = { bold: true };
    totalRow.eachCell((cell, colNumber) => {
      cell.border = { top: { style: "thin" } };
      if (currencyCols.includes(colNumber - 1)) cell.numFmt = CURRENCY_FMT;
    });
  }

  doc.headers.forEach((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...doc.rows.map((r) => String(r[i] ?? "").length)
    );
    ws.getColumn(i + 1).width = Math.min(40, Math.max(12, maxLen + 2));
  });

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}

export const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
