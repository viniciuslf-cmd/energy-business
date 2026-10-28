import {getSession,json,originMatches} from "../../_lib/session.js";
const clean=v=>String(v??"").normalize("NFC").trim().replace(/\s+/g," ");
const encoder=new TextEncoder();
const bytesToHex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
const hexToBytes=s=>new Uint8Array((s.match(/.{2}/g)||[]).map(x=>parseInt(x,16)));
async function hashPass(pass,salt){
 const key=await crypto.subtle.importKey("raw",encoder.encode(pass),"PBKDF2",false,["deriveBits"]);
 return bytesToHex(new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:hexToBytes(salt),iterations:100000},key,256)));
}
function randomPassword(){
 const chars="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%";
 const bytes=crypto.getRandomValues(new Uint8Array(24));
 return Array.from(bytes,b=>chars[b%chars.length]).join("");
}
async function actor(request,env){
 const session=await getSession(request,env);
 if(!session)return null;
 const u=await env.DB.prepare("SELECT username,display_name,role FROM manager_accounts WHERE username=?").bind(session.username).first();
 return u||null;
}
export async function onRequestGet({request,env}){
 if(!env.DB)return json({error:"Banco indisponível."},503);
 const u=await actor(request,env);
 if(!u)return json({error:"Acesso não autorizado."},401);
 try{
  const list=await env.DB.prepare("SELECT username,display_name,role FROM manager_accounts ORDER BY CASE WHEN role='administrador' THEN 0 ELSE 1 END,username").all();
  return json({users:list.results||[],me:u,limit:3});
 }catch{return json({error:"Erro ao consultar sócios."},503)}
}
export async function onRequestPost({request,env}){
 if(!env.DB)return json({error:"Banco indisponível."},503);
 const me=await actor(request,env);
 if(!me)return json({error:"Acesso não autorizado."},401);
 if(me.role!=="administrador")return json({error:"Somente o administrador pode criar novos acessos."},403);
 if(!originMatches(request))return json({error:"Origem não autorizada."},403);
 let d;try{d=await request.json()}catch{return json({error:"Dados inválidos."},400)}
 const username=clean(d?.username).toLowerCase(),displayName=clean(d?.display_name);
 if(!/^[a-z][a-z0-9._-]{2,29}$/.test(username)||displayName.length<3||displayName.length>90)
  return json({error:"Informe nome do sócio e usuário (3 a 30 letras/números)."},400);
 try{
  const requested=typeof d?.password==="string"?d.password:"";
  if(requested && (requested.length<12 || requested.length>128 || !/[A-Za-z]/.test(requested) || !/[0-9]/.test(requested)))return json({error:"A senha provisória deve ter 12 a 128 caracteres, incluindo letras e números."},400);
  const pass=requested||randomPassword(),salt=bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash=await hashPass(pass,salt);
  const insert=await env.DB.prepare("INSERT INTO manager_accounts(username,display_name,role,password_salt,password_hash,iterations) SELECT ?,?,'socio',?,?,100000 WHERE (SELECT COUNT(*) FROM manager_accounts)<3 RETURNING username,display_name,role")
   .bind(username,displayName,salt,hash).first();
  if(!insert)return json({error:"Limite de três sócios atingido."},409);
  return json({user:insert,temporaryPassword:pass,warning:"Copie a senha agora. Ela não ficará disponível depois."},201);
 }catch(e){return json({error:/UNIQUE/i.test(String(e))?"Esse usuário já existe.":"Não foi possível criar o acesso."},409)}
}
export async function onRequestPatch({request,env}){
 if(!env.DB)return json({error:"Banco indisponível."},503);
 const me=await actor(request,env);
 if(!me)return json({error:"Acesso não autorizado."},401);
 if(!originMatches(request))return json({error:"Origem não autorizada."},403);
 let d;try{d=await request.json()}catch{return json({error:"Dados inválidos."},400)}
 const name=clean(d?.display_name);
 if(name.length<3||name.length>90)return json({error:"Informe seu nome completo (3 a 90 caracteres)."},400);
 try{
  await env.DB.prepare("UPDATE manager_accounts SET display_name=? WHERE username=?").bind(name,me.username).run();
  return json({ok:true,username:me.username,display_name:name});
 }catch{return json({error:"Não foi possível atualizar seu nome."},503)}
}
