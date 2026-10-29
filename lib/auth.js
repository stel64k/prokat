const crypto = require('crypto');
const { promisify } = require('util');
const db = require('../db');

const scrypt = promisify(crypto.scrypt);
const SESSION_COOKIE = 'prokat_session';
const SESSION_TTL = 12 * 60 * 60 * 1000;
const loginAttempts = new Map();

function publicUser(user) {
  return { id: user.id, username: user.username, role: user.role, must_change_password: Boolean(user.must_change_password) };
}

function passwordValid(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

function normalizedUsername(value) {
  const username = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (username.length < 3 || username.length > 32 || !/^[\p{L}\p{N}_.-]+$/u.test(username)) return null;
  return username;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}

async function verifyPassword(password, encoded) {
  const [scheme, salt, storedHex] = String(encoded || '').split('$');
  if (scheme !== 'scrypt' || !salt || !storedHex) return false;
  const stored = Buffer.from(storedHex, 'hex');
  const supplied = await scrypt(password, salt, stored.length);
  return stored.length === supplied.length && crypto.timingSafeEqual(stored, supplied);
}

function sessionToken(req) {
  const cookies = String(req.headers.cookie || '').split(';');
  const entry = cookies.map((part) => part.trim()).find((part) => part.startsWith(SESSION_COOKIE + '='));
  try { return entry ? decodeURIComponent(entry.slice(SESSION_COOKIE.length + 1)) : ''; }
  catch { return ''; }
}

const stmtSessionUser = db.prepare(`
  SELECT u.id, u.username, u.role, u.must_change_password
  FROM user_sessions s JOIN users u ON u.id = s.user_id
  WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1
`);

function sessionUser(req) {
  const token = sessionToken(req);
  if (!token) return null;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return stmtSessionUser.get(tokenHash, Date.now()) || null;
}

function issueSession(res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  db.prepare('INSERT INTO user_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(tokenHash, userId, Date.now() + SESSION_TTL);
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(SESSION_TTL / 1000)}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Доступно только администратору' });
  next();
}

function requireAuth(req, res, next) {
  if (!db.prepare('SELECT 1 FROM users LIMIT 1').get()) return res.status(503).json({ error: 'Сначала создайте администратора' });
  const user = sessionUser(req);
  if (!user) return res.status(401).json({ error: 'Требуется вход' });
  req.user = user;
  if (user.must_change_password && !['/auth/change-password', '/auth/logout'].includes(req.path)) {
    return res.status(403).json({ error: 'Сначала смените временный пароль' });
  }
  next();
}

function purgeExpiredSessions() {
  db.prepare('DELETE FROM user_sessions WHERE expires_at <= ?').run(Date.now());
}

module.exports = {
  SESSION_COOKIE,
  publicUser,
  passwordValid,
  normalizedUsername,
  hashPassword,
  verifyPassword,
  sessionToken,
  sessionUser,
  issueSession,
  clearSessionCookie,
  requireAdmin,
  requireAuth,
  loginAttempts,
  purgeExpiredSessions
};
