import test from 'node:test';
import assert from 'node:assert/strict';
import {stores,products,createOrder,total} from '../lib/catalog.mjs';
test('fixtures contain exactly five unique stores and 100 unique products',()=>{assert.equal(stores.length,5);assert.equal(new Set(stores.map(s=>s.id)).size,5);assert.equal(products.length,100);assert.equal(new Set(products.map(p=>p.id)).size,100)});
test('order captures price, store, quantities and trace ID',()=>{const o=createOrder('S001',{P001:2,P002:3},'テスト','test-id');assert.equal(o.total,1240);assert.equal(o.storeId,'S001');assert.equal(o.traceId,'G1-YIL-test-id');assert.equal(total(o.lines),1240)});
test('reject empty, unknown products/stores and invalid quantities',()=>{for(const cart of [{},{P999:1},{P001:0},{P001:-1},{P001:100},{P001:1.5},{P001:NaN},{P001:'2'}])assert.throws(()=>createOrder('S001',cart));assert.throws(()=>createOrder('S999',{P001:1}))});
test('order snapshot remains independent of cart changes and notes bounded',()=>{const cart={P001:2};const o=createOrder('S002',cart,'a'.repeat(300));cart.P001=7;assert.equal(o.lines[0].quantity,2);assert.equal(o.note.length,200)});
