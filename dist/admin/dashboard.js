/* Energy Business — navegador interno de gestao, CRM estrategico e acessos dos socios. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const panes=new Map([...document.querySelectorAll("[data-view-pane]")].map(el=>[el.dataset.viewPane,el]));
const links=[...document.querySelectorAll("#dashboard-navigation [data-view]")];
const titles={inicio:"Visão geral",solicitacoes:"Clientes pessoa física",clubes:"Clubes",parceiros:"Gestão de clientes",indicacoes:"Indicações",portal:"Portal dos clubes",simulador:"Simulador",privacidade:"Privacidade",socios:"Acessos dos sócios"};
const main=$("dashboard-main");
let current="inicio",partners=[],histories=[],partnerLoaded=false,usersLoaded=false,currentUser=null,clubs=[];
const labels={pendente:"Pendente",contato:"Em contato",negociacao:"Em negociação",acordo:"Acordo concluído",contrato:"Contrato assinado",pausado:"Pausado",perdido:"Não avançou"};
const categories={clube:"Clube de futebol",empresa:"Empresa",condominio:"Condomínio",instituicao:"Instituição",outro:"Outro"};
const numbers=v=>Number(v||0).toLocaleString("pt-BR");
const pct=v=>v===null||v===undefined?"—":Number(v).toLocaleString("pt-BR",{maximumFractionDigits:2})+"%";
const fmtDate=d=>{
 if(!d)return "—";
 const date=new Date(String(d).includes("T")?d:String(d).replace(" ","T")+"Z");
 return Number.isNaN(date.getTime())?String(d):date.toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
};
function setMessage(id,message,error=false){
 const el=$(id);if(!el)return;el.textContent=message;el.classList.toggle("error",error);
}
function make(tag,parent,content,cls){
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(content!==undefined)el.textContent=String(content);
 parent.appendChild(el);
 return el;
}
async function api(url,options={}){
 const r=await fetch(url,{cache:"no-store",credentials:"same-origin",...options});
 let d={};try{d=await r.json()}catch{}
 if(r.status===401){location.replace("/admin/login/?next="+encodeURIComponent("/admin/#"+current));throw Error("Sua sessão expirou. Entre novamente.")}
 if(!r.ok)throw Error(d.error||"Não foi possível concluir a operação.");
 return d;
}
function showPane(view,updateHistory=true){
 if(!panes.has(view))view="inicio";
 current=view;
 for(const [key,el] of panes)el.hidden=key!==view;
 for(const a of links){
  const selected=a.dataset.view===view;
  a.classList.toggle("active",selected);
  if(selected)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");
 }
 $("current-view-label").textContent=titles[view]||"Painel de gestão";
 if(updateHistory&&location.hash!=="#"+view)history.replaceState(null,"","#"+view);
 main.scrollTop=0;
 const iframe=panes.get(view)?.querySelector("iframe[data-src]");
 if(iframe&&!iframe.src)iframe.src=iframe.dataset.src;
 if(view==="parceiros")loadPartners(true);
 if(view==="inicio")loadPartners();
 if(view==="socios")loadUsers();
}
links.forEach(a=>a.addEventListener("click",e=>{e.preventDefault();showPane(a.dataset.view)}));
function showPFSubtab(tab){$("pf-clients-content").hidden=tab!=="clientes";$("pf-referrals-content").hidden=tab!=="indicacoes";$("pf-tab-clients").className="btn "+(tab==="clientes"?"":"alt");$("pf-tab-referrals").className="btn "+(tab==="indicacoes"?"":"alt");if(tab==="indicacoes"){const frame=$("pf-referrals-content").querySelector("iframe[data-src]");if(frame&&!frame.src)frame.src=frame.dataset.src;}}
$("pf-tab-clients").addEventListener("click",()=>showPFSubtab("clientes"));
$("pf-tab-referrals").addEventListener("click",()=>showPFSubtab("indicacoes"));

window.addEventListener("popstate",()=>showPane(location.hash.slice(1),false));
document.querySelector("[data-action=open-simulator]")?.addEventListener("click",e=>{e.preventDefault();showPane("simulador")});
showPane(location.hash.slice(1)||"inicio",false);

/* CRM de clientes de grande porte e clubes. */
async function loadPartners(force=false){
 if(partnerLoaded&&!force)return;
 setMessage("partners-message","Carregando negociações...");
 try{
  const result=await api("/api/admin/partners");
  partners=result.partners||[];histories=result.history||[];partnerLoaded=true;
  $("partners-mode").textContent=result.testMode?"Homologação · registros de teste":"Operação comercial";
  await loadClubOptions();
  renderPartners();await renderAdditionalOverview();setMessage("partners-message",partners.length+" negociações carregadas.");
 }catch(e){setMessage("partners-message",e.message,true);
  const item=$("ov-partners-latest");if(item)item.textContent="Não foi possível consultar os parceiros agora.";}
}
async function loadClubOptions(){
 try{
  const cfg=await api("/api/config");
  const response=await api(cfg.testingEnabled?"/api/test/clubs":"/api/admin/clubs");
  clubs=response.clubs||[];
 }catch{clubs=[]}
 const select=$("p-club-id"),old=select.value;
 select.replaceChildren();
 select.add(new Option("Sem vínculo / cadastro estratégico independente",""));
 for(const c of clubs)select.add(new Option(c.name+(c.state?" ("+c.state+")":""),c.id));
 select.value=old;
}
function getFiltered(){
 const query=$("partners-search").value.toLocaleLowerCase("pt-BR").trim();
 const stage=$("partners-filter").value;
 return partners.filter(p=>(!stage||p.status===stage)&&(!query||p.name.toLocaleLowerCase("pt-BR").includes(query)||
 String(p.created_by||"").toLocaleLowerCase("pt-BR").includes(query)));
}
async function renderAdditionalOverview(){
 $("ov-clubs-count").textContent=numbers(clubs.length);
 const grouped=new Map();
 for(const p of partners){const name=p.author_name||p.created_by||"Cadastro anterior";const val=grouped.get(name)||{all:0,active:0};val.all++;if(["contato","negociacao"].includes(p.status))val.active++;grouped.set(name,val)}
 const target=$("ov-partners-by-owner");target.replaceChildren();
 if(!grouped.size)make("p",target,"Nenhum parceiro cadastrado.");
 for(const [name,v] of grouped){const line=make("div",target,undefined,"partner-overview-row");make("strong",line,name);make("span",line,v.all+" parceiros · "+v.active+" em negociação")}
 try{const d=await api("/api/admin/referrals");const arr=Array.isArray(d)?d:(d.referrals||d.items||d.rows||null);$("ov-referrals-count").textContent=arr?numbers(arr.length):"—"}
 catch{$("ov-referrals-count").textContent="Indisponível"}
}
function renderPartnerSummary(){
 const total=partners.length;
 $("ov-partners-total").textContent=numbers(total);
 $("ov-partners-pending").textContent=numbers(partners.filter(p=>p.status==="pendente").length);
 $("ov-partners-active").textContent=numbers(partners.filter(p=>["contato","negociacao"].includes(p.status)).length);
 $("ov-partners-closed").textContent=numbers(partners.filter(p=>["acordo","contrato"].includes(p.status)).length);
 $("overview-partners-tag").textContent=total+" parceiros";
 const dest=$("ov-partners-latest");dest.replaceChildren();
 if(!total){make("p",dest,"Nenhum parceiro estratégico cadastrado.");return}
 const ordered=[...partners].sort((a,b)=>String(b.updated_at||"").localeCompare(String(a.updated_at||"")));
 for(const partner of ordered.slice(0,3)){
  const row=make("div",dest,undefined,"partner-overview-row");
  make("strong",row,partner.name);
  make("span",row,labels[partner.status]||partner.status);
 }
}
function renderPartners(){
 renderPartnerSummary();
 $("partners-total").textContent=numbers(partners.length);
 $("partners-negotiating").textContent=numbers(partners.filter(p=>["contato","negociacao"].includes(p.status)).length);
 $("partners-won").textContent=numbers(partners.filter(p=>["acordo","contrato"].includes(p.status)).length);
 $("partners-fans").textContent=numbers(partners.reduce((a,p)=>a+Number(p.fan_count||0),0));
 const rows=$("partners-rows");rows.replaceChildren();
 const filtered=getFiltered();
 $("partners-count").textContent=filtered.length+" registro"+(filtered.length===1?"":"s");
 for(const p of filtered){
  const tr=make("tr",rows);
  const title=make("td",tr);
  make("b",title,p.name);make("span",title,(categories[p.category]||p.category)+(p.is_test?" · teste":""),"small-line");
  const status=make("td",tr);
  make("span",status,labels[p.status]||p.status,"status-pill "+(["acordo","contrato"].includes(p.status)?"won":["contato","negociacao"].includes(p.status)?"progress":""));
  make("td",tr,p.fan_count===null?"—":numbers(p.fan_count));
  make("td",tr,pct(p.club_discount_percent));
  make("td",tr,pct(p.energy_return_percent));
  make("td",tr,p.current_energy_supplier||"—");
  make("td",tr,p.current_contract_end_date?String(p.current_contract_end_date).split("-").reverse().join("/"):"—");
  make("td",tr,p.monthly_energy_consumption===null?"—":Number(p.monthly_energy_consumption).toLocaleString("pt-BR",{maximumFractionDigits:3})+" "+(p.monthly_energy_unit||"MWh"));
  make("td",tr,({varejista:"Varejista",atacadista:"Atacadista",cativo:"Mercado cativo"})[p.purchase_modality]||"—");
  make("td",tr,p.energy_provider||"Não informada");
  make("td",tr,p.author_name|| (p.created_by==="sistema"?"Cadastro anterior":p.created_by));
  make("td",tr,fmtDate(p.updated_at));
  const actions=make("td",tr);
  const button=make("button",actions,"Editar","btn alt");button.type="button";
  button.addEventListener("click",()=>editPartner(p));
 }
 if(!filtered.length){
  const tr=make("tr",rows),td=make("td",tr,partners.length?"Nenhum parceiro corresponde aos filtros.":"Nenhum parceiro cadastrado. Comece cadastrando um clube ou cliente estratégico.");
  td.colSpan=13;
 }
}
function getPayload(){
 const number=id=>$(id).value===""?null:Number($(id).value);
 return {
  name:$("p-name").value.trim(),category:$("p-category").value,status:$("p-status").value,
  club_id:$("p-club-id").value||null,fan_count:number("p-fans"),potential_accounts:number("p-potential"),
  club_discount_percent:number("p-discount"),energy_return_percent:number("p-return"),
  club_share_percent:number("p-club-share"),monthly_bill_estimate:number("p-bill"),
  contact_name:$("p-contact").value.trim(),contact_phone:$("p-phone").value.trim(),energy_provider:$("p-provider").value.trim(),
  current_energy_supplier:$("p-current-supplier").value.trim(),current_contract_end_date:$("p-contract-end").value,
  monthly_energy_consumption:number("p-consumption"),monthly_energy_unit:$("p-consumption-unit").value,
  purchase_modality:$("p-modality").value,notes:$("p-notes").value.trim()
 };
}
function fillForm(p){
 const put=(id,v)=>$(id).value=v===null||v===undefined?"":v;
 put("p-id",p?.id);put("p-name",p?.name);put("p-category",p?.category||"clube");put("p-status",p?.status||"pendente");
 put("p-club-id",p?.club_id);put("p-fans",p?.fan_count);put("p-potential",p?.potential_accounts);
 put("p-discount",p?.club_discount_percent);put("p-return",p?.energy_return_percent);
 put("p-club-share",p?.club_share_percent);put("p-bill",p?.monthly_bill_estimate);
 put("p-contact",p?.contact_name);put("p-phone",p?.contact_phone);put("p-provider",p?.energy_provider);
 put("p-current-supplier",p?.current_energy_supplier);put("p-contract-end",p?.current_contract_end_date);
 put("p-consumption",p?.monthly_energy_consumption);put("p-consumption-unit",p?.monthly_energy_unit||"MWh");
 put("p-modality",p?.purchase_modality);put("p-notes",p?.notes);
 $("partner-editor-title").textContent=p?"Editar negociação: "+p.name:"Cadastrar parceiro estratégico";
 $("partner-owner-note").textContent=p?"Cadastrado por: "+(p.author_name||(p.created_by==="sistema"?"Cadastro anterior (sem identificação)":p.created_by))+". O autor do cadastro é preservado.":"O responsável pelo novo cadastro será o sócio que está autenticado.";
 const history=$("partner-history");history.hidden=!p;
 const target=$("partner-history-items");target.replaceChildren();
 if(p){
  const logs=histories.filter(h=>h.partner_id===p.id);
  for(const event of logs){
   const item=make("div",target,undefined,"history-item");
   make("b",item,event.event==="criacao"?"Cadastro inicial":event.event==="criacao_clube"?"Clube cadastrado":"Alteração de negociação");
   let description="";
   try{
    const detail=JSON.parse(event.detail);
    if(event.event==="atualizacao")description="Campos atualizados: "+(detail.fields||[]).join(", ")+(detail.from!==detail.to?" · Situação: "+(labels[detail.from]||detail.from)+" → "+(labels[detail.to]||detail.to):"");
   }catch{description=event.detail}
   if(description)make("span",item," — "+description);
   make("small",item,(event.author_name||event.performed_by)+" · "+fmtDate(event.created_at));
  }
  if(!logs.length)make("p",target,"Sem alterações registradas após a importação do cadastro.");
 }
 $("partner-form-message").textContent="";
 $("partner-editor").hidden=false;
 const editor=$("partner-editor");
 main.scrollTop+=editor.getBoundingClientRect().top-main.getBoundingClientRect().top-18;
 $("p-name").focus({preventScroll:true});
}
function editPartner(p){fillForm(p)}
$("partners-new").addEventListener("click",()=>fillForm(null));
$("dashboard-go-partners")?.addEventListener("click",()=>showPane("parceiros"));
$("partner-cancel").addEventListener("click",()=>{$("partner-editor").hidden=true;$("partner-form").reset()});
$("partners-refresh").addEventListener("click",()=>loadPartners(true));
$("partners-search").addEventListener("input",renderPartners);
$("partners-filter").addEventListener("change",renderPartners);
$("p-category").addEventListener("change",()=>{if($("p-category").value!=="clube")$("p-club-id").value=""});
$("p-club-id").addEventListener("change",()=>{
 const existing=partners.find(x=>x.club_id&&x.club_id===$("p-club-id").value);
 if(existing&&!$("p-id").value){
  setMessage("partner-form-message","Este clube já possui acompanhamento. Abra o registro existente pela tabela para editar.",true);
 }
});
$("partner-form").addEventListener("submit",async e=>{
 e.preventDefault();
 if(!e.currentTarget.reportValidity())return;
 const payload=getPayload(),id=$("p-id").value;
 const duplicate=payload.club_id&&partners.find(x=>x.club_id===payload.club_id&&x.id!==id);
 if(duplicate){setMessage("partner-form-message","Esse clube já tem uma negociação. Edite o registro existente na tabela.",true);return}
 const save=$("partner-save");save.disabled=true;setMessage("partner-form-message","Salvando...");
 try{
  await api("/api/admin/partners",{method:id?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(id?{id,...payload}:payload)});
  partnerLoaded=false;await loadPartners(true);
  $("partner-editor").hidden=true;
  setMessage("partners-message","Negociação salva com sucesso e vinculada ao usuário autenticado.");
 }catch(error){setMessage("partner-form-message",error.message,true)}
 finally{save.disabled=false}
});
$("partners-export").addEventListener("click",()=>{
 const data=getFiltered();
 const fields=[["Organização","Tipo","Etapa","Torcedores","Potenciais unidades","Desconto clube (%)","Retorno Energy Business (%)","Participação clube (%)","Conta mensal estimada (R$)","Compra atual (fornecedor)","Fim contrato atual","Consumo mensal de energia","Unidade de consumo","Modalidade de compra","Fornecedora proposta","Responsável","Atualizado em"],
  ...data.map(p=>[p.name,categories[p.category]||p.category,labels[p.status]||p.status,p.fan_count,p.potential_accounts,p.club_discount_percent,p.energy_return_percent,p.club_share_percent,p.monthly_bill_estimate,p.current_energy_supplier||"",p.current_contract_end_date||"",p.monthly_energy_consumption??"",p.monthly_energy_unit||"",p.purchase_modality||"",p.energy_provider||"",p.author_name||p.created_by,p.updated_at])];
 const protect=v=>{const s=String(v??"");return /^[=+\-@]/.test(s)?"'"+s:s};
 const csv="\uFEFF"+fields.map(row=>row.map(x=>'"'+protect(x).replace(/"/g,'""')+'"').join(";")).join("\r\n");
 const u=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
 const a=document.createElement("a");a.href=u;a.download="energy-business-parceiros.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
});

/* Gestao individual dos tres socios. */
async function loadUsers(force=false){
 if(usersLoaded&&!force)return;
 try{
  const result=await api("/api/admin/users");
  currentUser=result.me;usersLoaded=true;
  $("users-count").textContent=result.users.length+" de "+result.limit;
  $("my-username").textContent="Usuário: "+currentUser.username+" · "+(currentUser.role==="administrador"?"Administrador":"Sócio");
  $("profile-name").value=currentUser.display_name||"";
  const list=$("users-list");list.replaceChildren();
  for(const u of result.users){
   const el=make("div",list,undefined,"user-row");
   make("b",el,(u.display_name||u.username)+(u.username===currentUser.username?" (você)":""));
   make("span",el,"@"+u.username+" · "+(u.role==="administrador"?"Administrador":"Sócio"));
  }
  $("users-create-panel").hidden=currentUser.role!=="administrador"||result.users.length>=3;
  setMessage("users-message",result.users.length>=3?"Os três acessos individuais estão cadastrados.":"");
 }catch(e){setMessage("profile-message",e.message,true)}
}
$("users-refresh").addEventListener("click",()=>loadUsers(true));
$("profile-form").addEventListener("submit",async e=>{
 e.preventDefault();try{
  await api("/api/admin/users",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({display_name:$("profile-name").value.trim()})});
  usersLoaded=false;await loadUsers(true);setMessage("profile-message","Seu nome foi atualizado. Novos registros usarão esse nome.");
 }catch(e){setMessage("profile-message",e.message,true)}
});
$("new-user-login").addEventListener("input",e=>{const input=e.target;const pos=input.selectionStart;input.value=input.value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g,"");try{input.setSelectionRange(pos,pos)}catch{}});
$("users-create-form").addEventListener("submit",async e=>{
 e.preventDefault();
 const form=e.currentTarget;
 const btn=form.querySelector("button");btn.disabled=true;
 try{
  const result=await api("/api/admin/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:$("new-user-login").value.trim().toLowerCase(),display_name:$("new-user-name").value.trim(),password:$("new-user-password").value||undefined})});
  const credential="Usuário: "+result.user.username+"\nSenha provisória: "+result.temporaryPassword;
  $("new-credential-content").replaceChildren();
  make("pre",$("new-credential-content"),credential);
  $("new-credential-card").hidden=false;
  $("new-credential-copy").onclick=async()=>{
   try{await navigator.clipboard.writeText(credential);setMessage("users-message","Credenciais copiadas. Envie apenas por canal privado.")}
   catch{setMessage("users-message","Copie as credenciais exibidas acima e compartilhe em canal privado.",true)}
  };
  form.reset();
  usersLoaded=false;await loadUsers(true);
  setMessage("users-message","Acesso criado. Copie a senha exibida e peça que o sócio a altere ao entrar.");
 }catch(error){setMessage("users-message",error.message,true)}
 finally{btn.disabled=false}
});
$("password-form").addEventListener("submit",async e=>{
 e.preventDefault();
 try{
  const result=await api("/api/auth/change-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({current_password:$("password-current").value,new_password:$("password-new").value})});
  $("password-current").value="";$("password-new").value="";
  setMessage("password-message",result.message||"Senha alterada com sucesso.");
 }catch(error){setMessage("password-message",error.message,true)}
});
})();
