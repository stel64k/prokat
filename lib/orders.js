const db = require('../db');
const { round, unitRateCost, unitRates } = require('./pricing');

const localNow = () => db.now();

function setting(key, def) {
  const r = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return r ? r.value : def;
}

const stmtLineUnits = db.prepare(`
  SELECT u.*, i.barcode, i.category_id, i.brand, i.model, i.size, i.cond, c.name AS cat_name
  FROM order_units u
  LEFT JOIN items i ON u.item_id = i.id
  LEFT JOIN categories c ON c.id = i.category_id
  WHERE u.order_item_id = ?
  ORDER BY COALESCE(u.kit_set, 999999), u.id
`);

function lineUnits(oiId) {
  return stmtLineUnits.all(oiId);
}

function paymentTotalsFromRows(payments) {
  const dep = payments.filter((x) => x.type === 'deposit').reduce((s, x) => s + x.amount, 0);
  const paid = payments.filter((x) => x.type === 'payment').reduce((s, x) => s + x.amount, 0);
  const refunded = payments.filter((x) => x.type === 'refund').reduce((s, x) => s + x.amount, 0);
  return { deposit: dep, paid, refunded };
}

function computeOrderFinancials(order, items, paymentTotals) {
  let estimatedTotal = 0;
  let finalTotal = 0;
  let actualSum = 0;
  let lateFee = 0;
  const nowMs = new Date(localNow()).getTime();
  const baseEnd = order.planned_end ? new Date(order.planned_end).getTime() : nowMs;
  const graceEnabled = order.return_grace_enabled_snapshot == null
    ? setting('return_grace_enabled', '1') === '1'
    : Number(order.return_grace_enabled_snapshot) === 1;
  const graceCutoff = new Date(baseEnd);
  if (graceEnabled && order.planned_end && Number.isFinite(baseEnd)) graceCutoff.setHours(23, 59, 59, 999);
  const graceCutoffMs = graceCutoff.getTime();

  const allUnits = [];
  items.forEach((oi) => oi.units.forEach((u) => allUnits.push(u)));

  const fallbackRates = unitRates(allUnits);
  const perUnitRate = new Map();
  allUnits.forEach((u) => {
    let snapshot = null;
    try { snapshot = u.rate_snapshot ? JSON.parse(u.rate_snapshot) : null; } catch { snapshot = null; }
    perUnitRate.set(u.id, snapshot || fallbackRates.get(u.id) || {});
  });

  items.forEach((oi) => {
    let lineEst = 0;
    let lineFinal = 0;
    if (oi.kind === 'service') {
      lineEst = oi.unit_price * oi.qty;
      lineFinal = lineEst;
    } else {
      oi.units.forEach((u) => {
        const rate = perUnitRate.get(u.id) || {};
        const endMs = u.return_time ? new Date(u.return_time).getTime() : nowMs;
        lineEst += unitRateCost(rate, order.started_at, isNaN(baseEnd) ? nowMs : baseEnd);
        const withinGrace = order.planned_end && graceEnabled && endMs > baseEnd && endMs <= graceCutoffMs;
        const billableEndMs = withinGrace ? baseEnd : endMs;
        lineFinal += unitRateCost(rate, order.started_at, billableEndMs);
        if (u.return_time && order.planned_end && endMs > baseEnd) {
          const overtimeMs = endMs - (graceEnabled ? graceCutoffMs : baseEnd);
          const extraDays = overtimeMs > 0 ? Math.ceil(overtimeMs / 86400000) : 0;
          const lateRate = order.late_fee_snapshot == null
            ? Number(setting('late_fee_per_day', '0')) || 0
            : Number(order.late_fee_snapshot) || 0;
          lateFee += extraDays * lateRate;
        }
      });
    }
    oi.est_cost = round(lineEst);
    oi.cost = round(order.status === 'active' ? lineEst : lineFinal);
    estimatedTotal += lineEst;
    actualSum += lineFinal;
  });

  const actualTotal = round(actualSum + lateFee);
  if (order.status === 'active') finalTotal = estimatedTotal;
  else finalTotal = actualTotal;

  const { deposit: dep, paid, refunded } = paymentTotals;
  const received = dep + paid;
  const netReceived = received - refunded;
  let toCharge = 0;
  let toRefund = 0;
  if (order.status === 'returned' || order.status === 'canceled') {
    const diff = round(finalTotal - netReceived);
    if (diff > 0) toCharge = diff;
    else toRefund = round(-diff);
  } else {
    toCharge = round(Math.max(0, finalTotal - netReceived));
  }
  let actualCharge = 0;
  let actualRefund = 0;
  const adiff = round(actualTotal - netReceived);
  if (adiff > 0) actualCharge = adiff;
  else actualRefund = round(-adiff);

  return {
    estimated_total: round(estimatedTotal),
    final_total: round(finalTotal),
    actual_total: actualTotal,
    late_fee: round(lateFee),
    deposit: dep,
    paid,
    refunded,
    to_charge: round(toCharge),
    to_refund: round(toRefund),
    actual_to_charge: round(actualCharge),
    actual_to_refund: round(actualRefund)
  };
}

function orderData(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return null;
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(order.client_id);
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY sort, id').all(orderId);
  items.forEach((oi) => { oi.units = lineUnits(oi.id); });
  const payments = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id').all(orderId);
  const fin = computeOrderFinancials(order, items, paymentTotalsFromRows(payments));
  return { ...order, client, items, payments, ...fin };
}

function enrichOrderListRows(rows) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const ph = ids.map(() => '?').join(',');

  const items = db.prepare(`SELECT * FROM order_items WHERE order_id IN (${ph}) ORDER BY sort, id`).all(...ids);
  const unitRows = db.prepare(`
    SELECT u.*, i.barcode, i.category_id, i.brand, i.model, i.size, i.cond, c.name AS cat_name, oi.order_id, oi.id AS order_item_id
    FROM order_units u
    JOIN order_items oi ON oi.id = u.order_item_id
    LEFT JOIN items i ON u.item_id = i.id
    LEFT JOIN categories c ON c.id = i.category_id
    WHERE oi.order_id IN (${ph})
    ORDER BY COALESCE(u.kit_set, 999999), u.id
  `).all(...ids);

  const unitsByItem = new Map();
  unitRows.forEach((u) => {
    const list = unitsByItem.get(u.order_item_id) || [];
    const { order_item_id, order_id, ...unit } = u;
    list.push(unit);
    unitsByItem.set(u.order_item_id, list);
  });

  const itemsByOrder = new Map();
  items.forEach((oi) => {
    oi.units = unitsByItem.get(oi.id) || [];
    const list = itemsByOrder.get(oi.order_id) || [];
    list.push(oi);
    itemsByOrder.set(oi.order_id, list);
  });

  const payRows = db.prepare(`
    SELECT order_id,
      COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) AS deposit,
      COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) AS paid,
      COALESCE(SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END), 0) AS refunded
    FROM payments WHERE order_id IN (${ph})
    GROUP BY order_id
  `).all(...ids);
  const payByOrder = new Map(payRows.map((p) => [p.order_id, p]));

  return rows.map((row) => {
    const orderItems = itemsByOrder.get(row.id) || [];
    const pay = payByOrder.get(row.id) || { deposit: 0, paid: 0, refunded: 0 };
    const fin = computeOrderFinancials(row, orderItems, pay);
    const netReceived = fin.deposit + fin.paid - fin.refunded;
    const due = round(fin.final_total - netReceived);
    return {
      ...row,
      order_total: fin.final_total,
      payment_status: due <= 0 ? 'paid' : netReceived > 0 ? 'partial' : 'unpaid'
    };
  });
}

function snapshotOrderRates(orderId) {
  const units = db.prepare(`
    SELECT u.id, i.category_id FROM order_units u
    JOIN order_items oi ON oi.id = u.order_item_id
    JOIN items i ON i.id = u.item_id
    WHERE oi.order_id = ?
  `).all(orderId);
  const rates = unitRates(units);
  const save = db.prepare('UPDATE order_units SET rate_snapshot = ? WHERE id = ?');
  units.forEach((u) => save.run(JSON.stringify(rates.get(u.id) || {}), u.id));
  const saveKit = db.prepare('UPDATE order_units SET kit_set = ? WHERE id = ?');
  unitRates(units, (uId, setId) => saveKit.run(setId, uId));
  db.prepare('UPDATE orders SET late_fee_snapshot = ? WHERE id = ?')
    .run(Number(setting('late_fee_per_day', '0')) || 0, orderId);
}

function snapshotReturnGrace(orderId) {
  db.prepare(`
    UPDATE orders SET return_grace_enabled_snapshot = ?, return_grace_hours_snapshot = ? WHERE id = ?
  `).run(setting('return_grace_enabled', '1') === '1' ? 1 : 0, 0, orderId);
}

function runOrderMigrations() {
  if (setting('migration_order_snapshots_v1') === '1') return;
  db.prepare('SELECT id FROM orders WHERE late_fee_snapshot IS NULL').all()
    .forEach((order) => snapshotOrderRates(order.id));
  db.prepare(`
    UPDATE orders SET return_grace_enabled_snapshot = 0, return_grace_hours_snapshot = 0
    WHERE return_grace_enabled_snapshot IS NULL OR return_grace_hours_snapshot IS NULL
  `).run();
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('migration_order_snapshots_v1', '1')").run();
}

function dashboardStats() {
  const stock = db.prepare("SELECT COUNT(*) n FROM items WHERE status = 'in_stock'").get().n;
  const rented = db.prepare("SELECT COUNT(*) n FROM items WHERE status = 'rented'").get().n;
  const service = db.prepare("SELECT COUNT(*) n FROM items WHERE status = 'service'").get().n;
  const activeOrders = db.prepare("SELECT COUNT(*) n FROM orders WHERE status = 'active'").get().n;
  const now = localNow();
  const overdue = db.prepare(`
    SELECT COUNT(*) n FROM orders
    WHERE status = 'active' AND planned_end IS NOT NULL AND planned_end < ?
  `).get(now).n;
  const today = now.slice(0, 10);
  const incomeToday = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN type IN ('deposit','payment') THEN amount ELSE -amount END), 0) AS net
    FROM payments WHERE date(created_at) = date(?)
  `).get(today).net;
  return {
    stock,
    rented,
    service,
    active_orders: activeOrders,
    overdue_orders: overdue,
    income_today: round(Number(incomeToday) || 0)
  };
}

module.exports = {
  localNow,
  setting,
  lineUnits,
  orderData,
  enrichOrderListRows,
  snapshotOrderRates,
  snapshotReturnGrace,
  runOrderMigrations,
  dashboardStats,
  paymentTotalsFromRows,
  computeOrderFinancials
};
