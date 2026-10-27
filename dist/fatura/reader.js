/* Energy Business — leitor local de faturas; nenhum arquivo é enviado ao servidor. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const form=$("bill-review"),fileInput=$("bill-file");
if(!form||!fileInput||!window.EnergyBillParser)return;
const reader=window.EnergyBillParser;
let file=null,previewURL=null,rotation=0,running=false,rawText="",ocrWorker=null;
let finalized=false;
const fmtAmount=n=>Number(n).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const notify=(message,type="")=>{
 const area=$("bill-status");area.textContent=message;area.dataset.kind=type;
};
const stages={loading:"Carregando a ferramenta de leitura…",initializing:"Preparando o reconhecimento…",recognizing:"Identificando os textos da fatura…"};
function updateButtons(){
 $("bill-read").disabled=running||!file;
 $("bill-rotate").disabled=running||!file||file.type==="application/pdf"||/\.pdf$/i.test(file.name);
 $("bill-clear").disabled=running||(!file&&!rawText);
}
function clearObject(){
 if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null}
 $("bill-preview-image").removeAttribute("src");
 $("bill-preview-image").style.transform="";
 $("bill-preview-image").hidden=true;
 $("bill-pdf-label").hidden=true;
}
function resetResults(){
 form.reset();form.hidden=true;rawText="";finalized=false;
 $("bill-copy").disabled=true;$("bill-apply").disabled=true;
 $("bill-ocr-text").textContent="";$("bill-evidence").textContent="";
 $("bill-confidence").textContent="";
 $("bill-raw").open=false;
}
function clear(){
 if(running)return;
 file=null;rotation=0;fileInput.value="";
 clearObject();resetResults();updateButtons();
 $("bill-placeholder").hidden=false;
 $("bill-file-name").textContent="";
 notify("Aguardando uma imagem de conta de energia. Nenhum arquivo é enviado ao servidor.");
}
$("bill-clear").onclick=clear;
function showSelected(selected){
 if(running)return;
 resetResults();clearObject();rotation=0;file=null;
 if(!selected){updateButtons();return}
 if(selected.size>15*1024*1024){notify("O arquivo excede o limite de 15 MB. Envie uma versão menor.","error");updateButtons();return}
 const isPDF=selected.type==="application/pdf"||/\.pdf$/i.test(selected.name);
 const image=/^image\/(jpeg|png|webp|bmp|heic|heif)$/.test(selected.type)||/\.(jpe?g|png|webp|bmp|heic|heif)$/i.test(selected.name);
 if(!isPDF&&!image){notify("Formato não suportado. Selecione JPG, PNG, WebP ou PDF.","error");updateButtons();return}
 file=selected;
 $("bill-file-name").textContent=selected.name;
 $("bill-placeholder").hidden=true;
 if(isPDF){$("bill-pdf-label").hidden=false}
 else {
  previewURL=URL.createObjectURL(selected);
  $("bill-preview-image").src=previewURL;
  $("bill-preview-image").hidden=false;
 }
 notify("Arquivo selecionado. Clique em “Ler dados da fatura” para iniciar.");
 updateButtons();
}
fileInput.addEventListener("change",()=>showSelected(fileInput.files&&fileInput.files[0]));
$("bill-drop").addEventListener("dragover",e=>{e.preventDefault();$("bill-drop").classList.add("drag")});
$("bill-drop").addEventListener("dragleave",()=>{$("bill-drop").classList.remove("drag")});
$("bill-drop").addEventListener("drop",e=>{
 e.preventDefault();$("bill-drop").classList.remove("drag");
 if(e.dataTransfer&&e.dataTransfer.files.length)showSelected(e.dataTransfer.files[0]);
});
$("bill-rotate").onclick=()=>{
 if(!file)return;
 rotation=(rotation+90)%360;
 $("bill-preview-image").style.transform="rotate("+rotation+"deg)";
 notify("Imagem girada "+rotation+"°. Inicie a leitura para aplicar a nova orientação.");
};
function renderResult(text,filename="",confidence=0){
 rawText=String(text||"");
 const result=reader.extract(rawText);
 form.hidden=false;
 $("bill-distributor").textContent=result.distributor;
 $("bill-name").value=result.name.value||"";
 $("bill-address").value=result.address.value||"";
 $("bill-amount").value=result.amount.value!==null?fmtAmount(result.amount.value):"";
 $("bill-kwh").value=result.kwh.value!==null?String(result.kwh.value):"";
 $("bill-confidence").textContent=result.needsReview?"Leitura parcial — revise os campos":"Campos encontrados — confirme os valores";
 const evidence=[["Titular",result.name],["Endereço",result.address],["Valor da fatura",result.amount],["Consumo",result.kwh]].map(([label,x])=>
  label+": "+(x.value===null?"não identificado":"localizado ("+x.confidence+")")+
  (x.evidence?" — trecho: "+x.evidence:"")
 ).join("\n");
 $("bill-evidence").textContent=evidence;
 $("bill-ocr-text").textContent=rawText.slice(0,16000);
 $("bill-copy").disabled=false;
 $("bill-apply").disabled=false;
 finalized=true;
 const found=[result.name,result.address,result.amount,result.kwh].filter(x=>x.value!==null).length;
 notify("Leitura concluída: "+found+" de 4 campos identificados. Confira os valores diretamente na imagem; o reconhecimento não confirma pagamento nem titularidade.",
 found===4?"ok":"warn");
 $("bill-results").scrollIntoView({behavior:"smooth",block:"nearest"});
}
function loadOCR(){
 return new Promise((resolve,reject)=>{
  if(window.Tesseract&&window.Tesseract.createWorker){resolve(window.Tesseract);return}
  const existing=document.querySelector('script[data-bill-ocr="1"]');
  if(existing){existing.addEventListener("load",()=>resolve(window.Tesseract),{once:true});existing.addEventListener("error",()=>reject(new Error("Biblioteca OCR indisponível.")),{once:true});return}
  const script=document.createElement("script");
  script.dataset.billOcr="1";
  script.src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
  script.async=true;script.crossOrigin="anonymous";
  script.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(new Error("Falha ao carregar o OCR."));
  script.onerror=()=>reject(new Error("Falha ao carregar a biblioteca de leitura. Verifique a conexão à internet."));
  document.head.appendChild(script);
 });
}
async function imageCanvas(selected){
 let image=null;
 let dispose=()=>{};
 if(typeof createImageBitmap==="function"){
  try{image=await createImageBitmap(selected);dispose=()=>image.close()}catch{}
 }
 if(!image){
  const localURL=URL.createObjectURL(selected);
  try{
   image=await new Promise((resolve,reject)=>{
    const el=new Image();el.onload=()=>resolve(el);el.onerror=()=>reject(new Error("Não foi possível abrir a imagem. Tente JPG ou PNG."));el.src=localURL;
   });
  }finally{URL.revokeObjectURL(localURL)}
 }
 const naturalW=image.width,naturalH=image.height;
 if(!naturalW||!naturalH)throw Error("Imagem sem dimensões válidas.");
 const scale=Math.min(1,2500/Math.max(naturalW,naturalH));
 const w=Math.max(1,Math.round(naturalW*scale)),h=Math.max(1,Math.round(naturalH*scale));
 const portraitSide=rotation%180===0;
 const canvas=document.createElement("canvas");
 canvas.width=portraitSide?w:h;canvas.height=portraitSide?h:w;
 const ctx=canvas.getContext("2d",{willReadFrequently:true});
 if(!ctx)throw Error("Não foi possível criar o leitor de imagens.");
 ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(rotation*Math.PI/180);
 ctx.drawImage(image,-w/2,-h/2,w,h);
 dispose();
 return canvas;
}
async function pdfCanvases(selected){
 notify("Abrindo o PDF localmente. Será analisada apenas a primeira página e, se necessário, a segunda.");
 const pdfjs=await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs");
 pdfjs.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
 const task=pdfjs.getDocument({data:new Uint8Array(await selected.arrayBuffer()),isEvalSupported:false});
 const doc=await task.promise;
 const arr=[];
 try{
  const count=Math.min(doc.numPages,2);
  for(let n=1;n<=count;n++){
   const page=await doc.getPage(n);
   const initial=page.getViewport({scale:1});
   const viewport=page.getViewport({scale:Math.min(2.5,2400/Math.max(initial.width,initial.height))});
   const canvas=document.createElement("canvas");
   canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   const ctx=canvas.getContext("2d");
   await page.render({canvasContext:ctx,viewport,background:"white"}).promise;
   arr.push(canvas);
  }
 }finally{await doc.destroy()}
 return arr;
}
async function run(){
 if(running||!file)return;
 running=true;resetResults();updateButtons();
 const previous=$("bill-read").textContent;$("bill-read").textContent="Lendo…";
 try{
  notify("Preparando a fatura para leitura...");
  // Navegador faz OCR; arquivo não atravessa nossa API, somente bibliotecas são baixadas.
  const T=await loadOCR();
  const targets=(file.type==="application/pdf"||/\.pdf$/i.test(file.name))?await pdfCanvases(file):[await imageCanvas(file)];
  notify("Iniciando o reconhecimento de texto em português...");
  ocrWorker=await T.createWorker("por+eng",1,{logger:e=>{
   if(e&&e.status){
    const pct=typeof e.progress==="number"?" "+Math.round(e.progress*100)+"%":"";
    notify((stages[e.status]||"Reconhecendo a fatura…")+pct);
   }
  }});
  const pieces=[];
  for(let i=0;i<targets.length;i++){
   notify("Lendo "+(i+1)+" de "+targets.length+" página(s) localmente...");
   const data=await ocrWorker.recognize(targets[i]);
   if(data&&data.data&&data.data.text)pieces.push(data.data.text);
   targets[i].width=targets[i].height=1;
  }
  if(!pieces.length||pieces.join("").trim().length<15)throw Error("Não encontrei texto legível. Tente uma foto sem reflexo, com a conta inteira visível.");
  renderResult(pieces.join("\n"),file.name);
 }catch(err){
  notify((err&&err.message)||"Falha durante a leitura. Tente outra imagem.", "error");
 }finally{
  if(ocrWorker){try{await ocrWorker.terminate()}catch{}ocrWorker=null}
  running=false;updateButtons();$("bill-read").textContent=previous;
 }
}
$("bill-read").onclick=run;
function normalizedMoney(input){
 const value=String(input||"").trim();
 if(!value)return null;
 const cleaned=value.replace(/[R$\s]/gi,"").replace(/\.(?=\d{3}(?:\D|$))/g,"").replace(",",".");
 const n=Number(cleaned);
 return Number.isFinite(n)&&n>0&&n<=1000000?n:null;
}
function reviewValues(){
 const name=$("bill-name").value.trim(),address=$("bill-address").value.trim();
 const amount=normalizedMoney($("bill-amount").value),kwh=Number(String($("bill-kwh").value).replace(",","."));
 if(!name||!address||amount===null||!Number.isFinite(kwh)||kwh<=0||kwh>10000000){
  notify("Revise e preencha os quatro campos antes de confirmar ou copiar.","warn");return null;
 }
 if(!$("bill-confirm").checked){
  notify("Marque a confirmação de que conferiu os quatro dados na fatura.","warn");return null;
 }
 return {name,address,amount,kwh,distributor:$("bill-distributor").textContent};
}
$("bill-copy").onclick=async()=>{
 const values=reviewValues();if(!values)return;
 const text=["Distribuidora: "+values.distributor,"Titular: "+values.name,"Endereço da unidade: "+values.address,"Total da fatura: "+fmtAmount(values.amount)+" R$","Consumo mensal: "+values.kwh+" kWh","Origem: Energy Business","Informações conferidas manualmente; valor faturado não confirma quitação."].join("\n");
 try{await navigator.clipboard.writeText(text);notify("Dados conferidos copiados. O documento não foi enviado ao servidor.","ok")}
 catch{notify("Não foi possível copiar. Selecione os campos manualmente.","warn")}
};
$("bill-apply").onclick=()=>{
 const values=reviewValues();if(!values)return;
 const bill=$("bill"),range=$("range");
 if(bill){
  bill.value=String(values.amount);
  if(range&&values.amount>=Number(range.min)&&values.amount<=Number(range.max))range.value=String(values.amount);
  bill.dispatchEvent(new Event("input",{bubbles:true}));
  notify("Valor da fatura aplicado ao simulador. O consumo em kWh foi preservado na conferência; desconto segue ilustrativo.","ok");
  $("simular").scrollIntoView({behavior:"smooth"});
 }
};
$("bill-example").onclick=()=>{
 if(running)return;
 clear();
 const sampleText=["CELESC DISTRIBUICAO S.A.","TITULAR: MARIA SILVA DE OLIVEIRA","ENDERECO DE CONSUMO","RUA DOS IPES 250, CENTRO","FLORIANOPOLIS - SC CEP 88000-000","CONSUMO TOTAL FATURADO 275 kWh","VALOR ATE O VENCIMENTO R$ 246,80","VENCIMENTO 10/10/2026"].join("\n");
 renderResult(sampleText,"fatura-ficticia");
 notify("Exemplo fictício carregado. Revise os quatro campos e teste o fluxo sem dados reais.","ok");
};
$("bill-raw").addEventListener("toggle",()=>{
 if($("bill-raw").open&&!rawText)$("bill-ocr-text").textContent="Nenhum texto lido.";
});
clear();
})();