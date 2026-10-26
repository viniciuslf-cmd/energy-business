# Energy Business

Plataforma web da Energy Business para apresentação de soluções de energia, simulação de economia e futura integração com os sites de clubes de futebol.

## Estado atual

Prévia navegável com identidade da empresa, formulário demonstrativo, etapas da adesão e projeções em 1, 2, 5, 10 e 15 anos. Nenhum dado pessoal é armazenado ou enviado. Percentuais são ilustrativos.

## Cloudflare Pages com GitHub

- Branch de produção: `main`
- Framework: `None`
- Comando de build: vazio
- Diretório de saída: `dist`
- Diretório raiz: `/`

Conectar o repositório no Cloudflare Pages. Cada alteração em `main` poderá gerar uma publicação automática. Não são necessárias dependências ou variáveis de ambiente para esta prévia.

## Arquivos

- `dist/index.html`: página, estilos e simulador.
- `dist/energy-business-logo.png`: imagem fornecida pelo proprietário, com enquadramento visual por CSS.
- `dist/_headers`: cabeçalhos básicos de segurança.

## Próximas integrações

Recebimento persistente de solicitações, painel administrativo protegido, análise de fatura e integração com a fornecedora. Após validar a operação, conectar campanhas aos sites dos clubes. Essas funcionalidades ainda não estão implementadas.

## Verificação

Abrir a página no navegador e testar o formulário com dados fictícios. Exemplo: conta de R$ 800 com cenário de 20% resulta em R$ 160 por mês e R$ 1.920 por ano.
