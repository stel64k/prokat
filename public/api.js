const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

async function api(url, opts) {
  const res = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts || {}));
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !url.startsWith('/api/auth/')) {
    state.currentUser = null;
    renderAuth('login');
  }
  if (!res.ok) throw new Error(data.error || t('srv_err'));
  return data;
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.display = 'none'; }, 2600);
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
