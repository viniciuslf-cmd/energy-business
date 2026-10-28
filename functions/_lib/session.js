/* Autenticação do painel Energy Business: sessões opacas armazenadas no D1. */
export const COOKIE_NAME="eb_manager_session";
export const MAX_AGE=12*60*60;
const enc=new TextEncoder();
export async function sha256(value){
 const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(value)));
 return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
}
export function readCookie(request){
 const all=request.headers.get("cookie")||"";
 const part=all.split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE_NAME+"="));
 const token=part?.slice(COOKIE_NAME.length+1)||"";
 return /^[a-f0-9]{64}$/.test(token)?token:null;
}
export async function getSession(request,env){
 if(!env.DB)return null;
 const token=readCookie(request);
 if(!token)return null;
 try{
  const hash=await sha256(token);
  const row=await env.DB.prepare("SELECT username,expires_at FROM manager_sessions WHERE token_hash=? AND expires_at>? LIMIT 1").bind(hash,Math.floor(Date.now()/1000)).first();
  return row||null;
 }catch{return null}
}
export function cookie(value,age=MAX_AGE){
 return COOKIE_NAME+"="+value+"; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age="+age;
}
export function json(data,status=200,headers={}){
 return Response.json(data,{status,headers:{"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff",...headers}});
}
export function originMatches(request){return request.headers.get("origin")===new URL(request.url).origin}
