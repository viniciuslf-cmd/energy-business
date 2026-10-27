/* Confirma a terceira etapa; não concede crédito financeiro automaticamente. */
const reply=(payload,status=200)=>Response.json(payload,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const hex=buffer=>[...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,"0")).join("");
export async function onRequestPost({request,env}){
 if(env.LEADS_ENABLED!=="true"||!env.DB)return reply({error:"Fluxo real não está ativo."},503);
 const origin=request.headers.get("origin");
 if(!origin||origin!==new URL(request.url).origin)return reply({error:"Origem inválida."},403);
 if(!(request.headers.get("content-type")||"").startsWith("application/json"))return reply({error:"Formato inválido."},415);
 if(Number(request.headers.get("content-length")||0)>1024)return reply({error:"Dados excessivos."},413);
 let d;try{d=await request.json()}catch{return reply({error:"JSON inválido."},400)}
 const id=String(d?.id||""),token=String(d?.token||"");
 if(!/^[0-9a-f-]{36}$/i.test(id)||!/^[a-f0-9]{64}$/i.test(token)||d?.billReviewed!==true)
  return reply({error:"Etapas incompletas ou dados inválidos."},400);
 const hash=hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token)));
 try{
  const result=await env.DB.prepare("UPDATE leads SET journey_completed_at=COALESCE(journey_completed_at,datetime('now')),updated_at=datetime('now') WHERE id=? AND journey_token_hash=? RETURNING id,journey_completed_at").bind(id,hash).first();
  if(!result)return reply({error:"Não foi possível confirmar este cadastro."},403);
  return reply({ok:true,completedAt:result.journey_completed_at,info:"Etapas concluídas; validação de indicações ainda depende da gestão."});
 }catch{return reply({error:"O cadastro não pôde ser finalizado."},503)}
}