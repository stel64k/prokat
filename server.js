const express = require('express');
const path = require('path');
const db = require('./db');
const bwipjs = require('bwip-js');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const round = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const localNow = () => db.now();

function setting(key, def) {
  const r = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return r ? r.value : def;
}

function hoursBetween(t1, t2) {
  const a = new Date(t1).getTime();
  const b = new Date(t2).getTime();
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.max(1, Math.ceil((b - a) / 3600000));
}

function rentalCost(p, start, end) {
  if (p.kind === 'service') return round(p.price_flat || 0);
  const h = hoursBetween(start, end);
  if (p.price_week && h >= 24 * 6) return round(Math.ceil(h / (24 * 7)) * p.price_week);
  if (h >= 24) return round(Math.ceil(h / 24) * p.price_day);
  if (p.price_hour) return round(h * p.price_hour);
  return round(p.price_day || 0);
}

function getPricing(id) {
  if (!id) return null;
  const p = db.prepare('SELECT * FROM pricings WHERE id = ?').get(id);
  if (!p) return null;
  if (p.kind === 'kit' && p.kit_items) p.kitItems = JSON.parse(p.kit_items);
  return p;
}

function lineUnits(oiId) {
  return db.prepare(`
    SELECT u.*, i.barcode, i.category_id, i.brand, i.model, i.size, i.cond, c.name AS cat_name
    FROM order_units u
    LEFT JOIN items i ON u.item_id = i.id
    LEFT JOIN categories c ON c.id = i.category_id
    WHERE u.order_item_id = ?
    ORDER BY u.id
  `).all(oiId);
}

function orderData(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return null;
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(order.client_id);
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY sort, id').all(orderId);
  let estimatedTotal = 0;
  let finalTotal = 0;
  let lateFee = 0;
  const nowMs = new Date(localNow()).getTime();

  items.forEach((oi) => {
    const p = getPricing(oi.pricing_id);
    const units = lineUnits(oi.id);
    let lineEst = 0;
    let lineFinal = 0;
    if (oi.kind === 'service') {
      lineEst = oi.unit_price * oi.qty;
      lineFinal = lineEst;
    } else if (p) {
      const baseEnd = order.planned_end ? new Date(order.planned_end).getTime() : nowMs;
      if (p.kind === 'kit') {
        const endOfLine = units.length
          ? Math.max.apply(null, units.map((u) => u.return_time ? new Date(u.return_time).getTime() : nowMs))
          : nowMs;
        lineEst = rentalCost(p, order.started_at, isNaN(baseEnd) ? nowMs : baseEnd);
        lineFinal = rentalCost(p, order.started_at, endOfLine);
        units.forEach((u) => {
          if (u.return_time && order.planned_end && new Date(u.return_time).getTime() > new Date(order.planned_end).getTime()) {
            const extraDays = Math.ceil((new Date(u.return_time).getTime() - new Date(order.planned_end).getTime()) / 86400000);
            const rate = Number(setting('late_fee_per_day', '0')) || 0;
            lateFee += extraDays * rate;
          }
        });
      } else {
        units.forEach((u) => {
          lineEst += rentalCost(p, order.started_at, isNaN(baseEnd) ? nowMs : baseEnd);
          const endMs = u.return_time ? new Date(u.return_time).getTime() : nowMs;
          lineFinal += rentalCost(p, order.started_at, endMs);
          if (u.return_time && order.planned_end && new Date(u.return_time).getTime() > new Date(order.planned_end).getTime()) {
            const extraDays = Math.ceil((new Date(u.return_time).getTime() - new Date(order.planned_end).getTime()) / 86400000);
            const rate = Number(setting('late_fee_per_day', '0')) || 0;
            lateFee += extraDays * rate;
          }
        });
      }
    }
    oi.units = units;
    oi.est_cost = round(lineEst);
    oi.cost = round(order.status === 'active' ? lineEst : lineFinal);
    estimatedTotal += lineEst;
    finalTotal += lineFinal;
  });
  if (order.status === 'active') finalTotal = estimatedTotal;
  else finalTotal += lateFee;

  const payments = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id').all(orderId);
  const dep = payments.filter((x) => x.type === 'deposit').reduce((s, x) => s + x.amount, 0);
  const paid = payments.filter((x) => x.type === 'payment').reduce((s, x) => s + x.amount, 0);
  const refunded = payments.filter((x) => x.type === 'refund').reduce((s, x) => s + x.amount, 0);
  const received = dep + paid;
  let toCharge = 0;
  let toRefund = 0;
  if (order.status === 'returned' || order.status === 'canceled') {
    const diff = round(finalTotal - received + refunded);
    if (diff > 0) toCharge = diff;
    else toRefund = round(-diff);
  } else {
    toCharge = round(Math.max(0, finalTotal - received));
  }

  return {
    ...order,
    client,
    items,
    payments,
    estimated_total: round(estimatedTotal),
    final_total: round(finalTotal),
    late_fee: round(lateFee),
    deposit: dep,
    paid: paid,
    refunded: refunded,
    to_charge: round(toCharge),
    to_refund: round(toRefund)
  };
}

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

app.get('/api/bootstrap', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort, id').all();
  const pricings = db.prepare('SELECT * FROM pricings ORDER BY kind, sort, id').all();
  const settings = {};
  db.prepare('SELECT * FROM settings').all().forEach((r) => { settings[r.key] = r.value; });
  pricings.forEach((p) => {
    if (p.kind === 'kit' && p.kit_items) p.kitItems = JSON.parse(p.kit_items);
  });
  res.json({ categories, pricings, settings });
});

app.get('/api/items', (req, res) => {
  const { status, category, q } = req.query;
  const clauses = [];
  const params = {};
  if (status) { clauses.push('i.status = @status'); params.status = status; }
  if (category) { clauses.push('i.category_id = @category'); params.category = category; }
  if (q) {
    clauses.push('(i.barcode LIKE @q OR i.brand LIKE @q OR i.model LIKE @q OR i.size LIKE @q)');
    params.q = '%' + q + '%';
  }
  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  const rows = db.prepare(`
    SELECT i.*, c.name AS cat_name
    FROM items i LEFT JOIN categories c ON c.id = i.category_id
    ${where}
    ORDER BY c.sort, i.category_id, i.id
  `).all(params);
  res.json(rows);
});

app.get('/api/items/next-barcode', (req, res) => {
  res.json({ barcode: nextBarcode() });
});

app.post('/api/items', (req, res) => {
  const { category_id, brand, model, size, cond, notes, count, barcode, status } = req.body;
  const n = Math.max(1, Math.min(500, parseInt(count) || 1));
  const ins = db.prepare(`
    INSERT INTO items (barcode, category_id, brand, model, size, status, cond, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const st = status || 'in_stock';
  const created = [];
  const t = db.transaction(() => {
    for (let i = 0; i < n; i++) {
      const bc = (i === 0 && barcode) ? barcode : nextBarcode();
      const r = ins.run(bc, category_id, brand || '', model || '', size || '', st, cond || 'Хорошее', notes || '');
      created.push({ id: r.lastInsertRowid, barcode: bc });
    }
  });
  t();
  res.json({ created });
});

app.put('/api/items/:id', (req, res) => {
  const id = req.params.id;
  const { category_id, brand, model, size, status, cond, notes } = req.body;
  db.prepare(`
    UPDATE items SET category_id = COALESCE(?, category_id), brand = COALESCE(?, brand),
      model = COALESCE(?, model), size = COALESCE(?, size), status = COALESCE(?, status),
      cond = COALESCE(?, cond), notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(category_id ?? null, brand ?? null, model ?? null, size ?? null, status ?? null, cond ?? null, notes ?? null, id);
  const row = db.prepare(`
    SELECT i.*, c.name AS cat_name FROM items i LEFT JOIN categories c ON c.id = i.category_id WHERE i.id = ?
  `).get(id);
  res.json(row);
});

app.post('/api/items/:id/retire', (req, res) => {
  db.prepare('UPDATE items SET status = ?, retired_at = ? WHERE id = ?').run('retired', localNow(), req.params.id);
  const row = db.prepare(`
    SELECT i.*, c.name AS cat_name FROM items i LEFT JOIN categories c ON c.id = i.category_id WHERE i.id = ?
  `).get(req.params.id);
  res.json(row);
});

app.get('/api/items/:id/label', (req, res) => {
  const row = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  bwipjs.toBuffer({
    bcid: 'code128',
    text: row.barcode,
    scale: 3,
    height: 14,
    includetext: true,
    textxalign: 'center',
    backgroundcolor: 'FFFFFF'
  }, (err, png) => {
    if (err) return res.status(500).json({ error: err.message });
    res.type('png').send(png);
  });
});

app.get('/api/categories', (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY sort, id').all());
});

app.post('/api/categories', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Название обязательно' });
  const r = db.prepare('INSERT INTO categories (name, sort) VALUES (?, ?)').run(name.trim(), 999);
  res.json({ id: r.lastInsertRowid, name: name.trim(), sort: 999 });
});

app.get('/api/pricings', (req, res) => {
  const pricings = db.prepare('SELECT * FROM pricings ORDER BY kind, sort, id').all();
  pricings.forEach((p) => {
    if (p.kind === 'kit' && p.kit_items) p.kitItems = JSON.parse(p.kit_items);
  });
  res.json(pricings);
});

app.post('/api/pricings', (req, res) => {
  const b = req.body;
  const ins = db.prepare(`
    INSERT INTO pricings (name, kind, category_id, kit_items, price_hour, price_day, price_week, price_season, price_flat, active, sort)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);
  const r = ins.run(b.name, b.kind, b.category_id || null,
    b.kind === 'kit' && b.kit_items ? JSON.stringify(b.kit_items) : null,
    Number(b.price_hour) || 0, Number(b.price_day) || 0, Number(b.price_week) || 0,
    Number(b.price_season) || 0, Number(b.price_flat) || 0, Number(b.sort) || 0);
  res.json({ id: r.lastInsertRowid });
});

app.put('/api/pricings/:id', (req, res) => {
  const b = req.body;
  db.prepare(`
    UPDATE pricings SET name = ?, kind = ?, category_id = ?, kit_items = ?,
      price_hour = ?, price_day = ?, price_week = ?, price_season = ?, price_flat = ?, active = ?
    WHERE id = ?
  `).run(b.name, b.kind, b.category_id || null,
    b.kind === 'kit' && b.kit_items ? JSON.stringify(b.kit_items) : null,
    Number(b.price_hour) || 0, Number(b.price_day) || 0, Number(b.price_week) || 0,
    Number(b.price_season) || 0, Number(b.price_flat) || 0, b.active === false ? 0 : 1, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/pricings/:id', (req, res) => {
  db.prepare('DELETE FROM pricings WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/clients', (req, res) => {
  const { q } = req.query;
  if (q) {
    res.json(db.prepare("SELECT * FROM clients WHERE name LIKE @q OR phone LIKE @q ORDER BY name LIMIT 50")
      .all({ q: '%' + q + '%' }));
  } else {
    res.json(db.prepare('SELECT * FROM clients ORDER BY name').all());
  }
});

app.post('/api/clients', (req, res) => {
  const { name, phone, doc, notes } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Имя обязательно' });
  const r = db.prepare('INSERT INTO clients (name, phone, doc, notes) VALUES (?, ?, ?, ?)')
    .run(name.trim(), phone || '', doc || '', notes || '');
  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(r.lastInsertRowid));
});

app.put('/api/clients/:id', (req, res) => {
  const b = req.body;
  db.prepare('UPDATE clients SET name = ?, phone = ?, doc = ?, notes = ? WHERE id = ?')
    .run(b.name, b.phone || '', b.doc || '', b.notes || '', req.params.id);
  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id));
});

function allocateUnits(oi, pricing) {
  if (oi.kind === 'service') return;
  const pinnedInOrder = db.prepare(`
    SELECT item_pin FROM order_items WHERE order_id = ? AND item_pin IS NOT NULL
  `).all(oi.order_id).map((r) => r.item_pin).filter((p) => p !== (oi.item_pin || null));
  const need = [];
  if (oi.kind === 'kit') {
    (pricing.kitItems || []).forEach((k) => {
      need.push({ category_id: k.category_id, qty: k.qty });
    });
  } else {
    const pin = oi.item_pin;
    if (pin) {
      const it = db.prepare("SELECT * FROM items WHERE id = ? AND status = 'in_stock'").get(pin);
      if (!it) throw new Error('Конкретный предмет уже выдан или отсутствует');
      need.push({ category_id: pricing.category_id, qty: 1, pin: pin });
    } else {
      need.push({ category_id: pricing.category_id, qty: oi.qty });
    }
  }
  const insUnit = db.prepare('INSERT INTO order_units (order_item_id, item_id) VALUES (?, ?)');
  const pick = db.prepare(`
    SELECT * FROM items
    WHERE category_id = ? AND status = 'in_stock'
      AND id NOT IN (${pinnedInOrder.length ? pinnedInOrder.join(',') : '-1'})
    ORDER BY id LIMIT ?
  `);
  need.forEach((req) => {
    let items;
    if (req.pin) {
      items = [db.prepare("SELECT * FROM items WHERE id = ?").get(req.pin)];
    } else {
      items = pick.all(req.category_id, req.qty);
    }
    if (items.length < req.qty) {
      const cat = db.prepare('SELECT name FROM categories WHERE id = ?').get(req.category_id);
      throw new Error('Недостаточно на складе: ' + (cat ? cat.name : '') + ' (нужно ' + req.qty + ')');
    }
    items.slice(0, req.qty).forEach((it) => {
      insUnit.run(oi.id, it.id);
      setItemStatus(it.id, 'rented');
    });
  });
}

app.post('/api/orders', (req, res) => {
  const { client_id, deposit, planned_end, notes, lines } = req.body;
  if (!client_id) return res.status(400).json({ error: 'Выберите клиента' });
  if (!lines || !lines.length) return res.status(400).json({ error: 'Добавьте позиции' });
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(client_id);
  if (!client) return res.status(400).json({ error: 'Клиент не найден' });

  try {
    const t = db.transaction(() => {
      const orderId = db.prepare(`
        INSERT INTO orders (client_id, deposit, planned_end, notes) VALUES (?, ?, ?, ?)
      `).run(client_id, Number(deposit) || 0, planned_end || null, notes || '').lastInsertRowid;

      let sort = 0;
      for (const ln of lines) {
        const p = getPricing(ln.pricing_id);
        if (!p) throw new Error('Не найден тариф');
        const name = p.kind === 'service' ? p.name : p.name;
        const oiId = db.prepare(`
          INSERT INTO order_items (order_id, pricing_id, name, kind, qty, unit_price, item_pin, sort)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(orderId, p.id, name, p.kind, Math.max(1, parseInt(ln.qty) || 1),
          p.kind === 'service' ? p.price_flat : 0, ln.item_pin || null, sort).lastInsertRowid;
        const oi = db.prepare('SELECT * FROM order_items WHERE id = ?').get(oiId);
        allocateUnits(oi, p, {});
        sort++;
      }
      return orderId;
    });
    const orderId = t();
    res.json(orderData(orderId));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/orders', (req, res) => {
  const { status } = req.query;
  const rows = status
    ? db.prepare(`
      SELECT o.*, c.name AS client_name FROM orders o
      LEFT JOIN clients c ON c.id = o.client_id
      WHERE o.status = ? ORDER BY o.id DESC`).all(status)
    : db.prepare(`
      SELECT o.*, c.name AS client_name FROM orders o
      LEFT JOIN clients c ON c.id = o.client_id
      ORDER BY o.id DESC LIMIT 500`).all();
  res.json(rows);
});

app.get('/api/orders/active', (req, res) => {
  const rows = db.prepare(`
    SELECT o.*, c.name AS client_name
    FROM orders o LEFT JOIN clients c ON c.id = o.client_id
    WHERE o.status = 'active' ORDER BY o.id DESC
  `).all();
  const result = rows.map((o) => {
    const data = orderData(o.id);
    const unitsLeft = data.items.reduce((s, it) => s + it.units.filter((u) => !u.return_time).length, 0);
    return { id: o.id, client_name: o.client_name, started_at: o.started_at, planned_end: o.planned_end,
             units_left: unitsLeft, overdue: o.planned_end ? new Date(o.planned_end) < new Date(localNow()) : false };
  });
  res.json(result);
});

app.get('/api/orders/:id', (req, res) => {
  res.json(orderData(req.params.id));
});

app.post('/api/lookup-unit', (req, res) => {
  const { barcode } = req.body;
  const it = db.prepare('SELECT * FROM items WHERE barcode = ?').get(barcode || '');
  if (!it) return res.json({ found: false });
  const unit = db.prepare(`
    SELECT u.* FROM order_units u
    WHERE u.item_id = ? AND u.return_time IS NULL
    ORDER BY u.id DESC LIMIT 1
  `).get(it.id);
  if (!unit) return res.json({ found: false, reason: 'not_rented' });
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(db.prepare('SELECT order_id FROM order_items WHERE id = ?').get(unit.order_item_id).order_id);
  res.json({ found: true, unit_id: unit.id, order_id: order.id, item: it, order });
});

app.post('/api/orders/:id/return-unit', (req, res) => {
  const id = req.params.id;
  const { unit_id, condition_ok, condition_note } = req.body;
  const unit = db.prepare('SELECT * FROM order_units WHERE id = ?').get(unit_id);
  if (!unit) return res.status(404).json({ error: 'Единица не найдена' });
  db.prepare('UPDATE order_units SET return_time = ?, condition_ok = ?, condition_note = ? WHERE id = ?')
    .run(localNow(), condition_ok ? 1 : 0, condition_note || '', unit_id);
  const ok = condition_ok ? 1 : 0;
  if (unit.item_id) {
    setItemStatus(unit.item_id, ok ? 'in_stock' : 'service');
    if (!ok) {
      db.prepare('UPDATE items SET cond = ? WHERE id = ?').run('Требует ремонта', unit.item_id);
    }
  }
  res.json(orderData(id));
});

app.post('/api/orders/:id/payment', (req, res) => {
  const { amount, type, method } = req.body;
  db.prepare('INSERT INTO payments (order_id, amount, type, method) VALUES (?, ?, ?, ?)')
    .run(req.params.id, Number(amount) || 0, type, method === 'card' ? 'card' : 'cash');
  res.json(orderData(req.params.id));
});

app.post('/api/orders/:id/cancel', (req, res) => {
  const id = req.params.id;
  db.prepare('UPDATE orders SET status = ?, ended_at = ? WHERE id = ?').run('canceled', localNow(), id);
  const units = db.prepare(`
    SELECT u.id, u.item_id FROM order_units u
    JOIN order_items oi ON oi.id = u.order_item_id
    WHERE oi.order_id = ? AND u.return_time IS NULL
  `).all(id);
  units.forEach((u) => {
    db.prepare('UPDATE order_units SET return_time = ? WHERE id = ?').run(localNow(), u.id);
    if (u.item_id) setItemStatus(u.item_id, 'in_stock');
  });
  res.json(orderData(id));
});

app.post('/api/orders/:id/close', (req, res) => {
  const id = req.params.id;
  const { payments } = req.body || {};
  const t = db.transaction(() => {
    (payments || []).forEach((p) => {
      const amt = Number(p.amount) || 0;
      if (amt > 0) {
        db.prepare('INSERT INTO payments (order_id, amount, type, method) VALUES (?, ?, ?, ?)')
          .run(id, amt, p.type, p.method === 'card' ? 'card' : 'cash');
      }
    });
    const units = db.prepare(`
      SELECT u.id, u.item_id FROM order_units u
      JOIN order_items oi ON oi.id = u.order_item_id
      WHERE oi.order_id = ? AND u.return_time IS NULL
    `).all(id);
    units.forEach((u) => {
      db.prepare('UPDATE order_units SET return_time = ?, condition_ok = 1 WHERE id = ?').run(localNow(), u.id);
      if (u.item_id) setItemStatus(u.item_id, 'in_stock');
    });
    db.prepare('UPDATE orders SET status = ?, ended_at = ? WHERE id = ?').run('returned', localNow(), id);
  });
  t();
  res.json(orderData(id));
});

app.get('/api/inventory/sessions', (req, res) => {
  res.json(db.prepare('SELECT * FROM inventory_sessions ORDER BY id DESC LIMIT 50').all());
});

app.post('/api/inventory/sessions', (req, res) => {
  const { note } = req.body || {};
  const r = db.prepare('INSERT INTO inventory_sessions (note) VALUES (?)').run(note || '');
  res.json(db.prepare('SELECT * FROM inventory_sessions WHERE id = ?').get(r.lastInsertRowid));
});

app.post('/api/inventory/sessions/:id/finish', (req, res) => {
  db.prepare('UPDATE inventory_sessions SET ended_at = ? WHERE id = ?').run(localNow(), req.params.id);
  res.json({ ok: true });
});

app.post('/api/inventory/scan', (req, res) => {
  const { session_id, barcode } = req.body;
  const it = db.prepare('SELECT * FROM items WHERE barcode = ?').get(barcode || '');
  if (!it) return res.json({ found: false, error: 'Предмет не найден: ' + barcode });
  db.prepare('INSERT INTO inventory_scans (session_id, item_id) VALUES (?, ?)').run(session_id, it.id);
  res.json({ found: true, item: it });
});

app.get('/api/inventory/sessions/:id', (req, res) => {
  const session = db.prepare('SELECT * FROM inventory_sessions WHERE id = ?').get(req.params.id);
  const expected = db.prepare(`
    SELECT c.name cat_name, COUNT(i.id) total
    FROM items i JOIN categories c ON c.id = i.category_id
    WHERE i.status != 'retired'
    GROUP BY c.name ORDER BY c.sort
  `).all();
  const scannedRows = db.prepare(`
    SELECT s.id scan_id, s.scanned_at, i.*, c.name cat_name
    FROM inventory_scans s
    JOIN items i ON i.id = s.item_id
    JOIN categories c ON c.id = i.category_id
    WHERE s.session_id = ?
    ORDER BY s.scanned_at
  `).all(req.params.id);
  const scannedCounts = {};
  scannedRows.forEach((r) => { scannedCounts[r.item_id] = (scannedCounts[r.item_id] || 0) + 1; });
  const missed = db.prepare(`
    SELECT i.*, c.name cat_name FROM items i
    JOIN categories c ON c.id = i.category_id
    WHERE i.status != 'retired'
      AND NOT EXISTS (SELECT 1 FROM inventory_scans s WHERE s.session_id = ? AND s.item_id = i.id)
    ORDER BY c.sort, i.id
  `).all(req.params.id);
  res.json({ session, expected, scannedRows, scannedCounts, missed });
});

app.get('/api/reports/summary', (req, res) => {
  const { from, to } = req.query;
  const rows = db.prepare(`
    SELECT date(created_at) d, method,
      SUM(CASE WHEN type IN ('deposit','payment') THEN amount ELSE 0 END) income,
      SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END) refund,
      COUNT(*) cnt
    FROM payments
    WHERE date(created_at) BETWEEN date(@from) AND date(@to)
    GROUP BY date(created_at), method
    ORDER BY d
  `).all({ from: from || '2000-01-01', to: to || '2999-12-31' });
  res.json(rows);
});

app.get('/api/reports/utilization', (req, res) => {
  const { from, to } = req.query;
  const rows = db.prepare(`
    SELECT i.barcode, i.brand, i.model, i.size, c.name cat_name, COUNT(u.id) rentals
    FROM order_units u
    JOIN items i ON i.id = u.item_id
    JOIN categories c ON c.id = i.category_id
    JOIN order_items oi ON oi.id = u.order_item_id
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status = 'returned' AND date(o.started_at) BETWEEN date(@from) AND date(@to)
    GROUP BY i.id
    ORDER BY rentals DESC
    LIMIT 50
  `).all({ from: from || '2000-01-01', to: to || '2999-12-31' });
  res.json(rows);
});

app.get('/api/reports/revenue', (req, res) => {
  const { from, to } = req.query;
  const rows = db.prepare(`
    SELECT o.id, o.started_at, o.status, c.name client_name,
      o.deposit,
      (SELECT SUM(CASE WHEN p.type IN ('deposit','payment') THEN p.amount ELSE 0 END) FROM payments p WHERE p.order_id = o.id) received,
      (SELECT SUM(CASE WHEN p.type = 'refund' THEN p.amount ELSE 0 END) FROM payments p WHERE p.order_id = o.id) refunded
    FROM orders o LEFT JOIN clients c ON c.id = o.client_id
    WHERE date(o.started_at) BETWEEN date(@from) AND date(@to)
    ORDER BY o.id DESC
  `).all({ from: from || '2000-01-01', to: to || '2999-12-31' });
  res.json(rows);
});

app.get('/api/settings', (req, res) => {
  const settings = {};
  db.prepare('SELECT * FROM settings').all().forEach((r) => { settings[r.key] = r.value; });
  res.json(settings);
});

app.post('/api/settings', (req, res) => {
  const ins = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const keys = ['business_name', 'currency', 'deposit_default', 'late_fee_per_day', 'contractor', 'phone'];
  keys.forEach((k) => {
    if (req.body[k] !== undefined) ins.run(k, String(req.body[k]));
  });
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Прокат запущен: http://localhost:' + PORT);
});

app.get('/api/backup', (req, res) => {
  const file = path.join(__dirname, 'data', 'prokat.db');
  res.download(file, 'prokat-backup-' + new Date().toISOString().slice(0, 10) + '.db');
});