import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { createOrder, defaultMaster } from '../lib/catalog.mjs';
import { escapeHtml, orderPrintHtml } from '../lib/order-print.mjs';
import { ordersBundle } from '../lib/order-bundle.mjs';

const id = (n) => `33333333-3333-4333-8333-${String(n).padStart(12, '0')}`;
const order = (n = 1, storeId = 'S001', note = '') => createOrder(storeId, { P001: 2, P061: 1 }, note, id(n), defaultMaster);

test('escapeHtml neutralises markup and quotes', () => {
  assert.equal(escapeHtml(`<img src=x onerror="a">&'`), '&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;');
});

test('print sheet escapes a malicious note and shows the trace id and test banner', () => {
  const html = orderPrintHtml(order(1, 'S001', '<script>alert(1)</script>'));
  assert.ok(!html.includes('<script>alert'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes(order(1).traceId));
  assert.ok(html.includes('架空データ'));
  assert.ok(html.includes('<meta charset="utf-8">'));
});

test('bundle has per-store folders with md, csv and xlsx, plus index and README', async () => {
  const orders = [order(1, 'S001'), order(2, 'S002')];
  const zip = await JSZip.loadAsync(await ordersBundle(orders));
  const names = Object.keys(zip.files);
  for (const o of orders) {
    const base = `orders/${o.storeId}/yamada-order-${o.storeId}-${o.id}`;
    for (const ext of ['md', 'csv', 'xlsx']) assert.ok(names.includes(`${base}.${ext}`), `${base}.${ext}`);
  }
  assert.ok(names.includes('index.csv'));
  assert.ok(names.includes('README.txt'));
  const index = await zip.file('index.csv').async('string');
  assert.ok(index.includes(orders[0].traceId) && index.includes(orders[1].traceId));
  assert.equal(index.split('\r\n').filter(Boolean).length >= 3, true);
});

test('bundle is an empty-safe zip with only index and README when no orders', async () => {
  const zip = await JSZip.loadAsync(await ordersBundle([]));
  assert.ok(zip.file('index.csv') && zip.file('README.txt'));
});
