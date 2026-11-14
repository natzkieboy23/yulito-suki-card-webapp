type Cell = string | number | null | undefined;

function esc(v: Cell): string {
  const s = v === null || v === undefined ? '' : String(v);
  // Quote when needed; prefix formula-leading chars so spreadsheets don't execute them.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(sections: { title: string; header: string[]; rows: Cell[][] }[]): string {
  return sections
    .map((s) => [esc(s.title), s.header.map(esc).join(','), ...s.rows.map((r) => r.map(esc).join(','))].join('\r\n'))
    .join('\r\n\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
