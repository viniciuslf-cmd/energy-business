const response=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
export async function onRequestPost({request,env}){
 if(env.LEADS_ENABLED==="true"||env.TEST_MODE_DISABLED==="true"||!env.DB)return response({error:"Homologação indisponível."},503);
 if(request.headers.get("origin")!==new URL(request.url).origin)return response({error:"Origem inválida."},403);
 if(!(request.headers.get("content-type")||"").startsWith("application/json"))return response({error:"Formato inválido."},415);
 if(Number(request.headers.get("content-length")||0)>1024)return response({error:"Dados excessivos."},413);
 let d;try{d=await request.json()}catch{return response({error:"Dados inválidos."},400)}
 const id=String(d?.id||""),token=String(d?.token||"");
 if(!/^[0-9a-f-]{36}$/i.test(id)||!/^[a-f0-9]{64}$/i.test(token)||d?.billReviewed!==true)return response({error:"Confirme a conferência da fatura antes de concluir."},400);
 const hash=hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token)));
 try{
  const row=await env.DB.prepare("UPDATE test_leads SET journey_completed_at=COALESCE(journey_completed_at,datetime('now')),updated_at=datetime('now') WHERE id=? AND journey_token_hash=? RETURNING id,journey_completed_at").bind(id,hash).first();
  if(!row)return response({error:"Código de conclusão inválido."},403);
  return response({ok:true,testOnly:true,completedAt:row.journey_completed_at,message:"Cadastro de teste concluído. Indicação pendente de confirmação no painel."});
 }catch{return response({error:"Não foi possível registrar a conclusão."},503)}
}