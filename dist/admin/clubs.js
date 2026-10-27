/* Cadastro de clubes: listagem pública sem login;
   criação e alterações requerem ADMIN_TOKEN, mantido somente na memória da página. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const rows=$("club-rows"),form=$("club-new-form"),tokenField=$("club-token");
if(!rows||!form)return;
let token="",clubs=[],editable=false,busy=false;
const message=(text,error=false)=>{
 const el=$("club-message");el.textContent=text;el.classList.toggle("error",error);
};
function stateLabels(){
 $("club-lock").hidden=!editable;
 $("club-unlock").hidden=editable;
 tokenField.hidden=editable;
 form.hidden=!editable;
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
    if(!name.reportValidity()||!uf.reportValidity()||!share.reportValidity())return;
    save.disabled=true;
    try{
     await updateClub({id:club.id,name:name.value.trim(),state:uf.value.trim().toUpperCase(),is_active:checked.checked,club_share_percent:Number(share.value),support_message:support.value.trim(),partner_confirmed:partnerCheck.checked});
     message("Clube atualizado. A lista pública refletirá a alteração na próxima atualização.");
    }catch(err){message(err.message,true)}
    finally{save.disabled=false}
   };
   cell(tr,save);
  }
  rows.appendChild(tr);
 }
}
async function api(path,opts={}){
 const headers={...(token?{Authorization:"Bearer "+token}:{}),...(opts.body?{"Content-Type":"application/json"}:{})};
 const r=await fetch(path,{...opts,headers,cache:"no-store"});
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
async function updateClub(input){
 const d=await api("/api/admin/clubs",{method:"PATCH",body:JSON.stringify(input)});
 const i=clubs.findIndex(c=>c.id===input.id);
 if(i!==-1)clubs[i]=d.club;
 render();
}
$("club-unlock").addEventListener("click",async()=>{
 const typed=tokenField.value.trim();
 if(!typed){message("Informe a chave do gestor para liberar cadastro e edição.",true);tokenField.focus();return}
 token=typed;
 try{
  // A confirmação ocorre no servidor, nunca é feita comparando chaves no JavaScript.
  const data=await api("/api/admin/clubs");
  editable=true;clubs=data.clubs||[];
  tokenField.value="";
  stateLabels();render();
  message("Gestão de clubes liberada nesta sessão. Os novos clubes começam ocultos, a menos que você marque a opção de visibilidade.");
 }catch(err){
  editable=false;token="";message(err.message||"Acesso negado.",true);
 }
});
$("club-lock").addEventListener("click",async()=>{
 token="";editable=false;clubs=[];
 stateLabels();
 message("Edição bloqueada. A visualização do painel continua livre.");
 try{await getClubs()}catch{message("Não foi possível carregar os clubes publicados.",true)}
});
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
 try{
  const data=await api("/api/admin/clubs",{method:"POST",body:JSON.stringify(input)});
  clubs.push(data.club);
  clubs.sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
  form.reset();render();
  message("Clube cadastrado"+(data.club.is_active?" e publicado no site.":" como oculto. Ative-o quando quiser exibir aos clientes."));
 }catch(err){message(err.message,true)}
 finally{busy=false;submit.disabled=false}
});
$("refresh")?.addEventListener("click",async()=>{
 try{await getClubs()}catch(err){message(err.message,true)}
});
stateLabels();
getClubs().then(()=>{
 message(clubs.length
  ?"Clubes habilitados publicados no site. Para cadastrar ou editar, use a chave do gestor."
  :"Nenhum clube visível ainda. Cadastre no painel e habilite os que deseja exibir.");
}).catch(()=>message("Não foi possível carregar a lista. Confira sua conexão.",true));
})();