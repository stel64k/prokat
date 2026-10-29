const state = {
  categories: [],
  pricings: [],
  settings: {},
  tab: 'issue',
  currentUser: null,
  authMode: null,
  draft: { client: null, clientName: '', lines: [], planned_end: '', deposit: null, deposit_method: 'cash', notes: '' },
  receiveOrderId: null,
  invSessionId: null
};

const CAT_ICONS = { 'Лыжи': 'Л', 'Сноуборд': 'Д', 'Ботинки': 'Б', 'Крепления': 'К', 'Палки': 'П', 'Шлем': 'Ш', 'Маска': 'М' };

function categoryPricingForItem(it) {
  return state.pricings.find((p) => p.kind === 'category' && p.category_id === it.category_id && p.active);
}

async function ensureCategoryPricing(it) {
  let pricing = categoryPricingForItem(it);
  if (pricing) return pricing;
  if (state.currentUser.role !== 'admin') throw new Error(t('no_category_rate'));
  const created = await api('/api/pricings', {
    method: 'POST',
    body: JSON.stringify({
      name: it.cat_name, kind: 'category', category_id: it.category_id,
      price_hour: 0, price_day: 250, price_flat: 0
    })
  });
  pricing = { id: created.id, name: it.cat_name, kind: 'category', category_id: it.category_id, active: 1 };
  state.pricings.push(pricing);
  return pricing;
}

function fmtDT(str) {
  if (!str) return '-';
  const s = String(str);
  if (s.includes('T')) {
    const [d, t] = s.slice(0, 16).split('T');
    const [y, m, day] = d.split('-');
    return y && m && day ? `${day}.${m}.${y} ${t}` : s.slice(0, 16).replace('T', ' ');
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) {
    const [d, t] = s.split(' ');
    const [y, m, day] = d.split('-');
    return `${day}.${m}.${y} ${t.slice(0,5)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, day] = s.split('-');
    return `${day}.${m}.${y}`;
  }
  return s.slice(0, 16);
}

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function catName(id) {
  const c = state.categories.find((x) => x.id === id);
  return c ? c.name : '';
}

function pricingActive(kind) {
  return state.pricings.filter((p) => p.active && p.kind === kind);
}

function openModal(title, bodyHtml) {
  const root = $('#modal-root');
  state.modalReturnFocus = document.activeElement;
  const titleId = 'modal-title-' + Date.now();
  root.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="${titleId}"><button class="close" type="button" aria-label="${esc(t('close'))}">&times;</button><h2 id="${titleId}">${esc(title)}</h2><div class="body">${bodyHtml}</div></div>`;
  $('.close', root).onclick = closeModal;
  root.classList.add('open');
  wireLabels(root);
  const focusTarget = $('input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not(.close)', root)
    || $('.close', root);
  if (focusTarget) focusTarget.focus();
  return $('.modal .body', root);
}

function closeModal() {
  $('#modal-root').classList.remove('open');
  $('#modal-root').innerHTML = '';
  if (state.modalReturnFocus && state.modalReturnFocus.isConnected) state.modalReturnFocus.focus();
  state.modalReturnFocus = null;
}

function wireLabels(root) {
  $$('label', root).forEach((label) => {
    if (label.control || label.htmlFor) return;
    const control = label.nextElementSibling;
    if (!control || !control.matches('input,select,textarea')) return;
    if (!control.id) control.id = 'field-' + Math.random().toString(36).slice(2, 10);
    label.htmlFor = control.id;
  });
}

window.addEventListener('keydown', (event) => {
  const root = $('#modal-root');
  if (!root.classList.contains('open')) return;
  if (event.key === 'Escape') { closeModal(); return; }
  if (event.key === 'Tab') {
    const focusable = $$('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]', root);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

const labelObserver = new MutationObserver((records) => {
  records.forEach((record) => record.addedNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) wireLabels(node);
  }));
});
labelObserver.observe(document.body, { childList: true, subtree: true });

function confirmAction(msg) {
  return window.confirm(msg);
}

function printHtml(title, html) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { toast(t('popup_blocked')); return; }
  w.document.write(`<!DOCTYPE html><html lang="${LANG}"><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; font-size: 13px; padding: 24px; }
    h1 { font-size: 17px; margin: 0 0 4px; } h2 { font-size: 14px; margin: 0 0 14px; font-weight: 600; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #999; padding: 5px 8px; text-align: left; font-size: 12px; }
    th { background: #eee; }
    .tot { margin-top: 12px; font-weight: 700; }
    .sig { margin-top: 40px; display: flex; gap: 60px; }
    .sig div { border-top: 1px solid #333; padding-top: 4px; width: 200px; font-size: 12px; }
  </style></head><body onload="window.print()">${html}</body></html>`);
  w.document.close();
}

function statusBadge(s) {
  const map = {
    in_stock: t('st_in_stock'), rented: t('st_rented'), service: t('st_service'), retired: t('st_retired'),
    active: t('st_active'), returned: t('st_returned'), canceled: t('st_canceled')
  };
  return `<span class="badge ${esc(s)}">${esc(map[s] || s)}</span>`;
}

function paymentStatusBadge(status) {
  return `<span class="badge payment-${esc(status)}">${t('payment_status_' + status)}</span>`;
}

async function init() {
  const auth = await api('/api/auth/status');
  if (!auth.initialized) return renderAuth('setup');
  if (!auth.user) return renderAuth('login');
  state.currentUser = auth.user;
  if (auth.user.must_change_password) return renderAuth('change');
  await startApp();
}

function renderAuth(mode) {
  state.authMode = mode;
  document.documentElement.lang = LANG === 'ru' ? 'ru' : LANG === 'uk' ? 'uk' : 'en';
  $('#app-shell').hidden = true;
  const root = $('#auth-root');
  root.hidden = false;
  root.classList.add('auth-root');
  const title = mode === 'setup' ? t('auth_setup_title') : mode === 'change' ? t('change_password_title') : t('auth_login_title');
  const credentials = mode === 'setup' ? `
    <label for="auth-username">${t('username')}</label><input id="auth-username" name="username" autocomplete="username" required minlength="3" maxlength="32">
    <label for="auth-password">${t('password')}</label><input id="auth-password" name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="128">
    <label for="auth-confirm">${t('confirm_password')}</label><input id="auth-confirm" name="confirm" type="password" autocomplete="new-password" required minlength="8" maxlength="128">
    <p class="small">${t('auth_setup_hint')}</p>
    <button class="btn green" type="submit">${t('setup_admin_btn')}</button>`
    : mode === 'change' ? `
    <p>${t('must_change_password')}</p>
    <label for="auth-password">${t('new_password')}</label><input id="auth-password" name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="128">
    <label for="auth-confirm">${t('confirm_password')}</label><input id="auth-confirm" name="confirm" type="password" autocomplete="new-password" required minlength="8" maxlength="128">
    <button class="btn green" type="submit">${t('change_password_btn')}</button>` : `
    <label for="auth-username">${t('username')}</label><input id="auth-username" name="username" autocomplete="username" required>
    <label for="auth-password">${t('password')}</label><input id="auth-password" name="password" type="password" autocomplete="current-password" required>
    <button class="btn green" type="submit">${t('login_btn')}</button>`;
  root.innerHTML = `<div class="auth-card card"><div class="auth-heading"><h1>${esc(title)}</h1><button id="auth-lang-btn" class="btn ghost sm" type="button" onclick="cycleLang()">${LANG_CODE[LANG]}</button></div><form id="auth-form" class="auth-form">${credentials}</form></div>`;
  wireLabels(root);
  $('#auth-form').onsubmit = async (event) => {
    event.preventDefault();
    const password = $('#auth-password').value;
    const confirm = $('#auth-confirm');
    if (confirm && password !== confirm.value) return toast(t('passwords_mismatch'));
    const submit = $('button[type=submit]', event.currentTarget);
    submit.disabled = true;
    try {
      const payload = mode === 'setup'
        ? { username: $('#auth-username').value, password }
        : mode === 'change' ? { password } : { username: $('#auth-username').value, password };
      const endpoint = mode === 'setup' ? '/api/auth/setup' : mode === 'change' ? '/api/auth/change-password' : '/api/auth/login';
      const result = await api(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      state.currentUser = result.user;
      if (result.user.must_change_password) renderAuth('change');
      else await startApp();
    } catch (e) {
      toast(e.message);
      submit.disabled = false;
    }
  };
  $('input', root).focus();
}

async function startApp() {
  $('#auth-root').hidden = true;
  $('#app-shell').hidden = false;
  const [b] = await Promise.all([api('/api/bootstrap')]);
  state.categories = b.categories;
  state.pricings = b.pricings;
  state.settings = b.settings;
  const biz = state.settings.business_name || t('app_title');
  $('#brand').textContent = biz;
  document.title = biz;
  $('#user-controls').hidden = false;
  $('#user-name').textContent = `${state.currentUser.username} · ${t(state.currentUser.role === 'admin' ? 'role_admin' : 'role_worker')}`;
  $('#logout-btn').onclick = logout;
  $$('#nav [data-tab="rates"], #nav [data-tab="reports"], #nav [data-tab="settings"]').forEach((button) => {
    button.hidden = state.currentUser.role !== 'admin' && button.dataset.tab !== 'settings';
  });
  bindNav();
  await Promise.all([renderIssue(), renderDashboard()]);
  const tabs = ['issue', 'receive', 'orders', 'inv', 'invcheck', 'clients', 'rates', 'reports', 'settings'];
  let savedTab = 'issue';
  try {
    const storedTab = localStorage.getItem('prokat_tab');
    if (tabs.includes(storedTab)) savedTab = storedTab;
  } catch (e) { /* ignore */ }
  state.tab = savedTab;
  setLang(LANG);
}

async function logout() {
  try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); }
  catch {}
  state.currentUser = null;
  state.receiveOrderId = null;
  renderAuth('login');
}

function myPasswordModal() {
  openModal(t('change_my_password'), `
    <label for="mp-password">${t('new_password')}</label><input id="mp-password" type="password" minlength="8" maxlength="128" autocomplete="new-password">
    <label for="mp-confirm">${t('confirm_password')}</label><input id="mp-confirm" type="password" minlength="8" maxlength="128" autocomplete="new-password">
    <div class="row" style="margin-top:12px"><button class="btn green" onclick="changeMyPasswordDo()">${t('change_password_btn')}</button><button class="btn ghost" onclick="closeModal()">${t('cancel')}</button></div>`);
}

async function changeMyPasswordDo() {
  const password = $('#mp-password').value;
  if (password !== $('#mp-confirm').value) return toast(t('passwords_mismatch'));
  try {
    const result = await api('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ password }) });
    state.currentUser = result.user;
    closeModal();
    toast(t('saved'));
  } catch (e) { toast(e.message); }
}

function bindNav() {
  $$('#nav button').forEach((b) => {
    b.onclick = () => switchTab(b.dataset.tab);
  });
}

async function switchTab(tab, preserveReceiveOrder = false) {
  if (state.currentUser && state.currentUser.role === 'worker' && ['rates', 'reports'].includes(tab)) {
    toast(t('auth_worker_limit'));
    tab = 'issue';
  }
  if (state.tab === 'issue') syncDraftFields();
  state.tab = tab;
  try { localStorage.setItem('prokat_tab', tab); } catch (e) { /* ignore */ }
  $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'tab-' + tab));
  if (tab === 'receive' && !preserveReceiveOrder) { state.receiveOrderId = null; }
  const renderers = {
    issue: renderIssue, receive: renderReceive, orders: renderOrders,
    inv: renderInv, invcheck: renderInvCheck, clients: renderClients,
    rates: renderRates, reports: renderReports, settings: renderSettings
  };
  await renderers[tab]();
}

let scanBuf = '';
let scanTimer = null;
window.addEventListener('keydown', (e) => {
  if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName) && !e.ctrlKey && !e.metaKey) {
    if (e.key === 'Enter' && e.target.classList.contains('nocatch')) return;
    if (e.key === 'Enter' || e.key.length === 1) {
      scanBuf = '';
      return;
    }
  }
  if (e.key === 'Enter') {
    const code = scanBuf.trim();
    scanBuf = '';
    if (code) onScan(code);
    return;
  }
  if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
    scanBuf += e.key;
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => { scanBuf = ''; }, 90);
  }
});

function onScan(code) {
  if (state.tab === 'receive') return receiveScan(code);
  if (state.tab === 'issue') return issueScan(code);
  if (state.tab === 'invcheck') return invCheckScan(code);
}

async function issueScan(code) {
  try {
    const it = await api('/api/items/barcode/' + encodeURIComponent(code)).catch(() => null);
    if (!it) return toast(t('not_found', { code }));
    if (it.status !== 'in_stock') {
      const msg = it.status === 'rented' ? t('item_rented', { bc: it.barcode })
        : it.status === 'service' ? t('item_service', { bc: it.barcode })
        : t('item_retired', { bc: it.barcode });
      return toast(msg);
    }
    if (state.draft.lines.some((l) => l.pin === it.id)) return toast(t('already_added', { bc: it.barcode }));
    const pricing = await ensureCategoryPricing(it);
    state.draft.lines.push({
      pricing_id: pricing.id, kind: 'category', name: pricing.name, qty: 1, pin: it.id,
      barcode: it.barcode, model: it.model + ' ' + it.size, cat_name: it.cat_name });
    toast(t('added', { bc: it.barcode }));
    syncDraftFields();
    renderDraftBlock();
  } catch (e) { toast(e.message); }
}

async function receiveScan(code) {
  try {
    const r = await api('/api/lookup-unit', { method: 'POST', body: JSON.stringify({ barcode: code }) });
    if (!r.found) {
      if (r.reason === 'not_rented') return toast(t('not_rented', { code }));
      return toast(t('not_found', { code }));
    }
    state.receiveOrderId = r.order_id;
    await renderReceive();
    setTimeout(() => conditionModal(r.order_id, r.unit_id), 120);
  } catch (e) { toast(e.message); }
}

async function invCheckScan(code) {
  try {
    if (!state.invSessionId) return toast(t('start_inv_session'));
    const r = await api('/api/inventory/scan', { method: 'POST', body: JSON.stringify({ session_id: state.invSessionId, barcode: code }) });
    if (!r.found) return toast(r.error || t('not_found_plain'));
    toast(t('scanned_inv', { v: r.item.barcode + ' ' + r.item.model + ' ' + r.item.size }));
    await renderInvCheck();
  } catch (e) { toast(e.message); }
}

async function renderDashboard() {}

function draftLinesHtml() {
  const st = state.draft;
  return st.lines.length ? st.lines.map((l, i) => `
    <div class="line">
      <span class="mono">${esc(l.barcode || (l.kind === 'service' ? t('service_label') : t('auto_pick')))}</span>
      <b>${esc(l.name)}</b>
      ${l.model ? `<span class="small">${esc(l.model)}</span>` : ''}
      <span class="badge in_stock" style="display:${l.pin ? 'inline-block' : 'none'}">${t('specific')}</span>
      ${l.pin ? '<span class="small">×1</span>' : `<input type="number" min="1" value="${l.qty}" style="width:60px" onchange="setDraftQty(${i}, this.value)">`}
      <button class="btn sm ghost" onclick="removeDraftLine(${i})">${t('remove')}</button>
    </div>`).join('') : '<div class="muted">' + t('issue_empty_hint') + '</div>';
}

async function renderIssue() {
  const el = $('#tab-issue');
  const st = state.draft;
  const activeOrders = await api('/api/orders/active');
  const overdue = activeOrders.filter((o) => o.overdue);
  window._overdueList = overdue.slice();

  const linesHtml = draftLinesHtml();

  el.innerHTML = `
    <div class="card">
      <h2>${t('issue_title')}</h2>
      ${overdue.length ? `<div class="status-box warn" style="cursor:pointer" data-overdue="1">${t('overdue_warn', { ids: overdue.map((o) => '#' + o.id).join(', ') })}</div>` : ''}
      <div class="row">
        <div class="grow">
          <label>${t('client')}</label>
          <input id="i-client" aria-label="${t('client_search_ph')}" autocomplete="off" placeholder="${t('client_search_ph')}" value="${esc(st.client ? st.client.name : st.clientName || '')}" oninput="clientInput(this.value)">
          <div id="i-client-suggestions" class="suggestions" role="listbox" hidden></div>
          <input type="hidden" id="i-client-id">
        </div>
        <button class="btn ghost" onclick="clientModal()">${t('pick_from_db')}</button>
        <button class="btn" onclick="newClientModal()">${t('new_client')}</button>
      </div>
      <div id="i-client-info" class="small"></div>
    </div>

    <div class="card">
      <h3>${t('order_positions')}</h3>
      <div id="draft-lines">${linesHtml}</div>
      <div class="row" style="margin-top:10px">
        <button class="btn ghost" onclick="pickItemModal()">${t('pick_item')}</button>
        <select id="i-svc" onchange="addService(this)"><option value="">${t('service_opt')}</option>
          ${pricingActive('service').map((p) => `<option value="${p.id}">${esc(p.name)} — ${money(p.price_flat)}</option>`).join('')}
        </select>
      </div>
       <div class="row scan-row" style="margin-top:8px"><input id="issue-scanner" class="scanner-input" aria-label="${t('scan_input_ph')}" placeholder="${t('scan_input_ph')}" onkeydown="if(event.key==='Enter'){event.preventDefault();scanFromInput(this)}"><div class="scan-hint">${t('issue_scan_hint')}</div></div>
    </div>

    <div class="card">
      <div class="row">
        <div class="grow">
          <label>${t('planned_return')}</label>
          <input type="datetime-local" id="i-end" value="${st.planned_end}" oninput="updateIssueTotal()">
        </div>
        ${state.settings.deposit_enabled === '0' ? `<div class="grow small">${t('deposit_disabled_note')}</div>` : `<div class="grow">
          <label>${t('deposit')}</label>
          <div class="row deposit-row"><input type="number" min="0" step="0.01" id="i-deposit" placeholder="0" value="${st.deposit == null ? state.settings.deposit_default : st.deposit}" oninput="updateIssueTotal()"><select id="i-deposit-method" aria-label="${t('method')}" onchange="setDepositMethod(this.value)"><option value="cash" ${st.deposit_method !== 'card' ? 'selected' : ''}>${t('cash')}</option><option value="card" ${st.deposit_method === 'card' ? 'selected' : ''}>${t('card')}</option></select></div>
        </div>`}
        <div class="grow">
          <label>${t('comment')}</label>
          <input id="i-notes" placeholder="${t('comment_ph')}" value="${esc(st.notes)}">
        </div>
      </div>
      <div style="margin-top:12px" class="row" id="issue-total"></div>
      <div style="margin-top:12px">
        <button class="btn green" onclick="createOrder()">${t('create_order')}</button>
      </div>
    </div>

    <div class="card">
      <h3>${t('active_orders')}</h3>
      <div id="active-list"></div>
    </div>
  `;
  renderActiveList(activeOrders);
  updateIssueTotal();
  if (st.client) setClientBox(st.client);
}

function renderDraftBlock() {
  const box = $('#draft-lines');
  if (box) box.innerHTML = draftLinesHtml();
  updateIssueTotal();
}

function debouncedClientSearch(q) {
  clearTimeout(state.clientSearchTimer);
  const box = $('#i-client-suggestions');
  if (q.length < 2) {
    if (box) box.hidden = true;
    return;
  }
  state.clientSearchTimer = setTimeout(async () => {
    const list = await api('/api/clients?q=' + encodeURIComponent(q)).catch(() => []);
    if (!$('#i-client-suggestions') || $('#i-client').value.trim() !== q) return;
    state.clientMatches = list;
    const suggestions = $('#i-client-suggestions');
    suggestions.innerHTML = list.length
      ? list.map((c) => `<button type="button" role="option" class="suggestion" onclick="selectDraftClient(${c.id})"><b>${esc(c.name)}</b><span>${esc(c.phone)}</span></button>`).join('')
      : `<div class="suggestion-empty">${t('no_client_matches')}</div>`;
    suggestions.hidden = false;
  }, 400);
}

function clientInput(value) {
  if (state.draft.client && value !== state.draft.client.name) {
    state.draft.client = null;
    $('#i-client-id').value = '';
    $('#i-client-info').innerHTML = '';
  }
  state.draft.clientName = value;
  debouncedClientSearch(value.trim());
}

function selectDraftClient(id) {
  const client = (state.clientMatches || []).find((c) => c.id === id);
  if (!client) return;
  setClientBox(client);
  const suggestions = $('#i-client-suggestions');
  if (suggestions) suggestions.hidden = true;
}

function syncDraftFields() {
  const st = state.draft;
  if (!$('#draft-lines')) return;
  if ($('#i-end')) st.planned_end = $('#i-end').value;
  if ($('#i-deposit')) st.deposit = $('#i-deposit').value || null;
  if ($('#i-deposit-method')) st.deposit_method = $('#i-deposit-method').value;
  if ($('#i-notes')) st.notes = $('#i-notes').value;
  if ($('#i-client')) st.clientName = $('#i-client').value;
}

function setDepositMethod(method) { state.draft.deposit_method = method; }

function setClientBox(client) {
  state.draft.client = client;
  state.draft.clientName = client.name;
  const info = $('#i-client-info');
  if (info) info.innerHTML = `<b>${esc(client.name)}</b> ${esc(client.phone)} ${esc(client.doc)} <button class="btn sm ghost" onclick="clientRemove()">×</button>`;
  const hid = $('#i-client-id');
  if (hid) hid.value = client.id;
  const inp = $('#i-client');
  if (inp) inp.value = client.name;
  const suggestions = $('#i-client-suggestions');
  if (suggestions) suggestions.hidden = true;
}

function clientRemove() {
  state.draft.client = null;
  state.draft.clientName = '';
  $('#i-client').value = '';
  $('#i-client-id').value = '';
  $('#i-client-info').innerHTML = '';
  const suggestions = $('#i-client-suggestions');
  if (suggestions) suggestions.hidden = true;
}

async function scanFromInput(input) {
  const code = input.value.trim();
  const id = input.id;
  input.value = '';
  if (!code) return;
  if (state.tab === 'invcheck') await invCheckScan(code);
  else await onScan(code);
  const next = $('#' + id);
  if (next) next.focus();
}

function setDraftQty(i, v) {
  state.draft.lines[i].qty = Math.max(1, parseInt(v) || 1);
  syncDraftFields();
  renderDraftBlock();
}
function removeDraftLine(i) {
  state.draft.lines.splice(i, 1);
  syncDraftFields();
  renderDraftBlock();
}
function addCategory(sel) {
  const p = state.pricings.find((x) => x.id == sel.value);
  if (p) { state.draft.lines.push({ pricing_id: p.id, kind: 'category', name: p.name, qty: 1 }); syncDraftFields(); renderDraftBlock(); }
}
function addService(sel) {
  const p = state.pricings.find((x) => x.id == sel.value);
  if (p) { state.draft.lines.push({ pricing_id: p.id, kind: 'service', name: p.name, qty: 1, price: p.price_flat }); syncDraftFields(); renderDraftBlock(); }
}

function pickRows(list) {
  return list.map((i) => `
    <div class="line">
      <span class="mono">${esc(i.barcode)}</span>
      <b>${esc(i.cat_name)}</b>
      <span class="small">${esc(i.brand)} ${esc(i.model)} ${esc(i.size)} (${esc(i.cond)})</span>
      <button class="btn sm" data-bc="${esc(i.barcode)}" onclick="pickItemDo(this.dataset.bc)">${t('choose')}</button>
    </div>`).join('') || '<div class="muted">' + t('no_stock') + '</div>';
}

async function pickItemModal() {
  const all = await api('/api/items?status=in_stock');
  const used = new Set(state.draft.lines.filter((l) => l.pin).map((l) => l.pin));
  const items = all.filter((i) => !used.has(i.id));
  window._pickItems = items;
  openModal(t('pick_item'), `
    <input id="pk-q" placeholder="${t('pick_item_search_ph')}" oninput="pickFilter(this.value)">
    <div id="pk-list" style="max-height:420px;overflow:auto;margin-top:8px">${pickRows(items)}</div>`);
}

function pickFilter(q) {
  const list = window._pickItems || [];
  const qs = String(q || '').trim().toLowerCase();
  const f = list.filter((i) => {
    if (!qs) return true;
    const hay = (i.barcode + ' ' + i.cat_name + ' ' + i.brand + ' ' + i.model + ' ' + i.size + ' ' + i.cond).toLowerCase();
    return qs.split(/\s+/).every((t) => hay.includes(t));
  });
  $('#pk-list').innerHTML = pickRows(f);
}

async function pickItemDo(barcode) {
  const it = (window._pickItems || []).find((x) => x.barcode === barcode);
  if (!it) return toast(t('not_found', { code: barcode }));
  if (state.draft.lines.some((l) => l.pin === it.id)) return toast(t('already_added', { bc: barcode }));
  const pricing = await ensureCategoryPricing(it);
  state.draft.lines.push({
    pricing_id: pricing.id,
    kind: 'category', name: it.cat_name, qty: 1, pin: it.id,
    barcode: it.barcode, model: it.brand + ' ' + it.model + ' ' + it.size, cat_name: it.cat_name });
  toast(t('added_full', { v: it.barcode + ' ' + it.model + ' ' + it.size }));
  closeModal();
  syncDraftFields();
  renderDraftBlock();
}

function estimateDraft() {
  const end = $('#i-end') ? $('#i-end').value : state.draft.planned_end;
  const start = new Date();
  const h = Math.max(1, Math.ceil((new Date(end || new Date().toISOString().slice(0, 19).replace('T', ' ')) - start) / 3600000));
  const priceFor = (p) => {
    if (!p) return 0;
    if (p.price_week && h >= 144) return Math.ceil(h / 168) * p.price_week;
    if (h >= 24) return Math.ceil(h / 24) * p.price_day;
    if (p.price_hour) return h * p.price_hour;
    return p.price_day || 0;
  };
  let total = 0;
  const counts = {};
  state.draft.lines.forEach((l) => {
    if (l.kind === 'service') { total += ((state.pricings.find((x) => x.id === l.pricing_id) || {}).price_flat || 0) * l.qty; return; }
    const p = state.pricings.find((x) => x.id === l.pricing_id);
    if (!p || p.kind !== 'category') return;
    counts[p.category_id] = (counts[p.category_id] || 0) + l.qty;
  });
  const rem = { ...counts };
  state.pricings.filter((b) => b.kind === 'kit' && b.active && b.kitItems && b.kitItems.length)
    .forEach((b) => {
      const members = b.kitItems;
      const keys = members.filter((k) => !k.optional);
      const req = keys.length ? keys : members;
      const opt = members.filter((k) => k.optional);
      while (req.every((k) => (rem[k.category_id] || 0) >= k.qty)) {
        req.forEach((k) => { rem[k.category_id] -= k.qty; });
        opt.forEach((k) => { if ((rem[k.category_id] || 0) >= k.qty) rem[k.category_id] -= k.qty; });
        total += priceFor(b);
      }
    });
  Object.keys(rem).forEach((cid) => {
    if (!rem[cid]) return;
    const p = state.pricings.find((x) => x.kind === 'category' && x.category_id == cid && x.active);
    total += priceFor(p) * rem[cid];
  });
  return { total: Math.round(total * 100) / 100, end };
}

function overdueInfo() {
  if (!window._overdueList || !window._overdueList.length) return;
  const items = window._overdueList.map(o => `<div class="line"><div class="grow"><b>#${o.id}</b> ${esc(o.client_name||'')} ${o.client_phone?'· '+esc(o.client_phone):''}</div><button type="button" class="btn sm" data-order="${o.id}">${t('open')}</button></div>`).join('');
  openModal(t('overdue_warn_modal'), `<div>${items}</div><div class="row" style="margin-top:12px"><button class="btn ghost" onclick="closeModal()">${t('close')}</button></div>`);
}

function updateIssueTotal() {
  const box = $('#issue-total');
  if (!box) return;
  const est = estimateDraft();
  const dep = parseFloat(($('#i-deposit') || {}).value) || 0;
  box.innerHTML = `<div class="drafter" style="width:100%">
    ${t('cost_est', { v: money(est.total) })} ·
    ${t('deposit_val', { v: money(dep) })} ·
    ${t('pay_at_issue', { v: money(est.total + dep) })}
  </div>`;
}

function draftToCreate() {
  return {
    client_id: state.draft.client ? state.draft.client.id : null,
    planned_end: ($('#i-end').value || '').replace('T', ' '),
    deposit: state.settings.deposit_enabled === '0' ? 0 : parseFloat($('#i-deposit').value) || 0,
    deposit_method: state.draft.deposit_method || 'cash',
    notes: $('#i-notes').value,
    lines: state.draft.lines.map((l) => ({ pricing_id: l.pricing_id, qty: l.qty, item_pin: l.pin || null }))
  };
}

async function createOrder() {
  try {
    const body = draftToCreate();
    if (!body.client_id) return toast(t('select_client'));
    if (!body.lines.length) return toast(t('add_lines'));
    if (!body.planned_end) return toast(t('select_return_date'));
    const order = await api('/api/orders', { method: 'POST', body: JSON.stringify(body) });
    state.draft = { client: null, clientName: '', lines: [], planned_end: '', deposit: null, deposit_method: 'cash', notes: '' };
    toast(t('order_created', { id: order.id }));
    openModal(t('order_title', { id: order.id }), orderDetailHtml(order) + `
      <div class="row" style="margin-top:14px">
        <button class="btn" onclick="printContract()">${t('print_contract')}</button>
        <button class="btn green" onclick="recordPaymentModal(${order.id})">${t('add_payment')}</button>
        <button class="btn red" onclick="cancelOrder(${order.id})">${t('cancel_order_btn')}</button>
        <button class="btn ghost" onclick="closeModal()">${t('close')}</button>
      </div>`);
    window._lastOrder = order;
    renderIssue();
  } catch (e) { toast(e.message); }
}

function unitLabel(u) {
  return [u.barcode, u.cat_name, u.brand, u.model, u.size].filter((x) => x).join(' · ');
}

function orderDetailHtml(order) {
  const rows = order.items.map((oi) => `
    <tr><td>${esc(oi.name)}</td>
    <td>${oi.units.map((u) => `<span class="mono small">${esc(unitLabel(u))}${u.return_time ? ' ✓' : ''}</span>`).join('<br>') || '—'}</td>
    <td class="right">${money(oi.cost)}</td></tr>`).join('');
  return `
    <p class="small">${t('client_label', { name: esc(order.client ? order.client.name : '') })} ${esc(order.client ? order.client.phone : '')}</p>
    <p class="small">${t('issue_return_plan', { t: fmtDT(order.started_at), t2: fmtDT(order.planned_end) })}</p>
    <table><thead><tr><th>${t('position')}</th><th>${t('units_barcode')}</th><th class="right">${t('amount')}</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="total-row"><span>${t('deposit_paid')}</span><span>${money(order.deposit)} / ${money(order.paid)}</span></div>
    ${order.status === 'active' ? `
    <div style="margin-top:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px">
      <div class="row small">
        <div>${t('plan_cost', { v: money(order.estimated_total) })}</div>
        <div><b>${t('actual_cost', { v: money(order.actual_total) })}</b>${order.late_fee ? ` <span class="badge overdue">${t('late_fee_badge', { v: money(order.late_fee) })}</span>` : ''}</div>
        <div>${t('deposit_col')}: ${money(order.deposit)}</div>
      </div>
      ${order.actual_to_charge ? `<div class="status-box warn">${t('to_charge', { v: money(order.actual_to_charge) })}</div>` : ''}
      ${order.actual_to_refund ? `<div class="status-box ok">${t('to_refund', { v: money(order.actual_to_refund) })}</div>` : ''}
    </div>` : `
    <div class="total-row"><span>${t('total')}</span><span>${money(order.final_total)}</span></div>
    ${order.to_charge ? `<div class="status-box warn">${t('to_charge', { v: money(order.to_charge) })}</div>` : ''}
    ${order.to_refund ? `<div class="status-box ok">${t('to_refund', { v: money(order.to_refund) })}</div>` : ''}`}`;
}

function printContract() {
  const order = window._lastOrder;
  if (!order) return;
  const biz = state.settings.business_name || t('app_title');
  const lines = order.items.map((oi) => `
    <tr><td>${esc(oi.name)}</td>
    <td>${esc(oi.kind)}</td>
    <td>${oi.units.map((u) => esc(unitLabel(u))).join(', ')}</td>
    <td class="right">${money(oi.cost)}</td></tr>`).join('');
  printHtml(t('contract_title_short', { id: order.id }), `
    <h1>${esc(biz)}</h1>
    <h2>${t('contract_title', { id: order.id })}</h2>
    <div class="grid">
      <div><b>${t('client_label', { name: '' })}</b> ${esc(order.client ? order.client.name : '')}</div>
      <div><b>${t('phone_label')}</b> ${esc(order.client ? order.client.phone : '')}</div>
      <div><b>${t('issue_date')}</b> ${fmtDT(order.started_at)}</div>
      <div><b>${t('return_plan')}</b> ${fmtDT(order.planned_end)}</div>
      <div><b>${t('deposit_label')}</b> ${money(order.deposit)}</div>
      <div><b>${t('comment_label')}</b> ${esc(order.notes)}</div>
    </div>
    <table><thead><tr><th>${t('position')}</th><th>${t('kind')}</th><th>${t('issued_barcodes')}</th><th class="right">${t('amount')}</th></tr></thead><tbody>${lines}</tbody></table>
    <p class="tot">${t('estimated_cost', { v: money(order.estimated_total) })}</p>
    <p class="small">${t('contract_disclaimer')}</p>
    <div class="sig"><div>${t('sign_client')}</div><div>${t('sign_manager')}</div></div>`);
}

async function renderActiveList(activeOrders) {
  const el = $('#active-list');
  if (!el) return;
  if (!activeOrders) activeOrders = await api('/api/orders/active');
  if (!activeOrders.length) { el.innerHTML = '<div class="muted">' + t('no_active_orders') + '</div>'; return; }
  el.innerHTML = activeOrders.map((o) => `
    <div class="line">
      <b>#${o.id}</b> ${esc(o.client_name)}
      <span class="small">${fmtDT(o.started_at)}</span>
      ${o.overdue ? `<span class="badge overdue">${t('overdue_badge')}</span>` : ''}
      <span class="small">${t('not_returned_count', { n: o.units_left })}</span>
      <button class="btn sm" onclick="goReceive(${o.id})">${t('receive_btn')}</button>
    </div>`).join('');
}

function goReceive(id) { state.receiveOrderId = id; switchTab('receive', true); }

async function renderReceive() {
  const el = $('#tab-receive');
  const activeOrders = await api('/api/orders/active');
  const cards = activeOrders.map(orderCardHtml).join('');
  const selHtml = `
    <div class="card">
      <h2>${t('receive_title')} <span class="small muted">${t('active_orders')}: ${activeOrders.length}</span></h2>
      <div class="row scan-row"><input id="receive-scanner" class="scanner-input" aria-label="${t('scan_input_ph')}" placeholder="${t('scan_input_ph')}" onkeydown="if(event.key==='Enter'){event.preventDefault();scanFromInput(this)}"><div class="scan-hint">${t('receive_scan_hint')}</div></div>
      <div class="row" style="margin-top:8px"><button class="btn ghost" onclick="renderReceive()">${t('refresh')}</button></div>
    </div>`;
  el.innerHTML = selHtml + (cards || `<div class="card muted">${t('no_active_orders')}</div>`);
  if (state.receiveOrderId) {
    const card = $('#rc-' + state.receiveOrderId);
    if (card) {
      card.scrollIntoView({ block: 'start', behavior: 'smooth' });
      card.classList.add('flash');
      setTimeout(() => card.classList.remove('flash'), 1200);
    }
  }
}

function orderCardHtml(o) {
  const notRet = o.items.map((oi) => oi.units.filter((u) => !u.return_time).length).reduce((a, b) => a + b, 0);
  const ret = o.items.map((oi) => oi.units.filter((u) => u.return_time).length).reduce((a, b) => a + b, 0);
  const buildUnitDiv = (u) => `<div class="line">
    <span class="mono">${esc(unitLabel(u))}</span>
    ${u.return_time
      ? `<span class="badge returned">${t('returned_at', { t: fmtDT(u.return_time) })}</span>${u.condition_ok ? '' : `<span class="badge service">${t('damage')}</span>`}`
      : `<button class="btn sm" onclick="conditionModal(${o.id}, ${u.id})">${t('receive_btn')}</button>`}
  </div>`;
  const groupByKit = o.items.flatMap((oi) => oi.units).reduce((m, u) => {
    const k = u.kit_set != null ? 'k' + u.kit_set : 'other';
    (m[k] = m[k] || []).push(u);
    return m;
  }, {});
  const kitKeys = Object.keys(groupByKit).filter((k) => k.startsWith('k')).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  const parts = [];
  kitKeys.forEach((k, i) => {
    const setNum = Number(k.slice(1));
    const name = t('kit_set') + ' #' + setNum;
    const uns = groupByKit[k].filter((x) => !x.return_time).length;
    const tot = groupByKit[k].length;
    parts.push(`<div class="kit-block"><div class="kit-header"><b>${name}</b> <span class="small muted">${t('returned_ratio', { a: tot - uns, b: tot })}</span></div>${groupByKit[k].map(buildUnitDiv).join('')}</div>`);
  });
  if (groupByKit.other && groupByKit.other.length) {
    const uns = groupByKit.other.filter((x) => !x.return_time).length;
    const tot = groupByKit.other.length;
    parts.push(`<div class="kit-block"><div class="kit-header"><b>${t('items_other')}</b> <span class="small muted">${t('returned_ratio', { a: tot - uns, b: tot })}</span></div>${groupByKit.other.map(buildUnitDiv).join('')}</div>`);
  }
  const rows = o.items.map((oi) => `<tr><td>${esc(oi.name)}</td><td>${oi.units.map((u) => buildUnitDiv(u)).join('') || '<span class="small muted">—</span>'}</td></tr>`).join('');
  return `
    <div class="card order-card" id="rc-${o.id}">
      <div class="row">
        <h3 style="margin:0">${t('order_for', { id: o.id, name: esc(o.client ? o.client.name : '') })}</h3>
        <span class="badge active">${t('returned_ratio', { a: ret, b: ret + notRet })}</span>
        ${o.overdue ? `<span class="badge overdue">${t('overdue_badge')}</span>` : ''}
      </div>
      <div class="row small">
        <div>${t('issue_at')} <b>${fmtDT(o.started_at)}</b></div>
        <div>${t('return_plan_at')} <b>${fmtDT(o.planned_end)}</b></div>
        <div>${t('received_label', { v: money(o.deposit + o.paid) })}</div>
      </div>
      <div class="kit-wrap">${parts.join('') || rows}</div>
      <div style="margin-top:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px">
        <div class="row small">
          <div>${t('plan_cost', { v: money(o.estimated_total) })}</div>
          <div><b>${t('actual_cost', { v: money(o.actual_total) })}</b>${o.late_fee ? ` <span class="badge overdue">${t('late_fee_badge', { v: money(o.late_fee) })}</span>` : ''}</div>
          <div>${t('deposit_col')}: ${money(o.deposit)}</div>
        </div>
        ${o.actual_to_charge ? `<div class="status-box warn">${t('to_charge', { v: money(o.actual_to_charge) })}</div>` : ''}
        ${o.actual_to_refund ? `<div class="status-box ok">${t('to_refund', { v: money(o.actual_to_refund) })}</div>` : ''}
      </div>
      ${notRet === 0 ? `
        <div class="status-box ok" style="margin-top:12px">${t('all_returned_total', { v: money(o.actual_total) })}</div>
        <div class="total-row"><span>${t('deposit')}</span><span>${money(o.deposit)}</span></div>
        <div class="total-row"><span>${t('paid')}</span><span>${money(o.paid)}</span></div>
        <div class="row" style="margin-top:12px">
          <button class="btn ghost" onclick="recordPaymentModal(${o.id})">${t('pay_refund')}</button>
          <button class="btn green" onclick="closeOrder(${o.id})">${t('close_order')}</button>
          <button class="btn ghost" onclick="printOrderReceipt(${o.id})">${t('print_receipt')}</button>
        </div>` : ''}
    </div>`;
}

function conditionModal(orderId, unitId) {
  openModal(t('item_condition'), `
    <p>${t('condition_hint')}</p>
    <div class="row">
      <button class="btn green" onclick="returnUnitDone(${orderId}, ${unitId}, 1, '')">${t('ok_cond')}</button>
      <button class="btn red" onclick="returnUnitModalNote(${orderId}, ${unitId})">${t('damage')}</button>
      <button class="btn ghost" onclick="closeModal()">${t('cancel')}</button>
    </div>`);
}

function returnUnitModalNote(orderId, unitId) {
  openModal(t('damage'), `
    <label>${t('damage_desc')}</label>
    <textarea id="dam-note" rows="2"></textarea>
    <div class="row" style="margin-top:12px">
      <button class="btn red" onclick="returnUnitDone(${orderId}, ${unitId}, 0, $('#dam-note').value)">${t('record')}</button>
      <button class="btn ghost" onclick="closeModal()">${t('cancel')}</button>
    </div>`);
}

async function returnUnitDone(orderId, unitId, ok, note) {
  try {
    await api('/api/orders/' + orderId + '/return-unit', {
      method: 'POST', body: JSON.stringify({ unit_id: unitId, condition_ok: ok, condition_note: note }) });
    closeModal();
    toast(ok ? t('accepted') : t('damage_recorded'));
    state.receiveOrderId = orderId;
    await renderReceive();
    const scanner = $('#receive-scanner');
    if (scanner) scanner.focus();
  } catch (e) { toast(e.message); }
}

async function closeOrder(id) {
  try {
    const order = await api('/api/orders/' + id + '/close', { method: 'POST', body: JSON.stringify({}) });
    toast(t('order_closed_total', { id, v: money(order.final_total) }));
    state.receiveOrderId = null;
    await renderReceive();
  } catch (e) { toast(e.message); }
}

async function recordPaymentModal(orderId) {
  const order = await api('/api/orders/' + orderId);
  openModal(t('payment_order', { id: orderId }), `
    <div class="small">${t('payment_summary', { v: money(order.final_total), d: money(order.deposit), p: money(order.paid), r: money(order.refunded) })}</div>
    <div class="row" style="margin-top:10px">
      <div class="grow"><label>${t('amount')}</label><input id="pay-amount" type="number" min="0.01" step="0.01"></div>
      <div class="grow"><label>${t('kind')}</label>
        <select id="pay-type">
          <option value="payment">${t('pay')}</option>
          <option value="deposit">${t('deposit')}</option>
          <option value="refund">${t('refund_type')}</option>
        </select>
      </div>
      <div class="grow"><label>${t('method')}</label>
        <select id="pay-method"><option value="cash">${t('cash')}</option><option value="card">${t('card')}</option></select>
      </div>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn green" onclick="savePayment(${orderId})">${t('save')}</button>
      <button class="btn ghost" onclick="closeModal()">${t('cancel')}</button>
    </div>`);
}

async function savePayment(orderId) {
  try {
    const order = await api('/api/orders/' + orderId + '/payment', {
      method: 'POST', body: JSON.stringify({
        amount: parseFloat($('#pay-amount').value) || 0,
        type: $('#pay-type').value,
        method: $('#pay-method').value }) });
    closeModal();
    toast(t('saved'));
    if (state.tab === 'receive') await renderReceive();
    else {
      updateOrderRow(order);
      await orderInfo(orderId);
    }
  } catch (e) { toast(e.message); }
}

async function renderOrders() {
  const el = $('#tab-orders');
  el.innerHTML = `
    <div class="card">
      <h2>${t('orders_title')}</h2>
      <div class="row">
        <div class="grow"><input id="o-search" placeholder="${t('search_number_ph')}" oninput="filterOrders(this.value)"></div>
      </div>
      <table style="margin-top:8px"><thead><tr><th>${t('num')}</th><th>${t('client_col')}</th><th>${t('issue_col')}</th><th>${t('plan_return_col')}</th><th>${t('status_col')}</th><th class="right">${t('order_total_col')}</th></tr></thead><tbody id="o-tbody"></tbody></table>
      <button id="o-more" class="btn ghost" style="margin-top:10px" onclick="loadMoreOrders()" hidden>${t('load_more')}</button>
    </div>`;
  state.orderOffset = 0;
  state.orderQuery = '';
  await loadOrderPage(true);
}

function filterOrders(q) {
  clearTimeout(state.orderSearchTimer);
  state.orderSearchTimer = setTimeout(() => {
    state.orderQuery = q.trim();
    loadOrderPage(true);
  }, 250);
}

async function loadOrderPage(reset) {
  const tbody = $('#o-tbody');
  if (!tbody) return;
  if (reset) {
    state.orderOffset = 0;
    tbody.innerHTML = '';
  }
  const params = new URLSearchParams({ limit: '200', offset: String(state.orderOffset || 0), q: state.orderQuery || '' });
  const page = await api('/api/orders?' + params.toString());
  const rows = page.map(orderRowHtml).join('');
  tbody.insertAdjacentHTML('beforeend', rows);
  state.orderOffset = (state.orderOffset || 0) + page.length;
  const more = $('#o-more');
  if (more) more.hidden = page.length < 200;
}

function loadMoreOrders() { loadOrderPage(false); }

function orderRowHtml(o) {
  return `<tr data-order-id="${o.id}" onclick="orderInfo(${o.id})">
    <td><button class="table-link" aria-label="${t('order_title', { id: o.id })}" onclick="event.stopPropagation();orderInfo(${o.id})"><b>#${o.id}</b></button></td>
    <td>${esc(o.client_name || '')}</td>
    <td>${fmtDT(o.started_at)}</td>
    <td>${fmtDT(o.planned_end)}</td>
    <td>${statusBadge(o.status)}${o.status !== 'active' ? `<div class="small muted">${fmtDT(o.ended_at)}</div>` : ''}</td>
    <td class="right"><div class="amount">${money(o.order_total)}</div>${paymentStatusBadge(o.payment_status)}</td></tr>`;
}

function updateOrderRow(order) {
  const row = $(`#o-tbody tr[data-order-id="${order.id}"]`);
  if (!row) return;
  const netReceived = Number(order.deposit) + Number(order.paid) - Number(order.refunded);
  const due = Math.round((Number(order.final_total) - netReceived + Number.EPSILON) * 100) / 100;
  row.outerHTML = orderRowHtml({
    ...order,
    client_name: order.client ? order.client.name : '',
    order_total: order.final_total,
    payment_status: due <= 0 ? 'paid' : netReceived > 0 ? 'partial' : 'unpaid'
  });
}

async function orderInfo(id) {
  const order = await api('/api/orders/' + id);
  const payments = order.payments.map((p) => `<tr><td>${fmtDT(p.created_at)}</td><td>${esc(p.type)}</td><td>${esc(p.method)}</td><td class="right">${p.type === 'refund' ? '-' : ''}${money(p.amount)}</td></tr>`).join('');
  openModal(t('order_title', { id }), orderDetailHtml(order) + `
    <h3>${t('payments')}</h3>
    <table><thead><tr><th>${t('date')}</th><th>${t('kind')}</th><th>${t('method')}</th><th class="right">${t('amount')}</th></tr></thead><tbody>${payments || '<tr><td colspan="4" class="muted">' + t('no_payments') + '</td></tr>'}</tbody></table>
    <div class="row" style="margin-top:14px">
      <button class="btn" onclick="printOrderReceipt2(${order.id})">${t('print')}</button>
      <button class="btn ghost" onclick="recordPaymentModal(${order.id})">${t('payment')}</button>
      ${order.status === 'active' ? `<button class="btn red" onclick="cancelOrder(${order.id})">${t('cancel_order_btn')}</button>` : ''}
      <button class="btn ghost" onclick="closeModal()">${t('close')}</button>
    </div>`);
}

async function cancelOrder(id) {
  if (!confirmAction(t('cancel_confirm', { id }))) return;
  await api('/api/orders/' + id + '/cancel', { method: 'POST' });
  closeModal();
  toast(t('order_canceled', { id }));
  if (state.tab === 'issue') await renderIssue();
  else renderOrders();
}

function printOrderReceipt(id) { printOrderReceipt2(id); }
async function printOrderReceipt2(id) {
  const order = await api('/api/orders/' + id);
  const biz = state.settings.business_name || t('app_title');
  const rows = order.items.map((oi) => `<tr><td>${esc(oi.name)}</td><td class="right">${money(oi.cost)}</td></tr>`).join('');
  printHtml(t('receipt_title_short', { id: order.id }), `
    <h1>${esc(biz)}</h1>
    <h2>${t('receipt_title', { id: order.id })}</h2>
    <div class="grid">
      <div><b>${t('client_label', { name: '' })}</b> ${esc(order.client ? order.client.name : '')}</div>
      <div><b>${t('phone_label')}</b> ${esc(order.client ? order.client.phone : '')}</div>
      <div><b>${t('issue_at')}</b> ${fmtDT(order.started_at)}</div>
      <div><b>${t('return_at')}</b> ${fmtDT(order.ended_at || order.planned_end)}</div>
    </div>
    <table><thead><tr><th>${t('position')}</th><th class="right">${t('amount')}</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="tot">${t('total')}: ${money(order.final_total)}</div>
    <p class="small">${t('deposit_label')} ${money(order.deposit)} · ${t('paid')}: ${money(order.paid)} ${order.to_refund ? '· ' + t('to_refund', { v: money(order.to_refund) }) : ''}</p>`);
}

async function renderInv() {
  const el = $('#tab-inv');
  const [items, cats] = await Promise.all([api('/api/items'), api('/api/categories')]);
  state.categories = cats;
  const total = items.length;
  const stock = items.filter((i) => i.status === 'in_stock').length;
  const rented = items.filter((i) => i.status === 'rented').length;
  const service = items.filter((i) => i.status === 'service').length;

  const rows = items.map((i) => `
    <tr>
      <td class="mono">${esc(i.barcode)}</td>
      <td>${esc(i.cat_name)}</td>
      <td>${esc(i.brand)} ${esc(i.model)}</td>
      <td>${esc(i.size)}</td>
      <td>${statusBadge(i.status)}</td>
      <td>${esc(i.cond)}</td>
      <td class="row" style="align-items:center;gap:4px">
        <button class="btn sm ghost" onclick="labelWin(${i.id})">${t('label')}</button>
        <button class="btn sm ghost" onclick="itemEdit(${i.id})">${t('edit')}</button>
        <button class="btn sm red" onclick="itemRetire(${i.id})">${t('retire')}</button>
      </td>
    </tr>`).join('');

  el.innerHTML = `
    <div class="card">
      <h2>${t('stock_title')}</h2>
      <div class="row">
        <span class="badge in_stock">${t('in_stock_count', { n: stock })}</span>
        <span class="badge rented">${t('rented_count', { n: rented })}</span>
        <span class="badge service">${t('service_count', { n: service })}</span>
        <span class="small">${t('total_count', { n: total })}</span>
      </div>
      <div class="row" style="margin-top:10px">
        <div class="grow"><input id="inv-f" placeholder="${t('inv_search_ph')}" oninput="filterInv(this.value)"></div>
        <select id="inv-cat" onchange="filterInv()"><option value="">${t('all_categories')}</option>${cats.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
        <button class="btn" onclick="itemAddModal()">${t('add_item')}</button>
        <button class="btn ghost" onclick="printLabelsSelected()">${t('print_stock_labels')}</button>
      </div>
      <div style="max-height:520px;overflow:auto;margin-top:8px">
      <table><thead><tr><th>${t('barcode')}</th><th>${t('type')}</th><th>${t('model')}</th><th>${t('size')}</th><th>${t('status_col')}</th><th>${t('condition')}</th><th></th></tr></thead><tbody id="inv-tbody">${rows}</tbody></table>
      </div>
    </div>`;
  window._items = items;
  window._selLabels = new Set();
}

function filterInv(q) {
  const tbody = $('#inv-tbody');
  if (!tbody) return;
  const items = window._items || [];
  const cat = $('#inv-cat') ? $('#inv-cat').value : '';
  const sq = ($('#inv-f') ? $('#inv-f').value : '').toLowerCase();
  const f = items.filter((i) => (!cat || i.category_id == cat) && (!sq || (i.barcode + i.brand + i.model + i.size + i.cat_name).toLowerCase().includes(sq)));
  tbody.innerHTML = f.map((i) => `
    <tr>
      <td class="mono">${esc(i.barcode)}</td>
      <td>${esc(i.cat_name)}</td>
      <td>${esc(i.brand)} ${esc(i.model)}</td>
      <td>${esc(i.size)}</td>
      <td>${statusBadge(i.status)}</td>
      <td>${esc(i.cond)}</td>
      <td class="row" style="align-items:center;gap:4px">
        <button class="btn sm ghost" onclick="labelWin(${i.id})">${t('label')}</button>
        <button class="btn sm ghost" onclick="itemEdit(${i.id})">${t('edit')}</button>
        <button class="btn sm red" onclick="itemRetire(${i.id})">${t('retire')}</button>
      </td>
    </tr>`).join('');
}

function labelWin(id) {
  window.open('/labels.html?ids=' + id, '_blank', 'width=600,height=500');
}

function printLabelsSelected() {
  const items = window._items || [];
  const ids = items.filter((i) => i.status === 'in_stock').map((i) => i.id);
  if (!ids.length) return toast(t('no_stock'));
  if (!confirmAction(t('print_all_labels_confirm', { n: ids.length }))) return;
  window.open('/labels.html?ids=' + ids.join(','), '_blank', 'width=600,height=500');
}

async function itemAddModal() {
  const cats = await api('/api/categories');
  const nb = await api('/api/items/next-barcode');
  openModal(t('add_item'), `
    <div class="grid-2">
      <div><label>${t('category')}</label><select id="a-cat">${cats.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
      <div><label>${t('count')}</label><input id="a-count" type="number" value="1" min="1"></div>
      <div><label>${t('brand')}</label><input id="a-brand" placeholder="Atomic"></div>
      <div><label>${t('model')}</label><input id="a-model"></div>
      <div><label>${t('size_full')}</label><input id="a-size" placeholder="170"></div>
      <div><label>${t('barcode_auto')}</label><input id="a-barcode" readonly value="${nb.barcode}" title="${t('barcode_next_title')}"></div>
      <div><label>${t('condition')}</label><input id="a-cond" value="Хорошее"></div>
      <div><label>${t('notes')}</label><input id="a-notes"></div>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn green" onclick="itemAddDo()">${t('add')}</button>
      <button class="btn ghost" onclick="closeModal()">${t('cancel')}</button>
    </div>`);
}

async function itemAddDo() {
  try {
    const r = await api('/api/items', {
      method: 'POST', body: JSON.stringify({
        category_id: parseInt($('#a-cat').value), count: parseInt($('#a-count').value) || 1,
        brand: $('#a-brand').value, model: $('#a-model').value, size: $('#a-size').value,
        barcode: '', cond: $('#a-cond').value, notes: $('#a-notes').value }) });
    closeModal();
    toast(t('added_count', { n: r.created.length }));
    renderInv();
  } catch (e) { toast(e.message); }
}

async function itemEdit(id) {
  const item = (window._items || []).find((i) => i.id === id);
  if (!item) return;
  const cats = await api('/api/categories');
  openModal(t('edit_item', { bc: item.barcode }), `
    <div class="grid-2">
      <div><label>${t('category')}</label><select id="e-cat" ${item.status === 'rented' ? 'disabled' : ''}>${cats.map((c) => `<option value="${c.id}" ${c.id === item.category_id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
      <div><label>${t('status')}</label><select id="e-status" ${['rented', 'retired'].includes(item.status) ? 'disabled' : ''}>
        ${item.status === 'retired' ? `<option value="retired" selected>${t('st_retired')}</option>` : ''}
        ${item.status === 'rented' ? `<option value="rented" selected>${t('st_rented')}</option>` : ''}
        <option value="in_stock" ${item.status === 'in_stock' ? 'selected' : ''}>${t('st_in_stock')}</option>
        <option value="service" ${item.status === 'service' ? 'selected' : ''}>${t('st_service')}</option>
      </select></div>
      <div><label>${t('brand')}</label><input id="e-brand" value="${esc(item.brand)}"></div>
      <div><label>${t('model')}</label><input id="e-model" value="${esc(item.model)}"></div>
      <div><label>${t('size')}</label><input id="e-size" value="${esc(item.size)}"></div>
      <div><label>${t('condition')}</label><input id="e-cond" value="${esc(item.cond)}"></div>
      <div><label>${t('notes')}</label><input id="e-notes" value="${esc(item.notes)}"></div>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn green" onclick="itemSave(${item.id})">${t('save')}</button>
      <button class="btn ghost" onclick="closeModal()">${t('cancel')}</button>
    </div>`);
}

async function itemSave(id) {
  await api('/api/items/' + id, {
    method: 'PUT', body: JSON.stringify({
      category_id: $('#e-cat').disabled ? undefined : parseInt($('#e-cat').value), status: $('#e-status').disabled ? undefined : $('#e-status').value,
      brand: $('#e-brand').value, model: $('#e-model').value, size: $('#e-size').value,
      cond: $('#e-cond').value, notes: $('#e-notes').value }) });
  closeModal();
  renderInv();
}

async function itemRetire(id) {
  const item = (window._items || []).find((i) => i.id === id);
  if (!item) return;
  if (!confirmAction(t('retire_confirm', { bc: item.barcode, model: item.brand + ' ' + item.model }))) return;
  await api('/api/items/' + id + '/retire', { method: 'POST' });
  toast(t('retired_done'));
  renderInv();
}

async function renderInvCheck() {
  const el = $('#tab-invcheck');
  const sessions = await api('/api/inventory/sessions');
  if (state.invSessionId && !sessions.some((s) => s.id === state.invSessionId && !s.ended_at)) state.invSessionId = null;
  if (!state.invSessionId) {
    const active = sessions.find((s) => !s.ended_at);
    if (active) state.invSessionId = active.id;
  }
  const started = state.invSessionId ? await api('/api/inventory/sessions/' + state.invSessionId).catch(() => null) : null;

  let sessionHtml = '';
  if (started) {
    const scannedTotal = started.scannedRows.length;
    const expectedTotal = started.expected.reduce((s, e) => s + e.total, 0);
    const countsByCat = {};
    started.scannedRows.forEach((r) => { const k = r.cat_name; countsByCat[k] = (countsByCat[k] || 0) + 1; });
    const expRows = started.expected.map((e) => `
      <tr><td>${esc(e.cat_name)}</td><td class="right">${e.total}</td><td class="right">${countsByCat[e.cat_name] || 0}</td><td class="right">${Math.max(0, e.total - (countsByCat[e.cat_name] || 0))}</td></tr>`).join('');
    sessionHtml = `
      <div class="card">
        <h3>${t('session_active', { id: started.session.id })}</h3>
        <p class="small">${fmtDT(started.session.started_at)} · ${esc(started.session.note)}</p>
        <div class="row scan-row"><input id="inventory-scanner" class="scanner-input" aria-label="${t('scan_input_ph')}" placeholder="${t('scan_input_ph')}" onkeydown="if(event.key==='Enter'){event.preventDefault();scanFromInput(this)}"><div class="scan-hint">${t('inv_session_hint', { s: scannedTotal, exp: expectedTotal })}</div></div>
        <table style="margin-top:8px"><thead><tr><th>${t('category')}</th><th class="right">${t('expected')}</th><th class="right">${t('scanned')}</th><th class="right">${t('missing')}</th></tr></thead><tbody>${expRows}</tbody></table>
        <div class="row" style="margin-top:12px">
          <button class="btn ghost" onclick="renderInvCheck()">${t('refresh')}</button>
          <button class="btn green" onclick="finishInvSession()">${t('finish_show_missing')}</button>
        </div>
      </div>`;
  } else {
    sessionHtml = `
      <div class="card">
        <h3>${t('new_inventory')}</h3>
        <div class="row">
          <div class="grow"><label>${t('notes')}</label><input id="iv-note" placeholder="${t('inv_note_ph')}"></div>
          <button class="btn green" onclick="startInvSession()">${t('start')}</button>
        </div>
      </div>`;
  }

  el.innerHTML = sessionHtml + `
    <div class="card">
      <h3>${t('session_history')}</h3>
      ${sessions.map((s) => `
        <div class="line">
          <b>#${s.id}</b>
          <span class="small">${fmtDT(s.started_at)}</span>
          <span class="small">${esc(s.note)}</span>
          ${s.ended_at ? `<span class="badge returned">${t('finished')}</span>` : `<span class="badge active">${t('in_progress')}</span>`}
           ${s.ended_at ? `<button class="btn sm ghost" onclick="invSessionReport(${s.id})">${t('report')}</button>` : `<button class="btn sm" onclick="resumeInvSession(${s.id})">${t('resume')}</button>`}
        </div>`).join('') || '<div class="muted">' + t('no_sessions') + '</div>'}
    </div>`;
}

async function resumeInvSession(id) {
  const { session } = await api('/api/inventory/sessions/' + id);
  if (!session || session.ended_at) return toast(t('not_finished'));
  state.invSessionId = session.id;
  renderInvCheck();
}

async function startInvSession() {
  const note = $('#iv-note') ? $('#iv-note').value : '';
  const s = await api('/api/inventory/sessions', { method: 'POST', body: JSON.stringify({ note }) });
  state.invSessionId = s.id;
  toast(t('session_started', { id: s.id }));
  renderInvCheck();
}

async function finishInvSession() {
  const started = await api('/api/inventory/sessions/' + state.invSessionId);
  openModal(t('inventory_title', { id: started.session.id }), `
    <h3>${t('missing_count', { n: started.missed.length })}</h3>
    <div style="max-height:300px;overflow:auto">
    <table><thead><tr><th>${t('barcode')}</th><th>${t('type')}</th><th>${t('model')}</th><th>${t('size')}</th><th>${t('status_col')}</th></tr></thead><tbody>
      ${started.missed.map((m) => `<tr><td class="mono">${esc(m.barcode)}</td><td>${esc(m.cat_name)}</td><td>${esc(m.brand)} ${esc(m.model)}</td><td>${esc(m.size)}</td><td>${statusBadge(m.status)}</td></tr>`).join('')}
    </tbody></table>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn green" onclick="finishInvSessionDone()">${t('finish_session')}</button>
      <button class="btn ghost" onclick="closeModal()">${t('continue_btn')}</button>
    </div>`);
}

async function finishInvSessionDone() {
  await api('/api/inventory/sessions/' + state.invSessionId + '/finish', { method: 'POST' });
  state.invSessionId = null;
  closeModal();
  toast(t('completed'));
  renderInvCheck();
}

async function invSessionReport(id) {
  const started = await api('/api/inventory/sessions/' + id);
  const countsByCat = {};
  started.scannedRows.forEach((r) => { const k = r.cat_name; countsByCat[k] = (countsByCat[k] || 0) + 1; });
  openModal(t('inv_report_title', { id }), `
    <p class="small">${fmtDT(started.session.started_at)} → ${started.session.ended_at ? fmtDT(started.session.ended_at) : t('not_finished')} · ${esc(started.session.note)}</p>
    <table><thead><tr><th>${t('category')}</th><th class="right">${t('expected')}</th><th class="right">${t('scanned')}</th><th class="right">${t('missing')}</th></tr></thead><tbody>
      ${started.expected.map((e) => `<tr><td>${esc(e.cat_name)}</td><td class="right">${e.total}</td><td class="right">${countsByCat[e.cat_name] || 0}</td><td class="right">${Math.max(0, e.total - (countsByCat[e.cat_name] || 0))}</td></tr>`).join('')}
    </tbody></table>
    <div class="row" style="margin-top:12px"><button class="btn ghost" onclick="printInvReport(${id})">${t('print')}</button><button class="btn ghost" onclick="closeModal()">${t('close')}</button></div>`);
}

async function printInvReport(id) {
  const started = await api('/api/inventory/sessions/' + id);
  const countsByCat = {};
  started.scannedRows.forEach((r) => { const k = r.cat_name; countsByCat[k] = (countsByCat[k] || 0) + 1; });
  const biz = state.settings.business_name || t('app_title');
  const rows = started.expected.map((e) => `<tr><td>${esc(e.cat_name)}</td><td class="right">${e.total}</td><td class="right">${countsByCat[e.cat_name] || 0}</td><td class="right">${Math.max(0, e.total - (countsByCat[e.cat_name] || 0))}</td></tr>`).join('');
  printHtml(t('inventory_title', { id }), `
    <h1>${esc(biz)}</h1>
    <h2>${t('inv_report_no', { id, t: fmtDT(started.session.started_at) })}</h2>
    <table><thead><tr><th>${t('category')}</th><th class="right">${t('expected')}</th><th class="right">${t('scanned')}</th><th class="right">${t('missing')}</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="sig"><div>${t('conducted')}</div><div>${t('approved')}</div></div>`);
}

async function renderClients() {
  const el = $('#tab-clients');
  const clients = await api('/api/clients');
  const rows = clients.map((c) => `
    <tr onclick="clientInfo(${c.id})">
      <td><button class="table-link" aria-label="${t('client_name_title', { name: esc(c.name) })}" onclick="event.stopPropagation();clientInfo(${c.id})"><b>${esc(c.name)}</b></button></td>
      <td>${esc(c.phone)}</td>
      <td>${esc(c.doc)}</td>
      <td class="small">${esc(c.notes)}</td>
    </tr>`).join('');
  el.innerHTML = `
    <div class="card">
      <div class="row">
        <h2 style="margin:0">${t('clients_title')}</h2>
        <div class="grow"><input id="c-search" placeholder="${t('search_ph')}" oninput="filterClients(this.value)"></div>
        <button class="btn" onclick="newClientModal()">${t('new_client')}</button>
      </div>
      <div style="max-height:520px;overflow:auto;margin-top:8px">
      <table><thead><tr><th>${t('full_name')}</th><th>${t('phone_col')}</th><th>${t('doc_col')}</th><th>${t('notes')}</th></tr></thead><tbody id="c-tbody">${rows}</tbody></table>
      </div>
    </div>`;
  window._clients = clients;
}

function filterClients(q) {
  const tbody = $('#c-tbody');
  const f = (window._clients || []).filter((c) => (c.name + c.phone + c.doc).toLowerCase().includes(q.toLowerCase()));
  tbody.innerHTML = f.map((c) => `
    <tr onclick="clientInfo(${c.id})">
      <td><button class="table-link" aria-label="${t('client_name_title', { name: esc(c.name) })}" onclick="event.stopPropagation();clientInfo(${c.id})"><b>${esc(c.name)}</b></button></td><td>${esc(c.phone)}</td><td>${esc(c.doc)}</td><td class="small">${esc(c.notes)}</td>
    </tr>`).join('');
}

function newClientModal(selOnCreate) {
  state._selOnCreate = selOnCreate || false;
  openModal(t('new_client'), `
    <div class="grid-2">
      <div><label>${t('full_name')}</label><input id="n-name" placeholder="${t('name_ph')}"></div>
      <div><label>${t('phone_col')}</label><input id="n-phone" placeholder="${t('phone_ph')}"></div>
      <div><label>${t('doc_col')}</label><input id="n-doc" placeholder="${t('doc_ph')}"></div>
      <div><label>${t('notes')}</label><input id="n-notes"></div>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn green" onclick="clientCreateDo()">${t('create')}</button>
      <button class="btn ghost" onclick="closeModal()">${t('cancel')}</button>
    </div>`);
}

async function clientCreateDo() {
  const name = $('#n-name').value.trim();
  if (!name) return toast(t('enter_name'));
  const c = await api('/api/clients', {
    method: 'POST', body: JSON.stringify({
      name, phone: $('#n-phone').value, doc: $('#n-doc').value, notes: $('#n-notes').value }) });
  closeModal();
  toast(t('client_added'));
  if (state._selOnCreate || state.tab === 'issue') {
    if (state.tab === 'issue') { setClientBox(c); }
  }
  if (state.tab === 'clients') renderClients();
}

async function clientModal() {
  const clients = await api('/api/clients');
  openModal(t('client_pick_title'), `
    <input id="cx-search" placeholder="${t('search_ph')}" oninput="clientSearchList(this.value)">
    <div id="cx-list" style="max-height:360px;overflow:auto;margin-top:8px">
      ${clients.map((c) => clientPickerRow(c)).join('')}
    </div>`);
  window._clients2 = clients;
}

function clientPickerRow(c) {
  return `<div class="line" onclick="pickClient(${c.id})">
    <b>${esc(c.name)}</b> <span class="small">${esc(c.phone)}</span>
    <button class="btn sm" onclick="event.stopPropagation(); pickClient(${c.id})">${t('choose')}</button></div>`;
}

function clientSearchList(q) {
  const list = window._clients2 || [];
  const f = list.filter((c) => (c.name + c.phone).toLowerCase().includes(q.toLowerCase()));
  $('#cx-list').innerHTML = f.map((c) => clientPickerRow(c)).join('');
}

function pickClient(id) {
  const c = (window._clients2 || []).find((x) => x.id === id);
  setClientBox(c);
  closeModal();
  toast(t('client_selected'));
}

async function clientInfo(id) {
  const clients = window._clients || await api('/api/clients');
  const c = clients.find((x) => x.id === id);
  if (!c) return;
  const hist = await api('/api/clients/' + id + '/orders?limit=20');
  const histRows = hist.map((o) => `<tr><td><b>#${o.id}</b></td><td>${fmtDT(o.started_at)}</td><td>${statusBadge(o.status)}${o.status !== 'active' ? `<div class="small muted">${fmtDT(o.ended_at)}</div>` : ''}</td><td class="right"><div class="amount">${money(o.order_total)}</div>${paymentStatusBadge(o.payment_status)}</td></tr>`).join('');
  openModal(t('client_name_title', { name: c.name }), `
    <p>${t('client_info_line', { phone: esc(c.phone), doc: esc(c.doc) })}</p>
    <p class="small">${esc(c.notes)}</p>
    <h3>${t('order_history')}</h3>
     <table><thead><tr><th>${t('num')}</th><th>${t('date')}</th><th>${t('status_col')}</th><th class="right">${t('order_total_col')}</th></tr></thead><tbody>${histRows || '<tr><td colspan="4">' + t('no_orders') + '</td></tr>'}</tbody></table>
    <div class="row" style="margin-top:12px">
      <button class="btn" onclick="editClientModal(${c.id})">${t('edit')}</button>
      <button class="btn ghost" onclick="closeModal()">${t('close')}</button>
    </div>`);
}

async function editClientModal(id) {
  const clients = window._clients || await api('/api/clients');
  const c = clients.find((x) => x.id === id);
  openModal(t('edit_client'), `
    <div class="grid-2">
      <div><label>${t('full_name')}</label><input id="ed-name" value="${esc(c.name)}"></div>
      <div><label>${t('phone_col')}</label><input id="ed-phone" value="${esc(c.phone)}"></div>
      <div><label>${t('doc_col')}</label><input id="ed-doc" value="${esc(c.doc)}"></div>
      <div><label>${t('notes')}</label><input id="ed-notes" value="${esc(c.notes)}"></div>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn green" onclick="clientSaveDo(${c.id})">${t('save')}</button>
      <button class="btn ghost" onclick="closeModal()">${t('cancel')}</button>
    </div>`);
}

async function clientSaveDo(id) {
  await api('/api/clients/' + id, {
    method: 'PUT', body: JSON.stringify({
      name: $('#ed-name').value, phone: $('#ed-phone').value, doc: $('#ed-doc').value, notes: $('#ed-notes').value }) });
  closeModal();
  renderClients();
}

async function renderRates() {
  const el = $('#tab-rates');
  const cats = await api('/api/categories');
  const p = state.pricings;
  const kitRows = p.filter((x) => x.kind === 'kit').map((k) => `
    <tr>
      <td><b>${esc(k.name)}</b></td>
      <td class="small">${(k.kitItems || []).map((ki) => `${catName(ki.category_id)} ×${ki.qty}${ki.optional ? ' (' + t('optional_short') + ')' : ''}`).join(', ')}</td>
      <td class="right">${money(k.price_day)}</td>
      <td><button class="btn sm ghost" onclick="rateEdit(${k.id})">${t('edit_short')}</button> <button class="btn sm red" onclick="rateDel(${k.id})">${t('del_short')}</button></td>
    </tr>`).join('');
  const catRows = p.filter((x) => x.kind === 'category').map((k) => `
    <tr><td><b>${esc(k.name)}</b></td><td class="small">${t('per_unit')}</td>
      <td class="right">${money(k.price_hour)}</td><td class="right">${money(k.price_day)}</td>
      <td><button class="btn sm ghost" onclick="rateEdit(${k.id})">${t('edit_short')}</button></td></tr>`).join('');
  const svcRows = p.filter((x) => x.kind === 'service').map((k) => `
    <tr><td><b>${esc(k.name)}</b></td><td class="small">${t('service_label')}</td>
      <td class="right">${money(k.price_flat)}</td>
      <td><button class="btn sm ghost" onclick="rateEdit(${k.id})">${t('edit_short')}</button> <button class="btn sm red" onclick="rateDel(${k.id})">${t('del_short')}</button></td></tr>`).join('');
  el.innerHTML = `
    <div class="card">
      <div class="row"><h2 style="margin:0">${t('rates_title')}</h2><button class="btn" onclick="rateAdd()">${t('new_rate')}</button></div>
      <p class="small">${t('rate_intervals_hint')}</p>
    </div>
    <div class="card">
      <h3>${t('kits')}</h3>
      <p class="small">${t('kit_auto_hint')}</p><table><thead><tr><th>${t('name')}</th><th>${t('composition')}</th><th class="right">${t('price_day_col')}</th><th></th></tr></thead><tbody>${kitRows}</tbody></table>
      <h3>${t('categories_title')}</h3><table><thead><tr><th>${t('name')}</th><th>${t('type')}</th><th class="right">${t('hour')}</th><th class="right">${t('day')}</th><th></th></tr></thead><tbody>${catRows}</tbody></table>
      <h3>${t('services')}</h3><table><thead><tr><th>${t('name')}</th><th>${t('type')}</th><th class="right">${t('price')}</th><th></th></tr></thead><tbody>${svcRows}</tbody></table>
    </div>`;
}

function rateAdd() {
  openModal(t('new_rate'), rateFormHtml(null));
}
function rateEdit(id) {
  const p = state.pricings.find((x) => x.id === id);
  openModal(t('edit_rate'), rateFormHtml(p));
}
function rateFormHtml(p) {
  p = p || { id: null, kind: 'kit', name: '', price_hour: 0, price_day: 0, price_week: 0, price_season: 0, price_flat: 0, kitItems: [] };
  const cats = state.categories;
  return `
    <div class="grid-2">
      <div><label>${t('name')}</label><input id="rt-name" value="${esc(p.name)}"></div>
      <div><label>${t('type')}</label><select id="rt-kind" onchange="rtKindChange()">
        <option value="kit" ${p.kind === 'kit' ? 'selected' : ''}>${t('kit')}</option>
        <option value="category" ${p.kind === 'category' ? 'selected' : ''}>${t('category_per_unit')}</option>
        <option value="service" ${p.kind === 'service' ? 'selected' : ''}>${t('service_fixed')}</option>
      </select></div>
    </div>
    <div id="rt-cat" ${p.kind === 'category' ? '' : 'style="display:none"'}>
      <label>${t('category')}</label>
      <select id="rt-category">${cats.map((c) => `<option value="${c.id}" ${p.category_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    </div>
    <div id="rt-kit" ${p.kind === 'kit' ? '' : 'style="display:none"'}>
      <label>${t('kit_composition')}</label>
      <div id="rt-kit-lines">${(p.kitItems || []).map((ki, i) => kitLineHtml(ki, i)).join('') || kitLineHtml(null, 0)}</div>
      <button class="btn sm ghost" onclick="kitLineAdd()">${t('add_position')}</button>
    </div>
    <div class="grid-2" style="margin-top:8px">
      <div><label>${t('hour_grn')}</label><input id="rt-h" type="number" step="0.01" value="${p.price_hour}"></div>
      <div><label>${t('day_grn')}</label><input id="rt-d" type="number" step="0.01" value="${p.price_day}"></div>
      <div><label>${t('week_grn')}</label><input id="rt-w" type="number" step="0.01" value="${p.price_week}"></div>
      <div><label>${t('season_grn')}</label><input id="rt-s" type="number" step="0.01" value="${p.price_season}" readonly><span class="small">${t('season_rate_unavailable')}</span></div>
      <div style="grid-column:1/-1"><label>${t('flat_price_grn')}</label><input id="rt-f" type="number" step="0.01" value="${p.price_flat}"></div>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn green" onclick="rateSave(${p.id})">${t('save')}</button>
      <button class="btn ghost" onclick="closeModal()">${t('cancel')}</button>
    </div>`;
}
function kitLineHtml(ki, i) {
  ki = ki || { category_id: '', qty: 1, optional: false };
  const cats = state.categories;
  return `<div class="line">
    <select style="flex:1" onchange="kitLineSet(${i}, 'cat', this.value)">${cats.map((c) => `<option value="${c.id}" ${ki.category_id == c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    <input type="number" style="width:70px" value="${ki.qty}" onchange="kitLineSet(${i}, 'qty', this.value)">
    <label class="small" style="white-space:nowrap"><input type="checkbox" ${ki.optional ? 'checked' : ''} onchange="kitLineSet(${i}, 'opt', this.checked)"> ${t('optional_short')}</label>
    <button class="btn sm ghost" onclick="this.parentElement.remove()">×</button>
    </div>`;
}
function kitLineAdd() { const d = document.createElement('div'); d.innerHTML = kitLineHtml(null, $$('#rt-kit-lines .line').length); $('#rt-kit-lines').appendChild(d.firstChild); }
function kitLineSet() {}
function rtKindChange() {
  const k = $('#rt-kind').value;
  $('#rt-cat').style.display = k === 'category' ? '' : 'none';
  $('#rt-kit').style.display = k === 'kit' ? '' : 'none';
}
async function rateSave(id) {
  const kitLines = $$('#rt-kit-lines .line').map((line) => ({
    category_id: parseInt($('select', line).value),
    qty: Math.max(1, parseInt($('input[type=number]', line).value) || 1),
    optional: $('input[type=checkbox]', line) ? $('input[type=checkbox]', line).checked : false
  }));
  const body = {
    name: $('#rt-name').value,
    kind: $('#rt-kind').value,
    category_id: $('#rt-cat').style.display === 'none' ? null : parseInt($('#rt-category').value),
    kit_items: kitLines,
    price_hour: parseFloat($('#rt-h').value) || 0,
    price_day: parseFloat($('#rt-d').value) || 0,
    price_week: parseFloat($('#rt-w').value) || 0,
    price_season: parseFloat($('#rt-s').value) || 0,
    price_flat: parseFloat($('#rt-f').value) || 0,
    active: true
  };
  try {
    if (id) await api('/api/pricings/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/pricings', { method: 'POST', body: JSON.stringify(body) });
    closeModal();
    state.pricings = await api('/api/pricings');
    renderRates();
  } catch (e) { toast(e.message); }
}
async function rateDel(id) {
  if (!confirmAction(t('delete_rate_confirm'))) return;
  await api('/api/pricings/' + id, { method: 'DELETE' });
  state.pricings = await api('/api/pricings');
  renderRates();
}

async function renderReports() {
  const el = $('#tab-reports');
  const to = new Date();
  const from = new Date(to); from.setDate(from.getDate() - 30);
  const fromS = localDateInput(from);
  const toS = localDateInput(to);
  el.innerHTML = `
    <div class="card">
      <h2>${t('reports_title')}</h2>
      <div class="row">
        <div class="grow"><label>${t('from_date')}</label><input type="date" id="rp-from" value="${fromS}"></div>
        <div class="grow"><label>${t('to_date')}</label><input type="date" id="rp-to" value="${toS}"></div>
        <button class="btn" onclick="doReports()">${t('show')}</button>
      </div>
      <div id="rp-body" style="margin-top:12px"></div>
    </div>`;
  await doReports();
}

function localDateInput(date) {
  const pad = (v) => String(v).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function doReports() {
  const from = $('#rp-from').value;
  const to = $('#rp-to').value;
  const q = '?from=' + from + '&to=' + to;
  const [summary, utilization, revenue] = await Promise.all([
    api('/api/reports/summary' + q), api('/api/reports/utilization' + q), api('/api/reports/revenue' + q)]);
  const totals = {};
  summary.forEach((r) => {
    totals[r.method] = (totals[r.method] || 0) + r.income;
    totals['refund'] = (totals['refund'] || 0) + r.refund;
  });
  const sumRows = summary.length ? summary.map((r) => `
    <tr><td>${esc(r.d)}</td><td>${esc(r.method === 'card' ? t('card') : t('cash'))}</td><td class="right">${money(r.income)}</td><td class="right">${money(r.refund)}</td></tr>`).join('') : '<tr><td colspan="4" class="muted">' + t('no_data') + '</td></tr>';
  const utilRows = utilization.map((u) => `
    <tr><td class="mono">${esc(u.barcode)}</td><td>${esc(u.cat_name)}</td><td>${esc(u.brand)} ${esc(u.model)} ${esc(u.size)}</td><td class="right">${u.rentals}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">' + t('no_data') + '</td></tr>';
  const revRows = revenue.map((o) => `
    <tr><td><b>#${o.id}</b></td><td>${fmtDT(o.started_at)}</td><td>${esc(o.client_name || '')}</td><td>${statusBadge(o.status)}</td><td class="right">${money(o.received)}</td><td class="right">${money(o.refunded)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">' + t('no_data') + '</td></tr>';
  const incomeTotal = (totals.cash || 0) + (totals.card || 0);
  $('#rp-body').innerHTML = `
    <div class="row" style="margin-bottom:10px">
      <span class="badge in_stock">${t('cash_badge', { v: money(totals.cash || 0) })}</span>
      <span class="badge active">${t('card_badge', { v: money(totals.card || 0) })}</span>
      <span class="badge">${t('total_received_badge', { v: money(incomeTotal) })}</span>
      <span class="badge service">${t('refunds_badge', { v: money(totals.refund || 0) })}</span>
    </div>
    <div class="grid-2">
      <div>
        <h3>${t('daily_income')}</h3>
        <table><thead><tr><th>${t('date')}</th><th>${t('method')}</th><th class="right">${t('received_income')}</th><th class="right">${t('refund_income')}</th></tr></thead><tbody>${sumRows}</tbody></table>
      </div>
      <div>
        <h3>${t('utilization_top')}</h3>
        <table><thead><tr><th>${t('barcode')}</th><th>${t('type')}</th><th>${t('model')}</th><th class="right">${t('rentals')}</th></tr></thead><tbody>${utilRows}</tbody></table>
      </div>
    </div>
    <div style="margin-top:12px">
      <h3>${t('orders_period')}</h3>
      <table><thead><tr><th>${t('num')}</th><th>${t('date')}</th><th>${t('client_col')}</th><th>${t('status_col')}</th><th class="right">${t('received_col')}</th><th class="right">${t('returned_col')}</th></tr></thead><tbody>${revRows}</tbody></table>
    </div>`;
}

async function renderSettings() {
  const el = $('#tab-settings');
  const accountCard = `
    <div class="card">
      <h3>${t('my_account')}: ${esc(state.currentUser.username)}</h3>
      <p class="small">${t('account_password_hint')}</p>
      <button class="btn ghost" onclick="myPasswordModal()">${t('change_my_password')}</button>
    </div>`;
  if (state.currentUser.role !== 'admin') {
    el.innerHTML = accountCard;
    return;
  }
  const s = await api('/api/settings');
  const users = await api('/api/users');
  const usersCard = `
    <div class="card">
      <div class="row"><h3 style="margin:0">${t('user_management')}</h3><button class="btn" onclick="userAddModal()">${t('add_user')}</button></div>
      <div class="user-list">${users.map((u) => `
        <div class="line">
          <div class="grow"><b>${esc(u.username)}</b><div class="small">${t(u.role === 'admin' ? 'role_admin' : 'role_worker')}${u.must_change_password ? ' · ' + t('must_change_password') : ''}</div></div>
          <span class="badge ${u.active ? 'active' : 'retired'}">${t(u.active ? 'user_active' : 'user_inactive')}</span>
          ${u.id === state.currentUser.id ? '' : `<button class="btn sm ghost" data-username="${esc(u.username)}" onclick="userResetModal(${u.id}, this.dataset.username)">${t('reset_user_password')}</button>`}
          ${u.id === state.currentUser.id ? '' : `<button class="btn sm ${u.active ? 'red' : ''}" data-username="${esc(u.username)}" onclick="userSetActive(${u.id}, ${u.active ? 'false' : 'true'}, this.dataset.username)">${t(u.active ? 'deactivate_user' : 'activate_user')}</button>`}
        </div>`).join('') || `<div class="muted">${t('no_users')}</div>`}</div>
    </div>`;
  el.innerHTML = `
    <div class="card">
      <h2>${t('settings_title')}</h2>
      <h3 style="margin-top:4px">${t('settings_general')}</h3>
      <div class="grid-2">
        <div><label>${t('biz_name_label')}</label><input id="st-name" value="${esc(s.business_name)}"></div>
        <div><label>${t('currency_label')}</label><input id="st-cur" value="${esc(s.currency)}"></div>
        <div class="setting-toggle"><label for="st-deposit-enabled">${t('deposit_enabled_label')}</label><input id="st-deposit-enabled" type="checkbox" ${s.deposit_enabled === '0' ? '' : 'checked'}></div>
        <div><label>${t('default_deposit_label')}</label><input id="st-dep" type="number" min="0" step="0.01" value="${esc(s.deposit_default)}"></div>
        <div class="setting-toggle"><label for="st-grace-enabled">${t('return_grace_label')}</label><input id="st-grace-enabled" type="checkbox" ${s.return_grace_enabled === '0' ? '' : 'checked'}></div>
        <div class="small setting-hint">${t('return_grace_hint')}</div>
        <div><label>${t('late_fee_label')}</label><input id="st-late" value="${esc(s.late_fee_per_day)}"></div>
      </div>
      <h3 style="margin-top:16px">${t('settings_contract')}</h3>
      <div class="grid-2">
        <div><label>${t('contractor_label')}</label><input id="st-contr" value="${esc(s.contractor)}"></div>
        <div><label>${t('contract_phone_label')}</label><input id="st-phone" value="${esc(s.phone)}"></div>
      </div>
      <h3 style="margin-top:16px">${t('settings_labels')}</h3>
      <div class="grid-2">
        <div class="setting-toggle"><label for="st-label-biz">${t('label_show_biz')}</label><input id="st-label-biz" type="checkbox" ${s.label_show_biz === '0' ? '' : 'checked'}></div>
        <div class="setting-toggle"><label for="st-label-site">${t('label_show_site')}</label><input id="st-label-site" type="checkbox" ${s.label_show_site === '0' ? '' : 'checked'}></div>
        <div><label>${t('label_site')}</label><input id="st-label-site-url" value="${esc(s.label_site)}"></div>
      </div>
      <div class="row" style="margin-top:12px">
        <button class="btn green" onclick="settingsSave()">${t('save')}</button>
      </div>
    </div>
    ${usersCard}
    ${accountCard}
    <div class="card">
      <h3>${t('backup')}</h3>
      <p class="small">${t('backup_hint')}</p>
      <button class="btn ghost" onclick="downloadBackup()">${t('download_backup')}</button>
    </div>`;
}

async function settingsSave() {
  await api('/api/settings', {
    method: 'POST', body: JSON.stringify({
      business_name: $('#st-name').value, currency: $('#st-cur').value,
      deposit_enabled: $('#st-deposit-enabled').checked ? '1' : '0',
      return_grace_enabled: $('#st-grace-enabled').checked ? '1' : '0',
      deposit_default: $('#st-dep').value, late_fee_per_day: $('#st-late').value,
      contractor: $('#st-contr').value, phone: $('#st-phone').value,
      label_show_biz: $('#st-label-biz').checked ? '1' : '0',
      label_show_site: $('#st-label-site').checked ? '1' : '0',
      label_site: $('#st-label-site-url').value }) });
  state.settings = await api('/api/settings');
  if (state.settings.deposit_enabled === '0') state.draft.deposit = null;
  $('#brand').textContent = state.settings.business_name || t('app_title');
  document.title = state.settings.business_name || t('app_title');
  toast(t('saved'));
}

function userAddModal() {
  openModal(t('add_user'), `
    <div class="grid-2">
      <div><label for="nu-name">${t('username')}</label><input id="nu-name" minlength="3" maxlength="32" autocomplete="off"></div>
      <div><label for="nu-password">${t('password')}</label><input id="nu-password" type="password" minlength="8" maxlength="128" autocomplete="new-password"></div>
      <div><label for="nu-role">${t('user_role')}</label><select id="nu-role"><option value="worker">${t('role_worker')}</option><option value="admin">${t('role_admin')}</option></select></div>
      <div class="small">${t('password_min_hint')} · ${t('must_change_password')}</div>
    </div>
    <div class="row" style="margin-top:12px"><button class="btn green" onclick="userCreateDo()">${t('create_user')}</button><button class="btn ghost" onclick="closeModal()">${t('cancel')}</button></div>`);
}

async function userCreateDo() {
  try {
    await api('/api/users', { method: 'POST', body: JSON.stringify({
      username: $('#nu-name').value, password: $('#nu-password').value, role: $('#nu-role').value
    }) });
    closeModal();
    toast(t('user_created'));
    await renderSettings();
  } catch (e) { toast(e.message); }
}

async function userSetActive(id, active, username) {
  if (!confirmAction(t(active ? 'user_inactive_confirm' : 'user_active_confirm', { name: username }))) return;
  try {
    await api('/api/users/' + id, { method: 'PATCH', body: JSON.stringify({ active }) });
    await renderSettings();
  } catch (e) { toast(e.message); }
}

function userResetModal(id, username) {
  openModal(t('reset_user_password'), `
    <p>${esc(username)} · ${t('user_reset_password_hint')}</p>
    <label for="ur-password">${t('new_password')}</label><input id="ur-password" type="password" minlength="8" maxlength="128" autocomplete="new-password">
    <div class="row" style="margin-top:12px"><button class="btn green" onclick="userResetPasswordDo(${id})">${t('save')}</button><button class="btn ghost" onclick="closeModal()">${t('cancel')}</button></div>`);
}

async function userResetPasswordDo(id) {
  try {
    await api('/api/users/' + id + '/reset-password', { method: 'POST', body: JSON.stringify({ password: $('#ur-password').value }) });
    closeModal();
    toast(t('user_password_reset'));
    await renderSettings();
  } catch (e) { toast(e.message); }
}

function downloadBackup() {
  window.location = '/api/backup';
}

init().catch((e) => { console.error(e); toast(t('init_err', { e: e.message })); });

document.addEventListener('click', function(ev){ var ow=ev.target.closest('[data-overdue]'); if(ow){ ev.preventDefault(); ev.stopPropagation(); overdueInfo(); return; } var ob=ev.target.closest('[data-order]'); if(ob){ ev.preventDefault(); ev.stopPropagation(); closeModal(); setTimeout(function(){ orderInfo(parseInt(ob.dataset.order)); },40); return; } });
