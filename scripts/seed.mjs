import {writeFileSync} from 'node:fs';
import {stores,products} from '../lib/catalog.mjs';
const quote=s=>`'${s.replaceAll("'","''")}'`;
writeFileSync(new URL('../supabase/seed.sql',import.meta.url),'-- Fictional sample data only; local review artifact.\nbegin;\ninsert into yil_sample.stores(id,name) values\n'+stores.map(s=>`(${quote(s.id)},${quote(s.name)})`).join(',\n')+'\non conflict do nothing;\ninsert into yil_sample.products(id,name,category,unit,price) values\n'+products.map(p=>`(${quote(p.id)},${quote(p.name)},${quote(p.category)},${quote(p.unit)},${p.price})`).join(',\n')+'\non conflict do nothing;\ncommit;\n');
