export async function onRequestGet({params,env}) {
 const id=params?.id;
 if(typeof id!=='string'||!/^[a-f0-9]{32}$/.test(id))return new Response('Not found',{status:404});
 if(!env?.DB)return new Response('Media database unavailable',{status:503});
 try {
  const row=await env.DB.prepare('SELECT mime,payload FROM media_files WHERE id=?').bind(id).first();
  if(!row)return new Response('Not found',{status:404});
  const bytes=Uint8Array.from(atob(row.payload),c=>c.charCodeAt(0));
  return new Response(bytes,{headers:{'content-type':row.mime,'cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; sandbox"}});
 }catch(e){console.error('ICD10_MEDIA_READ_ERROR',e);return new Response('Media unavailable',{status:503})}
}
