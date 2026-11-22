import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularTotalPedido,
  calcularTotalCarrinho,
  validarDadosPedido,
  verificarDisponibilidadeEstoque,
  validarTransicaoStatus
} from '../src/business.js';

describe('Testes Unitarios - Regras de Negocio EstuLanches', () => {
  it('deve calcular corretamente o valor total de um item', () => {
    assert.equal(calcularTotalPedido(6.5, 2), 13.00);
  });

  it('deve calcular corretamente o valor total de varios itens no carrinho', () => {
    const total = calcularTotalCarrinho([
      { preco: 6.5, quantidade: 2 },
      { preco: 5.5, quantidade: 1 }
    ]);
    assert.equal(total, 18.50);
  });

  it('deve rejeitar quantidade zero ou negativa no calculo', () => {
    assert.throws(() => calcularTotalPedido(6.5, 0), /quantidade deve ser/);
  });

  it('deve aprovar pedido valido com multiplos itens', () => {
    const res = validarDadosPedido({
      aluno_nome: 'Mariana Costa',
      turma: '2 Ano A',
      itens: [
        { item_id: 1, quantidade: 2 },
        { item_id: 4, quantidade: 1 }
      ]
    });
    assert.equal(res.valido, true);
  });

  it('deve bloquear venda quando estoque for menor que a quantidade solicitada', () => {
    const res = verificarDisponibilidadeEstoque({ nome: 'Coxinha', disponivel: true, estoque: 3 }, 5);
    assert.equal(res.disponivel, false);
  });

  it('deve permitir transicao de PENDENTE para ACEITO ou RECUSADO e bloquear apos finalizado', () => {
    assert.equal(validarTransicaoStatus('PENDENTE', 'ACEITO').valido, true);
    assert.equal(validarTransicaoStatus('ACEITO', 'ENTREGUE').valido, true);
    assert.equal(validarTransicaoStatus('RECUSADO', 'ACEITO').valido, false);
  });
});