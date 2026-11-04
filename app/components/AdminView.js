'use client';
import {useEffect,useMemo,useState} from 'react';
import {TABLES,validateMaster,templateCsv} from '../../lib/master.mjs';

// Admin console for master data. Upload CSV files, review every error with its file and line,
// then apply. A broken file never reaches the app: apply is blocked until the draft validates.
const LABEL={locations:'拠点（工場・倉庫・物流）',products:'商品',shops:'店舗アカウント'};
const HELP={
 locations:'location_id / name_ja / kind（factory・stock_room・logistics）',
 products:'product_id / name_ja / category / ordering_unit / unit_price_yen / location_id / active（1か0）',
 shops:'shop_id / name_ja / route_code / location_id / active（1か0）',
};
const KEYS=['locations','products','shops'];

function download(name,text){
 const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}

export default function AdminView({master,meta,currentCsv,applyMaster,rollbackMaster,onLogout}) {
 const [draft,setDraft]=useState(currentCsv),[notice,setNotice]=useState(''),[fileName,setFileName]=useState({});
 // Whenever the applied master changes (apply or rollback), the draft starts again from it.
 useEffect(()=>{setDraft(currentCsv);setFileName({})},[currentCsv]);
 const checked=useMemo(()=>validateMaster(draft),[draft]);
 const changed=KEYS.some(k=>draft[k]!==currentCsv[k]);
 const counts={locations:master.locations.length,products:master.products.length,shops:master.shops.length};

 async function load(key,file){
  if(!file)return;
  if(file.size>1024*1024){setNotice(`${TABLES[key].file}：1MB以下のファイルを選んでください`);return}
  const text=await file.text();
  setDraft(d=>({...d,[key]:text}));
  setFileName(f=>({...f,[key]:file.name}));
  setNotice(`${TABLES[key].file} を読み込みました。下の確認結果を見てから適用してください。`);
 }
 function apply(){
  const result=applyMaster(draft);
  if(result.ok)setNotice('マスタを適用しました。（このブラウザのみ・テストデータ）');
  else setNotice('適用できません。エラーを直してから、もう一度お試しください。');
 }
 function discard(){setDraft(currentCsv);setFileName({});setNotice('下書きを破棄しました。')}
 function rollback(){
  const r=rollbackMaster();
  setNotice(r?'1つ前の版に戻しました。':'戻せる版がありません。');
 }

 return <div className="workspace">
  <nav aria-label="管理メニュー"><button className="active" aria-current="page">マスタ管理</button><div className="navFoot">TEST DATA ONLY<br/>GENESIS ONE</div></nav>
  <main className="content">
   <div className="eyebrow">ADMIN / MASTER DATA</div>
   <h1>マスタ管理（CSV）</h1>
   <p className="muted">商品・店舗・拠点はCSVで管理します。読み込み後に全行を確認し、エラーがなければ適用します。{meta.custom?`現在：読み込み済みの版（${meta.appliedAt?new Date(meta.appliedAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}):'日時不明'}）`:'現在：既定のテストマスタ'}</p>
   <div className="stats">
    <div className="panel"><small>拠点</small><strong>{counts.locations}</strong></div>
    <div className="panel"><small>商品</small><strong>{counts.products}</strong></div>
    <div className="panel"><small>店舗アカウント</small><strong>{counts.shops}</strong></div>
   </div>

   {KEYS.map(key=><section className="panel masterCard" key={key}>
    <div className="row"><h2 className="grow">{LABEL[key]}</h2><span className="badge">{TABLES[key].file}</span></div>
    <p className="muted">列：{HELP[key]}</p>
    <div className="downloadButtons">
     <button onClick={()=>download(TABLES[key].file,currentCsv[key])}>↓ 現在のCSVを保存</button>
     <button onClick={()=>download(`template-${TABLES[key].file}`,templateCsv(key))}>↓ 空のテンプレート</button>
     <label className="fileButton">CSVを選んで読み込む<input type="file" accept=".csv,text/csv" onChange={e=>load(key,e.target.files?.[0])}/></label>
    </div>
    {fileName[key]&&<small className="muted">読み込み中のファイル：{fileName[key]}</small>}
   </section>)}

   <h2>確認結果</h2>
   {checked.ok
     ?<div className="ok" role="status">エラーはありません。{changed?'この内容を適用できます。':'現在のマスタと同じ内容です。'}</div>
     :<div className="error" role="alert"><p>{checked.errors.length}件のエラーがあります。直すまで適用できません。</p>
      <div className="issueList" role="region" aria-label="エラー一覧" tabIndex={0}><table><thead><tr><th scope="col">ファイル</th><th scope="col">行</th><th scope="col">内容</th></tr></thead><tbody>{checked.errors.slice(0,200).map((e,i)=><tr key={i}><td>{e.file}</td><td>{e.line||'—'}</td><td>{e.message}</td></tr>)}</tbody></table></div>
      {checked.errors.length>200&&<p>先頭200件のみ表示しています。</p>}</div>}

   <div className="downloadButtons adminActions">
    <button className="primary" disabled={!checked.ok||!changed} onClick={apply}>この内容で適用</button>
    <button disabled={!changed} onClick={discard}>下書きを破棄</button>
    <button disabled={!meta.hasPrevious} onClick={rollback}>1つ前の版に戻す</button>
   </div>
   <p role="status" className="muted">{notice}</p>
   <p className="muted">適用はこのブラウザ内のみです（テスト用）。本番では本部の管理者のみが適用でき、変更履歴を残します。</p>
   <div className="logoutRow"><button className="plain" onClick={onLogout}>ログアウト</button></div>
  </main>
 </div>
}
