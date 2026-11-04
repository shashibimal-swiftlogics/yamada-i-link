import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProfile } from '../lib/shop-profile.mjs';

const png = 'data:image/png;base64,iVBORw0KGgo=';

test('valid profile is accepted and trimmed', () => {
  const r = validateProfile({ displayName: '  青空の店  ', contactName: '担当 太郎', phone: '03-1234-5678', imageDataUrl: png });
  assert.equal(r.ok, true);
  assert.equal(r.value.displayName, '青空の店');
});

test('display name is limited to 40 characters (Japanese characters counted once each)', () => {
  assert.equal(validateProfile({ displayName: 'あ'.repeat(40) }).ok, true);
  assert.equal(validateProfile({ displayName: 'あ'.repeat(41) }).ok, false);
});

test('phone must be digits, hyphens or brackets', () => {
  assert.equal(validateProfile({ phone: '03-1234-5678' }).ok, true);
  assert.equal(validateProfile({ phone: 'call me now' }).ok, false);
  assert.equal(validateProfile({ phone: '12' }).ok, false);
});

test('image must be PNG, JPEG or WebP data and not too large', () => {
  assert.equal(validateProfile({ imageDataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' }).ok, false);
  assert.equal(validateProfile({ imageDataUrl: 'javascript:alert(1)' }).ok, false);
  assert.equal(validateProfile({ imageDataUrl: `data:image/jpeg;base64,${'A'.repeat(400000)}` }).ok, false);
  assert.equal(validateProfile({ imageDataUrl: '' }).ok, true);
});
