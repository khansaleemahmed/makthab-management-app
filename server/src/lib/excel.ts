import ExcelJS from "exceljs";

export interface XlsxDoc {
  sheetName: string;
  title?: string;
  headers: string[];
  rows: Array<Array<string | number | null>>;
  /** 0-based header indexes holding currency amounts — rendered as real numbers with a ₹ format, not text. */
  currencyCols?: number[];
  /** Append a bold "Total" row summing each currencyCols column after the last data row. */
  totalsRow?: boolean;
}

const CURRENCY_FMT = '"₹"#,##0.00';

// Render a single-sheet workbook to an .xlsx Buffer.
export async function renderXlsx(doc: XlsxDoc): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Makthab";
  const ws = wb.addWorksheet(doc.sheetName.slice(0, 31) || "Sheet1");
  const currencyCols = doc.currencyCols ?? [];

  let headerRowIdx = 1;
  if (doc.title) {
    ws.mergeCells(1, 1, 1, Math.max(1, doc.headers.length));
    const t = ws.getCell(1, 1);
    t.value = doc.title;
    t.font = { bold: true, size: 14 };
    headerRowIdx = 2;
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
