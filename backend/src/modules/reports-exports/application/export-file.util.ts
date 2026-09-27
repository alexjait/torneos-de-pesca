import * as XLSX from 'xlsx';

export type TabularExport = {
  headers: string[];
  rows: Array<Record<string, unknown>>;
};

export function buildCsvBuffer(tabular: TabularExport) {
  const lines = [
    tabular.headers.join(','),
    ...tabular.rows.map((row) =>
      tabular.headers.map((header) => escapeCsvValue(row[header])).join(','),
    ),
  ];

  return Buffer.from(lines.join('\n'), 'utf8');
}

export function buildXlsxBuffer(tabular: TabularExport, sheetName: string) {
  const worksheet = XLSX.utils.aoa_to_sheet([
    tabular.headers,
    ...tabular.rows.map((row) => tabular.headers.map((header) => normalizeCellValue(row[header]))),
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31) || 'Reporte');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function escapeCsvValue(value: unknown) {
  const normalized = normalizeCellValue(value).replaceAll('"', '""');
  return `"${normalized}"`;
}

function normalizeCellValue(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}
