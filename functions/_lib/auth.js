// ICD-10 admin: one high-entropy passcode kept ONLY in Cloudflare Pages Secrets.
// This replaces Cloudflare Access JWT verification for the admin API.
const COOKIE_NAME = '__Host-icd10_admin';
const enc = new TextEncoder();
const dec = new TextDecoder();
const SESSION_SECONDS = 8 * 60 * 60;

function response(error, status = 401) {
  return new Response(JSON.stringify({error}), {
    status,
    headers: {'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', 'x-content-type-options':'nosniff'}
  });
}

function base64url(bytes) {
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}
function unbase64url(s) {
  if (!/^[A-Za-z0-9_-]+$/.test(s)) throw new Error('Invalid base64');
  const v = atob(s.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4 - s.length % 4) % 4));
  return Uint8Array.from(v, c => c.charCodeAt(0));
}
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0; for (let i=0;i<a.length;i++) d |= a[i]^b[i]; return d === 0;
}
function getCode(env) {
  const code = String(env?.ADMIN_PASSCODE || '');
  if (code.length < 16 || code.length > 128) return null;
  return code;
}
export function configured(env) { return Boolean(getCode(env)); }

async function keyForCode(code) {
  return crypto.subtle.importKey('raw', enc.encode(code), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
}
async function hmac(code, value) {
  const key = await keyForCode(code);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(value)));
}

export async function checkPasscode(env, supplied) {
  const expected = getCode(env);
  if (!expected || typeof supplied !== 'string' || supplied.length > 128) return false;
  // Equal-size SHA-256 outputs avoid leaking passcode prefixes/timing.
  const [a,b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
    crypto.subtle.digest('SHA-256', enc.encode(supplied))
  ]);
  return constantTimeEqual(new Uint8Array(a),new Uint8Array(b));
}

function requestHost(context) { return new URL(context.request.url).host.toLowerCase(); }
function nowSeconds() { return Math.floor(Date.now()/1000); }
export async function createSessionCookie(context) {
  const code = getCode(context.env);
  if (!code) throw new Error('ADMIN_PASSCODE missing');
  const expiry = nowSeconds() + SESSION_SECONDS;
  const nonce = base64url(crypto.getRandomValues(new Uint8Array(16)));
  const body = base64url(enc.encode(JSON.stringify({v:1, exp:expiry, nonce})));
  const signature = base64url(await hmac(code,`icd10:session:v1:${requestHost(context)}:${body}`));
  return `${COOKIE_NAME}=${body}.${signature}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}
export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function checkSameOrigin(context) {
  const r = context.request;
  const origin = r.headers.get('origin');
  const site = r.headers.get('sec-fetch-site');
  // A special header prevents ordinary cross-origin HTML forms from updating state.
  if (r.headers.get('x-icd10-request') !== '1') return false;
  if (origin && origin !== new URL(r.url).origin) return false;
  if (site && site !== 'same-origin') return false;
  return Boolean(origin || site === 'same-origin');
}

export async function authenticate(context) {
  const code = getCode(context.env);
  if (!code) return {response:response('Cloudflare Pages Production Secret ADMIN_PASSCODE тохируулаагүй байна (16+ тэмдэгт).',503)};
  const header = context.request.headers.get('cookie') || '';
  const cookie = header.split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE_NAME+'='));
  if (!cookie) return {response:response('Нууц кодоор нэвтэрнэ үү.',401)};
  try {
    const value = cookie.slice(COOKIE_NAME.length+1);
    const parts = value.split('.');
    if (parts.length !== 2 || parts[0].length > 300 || parts[1].length > 120) throw new Error('Bad cookie');
    const payload = JSON.parse(dec.decode(unbase64url(parts[0])));
    const time = nowSeconds();
    if (payload.v !== 1 || !Number.isInteger(payload.exp) || payload.exp <= time || payload.exp > time + SESSION_SECONDS ||
        typeof payload.nonce !== 'string' || payload.nonce.length < 16) throw new Error('Session expired');
    const signature = await hmac(code,`icd10:session:v1:${requestHost(context)}:${parts[0]}`);
    const supplied = unbase64url(parts[1]);
    if (!constantTimeEqual(signature,supplied)) throw new Error('Invalid signature');
    return {email:'code-admin'};
  } catch (_) { return {response:response('Нэвтрэх хугацаа дууссан. Нууц кодоо дахин оруулна уу.',401)}; }
}

// Limit repeated passcode guesses per Cloudflare-provided client IP in D1.
async function attemptsKey(context, code) {
  const ip = context.request.headers.get('cf-connecting-ip') || 'unknown';
  return base64url(await hmac(code, `icd10:login-ip:${ip}`)); // no plaintext IP stored
}
async function ensureAttemptsTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS admin_login_attempts (
    ip_key TEXT PRIMARY KEY, failures INTEGER NOT NULL DEFAULT 0,
    blocked_until INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0
  )`).run();
}
export async function checkLoginLimit(context) {
  const code=getCode(context.env);
  if (!code || !context.env?.DB) return {error:response('Админ нэвтрэх тохиргоо дутуу байна.',503)};
  try {
    await ensureAttemptsTable(context.env.DB);
    const key=await attemptsKey(context,code);
    const row=await context.env.DB.prepare('SELECT failures,blocked_until,updated_at FROM admin_login_attempts WHERE ip_key=?').bind(key).first();
    if (row && row.blocked_until > nowSeconds()) return {error:response('Олон удаа буруу код оруулсан. 15 минутын дараа дахин оролдоно уу.',429)};
    return {key, row};
  } catch (_) {return {error:response('Нэвтрэх хүсэлтийг шалгах боломжгүй байна. D1 холболтоо шалгана уу.',503)};}
}
export async function recordLoginResult(context, info, success) {
  if (success) {
    await context.env.DB.prepare('DELETE FROM admin_login_attempts WHERE ip_key=?').bind(info.key).run();
    return;
  }
  const now=nowSeconds();
  const failures=info.row && info.row.updated_at > now-15*60 ? info.row.failures+1 : 1;
  const blockedUntil=failures>=5 ? now+15*60 : 0;
  await context.env.DB.prepare('INSERT INTO admin_login_attempts(ip_key,failures,blocked_until,updated_at) VALUES (?,?,?,?) ON CONFLICT(ip_key) DO UPDATE SET failures=excluded.failures,blocked_until=excluded.blocked_until,updated_at=excluded.updated_at').bind(info.key,failures,blockedUntil,now).run();
}
export {response as authError};
