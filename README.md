Sistema web containerizado para gerenciamento de cardápio, controle transacional de estoque, pedidos com carrinho de múltiplos itens e painel administrativo (ADM) da cantina escolar, implantado em ambiente de produção com Docker e Docker Compose.

Equipe Técnica (Implantação): Thaylla, Naiara e Carolina

Versão Implantada: v1.0.0

Repositório Oficial: https://github.com/thaynordt/estulanches

Vídeo de Apresentação (2 a 5 min): [Cole aqui o link do vídeo no YouTube ou Google Drive]

Entregáveis da Atividade

Dockerfile
Construção da imagem otimizada da aplicação (node:20-alpine com usuário não-root node e HEALTHCHECK).

docker-compose.yml
Orquestração dos containers da aplicação (estulanches-app) e do banco de dados (estulanches-db) em rede isolada com volume persistente.

src/, public/, db/ 
Código-fonte da API REST, regras de negócio, interface web (Área do Aluno + Painel ADM) e script inicial do PostgreSQL.

tests/ — Suíte de Testes Unitários e Testes de Integração.

docs/Ficha_RDM_EstuLanches.pdf
Ficha Simplificada de Registro de Mudança (RDM).

Pré-requisitos

Para executar o sistema em sua máquina, certifique-se de ter instalado:

Docker Desktop (Windows/macOS) ou Docker Engine + Docker Compose v2 (Linux) em execução.

Git (para clonar o repositório).

Como Executar o Projeto (Passo a Passo no Terminal)

1. Clonar o repositório e acessar a pasta

git clone https://github.com/thaynordt/estulanches.git
cd estulanches


2. Configurar as variáveis de ambiente (.env)

Crie o arquivo .env a partir do modelo .env.example:

No Windows (PowerShell):

Copy-Item .env.example .env


No Linux / macOS:

cp .env.example .env


(Opcional) Caso deseje personalizar senhas ou o PIN administrativo, edite o arquivo .env:

POSTGRES_USER=estulanches_admin
POSTGRES_PASSWORD=sua_senha_segura
POSTGRES_DB=estulanches_db
DATABASE_URL=postgres://estulanches_admin:sua_senha_segura@db:5432/estulanches_db
APP_PORT=3000
APP_VERSION=1.0.0
NODE_ENV=production
ADMIN_PIN=2026


3. Construir a imagem e subir os containers em produção

docker compose up -d --build


4. Verificar o estado dos serviços e portas ativas

Confirme se os containers estulanches-app (porta 3000) e estulanches-db (porta 5432) estão ativos e saudáveis (Up / healthy):

docker compose ps


5. Auditar os logs de inicialização

Verifique os logs do banco de dados e da aplicação para garantir a ausência de erros críticos:

# Logs do banco de dados PostgreSQL
docker compose logs db

# Logs da aplicação Node.js / Express
docker compose logs app


Executar os Testes Automatizados

Com os containers em execução, execute os testes diretamente dentro do container de produção:

# Executar toda a suíte (Unitários + Integração)
docker compose exec app npm test

# Executar apenas os Testes Unitários (regras de cálculo, carrinho, estoque e status)
docker compose exec app npm run test:unit

# Executar apenas os Testes de Integração (rotas HTTP, autenticação ADM e PostgreSQL)
docker compose exec app npm run test:integration


(Nota: o teste de integração cria um pedido de teste no banco para validar a persistência real. Caso deseje limpar esse registro após rodar os testes, execute o comando de limpeza na seção de manutenção abaixo.)

Acessar e Utilizar o Sistema

Abra o navegador em: http://localhost:3000

Área do Aluno (Fazer Pedido):

Informe o Nome do Aluno e a Turma.

Escolha o lanche ou bebida, defina a quantidade e clique em + Adicionar para montar o carrinho com múltiplos itens.

Clique em Confirmar Pedido e acompanhe o status (PENDENTE, ACEITO, ENTREGUE ou RECUSADO).

Painel ADM (Cantina):

Clique na aba Painel ADM (Cantina).

Informe o PIN administrativo padrão: 2026.

Gerencie os pedidos (Aceitar, Entregar ou Recusar — ao recusar, o estoque dos itens é devolvido automaticamente) e utilize o botão +10 Estoque para reposição rápida.

Comandos Úteis de Manutenção

# Parar os containers mantendo os dados salvos no volume
docker compose down

# Parar os containers e apagar o volume do banco (reseta cardápio e pedidos para o estado inicial)
docker compose down -v

# Limpar apenas a tabela de pedidos sem reiniciar os containers
docker exec -i estulanches-db psql -U estulanches_admin -d estulanches_db -c "TRUNCATE TABLE pedidos RESTART IDENTITY CASCADE;"

