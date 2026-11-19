import {authError, checkSameOrigin, configured, checkPasscode, checkLoginLimit, recordLoginResult, createSessionCookie} from '../../_lib/auth.js';
export async function onRequestPost(context) {
  if (!checkSameOrigin(context)) return authError('Хүсэлтийн эх сурвалж баталгаажаагүй.',403);
  if (!configured(context.env)) return authError('ADMIN_PASSCODE тохиргоо байхгүй эсвэл хэт богино байна.',503);
  const len = Number(context.request.headers.get('content-length')||'0');
  if (len > 1000) return authError('Хүсэлт хэт урт.',413);
  let input;
  try { input=await context.request.json(); }
  catch (_) { return authError('Буруу хүсэлт.',400); }
  const limiter=await checkLoginLimit(context);
  if (limiter.error) return limiter.error;
  const ok=await checkPasscode(context.env,input?.passcode);
  try { await recordLoginResult(context,limiter,ok); }
  catch (_) { return authError('Нэвтрэлтийн хамгаалалтыг хадгалж чадсангүй.',503); }
  if (!ok) return authError('Нууц код буруу.',401);
  const cookie=await createSessionCookie(context);
  return new Response(JSON.stringify({ok:true}), {status:200, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','set-cookie':cookie,'x-content-type-options':'nosniff'}});
}
