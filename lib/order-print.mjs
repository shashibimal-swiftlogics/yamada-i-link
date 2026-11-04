// Print-ready order sheet (HTML) for one order. Every value is HTML-escaped.
import {orderDate,storeName} from './order-exports.mjs';

export const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

export function orderPrintHtml(o) {
  const rows = o.lines.map((p) => `<tr><td>${escapeHtml(p.id)}</td><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.unit)}</td><td class="n">${escapeHtml(p.quantity)}</td><td class="n">${escapeHtml(p.price.toLocaleString('ja-JP'))}</td><td class="n">${escapeHtml((p.price * p.quantity).toLocaleString('ja-JP'))}</td></tr>`).join('');
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(o.traceId)}</title><style>
body{font-family:-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif;margin:24px;color:#111}
h1{font-size:20px;margin:0 0 4px}.banner{color:#9c6500;font-size:12px}
dl{display:grid;grid-template-columns:110px 1fr;gap:4px 12px;font-size:13px}dt{color:#555}dd{margin:0}
table{width:100%;border-collapse:collapse;margin-top:14px;font-size:13px}th,td{border-bottom:1px solid #ccc;padding:6px;text-align:left}th{background:#eef3ef}.n{text-align:right}
@media print{button{display:none}}
</style></head><body>
<h1>発注書（テスト）</h1><p class="banner">架空データ・テスト発注です。実際の商品発送はありません。</p>
<dl><dt>店舗</dt><dd>${escapeHtml(storeName(o))}（${escapeHtml(o.storeId)}）</dd><dt>ルート</dt><dd>${escapeHtml(o.routeCode ?? '')}</dd><dt>発注日時</dt><dd>${escapeHtml(orderDate(o))} JST</dd><dt>追跡ID</dt><dd>${escapeHtml(o.traceId)}</dd><dt>状態</dt><dd>${escapeHtml(o.status)}</dd></dl>
<table><thead><tr><th>商品コード</th><th>商品名</th><th>単位</th><th class="n">数量</th><th class="n">単価（円）</th><th class="n">小計（円）</th></tr></thead><tbody>${rows}</tbody></table>
<p><b>合計（参考）：¥${escapeHtml(o.total.toLocaleString('ja-JP'))}</b></p><p>連絡事項：${escapeHtml(o.note || 'なし')}</p>
</body></html>`;
}
