import {emailConfigured,accessCodeValid,validateEmailOrder,sendOrderEmail} from '../../../lib/order-email.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export function GET(){return json({enabled:emailConfigured(process.env)})}
export async function POST(request){
 if(!emailConfigured(process.env))return json({error:'メール自動送信は未設定です。発注書をダウンロードできます。'},503);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'この画面から送信してください。'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON形式が必要です。'},415);
 try{const reader=request.body?.getReader();if(!reader)return json({error:'発注データが必要です。'},400);let size=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();return json({error:'発注データが大きすぎます。'},413)}chunks.push(Buffer.from(value))}let data;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{return json({error:'発注データを読み込めません。'},400)}
 if(!accessCodeValid(data?.accessCode,process.env.ORDER_EMAIL_ACCESS_CODE))return json({error:'送信用アクセスコードを確認してください。'},401);
 let order;try{order=validateEmailOrder(data.order)}catch(e){return json({error:e.message},400)}
 const id=await sendOrderEmail(order,process.env);return json({id,status:'accepted'});
 }catch{return json({error:'送信結果を確認できません。注文は保存済みです。同じ注文から再試行してください。'},502)}
}
