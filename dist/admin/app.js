const $=id=>document.getElementById(id);
const statuses={novo:"Novo",em_analise:"Em análise",contatado:"Contatado",convertido:"Convertido",descartado:"Descartado"};
const sources={"clube-demo":"Energy Business","avai-demo":"Avaí (exemplo)","figueirense-demo":"Figueirense (exemplo)","outro-demo":"Outro (exemplo)"};
let token=sessionStorage.getItem("ebAdminToken")||"",page=1,items=[],total=0;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const show=(v,bad=false)=>{$("message").textContent=v;$("message").classList.toggle("error",bad)};
async function api(path,options={}){
  const r=await fetch(path,{...options,headers:{Authorization:"Bearer "+token,...(options.body?{"Content-Type":"application/json"}:{})},cache:"no-store"});
  const data=await r.json().catch(()=>({error:"Resposta inválida."}));
  if(!r.ok)throw new Error(data.error||"Falha ao consultar.");
  return data;
}
function logout() {token="";sessionStorage.removeItem("ebAdminToken");$("app").style.display="none";$("login").style.display="block";$("token").value="";}
function render(data){
  items=data.items||[];total=data.total||0;
  const counts=Object.fromEntries((data.stats||[]).map(v=>[v.status,v.total]));
  $("stats").innerHTML='<div class="stat"><strong>'+Object.values(counts).reduce((x,y)=>x+y,0)+'</strong><small>Total de solicitações</small></div>'+Object.entries(statuses).map(([s,label])=>'<div class="stat"><strong>'+(counts[s]||0)+'</strong><small>'+label+'</small></div>').join("");
  $("items").innerHTML=items.map(v=>'<tr data-id="'+esc(v.id)+'"><td>'+esc(v.created_at.replace(" "," · "))+'</td><td><strong>'+esc(v.name)+'</strong><small>'+esc(v.property_type)+'</small></td><td>'+esc(v.phone)+'<small>'+esc(v.email)+'</small></td><td>'+Number(v.bill_amount).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})+'<small>'+esc(v.discount_rate)+'% cenário</small></td><td>'+esc(sources[v.club_code]||v.club_code)+'</td><td><select class="lead-status" aria-label="Etapa de '+esc(v.name)+'">'+Object.entries(statuses).map(([k,label])=>'<option value="'+k+'"'+(k===v.status?" selected":"")+'>'+label+'</option>').join("")+'</select></td><td><textarea class="notes" aria-label="Anotações de '+esc(v.name)+'" maxlength="1200">'+esc(v.notes)+'</textarea><button class="save">Salvar alterações</button></td></tr>').join("");
  $("empty").style.display=items.length?"none":"block";
  $("pagination").textContent="Página "+page+" · "+total+" resultado(s)";
  $("prev").disabled=page<=1;$("next").disabled=page*50>=total;
  $("export").disabled=!items.length;
}
async function load(){
  show("Carregando...");
  try{const params=new URLSearchParams({page:String(page),limit:"50"});if($("status").value)params.set("status",$("status").value);if($("source").value)params.set("source",$("source").value);render(await api("/api/admin/leads?"+params));$("login").style.display="none";$("app").style.display="block";show("");}
  catch(err){if(/não autorizado/i.test(err.message))logout();$("login-message").textContent=err.message;show(err.message,true);}
}
$("login-form").addEventListener("submit",async e=>{e.preventDefault();token=$("token").value.trim();$("login-message").textContent="Validando acesso...";await load();if($("app").style.display==="block"){sessionStorage.setItem("ebAdminToken",token);$("token").value="";$("login-message").textContent=""}});
$("logout").onclick=logout;
$("refresh").onclick=load;
for(const id of ["status","source"])$(id).onchange=()=>{page=1;load()};
$("prev").onclick=()=>{if(page>1){page--;load()}};
$("next").onclick=()=>{if(page*50<total){page++;load()}};
$("items").addEventListener("click",async e=>{
  if(!e.target.classList.contains("save"))return;
  const row=e.target.closest("tr"),id=row.dataset.id,status=row.querySelector(".lead-status").value,notes=row.querySelector(".notes").value;
  e.target.disabled=true;
  try{await api("/api/admin/leads",{method:"PATCH",body:JSON.stringify({id,status,notes})});show("Alterações salvas.");await load()}
  catch(err){show(err.message,true)}
  finally{e.target.disabled=false}
});
const csv=v=>{let x=String(v??"");if(/^\s*[=+\-@]/.test(x))x="'"+x;return '"'+x.replace(/"/g,'""')+'"';};
$("export").onclick=()=>{
  const headers=["Data","Nome","E-mail","Telefone","Conta estimada","Cenário de desconto","Tipo","Origem","Status","Observações"];
  const rows=items.map(v=>[v.created_at,v.name,v.email,v.phone,v.bill_amount,v.discount_rate,v.property_type,sources[v.club_code]||v.club_code,statuses[v.status]||v.status,v.notes]);
  const str="\uFEFF"+[headers,...rows].map(r=>r.map(csv).join(";")).join("\r\n");
  const blob=new Blob([str],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="energy-business-solicitacoes.csv";a.click();URL.revokeObjectURL(url);
};
if(token)load();
