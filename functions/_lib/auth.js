// Cloudflare Access JWT signature and claims verification. Never trust the email/header alone.
let cached = null;
let cachedAt = 0;
const encode = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4-s.length%4)%4)), c => c.charCodeAt(0));
function decodeJson(segment) { return JSON.parse(new TextDecoder().decode(encode(segment))); }
function denied(message, status=401) { return new Response(JSON.stringify({error:message}), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}}); }
export async function authenticate(context) {
  const env = context.env;
  const configured = String(env.CF_ACCESS_TEAM_DOMAIN || '').trim().replace(/^https?:\/\//,'').replace(/\/$/,'');
  const aud = String(env.CF_ACCESS_AUD || '').trim();
  const email = String(env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!configured || !aud || !email || !/^[a-zA-Z0-9.-]+\.cloudflareaccess\.com$/.test(configured))
    return {response:denied('Админ хамгаалалтын TEAM DOMAIN, AUD, ADMIN_EMAIL тохиргоо дутуу байна.',503)};
  const token = context.request.headers.get('cf-access-jwt-assertion');
  if (!token) return {response:denied('Cloudflare Access нэвтрэлт шаардлагатай. /admin хаягаар орж нэвтэрнэ үү.')};
  try {
    const pieces = token.split('.');
    if (pieces.length !== 3) throw new Error('Invalid JWT structure');
    const header = decodeJson(pieces[0]);
    const claims = decodeJson(pieces[1]);
    if (header.alg !== 'RS256' || !header.kid) throw new Error('JWT algorithm invalid');
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== `https://${configured}` || !(Array.isArray(claims.aud)?claims.aud.includes(aud):claims.aud===aud)) throw new Error('JWT issuer/audience mismatch');
    if (typeof claims.exp !== 'number' || now>=claims.exp || (typeof claims.nbf === 'number' && now<claims.nbf)) throw new Error('JWT expired/not yet valid');
    if (!claims.email || String(claims.email).toLowerCase() !== email) return {response:denied('Энэ имэйлд засварлах эрх олгоогүй.',403)};
    if (!cached || Date.now()-cachedAt>5*60*1000) {
      const response = await fetch(`https://${configured}/cdn-cgi/access/certs`);
      if (!response.ok) throw new Error('Cannot fetch Access keys');
      const keys = await response.json();
      if (!Array.isArray(keys.keys)) throw new Error('Malformed JWKS');
      cached=keys.keys;cachedAt=Date.now();
    }
    let key = cached.find(k=>k.kid===header.kid && k.kty==='RSA');
    if (!key) {
      cached=null;
      const response=await fetch(`https://${configured}/cdn-cgi/access/certs`);
      if (!response.ok) throw new Error('Cannot refresh Access keys');
      const keys=await response.json();cached=keys.keys;cachedAt=Date.now();
      key=cached.find(k=>k.kid===header.kid && k.kty==='RSA');
    }
    if (!key) throw new Error('JWT signing key missing');
    const publicKey = await crypto.subtle.importKey('jwk', key, {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'}, false, ['verify']);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5',publicKey, encode(pieces[2]),new TextEncoder().encode(pieces[0]+'.'+pieces[1]));
    if (!valid) throw new Error('Invalid signature');
    return {email};
  } catch(error) {
    return {response:denied('Нэвтрэлтийг баталгаажуулж чадсангүй. Cloudflare Access тохиргоогоо шалгана уу.')};
  }
}
