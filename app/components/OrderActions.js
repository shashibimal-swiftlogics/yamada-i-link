'use client';
import {useState} from 'react';
import {orderCsv,orderMarkdown,orderXlsx,orderFilename} from '../../lib/order-exports.mjs';
export default function OrderActions({order,onEmail,emailBusy,emailReady}){
 const [busy,setBusy]=useState(''),[message,setMessage]=useState('');
 async function download(format){setBusy(format);setMessage('');try{const data=format==='xlsx'?await orderXlsx(order):format==='csv'?orderCsv(order):orderMarkdown(order);const mime={xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',csv:'text/csv;charset=utf-8',md:'text/markdown;charset=utf-8'}[format];const url=URL.createObjectURL(new Blob([data],{type:mime}));const a=document.createElement('a');a.href=url;a.download=`${orderFilename(order)}.${format}`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);setMessage(`${format.toUpperCase()}の保存を開始しました。`)}catch{setMessage('ファイルを作成できませんでした。もう一度お試しください。')}finally{setBusy('')}}
 return <div className="orderActions"><div className="downloadButtons">{[['md','Markdown (.md)'],['csv','CSV'],['xlsx','Excel (.xlsx)']].map(([format,label])=><button key={format} disabled={!!busy} onClick={()=>download(format)}>{busy===format?'作成中…':`↓ ${label}`}</button>)}<button disabled={!emailReady||emailBusy} onClick={()=>onEmail(order)}>{emailBusy?'送信中…':'メール送信'}</button></div><p className="muted" role="status">{message||'CSVはExcelで開ける日本語対応形式です。'}</p></div>
}
