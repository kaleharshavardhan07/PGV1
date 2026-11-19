// Tabular exports (CSV and Excel). Every dataset is a list of rows keyed by column
// label; CSV output is hardened against spreadsheet formula injection.
import ExcelJS from 'exceljs';

const FORMULA_START = /^[=+\-@\t\r]/;

const cell = (v) => {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().split('T')[0];
  return v;
};

/** Neutralise values a spreadsheet would execute as a formula. */
const safeText = (v) => {
  const s = String(cell(v));
  return FORMULA_START.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s;
};

const csvEscape = (s) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export const toCsv = (columns, rows) =>
  // BOM so Excel opens UTF-8 (₹, names) correctly.
  '﻿' + [columns.map(csvEscape).join(','), ...rows.map((r) => columns.map((c) => csvEscape(safeText(r[c]))).join(','))].join('\r\n');

export async function writeXlsx(res, sheetName, columns, rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName.slice(0, 31));
  ws.columns = columns.map((c) => ({ header: c, key: c, width: Math.min(40, Math.max(12, c.length + 4)) }));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  for (const r of rows) {
    // Write text cells as strings so Excel never evaluates them.
    ws.addRow(Object.fromEntries(columns.map((c) => [c, typeof r[c] === 'string' ? safeText(r[c]) : cell(r[c])])));
  }
  await wb.xlsx.write(res);
}
