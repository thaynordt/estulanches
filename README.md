# EstuLanches

Sistema de gestão de cardápio e pedidos da cantina escolar.

## Tecnologias

- Node.js 20 (Express)
- PostgreSQL 16
- Docker e Docker Compose v2

## Como executar

1. Crie o arquivo `.env` com as credenciais do banco (ele não deve ser enviado ao GitHub).
2. Suba os containers:

```bash
docker compose up -d --build
docker compose ps
```

3. Acesse: http://localhost:3000
4. Healthcheck: http://localhost:3000/health

## Containers

| Serviço | Container | Porta |
|---|---|---|
| Aplicação | `estulanches-app` | 3000 |
| Banco de dados | `estulanches-db` | 5432 |

O banco é inicializado por `db/init.sql`. Os dados ficam no volume `estulanches_pgdata`, e os containers usam a rede `estulanches_net`.

## Testes

```bash
npm run test:unit
npm run test:integration
```

## Documentação

A ficha de registro de mudança (RDM) está em `docs/ficha_rdm.html`.

## Autora

Thaylla Neves
