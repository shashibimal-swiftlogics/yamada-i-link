import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMaster, serializeMaster, TABLES } from '../lib/master.mjs';
import { defaultMasterCsv } from '../lib/master-default.mjs';
import { toCsv } from '../lib/csv.mjs';

const base = () => ({ ...defaultMasterCsv });

test('the built-in fictional master validates with 150 shops, 100 products and 4 locations', () => {
  const r = validateMaster(defaultMasterCsv);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.master.shops.length, 150);
  assert.equal(r.master.products.length, 100);
  assert.equal(r.master.locations.length, 4);
});

test('serialize then validate round-trips the same data', () => {
  const first = validateMaster(defaultMasterCsv).master;
  const second = validateMaster(serializeMaster(first));
  assert.equal(second.ok, true);
  assert.deepEqual(second.master, first);
});

test('a missing required column rejects the whole file', () => {
  const csv = base();
  csv.products = csv.products.replace('"unit_price_yen",', '');
  const r = validateMaster(csv);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.file === 'products.csv' && e.message.includes('unit_price_yen')));
});

test('an unknown column is rejected, not silently dropped', () => {
  const csv = base();
  csv.shops = csv.shops.replace('"active"', '"active","memo"');
  const r = validateMaster(csv);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.message.includes('不明な列')));
});

test('row errors carry file, physical line and Japanese message', () => {
  const csv = base();
  const lines = csv.products.split('\r\n');
  // Line 3 is product P002 (line 1 is the header). Break its price only.
  assert.ok(lines[2].includes(',280,'));
  lines[2] = lines[2].replace(',280,', ',2.5,');
  csv.products = lines.join('\r\n');
  const r = validateMaster(csv);
  assert.equal(r.ok, false);
  assert.deepEqual(r.errors.map((e) => [e.file, e.line, e.column]), [['products.csv', 3, 'unit_price_yen']]);
  assert.match(r.errors[0].message, /単価は0〜1000000の整数/);
});

test('duplicate product codes, bad prices and unknown locations are caught', () => {
  const rows = [
    ['P001', 'テスト商品', '麺類', '1パック', '100', 'LOC-FAC-01', '1'],
    ['P001', '重複', '麺類', '1パック', '-5', 'LOC-NONE', '1'],
  ];
  const csv = base();
  csv.products = toCsv(TABLES.products.columns, rows);
  const r = validateMaster(csv);
  assert.equal(r.ok, false);
  const messages = r.errors.map((e) => e.message).join('\n');
  assert.match(messages, /重複しています: P001/);
  assert.match(messages, /単価は0〜1000000/);
  assert.match(messages, /拠点コードが存在しません: LOC-NONE/);
});

test('invalid active flag and unknown location kind are rejected', () => {
  const csv = base();
  csv.locations = toCsv(TABLES.locations.columns, [['LOC-X-01', '試験拠点', 'warehouse']]);
  csv.shops = toCsv(TABLES.shops.columns, [['S001', '店', 'R1', 'LOC-X-01', 'yes']]);
  const r = validateMaster(csv);
  assert.equal(r.ok, false);
  assert.match(r.errors.map((e) => e.message).join('\n'), /種類は factory/);
  assert.match(r.errors.map((e) => e.message).join('\n'), /1（有効）か 0（無効）/);
});

test('Japanese active labels 有効 and 無効 are accepted', () => {
  const csv = base();
  csv.shops = toCsv(TABLES.shops.columns, [['S001', '店A', 'R1', 'LOC-LOG-01', '有効'], ['S002', '店B', 'R1', 'LOC-LOG-01', '無効']]);
  const r = validateMaster(csv);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.deepEqual(r.master.shops.map((s) => s.active), [true, false]);
});

test('an empty table is rejected', () => {
  const csv = base();
  csv.shops = toCsv(TABLES.shops.columns, []);
  assert.match(validateMaster(csv).errors.map((e) => e.message).join('\n'), /店舗アカウントが1件もありません/);
});
