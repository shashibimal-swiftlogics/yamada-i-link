import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, toCsv } from '../lib/csv.mjs';

test('parses BOM, CRLF, quoted commas, doubled quotes and embedded newlines', () => {
  const text = '﻿"a","b, c","say ""hi"""\r\n1,"line1\nline2",3\r\n';
  const rows = parseCsv(text);
  assert.deepEqual(rows.map((r) => r.cells), [['a', 'b, c', 'say "hi"'], ['1', 'line1\nline2', '3']]);
  assert.deepEqual(rows.map((r) => r.line), [1, 2]);
});

test('reports the physical line of each row after a multi-line field', () => {
  const rows = parseCsv('h\n"x\ny"\nz\n');
  assert.deepEqual(rows.map((r) => r.line), [1, 2, 4]);
});

test('rejects an unterminated quote and skips blank lines', () => {
  assert.throws(() => parseCsv('"abc\n'), /閉じられていない/);
  assert.equal(parseCsv('a\n\n\nb\n').length, 2);
});

test('toCsv writes BOM, CRLF and round-trips Japanese text unchanged', () => {
  const out = toCsv(['名前', 'メモ'], [['うどん', '=1+1']]);
  assert.equal(out.charCodeAt(0), 0xfeff);
  assert.ok(out.endsWith('\r\n'));
  assert.deepEqual(parseCsv(out)[1].cells, ['うどん', '=1+1']);
});

test('formula guard only applies to reports, not master data', () => {
  assert.ok(toCsv(['x'], [['=SUM(A1)']], { guardFormulas: true }).includes(`"'=SUM(A1)"`));
  assert.ok(toCsv(['x'], [['=SUM(A1)']]).includes('"=SUM(A1)"'));
});
