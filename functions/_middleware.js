import {getSession,json} from "./_lib/session.js";
export async function onRequest(context){
 const {request,env}=context;
 const pathname=new URL(request.url).pathname;
 const page=pathname==="/admin"||pathname.startsWith("/admin/");
 const login=pathname==="/admin/login"||pathname.startsWith("/admin/login/");
 const api=pathname.startsWith("/api/admin/")||pathname==="/api/test/clubs"||pathname.startsWith("/api/test/clubs/");
 if((page&&!login)||api){
  const session=await getSession(request,env);
  if(!session){
   if(api)return json({error:"Sessão expirada ou acesso não autorizado. Entre no Painel de Gestão."},401);
   const target=new URL("/admin/login/",request.url);
   target.searchParams.set("next",pathname+new URL(request.url).search);
   return Response.redirect(target,303);
  }
 }
 const response=await context.next();
 if(page){
  const result=new Response(response.body,response);
  result.headers.set("Cache-Control","no-store, private");
  result.headers.set("X-Frame-Options",pathname.startsWith("/admin/indicacoes/")?"SAMEORIGIN":"DENY");
  result.headers.set("Content-Security-Policy",pathname.startsWith("/admin/indicacoes/")?"frame-ancestors 'self'":"frame-ancestors 'none'");
  result.headers.set("X-Content-Type-Options","nosniff");
  result.headers.set("Referrer-Policy","same-origin");
  return result;
 }
 return response;
}
