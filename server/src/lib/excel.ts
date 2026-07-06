import ExcelJS from "exceljs";

export interface XlsxDoc {
  sheetName: string;
  title?: string;
  headers: string[];
  rows: Array<Array<string | number | null>>;
}

// Render a single-sheet workbook to an .xlsx Buffer.
export async function renderXlsx(doc: XlsxDoc): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Makthab";
  const ws = wb.addWorksheet(doc.sheetName.slice(0, 31) || "Sheet1");

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

  doc.rows.forEach((r) => ws.addRow(r));

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
