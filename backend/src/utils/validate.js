const { fail } = require('./http');

function text(value, label, min = 1, max = 200) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
    fail(400, `${label} phải có ${min}–${max} ký tự`);
  }
  return value.trim();
}

function number(value, label, min = 0, max = 1e12) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    fail(400, `${label} phải là số từ ${min} đến ${max}`);
  }
  return value;
}

function integer(value, label, min = 0, max = 1e9) {
  number(value, label, min, max);
  if (!Number.isSafeInteger(value)) fail(400, `${label} phải là số nguyên`);
  return value;
}

function code(value, label = 'Mã') {
  const s = text(value, label, 2, 40).toUpperCase();
  if (!/^[A-Z0-9_-]+$/.test(s)) fail(400, `${label} chỉ gồm chữ không dấu, số, _ hoặc -`);
  return s;
}

function email(value) {
  const e = text(value, 'Email', 5, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) fail(400, 'Email không hợp lệ');
  return e;
}

function items(value, withPrice = false) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    fail(400, 'Phiếu phải có 1–100 sản phẩm');
  }
  const seen = new Set();
  return value.map((item) => {
    if (!item || typeof item !== 'object') fail(400, 'Dòng hàng không hợp lệ');
    const product = objectId(item.product, 'Sản phẩm');
    if (seen.has(product)) fail(400, 'Một sản phẩm không được lặp trong cùng phiếu');
    seen.add(product);
    const quantity = integer(item.quantity, 'Số lượng', 1, 1000000);
    if (withPrice) return { product, quantity, costPrice: number(item.costPrice, 'Giá vốn', 0, 1e12) };
    return { product, quantity };
  });
}

function objectId(value, label = 'ID') {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) fail(400, `${label} không hợp lệ`);
  return value;
}

function optionalObjectId(value, label) {
  return value === null || value === '' || value === undefined ? null : objectId(value, label);
}

function oneOf(value, options, label) {
  if (!options.includes(value)) fail(400, `${label} không hợp lệ`);
  return value;
}

function url(value, label='URL') {
  if (!value) return '';
  const s = text(value, label, 1, 800);
  try { const p = new URL(s); if (!['http:', 'https:'].includes(p.protocol)) throw new Error(); }
  catch { fail(400, `${label} phải là địa chỉ HTTP hoặc HTTPS`); }
  return s;
}

module.exports = { text, number, integer, code, email, items, objectId, optionalObjectId, oneOf, url };
