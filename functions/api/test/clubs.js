import {getSession} from "../../_lib/session.js";
/* Gestão aberta somente para CLUBES FICTÍCIOS de homologação.
   Nunca permite alterar a tabela de clubes da operação comercial. */
const respond=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const active=env=>env.LEADS_ENABLED!=="true"&&env.TEST_MODE_DISABLED!=="true"&&!!env.DB;
const clean=v=>String(v??"").normalize("NFC").replace(/\s+/g," ").trim();
const valid=data=>{
 if(!data||typeof data!=="object"||Array.isArray(data))return null;
 const name=clean(data.name),state=clean(data.state||"").toUpperCase(),share=Number(data.club_share_percent??0),
 message=clean(data.support_message||"");
 if(name.length<2||name.length>80||/[<>\\\/\x00-\x1f\x7f]/.test(name)||!/^$|^[A-Z]{2}$/.test(state)||
 !Number.isFinite(share)||share<0||share>100||Math.abs(share*100-Math.round(share*100))>.000001||
 message.length>650||/[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(message)||
 typeof data.is_active!=="boolean"||typeof data.partner_confirmed!=="boolean")return null;
 return {name,state,is_active:data.is_active?1:0,club_share_percent:Math.round(share*100)/100,support_message:message,partner_confirmed:data.partner_confirmed?1:0};
};
const allowedOrigin=request=>request.headers.get("origin")===new URL(request.url).origin;
async function parse(request){
 if(!(request.headers.get("content-type")||"").startsWith("application/json"))return null;
 if(Number(request.headers.get("content-length")||0)>2500)return null;
 try{return await request.json()}catch{return null}
}
export async function onRequestGet({request,env}){
 if(!await getSession(request,env))return respond({error:"Autenticação obrigatória."},401);
 if(!active(env))return respond({error:"Catálogo de testes desativado."},503);
 try{
 const q=await env.DB.prepare("SELECT c.id,c.name,c.state,c.is_active,c.club_share_percent,c.support_message,c.partner_confirmed,c.created_at,c.updated_at,COALESCE(d.site_url,'') AS site_url,COALESCE(d.link_verified,0) AS link_verified FROM test_clubs c LEFT JOIN club_destinations d ON d.club_id=c.id ORDER BY c.name COLLATE NOCASE ASC LIMIT 100").all();
 return respond({clubs:q.results||[],testOnly:true});
 }catch{return respond({error:"Falha ao listar clubes fictícios."},503)}
}
export async function onRequestPost({request,env}){
 if(!await getSession(request,env))return respond({error:"Autenticação obrigatória."},401);
 if(!active(env))return respond({error:"Edição de testes desativada."},503);
 if(!allowedOrigin(request))return respond({error:"Origem não autorizada."},403);
 const club=valid(await parse(request));if(!club)return respond({error:"Dados inválidos para clube de teste."},400);
 try{
 const qty=await env.DB.prepare("SELECT COUNT(*) AS n FROM test_clubs").first();
 if(Number(qty?.n)>=60)return respond({error:"Limite de 60 clubes fictícios atingido."},429);
 const row=await env.DB.prepare("INSERT INTO test_clubs(id,name,state,is_active,club_share_percent,support_message,partner_confirmed) VALUES(?,?,?,?,?,?,?) RETURNING id,name,state,is_active,club_share_percent,support_message,partner_confirmed,created_at,updated_at")
 .bind(crypto.randomUUID(),club.name,club.state,club.is_active,club.club_share_percent,club.support_message,club.partner_confirmed).first();
  const session=await getSession(request,env);
  await env.DB.prepare("INSERT OR IGNORE INTO strategic_partners(id,name,category,club_id,created_by,updated_by,is_test) VALUES(? ,?,'clube',?,?,?,?)")
   .bind(row.id,row.name,row.id,session.username,session.username,1).run();
  await env.DB.prepare("INSERT OR IGNORE INTO partner_history(id,partner_id,event,detail,performed_by) VALUES(?,?,?,?,?)")
   .bind(crypto.randomUUID(),row.id,"criacao_clube","Novo clube cadastrado na Gestão de Clubes.",session.username).run();
 return respond({club:row,testOnly:true},201);
 }catch(e){return respond({error:/UNIQUE/i.test(String(e))?"O clube já existe na lista de testes.":"Não foi possível gravar o clube fictício."},409)}
}
export async function onRequestPatch({request,env}){
 if(!await getSession(request,env))return respond({error:"Autenticação obrigatória."},401);
 if(!active(env))return respond({error:"Edição de testes desativada."},503);
 if(!allowedOrigin(request))return respond({error:"Origem não autorizada."},403);
 const data=await parse(request),club=valid(data),id=String(data?.id||"");
 if(!club||!/^[0-9a-f-]{36}$/i.test(id))return respond({error:"Dados de edição inválidos."},400);
 try{
 const row=await env.DB.prepare("UPDATE test_clubs SET name=?,state=?,is_active=?,club_share_percent=?,support_message=?,partner_confirmed=?,updated_at=datetime('now') WHERE id=? RETURNING id,name,state,is_active,club_share_percent,support_message,partner_confirmed,created_at,updated_at")
 .bind(club.name,club.state,club.is_active,club.club_share_percent,club.support_message,club.partner_confirmed,id).first();
 if(!row)return respond({error:"Clube fictício não encontrado."},404);
  await env.DB.prepare("UPDATE strategic_partners SET name=?,updated_by=?,updated_at=datetime('now') WHERE club_id=?").bind(row.name,(await getSession(request,env)).username,id).run();
 return respond({club:row,testOnly:true});
 }catch(e){return respond({error:/UNIQUE/i.test(String(e))?"Esse nome já está em uso.":"Não foi possível alterar o clube."},409)}
}