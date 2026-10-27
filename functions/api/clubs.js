/* Lista pública: somente clubes habilitados pelo gestor. */
export async function onRequestGet({env}){
 if(!env.DB)return Response.json({clubs:[],error:"Lista indisponível."},{status:503,headers:{"Cache-Control":"no-store"}});
 try{
  const testing=env.LEADS_ENABLED!=="true"&&env.TEST_MODE_DISABLED!=="true";
 const table=testing?"test_clubs":"clubs";
 const result=await env.DB.prepare("SELECT id,name,state,CASE WHEN partner_confirmed=1 THEN club_share_percent ELSE NULL END AS club_share_percent,CASE WHEN partner_confirmed=1 THEN support_message ELSE NULL END AS support_message,partner_confirmed FROM "+table+" WHERE is_active=1 ORDER BY name COLLATE NOCASE ASC LIMIT 500").all();
  return Response.json({clubs:result.results||[],testOnly:testing},{headers:{"Cache-Control":"public, max-age=30","X-Content-Type-Options":"nosniff"}});
 }catch{return Response.json({clubs:[],error:"Lista indisponível."},{status:503,headers:{"Cache-Control":"no-store"}})}
}