import {stores} from './catalog.mjs';
export const storeName=o=>stores.find(s=>s.id===o.storeId)?.name||o.storeId;
export const orderDate=o=>new Date(o.createdAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'});
export const orderFilename=o=>`yamada-order-${String(o.storeId).replace(/[^A-Za-z0-9_-]/g,'')}-${String(o.id).replace(/[^A-Za-z0-9_-]/g,'')}`;
const safeCell=v=>typeof v==='number'?String(v):String(v??'').replace(/^[\s]*([=+@-])/,"'$1");
export function orderCsv(o){const rows=[['追跡ID','発注日時（日本時間）','店舗コード','店舗名','状態','商品コード','商品名','分類','単位','数量','単価（円）','小計（円）','注文合計（円）','備考'],...o.lines.map(p=>[o.traceId,orderDate(o),o.storeId,storeName(o),o.status,p.id,p.name,p.category,p.unit,p.quantity,p.price,p.quantity*p.price,o.total,o.note])];return '\uFEFF'+rows.map(row=>row.map(v=>'"'+safeCell(v).replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n'}
const md=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('|','\\|').replace(/\r?\n/g,'<br>');
export function orderMarkdown(o){return `# サンプル発注書 — Yamada i link\n\n> 架空データ・テスト発注です。実際の商品発送はありません。\n\n- 店舗：${md(storeName(o))} (${o.storeId})\n- 発注日時：${orderDate(o)} JST\n- 追跡ID：${md(o.traceId)}\n- 状態：${md(o.status)}\n\n| 商品コード | 商品名 | 単位 | 数量 | 単価（円） | 小計（円） |\n|---|---|---|---:|---:|---:|\n${o.lines.map(p=>`| ${md(p.id)} | ${md(p.name)} | ${md(p.unit)} | ${p.quantity} | ${p.price} | ${p.quantity*p.price} |`).join('\n')}\n\n**合計（参考）：¥${o.total.toLocaleString('ja-JP')}**\n\n## 連絡事項\n\n${md(o.note)||'なし'}\n`}
export function orderText(o){return `【テスト発注】Yamada i link\n実際の商品発送はありません。\n店舗：${storeName(o)} (${o.storeId})\n発注日時：${orderDate(o)} JST\n追跡ID：${o.traceId}\n\n${o.lines.map(p=>`${p.id} ${p.name} / ${p.unit} × ${p.quantity} = ¥${p.price*p.quantity}`).join('\n')}\n\n合計（参考）：¥${o.total}\n連絡事項：${o.note||'なし'}\n\nMarkdown・CSV・Excelの発注書を添付しています。`}
export async function orderXlsx(o){
 const {default:ExcelJS}=await import('exceljs');const wb=new ExcelJS.Workbook();wb.creator='Yamada i link';wb.created=new Date(o.createdAt);wb.modified=new Date(o.createdAt);const ws=wb.addWorksheet('発注書',{views:[{state:'frozen',ySplit:8}]});
 ws.columns=[{width:17},{width:34},{width:17},{width:13},{width:16},{width:18}];
 ws.mergeCells('A1:F1');ws.getCell('A1').value='Yamada i link — サンプル発注書';ws.getCell('A1').font={size:18,bold:true,color:{argb:'FF225C49'}};ws.getRow(1).height=34;
 ws.mergeCells('A2:F2');ws.getCell('A2').value='架空データ・テスト発注です。実際の商品発送はありません。';ws.getCell('A2').font={color:{argb:'FF9C6500'}};
 for(const [row,label,value] of [[3,'店舗',`${o.storeId} ${storeName(o)}`],[4,'発注日時',`${orderDate(o)} JST`],[5,'追跡ID',o.traceId],[6,'状態',o.status]]){ws.getCell(`A${row}`).value=label;ws.getCell(`A${row}`).font={bold:true};ws.mergeCells(`B${row}:F${row}`);ws.getCell(`B${row}`).value=value;ws.getRow(row).height=24}
 ws.getRow(8).values=['商品コード','商品名','単位','数量','単価（円）','小計（円）'];ws.getRow(8).height=28;ws.getRow(8).eachCell(c=>{c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF225C49'}};c.font={bold:true,color:{argb:'FFFFFFFF'}}});
 o.lines.forEach((p,i)=>{const row=ws.getRow(9+i);row.values=[p.id,p.name,p.unit,p.quantity,p.price,{formula:`D${9+i}*E${9+i}`,result:p.quantity*p.price}];row.height=26;row.eachCell(c=>{c.alignment={vertical:'middle',wrapText:true};if(i%2===0)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF1F5EF'}}});});
 const end=9+o.lines.length;ws.getCell(`E${end}`).value='合計（参考）';ws.getCell(`F${end}`).value={formula:`SUM(F9:F${end-1})`,result:o.total};ws.getRow(end).font={bold:true};ws.getRow(end).height=30;
 ws.getColumn(4).numFmt='0';ws.getColumn(5).numFmt='#,##0';ws.getColumn(6).numFmt='#,##0';ws.getCell(`A${end+2}`).value='連絡事項';ws.mergeCells(`B${end+2}:F${end+2}`);ws.getCell(`B${end+2}`).value=o.note||'なし';ws.getCell(`B${end+2}`).alignment={wrapText:true,vertical:'top'};ws.getRow(end+2).height=60;ws.autoFilter=`A8:F${end-1}`;ws.pageSetup={paperSize:9,orientation:'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0};
 // Stable archive timestamps make repeated email requests identical.
 const {default:JSZip}=await import('jszip');const zip=await JSZip.loadAsync(await wb.xlsx.writeBuffer());zip.forEach((path,file)=>{file.date=new Date('2000-01-01T00:00:00Z')});return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}
