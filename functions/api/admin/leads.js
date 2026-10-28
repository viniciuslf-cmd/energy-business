import {getSession} from "../../_lib/session.js";
const json=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff"}});
const statuses=new Set(["novo","em_analise","contatado","convertido","descartado"]);
const sources=new Set(["energy-business","clube-demo"]);
async function authorized(request,env){return Boolean(await getSession(request,env))}
export async function onRequestGet({request,env}){
  if(!(await authorized(request,env)))return json({error:"Acesso não autorizado."},401);
  if(!env.DB)return json({error:"Banco de dados indisponível."},503);
  const u=new URL(request.url),status=u.searchParams.get("status")||"",source=u.searchParams.get("source")||"";
  if((status&&!statuses.has(status))||(source&&!sources.has(source)))return json({error:"Filtro inválido."},400);
  const limit=Math.min(100,Math.max(1,Number.parseInt(u.searchParams.get("limit")||"50",10)||50));
  const page=Math.min(1000,Math.max(1,Number.parseInt(u.searchParams.get("page")||"1",10)||1));
  let where=" WHERE 1=1",params=[];
  if(status){where+=" AND status=?";params.push(status)}
  if(source){where+=" AND club_code=?";params.push(source)}
  try{
    const [count,rows,stats]=await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS total FROM leads"+where).bind(...params).first(),
      env.DB.prepare("SELECT id,created_at,updated_at,name,email,phone,bill_amount,discount_rate,property_type,club_code,status,notes FROM leads"+where+" ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?").bind(...params,limit,(page-1)*limit).all(),
      env.DB.prepare("SELECT status,COUNT(*) AS total FROM leads GROUP BY status").all()
    ]);
    return json({total:count.total,page,limit,items:rows.results||[],stats:stats.results||[]});
  }catch{return json({error:"Falha na consulta."},503)}
}
export async function onRequestPatch({request,env}){
  if(!(await authorized(request,env)))return json({error:"Acesso não autorizado."},401);
  if(!env.DB)return json({error:"Banco de dados indisponível."},503);
  if(request.headers.get("origin")!==new URL(request.url).origin)return json({error:"Origem não autorizada."},403);
  let d;try{d=await request.json()}catch{return json({error:"JSON inválido."},400)}
  if(!d||typeof d!=="object"||!(/^[0-9a-f-]{36}$/i.test(String(d.id||"")))||!statuses.has(d.status)||typeof d.notes!=="string"||d.notes.length>1200)
    return json({error:"Dados de atualização inválidos."},400);
  try{
    const result=await env.DB.prepare("UPDATE leads SET status=?, notes=?, updated_at=datetime('now') WHERE id=? RETURNING id,status,notes,updated_at").bind(d.status,d.notes.trim(),d.id).first();
    if(!result)return json({error:"Cadastro não encontrado."},404);
    return json({ok:true,item:result});
  }catch{return json({error:"Não foi possível atualizar."},503)}
}