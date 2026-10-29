const db = require('../db');

module.exports = function registerAdmin(app, ctx) {
  const { localNow } = ctx.orders;

  app.get('/api/inventory/sessions', (req, res) => {
    res.json(db.prepare('SELECT * FROM inventory_sessions ORDER BY id DESC LIMIT 50').all());
  });

  app.post('/api/inventory/sessions', (req, res) => {
    const { note } = req.body || {};
    const active = db.prepare('SELECT * FROM inventory_sessions WHERE ended_at IS NULL ORDER BY id DESC LIMIT 1').get();
    if (active) return res.status(409).json({ error: 'Уже есть незавершённая сессия инвентаризации', session: active });
    const create = db.transaction(() => {
      const r = db.prepare('INSERT INTO inventory_sessions (note) VALUES (?)').run(note || '');
      db.prepare(`
        INSERT INTO inventory_expected (session_id, item_id)
        SELECT ?, id FROM items WHERE status NOT IN ('rented', 'retired')
      `).run(r.lastInsertRowid);
      return db.prepare('SELECT * FROM inventory_sessions WHERE id = ?').get(r.lastInsertRowid);
    });
    res.json(create());
  });

  app.post('/api/inventory/sessions/:id/finish', (req, res) => {
    const session = db.prepare('SELECT * FROM inventory_sessions WHERE id = ?').get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Сессия не найдена' });
    if (session.ended_at) return res.status(409).json({ error: 'Сессия уже завершена' });
    db.prepare('UPDATE inventory_sessions SET ended_at = ? WHERE id = ?').run(localNow(), req.params.id);
    res.json({ ok: true });
  });

  app.post('/api/inventory/scan', (req, res) => {
    const { session_id, barcode } = req.body;
    const it = db.prepare('SELECT * FROM items WHERE barcode = ?').get(barcode || '');
    if (!it) return res.json({ found: false, error: 'Предмет не найден: ' + barcode });
    const session = db.prepare('SELECT ended_at FROM inventory_sessions WHERE id = ?').get(session_id);
    if (!session) return res.status(404).json({ found: false, error: 'Сессия не найдена' });
    if (session.ended_at) return res.status(409).json({ found: false, error: 'Сессия уже завершена' });
    if (!db.prepare('SELECT 1 FROM inventory_expected WHERE session_id = ? AND item_id = ?').get(session_id, it.id)) {
      return res.status(409).json({ found: false, error: 'Предмет не входит в список этой инвентаризации' });
    }
    if (db.prepare('SELECT 1 FROM inventory_scans WHERE session_id = ? AND item_id = ?').get(session_id, it.id)) {
      return res.status(409).json({ found: false, error: 'Предмет уже отсканирован' });
    }
    db.prepare('INSERT INTO inventory_scans (session_id, item_id) VALUES (?, ?)').run(session_id, it.id);
    res.json({ found: true, item: it });
  });

  app.get('/api/inventory/sessions/:id', (req, res) => {
    const session = db.prepare('SELECT * FROM inventory_sessions WHERE id = ?').get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Сессия не найдена' });
    const expected = db.prepare(`
      SELECT c.name cat_name, COUNT(i.id) total
      FROM inventory_expected e JOIN items i ON i.id = e.item_id
      JOIN categories c ON c.id = i.category_id
      WHERE e.session_id = ? GROUP BY c.name ORDER BY c.sort
    `).all(req.params.id);
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
      SELECT i.*, c.name cat_name FROM inventory_expected e
      JOIN items i ON i.id = e.item_id
      JOIN categories c ON c.id = i.category_id
      WHERE e.session_id = ?
        AND NOT EXISTS (SELECT 1 FROM inventory_scans s WHERE s.session_id = ? AND s.item_id = i.id)
      ORDER BY c.sort, i.id
    `).all(req.params.id, req.params.id);
    res.json({ session, expected, scannedRows, scannedCounts, missed });
  });

  app.get('/api/reports/summary', ctx.auth.requireAdmin, (req, res) => {
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

  app.get('/api/reports/utilization', ctx.auth.requireAdmin, (req, res) => {
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

  app.get('/api/reports/revenue', ctx.auth.requireAdmin, (req, res) => {
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

  app.post('/api/settings', ctx.auth.requireAdmin, (req, res) => {
    const ins = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const keys = [
      'business_name', 'currency', 'deposit_default', 'deposit_enabled', 'late_fee_per_day',
      'return_grace_enabled', 'contractor', 'phone', 'label_show_biz', 'label_show_site', 'label_site'
    ];
    for (const key of ['deposit_enabled', 'return_grace_enabled', 'label_show_biz', 'label_show_site']) {
      if (req.body[key] !== undefined && !['0', '1', 0, 1, false, true].includes(req.body[key])) {
        return res.status(400).json({ error: 'Некорректное значение настройки' });
      }
    }
    for (const key of ['deposit_default', 'late_fee_per_day']) {
      if (req.body[key] !== undefined && (!Number.isFinite(Number(req.body[key])) || Number(req.body[key]) < 0)) {
        return res.status(400).json({ error: 'Сумма в настройках должна быть неотрицательным числом' });
      }
    }
    keys.forEach((k) => {
      if (req.body[k] !== undefined) {
        const value = ['deposit_enabled', 'return_grace_enabled', 'label_show_biz', 'label_show_site'].includes(k)
          ? (req.body[k] === '1' || req.body[k] === 1 || req.body[k] === true ? '1' : '0')
          : String(req.body[k]);
        ins.run(k, value);
      }
    });
    res.json({ ok: true });
  });

  app.get('/api/backup', ctx.auth.requireAdmin, async (req, res) => {
    const path = require('path');
    const fs = require('fs/promises');
    const os = require('os');
    const crypto = require('crypto');
    const file = path.join(os.tmpdir(), `prokat-backup-${crypto.randomUUID()}.db`);
    try {
      await db.backup(file);
      res.download(file, 'prokat-backup-' + new Date().toISOString().slice(0, 10) + '.db', async (err) => {
        await fs.unlink(file).catch(() => {});
        if (err && !res.headersSent) res.status(500).json({ error: 'Не удалось передать резервную копию' });
      });
    } catch (e) {
      await fs.unlink(file).catch(() => {});
      res.status(500).json({ error: 'Не удалось создать резервную копию' });
    }
  });
};