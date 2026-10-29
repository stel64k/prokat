const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const test = require('node:test');
const Database = require('better-sqlite3');

const root = path.join(__dirname, '..');
const temp = mkdtempSync(path.join(os.tmpdir(), 'prokat-test-'));
const dbPath = path.join(temp, 'test.db');
let child;
let base;
let cookie = '';

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function request(route, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(base + route, {
    ...options,
    headers
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    const pair = setCookie.split(';', 1)[0];
    cookie = pair.endsWith('=') ? '' : pair;
  }
  const type = response.headers.get('content-type') || '';
  const body = type.includes('json') ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { response, body };
}

function post(body) {
  return { method: 'POST', body: JSON.stringify(body) };
}

function plannedEnd(hours = 48) {
  const date = new Date(Date.now() + hours * 3600000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

test('rental workflow invariants', async (t) => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, [path.join(root, 'server.js')], {
    cwd: root,
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', PROKAT_DB_PATH: dbPath },
    stdio: 'ignore'
  });
  t.after(async () => {
    if (child && child.exitCode == null) {
      const exited = new Promise((resolve) => child.once('exit', resolve));
      child.kill();
      await exited;
    }
    rmSync(temp, { recursive: true, force: true });
  });

  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      const { response } = await request('/api/auth/status');
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(ready, true, 'server starts with a fresh database');

  assert.equal((await request('/api/auth/status')).body.initialized, false);
  assert.equal((await request('/api/bootstrap')).response.status, 503);
  let auth = await request('/api/auth/setup', post({ username: 'owner', password: 'OwnerPass123' }));
  assert.equal(auth.response.status, 200);
  assert.equal(auth.body.user.role, 'admin');
  assert.equal((await request('/api/auth/status')).body.user.username, 'owner');

  await t.test('admin provisions workers and worker permissions are enforced', async () => {
    const created = await request('/api/users', post({ username: 'staff1', password: 'StaffPass123', role: 'worker' }));
    assert.equal(created.response.status, 200);
    assert.equal(Boolean(created.body.must_change_password), true);
    const workerId = created.body.id;
    assert.equal((await request('/api/settings')).response.status, 200);

    await request('/api/auth/logout', post({}));
    assert.equal((await request('/api/bootstrap')).response.status, 401);
    auth = await request('/api/auth/login', post({ username: 'staff1', password: 'StaffPass123' }));
    assert.equal(auth.response.status, 200);
    assert.equal(auth.body.user.must_change_password, true);
    assert.equal((await request('/api/bootstrap')).response.status, 403);
    const changed = await request('/api/auth/change-password', post({ password: 'StaffPass456' }));
    assert.equal(changed.response.status, 200);
    assert.equal(changed.body.user.must_change_password, false);
    assert.equal((await request('/api/bootstrap')).response.status, 200);
    assert.equal((await request('/api/settings')).response.status, 200);
    assert.equal((await request('/api/settings', post({ business_name: 'Worker edit' }))).response.status, 403);
    assert.equal((await request('/api/pricings', post({}))).response.status, 403);
    assert.equal((await request('/api/reports/summary')).response.status, 403);
    assert.equal((await request('/api/backup')).response.status, 403);
    assert.equal((await request('/api/users')).response.status, 403);

    await request('/api/auth/logout', post({}));
    auth = await request('/api/auth/login', post({ username: 'owner', password: 'OwnerPass123' }));
    assert.equal(auth.response.status, 200);
    assert.equal((await request(`/api/users/${workerId}`, { method: 'PATCH', body: JSON.stringify({ active: false }) })).response.status, 200);
    await request('/api/auth/logout', post({}));
    assert.equal((await request('/api/auth/login', post({ username: 'staff1', password: 'StaffPass456' }))).response.status, 401);
    assert.equal((await request('/api/auth/login', post({ username: 'owner', password: 'OwnerPass123' })).then((x) => x.response.status)), 200);
  });

  const bootstrap = (await request('/api/bootstrap')).body;
  const client = (await request('/api/clients')).body[0];
  const pricing = (await request('/api/pricings')).body;
  const category = (name) => pricing.find((p) => p.kind === 'category' && p.name === name);
  const ski = category('Лыжи');
  const boot = category('Ботинки лыжные');
  const board = category('Сноуборд');
  const skiKit = pricing.find((p) => p.kind === 'kit' && p.name === 'Комплект горнолыжный');
  const skiLine = { pricing_id: ski.id, qty: 1 };
  const bootLine = { pricing_id: boot.id, qty: 1 };

  await t.test('deposit toggle records or suppresses deposits', async () => {
    assert.equal(bootstrap.settings.deposit_enabled, '1');
    let { response, body: order } = await request('/api/orders', post({
      client_id: client.id, deposit: 75, deposit_method: 'card', planned_end: plannedEnd(), lines: [{ pricing_id: pricing.find((p) => p.kind === 'service').id, qty: 1 }]
    }));
    assert.equal(response.status, 200);
    assert.equal(order.deposit, 75);
    assert.equal(order.payments.some((p) => p.type === 'deposit' && p.amount === 75 && p.method === 'card'), true);
    const canceled = (await request(`/api/orders/${order.id}/cancel`, post({}))).body;
    assert.equal(canceled.to_refund, 25);

    ({ response } = await request('/api/settings', post({ deposit_enabled: '0' })));
    assert.equal(response.status, 200);
    ({ response, body: order } = await request('/api/orders', post({
      client_id: client.id, deposit: 90, planned_end: plannedEnd(), lines: [{ pricing_id: pricing.find((p) => p.kind === 'service').id, qty: 1 }]
    })));
    assert.equal(response.status, 200);
    assert.equal(order.deposit, 0);
    assert.equal(order.payments.some((p) => p.type === 'deposit'), false);
    await request(`/api/orders/${order.id}/cancel`, post({}));
    await request('/api/settings', post({ deposit_enabled: '1' }));
  });

  await t.test('order listing shows total and paid, partial, or unpaid state', async () => {
    const service = pricing.find((p) => p.kind === 'service');
    const order = (await request('/api/orders', post({
      client_id: client.id, planned_end: plannedEnd(), lines: [{ pricing_id: service.id, qty: 1 }]
    }))).body;
    const listing = async () => (await request(`/api/orders?limit=20&q=${order.id}`)).body.find((o) => o.id === order.id);
    let row = await listing();
    assert.equal(row.order_total, service.price_flat);
    assert.equal(row.payment_status, 'unpaid');
    await request(`/api/orders/${order.id}/payment`, post({ amount: service.price_flat / 2, type: 'payment', method: 'cash' }));
    row = await listing();
    assert.equal(row.payment_status, 'partial');
    await request(`/api/orders/${order.id}/payment`, post({ amount: service.price_flat / 2, type: 'payment', method: 'cash' }));
    row = await listing();
    assert.equal(row.payment_status, 'paid');
    await request(`/api/orders/${order.id}/cancel`, post({}));
  });

  await t.test('grace window keeps a 2-hour-late return at one day', async () => {
    assert.equal(bootstrap.settings.return_grace_enabled, '1');
    await request('/api/settings', post({ late_fee_per_day: 10, return_grace_enabled: '1' }));

    async function makeReturn(graceEnabled, returnWhen) {
      await request('/api/settings', post({ return_grace_enabled: graceEnabled ? '1' : '0' }));
      const plan = new Date();
      plan.setDate(plan.getDate() + 1);
      plan.setHours(12, 0, 0, 0);
      const sqlTime = (date) => {
        const pad = (n) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
      };
      const order = (await request('/api/orders', post({
        client_id: client.id, planned_end: sqlTime(plan), lines: [skiLine]
      }))).body;
      const db = new Database(dbPath);
      const start = new Date(plan.getTime() - 86400000);
      const returned = new Date(plan);
      if (returnWhen === 'due-day-end') returned.setHours(23, 0, 0, 0);
      else if (returnWhen === 'next-day') { returned.setDate(returned.getDate() + 1); returned.setHours(0, 1, 0, 0); }
      else returned.setHours(14, 0, 0, 0);
      db.prepare("UPDATE orders SET started_at = ?, planned_end = ?, status = 'returned', ended_at = ? WHERE id = ?")
        .run(sqlTime(start), sqlTime(plan), sqlTime(returned), order.id);
      db.prepare(`UPDATE order_units SET return_time = ?, condition_ok = 1 WHERE order_item_id IN (
        SELECT id FROM order_items WHERE order_id = ?
      )`).run(sqlTime(returned), order.id);
      db.prepare(`UPDATE items SET status = 'in_stock' WHERE id IN (
        SELECT u.item_id FROM order_units u JOIN order_items oi ON oi.id = u.order_item_id WHERE oi.order_id = ?
      )`).run(order.id);
      db.close();
      return (await request('/api/orders/' + order.id)).body;
    }

    const beforeMidnight = await makeReturn(true, 'due-day-end');
    assert.equal(beforeMidnight.final_total, 250);
    assert.equal(beforeMidnight.late_fee, 0);

    const afterMidnight = await makeReturn(true, 'next-day');
    assert.equal(afterMidnight.final_total, 510);

    const withoutGrace = await makeReturn(false, 'two-hours-late');
    assert.equal(withoutGrace.final_total, 510);

    await request('/api/settings', post({ late_fee_per_day: 0, return_grace_enabled: '1' }));
  });

  await t.test('order rates stay fixed after tariff edits', async () => {
    const { response, body: order } = await request('/api/orders', post({
      client_id: client.id, planned_end: plannedEnd(), lines: [skiLine, bootLine]
    }));
    assert.equal(response.status, 200);
    assert.equal(order.estimated_total, 1200);

    const changed = {
      name: skiKit.name, kind: skiKit.kind, category_id: null,
      kit_items: skiKit.kitItems, price_hour: 0, price_day: 999,
      price_week: 0, price_season: 0, price_flat: 0, active: true
    };
    await request(`/api/pricings/${skiKit.id}`, { method: 'PUT', body: JSON.stringify(changed) });
    const refreshed = (await request(`/api/orders/${order.id}`)).body;
    assert.equal(refreshed.estimated_total, 1200);
    await request(`/api/orders/${order.id}/cancel`, post({}));
  });

  await t.test('return unit must belong to the requested order and be returned once', async () => {
    const one = (await request('/api/orders', post({ client_id: client.id, planned_end: plannedEnd(), lines: [skiLine] }))).body;
    const two = (await request('/api/orders', post({ client_id: client.id, planned_end: plannedEnd(), lines: [{ pricing_id: board.id, qty: 1 }] }))).body;
    const unitOne = one.items[0].units[0];
    const unitTwo = two.items[0].units[0];
    let result = await request(`/api/orders/${one.id}/return-unit`, post({ unit_id: unitTwo.id, condition_ok: 1 }));
    assert.equal(result.response.status, 404);
    result = await request(`/api/orders/${one.id}/return-unit`, post({ unit_id: unitOne.id, condition_ok: 1 }));
    assert.equal(result.response.status, 200);
    result = await request(`/api/orders/${one.id}/return-unit`, post({ unit_id: unitOne.id, condition_ok: 1 }));
    assert.equal(result.response.status, 409);
    await request(`/api/orders/${one.id}/cancel`, post({}));
    await request(`/api/orders/${two.id}/cancel`, post({}));
  });

  await t.test('inventory snapshot excludes rented items, resumes, and rejects duplicate scans', async () => {
    const order = (await request('/api/orders', post({ client_id: client.id, planned_end: plannedEnd(), lines: [skiLine] }))).body;
    const rentedBarcode = order.items[0].units[0].barcode;
    const { response, body: session } = await request('/api/inventory/sessions', post({ note: 'test' }));
    assert.equal(response.status, 200);
    let inventory = (await request(`/api/inventory/sessions/${session.id}`)).body;
    assert.equal(inventory.expected.find((r) => r.cat_name === 'Лыжи').total, 5);
    const rentedScan = await request('/api/inventory/scan', post({ session_id: session.id, barcode: rentedBarcode }));
    assert.equal(rentedScan.response.status, 409);
    const available = (await request('/api/items?status=in_stock')).body.find((i) => i.category_id === ski.category_id);
    let scan = await request('/api/inventory/scan', post({ session_id: session.id, barcode: available.barcode }));
    assert.equal(scan.response.status, 200);
    scan = await request('/api/inventory/scan', post({ session_id: session.id, barcode: available.barcode }));
    assert.equal(scan.response.status, 409);
    assert.equal((await request('/api/inventory/sessions')).body.some((s) => s.id === session.id && !s.ended_at), true);
    inventory = (await request(`/api/inventory/sessions/${session.id}`)).body;
    assert.equal(inventory.scannedRows.length, 1);
    await request(`/api/inventory/sessions/${session.id}/finish`, post({}));
    await request(`/api/orders/${order.id}/cancel`, post({}));
  });

  await t.test('rejects unsafe item statuses, invalid payments, and returns beyond receipts', async () => {
    let result = await request('/api/items', post({ category_id: ski.category_id, count: 1, status: 'rented' }));
    assert.equal(result.response.status, 400);
    const order = (await request('/api/orders', post({
      client_id: client.id, deposit: 50, planned_end: plannedEnd(), lines: [skiLine]
    }))).body;
    const item = order.items[0].units[0];
    result = await request(`/api/items/${item.item_id}`, { method: 'PUT', body: JSON.stringify({ status: 'in_stock' }) });
    assert.equal(result.response.status, 409);
    result = await request(`/api/orders/${order.id}/payment`, post({ amount: -5, type: 'payment', method: 'cash' }));
    assert.equal(result.response.status, 400);
    result = await request(`/api/orders/${order.id}/payment`, post({ amount: 51, type: 'refund', method: 'cash' }));
    assert.equal(result.response.status, 400);
    result = await request(`/api/orders/${order.id}/payment`, post({ amount: 50, type: 'refund', method: 'cash' }));
    assert.equal(result.response.status, 200);
    assert.equal(result.body.refunded, 50);
    await request(`/api/orders/${order.id}/cancel`, post({}));
  });

  await t.test('backup endpoint returns a valid SQLite snapshot', async () => {
    const { response, body } = await request('/api/backup');
    assert.equal(response.status, 200);
    assert.equal(body.subarray(0, 15).toString(), 'SQLite format 3');
  });
});
