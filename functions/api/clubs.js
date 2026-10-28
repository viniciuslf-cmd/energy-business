/* Lista pública: somente clubes habilitados pelo gestor. */
export async function onRequestGet({env}){
 if(!env.DB)return Response.json({clubs:[],error:"Lista indisponível."},{status:503,headers:{"Cache-Control":"no-store"}});
 try{
  const testing=env.LEADS_ENABLED!=="true"&&env.TEST_MODE_DISABLED!=="true";
 const table=testing?"test_clubs":"clubs";
 const result=await env.DB.prepare("SELECT c.id,c.name,c.state,CASE WHEN c.partner_confirmed=1 THEN c.club_share_percent ELSE NULL END AS club_share_percent,CASE WHEN c.partner_confirmed=1 THEN c.support_message ELSE NULL END AS support_message,c.partner_confirmed,CASE WHEN d.link_verified=1 THEN d.site_url ELSE NULL END AS site_url FROM "+table+" c LEFT JOIN club_destinations d ON d.club_id=c.id WHERE c.is_active=1 ORDER BY c.name COLLATE NOCASE ASC LIMIT 500").all();
  return Response.json({clubs:result.results||[],testOnly:testing},{headers:{"Cache-Control":"public, max-age=30","X-Content-Type-Options":"nosniff"}});
 }catch{return Response.json({clubs:[],error:"Lista indisponível."},{status:503,headers:{"Cache-Control":"no-store"}})}
}