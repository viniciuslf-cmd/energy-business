// Execute com: node tests/fatura-parser-test.js
const assert=require("node:assert/strict");
const p=require("../dist/fatura/parser.js");
const cases=[
 ["Celesc","CELESC\nMARIA SILVA DE OLIVEIRA\nRUA DAS FLORES 130\nFLORIANOPOLIS - SC\nCONSUMO TOTAL FATURADO 115 kWh\nVALOR ATE O VENCIMENTO R$ 88,52",88.52,115],
 ["Enel","ENEL\nNOME DO CLIENTE: JOSE CARLOS DE SOUZA\nENDERECO DE CONSUMO\nAVENIDA PAULISTA 500\nMES/ANO VENCIMENTO TOTAL A PAGAR\n10/2026 22/10/2026 R$129,17\nCONSUMO DO MES 222 kWh",129.17,222],
 ["Cemig","CEMIG\nTITULAR: JOANA CUNHA DE SOUZA\nENDERECO DE FORNECIMENTO\nRUA SANTOS 42\nVALOR DA FATURA R$ 1.254,25\nCONSUMO FATURADO 1.450 kWh",1254.25,1450],
 ["Copel","COPEL\nTITULAR: CARLOS ALBERTO DE MELO\nRUA DUQUE DE CAXIAS 102\nCONSUMO NO MES 350 kWh\nTOTAL A PAGAR R$ 310,80",310.8,350],
 ["Neoenergia","NEOENERGIA\nANA CAROLINA FERREIRA\nRUA DA PRAIA 15\nCONSUMO FATURADO 320 KWH\nVALOR DA CONTA R$ 400,00",400,320],
 ["Equatorial","EQUATORIAL ENERGIA\nENDERECO DA UNIDADE CONSUMIDORA\nAVENIDA RIO BRANCO 28\nNOME DO TITULAR: ANA MARIA DOS SANTOS\nCONSUMO TOTAL FATURADO 493 kWh\nTOTAL DA FATURA R$ 450,30",450.3,493],
 ["CPFL","CPFL ENERGIA\nNOME COMPLETO DO CLIENTE\nALICE DE SOUZA FERREIRA\nENDERECO DO CLIENTE\nRUA SETE DE SETEMBRO 55\nTOTAL A PAGAR R$ 109,20\nCONSUMO MENSAL: 180 kWh",109.2,180],
 ["Energisa","ENERGISA\nTITULAR: ANA CLAUDIA SOUZA\nLOCAL DE CONSUMO\nRUA 7 DE SETEMBRO 15\nCONSUMO FATURADO 320 kWh\nTOTAL DA FATURA R$ 368,90",368.9,320],
 ["EDP","EDP SP\nNOME DO CLIENTE: JOSE MARIA DE SOUZA\nRUA SANTOS 55\nCONSUMO TOTAL FATURADO 125 kWh\nVALOR A PAGAR 193,00",193,125],
 ["Light","LIGHT RJ\nTitular: Joana Cunha de Souza\nEndereço de fornecimento\nTravessa Cubango 27 - RJ\nVencimento: 02/11/2026\nTOTAL DA FATURA: 310,05\nConsumo do mês 291 kWh",310.05,291],
 ["Condominio PJ","CEMIG\nNOME DO CLIENTE: CONDOMINIO RESIDENCIAL SOL NASCENTE\nRUA CENTRAL 101\nTOTAL A PAGAR R$ 3.200,00\nCONSUMO TOTAL FATURADO 2.450 KWH",3200,2450]
];
for(const [label,text,amount,kwh] of cases){
 const r=p.extract(text);
 assert.equal(r.amount.value,amount,label+": valor");
 assert.equal(r.kwh.value,kwh,label+": kWh");
 assert.ok(r.name.value&&r.address.value,label+": titular/endereço");
}
const bad=p.extract("FATURA\nHISTORICO DE CONSUMO\nSET 180 kWh\nAGO 220 kWh\nTOTAL TRIBUTOS R$ 20,55");
assert.equal(bad.kwh.value,null,"Historico nao pode ser consumo do mes");
assert.equal(bad.amount.value,null,"Imposto nao pode ser total da fatura");
console.log("OK: "+cases.length+" layout-tests; ambiguities rejected.");
