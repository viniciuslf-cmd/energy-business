import {getSession,json} from "../../_lib/session.js";
export async function onRequestGet({request,env}){
 if(!await getSession(request,env))return json({error:"Autenticação obrigatória."},401);
 const demo=env.LEADS_ENABLED!=="true"&&env.TEST_MODE_DISABLED!=="true";
 const table=demo?"test_leads":"leads";
 try{
  const [data,count]=await Promise.all([
   env.DB.prepare("SELECT id,name,email,phone,bill_amount,property_type,status,favorite_club,created_at,referral_code,journey_completed_at FROM "+table+" ORDER BY created_at DESC LIMIT 500").all(),
   env.DB.prepare("SELECT COUNT(*) AS total FROM "+table).first()
  ]);
  return json({testOnly:demo,total:Number(count?.total||0),items:data.results||[],limited:Number(count?.total)>500});
 }catch{return json({error:"Não foi possível carregar as solicitações."},503)}
}
