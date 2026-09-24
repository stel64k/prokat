const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'prokat.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pricings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('kit','category','service')),
  category_id INTEGER REFERENCES categories(id),
  kit_items TEXT,
  price_hour REAL NOT NULL DEFAULT 0,
  price_day REAL NOT NULL DEFAULT 0,
  price_week REAL NOT NULL DEFAULT 0,
  price_season REAL NOT NULL DEFAULT 0,
  price_flat REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  barcode TEXT NOT NULL UNIQUE,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  brand TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'in_stock' CHECK(status IN ('in_stock','rented','service','retired')),
  cond TEXT NOT NULL DEFAULT 'Хорошее',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  retired_at TEXT
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  doc TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER REFERENCES clients(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','returned','canceled')),
  started_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  planned_end TEXT,
  ended_at TEXT,
  deposit REAL NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  pricing_id INTEGER REFERENCES pricings(id),
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('kit','category','service')),
  qty INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  item_pin INTEGER,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS order_units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_item_id INTEGER NOT NULL REFERENCES order_items(id),
  item_id INTEGER REFERENCES items(id),
  return_time TEXT,
  condition_ok INTEGER,
  condition_note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  amount REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('deposit','payment','refund')),
  method TEXT NOT NULL DEFAULT 'cash' CHECK(method IN ('cash','card')),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS inventory_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  ended_at TEXT,
  note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS inventory_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES inventory_sessions(id),
  item_id INTEGER NOT NULL REFERENCES items(id),
  scanned_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);
`);

const now = () => db.prepare("SELECT datetime('now','localtime') AS t").get().t;

function seed() {
  const catCount = db.prepare('SELECT COUNT(*) c FROM categories').get().c;
  if (catCount > 0) return;

  const cats = ['Лыжи', 'Ботинки лыжные', 'Палки', 'Сноуборд', 'Ботинки сноубордические', 'Шлем', 'Маска'];
  const insCat = db.prepare('INSERT INTO categories (name, sort) VALUES (?, ?)');
  const catIds = {};
  cats.forEach((c, i) => {
    const r = insCat.run(c, i + 1);
    catIds[c] = r.lastInsertRowid;
  });

  const insP = db.prepare(`
    INSERT INTO pricings (name, kind, category_id, kit_items, price_hour, price_day, price_week, price_season, price_flat, active, sort)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  insP.run('Комплект горнолыжный', 'kit', null,
    JSON.stringify([
      { category_id: catIds['Лыжи'], qty: 1 },
      { category_id: catIds['Ботинки лыжные'], qty: 1 },
      { category_id: catIds['Палки'], qty: 1, optional: true }
    ]), 0, 600, 0, 0, 0, 1);
  insP.run('Комплект сноуборд', 'kit', null,
    JSON.stringify([
      { category_id: catIds['Сноуборд'], qty: 1 },
      { category_id: catIds['Ботинки сноубордические'], qty: 1 }
    ]), 0, 650, 0, 0, 0, 2);

  let sort = 10;
  for (const c of cats) {
    insP.run(c, 'category', catIds[c], null, 100, 250, 0, 0, 0, sort);
    sort += 10;
  }

  insP.run('Страховка (1 день)', 'service', null, null, 0, 0, 0, 0, 50, 100);
  insP.run('Заточка кантов', 'service', null, null, 0, 0, 0, 0, 200, 110);
  insP.run('Настройка креплений', 'service', null, null, 0, 0, 0, 0, 150, 120);

  const insItem = db.prepare(`
    INSERT INTO items (barcode, category_id, brand, model, size, status, cond)
    VALUES (?, ?, ?, ?, ?, 'in_stock', 'Хорошее')
  `);
  const demoModels = {
    'Лыжи': ['Atomic Redster', 'Rossignol Hero', 'Fischer RC4'],
    'Ботинки лыжные': ['Salomon S/Pro', 'Head Edge'],
    'Палки': ['Leki Pure', 'Komperdell'],
    'Сноуборд': ['Burton Custom', 'Ride Machete'],
    'Ботинки сноубордические': ['DC Judge', 'Burton Imperial'],
    'Шлем': ['POC Obex', 'Salomon Icon'],
    'Маска': ['Dragon Rogue', 'Oakley Line']
  };
  const skiSizes = ['150', '155', '160', '165', '170', '175'];
  const barcodes = {};
  let seq = 0;
  for (const c of cats) {
    barcodes[c] = [];
  }
  for (const c of cats) {
    const models = demoModels[c] || ['Стандарт'];
    const count = c === 'Лыжи' ? 6 : 3;
    for (let n = 0; n < count; n++) {
      seq += 1;
      const barcode = 'P' + String(seq).padStart(4, '0');
      insItem.run(barcode, catIds[c], c === 'Лыжи' || c === 'Сноуборд' ? models[n % models.length] : models[0],
        c, c === 'Лыжи' ? skiSizes[n] : c.indexOf('Ботинки') === 0 ? String(26 + n) : 'free');
      barcodes[c].push(barcode);
    }
  }

  const insSettings = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const defaults = {
    business_name: 'Прокат',
    currency: 'грн',
    deposit_default: '0',
    late_fee_per_day: '0',
    contractor: '',
    phone: ''
  };
  for (const k in defaults) insSettings.run(k, defaults[k]);

  const insClient = db.prepare('INSERT INTO clients (name, phone, doc, notes) VALUES (?, ?, ?, ?)');
  const demoClients = [
    ['Иванов Иван', '+380671234567', 'Паспорт МК 123456', 'Постоянный клиент, сезон'],
    ['Петренко Ольга', '+380501112233', 'Паспорт КТ 654321', 'Предпочитает сноуборд'],
    ['Сидоренко Максим', '+380931256743', 'Паспорт АЕ 987654', ''],
    ['Коваленко Анна', '+380662358719', 'Паспорт ВМ 112233', 'Семейный прокат'],
    ['Романенко Дмитрий', '+380976543210', 'Паспорт КГ 445566', 'Негарантийный случай, внимательно при приёмке'],
    ['Мельник Ірина', '+380689111777', 'Паспорт ІВ 778899', ''],
    ['Шевчук Андрій', '+380500334455', 'Паспорт КН 990011', 'Берёт комплект горнолыжный']
  ];
  demoClients.forEach((c) => insClient.run(c[0], c[1], c[2], c[3]));
}

seed();

module.exports = db;
module.exports.now = now;