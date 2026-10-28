import {cookie,MAX_AGE,sha256,json,originMatches} from "../../_lib/session.js";
const hexToBytes=h=>new Uint8Array((h.match(/.{2}/g)||[]).map(x=>parseInt(x,16)));
async function passwordMatches(password,account){
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
 const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:hexToBytes(account.password_salt),iterations:Number(account.iterations),hash:"SHA-256"},key,256);
 const a=new Uint8Array(bits),b=hexToBytes(account.password_hash);
 if(a.length!==b.length)return false;
 let bad=0;for(let i=0;i<a.length;i++)bad|=a[i]^b[i];
 return bad===0;
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
  const valid=account?await passwordMatches(password,account):false;
  if(!valid){
   const count=state?.first_at>now-900?Number(state.attempts)+1:1;
   const lock=count>=5?now+900:0;
   await env.DB.prepare("INSERT INTO manager_login_attempts(ip_key,attempts,first_at,blocked_until) VALUES (?,?,?,?) ON CONFLICT(ip_key) DO UPDATE SET attempts=excluded.attempts,first_at=excluded.first_at,blocked_until=excluded.blocked_until")
    .bind(ipKey,count,count===1?now:state.first_at,lock).run();
   return json({error:lock?"Muitas tentativas. Tente novamente em 15 minutos.":"Usuário ou senha incorretos."},lock?429:401);
  }
  await env.DB.prepare("DELETE FROM manager_login_attempts WHERE ip_key=?").bind(ipKey).run();
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  const token=Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
  await env.DB.prepare("INSERT INTO manager_sessions(token_hash,username,created_at,expires_at) VALUES (?,?,?,?)")
   .bind(await sha256(token),account.username,now,now+MAX_AGE).run();
  return json({ok:true,username:account.username,expiresAt:now+MAX_AGE},200,{"Set-Cookie":cookie(token)});
 }catch{return json({error:"Não foi possível autenticar. Tente novamente."},503)}
}
