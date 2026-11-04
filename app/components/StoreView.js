'use client';
import {useRef,useState} from 'react';
import CatalogList from './CatalogList';
import {createOrder,total} from '../../lib/catalog.mjs';
import {validateProfile,PROFILE_LIMITS} from '../../lib/shop-profile.mjs';
import {locationName} from '../../lib/master.mjs';
const yen=n=>`¥${n.toLocaleString('ja-JP')}`;
const TABS=[['catalog','商品を選ぶ'],['cart','カート'],['history','発注履歴'],['account','マイページ']];

// One branch's workspace: order entry, history and its own account page.
export default function StoreView({shop,master,orders,saveOrders,profile,saveProfile,renderExports,onSubmitted,onError,emailReady,emailCode,setEmailCode,onLogout,displayName}) {
 const [view,setView]=useState('catalog'),[cart,setCart]=useState({}),[note,setNote]=useState(''),[receipt,setReceipt]=useState(null);
 const submitting=useRef(false);
 const activeProducts=master.products.filter(p=>p.active);
 const lines=activeProducts.filter(p=>cart[p.id]).map(p=>({...p,quantity:cart[p.id]}));
 const count=lines.reduce((n,p)=>n+p.quantity,0);
 const myOrders=orders.filter(o=>o.storeId===shop.id);
 const location=locationName(master,shop.locationId);

 function qty(id,n){setCart(c=>{const next={...c};if(n<=0)delete next[id];else next[id]=Math.min(99,Math.floor(n)||1);return next})}
 function submit(){
  if(submitting.current)return;
  submitting.current=true;
  try{
   const order=createOrder(shop.id,cart,note,crypto.randomUUID(),master);
   if(saveOrders([order,...orders])){setReceipt(order);setCart({});setNote('');setView('receipt');onSubmitted(order)}
  }catch(e){onError(e.message)}
  finally{submitting.current=false}
 }

 const nav=<nav aria-label="店舗メニュー">{TABS.map(([key,label])=><button key={key} aria-current={view===key?'page':undefined} className={view===key||(key==='cart'&&view==='confirm')?'active':''} onClick={()=>setView(key)}>{key==='cart'?`${label} (${count})`:label}</button>)}<div className="navFoot">TEST DATA ONLY<br/>GENESIS ONE</div></nav>;

 return <div className="workspace">{nav}<main className="content">
  {view==='catalog'&&<><CatalogList products={activeProducts} categories={[...new Set(activeProducts.map(p=>p.category))]} cart={cart} onQuantity={qty}/><div className="cartBar"><b>{count}点 <span>{yen(total(lines))}</span></b><button className="primary" disabled={!count} onClick={()=>setView('cart')}>カートを確認 →</button></div></>}

  {(view==='cart'||view==='confirm')&&<><div className="eyebrow">{view==='confirm'?'02 / CONFIRM':'01 / CART'}</div><h1>{view==='confirm'?'発注内容の確認':'カート'}</h1><p>{displayName}（{shop.id}）へのテスト発注・拠点：{location}</p>
   {!lines.length?<div className="panel">カートは空です。<button onClick={()=>setView('catalog')}>商品を選ぶ</button></div>:<section className="panel">
    {lines.map(p=><div className="cartLine" key={p.id}><div><b>{p.name}</b><small>{p.id} · {yen(p.price)} / {p.unit}</small></div>{view==='cart'?<div className="stepper"><button aria-label={`${p.name}を減らす`} onClick={()=>qty(p.id,p.quantity-1)}>−</button><input aria-label={`${p.name}の数量`} type="number" min="0" max="99" value={p.quantity} onChange={e=>qty(p.id,Number(e.target.value))}/><button disabled={p.quantity>=99} aria-label={`${p.name}を増やす`} onClick={()=>qty(p.id,p.quantity+1)}>＋</button></div>:<span>× {p.quantity}</span>}<b>{yen(p.price*p.quantity)}</b></div>)}
    <label>連絡事項（任意・200文字まで）<textarea maxLength={200} readOnly={view==='confirm'} value={note} onChange={e=>setNote(e.target.value)} placeholder="テスト用のメモ"/></label>
    <div className="row"><h2>合計（参考）</h2><h2>{yen(total(lines))}</h2></div>
    {view==='cart'?<button className="primary" onClick={()=>setView('confirm')}>発注内容を確認 →</button>:<>
     <p>実際の商品は発送されません。注文はこのブラウザに保存されます。</p>
     {emailReady?<label>送信用アクセスコード（メール自動送信に必要）<input type="password" autoComplete="off" value={emailCode} onChange={e=>setEmailCode(e.target.value)}/><small>発注確定後、設定済みの宛先へMD・CSV・Excelを添付して送信します。</small></label>:<p className="emailNotice">メール自動送信は未設定です。確定後にMD・CSV・Excelを保存できます。</p>}
     <button onClick={()=>setView('cart')}>修正する</button> <button className="primary" disabled={emailReady&&!emailCode} onClick={submit}>テスト発注を確定</button></>}
   </section>}</>}

  {view==='receipt'&&receipt&&<section className="panel receipt"><span className="success">✓</span><h1>テスト発注を受け付けました</h1><p>発注履歴と工場・物流の画面で確認できます。</p><code>{receipt.traceId}</code><h2>{yen(receipt.total)}</h2><button className="primary" onClick={()=>setView('history')}>発注履歴を見る</button>{renderExports(receipt)}</section>}

  {view==='history'&&<><div className="eyebrow">ORDER HISTORY</div><h1>発注履歴</h1><p>{displayName}の注文</p>{myOrders.map(o=><article className="order" key={o.id}><div className="row"><b className="grow">{new Date(o.createdAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})}</b><span className="badge">{o.status}</span></div><p>{yen(o.total)}</p><details><summary>注文内容・追跡IDを見る</summary>{o.lines.map(p=><p key={p.id}>{p.name} × {p.quantity}　{yen(p.price*p.quantity)}</p>)}<p>{o.note}</p><code>{o.traceId}</code></details>{renderExports(o)}</article>)}{!myOrders.length&&<div className="panel">まだ発注はありません。</div>}</>}

  {view==='account'&&<AccountPage shop={shop} location={location} profile={profile} saveProfile={saveProfile} />}
  <div className="logoutRow"><button className="plain" onClick={onLogout}>ログアウト</button></div>
 </main></div>
}

function AccountPage({shop,location,profile,saveProfile}) {
 const [form,setForm]=useState({displayName:profile?.displayName??'',contactName:profile?.contactName??'',phone:profile?.phone??'',imageDataUrl:profile?.imageDataUrl??''});
 const [errors,setErrors]=useState([]),[message,setMessage]=useState('');
 const set=(k,v)=>setForm(f=>({...f,[k]:v}));
 function pickImage(file){
  setErrors([]);
  if(!file)return;
  if(file.size>PROFILE_LIMITS.imageMaxBytes){setErrors([`画像は約${Math.round(PROFILE_LIMITS.imageMaxBytes/1024)}KB以下にしてください`]);return}
  const reader=new FileReader();
  reader.onload=()=>set('imageDataUrl',String(reader.result));
  reader.onerror=()=>setErrors(['画像を読み込めませんでした']);
  reader.readAsDataURL(file);
 }
 function save(){
  const r=validateProfile(form);
  if(!r.ok){setErrors(r.errors);setMessage('');return}
  if(saveProfile({...r.value,updatedAt:new Date().toISOString()})){setErrors([]);setMessage('保存しました。店舗画面の表示に反映されます。')}
 }
 return <><div className="eyebrow">MY ACCOUNT</div><h1>マイページ（店舗情報）</h1><p className="muted">表示名・担当者・画像は店舗で編集できます。正式な店舗名・コード・拠点は本部の管理です。</p>
  <section className="panel formGrid">
   <div><small>店舗コード</small><b>{shop.id}</b></div>
   <div><small>正式名称（本部管理）</small><b>{shop.name}</b></div>
   <div><small>拠点（本部管理）</small><b>{location}</b></div>
   <div><small>ルート（本部管理）</small><b>{shop.routeCode}</b></div>
  </section>
  <section className="panel formGrid">
   <label>表示名（{form.displayName.length}/{PROFILE_LIMITS.displayName}）<input maxLength={PROFILE_LIMITS.displayName} value={form.displayName} onChange={e=>set('displayName',e.target.value)} placeholder={shop.name}/></label>
   <label>担当者名（任意）<input maxLength={PROFILE_LIMITS.contactName} value={form.contactName} onChange={e=>set('contactName',e.target.value)}/></label>
   <label>電話番号（任意）<input inputMode="tel" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="03-0000-0000"/></label>
   <div className="imageField"><span>店舗の写真（任意・PNG/JPEG/WebP・約250KB以下）</span>{form.imageDataUrl?<img className="shopImage" src={form.imageDataUrl} alt="店舗の画像のプレビュー"/>:<div className="shopImage placeholder">画像なし</div>}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>pickImage(e.target.files?.[0])}/>{form.imageDataUrl&&<button type="button" className="plain" onClick={()=>set('imageDataUrl','')}>画像を外す</button>}</div>
  </section>
  {errors.length>0&&<div role="alert" className="error">{errors.map(e=><p key={e}>{e}</p>)}</div>}
  {message&&<div role="status" className="ok">{message}</div>}
  <button className="primary" onClick={save}>保存する</button>
 </>
}
