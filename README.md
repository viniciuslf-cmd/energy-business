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


## Cadastro de clubes pelo painel de gestão (2026-10-27)

- Os clubes NÃO são mais escritos diretamente no código. Cadastro: `https://energy-business.pages.dev/admin/#clubes`.
- O painel é visível sem senha, mas cadastro, edição e publicação exigem a chave administrativa configurada como segredo `ADMIN_TOKEN` no Cloudflare. Nunca colocar a chave no código ou divulgar em convites.
- Campos: nome, UF e visibilidade (visível/oculto). Clube criado oculto por padrão. Não há declaração de parceria oficial pelo simples cadastro, nem porcentagens de repasse ativadas.
- Os clubes visíveis são lidos no endpoint público `GET /api/clubs`; o painel usa `GET/POST/PATCH /api/admin/clubs` autenticados. O formulário da homepage e a seção de torcida leem somente a lista publicada. Se não houver clubes ativos, fica disponível a opção de continuar sem escolher time.
- Tabela D1: `clubs`; DDL em `clubs.sql`. Migration já executada no D1 produção. Clubes inativos permanecem no banco para futuras reativações.
- O cadastro de interessados continua com origem comercial Energy Business e, quando futuramente habilitado, somente aceita `favorite_club` correspondente a clube visível no painel.
- O recebimento de leads ainda está desativado (`LEADS_ENABLED=false`); edição de clubes pode funcionar independentemente desse controle.


## Jornada condicional (27/10/2026)

- Texto de abertura aprovado: “Quer economizar na sua conta de energia e ainda ajudar seu time do coração? Faça seu cadastro e envie sua conta para análise.”
- Etapa 1: pergunta obrigatória Sim/Não "Quer ajudar seu time do coração?". A opção Sim habilita o seletor de clubes publicados pelo painel; Não oculta e limpa a escolha, seguindo o cadastro normalmente.
- Etapa 2: leitura de foto/PDF no próprio navegador, conferência obrigatória de titular, endereço, valor e consumo e botão para avançar com os valores revisados.
- Etapa 3: simulação ilustrativa e botão "Concluir as 3 etapas". A conclusão só aparece depois da etapa 1 e da conferência da etapa 2.
- Fim: instrução clara sobre contato via WhatsApp; no **modo demonstração** o cadastro e a fatura não são enviados nem armazenados e o site não promete contato individual automático. Quando o formulário real estiver habilitado por LGPD/Turnstile, o cadastro inicial é persistido no D1, mas a foto e os dados da fatura continuam locais.
- Para quem escolheu um time: exibe nome do clube e mensagem de apoio definida no painel. Percentual de participação só é divulgado se `partner_confirmed=1`.
- Painel: `club_share_percent` (0–100, duas casas), `support_message` (máximo 650 caracteres) e `partner_confirmed` ("Parceria formalizada", marcar apenas quando houver contrato). O percentual é a fração sobre a **economia elegível do torcedor** utilizada para base de participação do clube, não um desconto adicional ao consumidor.
- Migração Cloudflare D1 executada para as três colunas acima. DDL atualizado em `clubs.sql`.
- A tela administrativa continua exigindo chave para editar informações comerciais de clubes, mesmo que a visualização do painel seja aberta.
