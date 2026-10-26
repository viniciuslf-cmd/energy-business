# Energy Business — Plataforma de energia para clubes

Plataforma web da Energy Business para simulação de economia, cadastro futuro de interessados e gestão comercial. A primeira etapa é independente; campanhas dentro dos sites de clubes ocorrerão depois de validar a operação.

## Infraestrutura

- Produção: https://energy-business.pages.dev
- GitHub: branch main; Framework None; build vazio; saída dist.
- Cloudflare D1: energy-business-prod, binding de produção DB.
- Pages Functions: /api/config, /api/leads e /api/admin/leads.
- Gestão: /admin/ (chave secreta ADMIN_TOKEN configurada somente no Cloudflare).
- Identidade visual da Energy Business e simulador ilustrativo preservados.

## Segurança e estado atual

O recebimento de dados reais permanece DESATIVADO (LEADS_ENABLED=false). A simulação ainda é demonstrativa, sem transmissão dos campos pessoais. O painel administrativo está preparado e exige uma chave secreta armazenada fora do repositório.

Para habilitar o recebimento real:

1. Completar a Política de Privacidade com a pessoa jurídica controladora, contato, retenção, compartilhamento e direitos LGPD.
2. Configurar Cloudflare Turnstile: TURNSTILE_SITE_KEY e TURNSTILE_SECRET.
3. Definir PRIVACY_CONTACT com canal de contato válido.
4. Testar a jornada e ativar LEADS_ENABLED=true nas variáveis de produção do Cloudflare Pages.
5. Formalizar condições de economia, disponibilidade, fornecedora e eventuais clubes antes de comercializar.

API pública com validação de entrada, verificação de origem e Turnstile obrigatório; a administração utiliza token de alta entropia, páginas HTTPS e respostas sem cache. Os descontos continuam ilustrativos. O pedido de análise não configura adesão nem contratação.

## Modelo de dados

schema.sql mantém a tabela leads e índices. Etapas: novo, em_analise, contatado, convertido, descartado. Estimativa do valor da conta e taxas são cenários de demonstração.

## Próximas entregas

Fluxo para anexar fatura com controle de acesso, avaliação de elegibilidade, integração com fornecedora, política LGPD definitiva, acesso individual para usuários administrativos e páginas personalizadas por clube após acordos.