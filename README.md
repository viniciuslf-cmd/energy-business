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