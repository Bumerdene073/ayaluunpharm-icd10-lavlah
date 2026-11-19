import {authenticate} from '../../_lib/auth.js';
import {json} from '../../_lib/store.js';
export async function onRequestGet(context){
 const auth=await authenticate(context);if(auth.response)return auth.response;
 try{const q=await context.env.DB.prepare('SELECT revision,email,summary,created_at FROM changes ORDER BY id DESC LIMIT 30').all();return json({items:q.results});}
 catch(e){return json({error:'Өөрчлөлтийн түүхийг уншиж чадсангүй.'},503);}
}
