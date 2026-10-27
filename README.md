# Energy Business

Plataforma: https://energy-business.pages.dev
Painel: https://energy-business.pages.dev/admin/

## Mudanças nesta versão

- Reformulação completa da home e da área de gestão com layout moderno responsivo.
- Origem da simulação fixa em Energy Business, sem seleção de clubes.
- Painel com visualização sem senha nesta fase e opção de registros de exemplo claramente fictícios.
- A API administrativa de dados pessoais continua protegida por segredo no Cloudflare; a remoção de senha na visualização não expõe dados de clientes.
- LEADS_ENABLED=false: nenhum cadastro real enviado ou armazenado. O formulário testa apenas a simulação.
- Simulador e projeções são valores ilustrativos, nunca garantia comercial.

## Infraestrutura

Cloudflare Pages conectado ao branch main do GitHub, saída dist, sem comando de build. Cloudflare D1 ligado pelo binding DB; funções em functions/api.

## Para ativar operação real

Finalizar política LGPD e identificação da empresa, proteção Cloudflare Turnstile, integração da fornecedora, homologação e login de usuário individual para acesso a informações reais. Somente depois alterar LEADS_ENABLED para true.

Clubes de futebol não fazem parte da seleção pública nesta versão. A fonte inicial de todos os cadastros será a Energy Business.
## Leitor de faturas - #fatura

Protótipo de leitura local de foto ou PDF para extrair titular, endereço da unidade consumidora, total da fatura e kWh mensal. Usa Tesseract.js no navegador e pdfjs-dist para PDFs. Suporta revisão de todos os campos, texto de evidência, seleção de amostra fictícia, preenchimento manual e cópia apenas após confirmação.

Não há armazenamento ou envio de fatura ou de OCR para nossa API. O arquivo é processado localmente; bibliotecas e modelos externos são baixados quando o usuário inicia o OCR. LEADS_ENABLED continua false. A ligação com cadastro real ou envio de faturas exigirá LGPD completa, consentimento, autenticação administrativa e armazenamento privado com política de retenção.

Modelos estudados: Celesc, Copel, Cemig, CPFL/RGE, Enel, Neoenergia, Equatorial, Energisa, EDP, Light, Amazonas e Roraima Energia. As diferenças são tratadas por variantes de etiquetas e não por coordenadas rígidas. A leitura pode falhar ou confundir valores; a conferência humana é obrigatória. Não se deve interpretar valor da conta como comprovante de pagamento.

Fontes: https://www.celesc.com.br/images/2._Segunda_via_PDF.pdf ; https://www.enel.com.br/pt/Para_Voce/entenda_sua_conta.html ; https://www.cemig.com.br/faturas/entenda-sua-conta/ ; https://www.cpfl.com.br/entenda-sua-conta ; https://www.energisa.com.br/entenda-sua-conta ; https://www.neoenergia.com/entenda-sua-conta-de-luz .

Testes do motor: node tests/fatura-parser-test.js
## Futebol, clubes e indicações

A seção /#torcida apresenta uma PROPOSTA comercial ainda não ativada de economia de energia e participação financeira do clube, sujeita a convênio e elegibilidade.
A escolha do time é preferência do usuário, não implica vínculo oficial; a origem de campanhas continua Energy Business.
A seleção inclui clubes conhecidos, Outro clube e Prefiro não escolher. O menu da seção sincroniza com o cadastro.
Convites podem ser enviados pelo WhatsApp e o link pode ser copiado. Em demonstração, os links não são rastreados nem geram descontos.
A base D1 já tem favorite_club, referral_code e referred_by_code. A API (quando ativa) poderá registrar a origem do convite e gerar um código individual seguro.
Recompensas por indicação ainda NÃO estão implementadas. Bonificações exigirão regulamento, limites, elegibilidade, combate a fraudes, controle de contratos ativos e cumprimento da LGPD.
