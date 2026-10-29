const db = require('../db');

module.exports = function registerOrders(app, ctx) {
  const { localNow, setting, orderData, enrichOrderListRows, snapshotOrderRates, snapshotReturnGrace } = ctx.orders;
  const { getPricing } = ctx.pricing;
  const { setItemStatus, allocateUnits, insertPayment } = ctx.helpers;

  app.post('/api/orders', (req, res) => {
    const { client_id, deposit, deposit_method, planned_end, notes, lines } = req.body;
    if (!client_id) return res.status(400).json({ error: 'Выберите клиента' });
    if (!lines || !lines.length) return res.status(400).json({ error: 'Добавьте позиции' });
    if (!planned_end) return res.status(400).json({ error: 'Укажите срок возврата' });
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(client_id);
    if (!client) return res.status(400).json({ error: 'Клиент не найден' });
    const requestedDeposit = deposit == null || deposit === '' ? 0 : Number(deposit);
    if (!Number.isFinite(requestedDeposit) || requestedDeposit < 0) {
      return res.status(400).json({ error: 'Залог должен быть неотрицательной суммой' });
    }
    const depositAmount = setting('deposit_enabled', '1') === '1' ? requestedDeposit : 0;
    const depositMethod = deposit_method || 'cash';
    if (depositAmount > 0 && !['cash', 'card'].includes(depositMethod)) {
      return res.status(400).json({ error: 'Неизвестный способ внесения залога' });
    }
    const returnTime = new Date(String(planned_end).replace(' ', 'T')).getTime();
    if (!Number.isFinite(returnTime) || returnTime <= Date.now()) {
      return res.status(400).json({ error: 'Срок возврата должен быть в будущем' });
    }

    try {
      const t = db.transaction(() => {
        const orderId = db.prepare(`
          INSERT INTO orders (client_id, deposit, planned_end, notes) VALUES (?, ?, ?, ?)
        `).run(client_id, depositAmount, planned_end || null, notes || '').lastInsertRowid;

        if (depositAmount > 0) {
          db.prepare("INSERT INTO payments (order_id, amount, type, method) VALUES (?, ?, 'deposit', ?)")
            .run(orderId, depositAmount, depositMethod);
        }

        let sort = 0;
        for (const ln of lines) {
          const p = getPricing(ln.pricing_id);
          if (!p) throw new Error('Не найден тариф');
          const qty = Number(ln.qty);
          if (!Number.isInteger(qty) || qty < 1 || qty > 500) throw new Error('Количество должно быть от 1 до 500');
          const name = p.kind === 'service' ? p.name : p.name;
          const oiId = db.prepare(`
            INSERT INTO order_items (order_id, pricing_id, name, kind, qty, unit_price, item_pin, sort)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(orderId, p.id, name, p.kind, qty,
            p.kind === 'service' ? p.price_flat : 0, ln.item_pin || null, sort).lastInsertRowid;
          const oi = db.prepare('SELECT * FROM order_items WHERE id = ?').get(oiId);
          allocateUnits(oi, p);
          sort++;
        }
        snapshotOrderRates(orderId);
        snapshotReturnGrace(orderId);
        return orderId;
      });
      const orderId = t();
      res.json(orderData(orderId));
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get('/api/orders', (req, res) => {
    const status = req.query.status || '';
    const query = String(req.query.q || '').trim();
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit) || 200));
    const offset = Math.max(0, parseInt(req.query.offset) || 0);
    const rows = db.prepare(`
      SELECT o.*, c.name AS client_name FROM orders o
      LEFT JOIN clients c ON c.id = o.client_id
      WHERE (@status = '' OR o.status = @status)
        AND (@query = '' OR CAST(o.id AS TEXT) LIKE @like OR c.name LIKE @like OR c.phone LIKE @like)
      ORDER BY o.id DESC LIMIT @limit OFFSET @offset
    `).all({ status, query, like: '%' + query + '%', limit, offset });
    res.json(enrichOrderListRows(rows));
  });

  app.get('/api/clients/:id/orders', (req, res) => {
    const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(req.params.id);
    if (!client) return res.status(404).json({ error: 'Клиент не найден' });
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const offset = Math.max(0, parseInt(req.query.offset) || 0);
    const rows = db.prepare(`
      SELECT * FROM orders WHERE client_id = ? ORDER BY id DESC LIMIT ? OFFSET ?
    `).all(req.params.id, limit, offset);
    res.json(enrichOrderListRows(rows));
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
      return { ...data, client_name: o.client_name, client_phone: data.client ? data.client.phone : '', units_left: unitsLeft,
               overdue: o.planned_end ? new Date(o.planned_end) < new Date(localNow()) : false };
    });
    res.json(result);
  });

  app.get('/api/orders/:id', (req, res) => {
    const order = orderData(req.params.id);
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    res.json(order);
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
    const id = Number(req.params.id);
    const { unit_id, condition_ok, condition_note } = req.body;
    const unit = db.prepare(`
      SELECT u.* FROM order_units u JOIN order_items oi ON oi.id = u.order_item_id
      WHERE u.id = ? AND oi.order_id = ?
    `).get(unit_id, id);
    if (!unit) return res.status(404).json({ error: 'Единица не найдена' });
    if (![0, 1, false, true].includes(condition_ok)) return res.status(400).json({ error: 'Укажите состояние предмета' });
    if (unit.return_time) return res.status(409).json({ error: 'Предмет уже принят' });
    const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(id);
    if (!order || order.status !== 'active') return res.status(409).json({ error: 'Заказ уже закрыт' });
    db.transaction(() => {
      db.prepare('UPDATE order_units SET return_time = ?, condition_ok = ?, condition_note = ? WHERE id = ? AND return_time IS NULL')
        .run(localNow(), condition_ok ? 1 : 0, condition_note || '', unit_id);
      const ok = condition_ok ? 1 : 0;
      if (unit.item_id) {
        setItemStatus(unit.item_id, ok ? 'in_stock' : 'service');
        if (!ok) db.prepare('UPDATE items SET cond = ? WHERE id = ?').run('Требует ремонта', unit.item_id);
      }
    })();
    res.json(orderData(id));
  });

  app.post('/api/orders/:id/payment', (req, res) => {
    const { amount, type, method } = req.body;
    const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    if (order.status === 'canceled') return res.status(409).json({ error: 'Нельзя проводить платежи по отменённому заказу' });
    try { insertPayment(req.params.id, amount, type, method); }
    catch (e) { return res.status(400).json({ error: e.message }); }
    res.json(orderData(req.params.id));
  });

  app.post('/api/orders/:id/cancel', (req, res) => {
    const id = req.params.id;
    const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(id);
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    if (order.status !== 'active') return res.status(409).json({ error: 'Можно отменить только активный заказ' });
    db.transaction(() => {
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
    })();
    res.json(orderData(id));
  });

  app.post('/api/orders/:id/close', (req, res) => {
    const id = req.params.id;
    const { payments } = req.body || {};
    if (payments !== undefined && !Array.isArray(payments)) return res.status(400).json({ error: 'Неверный список платежей' });
    const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(id);
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    if (order.status !== 'active') return res.status(409).json({ error: 'Заказ уже закрыт' });
    const t = db.transaction(() => {
      (payments || []).forEach((p) => {
        insertPayment(id, p.amount, p.type, p.method);
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
    try { t(); }
    catch (e) { return res.status(400).json({ error: e.message }); }
    res.json(orderData(id));
  });
};