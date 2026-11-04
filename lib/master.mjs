// Master data (locations, products, shops) as CSV. The CSV files are the source of truth.
// validateMaster() checks every row and every cross-reference. If any error is found the
// whole set is rejected, so a partial or broken upload never reaches orders.
import { parseCsv, toCsv } from './csv.mjs';

export const KINDS = ['factory', 'stock_room', 'logistics'];
export const KIND_JA = { factory: '工場', stock_room: '倉庫', logistics: '物流センター' };

export const TABLES = {
  locations: {
    file: 'locations.csv',
    columns: ['location_id', 'name_ja', 'kind'],
    label: '拠点（工場・倉庫・物流）',
  },
  products: {
    file: 'products.csv',
    columns: ['product_id', 'name_ja', 'category', 'ordering_unit', 'unit_price_yen', 'location_id', 'active'],
    label: '商品',
  },
  shops: {
    file: 'shops.csv',
    columns: ['shop_id', 'name_ja', 'route_code', 'location_id', 'active'],
    label: '店舗アカウント',
  },
};

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{1,19}$/;
const ACTIVE = { '1': true, '0': false, 有効: true, 無効: false };
const LIMITS = { name: 60, category: 20, unit: 10, route: 20, locationName: 40 };

function readTable(key, text, errors) {
  const spec = TABLES[key];
  let parsed;
  try {
    parsed = parseCsv(text);
  } catch (e) {
    errors.push({ file: spec.file, line: 0, column: '', message: e.message });
    return [];
  }
  if (!parsed.length) {
    errors.push({ file: spec.file, line: 0, column: '', message: 'ヘッダー行がありません' });
    return [];
  }
  const header = parsed[0].cells.map((c) => c.trim());
  const missing = spec.columns.filter((c) => !header.includes(c));
  const unknown = header.filter((c) => !spec.columns.includes(c));
  // Unknown columns are rejected rather than ignored, so no data is silently dropped.
  if (missing.length) errors.push({ file: spec.file, line: parsed[0].line, column: '', message: `必要な列がありません: ${missing.join(', ')}` });
  if (unknown.length) errors.push({ file: spec.file, line: parsed[0].line, column: '', message: `不明な列があります: ${unknown.join(', ')}` });
  if (missing.length || unknown.length) return [];

  return parsed.slice(1).map(({ line, cells }) => {
    if (cells.length !== header.length) {
      errors.push({ file: spec.file, line, column: '', message: `列数が合いません（${cells.length}列・期待 ${header.length}列）` });
    }
    const record = { _line: line };
    header.forEach((h, idx) => { record[h] = (cells[idx] ?? '').trim(); });
    return record;
  });
}

export function validateMaster({ locations, products, shops }) {
  const errors = [];
  const rows = {
    locations: readTable('locations', locations, errors),
    products: readTable('products', products, errors),
    shops: readTable('shops', shops, errors),
  };
  const fail = (key, row, column, message) => errors.push({ file: TABLES[key].file, line: row._line, column, message });
  const seen = {};
  const unique = (key, row, column, value) => {
    seen[key] ??= new Set();
    if (seen[key].has(value)) fail(key, row, column, `重複しています: ${value}`);
    seen[key].add(value);
  };
  const text = (key, row, column, max) => {
    const v = row[column] ?? '';
    if (!v) fail(key, row, column, '空欄です');
    else if ([...v].length > max) fail(key, row, column, `${max}文字以内で入力してください`);
    return v;
  };
  const id = (key, row, column) => {
    const v = row[column] ?? '';
    if (!ID_PATTERN.test(v)) fail(key, row, column, 'コードは英数字・-・_の2〜20文字で入力してください');
    else unique(key, row, column, v);
    return v;
  };
  const active = (key, row) => {
    const v = row.active ?? '';
    if (!(v in ACTIVE)) { fail(key, row, 'active', '有効は 1（有効）か 0（無効）で入力してください'); return false; }
    return ACTIVE[v];
  };

  const locationRows = rows.locations.map((row) => {
    const locationId = id('locations', row, 'location_id');
    const name = text('locations', row, 'name_ja', LIMITS.locationName);
    if (!KINDS.includes(row.kind)) fail('locations', row, 'kind', `種類は ${KINDS.join(' / ')} のいずれかです`);
    return { id: locationId, name, kind: row.kind };
  });
  const locationIds = new Set(locationRows.map((l) => l.id));
  if (!locationRows.length) errors.push({ file: TABLES.locations.file, line: 0, column: '', message: '拠点が1件もありません' });

  const productRows = rows.products.map((row) => {
    const productId = id('products', row, 'product_id');
    const name = text('products', row, 'name_ja', LIMITS.name);
    const category = text('products', row, 'category', LIMITS.category);
    const unit = text('products', row, 'ordering_unit', LIMITS.unit);
    const priceText = row.unit_price_yen ?? '';
    const price = Number(priceText);
    if (!/^\d{1,7}$/.test(priceText) || price > 1000000) fail('products', row, 'unit_price_yen', '単価は0〜1000000の整数（円）で入力してください');
    if (!locationIds.has(row.location_id)) fail('products', row, 'location_id', `拠点コードが存在しません: ${row.location_id}`);
    return { id: productId, name, category, unit, price, locationId: row.location_id, active: active('products', row) };
  });
  if (!productRows.length) errors.push({ file: TABLES.products.file, line: 0, column: '', message: '商品が1件もありません' });

  const shopRows = rows.shops.map((row) => {
    const shopId = id('shops', row, 'shop_id');
    const name = text('shops', row, 'name_ja', LIMITS.name);
    const routeCode = text('shops', row, 'route_code', LIMITS.route);
    if (!locationIds.has(row.location_id)) fail('shops', row, 'location_id', `拠点コードが存在しません: ${row.location_id}`);
    return { id: shopId, name, routeCode, locationId: row.location_id, active: active('shops', row) };
  });
  if (!shopRows.length) errors.push({ file: TABLES.shops.file, line: 0, column: '', message: '店舗アカウントが1件もありません' });

  if (errors.length) return { ok: false, errors, master: null };
  return { ok: true, errors: [], master: { locations: locationRows, products: productRows, shops: shopRows } };
}

// Writes a validated master back to CSV. Used for downloads and for rollback storage.
export function serializeMaster(master) {
  const toRows = {
    locations: master.locations.map((l) => [l.id, l.name, l.kind]),
    products: master.products.map((p) => [p.id, p.name, p.category, p.unit, p.price, p.locationId, p.active ? 1 : 0]),
    shops: master.shops.map((s) => [s.id, s.name, s.routeCode, s.locationId, s.active ? 1 : 0]),
  };
  return Object.fromEntries(Object.keys(TABLES).map((key) => [key, toCsv(TABLES[key].columns, toRows[key])]));
}

export function templateCsv(key) {
  return toCsv(TABLES[key].columns, []);
}

export function categoriesOf(master) {
  return [...new Set(master.products.map((p) => p.category))];
}

export function locationName(master, locationId) {
  return master.locations.find((l) => l.id === locationId)?.name ?? locationId;
}
