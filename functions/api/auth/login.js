import {cookie,MAX_AGE,sha256,json,originMatches} from "../../_lib/session.js";
const hexToBytes=h=>new Uint8Array((h.match(/.{2}/g)||[]).map(x=>parseInt(x,16)));
// Compatibilidade com o cadastro inicial, criado antes do ajuste do custo PBKDF2.
// A migração só ocorre após validar a senha fornecida contra o hash novo
// do MESMO salt e da MESMA conta, e nunca concede uma sessão sem confirmação.
const OLD_HASH="5b49f36e3b35842e5a77841f039373ae94ff0b80b37f87d1711058c2820b2cd5";
const OLD_SALT="fc82a53c470b22ec10f52dab15845c4a";
const INITIAL_100K_HASH="baef0da1b0aca0d50a05541b4c85274e88f598a900fb31ab1351740485624d40";
function sameBytes(a,b){
 if(a.length!==b.length)return false;
 let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
 return diff===0;
}
async function passwordMatches(password,account){
 const legacy=account.username==="gestor"&&Number(account.iterations)===150000&&account.password_salt===OLD_SALT&&account.password_hash===OLD_HASH;
 const iterations=legacy?100000:Number(account.iterations);
 if(!Number.isSafeInteger(iterations)||iterations<10000||iterations>100000)return {valid:false,legacy:false};
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
 const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:hexToBytes(account.password_salt),iterations,hash:"SHA-256"},key,256);
 const digest=new Uint8Array(bits);
 return {valid:sameBytes(digest,hexToBytes(legacy?INITIAL_100K_HASH:account.password_hash)),legacy};
}
export async function onRequestPost({request,env}){
 if(!env.DB)return json({error:"Acesso temporariamente indisponível."},503);
 if(!originMatches(request))return json({error:"Origem não autorizada."},403);
 if(!(request.headers.get("content-type")||"").startsWith("application/json"))return json({error:"Formato inválido."},415);
 if(Number(request.headers.get("content-length")||0)>1200)return json({error:"Dados excedem o limite."},413);
 let input;
 try{input=await request.json()}catch{return json({error:"Informe usuário e senha."},400)}
 const username=String(input?.username||"").trim().toLowerCase(),password=String(input?.password||"");
 if(username.length>80||password.length>200||!username||!password)return json({error:"Informe usuário e senha."},400);
 const now=Math.floor(Date.now()/1000);
 const ip=(request.headers.get("CF-Connecting-IP")||"unknown").slice(0,64);
 const ipKey=await sha256("energy-manager-login-v1:"+ip);
 try{
  const state=await env.DB.prepare("SELECT attempts,first_at,blocked_until FROM manager_login_attempts WHERE ip_key=?").bind(ipKey).first();
  if(state?.blocked_until>now)return json({error:"Muitas tentativas. Tente novamente em 15 minutos."},429);
  const account=await env.DB.prepare("SELECT username,password_salt,password_hash,iterations FROM manager_accounts WHERE username=?").bind(username).first();
  const verification=account?await passwordMatches(password,account):{valid:false,legacy:false};
  if(!verification.valid){
   const count=state?.first_at>now-900?Number(state.attempts)+1:1;
   const lock=count>=5?now+900:0;
   await env.DB.prepare("INSERT INTO manager_login_attempts(ip_key,attempts,first_at,blocked_until) VALUES (?,?,?,?) ON CONFLICT(ip_key) DO UPDATE SET attempts=excluded.attempts,first_at=excluded.first_at,blocked_until=excluded.blocked_until")
    .bind(ipKey,count,count===1?now:state.first_at,lock).run();
   return json({error:lock?"Muitas tentativas. Tente novamente em 15 minutos.":"Usuário ou senha incorretos."},lock?429:401);
  }
  if(verification.legacy){
   // Atualiza apenas o registro herdado conhecido, sem redefinir a credencial.
   await env.DB.prepare("UPDATE manager_accounts SET password_hash=?,iterations=? WHERE username=? AND password_hash=? AND iterations=?")
    .bind(INITIAL_100K_HASH,100000,account.username,OLD_HASH,150000).run();
  }
  await env.DB.prepare("DELETE FROM manager_login_attempts WHERE ip_key=?").bind(ipKey).run();
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  const token=Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
  await env.DB.prepare("INSERT INTO manager_sessions(token_hash,username,created_at,expires_at) VALUES (?,?,?,?)")
   .bind(await sha256(token),account.username,now,now+MAX_AGE).run();
  return json({ok:true,username:account.username,expiresAt:now+MAX_AGE},200,{"Set-Cookie":cookie(token)});
 }catch{return json({error:"Não foi possível autenticar. Tente novamente."},503)}
}
