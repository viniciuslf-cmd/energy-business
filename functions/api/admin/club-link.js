import {getSession,json,originMatches} from "../../_lib/session.js";
const isTest=env=>env.LEADS_ENABLED!=="true"&&env.TEST_MODE_DISABLED!=="true";
const validUrl=(value)=>{
 if(value==="")return "";
 if(typeof value!=="string"||value.length>500)return null;
 try{
  const u=new URL(value.trim());
  const h=u.hostname.toLowerCase();
  if(u.protocol!=="https:"||u.username||u.password||u.port||!h.includes(".")||
     h==="localhost"||h.endsWith(".local")||h.endsWith(".internal")||h.endsWith(".test")||
     h.endsWith(".example")||h==="example.com"||h==="example.org"||h==="example.net"||
     /^\d+\.\d+\.\d+\.\d+$/.test(h)||!/^[a-z0-9.-]+$/.test(h))return null;
  u.hash="";
  return u.href;
 }catch{return null}
};
export async function onRequestPost({request,env}){
 if(!await getSession(request,env))return json({error:"Faça login como gestor."},401);
 if(!originMatches(request))return json({error:"Origem não autorizada."},403);
 if(!env.DB)return json({error:"Banco indisponível."},503);
 if(!(request.headers.get("content-type")||"").startsWith("application/json"))return json({error:"Envie JSON."},415);
 if(Number(request.headers.get("content-length")||0)>1600)return json({error:"Dados excedem o limite."},413);
 let data;try{data=await request.json()}catch{return json({error:"JSON inválido."},400)}
 const id=String(data?.club_id||"");
 if(!/^[0-9a-f-]{36}$/i.test(id)||typeof data?.verified!=="boolean")return json({error:"Informe o clube e a confirmação do endereço."},400);
 const link=validUrl(data.site_url??"");
 if(link===null||data.verified&&!link)return json({error:"Use endereço HTTPS válido e confirme apenas links efetivamente verificados."},400);
 const table=isTest(env)?"test_clubs":"clubs";
 try{
  const club=await env.DB.prepare("SELECT id FROM "+table+" WHERE id=?").bind(id).first();
  if(!club)return json({error:"Clube não encontrado neste ambiente."},404);
  await env.DB.prepare("INSERT INTO club_destinations(club_id,site_url,link_verified,updated_at) VALUES(?,?,?,datetime('now')) ON CONFLICT(club_id) DO UPDATE SET site_url=excluded.site_url,link_verified=excluded.link_verified,updated_at=excluded.updated_at")
   .bind(id,link,data.verified?1:0).run();
  return json({ok:true,club_id:id,site_url:link,link_verified:data.verified});
 }catch{return json({error:"Não foi possível salvar o endereço do clube."},503)}
}
