export function calcularTotalPedido(precoUnitario, quantidade, descontoPercentual = 0) {
  if (typeof precoUnitario !== 'number' || precoUnitario < 0) {
    throw new Error('Preco unitario invalido.');
  }
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw new Error('A quantidade deve ser um numero inteiro maior que zero.');
  }
  if (descontoPercentual < 0 || descontoPercentual > 100) {
    throw new Error('Percentual de desconto invalido.');
  }

  const subtotal = precoUnitario * quantidade;
  const total = subtotal * (1 - descontoPercentual / 100);
  return Number(total.toFixed(2));
}

export function calcularTotalCarrinho(itens) {
  if (!Array.isArray(itens) || itens.length === 0) {
    throw new Error('O carrinho deve conter ao menos um item.');
  }
  const total = itens.reduce((acc, item) => {
    return acc + calcularTotalPedido(Number(item.preco), Number(item.quantidade));
  }, 0);
  return Number(total.toFixed(2));
}

export function validarDadosPedido({ aluno_nome, turma, itens }) {
  if (!aluno_nome || typeof aluno_nome !== 'string' || aluno_nome.trim().length < 2) {
    return { valido: false, erro: 'Nome do aluno e obrigatorio (minimo 2 caracteres).' };
  }
  if (!turma || typeof turma !== 'string' || turma.trim().length < 2) {
    return { valido: false, erro: 'Turma e obrigatoria.' };
  }
  if (!Array.isArray(itens) || itens.length === 0) {
    return { valido: false, erro: 'Adicione pelo menos um item ao pedido.' };
  }

  for (const item of itens) {
    if (!Number.isInteger(Number(item.item_id)) || Number(item.item_id) <= 0) {
      return { valido: false, erro: 'Item do cardapio invalido.' };
    }
    if (!Number.isInteger(Number(item.quantidade)) || Number(item.quantidade) <= 0 || Number(item.quantidade) > 20) {
      return { valido: false, erro: 'Quantidade de cada item deve ser entre 1 e 20 unidades.' };
    }
  }

  return { valido: true };
}

export function verificarDisponibilidadeEstoque(item, quantidadeSolicitada) {
  if (!item) {
    return { disponivel: false, erro: 'Item nao encontrado no cardapio.' };
  }
  if (!item.disponivel) {
    return { disponivel: false, erro: `O item "${item.nome}" esta temporariamente indisponivel.` };
  }
  if (item.estoque < quantidadeSolicitada) {
    return { disponivel: false, erro: `Estoque insuficiente para "${item.nome}". Disponivel: ${item.estoque}.` };
  }
  return { disponivel: true };
}

export function validarTransicaoStatus(statusAtual, novoStatus) {
  const statusPermitidos = ['ACEITO', 'ENTREGUE', 'RECUSADO'];
  if (!statusPermitidos.includes(novoStatus)) {
    return { valido: false, erro: 'Status invalido. Use ACEITO, ENTREGUE ou RECUSADO.' };
  }
  if (statusAtual === 'RECUSADO' || statusAtual === 'ENTREGUE') {
    return { valido: false, erro: `Pedido ja finalizado como ${statusAtual} e nao pode ser alterado.` };
  }
  if (statusAtual === novoStatus) {
    return { valido: false, erro: `O pedido ja esta com status ${novoStatus}.` };
  }
  return { valido: true };
}