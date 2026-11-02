export const stores = ['青空中央店','ひだまり東店','さくら南店','みどり西店','ほしぞら北店'].map((name,i)=>({id:`S00${i+1}`,name:`${name}（架空）`}));
export const categories = ['麺類','だし・調味料','具材','野菜','備品'];
const names = [['うどん','細うどん','そば','中華麺','きしめん'],['かけだし','つけだし','醤油だれ','味噌だれ','カレーだし'],['油揚げ','かき揚げ','海老天','とろろ','温泉卵'],['ねぎ','ほうれん草','玉ねぎ','にんじん','白菜'],['箸','おしぼり','持帰り容器','紙ナプキン','手袋']];
export const products = Array.from({length:100},(_,i)=>({id:`P${String(i+1).padStart(3,'0')}`,name:`${names[Math.floor(i/20)][i%5]} ${['標準','小分け','業務用','徳用'][Math.floor(i%20/5)]}`,category:categories[Math.floor(i/20)],unit:Math.floor(i/20)===4?'1箱':'1パック',price:200+(i%17)*80}));
export function linesFromCart(cart){return Object.entries(cart).map(([id,quantity])=>{const p=products.find(p=>p.id===id);if(!p||!Number.isInteger(quantity)||quantity<1||quantity>99)throw new Error('数量は1〜99で指定してください');return {...p,quantity}})}
export function total(lines){return lines.reduce((sum,p)=>sum+p.price*p.quantity,0)}
export function createOrder(storeId,cart,note='',id=crypto.randomUUID()){if(!stores.some(s=>s.id===storeId))throw new Error('店舗を選択してください');const lines=linesFromCart(cart);if(!lines.length)throw new Error('商品を追加してください');return {id,traceId:`G1-YIL-${id}`,storeId,lines,total:total(lines),note:note.slice(0,200),createdAt:new Date().toISOString(),status:'受付済み'}}
