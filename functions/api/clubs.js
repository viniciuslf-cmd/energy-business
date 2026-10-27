/* Lista pública: somente clubes habilitados pelo gestor. */
export async function onRequestGet({env}){
 if(!env.DB)return Response.json({clubs:[],error:"Lista indisponível."},{status:503,headers:{"Cache-Control":"no-store"}});
 try{
  const result=await env.DB.prepare("SELECT id,name,state FROM clubs WHERE is_active=1 ORDER BY name COLLATE NOCASE ASC LIMIT 500").all();
  return Response.json({clubs:result.results||[]},{headers:{"Cache-Control":"public, max-age=30","X-Content-Type-Options":"nosniff"}});
 }catch{return Response.json({clubs:[],error:"Lista indisponível."},{status:503,headers:{"Cache-Control":"no-store"}})}
}