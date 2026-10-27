/* Clubes exibidos exclusivamente pelo cadastro do painel Energy Business.
   Ser selecionável não significa ser parceiro, patrocinado ou conveniado.
   Convites ainda são demonstrativos; nenhuma bonificação é concedida. */
(function(){
"use strict";
const $=id=>document.getElementById(id), main=$("entry-club"), secondary=$("fan-team-select");
if(!main||!secondary)return;
const clubWrap=$("club-select-wrap");
const teamRadios=[...document.querySelectorAll('input[name="help_club"]')];


const hint=$("club-helper"),status=$("fan-team-status");
let activeTeams=new Map(),fetchFailed=false;
const locationURL=new URL(location.href),incomingTeam=(locationURL.searchParams.get("time")||"").trim();
const allowedRef=/^EB[A-F0-9]{16}$/;
const incomingRef=(locationURL.searchParams.get("ref")||"").toUpperCase();
const referredByCode=allowedRef.test(incomingRef)?incomingRef:"";
let myReferralCode="";
try{const saved=sessionStorage.getItem("ebReferralCode")||"";if(allowedRef.test(saved))myReferralCode=saved}catch(e){}
const notice=$("referral-arrival");
if(referredByCode&&notice){
 notice.hidden=false;
 notice.textContent="Você acessou um convite Energy Business. O programa de bonificações ainda não está ativo.";
}
function safeSelection(value){return activeTeams.has(value)?value:""}
function fillSelect(el,selected){
 el.replaceChildren();
 const placeholder=new Option("Escolha seu time",""),none=new Option("Prefiro não escolher um time","sem_clube");
 el.add(placeholder);
 for(const [name,details] of activeTeams){
  el.add(new Option(name+(details.state?" ("+details.state+")":""),name));
 }
 if(el===secondary)el.add(none);
 el.value=safeSelection(selected);
}
function helpChoice(){return teamRadios.find(r=>r.checked)?.value||""}
function setHelpChoice(choice){
 const option=teamRadios.find(r=>r.value===choice);
 if(option)option.checked=true;
 toggleClubInput();
}
function toggleClubInput(){
 const yes=helpChoice()==="sim";
 if(clubWrap)clubWrap.hidden=!yes;
 main.disabled=!yes;main.required=yes;
 if(!yes){main.value="";secondary.value=""}
}
teamRadios.forEach(r=>r.addEventListener("change",toggleClubInput));
main.addEventListener("change",()=>{secondary.value=safeSelection(main.value)});
secondary.addEventListener("change",()=>{
 if(secondary.value==="sem_clube"){setHelpChoice("nao");return}
 if(activeTeams.has(secondary.value)){setHelpChoice("sim");main.value=secondary.value}
});
async function loadClubs(){
 const old=main.value,oldSecondary=secondary.value;
 try{
  const response=await fetch("/api/clubs",{cache:"no-store"});
  if(!response.ok)throw Error("Não foi possível consultar a lista");
  const data=await response.json();
  if(!Array.isArray(data.clubs))throw Error("Lista indisponível");
  const entries=data.clubs.filter(c=>c&&typeof c.name==="string"&&c.name.length<=80&&
    typeof c.id==="string").map(c=>[c.name,{
      state:c.state||"",
      partner_confirmed:c.partner_confirmed===1,
      club_share_percent:c.club_share_percent,
      support_message:c.support_message||""
    }]);
  activeTeams=new Map(entries);
  fetchFailed=false;
  const prefer=activeTeams.has(incomingTeam)?incomingTeam:old;
  fillSelect(main,prefer);
  fillSelect(secondary,oldSecondary||prefer);
  if(activeTeams.has(incomingTeam)&&!old&&(!oldSecondary||oldSecondary==="")){
    secondary.value=incomingTeam;main.value=incomingTeam;setHelpChoice("sim");
  }
  toggleClubInput();
  if(hint)hint.textContent=activeTeams.size
   ?"Times disponibilizados pelo painel Energy Business. A seleção não comprova parceria oficial."
   :"Nenhum clube habilitado no painel ainda. Você pode continuar sem escolher um time.";
  if(status)status.textContent=activeTeams.size?"":"A lista de clubes será preenchida pelo painel de gestão.";
 }catch(e){
  activeTeams.clear();fetchFailed=true;
  fillSelect(main,"");fillSelect(secondary,"");
  if(hint)hint.textContent="Não foi possível carregar os clubes. Você pode continuar sem escolher um time.";
  if(status)status.textContent="A lista está temporariamente indisponível.";
 }
}
function selectedClub(){
 const club=main.value;
 return helpChoice()==="sim"&&activeTeams.has(club)?club:"";
}
function clubDetails(name){return activeTeams.get(name)||null}
function referralLink(){
 const link=new URL("/",location.origin);
 if(myReferralCode)link.searchParams.set("ref",myReferralCode);
 const name=selectedClub();
 if(name)link.searchParams.set("time",name);
 return link.href;
}
function setReferralCode(code){
 const normalized=String(code||"").toUpperCase();
 if(!allowedRef.test(normalized))return;
 myReferralCode=normalized;
 try{sessionStorage.setItem("ebReferralCode",normalized)}catch(e){}
 const s=$("fan-referral-status");
 if(s)s.textContent="O código de convite está pronto. O programa de descontos por indicação ainda não foi ativado.";
}
window.EnergyFan={selectedClub,clubDetails,getRef:()=>referredByCode,setReferralCode,reloadClubs:loadClubs};
const learn=$("fan-hero-link");
if(learn)learn.addEventListener("click",e=>{
 if(!window.EnergyFlow?.alignToElement)return;
 e.preventDefault();window.EnergyFlow.alignToElement(document.querySelector("#torcida .fan-heading"),"torcida");
});
$("fan-continue").addEventListener("click",()=>{
 if(!secondary.value){
  if(status)status.textContent="Escolha um time cadastrado ou a opção de continuar sem time.";
  secondary.focus();return;
 }
 if(status)status.textContent="";
 if(secondary.value==="sem_clube")setHelpChoice("nao");
 else {setHelpChoice("sim");main.value=secondary.value}
 if(window.EnergyFlow?.navigateToStage)window.EnergyFlow.navigateToStage("cadastro");
 else $("cadastro").scrollIntoView({block:"start",behavior:"auto"});
 $("entry-name")?.focus({preventScroll:true});
});
const feedback=s=>{const el=$("fan-referral-status");if(el)el.textContent=s};
$("fan-whatsapp").addEventListener("click",()=>{
 const club=selectedClub();
 const link=referralLink();
 const message="Conheça a proposta da Energy Business: descubra a possibilidade de economizar na conta de energia e apoiar o futebol"+(club?" ("+club+")":"")+". Condições sujeitas a parcerias, elegibilidade e regulamento. "+link;
 window.open("https://wa.me/?text="+encodeURIComponent(message),"_blank","noopener,noreferrer");
 feedback(myReferralCode
  ?"Seu convite foi preparado. Benefícios dependem das regras comerciais, ainda não ativadas."
  :"Convite preparado. Ainda não há contabilização de indicações ou benefícios nesta demonstração.");
});
$("fan-copy").addEventListener("click",async()=>{
 const link=referralLink();
 try{
  if(!navigator.clipboard?.writeText)throw Error("Permissão indisponível");
  await navigator.clipboard.writeText(link);
  feedback(myReferralCode
   ?"Link individual copiado. Eventuais benefícios dependem de regulamento."
   :"Link copiado. Indicações ainda não são contabilizadas.");
 }catch{feedback("Não foi possível copiar automaticamente. Compartilhe este link: "+link)}
});
toggleClubInput();
loadClubs();
})();