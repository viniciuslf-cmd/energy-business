import {getSession,json} from "../../_lib/session.js";
export async function onRequestGet({request,env}){
 const session=await getSession(request,env);
 if(!session)return json({authenticated:false},401);
 return json({authenticated:true,username:session.username,expiresAt:session.expires_at});
}
