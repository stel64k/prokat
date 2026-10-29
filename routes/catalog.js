const db = require('../db');
const bwipjs = require('bwip-js');

module.exports = function registerCatalog(app, ctx) {
  const { localNow, dashboardStats } = ctx.orders;
  const { nextBarcode, setItemStatus } = ctx.helpers;

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

  app.get('/api/dashboard', (req, res) => {
    res.json(dashboardStats());
  });

  app.get('/api/items', (req, res) => {
    const idList = String(req.query.ids || '').split(',').map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (idList.length) {
      const ph = idList.map(() => '?').join(',');
      return res.json(db.prepare(`
        SELECT i.*, c.name AS cat_name
        FROM items i LEFT JOIN categories c ON c.id = i.category_id
        WHERE i.id IN (${ph})
        ORDER BY i.id
      `).all(...idList));
    }
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
    const limit = req.query.limit ? Math.max(1, Math.min(500, parseInt(req.query.limit, 10) || 50)) : null;
    const limitSql = limit ? ` LIMIT ${limit}` : '';
    const rows = db.prepare(`
      SELECT i.*, c.name AS cat_name
      FROM items i LEFT JOIN categories c ON c.id = i.category_id
      ${where}
      ORDER BY c.sort, i.category_id, i.id${limitSql}
    `).all(params);
    res.json(rows);
  });

  app.get('/api/items/next-barcode', (req, res) => {
    res.json({ barcode: nextBarcode() });
  });

  app.get('/api/items/barcode/:code', (req, res) => {
    const row = db.prepare(`
      SELECT i.*, c.name AS cat_name
      FROM items i LEFT JOIN categories c ON c.id = i.category_id
      WHERE i.barcode = ?
    `).get(req.params.code || '');
    if (!row) return res.status(404).json({ error: 'Предмет не найден' });
    res.json(row);
  });

  app.post('/api/items', (req, res) => {
    const { category_id, brand, model, size, cond, notes, count, barcode, status } = req.body;
    const n = Math.max(1, Math.min(500, parseInt(count) || 1));
    if (!db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id)) {
      return res.status(400).json({ error: 'Категория не найдена' });
    }
    if (status && !['in_stock', 'service'].includes(status)) {
      return res.status(400).json({ error: 'Новый предмет можно добавить только на склад или в ремонт' });
    }
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
    const id = Number(req.params.id);
    const { category_id, brand, model, size, status, cond, notes } = req.body;
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    if (!item) return res.status(404).json({ error: 'Предмет не найден' });
    if (item.status === 'retired' && status) return res.status(409).json({ error: 'Списанный предмет нельзя вернуть в оборот через редактирование' });
    const activeUnit = db.prepare(`
      SELECT u.id FROM order_units u JOIN order_items oi ON oi.id = u.order_item_id
      JOIN orders o ON o.id = oi.order_id
      WHERE u.item_id = ? AND u.return_time IS NULL AND o.status = 'active' LIMIT 1
    `).get(id);
    if (activeUnit && (status || (category_id && Number(category_id) !== item.category_id))) {
      return res.status(409).json({ error: 'Нельзя менять статус или категорию предмета, пока он числится в активном заказе' });
    }
    if (status && !['in_stock', 'service'].includes(status)) {
      return res.status(400).json({ error: 'Статус «Выдан» меняется только через заказ; для списания используйте отдельное действие' });
    }
    if (category_id && !db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id)) {
      return res.status(400).json({ error: 'Категория не найдена' });
    }
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
    const item = db.prepare('SELECT id FROM items WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Предмет не найден' });
    const activeUnit = db.prepare(`
      SELECT u.id FROM order_units u JOIN order_items oi ON oi.id = u.order_item_id
      JOIN orders o ON o.id = oi.order_id
      WHERE u.item_id = ? AND u.return_time IS NULL AND o.status = 'active' LIMIT 1
    `).get(req.params.id);
    if (activeUnit) return res.status(409).json({ error: 'Нельзя списать предмет, пока он числится в активном заказе' });
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

  app.post('/api/categories', ctx.auth.requireAdmin, (req, res) => {
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

  app.post('/api/pricings', ctx.auth.requireAdmin, (req, res) => {
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

  app.put('/api/pricings/:id', ctx.auth.requireAdmin, (req, res) => {
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

  app.delete('/api/pricings/:id', ctx.auth.requireAdmin, (req, res) => {
    db.prepare('DELETE FROM pricings WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  app.get('/api/clients', (req, res) => {
    const { q } = req.query;
    const limit = Math.max(1, Math.min(500, parseInt(req.query.limit, 10) || 200));
    if (q) {
      res.json(db.prepare("SELECT * FROM clients WHERE name LIKE @q OR phone LIKE @q ORDER BY name LIMIT @limit")
        .all({ q: '%' + q + '%', limit }));
    } else {
      res.json(db.prepare('SELECT * FROM clients ORDER BY name LIMIT ?').all(limit));
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
};