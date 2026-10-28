import {cookie,readCookie,sha256,json,originMatches} from "../../_lib/session.js";
export async function onRequestPost({request,env}){
 if(!originMatches(request))return json({error:"Origem não autorizada."},403);
 const token=readCookie(request);
 if(token&&env.DB)try{await env.DB.prepare("DELETE FROM manager_sessions WHERE token_hash=?").bind(await sha256(token)).run()}catch{}
 return json({ok:true},200,{"Set-Cookie":cookie("",0)});
}
