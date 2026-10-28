import {getSession,json,originMatches,readCookie,sha256} from "../../_lib/session.js";
const toBytes=h=>new Uint8Array((h.match(/.{2}/g)||[]).map(x=>parseInt(x,16)));
const hex=a=>Array.from(a,b=>b.toString(16).padStart(2,"0")).join("");
async function derive(pass,salt,it){
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(pass),"PBKDF2",false,["deriveBits"]);
 return new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:toBytes(salt),iterations:it},key,256));
}
export async function onRequestPost({request,env}){
 const session=await getSession(request,env);if(!session)return json({error:"Acesso não autorizado."},401);
 if(!originMatches(request))return json({error:"Origem não autorizada."},403);
 let d;try{d=await request.json()}catch{return json({error:"Dados inválidos."},400)}
 const old=String(d?.current_password||""),pass=String(d?.new_password||"");
 if(old.length<1||old.length>200||pass.length<12||pass.length>128||!/\d/.test(pass)||!/[A-Za-z]/.test(pass)||old===pass)
  return json({error:"A nova senha deve ter pelo menos 12 caracteres, letras e números, e ser diferente da atual."},400);
 try{
  const a=await env.DB.prepare("SELECT password_hash,password_salt,iterations FROM manager_accounts WHERE username=?").bind(session.username).first();
  if(!a||Number(a.iterations)>100000)return json({error:"Credencial antiga: entre novamente antes de trocar a senha."},409);
  const check=await derive(old,a.password_salt,Number(a.iterations)),expected=toBytes(a.password_hash);
  let diff=check.length!==expected.length?1:0;for(let i=0;i<Math.min(check.length,expected.length);i++)diff|=check[i]^expected[i];
  if(diff!==0)return json({error:"A senha atual não confere."},403);
  const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
  const hashed=hex(await derive(pass,salt,100000));
  await env.DB.prepare("UPDATE manager_accounts SET password_hash=?,password_salt=?,iterations=100000 WHERE username=?").bind(hashed,salt,session.username).run();
  const current=readCookie(request);
  await env.DB.prepare("DELETE FROM manager_sessions WHERE username=? AND token_hash<>?").bind(session.username,await sha256(current)).run();
  return json({ok:true,message:"Senha alterada. Outras sessões desta conta foram encerradas."});
 }catch{return json({error:"Não foi possível alterar a senha."},503)}
}
