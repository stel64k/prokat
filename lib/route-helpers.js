const db = require('../db');
const { setting } = require('./orders');

function setItemStatus(itemId, status) {
  db.prepare('UPDATE items SET status = ? WHERE id = ?').run(status, itemId);
}

function nextBarcode() {
  const r = db.prepare(`
    SELECT MAX(CAST(substr(barcode, 2) AS INTEGER)) AS m
    FROM items WHERE barcode GLOB 'P[0-9]*'
  `).get();
  const n = (r.m && r.m > 0 ? r.m : 0) + 1;
  return 'P' + String(n).padStart(4, '0');
}

function allocateUnits(oi, pricing) {
  if (oi.kind === 'service') return;
  const pinnedInOrder = db.prepare(`
    SELECT item_pin FROM order_items WHERE order_id = ? AND item_pin IS NOT NULL
  `).all(oi.order_id).map((r) => r.item_pin).filter((p) => p !== (oi.item_pin || null));
  const exclSql = pinnedInOrder.length ? pinnedInOrder.join(',') : '-1';
  const insUnit = db.prepare('INSERT INTO order_units (order_item_id, item_id) VALUES (?, ?)');
  let items;
  if (oi.item_pin) {
    const it = db.prepare("SELECT * FROM items WHERE id = ? AND status = 'in_stock'").get(oi.item_pin);
    if (!it) throw new Error('Конкретный предмет уже выдан или отсутствует');
    items = [it];
  } else {
    items = db.prepare(`
      SELECT * FROM items
      WHERE category_id = ? AND status = 'in_stock'
        AND id NOT IN (${exclSql})
      ORDER BY id LIMIT ${Math.max(oi.qty, 20)}
    `).all(pricing.category_id);
  }
  const avail = items.slice(0, oi.qty);
  if (avail.length < oi.qty) {
    const cat = db.prepare('SELECT name FROM categories WHERE id = ?').get(pricing.category_id);
    throw new Error('Недостаточно на складе: ' + (cat ? cat.name : '') + ' (нужно ' + oi.qty + ')');
  }
  avail.forEach((it) => {
    insUnit.run(oi.id, it.id);
    setItemStatus(it.id, 'rented');
  });
}

function insertPayment(orderId, amount, type, method) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error('Сумма платежа должна быть больше нуля');
  if (!['deposit', 'payment', 'refund'].includes(type)) throw new Error('Неизвестный тип платежа');
  if (!['cash', 'card'].includes(method)) throw new Error('Неизвестный способ оплаты');
  if (type === 'deposit' && setting('deposit_enabled', '1') !== '1') throw new Error('Залог отключён в настройках');
  if (type === 'refund') {
    const totals = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN type IN ('deposit','payment') THEN amount ELSE 0 END), 0) received,
        COALESCE(SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END), 0) refunded
      FROM payments WHERE order_id = ?
    `).get(orderId);
    if (value > totals.received - totals.refunded + 0.001) throw new Error('Возврат не может превышать полученную сумму');
  }
  db.prepare('INSERT INTO payments (order_id, amount, type, method) VALUES (?, ?, ?, ?)')
    .run(orderId, value, type, method);
}

module.exports = {
  setItemStatus,
  nextBarcode,
  allocateUnits,
  insertPayment
};