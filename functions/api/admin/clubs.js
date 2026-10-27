/* Energy Business: cadastro de clubes autorizado exclusivamente por chave do gestor. */
const respond=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff"}});
const normalized=v=>String(v??"").normalize("NFC").replace(/\s+/g," ").trim();
async function authorized(request,env){
 const expected=env.ADMIN_TOKEN;
 const token=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!expected||!token||token.length>512)return false;
 const t=new TextEncoder();
 const [aa,bb]=await Promise.all([crypto.subtle.digest("SHA-256",t.encode(expected)),crypto.subtle.digest("SHA-256",t.encode(token))]);
 const a=new Uint8Array(aa),b=new Uint8Array(bb);
 let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];
 return difference===0;
}
function validClub(data){
 if(!data||typeof data!=="object"||Array.isArray(data))return null;
 const name=normalized(data.name),state=normalized(data.state||"").toUpperCase();
 const share=Number(data.club_share_percent??0);
 const support=normalized(data.support_message||"");
 const partnered=data.partner_confirmed===true;
 if(name.length<2||name.length>80||/[<>\/\\\x00-\x1F\x7F]/.test(name)||/\d{6}/.test(name)||!/^$|^[A-Z]{2}$/.test(state)||typeof data.is_active!=="boolean"||!Number.isFinite(share)||share<0||share>100||Math.round(share*100)!==Math.round(share*100*100)/100||support.length>650||typeof data.partner_confirmed!=="boolean")return null;
 return {name,state,is_active:data.is_active?1:0,club_share_percent:Math.round(share*100)/100,support_message:support,partner_confirmed:partnered?1:0};
}
function originOkay(request){
 const origin=request.headers.get("origin");
 return !!origin&&origin===new URL(request.url).origin;
}
export async function onRequestGet({request,env}){
 if(!(await authorized(request,env)))return respond({error:"Autorização administrativa obrigatória."},401);
 if(!env.DB)return respond({error:"Banco de clubes indisponível."},503);
 try{
  const q=await env.DB.prepare("SELECT id,name,state,is_active,club_share_percent,support_message,partner_confirmed,created_at,updated_at FROM clubs ORDER BY name COLLATE NOCASE ASC LIMIT 500").all();
  return respond({clubs:q.results||[]});
 }catch{return respond({error:"Não foi possível consultar os clubes."},503)}
}
export async function onRequestPost({request,env}){
 if(!(await authorized(request,env)))return respond({error:"Autorização administrativa obrigatória."},401);
 if(!originOkay(request))return respond({error:"Origem não autorizada."},403);
 if(!env.DB)return respond({error:"Banco de clubes indisponível."},503);
 if(!(request.headers.get("content-type")||"").startsWith("application/json"))return respond({error:"Formato inválido."},415);
 if(Number(request.headers.get("content-length")||0)>3000)return respond({error:"Dados excedem o limite."},413);
 let data;try{data=await request.json()}catch{return respond({error:"Dados inválidos."},400)}
 const club=validClub(data);
 if(!club)return respond({error:"Informe um nome válido, UF de duas letras e visibilidade."},400);
 try{
  const id=crypto.randomUUID();
  const row=await env.DB.prepare("INSERT INTO clubs (id,name,state,is_active,club_share_percent,support_message,partner_confirmed) VALUES(?,?,?,?,?,?,?) RETURNING id,name,state,is_active,club_share_percent,support_message,partner_confirmed,created_at,updated_at").bind(id,club.name,club.state,club.is_active,club.club_share_percent,club.support_message,club.partner_confirmed).first();
  return respond({club:row},201);
 }catch(err){
  if(/UNIQUE/i.test(String(err)))return respond({error:"Esse clube já está cadastrado."},409);
  return respond({error:"Não foi possível cadastrar o clube."},503);
 }
}
export async function onRequestPatch({request,env}){
 if(!(await authorized(request,env)))return respond({error:"Autorização administrativa obrigatória."},401);
 if(!originOkay(request))return respond({error:"Origem não autorizada."},403);
 if(!env.DB)return respond({error:"Banco de clubes indisponível."},503);
 if(!(request.headers.get("content-type")||"").startsWith("application/json"))return respond({error:"Formato inválido."},415);
 if(Number(request.headers.get("content-length")||0)>3000)return respond({error:"Dados excedem o limite."},413);
 let data;try{data=await request.json()}catch{return respond({error:"Dados inválidos."},400)}
 const club=validClub(data),id=String(data?.id||"");
 if(!club||!/^[0-9a-f-]{36}$/i.test(id))return respond({error:"Campos inválidos."},400);
 try{
  const row=await env.DB.prepare("UPDATE clubs SET name=?,state=?,is_active=?,club_share_percent=?,support_message=?,partner_confirmed=?,updated_at=datetime('now') WHERE id=? RETURNING id,name,state,is_active,club_share_percent,support_message,partner_confirmed,created_at,updated_at").bind(club.name,club.state,club.is_active,club.club_share_percent,club.support_message,club.partner_confirmed,id).first();
  if(!row)return respond({error:"Clube não encontrado."},404);
  return respond({club:row});
 }catch(err){
  if(/UNIQUE/i.test(String(err)))return respond({error:"Já existe outro clube com esse nome."},409);
  return respond({error:"Não foi possível atualizar o clube."},503);
 }
}