# Energy Business

Plataforma: https://energy-business.pages.dev
Painel: https://energy-business.pages.dev/admin/

## Mudanças nesta versão

- Reformulação completa da home e da área de gestão com layout moderno responsivo.
- Origem da simulação fixa em Energy Business, sem seleção de clubes.
- Painel de gestão acessível pela aba no site, protegido por login único de gestor e sessão de 12 horas.
- As rotas administrativas, incluindo as APIs de clubes e indicações de teste, exigem sessão autenticada no servidor.
- LEADS_ENABLED=false: nenhum cadastro real enviado ou armazenado. O formulário testa apenas a simulação.
- Simulador e projeções são valores ilustrativos, nunca garantia comercial.

## Infraestrutura

Cloudflare Pages conectado ao branch main do GitHub, saída dist, sem comando de build. Cloudflare D1 ligado pelo binding DB; funções em functions/api.

## Para ativar operação real

Finalizar política LGPD e identificação da empresa, proteção Cloudflare Turnstile, integração da fornecedora e homologação. Antes de ativar dados reais, substituir a senha provisória por uma senha longa e configurar contas individuais por gestor/sócio. Somente depois alterar LEADS_ENABLED para true.

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
- O painel agora exige login único. Cadastro, edição, publicação e relatórios usam a mesma sessão autenticada por cookie HttpOnly/Secure/SameSite=Strict; não se pede outra chave em Clubes ou Indicações.
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
- A área administrativa exige login antes de carregar qualquer tela e libera a edição conforme a sessão autenticada.

## Login do Painel de Gestão (2026-10-27)

- Acesso pelo menu superior público **Acesso à gestão** ou em `/admin/`; visitantes são redirecionados para `/admin/login/`.
- Usuário inicial `gestor`; a senha provisória foi cadastrada no D1 com salt e PBKDF2-SHA256 (150.000 iterações), sem senha em texto claro no GitHub. **Trocar antes da operação comercial.**
- Tabelas D1 `manager_accounts`, `manager_sessions` e `manager_login_attempts`; cookie HttpOnly, Secure, SameSite=Strict, expiração em 12 horas e bloqueio após 5 tentativas malsucedidas por origem de IP durante 15 minutos.
- O middleware protege `/admin/`, `/api/admin/*` e `/api/test/clubs` com sessão de servidor. Somente a página de login e os endpoints públicos destinados ao torcedor permanecem sem autenticação.
- Uma única autenticação libera a visão geral, os cadastros fictícios salvos no D1, a gestão de clubes e a validação de indicações. A opção **Sair** revoga a sessão.
- Neste estágio de homologação, o catálogo `test_clubs` e os cadastros `test_leads` são usados; o catálogo comercial `clubs` e a tabela `leads` seguem isolados.

## Dois caminhos independentes (27/10/2026)

- Homepage: cadastro de economia sem qualquer seleção de clube ou herança da escolha de quem indicou.
- Botão separado "Quer economizar e ainda ajudar seu time do coração?" leva ao portal `/clubes/`.
- O portal consulta `/api/clubs`; lista clubes visíveis e só libera botão de endereço externo quando o gestor cadastrou um link HTTPS e marcou que foi conferido.
- No Painel de Gestão > Clubes, novos campos **Site do clube** e **Endereço conferido**. Sem URL validada, é exibido "Endereço em preparação", sem criar redirecionamento falso.
- Os links são de domínios externos e abrem em nova aba; o consumidor recebe aviso de conferência do domínio. Exibição não indica, por si só, convênio oficial.
- D1: tabela `club_destinations` (DDL em `club-destinations.sql`), associada por `club_id`, usada pelos ambientes comercial e de homologação. Criada na produção Cloudflare.
- Endpoint `POST /api/admin/club-link` exige login de gestor e origem confiável. URL HTTPS validada no servidor.
- A autenticação inicial inclui migração de hash do cadastro conhecido do gestor com 150k para 100k iterações PBKDF2 somente após conferir a senha enviada. Essa exceção deve ser removida depois da migração e a credencial provisória precisa ser substituída por uma senha forte antes do uso comercial.

## Painel de Gestão SPA + CRM estratégico (27/10/2026)

- Menu fixo, seleção ativa em todas as áreas, sem navegar para fora de `/admin/`. A rolagem acontece apenas no conteúdo central.
- Abas: Visão Geral, Solicitações, Clubes, Gestão de Parceiros, Indicações, Portal dos Clubes, Simulador, Privacidade, Acessos dos Sócios.
- Áreas previamente separadas são integradas em iframes de mesma origem. `/admin/indicacoes/` mantém autorização de sessão e permite incorporação exclusivamente no mesmo domínio (CSP `frame-ancestors 'self'`).
- Gestão de Parceiros armazena clubes/empresas/condomínios e etapa (pendente, contato, negociação, acordo, contrato, pausado, perdido). Inclui torcedores estimados, unidades potenciais, desconto para o clube, percentual de retorno para Energy Business, participação do clube, conta estimada, contatos e observações.
- Clubes novos cadastrados no painel geram automaticamente um registro do CRM com `created_by` vinculado à sessão. Registros anteriores foram importados sem inventar autor (`created_by = sistema`). O criador original permanece imutável e mudanças posteriores geram histórico.
- `manager_accounts` tem `display_name` e `role`, e cada sócio pode usar conta própria. Existe um administrador inicial e o administrador pode criar mais dois acessos individuais, total de três. Senhas novas são aleatórias, exibidas uma única vez, e são armazenadas somente com hash PBKDF2 + salt.
- Sócios autenticados podem atualizar seus próprios nomes e alterar suas senhas. Senhas devem ser longas (mínimo 12 caracteres com letras e números).
- Manter o ambiente de homologação com dados fictícios até concluir LGPD, configuração comercial e troca da senha provisória do administrador. Não compartilhar o login inicial entre os três sócios.
- Novo endpoint autenticado `/api/admin/partners` (GET/POST/PATCH), `/api/admin/users` (GET/POST/PATCH), `/api/auth/change-password` (POST).
