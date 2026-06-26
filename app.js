/* Blend Learning Hub — Simple client helper (NO AUTH) */
const API_BASE = window.location.origin;

/* ─── User identity ──────────────────────────────────────────────
   First visit: prompt for name once, generate a UUID, save in localStorage.
   On every request we send x-user-id and x-user-name headers — no token, no login.
*/
function getUser() {
  try {
    const u = localStorage.getItem('blend_user');
    return u ? JSON.parse(u) : null;
  } catch { return null; }
}

function setUser(u) {
  localStorage.setItem('blend_user', JSON.stringify(u));
}

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'u-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
}

function ensureUser() {
  let u = getUser();
  if (u && u.id && u.name) return u;
  const name = (prompt('Welcome to the Blend Learning Hub!\n\nWhat is your full name?') || '').trim();
  if (!name) return null;
  u = { id: uuid(), name, joinedAt: Date.now() };
  setUser(u);
  return u;
}

/* Make user globally available for inline scripts in HTML */
let USER = ensureUser();

/* ─── API client ─────────────────────────────────────────────── */
async function apiFetch(path, opts = {}) {
  if (!USER) USER = ensureUser();
  if (!USER) throw new Error('No user');

  const headers = {
    'Content-Type': 'application/json',
    'x-user-id':   USER.id,
    'x-user-name': USER.name,
    ...(opts.headers || {})
  };
  const res = await fetch(API_BASE + path, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed (' + res.status + ')');
  }
  // Some endpoints return PDFs etc — caller will deal with content-type
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res;
}

/* ─── Optional: change name ─────────────────────────────────── */
function changeName() {
  const newName = (prompt('Update your display name:', USER ? USER.name : '') || '').trim();
  if (!newName) return;
  if (!USER) USER = ensureUser();
  USER.name = newName;
  setUser(USER);
  if (typeof initPage === 'function') initPage();
}
