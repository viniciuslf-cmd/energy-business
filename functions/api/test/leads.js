/* Homologação pública: aceita SOMENTE dados sintéticos reservados.
   Em hipótese alguma inserir nome/telefone/email verdadeiros. */
const reply=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const hex=bytes=>[...bytes].map(b=>b.toString(16).padStart(2,"0")).join("");
export async function onRequestPost({request,env}){
 if(env.LEADS_ENABLED==="true"||env.TEST_MODE_DISABLED==="true"||!env.DB)return reply({error:"Ambiente de testes desativado."},503);
 if(request.headers.get("origin")!==new URL(request.url).origin)return reply({error:"Origem não autorizada."},403);
 if(!(request.headers.get("content-type")||"").startsWith("application/json"))return reply({error:"Envie JSON."},415);
 if(Number(request.headers.get("content-length")||0)>2400)return reply({error:"Dados acima do limite."},413);
 let d;try{d=await request.json()}catch{return reply({error:"JSON inválido."},400)}
 const name=String(d?.name||"").replace(/\s+/g," ").trim().toUpperCase();
 const email=String(d?.email||"").trim().toLowerCase();
 const phone=String(d?.phone||"").replace(/\D/g,"");
 const amount=Number(d?.billAmount),rate=Number(d?.rate);
 const propertyType=String(d?.propertyType||"");
 const favoriteClub=String(d?.favoriteClub||"").trim();
 const referral=String(d?.referredByCode||"").trim().toUpperCase();
 if(!/^TESTE [A-ZÀ-Ú ]{3,75}$/.test(name)||
   !/^[a-z0-9][a-z0-9._+-]{0,63}@example\.(com|org|net)$/.test(email)||
   !/^1199999\d{4}$/.test(phone)||
   !Number.isInteger(amount)||amount<50||amount>1000000||
   ![10,15,20].includes(rate)||
   !["Residência","Empresa","Condomínio"].includes(propertyType)||
   favoriteClub!==""||(referral&&!/^EB[A-F0-9]{16}$/.test(referral))||
   d?.consent!==true)
    return reply({error:"Use apenas informações fictícias: nome iniciando TESTE, e-mail @example.com e telefone 1199999XXXX."},400);
 try{
  const stats=await env.DB.prepare("SELECT COUNT(*) AS total FROM test_leads").first();
  if(Number(stats?.total)>=1500)return reply({error:"Limite de testes atingido."},429);
  const previous=await env.DB.prepare("SELECT id FROM test_leads WHERE phone=? OR email=? LIMIT 1").bind(phone,email).first();
  if(previous)return reply({error:"Esses contatos de teste já foram utilizados. Gere novos dados fictícios."},409);
  const id=crypto.randomUUID();
  const completionToken=hex(crypto.getRandomValues(new Uint8Array(32)));
  const completionHash=hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(completionToken))));
  const referralCode="EB"+hex(crypto.getRandomValues(new Uint8Array(8))).toUpperCase();
  let referredBy=null;
  if(referral){
   const inviter=await env.DB.prepare("SELECT id,email,phone FROM test_leads WHERE referral_code=? LIMIT 1").bind(referral).first();
   if(inviter&&inviter.email!==email&&inviter.phone!==phone)referredBy=referral;
  }
  await env.DB.prepare("INSERT INTO test_leads (id,name,email,phone,bill_amount,discount_rate,property_type,club_code,consent_version,favorite_club,referral_code,referred_by_code,journey_token_hash) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
   .bind(id,name,email,phone,amount,rate,propertyType,"energy-business","teste-2026-10-27","",referralCode,referredBy,completionHash).run();
  return reply({ok:true,testOnly:true,id,referralCode,completionToken,attributed:Boolean(referredBy),
    message:"Dados fictícios registrados para teste. Nenhum contrato ou desconto real foi criado."},201);
 }catch{return reply({error:"Falha ao gravar o cadastro fictício. Tente novamente."},503)}
}