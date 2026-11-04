'use client';
import {useMemo,useState} from 'react';
import {pickingRows,summaryCsv,detailCsv,summaryMarkdown,pickingXlsx} from '../../lib/picking.mjs';
import {locationName} from '../../lib/master.mjs';
const yen=n=>`¥${n.toLocaleString('ja-JP')}`;
const STATUS_OPTIONS=['受付済み','準備中','出荷済み'];
const FILTER_LABEL={open:'未出荷すべて',all:'すべて','受付済み':'受付済み','準備中':'準備中','出荷済み':'出荷済み'};
const MIME={xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',csv:'text/csv;charset=utf-8',md:'text/markdown;charset=utf-8'};

function download(name,data,mime){
 const url=URL.createObjectURL(new Blob([data],{type:mime}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}

// Factory and logistics console: pick by location, see per-shop detail, update order status, download files.
export default function FactoryView({master,orders,saveOrders,renderExports,onLogout}) {
 const [locationId,setLocationId]=useState('all'),[status,setStatus]=useState('open'),[busy,setBusy]=useState(''),[message,setMessage]=useState('');
 const {summary,detail}=useMemo(()=>pickingRows(orders,master,{locationId,status}),[orders,master,locationId,status]);
 const scopedOrders=useMemo(()=>orders.filter(o=>(status==='open'?o.status!=='出荷済み':status==='all'||o.status===status)&&(locationId==='all'||o.lines.some(l=>(l.locationId??master.products.find(p=>p.id===l.id)?.locationId)===locationId))),[orders,master,locationId,status]);
 const totalQty=summary.reduce((n,r)=>n+r.quantity,0);
 const shopCount=new Set(detail.map(d=>d.storeId)).size;
 const scopeLabel=locationId==='all'?'全拠点':locationName(master,locationId);
 const statusLabel=FILTER_LABEL[status];
 const stamp=new Date().toISOString().slice(0,10);
 const base=`yamada-picking-${locationId}-${status}-${stamp}`;

 async function run(kind,fn){
  setBusy(kind);setMessage('');
  try{await fn();setMessage(`${kind.toUpperCase()}を保存しました。`)}
  catch{setMessage('ファイルを作成できませんでした。もう一度お試しください。')}
  finally{setBusy('')}
 }
 function setOrderStatus(id,next){
  if(!saveOrders(orders.map(o=>o.id===id?{...o,status:next}:o)))return;
  setMessage('対応状況を更新しました。');
 }

 return <div className="workspace">
  <nav aria-label="工場・物流メニュー"><button className="active" aria-current="page">工場・物流</button><div className="navFoot">TEST DATA ONLY<br/>GENESIS ONE</div></nav>
  <main className="content">
   <div className="eyebrow">FACTORY / LOGISTICS</div>
   <h1>工場・物流 出荷準備</h1>
   <p className="muted">店舗から届いた発注を、拠点・状態で絞り込み、集計と明細をダウンロードできます。（テストデータのみ）</p>
   <section className="panel formGrid">
    <label>拠点<select value={locationId} onChange={e=>setLocationId(e.target.value)}><option value="all">すべての拠点</option>{master.locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
    <label>状態<select value={status} onChange={e=>setStatus(e.target.value)}>{['open','all',...STATUS_OPTIONS].map(s=><option key={s} value={s}>{FILTER_LABEL[s]}</option>)}</select></label>
   </section>
   <div className="stats">
    <div className="panel"><small>対象の発注</small><strong>{scopedOrders.length}</strong></div>
    <div className="panel"><small>合計数量（品目計）</small><strong>{totalQty}</strong></div>
    <div className="panel"><small>店舗数</small><strong>{shopCount}</strong></div>
   </div>
   <div className="downloadButtons">
    <button disabled={!!busy} onClick={()=>run('csv',()=>download(`${base}-summary.csv`,summaryCsv(summary,master),MIME.csv))}>{busy==='csv'?'作成中…':'↓ 集計 CSV'}</button>
    <button disabled={!!busy} onClick={()=>run('xlsx',async()=>download(`${base}.xlsx`,await pickingXlsx(summary,detail,master,{scope:scopeLabel,statusLabel}),MIME.xlsx))}>{busy==='xlsx'?'作成中…':'↓ Excel（集計・明細）'}</button>
    <button disabled={!!busy} onClick={()=>run('md',()=>download(`${base}.md`,summaryMarkdown(summary,master,{scope:scopeLabel,statusLabel,createdAt:new Date().toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})}),MIME.md))}>{busy==='md'?'作成中…':'↓ Markdown'}</button>
    <button disabled={!!busy} onClick={()=>run('detail',()=>download(`${base}-detail.csv`,detailCsv(detail,master),MIME.csv))}>{busy==='detail'?'作成中…':'↓ 明細 CSV（配送ルート別）'}</button>
    <button disabled={!!busy||!scopedOrders.length} onClick={()=>run('zip',async()=>{const {ordersBundle}=await import('../../lib/order-bundle.mjs');download(`${base}-orders.zip`,await ordersBundle(scopedOrders),'application/zip')})}>{busy==='zip'?'作成中…':'↓ 発注一式 ZIP（店舗別・分析用）'}</button>
   </div>
   <p role="status" className="muted">{message||'CSVはExcelで開ける日本語対応形式です。'}</p>

   <h2>品目別の集計（{scopeLabel}・{statusLabel}）</h2>
   {!summary.length&&<div className="panel">対象の発注はありません。</div>}
   {!!summary.length&&<div className="productList" role="region" aria-label="品目別集計" tabIndex={0}><table><thead><tr><th scope="col">商品コード</th><th scope="col">商品名</th><th scope="col">数量</th><th scope="col">店舗数</th><th scope="col">拠点</th></tr></thead><tbody>{summary.map(r=><tr key={r.productId}><td>{r.productId}</td><td>{r.productName}</td><td><strong>{r.quantity}</strong> {r.unit}</td><td>{r.shopCount}</td><td>{locationName(master,r.locationId)}</td></tr>)}</tbody></table></div>}

   <h2>発注ごとの状態</h2>
   {scopedOrders.map(o=><article className="order" key={o.id}>
    <div className="row"><b className="grow">{o.storeName??o.storeId}</b><span className="badge">{o.status}</span></div>
    <p className="muted">{o.routeCode?`ルート ${o.routeCode} · `:''}{new Date(o.createdAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})} · {yen(o.total)}</p>
    <code>{o.traceId}</code>
    {renderExports&&renderExports(o)}
    <label>対応状況<select value={o.status} onChange={e=>setOrderStatus(o.id,e.target.value)}>{STATUS_OPTIONS.map(s=><option key={s}>{s}</option>)}</select></label>
   </article>)}
   {!scopedOrders.length&&<p className="muted">該当する発注はありません。</p>}
   <div className="logoutRow"><button className="plain" onClick={onLogout}>ログアウト</button></div>
  </main>
 </div>
}
