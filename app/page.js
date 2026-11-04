'use client';
import {useEffect,useRef,useState} from 'react';
import {defaultMaster} from '../lib/catalog.mjs';
import {validateMaster,serializeMaster} from '../lib/master.mjs';
import {KEYS,readJson,writeJson} from '../lib/storage.mjs';
import OrderActions from './components/OrderActions';
import StoreView from './components/StoreView';
import FactoryView from './components/FactoryView';
import AdminView from './components/AdminView';

// Demo PINs only. These are NOT authentication. Real access needs Supabase Auth and server-side roles.
const PINS={store:'1234',factory:'2345',admin:'3456'};
const ROLE_LABEL={store:'店舗用',factory:'工場・物流',admin:'管理者'};
const DEFAULT_CSV=serializeMaster(defaultMaster);

export default function Page(){
 const [role,setRole]=useState(null),[pickRole,setPickRole]=useState('store'),[pin,setPin]=useState('');
 const [shopChoice,setShopChoice]=useState('S001'),[shopQuery,setShopQuery]=useState(''),[shopSession,setShopSession]=useState(null);
 const [master,setMaster]=useState(defaultMaster),[masterCsv,setMasterCsv]=useState(DEFAULT_CSV),[masterMeta,setMasterMeta]=useState({custom:false,appliedAt:null,hasPrevious:false});
 const [orders,setOrders]=useState([]),[profiles,setProfiles]=useState({}),[ready,setReady]=useState(false),[error,setError]=useState('');
 const [emailReady,setEmailReady]=useState(false),[emailCode,setEmailCode]=useState(''),[emailBusy,setEmailBusy]=useState(false),[emailMessages,setEmailMessages]=useState({});
 const emailSending=useRef(false);

 useEffect(()=>{
  const saved=readJson(KEYS.orders,[]);
  setOrders(Array.isArray(saved)?saved:[]);
  const savedProfiles=readJson(KEYS.profiles,{});
  setProfiles(savedProfiles&&typeof savedProfiles==='object'&&!Array.isArray(savedProfiles)?savedProfiles:{});
  const stored=readJson(KEYS.masterCurrent,null);
  const previous=readJson(KEYS.masterPrevious,null);
  const hasPrevious=!!previous?.csv;
  if(stored?.csv){
   const r=validateMaster(stored.csv);
   if(r.ok){setMaster(r.master);setMasterCsv(serializeMaster(r.master));setMasterMeta({custom:true,appliedAt:stored.appliedAt??null,hasPrevious})}
   else{setError('保存されているマスタに誤りがあるため、既定のマスタを使用しています。');setMasterMeta({custom:false,appliedAt:null,hasPrevious})}
  }else setMasterMeta({custom:false,appliedAt:null,hasPrevious});
  setReady(true);
  fetch('/api/order-email').then(r=>r.json()).then(d=>setEmailReady(d.enabled===true)).catch(()=>setEmailReady(false));
 },[]);

 function saveOrders(next){
  try{writeJson(KEYS.orders,next);setOrders(next);return true}
  catch{setError('保存できませんでした。ブラウザの空き容量・保存設定をご確認ください。');return false}
 }
 function saveProfile(value){
  if(!shopSession)return false;
  const next={...profiles,[shopSession]:value};
  try{writeJson(KEYS.profiles,next);setProfiles(next);return true}
  catch{setError('保存できませんでした。ブラウザの空き容量・保存設定をご確認ください。');return false}
 }

 // Admin: apply a validated CSV set. The previous applied version is kept for one-step rollback.
 function applyMaster(csv){
  const r=validateMaster(csv);
  if(!r.ok)return r;
  try{
   const appliedAt=new Date().toISOString();
   const serial=serializeMaster(r.master);
   writeJson(KEYS.masterPrevious,{csv:masterCsv,savedAt:appliedAt});
   writeJson(KEYS.masterCurrent,{csv:serial,appliedAt});
   setMaster(r.master);setMasterCsv(serial);setMasterMeta({custom:true,appliedAt,hasPrevious:true});setError('');
   return r;
  }catch{
   return {ok:false,errors:[{file:'',line:0,column:'',message:'このブラウザに保存できませんでした。'}],master:null};
  }
 }
 function rollbackMaster(){
  const prev=readJson(KEYS.masterPrevious,null);
  if(!prev?.csv)return false;
  const r=validateMaster(prev.csv);
  if(!r.ok){setError('1つ前の版が壊れているため戻せません。');return false}
  try{
   const appliedAt=new Date().toISOString();
   const serial=serializeMaster(r.master);
   writeJson(KEYS.masterPrevious,{csv:masterCsv,savedAt:appliedAt});
   writeJson(KEYS.masterCurrent,{csv:serial,appliedAt});
   setMaster(r.master);setMasterCsv(serial);setMasterMeta({custom:true,appliedAt,hasPrevious:true});
   return true;
  }catch{return false}
 }

 async function sendEmail(order){
  if(emailSending.current)return;
  emailSending.current=true;setEmailBusy(true);setEmailMessages(m=>({...m,[order.id]:'メール送信中…'}));
  try{
   const r=await fetch('/api/order-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({order,accessCode:emailCode})});
   const data=await r.json();
   if(!r.ok)throw Error(data.error||'メール送信に失敗しました。');
   setEmailMessages(m=>({...m,[order.id]:'メールサービスが送信を受け付けました。受信箱への到着は別途ご確認ください。'}));
  }catch(e){setEmailMessages(m=>({...m,[order.id]:e.message||'メール送信に失敗しました。注文は保存済みです。'}))}
  finally{emailSending.current=false;setEmailBusy(false)}
 }
 const emailHelpText=!emailReady?'メール自動送信は未設定です。Excel・CSV・Markdownをダウンロードしてご利用ください。':!emailCode?'送信用アクセスコードを入力すると、メールで送れます。':'';
 function renderExports(order){return <>
  <OrderActions order={order} onEmail={sendEmail} emailBusy={emailBusy} emailReady={emailReady&&!!emailCode} emailHelp={emailHelpText}/>
  {emailReady&&<label>送信用アクセスコード<input type="password" autoComplete="off" value={emailCode} onChange={e=>setEmailCode(e.target.value)}/></label>}
  {emailMessages[order.id]&&<p role="status" className="emailNotice">{emailMessages[order.id]}</p>}
 </>}

 const q=shopQuery.normalize('NFKC').toLowerCase().trim();
 const shopOptions=master.shops.filter(s=>s.active&&(!q||s.id.toLowerCase().includes(q)||s.name.normalize('NFKC').toLowerCase().includes(q)));
 const effectiveChoice=shopOptions.some(s=>s.id===shopChoice)?shopChoice:shopOptions[0]?.id??'';

 function login(e){
  e.preventDefault();
  if(pin!==PINS[pickRole]){setError(`デモ用PINは${PINS[pickRole]}です`);return}
  if(pickRole==='store'){
   const shop=master.shops.find(s=>s.id===effectiveChoice&&s.active);
   if(!shop){setError('店舗を選んでください');return}
   setShopSession(shop.id);
  }
  setRole(pickRole);setPin('');setError('');
 }
 function logout(){setRole(null);setShopSession(null);setPin('');setEmailCode('');setError('')}

 const shop=shopSession?master.shops.find(s=>s.id===shopSession):null;
 const profile=shopSession?profiles[shopSession]:null;
 const displayName=profile?.displayName||shop?.name||'';

 return <>
  <div className="demo">サンプル環境 · すべて架空データ · 実際の発注・出荷は行われません</div>
  <header><a className="brand" href="/">yamada <span>i link</span><small>店舗と工場を、ひとつに。</small></a><div>{role==='store'&&shop?displayName:role?ROLE_LABEL[role]:''}{role&&<button className="plain" onClick={logout}>ログアウト</button>}</div></header>
  {error&&<div role="alert" className="error">{error}<button onClick={()=>setError('')}>閉じる</button></div>}
  {!ready&&<main><p className="muted">読み込み中…</p></main>}

  {ready&&!role&&<main className="login"><section><div className="eyebrow">SAMPLE ORDERING / v0.2</div><h1>明日の準備を、<br/>もっとスムーズに。</h1><p>店舗の発注、工場・物流の出荷準備、本部のマスタ管理を、ひとつの仕組みで。</p><div className="introStats"><span><b>{master.shops.length}</b>架空店舗</span><span><b>{master.products.length}</b>サンプル商品</span><span><b>{master.locations.length}</b>拠点</span></div><p className="muted">この端末のブラウザ内にのみ保存されます。<br/>他の端末とは共有されません。</p></section>
   <form className="panel" onSubmit={login}>
    <div className="roleTabs" role="tablist" aria-label="ログインの種類">{['store','factory','admin'].map(r=><button type="button" key={r} role="tab" aria-selected={pickRole===r} className={pickRole===r?'active':''} onClick={()=>{setPickRole(r);setPin('');setError('')}}>{ROLE_LABEL[r]}</button>)}</div>
    {pickRole==='store'&&<>
     <label>店舗を検索<input value={shopQuery} onChange={e=>setShopQuery(e.target.value)} placeholder="店舗コード・店舗名"/></label>
     <label>店舗（該当 {shopOptions.length} 件）<select value={effectiveChoice} onChange={e=>setShopChoice(e.target.value)}>{shopOptions.map(s=><option key={s.id} value={s.id}>{s.id} · {s.name}</option>)}</select></label>
    </>}
    {pickRole==='factory'&&<p className="muted">工場・物流の出荷準備画面に入ります。</p>}
    {pickRole==='admin'&&<p className="muted">商品・店舗・拠点のCSV管理画面に入ります。</p>}
    <label>デモ用PIN<input type="password" inputMode="numeric" value={pin} onChange={e=>setPin(e.target.value)} required/></label>
    <p className="muted">{ROLE_LABEL[pickRole]}の体験用PIN：{PINS[pickRole]}（本人認証ではありません）</p>
    <button className="primary full">{pickRole==='store'?'発注をはじめる →':pickRole==='factory'?'出荷準備を開く →':'マスタ管理を開く →'}</button>
   </form></main>}

  {ready&&role==='store'&&shop&&<StoreView shop={shop} master={master} orders={orders} saveOrders={saveOrders} profile={profile} saveProfile={saveProfile} displayName={displayName} renderExports={renderExports} onSubmitted={o=>{if(emailReady&&emailCode)void sendEmail(o)}} onError={setError} emailReady={emailReady} emailCode={emailCode} setEmailCode={setEmailCode} onLogout={logout}/>}
  {ready&&role==='factory'&&<FactoryView master={master} orders={orders} saveOrders={saveOrders} renderExports={renderExports} onLogout={logout}/>}
  {ready&&role==='admin'&&<AdminView master={master} meta={masterMeta} currentCsv={masterCsv} applyMaster={applyMaster} rollbackMaster={rollbackMaster} onLogout={logout}/>}
  <footer>Yamada i link · Sample v0.2 · 架空データ専用</footer>
 </>
}
