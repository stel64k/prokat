const crypto = require('crypto');
const db = require('../db');

module.exports = function registerAuth(app, ctx) {
  const {
    publicUser, passwordValid, normalizedUsername, hashPassword, verifyPassword,
    sessionToken, sessionUser, issueSession, clearSessionCookie, requireAdmin, loginAttempts
  } = ctx.auth;

  app.get('/api/auth/status', (req, res) => {
    const initialized = db.prepare('SELECT 1 FROM users LIMIT 1').get() != null;
    const user = initialized ? sessionUser(req) : null;
    res.json({ initialized, user: user ? publicUser(user) : null });
  });

  app.post('/api/auth/setup', async (req, res) => {
    if (db.prepare('SELECT 1 FROM users LIMIT 1').get()) return res.status(409).json({ error: 'Администратор уже создан' });
    const username = normalizedUsername(req.body.username);
    const password = req.body.password;
    if (!username) return res.status(400).json({ error: 'Логин: 3–32 символа, буквы, цифры, точка, дефис или подчёркивание' });
    if (!passwordValid(password)) return res.status(400).json({ error: 'Пароль должен содержать от 8 до 128 символов' });
    try {
      const passwordHash = await hashPassword(password);
      const create = db.transaction(() => {
        if (db.prepare('SELECT 1 FROM users LIMIT 1').get()) throw new Error('Администратор уже создан');
        return db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')")
          .run(username, passwordHash).lastInsertRowid;
      });
      const userId = create();
      issueSession(res, userId);
      res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(userId)) });
    } catch (e) {
      res.status(e.message === 'Администратор уже создан' ? 409 : 400).json({ error: e.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const username = normalizedUsername(req.body.username);
    const password = req.body.password;
    if (!username || typeof password !== 'string') return res.status(400).json({ error: 'Введите логин и пароль' });
    const key = `${req.ip}:${username}`;
    const now = Date.now();
    const attempts = loginAttempts.get(key);
    if (attempts && attempts.expires > now && attempts.count >= 10) {
      return res.status(429).json({ error: 'Слишком много попыток. Попробуйте позже' });
    }
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      const record = attempts && attempts.expires > now ? attempts : { count: 0, expires: now + 15 * 60 * 1000 };
      record.count++;
      loginAttempts.set(key, record);
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    loginAttempts.delete(key);
    issueSession(res, user.id);
    res.json({ user: publicUser(user) });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = sessionToken(req);
    if (token) db.prepare('DELETE FROM user_sessions WHERE token_hash = ?')
      .run(crypto.createHash('sha256').update(token).digest('hex'));
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.post('/api/auth/change-password', async (req, res) => {
    const password = req.body.password;
    if (!passwordValid(password)) return res.status(400).json({ error: 'Пароль должен содержать от 8 до 128 символов' });
    const hash = await hashPassword(password);
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(hash, req.user.id);
    req.user.must_change_password = 0;
    res.json({ user: publicUser(req.user) });
  });

  app.get('/api/users', requireAdmin, (req, res) => {
    res.json(db.prepare('SELECT id, username, role, active, must_change_password, created_at FROM users ORDER BY id').all());
  });

  app.post('/api/users', requireAdmin, async (req, res) => {
    const username = normalizedUsername(req.body.username);
    const password = req.body.password;
    const role = req.body.role || 'worker';
    if (!username) return res.status(400).json({ error: 'Логин: 3–32 символа, буквы, цифры, точка, дефис или подчёркивание' });
    if (!passwordValid(password)) return res.status(400).json({ error: 'Пароль должен содержать от 8 до 128 символов' });
    if (!['admin', 'worker'].includes(role)) return res.status(400).json({ error: 'Неизвестная роль' });
    try {
      const hash = await hashPassword(password);
      const result = db.prepare('INSERT INTO users (username, password_hash, role, must_change_password) VALUES (?, ?, ?, 1)')
        .run(username, hash, role);
      res.json(db.prepare('SELECT id, username, role, active, must_change_password, created_at FROM users WHERE id = ?').get(result.lastInsertRowid));
    } catch (e) {
      res.status(400).json({ error: 'Не удалось создать пользователя. Возможно, логин занят' });
    }
  });

  app.patch('/api/users/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    if (req.body.active === false && user.id === req.user.id) return res.status(400).json({ error: 'Нельзя отключить собственную учётную запись' });
    if (req.body.role && !['admin', 'worker'].includes(req.body.role)) return res.status(400).json({ error: 'Неизвестная роль' });
    const nextRole = req.body.role || user.role;
    const nextActive = req.body.active === undefined ? Boolean(user.active) : Boolean(req.body.active);
    if (user.role === 'admin' && user.active && (nextRole !== 'admin' || !nextActive)) {
      const otherAdmins = db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'admin' AND active = 1 AND id != ?").get(id).n;
      if (!otherAdmins) return res.status(400).json({ error: 'В системе должен оставаться активный администратор' });
    }
    db.prepare('UPDATE users SET role = ?, active = ? WHERE id = ?').run(nextRole, nextActive ? 1 : 0, id);
    if (!nextActive) db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(id);
    res.json(db.prepare('SELECT id, username, role, active, must_change_password, created_at FROM users WHERE id = ?').get(id));
  });

  app.post('/api/users/:id/reset-password', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: 'Нельзя сбросить пароль текущего пользователя' });
    if (!db.prepare('SELECT id FROM users WHERE id = ?').get(id)) return res.status(404).json({ error: 'Пользователь не найден' });
    if (!passwordValid(req.body.password)) return res.status(400).json({ error: 'Пароль должен содержать от 8 до 128 символов' });
    const hash = await hashPassword(req.body.password);
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?').run(hash, id);
    db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(id);
    res.json({ ok: true });
  });
};