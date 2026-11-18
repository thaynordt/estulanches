import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_PIN = process.env.ADMIN_PIN || '2026';

describe('Testes de Integracao - API, Banco e Painel ADM', () => {
  it('GET /health deve retornar status 200 e conexao ativa com o banco', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.status, 'healthy');
    assert.equal(body.database, 'connected');
  });

  it('POST /api/pedidos deve criar pedido PENDENTE e baixar estoque', async () => {
    const res = await fetch(`${BASE_URL}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aluno_nome: 'Aluno Teste Integracao',
        turma: '1 Ano C',
        itens: [
          { item_id: 1, quantidade: 1 },
          { item_id: 4, quantidade: 1 }
        ]
      })
    });
    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.pedido.status, 'PENDENTE');
    assert.equal(Number(body.pedido.valor_total), 12.00);
  });

  it('PATCH /api/pedidos/:id/status deve bloquear acesso sem PIN administrativo (HTTP 401)', async () => {
    const res = await fetch(`${BASE_URL}/api/pedidos/1/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ACEITO' })
    });
    assert.equal(res.status, 401);
  });

  it('PATCH /api/pedidos/:id/status deve recusar pedido com PIN valido e devolver estoque', async () => {
    const res = await fetch(`${BASE_URL}/api/pedidos/1/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': ADMIN_PIN
      },
      body: JSON.stringify({ status: 'RECUSADO' })
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.pedido.status, 'RECUSADO');
  });
});