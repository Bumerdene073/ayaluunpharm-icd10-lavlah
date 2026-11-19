import {getState,json} from '../_lib/store.js';
export async function onRequestGet(context){
 try {const state=await getState(context.env.DB);return json(state);}
 catch(e){return json({error:'D1 binding эсвэл өгөгдлийн сангийн эрхийг шалгана уу.'},503);}
}
