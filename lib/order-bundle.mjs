// One ZIP for logistics and later analysis: orders/<store>/<file>.{md,csv,xlsx} plus index.csv.
// Folder layout is stable so an agent can read it from a local folder or from an email attachment.
import {orderCsv,orderMarkdown,orderXlsx,orderFilename,orderDate,storeName} from './order-exports.mjs';
import {toCsv} from './csv.mjs';

export async function ordersBundle(orders) {
  const {default: JSZip} = await import('jszip');
  const zip = new JSZip();
  const index = [];
  for (const o of orders) {
    const dir = `orders/${o.storeId}/`;
    const base = orderFilename(o);
    zip.file(`${dir}${base}.md`, orderMarkdown(o));
    zip.file(`${dir}${base}.csv`, orderCsv(o));
    zip.file(`${dir}${base}.xlsx`, await orderXlsx(o));
    index.push([o.traceId, orderDate(o), o.storeId, storeName(o), o.routeCode ?? '', o.status, o.total, o.lines.length]);
  }
  zip.file('index.csv', toCsv(['追跡ID', '発注日時（日本時間）', '店舗コード', '店舗名', 'ルート', '状態', '合計（円）', '明細行数'], index, {guardFormulas: true}));
  zip.file('README.txt', 'Yamada i link テスト発注の一式（架空データ）。\r\norders/店舗コード/ に Markdown・CSV・Excel。index.csv に一覧。\r\n');
  return zip.generateAsync({type: 'uint8array', compression: 'DEFLATE'});
}
