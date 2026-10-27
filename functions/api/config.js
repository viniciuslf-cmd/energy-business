const json=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
export function onRequestGet({env}){
  const acceptingLeads=env.LEADS_ENABLED==="true" && !!env.DB && !!env.TURNSTILE_SITE_KEY && !!env.TURNSTILE_SECRET && !!env.PRIVACY_CONTACT;
  const testingEnabled=!acceptingLeads && env.LEADS_ENABLED!=="true" && env.TEST_MODE_DISABLED!=="true" && !!env.DB;
  return json({acceptingLeads,testingEnabled,turnstileSiteKey:acceptingLeads?env.TURNSTILE_SITE_KEY:null,version:"3"});
}