// Built-in FICTIONAL master data, loaded through the same CSV validator the admin page uses.
// The browser can replace this with an admin-applied master (see lib/storage.mjs).
import { defaultMasterCsv } from './master-default.mjs';
import { validateMaster, categoriesOf } from './master.mjs';

const checked = validateMaster(defaultMasterCsv);
if (!checked.ok) throw new Error('既定のマスタデータに誤りがあります');

export const defaultMaster = checked.master;
export const categories = categoriesOf(defaultMaster);
export const stores = defaultMaster.shops.map((s) => ({ id: s.id, name: s.name, active: s.active, routeCode: s.routeCode, locationId: s.locationId }));
export const products = defaultMaster.products.map((p) => ({ id: p.id, name: p.name, category: p.category, unit: p.unit, price: p.price, locationId: p.locationId, active: p.active }));

export function linesFromCart(cart, master = defaultMaster) {
  return Object.entries(cart).map(([id, quantity]) => {
    const p = master.products.find((item) => item.id === id && item.active);
    if (!p || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('数量は1〜99で指定してください');
    return { id: p.id, name: p.name, category: p.category, unit: p.unit, price: p.price, locationId: p.locationId, quantity };
  });
}

export function total(lines) {
  return lines.reduce((sum, p) => sum + p.price * p.quantity, 0);
}

// The shop name and route are copied into the order so later master changes do not rewrite history.
export function createOrder(storeId, cart, note = '', id = crypto.randomUUID(), master = defaultMaster) {
  const shop = master.shops.find((s) => s.id === storeId && s.active);
  if (!shop) throw new Error('店舗を選択してください');
  const lines = linesFromCart(cart, master);
  if (!lines.length) throw new Error('商品を追加してください');
  return {
    id,
    traceId: `G1-YIL-${id}`,
    storeId,
    storeName: shop.name,
    routeCode: shop.routeCode,
    lines,
    total: total(lines),
    note: note.slice(0, 200),
    createdAt: new Date().toISOString(),
    status: '受付済み',
  };
}
