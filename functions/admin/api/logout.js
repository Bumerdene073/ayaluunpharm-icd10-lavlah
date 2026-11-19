import {authError,checkSameOrigin,clearSessionCookie} from '../../_lib/auth.js';
export function onRequestPost(context) {
  if (!checkSameOrigin(context)) return authError('Хүсэлтийн эх сурвалж баталгаажаагүй.',403);
  return new Response(JSON.stringify({ok:true}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','set-cookie':clearSessionCookie(),'x-content-type-options':'nosniff'}});
}
