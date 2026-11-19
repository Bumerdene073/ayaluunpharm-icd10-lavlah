import {authenticate,checkSameOrigin} from '../../_lib/auth.js';
import {json} from '../../_lib/store.js';
const MAX_BYTES = 800000;
export async function onRequestPost(context) {
 if(!checkSameOrigin(context))return json({error:'Хүсэлтийн эх сурвалж баталгаажаагүй.'},403);
 const auth=await authenticate(context);if(auth.response)return auth.response;
 if(!context.env.DB)return json({error:'D1 DB binding алга.'},503);
 const len=Number(context.request.headers.get('content-length')||'0');
 if(len>1150000)return json({error:'Зургийн файл хэт том. Жижигрүүлээд дахин оруулна уу.'},413);
 let body;try{body=await context.request.json();}catch{return json({error:'Зургийн өгөгдөл буруу.'},400)}
 const str=body?.dataUrl;
 if(typeof str!=='string'||str.length>1110000)return json({error:'Зургийн хэмжээ эсвэл төрөл буруу.'},413);
 const m=/^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(str);
 if(!m)return json({error:'Зөвхөн WEBP, PNG, JPG зураг зөвшөөрнө.'},400);
 let bytes;try{const raw=atob(m[2]);bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));}catch{return json({error:'Зураг гэмтсэн байна.'},400)}
 if(bytes.length<16||bytes.length>MAX_BYTES)return json({error:'Зураг 800 KB-ээс бага байх ёстой.'},413);
 const valid=m[1]==='png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:
  m[1]==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:
  String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 if(!valid)return json({error:'Зургийн файлын формат таарахгүй байна.'},400);
 const id=crypto.randomUUID().replaceAll('-','');
 try{
  await context.env.DB.prepare(`CREATE TABLE IF NOT EXISTS media_files (
   id TEXT PRIMARY KEY, mime TEXT NOT NULL, payload TEXT NOT NULL,
   created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await context.env.DB.prepare('INSERT INTO media_files(id,mime,payload) VALUES (?,?,?)').bind(id,'image/'+m[1],m[2]).run();
  return json({ok:true,url:'/api/media/'+id,bytes:bytes.length});
 }catch(e){console.error('ICD10_MEDIA_UPLOAD_ERROR',e);return json({error:'Зургийг D1-д хадгалж чадсангүй.'},503)}
}
