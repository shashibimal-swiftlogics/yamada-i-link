import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { createOrder } from '../lib/catalog.mjs';
import { defaultMaster } from '../lib/catalog.mjs';
import { pickingRows, summaryCsv, detailCsv, summaryMarkdown, pickingXlsx } from '../lib/picking.mjs';
import { parseCsv } from '../lib/csv.mjs';

const id = (n) => `22222222-2222-4222-8222-${String(n).padStart(12, '0')}`;
const orders = () => [
  createOrder('S001', { P001: 2, P061: 1 }, '', id(1), defaultMaster),
  createOrder('S002', { P001: 3 }, '', id(2), defaultMaster),
  { ...createOrder('S150', { P061: 4 }, '', id(3), defaultMaster), status: '出荷済み' },
];

test('summary sums quantities across shops and excludes shipped orders by default', () => {
  const { summary } = pickingRows(orders(), defaultMaster);
  const p001 = summary.find((r) => r.productId === 'P001');
  assert.equal(p001.quantity, 5);
  assert.equal(p001.shopCount, 2);
  assert.equal(summary.find((r) => r.productId === 'P061').quantity, 1);
});

test('location filter keeps only lines stored at that location', () => {
  const { summary } = pickingRows(orders(), defaultMaster, { locationId: 'LOC-LOG-01' });
  assert.deepEqual(summary.map((r) => r.productId), ['P061']);
});

test('status filter can include shipped orders', () => {
  const all = pickingRows(orders(), defaultMaster, { status: 'all' });
  assert.equal(all.summary.find((r) => r.productId === 'P061').quantity, 5);
});

test('detail is sorted by route, shop and product', () => {
  const { detail } = pickingRows(orders(), defaultMaster);
  assert.deepEqual(detail.map((d) => `${d.storeId}/${d.productId}`), ['S001/P001', 'S001/P061', 'S002/P001']);
});

test('CSV exports keep Japanese text and guard spreadsheet formulas in report cells', () => {
  const { summary, detail } = pickingRows(orders(), defaultMaster);
  const csv = summaryCsv(summary, defaultMaster);
  assert.equal(parseCsv(csv)[0].cells[1], '商品名');
  assert.ok(csv.includes('うどん 標準'));
  const cell = detailCsv(detail, defaultMaster);
  assert.equal(parseCsv(cell)[1].cells[0], 'R1');
});

test('Markdown summary escapes pipes and states the test-data notice', () => {
  const { summary } = pickingRows(orders(), defaultMaster);
  const text = summaryMarkdown(summary, defaultMaster, { scope: '全拠点', statusLabel: '未出荷', createdAt: '2026-11-04 10:00' });
  assert.ok(text.includes('架空データ'));
  assert.ok(text.includes('| P001 |'));
});

test('XLSX has summary and detail sheets with numeric quantities', async () => {
  const { summary, detail } = pickingRows(orders(), defaultMaster);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await pickingXlsx(summary, detail, defaultMaster, { scope: '全拠点', statusLabel: '未出荷' }));
  const sum = wb.getWorksheet('集計');
  assert.equal(sum.getCell('A2').value, 'P001');
  assert.equal(sum.getCell('D2').value, 5);
  assert.equal(wb.getWorksheet('明細').getCell('G2').value, 2);
});
