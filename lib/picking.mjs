// Factory and logistics views: aggregate open orders into a picking list (by product) and a
// detail list (by shop and route). All figures come from the order snapshots.
import { toCsv } from './csv.mjs';
import { locationName } from './master.mjs';

export const STATUS_FILTERS = ['open', 'all', '受付済み', '準備中', '出荷済み'];

export function pickingRows(orders, master, { locationId = 'all', status = 'open' } = {}) {
  const picked = orders.filter((o) => (status === 'open' ? o.status !== '出荷済み' : status === 'all' || o.status === status));
  const detail = [];
  const byProduct = new Map();
  for (const order of picked) {
    for (const line of order.lines) {
      const loc = line.locationId ?? master.products.find((p) => p.id === line.id)?.locationId ?? '';
      if (locationId !== 'all' && loc !== locationId) continue;
      detail.push({
        routeCode: order.routeCode ?? '',
        storeId: order.storeId,
        storeName: order.storeName ?? order.storeId,
        productId: line.id,
        productName: line.name,
        unit: line.unit,
        quantity: line.quantity,
        locationId: loc,
        status: order.status,
        traceId: order.traceId,
      });
      const row = byProduct.get(line.id) ?? { productId: line.id, productName: line.name, unit: line.unit, locationId: loc, quantity: 0, shops: new Set() };
      row.quantity += line.quantity;
      row.shops.add(order.storeId);
      byProduct.set(line.id, row);
    }
  }
  const summary = [...byProduct.values()]
    .map((r) => ({ productId: r.productId, productName: r.productName, unit: r.unit, locationId: r.locationId, quantity: r.quantity, shopCount: r.shops.size }))
    .sort((a, b) => a.productId.localeCompare(b.productId));
  detail.sort((a, b) => a.routeCode.localeCompare(b.routeCode) || a.storeId.localeCompare(b.storeId) || a.productId.localeCompare(b.productId));
  return { summary, detail };
}

const SUMMARY_HEADERS = ['商品コード', '商品名', '単位', '合計数量', '店舗数', '拠点'];
const DETAIL_HEADERS = ['ルート', '店舗コード', '店舗名', '商品コード', '商品名', '単位', '数量', '拠点', '状態', '追跡ID'];

export function summaryCsv(summary, master) {
  return toCsv(SUMMARY_HEADERS, summary.map((r) => [r.productId, r.productName, r.unit, r.quantity, r.shopCount, locationName(master, r.locationId)]), { guardFormulas: true });
}

export function detailCsv(detail, master) {
  return toCsv(DETAIL_HEADERS, detail.map((r) => [r.routeCode, r.storeId, r.storeName, r.productId, r.productName, r.unit, r.quantity, locationName(master, r.locationId), r.status, r.traceId]), { guardFormulas: true });
}

const md = (v) => String(v ?? '').replaceAll('|', '\\|').replace(/\r?\n/g, ' ');

export function summaryMarkdown(summary, master, meta) {
  const rows = summary.map((r) => `| ${md(r.productId)} | ${md(r.productName)} | ${md(r.unit)} | ${r.quantity} | ${r.shopCount} | ${md(locationName(master, r.locationId))} |`);
  return `# 出荷・集荷の集計表 — Yamada i link\n\n> 架空データ・テスト集計です。実際の出荷はありません。\n\n- 対象：${md(meta.scope)}\n- 状態：${md(meta.statusLabel)}\n- 作成日時：${md(meta.createdAt)} JST\n\n| 商品コード | 商品名 | 単位 | 合計数量 | 店舗数 | 拠点 |\n|---|---|---|---:|---:|---|\n${rows.join('\n') || '| — | 対象の発注はありません | | | | |'}\n`;
}

// Native Excel workbook: a summary sheet and a detail sheet, frozen headers, numeric quantities.
export async function pickingXlsx(summary, detail, master, meta) {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Yamada i link';
  wb.created = new Date(0);
  wb.modified = new Date(0);
  const addSheet = (name, headers, rows, widths) => {
    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = widths.map((width) => ({ width }));
    ws.getRow(1).values = headers;
    ws.getRow(1).eachCell((c) => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF225C49' } }; });
    rows.forEach((r) => { ws.addRow(r); });
    ws.autoFilter = { from: 'A1', to: { row: 1, column: headers.length } };
    return ws;
  };
  addSheet('集計', SUMMARY_HEADERS, summary.map((r) => [r.productId, r.productName, r.unit, r.quantity, r.shopCount, locationName(master, r.locationId)]), [14, 34, 12, 12, 10, 22]);
  addSheet('明細', DETAIL_HEADERS, detail.map((r) => [r.routeCode, r.storeId, r.storeName, r.productId, r.productName, r.unit, r.quantity, locationName(master, r.locationId), r.status, r.traceId]), [10, 12, 26, 14, 30, 12, 10, 22, 12, 40]);
  wb.getWorksheet('集計').getColumn(4).numFmt = '0';
  wb.getWorksheet('明細').getColumn(7).numFmt = '0';
  wb.getWorksheet('集計').getCell('A1').note = `対象：${meta.scope} / ${meta.statusLabel}（架空データ）`;
  // Stable archive timestamps so repeated downloads of the same data are byte-identical.
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(await wb.xlsx.writeBuffer());
  zip.forEach((path, file) => { file.date = new Date('2000-01-01T00:00:00Z'); });
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
