/* Indicações Energy Business: independentes de qualquer clube.
   O cadastro principal não escolhe clube; o novo visitante decide seu percurso. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const url=new URL(location.href);
const allowed=/^EB[A-F0-9]{16}$/;
const raw=(url.searchParams.get("ref")||"").toUpperCase();
const incomingRef=allowed.test(raw)?raw:"";
let myReferralCode="";
const notice=$("referral-arrival");
if(incomingRef&&notice){notice.hidden=false;notice.textContent="Você chegou por uma indicação Energy Business. O programa de benefícios ainda depende de validação e ativação."}
function setReferralCode(value){
 const code=String(value||"").toUpperCase();
 if(!allowed.test(code))return;
 myReferralCode=code;
 const status=$("fan-referral-status");
 if(status)status.textContent="Seu link pessoal está pronto para compartilhamento. A apuração de benefícios depende de regulamento e ativação.";
}
function link(){
 const u=new URL("/",location.origin);
 if(myReferralCode)u.searchParams.set("ref",myReferralCode);
 return u.href;
}
window.EnergyFan={
 selectedClub:()=>"",clubDetails:()=>null,getRef:()=>incomingRef,setReferralCode
};
const feedback=text=>{const n=$("fan-referral-status");if(n)n.textContent=text};
$("fan-whatsapp")?.addEventListener("click",()=>{
 const message="Conheça a Energy Business! Faça uma simulação de economia na conta de energia, sem vinculação com clubes. A análise e os benefícios dependem de regras e contratação. "+link();
 window.open("https://wa.me/?text="+encodeURIComponent(message),"_blank","noopener,noreferrer");
 feedback(myReferralCode?"Convite preparado para envio. Indicações ficam vinculadas ao seu código de cadastro.":"Link de divulgação preparado.");
});
$("fan-copy")?.addEventListener("click",async()=>{
 const u=link();
 try{await navigator.clipboard.writeText(u);feedback("Link copiado. A indicação identifica quem compartilhou, nunca um clube.")}
 catch{feedback("Copie este endereço para compartilhar: "+u)}
});
})();