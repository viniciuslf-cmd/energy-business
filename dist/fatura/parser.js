/* Energy Business - extração heurística de faturas brasileiras.
 * Execução local no navegador: sem upload, retenção ou envio do conteúdo.
 * O resultado é sugestão para revisão humana, nunca dado homologado.
 */
(function(root){
"use strict";
const clean=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[|]/g," ").replace(/\s+/g," ").trim();
const matchDistributor=[
 ["CELESC",/\bCELESC\b/],["COPEL",/\bCOPEL\b/],["CEMIG",/\bCEMIG\b/],
 ["CPFL / RGE",/\bCPFL\b|\bRGE\b|COMPANHIA PAULISTA DE FORCA E LUZ/],
 ["ENEL",/\bENEL\b|\bELETROPAULO\b|\bAMPLA ENERGIA\b/],
 ["NEOENERGIA",/\bNEOENERGIA\b|\bCOELBA\b|\bCELPE\b|\bCOSERN\b|\bELEKTRO\b/],
 ["EQUATORIAL",/\bEQUATORIAL\b|\bCEEE\b/],
 ["ENERGISA",/\bENERGISA\b/],
 ["EDP",/\bEDP\b|ESCELSA/],["LIGHT",/\bLIGHT\b/],
 ["AMAZONAS ENERGIA",/AMAZONAS ENERGIA|\bAMBAR ENERGIA\b/],
 ["RORAIMA ENERGIA",/RORAIMA ENERGIA/],
 ["SULGIPE",/\bSULGIPE\b/],["CEB / BRASÍLIA",/\bCEB\b|\bBRASILIA\b.*\bENERGIA\b/]
];
function detectDistributor(text){
 const normalized=clean(text);
 const leading=normalized.slice(0,1800);
 for(const [label,rx] of matchDistributor)if(rx.test(leading))return label;
 for(const [label,rx] of matchDistributor)if(rx.test(normalized))return label;
 return "Não identificada";
}
function moneyNumber(s){
 let v=String(s||"").trim().replace(/[R$\s]/gi,"");
 if(!v)return null;
 if(/,\d{2}$/.test(v))v=v.replace(/\./g,"").replace(",",".");
 else if(/\.\d{2}$/.test(v))v=v.replace(/,/g,"");
 else return null;
 const n=Number(v);
 return Number.isFinite(n)&&n>0&&n<=1000000?Math.round(n*100)/100:null;
}
function findMoney(s){
 const matches=[...String(s||"").matchAll(/(?:R\$\s*)?((?:\d{1,3}(?:\.\d{3})+|\d{1,7})[,.]\d{2})\b/g)];
 return matches.map(m=>({value:moneyNumber(m[1]),raw:m[0],offset:m.index})).filter(x=>x.value!==null);
}
const forbiddenName=/\b(NOME DO CLIENTE|NOME COMPLETO DO CLIENTE|CONSUMIDOR|UNIDADE CONSUMIDORA|CODIGO|CONTRATO|MEDICAO|CONTATO|ENDERECO|VENCIMENTO|DISTRIBUIDORA|INSTALACAO|CPF|CNPJ|ENERGIA|EQUATORIAL|NEOENERGIA|CONTA DE LUZ|NOTA FISCAL|TELEFONE|ATENDIMENTO|SUBTOTAL|CLASSIFICACAO|PAGADOR|PESSOA FISICA|DADOS DA UNIDADE|TITULAR DA CONTA)\b/;
function personValid(s){
 const t=clean(s).replace(/^(SR\.?|SRA\.?)\s+/,"");
 if(!t||t.length<6||t.length>85||/\d/.test(t)||forbiddenName.test(t))return false;
 const words=t.split(" ");
 return words.length>=2&&words.length<=9&&words.every(w=>w.length>1);
}
function streetStart(s){return /^(?:RUA|R\.|AV(?:ENIDA)?\.?|ROD(?:OVIA)?\.?|ESTRADA|TRAVESSA|TV\.?|ALAMEDA|AL\.?|PRACA|PCA\.?|LOTEAMENTO|QUADRA|Q(?:D|S|N|I|E)\.|SITIO|FAZENDA|ACESSO|SERVIDAO|BECO)\b/i.test(clean(s))}
function reasonableAddr(s){
 const t=clean(s);
 return t.length>=9&&t.length<=170&&streetStart(t)&&!/(?:AVISO|OBSERVAC|INSTALACAO N|CONSUMO DE|CLIENTE N)/.test(t);
}
function normalizeLines(raw){
 return String(raw||"").split(/\r?\n/g).map(x=>x.replace(/[\t]+/g," ").replace(/\s{2,}/g," ").trim()).filter(Boolean).slice(0,600);
}
function scorePick(candidates){
 const unique=new Map();
 for(const c of candidates){
  if(!c||!c.value)continue;
  const key=clean(String(c.value));
  if(!unique.has(key)||unique.get(key).score<c.score)unique.set(key,c);
 }
 return [...unique.values()].sort((a,b)=>b.score-a.score||a.line-b.line)[0]||null;
}
function extractName(lines){
 const c=[];
 const labeled=/^(?:NOME(?: COMPLETO)?(?: DO| DA)? (?:CLIENTE|TITULAR|CONSUMIDOR)|TITULAR(?: DA CONTA)?|NOME(?: DO)? PAGADOR|PAGADOR|DESTINATARIO|RESPONSAVEL(?: PELA UNIDADE)?|CLIENTE)\s*[:\-]?\s*/;
 for(let i=0;i<lines.length;i++){
  const n=clean(lines[i]);
  if(/\b(N[Oº°.]|NUMERO|CODIGO|CONTA|REFERENCIA)\s+(?:DO\s+)?CLIENTE\b/.test(n))continue;
  const m=n.match(labeled);
  if(m){
   const tail=lines[i].slice(lines[i].length-(n.length-m[0].length)).trim().replace(/^[:;\- ]+/,"");
   if(personValid(tail))c.push({value:tail,score:95,line:i,evidence:lines[i]});
   for(let d=1;d<=2;d++)if(lines[i+d]&&personValid(lines[i+d]))c.push({value:lines[i+d],score:90-d*7,line:i+d,evidence:lines[i+d]});
  }
  if(i<23&&personValid(lines[i])&&lines[i+1]&&reasonableAddr(lines[i+1]))
   c.push({value:lines[i],score:76,line:i,evidence:lines[i]});
 }
 return scorePick(c);
}
function extractAddress(lines){
 const candidates=[];
 const addrMarker=/(?:ENDERECO (?:DE FORNECIMENTO|DA UNIDADE CONSUMIDORA|DE CONSUMO|DA INSTALACAO|DO LOCAL|DE ENTREGA)|LOCAL DE CONSUMO|END\.? CONSUMO|END\.? FORNECIMENTO|ENDERECO)/;
 for(let i=0;i<lines.length;i++){
  const n=clean(lines[i]);
  const isMarker=addrMarker.test(n)&&n.length<135;
  if(isMarker){
   const tail=lines[i].replace(/^.*?(?:ENDERE[CÇ]O(?: DE CONSUMO| DE FORNECIMENTO| DA UNIDADE CONSUMIDORA| DA INSTALA[CÇ][AÃ]O| DE ENTREGA)?|LOCAL DE CONSUMO)\s*[:\-]?\s*/i,"").trim();
   if(reasonableAddr(tail))candidates.push({value:tail,score:/CONSUMO|FORNECIMENTO|INSTALACAO/.test(n)?98:84,line:i,evidence:lines[i]});
   for(let d=1;d<=3;d++){
    const row=lines[i+d];if(!row)break;
    if(reasonableAddr(row))candidates.push({value:row,score:(/CONSUMO|FORNECIMENTO|INSTALACAO/.test(n)?94:80)-d*4,line:i+d,evidence:row});
   }
  }
  if(reasonableAddr(lines[i])){
   const upper=clean(lines.slice(Math.max(0,i-5),i).join(" "));
   const beforeTax=/\b(DADOS DE MEDICAO|DISCRIMINACAO|TRIBUTOS|PIS COFINS)\b/.test(upper);
   const score=(i<26?76:56)+(beforeTax?-15:0);
   let value=lines[i].trim();
   const next=lines[i+1]||"";
   if(next&&(/(?:\b\d{5}-?\d{3}\b)|(?:\b[A-ZÀ-Ú][A-ZÀ-Ú ]+\s*-\s*[A-Z]{2}\b)/i.test(next))&&next.length<85)value+=" · "+next.trim();
   candidates.push({value,score,line:i,evidence:lines[i]});
  }
 }
 return scorePick(candidates);
}
function extractAmount(lines){
 const candidates=[],labels=[
  [/VALOR (?:TOTAL )?(?:A |DA )?PAGAR|TOTAL A PAGAR|VALOR ATE O VENCIMENTO|VALOR DA CONTA|VALOR DA FATURA|TOTAL DA FATURA|VALOR DO DOCUMENTO/,100],
  [/VALOR TOTAL|TOTAL GERAL|TOTAL FATURA|VALOR COBRADO|VALOR R\$/,84],
  [/TOTAL\s*:?$/,58]
 ];
 for(let i=0;i<lines.length;i++){
  const t=clean(lines[i]);
  if(/(?:VALOR PAGO|COMPROVANTE DE PAGAMENTO|TOTAL DE TRIBUTOS|TOTAL IMPOSTOS|BASE DE CALCULO)/.test(t))continue;
  for(const [rx,weight] of labels)if(rx.test(t)){
   let vals=findMoney(lines[i]);
   if(vals.length){
    // A linha pode conter vencimento e valor; valores com R$ ganham preferência.
    for(const v of vals)candidates.push({value:v.value,score:weight+(v.raw.includes("R$")?5:0),line:i,evidence:lines[i]});
   }else{
    for(let d=1;d<=2;d++){
     const next=lines[i+d];if(!next)break;
     const v=findMoney(next);
     for(const item of v)candidates.push({value:item.value,score:weight-12*d+(item.raw.includes("R$")?4:0),line:i+d,evidence:next});
    }
   }
  }
  if(i<80&&/(?:VENCIMENTO|REFERENCIA|MES\/ANO)\s+TOTAL A PAGAR/.test(t)){
    const next=lines[i+1]||"";
    for(const v of findMoney(next))candidates.push({value:v.value,score:90,line:i+1,evidence:next});
  }
 }
 return scorePick(candidates);
}
function kwhCandidates(s){
 const values=[];
 const t=clean(s);
 for(const m of t.matchAll(/(?:^|[^\d])(\d{1,3}(?:[.\s]\d{3})*|\d{1,6})\s*(?:KWH|KW H)\b/g)){
  const v=Number(m[1].replace(/[.\s]/g,""));
  if(v>0&&v<=10000000)values.push({value:v,index:m.index,kind:"before"});
 }
 for(const m of t.matchAll(/\bKWH\s*[:=]?\s*(\d{1,3}(?:[.\s]\d{3})*|\d{1,6})\b/g)){
  const v=Number(m[1].replace(/[.\s]/g,""));
  if(v>0&&v<=10000000)values.push({value:v,index:m.index,kind:"after"});
 }
 return values;
}
function extractConsumption(lines){
 const candidates=[];
 const best=/CONSUMO TOTAL FATURADO|CONSUMO FATURADO(?: NO MES)?|TOTAL FATURADO(?: EM KWH)?|CONSUMO NO MES|CONSUMO DO MES|CONSUMO MES|CONSUMO MEDIDO/;
 const second=/CONSUMO\s*(?:ATIVO|ENERGIA ELETRICA|DE ENERGIA|MENSAL)?\s*(?:\(?KWH\)?)?\s*[:=]?|ENERGIA ELETRICA\s*\(?KWH\)?/;
 for(let i=0;i<lines.length;i++){
  const n=clean(lines[i]);
  if(/HISTORICO|MEDIA DIARIA|ENERGIA INJETADA|ENERGIA REATIVA|GERACAO|DEMANDA|TARIFA/.test(n))continue;
  const strong=best.test(n),medium=!strong&&second.test(n);
  const markers=strong||medium;
  if(markers){
   const weight=strong?99:75;
   const tail=lines[i].replace(/^.*?(CONSUMO TOTAL FATURADO|CONSUMO FATURADO(?: NO M[EÊ]S)?|CONSUMO NO M[EÊ]S|CONSUMO DO M[EÊ]S|CONSUMO M[EÊ]S|CONSUMO MEDIDO|TOTAL FATURADO|CONSUMO\s*(?:\(?kWh\)?)?)[\s:=]*/i,"");
   let values=kwhCandidates(tail);
   // Tabelas mais genéricas: "Consumo kWh 200" ou "Consumo no mês 200" sem kWh.
   const direct=tail.match(/^\s*([\d.]{1,10})\s*(?:KWH)?\b/i);
   if(direct){
    const val=Number(direct[1].replace(/\./g,""));
    if(val>0&&val<10000000)values.push({value:val,kind:"direct"});
   }
   for(const val of values)candidates.push({value:val.value,score:weight+(val.kind==="direct"?-8:0),line:i,evidence:lines[i]});
   if(strong&&!values.length){
    for(let d=1;d<=2;d++){
     const row=lines[i+d]||"";
     for(const val of kwhCandidates(row))candidates.push({value:val.value,score:weight-14*d,line:i+d,evidence:row});
     if(d===1&&/^\d{1,6}$/.test(row))candidates.push({value:Number(row),score:weight-18,line:i+d,evidence:row});
    }
   }
  }
  if(/\bENERGIA ELETRICA\s+KWH\s+\d+\b/.test(n)){
   const v=n.match(/ENERGIA ELETRICA\s+KWH\s+(\d{1,6})\b/);
   if(v)candidates.push({value:Number(v[1]),score:85,line:i,evidence:lines[i]});
  }
 }
 return scorePick(candidates);
}
function extract(raw){
 const lines=normalizeLines(raw),normalized=lines.join("\n");
 const name=extractName(lines),address=extractAddress(lines);
 const amount=extractAmount(lines),consumption=extractConsumption(lines);
 function out(c,format){return c?{value:format?format(c.value):c.value,confidence:c.score>=90?"alta":c.score>=73?"media":"baixa",evidence:c.evidence}:{
  value:null,confidence:"nao_identificado",evidence:""}}
 return {distributor:detectDistributor(normalized),name:out(name),address:out(address),amount:out(amount),kwh:out(consumption),lineCount:lines.length,
  needsReview:![name,address,amount,consumption].every(Boolean)||[name,address,amount,consumption].some(c=>c&&c.score<90),
  disclaimer:"Valor da fatura não significa valor efetivamente pago."};
}
const api={extract,detectDistributor,normalizeLines};
if(typeof module==="object"&&module.exports)module.exports=api;
root.EnergyBillParser=api;
})(typeof globalThis!=="undefined"?globalThis:this);
