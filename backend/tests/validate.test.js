const { test } = require('node:test');
const assert = require('node:assert/strict');
const v = require('../src/utils/validate');

test('SKU chuẩn hóa chữ hoa và không chấp nhận ký tự đặc biệt', () => {
  assert.equal(v.code('sku-demo_01'), 'SKU-DEMO_01');
  assert.throws(() => v.code('sku spaces'));
  assert.throws(() => v.code('a'));
});

test('số lượng hàng phải nguyên dương', () => {
  assert.equal(v.integer(1, 'Số lượng', 1), 1);
  assert.throws(() => v.integer(0, 'Số lượng', 1));
  assert.throws(() => v.integer(1.2, 'Số lượng', 1));
  assert.throws(() => v.integer(Infinity, 'Số lượng', 1));
  assert.throws(() => v.integer('20', 'Số lượng', 1));
});

test('phiếu không được có sản phẩm trùng lặp', () => {
  const id = '64b64c9a0c2d123456789abc';
  assert.deepEqual(v.items([{ product:id, quantity:2 }]), [{product:id,quantity:2}]);
  assert.throws(() => v.items([{product:id,quantity:1},{product:id,quantity:2}]));
  assert.throws(() => v.items([]));
  assert.throws(() => v.items([{product:id,quantity:-1}]));
});

test('phiếu nhập yêu cầu giá vốn hợp lệ', () => {
  const id = '64b64c9a0c2d123456789abc';
  assert.deepEqual(v.items([{product:id,quantity:4,costPrice:4500}],true), [{product:id,quantity:4,costPrice:4500}]);
  assert.throws(() => v.items([{product:id,quantity:4,costPrice:-10}],true));
});

test('định dạng email, liên kết và ObjectId', () => {
  assert.equal(v.email('  EXAMPLE@DEMO.LOCAL '), 'example@demo.local');
  assert.throws(() => v.email('not-an-email'));
  assert.equal(v.objectId('64b64c9a0c2d123456789abc'), '64b64c9a0c2d123456789abc');
  assert.throws(() => v.objectId('not-object-id'));
  assert.equal(v.url('https://example.org'), 'https://example.org');
  assert.throws(() => v.url('javascript:alert(1)'));
});
