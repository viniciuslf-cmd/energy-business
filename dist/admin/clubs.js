/* Cadastro de clubes: listagem pública sem login;
   criação e alterações requerem ADMIN_TOKEN, mantido somente na memória da página. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const rows=$("club-rows"),form=$("club-new-form");
if(!rows||!form)return;
let clubs=[],editable=true,busy=false,testClubsMode=false;
$("club-new-toggle").addEventListener("click",()=>{const open=form.hidden;form.hidden=!open;$("club-new-heading").hidden=!open;$("club-new-toggle").setAttribute("aria-expanded",String(open));$("club-new-toggle").textContent=open?"Cancelar cadastro":"+ Cadastrar clube";if(open){form.scrollIntoView({block:"start",behavior:"smooth"});$("club-name").focus({preventScroll:true})}});
const message=(text,error=false)=>{
 const el=$("club-message");el.textContent=text;el.classList.toggle("error",error);
};
function stateLabels(){
 $("club-login").hidden=true;
 form.hidden=true;$("club-new-heading").hidden=true;$("club-new-toggle").setAttribute("aria-expanded","false");
}
function cell(tr,child){
 const td=document.createElement("td");
 if(typeof child==="string")td.textContent=child;
 else if(child)td.appendChild(child);
 tr.appendChild(td);return td;
}
function control(type,value,cls,limit){
 const input=document.createElement("input");
 input.type=type;input.value=value||"";
 input.className="club-field "+cls;
 if(limit)input.maxLength=limit;
 return input;
}
function publishLabel(active){
 const span=document.createElement("span");
 span.className="club-state-badge"+(active?"":" off");
 span.textContent=active?"Visível":"Oculto";
 return span;
}
function render(){
 $("clubs-count").textContent=clubs.length+" clube"+(clubs.length===1?"":"s");
 rows.replaceChildren();
 $("club-empty").hidden=clubs.length>0;
 for(const club of clubs){
  const tr=document.createElement("tr");tr.dataset.id=club.id;
  if(!editable){
   const name=document.createElement("b");name.textContent=club.name;cell(tr,name);
   cell(tr,club.state||"—");
   cell(tr,publishLabel(Boolean(club.is_active)));
   cell(tr,club.site_url||"Sem endereço");
   cell(tr,club.link_verified?"Validado":"Pendente");
   cell(tr,club.partner_confirmed?String(club.club_share_percent??0)+"%":"Não divulgado");
   cell(tr,club.partner_confirmed?(club.support_message||"Conforme contrato"):"Parceria ainda não confirmada");
   cell(tr,club.partner_confirmed?"Formalizada":"Não confirmada");
   const info=document.createElement("span");info.textContent="Somente leitura";cell(tr,info);
  }else{
   const name=control("text",club.name,"name",80);
   name.required=true;name.minLength=2;
   cell(tr,name);
   const uf=control("text",club.state||"","state",2);
   uf.pattern="[A-Za-z]{2}";uf.placeholder="UF";cell(tr,uf);
   const stateWrapper=document.createElement("label");
   stateWrapper.className="club-enabled";
   const checked=document.createElement("input");checked.type="checkbox";checked.checked=Boolean(club.is_active);
   stateWrapper.append(checked,document.createTextNode(" Visível no site"));
   cell(tr,stateWrapper);
   const site=control("url",club.site_url||"","site-url",500);site.placeholder="https://clube.com.br";site.style.minWidth="220px";cell(tr,site);
   const linkLabel=document.createElement("label");linkLabel.className="club-enabled";
   const linkCheck=document.createElement("input");linkCheck.type="checkbox";linkCheck.checked=Boolean(club.link_verified);
   linkLabel.append(linkCheck,document.createTextNode(" Conferido"));cell(tr,linkLabel);
   const share=control("number",String(club.club_share_percent??0),"share club-share-input",8);
   share.min="0";share.max="100";share.step="0.01";share.required=true;
   cell(tr,share);
   const support=document.createElement("textarea");
   support.className="club-table-message";support.maxLength=650;support.rows=3;
   support.value=club.support_message||"";
   cell(tr,support);
   const partnerLabel=document.createElement("label");partnerLabel.className="club-partner-label";
   const partnerCheck=document.createElement("input");partnerCheck.type="checkbox";partnerCheck.checked=Boolean(club.partner_confirmed);
   partnerLabel.append(partnerCheck,document.createTextNode(" Formalizada"));
   cell(tr,partnerLabel);
   const save=document.createElement("button");save.type="button";save.className="btn";save.textContent="Salvar";
   save.disabled=busy;
   save.onclick=async()=>{
    if(!name.reportValidity()||!uf.reportValidity()||!site.reportValidity()||!share.reportValidity())return;
    save.disabled=true;
    try{
     await updateClub({id:club.id,name:name.value.trim(),state:uf.value.trim().toUpperCase(),is_active:checked.checked,club_share_percent:Number(share.value),support_message:support.value.trim(),partner_confirmed:partnerCheck.checked});
     await updateLink(club.id,site.value.trim(),linkCheck.checked);
     await getClubs();
     message("Clube e endereço atualizados. O visitante só terá acesso a links conferidos.");
    }catch(err){message(err.message,true)}
    finally{save.disabled=false}
   };
   cell(tr,save);
  }
  rows.appendChild(tr);
 }
}
async function api(path,opts={}){
 const headers={...(opts.body?{"Content-Type":"application/json"}:{})};
 const target=testClubsMode?path.replace("/api/admin/clubs","/api/test/clubs"):path;
 const r=await fetch(target,{...opts,headers,cache:"no-store"});
 let data={};try{data=await r.json()}catch{}
 if(!r.ok)throw Error(data.error||"Falha de comunicação");
 return data;
}
async function getClubs(){
 if(editable){
  const data=await api("/api/admin/clubs");
  clubs=data.clubs||[];
 }else{
  const data=await api("/api/clubs");
  clubs=(data.clubs||[]).map(c=>({...c,is_active:1}));
 }
 render();
}
async function updateLink(id,url,verified){return api("/api/admin/club-link",{method:"POST",body:JSON.stringify({club_id:id,site_url:url,verified})})}
async function updateClub(input){
 const d=await api("/api/admin/clubs",{method:"PATCH",body:JSON.stringify(input)});
 const i=clubs.findIndex(c=>c.id===input.id);
 if(i!==-1)clubs[i]=d.club;
 render();
}
form.addEventListener("submit",async e=>{
 e.preventDefault();
 if(!editable||busy||!form.reportValidity())return;
 busy=true;
 const submit=form.querySelector('button[type="submit"]');submit.disabled=true;
 const input={
  name:$("club-name").value.trim(),
  state:$("club-state").value.trim().toUpperCase(),
  is_active:$("club-active").checked,
  club_share_percent:Number($("club-share").value),
  support_message:$("club-support-message").value.trim(),
  partner_confirmed:$("club-partner-confirmed").checked
 };
 const url=$("club-site-url").value.trim(),verified=$("club-link-verified").checked;
 try{
  const data=await api("/api/admin/clubs",{method:"POST",body:JSON.stringify(input)});
  if(url||verified)await updateLink(data.club.id,url,verified);
  await getClubs();form.reset();form.hidden=true;$("club-new-heading").hidden=true;$("club-new-toggle").textContent="+ Cadastrar clube";$("club-new-toggle").setAttribute("aria-expanded","false");
  message("Clube cadastrado. Somente endereços validados são disponibilizados aos visitantes.");
 }catch(err){message(err.message,true)}
 finally{busy=false;submit.disabled=false}
});
$("refresh")?.addEventListener("click",async()=>{
 try{await getClubs()}catch(err){message(err.message,true)}
});
async function beginManager(){
 try{
  const response=await fetch("/api/config",{cache:"no-store"});
  const settings=response.ok?await response.json():{};
  if(settings.testingEnabled){
   testClubsMode=true;editable=true;
   $("club-intro-title").textContent="Gestão liberada após login";
   $("club-intro-desc").textContent="Cadastre clubes e endereços HTTPS validados. Os registros deste ambiente são de teste.";
   $("club-test-badge").hidden=false;
   $("club-caveat").textContent="Somente homologação: endereços devem ser conferidos antes de divulgar. A exibição de clube ou URL não representa confirmação de parceria comercial.";
   const partnerCheck=$("club-partner-confirmed");
   if(partnerCheck?.parentElement)partnerCheck.parentElement.lastChild.textContent=" Parceria simulada";
  }
 }catch(e){console.warn("Não foi possível identificar o ambiente de testes.")}
 stateLabels();
 try{
  await getClubs();
  message(testClubsMode
   ?"Login confirmado: catálogo de testes liberado. Marque “Visível no site” para incluir o clube na seleção."
   :"Login confirmado: cadastro e edição de clubes liberados.");
 }catch(e){message(e.message||"Não foi possível carregar os clubes.",true)}
}
beginManager();
})();