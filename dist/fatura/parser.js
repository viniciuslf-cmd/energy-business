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

/* O OCR de contas em colunas pode juntar à direita dados fiscais que NÃO
 * pertencem ao titular ou ao endereço. Cortar por marcadores conhecidos,
 * preservando o texto válido anterior ao marcador e a evidência original.
 * Cuidado para não remover "JD ATLANTICO - FNS" ou o complemento "AP 801BTR3".
 */
const stopName=/\b(?:RESERVAD[OA]\s+AO\s+FISCO|NOTA\s+FISCAL|UNIDADE\s+CONSUMIDORA|CPF\s*(?:\/\s*CNPJ)?|CNPJ|ENDERE[CÇ]O|DATA\s+(?:DE\s+)?EMISS[AÃ]O|PROTOCOLO\s+DE\s+AUTORIZA[CÇ][AÃ]O|CHAVE\s+DE\s+ACESSO|C[OÓ]DIGO\s+(?:DA\s+)?INSTALA[CÇ][AÃ]O)\b/i;
const stopAddress=/\b(?:NOTA\s+FISCAL|RESERVAD[OA]\s+AO\s+FISCO|S[EÉ]RIE\s*[:=]?\s*(?:\d|N[Oº°.]?\s*\d)|DATA\s+(?:DE\s+)?EMISS[AÃ]O|CHAVE\s+DE\s+ACESSO|PROTOCOLO\s+DE\s+AUTORIZA[CÇ][AÃ]O|UNIDADE\s+CONSUMIDORA|Q\s*R\s*CODE)\b/i;
function stopAtMarker(raw,marker){
 let value=String(raw||"");
 const match=marker.exec(value);
 if(match)value=value.slice(0,match.index);
 return value.replace(/\s+/g," ").replace(/[\s,;|.:-]+$/g,"").trim();
}
function cleanName(raw){
 let value=stopAtMarker(raw,stopName);
 // Ex.: "MARIA SOUZA TTT Reservado ao Fisco": TTT é um artefato do OCR.
 value=value.replace(/\s+([A-ZÀ-Ú])\1{2,4}$/i,"").trim();
 return value.replace(/[\s,;|.:-]+$/g,"").trim();
}
function cleanAddress(raw){
 let value=stopAtMarker(raw,stopAddress);
 // " - JD . PL 7 NOTA FISCAL ..." = fragmento OCR da área fiscal
 // ao lado do endereço, não complemento real da unidade.
 value=value.replace(/\s*[.,;]\s*PL\s*\d{1,3}\s*$/i,"");
 return value.replace(/\s{2,}/g," ").replace(/[\s,;|.:-]+$/g,"").trim();
}

function extractName(lines){
 const c=[];
 const labeled=/^(?:NOME(?:(?: COMPLETO)?(?: DO| DA)? (?:CLIENTE|TITULAR|CONSUMIDOR))?|TITULAR(?: DA CONTA)?|NOME(?: DO)? PAGADOR|PAGADOR|DESTINATARIO|RESPONSAVEL(?: PELA UNIDADE)?|CLIENTE)\s*[:\-]?\s*/;
 for(let i=0;i<lines.length;i++){
  const n=clean(lines[i]);
  if(/\b(N[Oº°.]|NUMERO|CODIGO|CONTA|REFERENCIA)\s+(?:DO\s+)?CLIENTE\b/.test(n))continue;
  const m=n.match(labeled);
  if(m){
   const tail=lines[i].slice(lines[i].length-(n.length-m[0].length)).trim().replace(/^[:;\- ]+/,"");
   const normalizedTail=cleanName(tail);
   if(personValid(normalizedTail))c.push({value:normalizedTail,score:95,line:i,evidence:lines[i]});
   for(let d=1;d<=2;d++){const suggestion=cleanName(lines[i+d]);if(personValid(suggestion))c.push({value:suggestion,score:90-d*7,line:i+d,evidence:lines[i+d]});}
  }
  if(i<23&&personValid(cleanName(lines[i]))&&lines[i+1]&&reasonableAddr(lines[i+1]))
   c.push({value:cleanName(lines[i]),score:76,line:i,evidence:lines[i]});
 }
 return scorePick(c);
}
function extractAddress(lines){
 const candidates=[];
 const label=/^(?:ENDERECO(?:\s+(?:DE FORNECIMENTO|DA UNIDADE CONSUMIDORA|DE CONSUMO|DA INSTALACAO|DO LOCAL|DE ENTREGA))?|LOCAL DE CONSUMO|END\.?\s*(?:CONSUMO|FORNECIMENTO))\b\s*[:\-]?\s*/i;
 const containsAddress=s=>{
  const n=clean(s);
  return n.length>=9 && n.length<=180 &&
    (reasonableAddr(s)||(/^[A-Z][A-Z .'-]{5,75}\s+\d{1,6}\b/.test(n)&&
     !/(?:FATURA|CNPJ|CPF|VENCIMENTO|CONSUMO|VALOR TOTAL|LEITURA|CLIENTE|CELESC|DISTRIBUICAO|ENERGIA ELETRICA)/.test(n)));
 };
 const isContinuation=s=>{
  const t=clean(s);
  return t.length>=3&&t.length<75&&
   (/^(?:CEP|CIDADE|BAIRRO|COMPLEMENTO)\b/.test(t) ||
   (/^[A-Z ]{4,45}\s*[-\/]\s*[A-Z]{2,4}$/.test(t))) &&
   !/^(?:VALOR|TOTAL|CONSUMO|LEITURA|CLASSIFICACAO|CPF|CNPJ)/.test(t);
 };
 for(let i=0;i<lines.length;i++){
  const raw=lines[i],n=clean(raw);
  if(label.test(n)&&n.length<195){
   // Algumas distribuidoras (incluindo a Celesc) omitem "Rua" no endereço.
   // O rótulo ENDEREÇO e um número no logradouro têm prioridade sobre endereço genérico.
   const tail=cleanAddress(n.replace(label,"")).trim();
   const rawLabel=/^\s*(?:ENDERE[CÇ]O(?:\s+(?:DE FORNECIMENTO|DA UNIDADE CONSUMIDORA|DE CONSUMO|DA INSTALA[CÇ][AÃ]O|DO LOCAL|DE ENTREGA))?|LOCAL DE CONSUMO|END\.?\s*(?:CONSUMO|FORNECIMENTO))\b\s*[:\-]?\s*/i;
   if(containsAddress(tail)){
    let value=cleanAddress(raw.replace(rawLabel,""));
    const continued=[lines[i+1],lines[i+2]].filter(Boolean);
    for(const row of continued){if(isContinuation(row))value+=" · "+cleanAddress(row);else break}
    candidates.push({value:cleanAddress(value),score:i<90?104:84,line:i,evidence:raw});
   }
   for(let d=1;d<=3;d++){
    if(!lines[i+d])break;
    if(containsAddress(cleanAddress(lines[i+d]))){
      let value=cleanAddress(lines[i+d]);
      if(isContinuation(lines[i+d+1]||""))value+=" · "+lines[i+d+1].trim();
      candidates.push({value:cleanAddress(value),score:(i<90?98:78)-d*4,line:i+d,evidence:lines[i+d]});
      break;
    }
   }
  }
  if(reasonableAddr(raw)){
    let value=raw.trim();
    const near=clean(lines.slice(Math.max(0,i-5),i).join(" "));
    const penalty=/DADOS DE MEDICAO|TRIBUTOS|PIS COFINS/.test(near)?15:0;
    if(isContinuation(lines[i+1]||""))value+=" · "+lines[i+1].trim();
    candidates.push({value:cleanAddress(value),score:(i<30?75:55)-penalty,line:i,evidence:raw});
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
 const asInteger=x=>{
  const v=String(x||"").trim().replace(/\s/g,"");
  if(!/^\d{1,3}(?:\.\d{3})*$|^\d{1,7}$/.test(v))return null;
  const n=Number(v.replace(/\./g,""));
  return Number.isInteger(n)&&n>0&&n<=10000000?n:null;
 };
 const add=(value,score,line,evidence)=>{
  if(Number.isFinite(value)&&value>0&&value<=10000000)
   candidates.push({value,score,line,evidence});
 };
 const te=[],tusd=[];
 for(let i=0;i<lines.length;i++){
  const n=clean(lines[i]);
  if(/HISTORICO|MEDIA DIARIA|ENERGIA INJETADA|ENERGIA REATIVA|GERACAO|DEMANDA|TARIFA/.test(n))continue;
  const strong=best.test(n),medium=!strong&&second.test(n);
  if(strong||medium){
   const weight=strong?99:75;
   const tail=lines[i].replace(/^.*?(CONSUMO TOTAL FATURADO|CONSUMO FATURADO(?: NO M[EÊ]S)?|CONSUMO NO M[EÊ]S|CONSUMO DO M[EÊ]S|CONSUMO M[EÊ]S|CONSUMO MEDIDO|TOTAL FATURADO|CONSUMO\s*(?:\(?kWh\)?)?)[\s:=]*/i,"");
   const values=kwhCandidates(tail);
   const direct=tail.match(/^\s*([\d.]{1,10})\s*(?:KWH)?\b/i);
   if(direct){const val=asInteger(direct[1]);if(val!==null)values.push({value:val,kind:"direct"})}
   for(const v of values)add(v.value,weight+(v.kind==="direct"?-8:0),i,lines[i]);
   if(strong&&!values.length){
    for(let d=1;d<=2;d++){
     const row=lines[i+d]||"";
     for(const v of kwhCandidates(row))add(v.value,weight-14*d,i+d,row);
     if(d===1&&/^\d{1,6}$/.test(row))add(Number(row),weight-18,i+d,row);
    }
   }
  }
  if(/\bENERGIA ELETRICA\s+KWH\s+\d+\b/.test(n)){
   const m=n.match(/ENERGIA ELETRICA\s+KWH\s+(\d{1,6})\b/);
   if(m)add(Number(m[1]),85,i,lines[i]);
  }
  // Celesc: a medição costuma estar na tabela Leitura anterior/atual/Total apurado.
  if(/\bTOTAL\s+APURADO\b/.test(n)){
    const t=n.split(/\bTOTAL\s+APURADO\b/).slice(1).join(" ");
    const direct=t.match(/^\s*[:=]?\s*(\d{1,6})\b/);
    if(direct)add(Number(direct[1]),102,i,lines[i]);
    // Linha tabular após o cabeçalho: "5792955 Energia Único 1.077 1.554 1,000... 0,00 477".
    for(let d=1;d<=3;d++){
     const row=clean(lines[i+d]||"");
     if(!row||/HISTORICO DE CONSUMO|TRIBUTOS|ITENS DE FATURA/.test(row))break;
     const measures=[...row.matchAll(/\b(\d{1,3}\.\d{3}|\d{1,6})\b/g)].map(m=>({value:asInteger(m[1]),raw:m[1]})).filter(x=>x.value!==null);
     const dotted=measures.filter(x=>/^\d{1,3}\.\d{3}$/.test(x.raw));
     if(dotted.length>=2){
      const delta=dotted[1].value-dotted[0].value;
      const last=measures.at(-1);
      if(delta>0&&last&&delta===last.value)add(delta,110,i+d,lines[i+d]);
      else if(delta>0&&delta<100000)add(delta,87,i+d,lines[i+d]);
     }
     if(measures.length&&d===1&&/^\d{1,6}$/.test(row))add(Number(row),90,i+d,lines[i+d]);
    }
  }
  // Itens Celesc podem repartir 477 kWh em 150,000 + 327,000 para
  // "Consumo TE" e repetir os mesmos kWh em "Consumo TUSD".
  // Somamos APENAS uma categoria para evitar dupla contagem.
  const item=n.match(/\bCONSUMO\s+(TE|TUSD)\b.*?\bKWH\s+(\d{1,6}(?:[,.]\d{1,3})?)/);
  if(item){
    const val=Number(item[2].replace(",","."));
    if(Number.isFinite(val)&&val>0&&val<1000000){
      const target=item[1]==="TE"?te:tusd;
      target.push({value:val,line:i});
    }
  }
 }
 // Apenas combinar itens homogêneos da mesma classe de cobrança.
 // A soma é um fallback com revisão obrigatória: o valor pode não representar
 // a energia líquida compensável quando há geração distribuída.
 for(const group of [te,tusd]){
  if(group.length>=2){
   const sum=group.reduce((a,b)=>a+b.value,0);
   if(Number.isInteger(sum)&&sum<=10000000){
    add(sum,group===te?91:85,group[0].line,group.map(x=>lines[x.line]).join(" | "));
   }
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
