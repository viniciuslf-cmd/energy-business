import {getSession,json,originMatches} from "../../_lib/session.js";
const types=new Set(["clube","empresa","condominio","instituicao","outro"]);
const stages=new Set(["pendente","contato","negociacao","acordo","contrato","pausado","perdido"]);
const clean=v=>String(v??"").normalize("NFC").replace(/\s+/g," ").trim();
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function percent(v){if(v===null||v===undefined||v==="")return null;const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=100?Math.round(n*100)/100:NaN}
function integer(v,max){if(v===null||v===undefined||v==="")return null;const n=Number(v);return Number.isInteger(n)&&n>=0&&n<=max?n:NaN}
function money(v){if(v===null||v===undefined||v==="")return null;const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=1000000000?Math.round(n*100)/100:NaN}
function validate(d){
 if(!d||typeof d!=="object"||Array.isArray(d))return null;
 const name=clean(d.name),category=String(d.category||"clube"),status=String(d.status||"pendente");
 const fan_count=integer(d.fan_count,300000000),potential_accounts=integer(d.potential_accounts,100000000),
 club_discount_percent=percent(d.club_discount_percent),energy_return_percent=percent(d.energy_return_percent),
 club_share_percent=percent(d.club_share_percent),monthly_bill_estimate=money(d.monthly_bill_estimate);
 const notes=clean(d.notes),contact_name=clean(d.contact_name),contact_phone=clean(d.contact_phone),energy_provider=clean(d.energy_provider);
 const current_energy_supplier=clean(d.current_energy_supplier);
 const current_contract_end_date=clean(d.current_contract_end_date);
 const monthly_energy_consumption=(d.monthly_energy_consumption===null||d.monthly_energy_consumption===undefined||d.monthly_energy_consumption==="")?null:Number(d.monthly_energy_consumption);
 const monthly_energy_unit=String(d.monthly_energy_unit||"MWh"),purchase_modality=String(d.purchase_modality||"");
 const dateValid=!current_contract_end_date||(/^\d{4}-\d{2}-\d{2}$/.test(current_contract_end_date)&&!Number.isNaN(Date.parse(current_contract_end_date+"T00:00:00Z"))&&new Date(current_contract_end_date+"T00:00:00Z").toISOString().startsWith(current_contract_end_date));
 const club_id=d.club_id?String(d.club_id):null;
 if(name.length<2||name.length>140||/[<>\u0000-\u001f]/.test(name)||!types.has(category)||!stages.has(status)||
 [fan_count,potential_accounts,club_discount_percent,energy_return_percent,club_share_percent,monthly_bill_estimate].some(Number.isNaN)||
 notes.length>3000||contact_name.length>110||contact_phone.length>40||energy_provider.length>120||/[<>\u0000-\u001f\u007f]/.test(energy_provider)||
 current_energy_supplier.length>120||/[<>\u0000-\u001f\u007f]/.test(current_energy_supplier)||!dateValid||
 (monthly_energy_consumption!==null&&(!Number.isFinite(monthly_energy_consumption)||monthly_energy_consumption<0||monthly_energy_consumption>1000000000000))||
 !["MWh","kWh"].includes(monthly_energy_unit)||!["","varejista","atacadista","cativo"].includes(purchase_modality)||
 (club_id&&!uuid.test(club_id))||(category!=="clube"&&club_id))return null;
 return {name,category,status,fan_count,potential_accounts,club_discount_percent,energy_return_percent,club_share_percent,monthly_bill_estimate,notes,contact_name,contact_phone,energy_provider,current_energy_supplier,current_contract_end_date,monthly_energy_consumption,monthly_energy_unit,purchase_modality,club_id};
}
const fields=["name","category","status","fan_count","potential_accounts","club_discount_percent","energy_return_percent","club_share_percent","monthly_bill_estimate","notes","contact_name","contact_phone","energy_provider","current_energy_supplier","current_contract_end_date","monthly_energy_consumption","monthly_energy_unit","purchase_modality","club_id"];
async function validateClub(env,data){
 if(!data.club_id)return true;
 const tbl=env.LEADS_ENABLED==="true"?"clubs":"test_clubs";
 const row=await env.DB.prepare("SELECT id FROM "+tbl+" WHERE id=?").bind(data.club_id).first();
 return !!row;
}
async function logEvent(env,id,actor,event,detail){
 await env.DB.prepare("INSERT INTO partner_history(id,partner_id,event,detail,performed_by) VALUES(?,?,?,?,?)")
  .bind(crypto.randomUUID(),id,event,detail,actor).run();
}
export async function onRequestGet({request,env}){
 const session=await getSession(request,env);if(!session)return json({error:"Faça login para acessar parceiros."},401);
 try{
  const [items,events]=await Promise.all([
   env.DB.prepare("SELECT p.*,COALESCE(a.display_name,'') AS author_name,COALESCE(b.display_name,'') AS editor_name FROM strategic_partners p LEFT JOIN manager_accounts a ON a.username=p.created_by LEFT JOIN manager_accounts b ON b.username=p.updated_by ORDER BY p.updated_at DESC,p.name COLLATE NOCASE ASC LIMIT 500").all(),
   env.DB.prepare("SELECT h.*,COALESCE(a.display_name,'') AS author_name FROM partner_history h LEFT JOIN manager_accounts a ON a.username=h.performed_by ORDER BY h.created_at DESC LIMIT 500").all()
  ]);
  return json({partners:items.results||[],history:events.results||[],testMode:env.LEADS_ENABLED!=="true"});
 }catch{return json({error:"Não foi possível carregar as negociações."},503)}
}
export async function onRequestPost({request,env}){
 const session=await getSession(request,env);if(!session)return json({error:"Faça login para cadastrar parceiros."},401);
 if(!originMatches(request))return json({error:"Origem não autorizada."},403);
 if(Number(request.headers.get("content-length")||0)>6000)return json({error:"Dados acima do limite."},413);
 let data;try{data=validate(await request.json())}catch{return json({error:"Envie dados válidos."},400)}
 if(!data)return json({error:"Revise os campos da negociação."},400);
 if(!await validateClub(env,data))return json({error:"Clube não encontrado neste ambiente."},400);
 try{
  const id=crypto.randomUUID();
  const sql="INSERT INTO strategic_partners(id,"+fields.join(",")+",created_by,updated_by,is_test) VALUES (?,"+fields.map(()=>"?").join(",")+",?,?,?)";
  await env.DB.prepare(sql).bind(id,...fields.map(k=>data[k]),session.username,session.username,env.LEADS_ENABLED==="true"?0:1).run();
  await logEvent(env,id,session.username,"criacao",JSON.stringify({status:data.status}));
  const row=await env.DB.prepare("SELECT * FROM strategic_partners WHERE id=?").bind(id).first();
  return json({partner:row},201);
 }catch(e){return json({error:/UNIQUE/i.test(String(e))?"Esse clube já possui cadastro de negociação.":"Não foi possível registrar o parceiro."},409)}
}
export async function onRequestPatch({request,env}){
 const session=await getSession(request,env);if(!session)return json({error:"Faça login para editar parceiros."},401);
 if(!originMatches(request))return json({error:"Origem não autorizada."},403);
 if(Number(request.headers.get("content-length")||0)>6000)return json({error:"Dados acima do limite."},413);
 let raw;try{raw=await request.json()}catch{return json({error:"Envie dados válidos."},400)}
 const id=String(raw?.id||""),data=validate(raw);
 if(!uuid.test(id)||!data)return json({error:"Revise os dados para atualização."},400);
 if(!await validateClub(env,data))return json({error:"Clube não encontrado."},400);
 try{
  const previous=await env.DB.prepare("SELECT * FROM strategic_partners WHERE id=?").bind(id).first();
  if(!previous)return json({error:"Parceiro não encontrado."},404);
  const changed=fields.filter(k=>String(previous[k]??"")!==String(data[k]??""));
  const sql="UPDATE strategic_partners SET "+fields.map(k=>k+"=?").join(",")+",updated_by=?,updated_at=datetime('now') WHERE id=?";
  await env.DB.prepare(sql).bind(...fields.map(k=>data[k]),session.username,id).run();
  if(changed.length)await logEvent(env,id,session.username,"atualizacao",JSON.stringify({fields:changed,from:previous.status,to:data.status}));
  const row=await env.DB.prepare("SELECT * FROM strategic_partners WHERE id=?").bind(id).first();
  return json({partner:row,changed});
 }catch(e){return json({error:/UNIQUE/i.test(String(e))?"Este clube está vinculado a outra negociação.":"Não foi possível atualizar o parceiro."},409)}
}
