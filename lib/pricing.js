const db = require('../db');

const round = (x) => Math.round((x + Number.EPSILON) * 100) / 100;

function hoursBetween(t1, t2) {
  const a = new Date(t1).getTime();
  const b = new Date(t2).getTime();
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.max(1, Math.ceil((b - a) / 3600000));
}

function rateMul(p, h) {
  if (p && p.price_week && h >= 24 * 6) return Math.ceil(h / (24 * 7));
  if (p && h >= 24) return Math.ceil(h / 24);
  if (p && p.price_hour) return h;
  return 1;
}

function ratePrice(p, h) {
  if (p && p.price_week && h >= 24 * 6) return p.price_week;
  if (p && h >= 24) return p.price_day;
  if (p && p.price_hour) return p.price_hour;
  return (p && p.price_day) || 0;
}

function unitRateCost(p, start, end) {
  const h = hoursBetween(start, end);
  return rateMul(p, h) * ratePrice(p, h);
}

function rentalCost(p, start, end) {
  if (p.kind === 'service') return round(p.price_flat || 0);
  return round(unitRateCost(p, start, end));
}

function getPricing(id) {
  if (!id) return null;
  const p = db.prepare('SELECT * FROM pricings WHERE id = ?').get(id);
  if (!p) return null;
  if (p.kind === 'kit' && p.kit_items) p.kitItems = JSON.parse(p.kit_items);
  return p;
}

function activeBundles() {
  return db.prepare("SELECT * FROM pricings WHERE kind = 'kit' AND active = 1 ORDER BY sort, id").all().map((p) => {
    try { p.kitItems = JSON.parse(p.kit_items); } catch { p.kitItems = []; }
    return p;
  }).filter((p) => p.kitItems && p.kitItems.length);
}

function unitRates(allUnits, kitSetCb) {
  const rates = new Map();
  const usedUnits = new Set();
  const counts = {};
  allUnits.forEach((u) => {
    if (u.category_id) counts[u.category_id] = (counts[u.category_id] || 0) + 1;
  });

  let setId = 0;
  activeBundles().forEach((b) => {
    const members = b.kitItems || [];
    const requiredMembers = members.filter((k) => !k.optional);
    const required = requiredMembers.length ? requiredMembers : members;
    const optional = members.filter((k) => k.optional);
    while (required.every((k) => (counts[k.category_id] || 0) >= k.qty)) {
      required.forEach((k) => { counts[k.category_id] -= k.qty; });
      const instance = required.map((k) => ({ category_id: k.category_id, qty: k.qty }));
      optional.forEach((k) => {
        if ((counts[k.category_id] || 0) >= k.qty) {
          counts[k.category_id] -= k.qty;
          instance.push({ category_id: k.category_id, qty: k.qty });
        }
      });

      setId++;
      const memberCount = instance.reduce((sum, k) => sum + k.qty, 0);
      const rate = {
        price_hour: Number(b.price_hour) / memberCount,
        price_day: Number(b.price_day) / memberCount,
        price_week: Number(b.price_week) / memberCount,
        price_season: Number(b.price_season) / memberCount
      };
      instance.forEach((k) => {
        let needed = k.qty;
        allUnits.forEach((u) => {
          if (needed && u.category_id === k.category_id && !usedUnits.has(u.id)) {
            usedUnits.add(u.id);
            rates.set(u.id, rate);
            if (typeof kitSetCb === 'function') kitSetCb(u.id, setId);
            needed--;
          }
        });
      });
    }
  });

  const categoryRates = {};
  db.prepare("SELECT * FROM pricings WHERE kind = 'category' AND active = 1").all().forEach((p) => {
    if (p.category_id) categoryRates[p.category_id] = p;
  });
  allUnits.forEach((u) => {
    if (!rates.has(u.id)) rates.set(u.id, categoryRates[u.category_id] || {});
  });
  return rates;
}

module.exports = {
  round,
  hoursBetween,
  rateMul,
  ratePrice,
  unitRateCost,
  rentalCost,
  getPricing,
  activeBundles,
  unitRates
};
