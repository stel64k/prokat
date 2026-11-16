const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

let loadingPending = 0;
let loadingTimer = null;

function loadingStart() {
  loadingPending += 1;
  if (loadingPending !== 1) return;
  clearTimeout(loadingTimer);
  loadingTimer = setTimeout(() => {
    const bar = $('#loading-bar');
    if (bar && loadingPending > 0) bar.classList.add('active');
  }, 150);
}

function loadingEnd() {
  loadingPending = Math.max(0, loadingPending - 1);
  if (loadingPending > 0) return;
  clearTimeout(loadingTimer);
  const bar = $('#loading-bar');
  if (bar) bar.classList.remove('active');
}

async function api(url, opts) {
  loadingStart();
  try {
    const res = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts || {}));
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && !url.startsWith('/api/auth/')) {
      state.currentUser = null;
      renderAuth('login');
    }
    if (!res.ok) throw new Error(data.error || t('srv_err'));
    return data;
  } finally {
    loadingEnd();
  }
}

function toast(msg, type) {
  const el = $('#toast');
  if (!el) return;
  const kind = type === 'success' || type === 'error' ? type : 'info';
  el.textContent = msg;
  el.className = 'toast-' + kind;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.style.display = 'block';
  clearTimeout(el._timer);
  if (window.MOTION) MOTION.toastIn(el); else el.style.opacity = '1';
  const ttl = kind === 'error' ? 5200 : kind === 'success' ? 2800 : 3400;
  el._timer = setTimeout(() => {
    if (window.MOTION) MOTION.toastOut(el, () => { el.style.display = 'none'; el.style.opacity = ''; });
    else el.style.display = 'none';
  }, ttl);
}

function money(n) {
  return (Math.round(n * 100) / 100).toFixed(2) + ' ' + (state.settings.currency || 'грн');
}

function currencyLabel() {
  return state.settings.currency || 'грн';
}

async function withBusy(button, fn) {
  const el = typeof button === 'string' ? $(button) : button;
  if (el) el.disabled = true;
  try {
    return await fn();
  } finally {
    if (el) el.disabled = false;
  }
}
