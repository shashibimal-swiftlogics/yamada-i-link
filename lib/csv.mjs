// Small RFC 4180-style CSV reader/writer. Handles UTF-8 BOM, CRLF/LF, quoted fields,
// embedded newlines and doubled quotes. Returns the physical line number of each row
// so validation errors can point to the exact line in the master file.

export function parseCsv(text) {
  const src = String(text ?? '').replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let line = 1;
  let rowLine = 1;

  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { pushField(); rows.push({ line: rowLine, cells: row }); row = []; };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        if (ch === '\n') line++;
        field += ch;
      }
    } else if (ch === '"' && field === '') {
      inQuotes = true;
    } else if (ch === ',') {
      pushField();
    } else if (ch === '\r') {
      // CRLF: the \n that follows ends the row.
    } else if (ch === '\n') {
      pushRow();
      line++;
      rowLine = line;
    } else {
      field += ch;
    }
  }
  if (inQuotes) throw new Error('引用符（"）が閉じられていない箇所があります');
  if (field !== '' || row.length > 0) pushRow();
  // Drop completely blank lines (for example a trailing newline).
  return rows.filter((r) => !(r.cells.length === 1 && r.cells[0] === ''));
}

// Excel-friendly output: UTF-8 with BOM and CRLF. Every field is quoted.
// guardFormulas (for reports only) prefixes text starting with = + - @ so spreadsheets
// do not evaluate it. Master-data files are NOT guarded, so values round-trip unchanged.
export function toCsv(headers, rows, { guardFormulas = false } = {}) {
  const cell = (v) => {
    if (typeof v === 'number') return String(v);
    let s = v == null ? '' : String(v);
    if (guardFormulas && /^\s*[=+\-@]/.test(s)) s = `'${s}`;
    return `"${s.replaceAll('"', '""')}"`;
  };
  return `﻿${[headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;
}
