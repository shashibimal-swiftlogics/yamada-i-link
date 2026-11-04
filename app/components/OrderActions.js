'use client';
import {useState} from 'react';
import {orderCsv,orderMarkdown,orderXlsx,orderFilename} from '../../lib/order-exports.mjs';
import {orderPrintHtml} from '../../lib/order-print.mjs';

const MIME={xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',csv:'text/csv;charset=utf-8',md:'text/markdown;charset=utf-8'};
const FORMATS=[['xlsx','Excel'],['csv','CSV'],['md','Markdown']];

// Per-order actions: download (Excel, CSV, Markdown), print, share the files, or email.
export default function OrderActions({order,onEmail,emailBusy,emailReady,emailHelp}){
 const [busy,setBusy]=useState(''),[message,setMessage]=useState('');

 async function makeFile(format){
  const data=format==='xlsx'?await orderXlsx(order):format==='csv'?orderCsv(order):orderMarkdown(order);
  return new File([data],`${orderFilename(order)}.${format}`,{type:MIME[format]});
 }
 async function download(format){
  setBusy(format);setMessage('');
  try{
   const f=await makeFile(format);
   const url=URL.createObjectURL(f);
   const a=document.createElement('a');a.href=url;a.download=f.name;document.body.append(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),60000);
   setMessage(`${f.name} の保存を開始しました。`);
  }catch{setMessage('ファイルを作成できませんでした。もう一度お試しください。')}
  finally{setBusy('')}
 }
 async function share(){
  setBusy('share');setMessage('');
  try{
   const files=await Promise.all(FORMATS.map(([format])=>makeFile(format)));
   if(navigator.canShare&&navigator.canShare({files})){
    await navigator.share({files,title:order.traceId,text:`テスト発注 ${order.traceId}（架空データ）`});
    setMessage('共有画面を開きました。');
   }else setMessage('この端末では共有に対応していません。ダウンロードまたは印刷をご利用ください。');
  }catch(e){setMessage(e?.name==='AbortError'?'共有をキャンセルしました。':'共有できませんでした。')}
  finally{setBusy('')}
 }
 function print(){
  const w=window.open('','_blank');
  if(!w){setMessage('印刷画面を開けませんでした。ポップアップを許可してください。');return}
  w.document.open();w.document.write(orderPrintHtml(order));w.document.close();w.focus();
  setTimeout(()=>{try{w.print()}catch{}},300);
 }

 return <div className="orderActions">
  <div className="downloadButtons" role="group" aria-label="発注書の操作">
   {FORMATS.map(([format,label])=><button key={format} disabled={!!busy} onClick={()=>download(format)}>{busy===format?'作成中…':`↓ ${label}`}</button>)}
   <button disabled={!!busy} onClick={print}>印刷</button>
   <button disabled={!!busy} onClick={share}>{busy==='share'?'準備中…':'共有（ファイルを送る）'}</button>
   <button disabled={!emailReady||emailBusy||!!busy} title={emailReady?'':emailHelp} onClick={()=>onEmail(order)}>{emailBusy?'送信中…':'メールで送る'}</button>
  </div>
  {!emailReady&&emailHelp&&<p className="muted">{emailHelp}</p>}
  <p className="muted" role="status">{message||'CSVはExcelで開ける日本語対応形式です。'}</p>
 </div>
}
