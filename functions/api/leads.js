const json=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const sources=new Set(["clube-demo"]);
const profiles=new Set(["Residência","Empresa","Condomínio"]);
export async function onRequestPost({request,env}){
  if(env.LEADS_ENABLED!=="true" || !env.DB || !env.TURNSTILE_SITE_KEY || !env.TURNSTILE_SECRET || !env.PRIVACY_CONTACT){
    return json({error:"O recebimento de solicitações ainda não está disponível."},503);
  }
  const origin=request.headers.get("origin");
  if(!origin || origin!==new URL(request.url).origin)return json({error:"Origem não autorizada."},403);
  if(!(request.headers.get("content-type")||"").startsWith("application/json"))return json({error:"Envie JSON."},415);
  if(Number(request.headers.get("content-length")||0)>8192)return json({error:"Solicitação muito grande."},413);
  let data;try{data=await request.json()}catch{return json({error:"Dados inválidos."},400)}
  if(!data||typeof data!=="object"||Array.isArray(data))return json({error:"Dados inválidos."},400);
  if(data.website)return json({ok:true},201);
  const name=String(data.name||"").trim().replace(/\s+/g," ");
  const email=String(data.email||"").trim().toLowerCase();
  const phone=String(data.phone||"").replace(/\D/g,"");
  const billAmount=Number(data.billAmount),rate=Number(data.rate);
  const propertyType=String(data.propertyType||"");
  const clubCode=String(data.clubCode||"");
  // O time é uma preferência do visitante. A origem comercial permanece Energy Business.
  const favoriteClub=String(data.favoriteClub||"").trim().replace(/\s+/g," ");
  const referredByCode=String(data.referredByCode||"").trim().toUpperCase();
  const turnstileToken=String(data.turnstileToken||"");
  if(name.length<2||name.length>120||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||
    !/^\d{10,13}$/.test(phone)||!Number.isInteger(billAmount)||billAmount<50||billAmount>1000000||
    ![10,15,20].includes(rate)||!profiles.has(propertyType)||!sources.has(clubCode)||
    favoriteClub.length>70||/[\u0000-\u001f\u007f]/.test(favoriteClub)||
    (referredByCode&&!/^EB[A-F0-9]{16}$/.test(referredByCode))||
    data.consent!==true||turnstileToken.length<10||turnstileToken.length>4096){
    return json({error:"Revise os campos e confirme a Política de Privacidade."},400);
  }
  const payload=new URLSearchParams({secret:env.TURNSTILE_SECRET,response:turnstileToken});
  const ip=request.headers.get("CF-Connecting-IP");if(ip)payload.set("remoteip",ip);
  let verification;
  try{
    const r=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body:payload,signal:AbortSignal.timeout(6000)});
    verification=await r.json();
  }catch{return json({error:"Não foi possível verificar a segurança. Tente novamente."},503)}
  if(!verification.success||verification.hostname!==new URL(request.url).hostname)
    return json({error:"Verificação de segurança não concluída. Tente novamente."},400);
  try{
    const duplicate=await env.DB.prepare("SELECT id FROM leads WHERE phone=? AND created_at>=datetime('now','-15 minutes') LIMIT 1").bind(phone).first();
    if(duplicate)return json({ok:true,message:"Recebemos uma solicitação recente com esse telefone."},200);
    const id=crypto.randomUUID();
    // Código de convite aleatório não contém nome, telefone ou outro dado pessoal.
    const referralCode="EB"+Array.from(crypto.getRandomValues(new Uint8Array(8)),v=>v.toString(16).padStart(2,"0")).join("").toUpperCase();
    let validRef=null;
    if(referredByCode){
      const owner=await env.DB.prepare("SELECT phone FROM leads WHERE referral_code=? LIMIT 1").bind(referredByCode).first();
      if(owner&&owner.phone!==phone)validRef=referredByCode;
    }
    await env.DB.prepare("INSERT INTO leads (id,name,email,phone,bill_amount,discount_rate,property_type,club_code,consent_version,consent_at,status,favorite_club,referral_code,referred_by_code) VALUES (?,?,?,?,?,?,?,?,?,datetime('now'),'novo',?,?,?)")
      .bind(id,name,email,phone,billAmount,rate,propertyType,clubCode,"v1-2026-10-26",favoriteClub,referralCode,validRef).run();
    return json({ok:true,id,referralCode,message:"Solicitação recebida. Nossa equipe poderá entrar em contato após a análise. O programa de indicação depende de regulamento e elegibilidade."},201);
  }catch{return json({error:"Não foi possível registrar a solicitação agora."},503)}
}