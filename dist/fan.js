/* Energy Business - preferência de clube e compartilhamento de convites.
   O convite é meramente informativo até a ativação do programa comercial.
   Nomes de clubes nesta lista NÃO significam convênios ou apoio oficial. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const main=$("entry-club"),secondary=$("fan-team-select");
if(!main||!secondary)return;
const teams=[
 "América-MG","Athletico-PR","Atlético-GO","Atlético-MG","Avaí","Bahia","Botafogo","Ceará","Chapecoense",
 "Corinthians","Coritiba","Cruzeiro","Cuiabá","Figueirense","Flamengo","Fluminense","Fortaleza","Goiás",
 "Grêmio","Internacional","Juventude","Náutico","Palmeiras","Paysandu","Ponte Preta","Red Bull Bragantino",
 "Remo","Santos","São Paulo","Sport","Vasco da Gama","Vitória"
];
const ordered=teams.sort((a,b)=>a.localeCompare(b,"pt-BR"));
for(const name of ordered){
 const option=document.createElement("option");option.value=name;option.textContent=name;
 main.insertBefore(option,main.querySelector('option[value="sem_clube"]'));
}
secondary.replaceChildren();
for(const option of main.options){secondary.add(option.cloneNode(true))}
const custom=$("entry-club-custom"),customOther=$("fan-team-other");
function otherVisibility(){
 const needs=main.value==="outro",secondaryNeeds=secondary.value==="outro";
 custom.hidden=!needs;custom.required=needs;
 customOther.hidden=!secondaryNeeds;
 customOther.required=false;
}
function syncFromMain(){
 secondary.value=main.value;
 if(main.value==="outro")customOther.value=custom.value;
 otherVisibility();
}
function syncFromFan(){
 main.value=secondary.value;
 if(secondary.value==="outro")custom.value=customOther.value;
 otherVisibility();
}
main.addEventListener("change",syncFromMain);
secondary.addEventListener("change",syncFromFan);
custom.addEventListener("input",()=>{if(main.value==="outro")customOther.value=custom.value});
customOther.addEventListener("input",()=>{if(secondary.value==="outro")custom.value=customOther.value});
const allowedRef=/^EB[A-F0-9]{16}$/;
const url=new URL(location.href);
const incomingRef=(url.searchParams.get("ref")||"").toUpperCase();
const referralCode=allowedRef.test(incomingRef)?incomingRef:"";
const arrival=$("referral-arrival");
if(referralCode&&arrival){
 arrival.hidden=false;
 arrival.textContent="Você acessou um convite da Energy Business. O programa de bonificações ainda depende de aprovação e regulamentação.";
}
let myReferralCode="";
try{
 const saved=sessionStorage.getItem("ebReferralCode")||"";
 if(allowedRef.test(saved))myReferralCode=saved;
}catch(e){}
const incomingTeam=(url.searchParams.get("time")||"").trim();
if(incomingTeam&&ordered.includes(incomingTeam)){
 main.value=incomingTeam;syncFromMain();
}
function selectedClub(){
 if(main.value==="outro")return custom.value.trim().replace(/\s+/g," ").slice(0,70);
 if(main.value==="sem_clube"||!main.value)return "";
 return main.value;
}
function setReferralCode(code){
 const upper=String(code||"").toUpperCase();
 if(!allowedRef.test(upper))return;
 myReferralCode=upper;
 try{sessionStorage.setItem("ebReferralCode",upper)}catch(e){}
 const status=$("fan-referral-status");
 if(status)status.textContent="Seu link individual está pronto. Indicações serão consideradas somente conforme os critérios comerciais e o regulamento quando o programa for ativado.";
}
window.EnergyFan={
 selectedClub,
 getRef:()=>referralCode,
 setReferralCode
};
$("fan-continue").addEventListener("click",()=>{
 if(!secondary.value){secondary.focus();const msg=$("fan-team-status");if(msg)msg.textContent="Escolha seu time para continuar.";return}
 if(secondary.value==="outro"&&!customOther.value.trim()){
  const msg=$("fan-team-status");if(msg)msg.textContent="Escreva o nome do seu clube.";
  customOther.focus();
  return;
 }
 const msg=$("fan-team-status");if(msg)msg.textContent="";
 syncFromFan();
 const flow=window.EnergyFlow;
 if(flow?.navigateToStage)flow.navigateToStage("cadastro");
 else $("cadastro").scrollIntoView({block:"start",behavior:"auto"});
 const input=$("entry-name");
 if(input)input.focus({preventScroll:true});
});
function inviteLink(){
 const link=new URL("/",location.origin);
 if(myReferralCode)link.searchParams.set("ref",myReferralCode);
 const club=selectedClub();
 if(club&&ordered.includes(club))link.searchParams.set("time",club);
 return link.href;
}
const referralStatus=$("fan-referral-status");
function feedback(text){if(referralStatus)referralStatus.textContent=text}
$("fan-whatsapp").addEventListener("click",()=>{
 const link=inviteLink();
 const club=selectedClub();
 const message="Conheça a proposta da Energy Business: veja como você pode economizar energia e demonstrar interesse em ajudar seu time"+(club?" ("+club+")":"")+". Campanhas, descontos e benefícios estão sujeitos a elegibilidade, convênios e regulamento. "+link;
 window.open("https://wa.me/?text="+encodeURIComponent(message),"_blank","noopener,noreferrer");
 feedback(myReferralCode
  ?"Convite com seu código preparado. O programa e eventuais bônus dependem das condições comerciais."
  :"Convite preparado. Ainda não há código individual de indicação nem contagem de bonificações nesta demonstração.");
});
$("fan-copy").addEventListener("click",async()=>{
 const link=inviteLink();
 try{
  if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(link);
  else{
   const temp=document.createElement("textarea");temp.value=link;document.body.appendChild(temp);temp.select();
   const ok=document.execCommand("copy");temp.remove();if(!ok)throw Error("Sem permissão");
  }
  feedback(myReferralCode
   ?"Seu link individual foi copiado. Os benefícios dependerão do regulamento."
   :"Link da apresentação copiado. Nenhuma indicação será contabilizada neste modo.");
 }catch{
  feedback("Não foi possível copiar automaticamente. Compartilhe o endereço do site: "+link);
 }
});
otherVisibility();
})();