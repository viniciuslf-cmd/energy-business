/* Programa de indicações: homologação com dados sintéticos e aprovação manual.
  Em produção, acesso administrativo é obrigatório. */
const respond=(value,status=200)=>Response.json(value,{status,headers:{"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff"}});
function testMode(env){return env.LEADS_ENABLED!=="true"&&env.TEST_MODE_DISABLED!=="true"}
async function authorized(req,env){
 const expected=env.ADMIN_TOKEN||"",token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!expected||!token||token.length>512)return false;
 const digest=async t=>new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t)));
 const a=await digest(expected),b=await digest(token);let diff=0;
 for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}
const sameOrigin=req=>req.headers.get("origin")===new URL(req.url).origin;
async function check(req,env){return testMode(env)||await authorized(req,env)}
const table=env=>testMode(env)?"test_leads":"leads";
async function settings(db){
 const setting=await db.prepare("SELECT enabled FROM referral_program WHERE id=1").first();
 const query=await db.prepare("SELECT min_confirmed,extra_discount_pct FROM referral_tiers ORDER BY min_confirmed ASC").all();
 return {enabled:Boolean(setting?.enabled),tiers:query.results||[]};
}
export async function onRequestGet({request,env}){
 if(!await check(request,env))return respond({error:"Acesso administrativo necessário."},401);
 if(!env.DB)return respond({error:"Banco indisponível."},503);
 try{
  const program=await settings(env.DB),t=table(env);
  const refs=await env.DB.prepare(`SELECT l.id,l.name,l.email,l.phone,l.created_at,l.status,
   l.journey_completed_at,l.referral_validation,l.referral_validated_at,
   r.name AS inviter_name,r.referral_code AS inviter_code
   FROM ${t} l JOIN ${t} r ON r.referral_code=l.referred_by_code
   ORDER BY l.created_at DESC LIMIT 300`).all();
  const summary=await env.DB.prepare(`SELECT r.id,r.name,r.referral_code,
    SUM(CASE WHEN l.referral_validation='confirmado' AND l.journey_completed_at IS NOT NULL THEN 1 ELSE 0 END) AS confirmed,
    SUM(CASE WHEN l.referral_validation='pendente' THEN 1 ELSE 0 END) AS pending
    FROM ${t} r JOIN ${t} l ON l.referred_by_code=r.referral_code
    GROUP BY r.id,r.name,r.referral_code ORDER BY confirmed DESC,pending DESC LIMIT 300`).all();
  const inviters=(summary.results||[]).map(row=>{
   const tier=program.tiers.filter(x=>x.min_confirmed<=Number(row.confirmed)).at(-1);
   return {...row,eligible_extra_pct:tier?Number(tier.extra_discount_pct):0};
  });
  return respond({program:{...program,live:Boolean(!testMode(env)&&env.REFERRAL_BENEFITS_ENABLED==="true"&&program.enabled)},
   testOnly:testMode(env),referrals:refs.results||[],inviters,
   disclosure:"A aprovação apenas registra elegibilidade. Não altera faturas nem concede descontos automáticos."});
 }catch{return respond({error:"Não foi possível carregar as indicações."},503)}
}
export async function onRequestPost({request,env}){
 if(!await check(request,env))return respond({error:"Acesso administrativo necessário."},401);
 if(!sameOrigin(request))return respond({error:"Origem inválida."},403);
 if(!env.DB)return respond({error:"Banco indisponível."},503);
 if(!(request.headers.get("content-type")||"").startsWith("application/json"))return respond({error:"Envie JSON."},415);
 if(Number(request.headers.get("content-length")||0)>4500)return respond({error:"Configuração grande demais."},413);
 let d;try{d=await request.json()}catch{return respond({error:"JSON inválido."},400)}
 if(typeof d?.enabled!=="boolean"||!Array.isArray(d.tiers)||d.tiers.length>20)return respond({error:"Configuração inválida."},400);
 const tiers=d.tiers.map(x=>({min_confirmed:Number(x.min_confirmed),extra_discount_pct:Number(x.extra_discount_pct)})).sort((a,b)=>a.min_confirmed-b.min_confirmed);
 let last=-1;const used=new Set();
 for(const x of tiers){
  if(!Number.isInteger(x.min_confirmed)||x.min_confirmed<1||x.min_confirmed>10000||used.has(x.min_confirmed)||
    !Number.isFinite(x.extra_discount_pct)||x.extra_discount_pct<0||x.extra_discount_pct>15||
    Math.abs(x.extra_discount_pct*100-Math.round(x.extra_discount_pct*100))>0.000001||x.extra_discount_pct<last)
    return respond({error:"Use marcos únicos crescentes e descontos progressivos entre 0% e 15%."},400);
  last=x.extra_discount_pct;used.add(x.min_confirmed);
 }
 if(d.enabled&&!tiers.length)return respond({error:"Inclua uma faixa antes de ativar a simulação."},400);
 try{
  const sql=[env.DB.prepare("DELETE FROM referral_tiers"),
   ...tiers.map(t=>env.DB.prepare("INSERT INTO referral_tiers (min_confirmed,extra_discount_pct) VALUES (?,?)").bind(t.min_confirmed,t.extra_discount_pct)),
   env.DB.prepare("UPDATE referral_program SET enabled=?,updated_at=datetime('now') WHERE id=1").bind(d.enabled?1:0)];
  await env.DB.batch(sql);
  return respond({ok:true,tiers,enabled:d.enabled,live:false,
   message:"Regras de cálculo salvas; descontos não são concedidos automaticamente."});
 }catch{return respond({error:"Falha ao salvar as faixas."},503)}
}
export async function onRequestPatch({request,env}){
 if(!await check(request,env))return respond({error:"Acesso administrativo necessário."},401);
 if(!sameOrigin(request))return respond({error:"Origem inválida."},403);
 if(!env.DB)return respond({error:"Banco indisponível."},503);
 let d;try{d=await request.json()}catch{return respond({error:"JSON inválido."},400)}
 const id=String(d?.id||""),decision=String(d?.decision||"");
 if(!/^[0-9a-f-]{36}$/i.test(id)||!["confirmado","rejeitado","pendente"].includes(decision))return respond({error:"Validação inválida."},400);
 const t=table(env);
 try{
  const lead=await env.DB.prepare(`SELECT l.id,l.phone,l.email,l.created_at,l.status,l.journey_completed_at,
   l.referred_by_code,r.id AS inviter_id,r.phone AS inviter_phone,r.email AS inviter_email
   FROM ${t} l LEFT JOIN ${t} r ON l.referred_by_code=r.referral_code WHERE l.id=?`).bind(id).first();
  if(!lead?.inviter_id)return respond({error:"Indicação não encontrada."},404);
  if(decision==="confirmado"){
   if(!lead.journey_completed_at||lead.status==="descartado")return respond({error:"O indicado ainda não concluiu as três etapas."},409);
   if(lead.phone===lead.inviter_phone||lead.email===lead.inviter_email)return respond({error:"Autoindicação não é permitida."},409);
   const duplicate=await env.DB.prepare(`SELECT id FROM ${t} WHERE id<>? AND (phone=? OR email=?) AND created_at<=? LIMIT 1`).bind(id,lead.phone,lead.email,lead.created_at).first();
   if(duplicate)return respond({error:"Telefone ou e-mail já utilizado anteriormente."},409);
  }
  const result=await env.DB.prepare(`UPDATE ${t} SET referral_validation=?,
   referral_validated_at=CASE WHEN ?='confirmado' THEN datetime('now') ELSE NULL END,
   updated_at=datetime('now') WHERE id=? RETURNING id,referral_validation,referral_validated_at`).bind(decision,decision,id).first();
  return respond({ok:true,record:result,
   message:decision==="confirmado"?"Indicação confirmada para apuração das faixas; nenhuma fatura foi alterada.":"Indicação atualizada."});
 }catch{return respond({error:"Não foi possível validar a indicação."},503)}
}