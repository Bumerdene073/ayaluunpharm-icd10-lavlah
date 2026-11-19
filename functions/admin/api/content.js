import {authenticate} from '../../_lib/auth.js';
import {getState,json} from '../../_lib/store.js';
import {validateDocument} from '../../_lib/validate.js';
export async function onRequestGet(context){
 const access=await authenticate(context);if(access.response)return access.response;
 try{return json(await getState(context.env.DB));}catch(e){return json({error:'D1 тохиргоо эсвэл seed.sql буруу.'},503);}
}
export async function onRequestPut(context){
 const access=await authenticate(context);if(access.response)return access.response;
 const len=Number(context.request.headers.get('content-length')||'0');
 if(len>600000)return json({error:'Файлын хэмжээ хэтэрсэн.'},413);
 let body;try{body=await context.request.json();}catch(e){return json({error:'JSON өгөгдөл буруу.'},400);}
 if(!Number.isInteger(body.revision)||body.revision<1)return json({error:'Хувилбарын дугаар буруу.'},400);
 const issue=validateDocument(body.data);if(issue)return json({error:issue},400);
 const payload=JSON.stringify(body.data);
 if(payload.length>500000)return json({error:'Мэдээлэл 500 KB-ээс хэтэрсэн.'},413);
 try{
  const result=await context.env.DB.prepare('UPDATE documents SET payload=?, revision=revision+1, updated_at=CURRENT_TIMESTAMP, updated_by=? WHERE id=? AND revision=?')
   .bind(payload,access.email,'main',body.revision).run();
  if(!result.success)return json({error:'Өөрчлөлтийг хадгалж чадсангүй.'},500);
  if(result.meta?.changes!==1)return json({error:'Өөр админ мэдээллийг шинэчилсэн байна. Дахин ачаалж шалгана уу.'},409);
  await context.env.DB.prepare('INSERT INTO changes (revision,email,summary) VALUES (?,?,?)').bind(body.revision+1,access.email,'Админ нийтэлсэн').run();
  return json({ok:true,revision:body.revision+1});
 }catch(e){return json({error:'D1 хадгалалт амжилтгүй. Өгөгдлийн сан ба migration-аа шалгана уу.'},503);}
}
