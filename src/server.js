import express from 'express';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  calcularTotalCarrinho,
  validarDadosPedido,
  verificarDisponibilidadeEstoque,
  validarTransicaoStatus
} from './business.js';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.APP_PORT || 3000;
const APP_VERSION = process.env.APP_VERSION || '1.0.0';
const ADMIN_PIN = process.env.ADMIN_PIN || '2026';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

function autenticarAdmin(req, res, next) {
  const pin = req.headers['x-admin-pin'];
  if (!pin || pin !== ADMIN_PIN) {
    return res.status(401).json({ erro: 'Acesso negado: PIN administrativo invalido.' });
  }
  next();
}

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'healthy',
      service: 'EstuLanches API',
      version: APP_VERSION,
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: err.message
    });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { pin } = req.body;
  if (pin === ADMIN_PIN) {
    return res.status(200).json({ autenticado: true, mensagem: 'Acesso administrativo liberado.' });
  }
  return res.status(401).json({ autenticado: false, erro: 'PIN incorreto.' });
});

app.get('/api/cardapio', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nome, categoria, preco, estoque, disponivel FROM itens_cardapio ORDER BY id ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('[ERRO] Falha ao buscar cardapio:', err.message);
    res.status(500).json({ erro: 'Erro interno ao carregar o cardapio.' });
  }
});

app.patch('/api/cardapio/:id/estoque', autenticarAdmin, async (req, res) => {
  const itemId = Number(req.params.id);
  const adicionar = Number(req.body.adicionar || 10);

  if (!Number.isInteger(itemId) || itemId <= 0 || !Number.isInteger(adicionar) || adicionar <= 0) {
    return res.status(400).json({ erro: 'Parametros invalidos para reposicao de estoque.' });
  }

  try {
    const { rows } = await pool.query(
      'UPDATE itens_cardapio SET estoque = estoque + $1 WHERE id = $2 RETURNING id, nome, estoque',
      [adicionar, itemId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Item nao encontrado.' });
    }
    res.json({ mensagem: `Estoque de ${rows[0].nome} atualizado!`, item: rows[0] });
  } catch (err) {
    console.error('[ERRO] Falha ao repor estoque:', err.message);
    res.status(500).json({ erro: 'Erro ao atualizar estoque.' });
  }
});

app.get('/api/pedidos', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.aluno_nome, p.turma,
             STRING_AGG(pi.quantidade || 'x ' || c.nome, ', ' ORDER BY pi.id) AS itens_resumo,
             SUM(pi.quantidade) AS quantidade_total,
             p.valor_total, p.status, p.criado_em
      FROM pedidos p
      JOIN pedido_itens pi ON pi.pedido_id = p.id
      JOIN itens_cardapio c ON c.id = pi.item_id
      GROUP BY p.id
      ORDER BY p.criado_em DESC
      LIMIT 30
    `);
    res.json(rows);
  } catch (err) {
    console.error('[ERRO] Falha ao buscar pedidos:', err.message);
    res.status(500).json({ erro: 'Erro interno ao listar pedidos.' });
  }
});

app.post('/api/pedidos', async (req, res) => {
  const { aluno_nome, turma, itens, item_id, quantidade } = req.body;

  const listaBruta = Array.isArray(itens)
    ? itens
    : item_id
      ? [{ item_id, quantidade }]
      : [];

  const validacao = validarDadosPedido({
    aluno_nome,
    turma,
    itens: listaBruta
  });

  if (!validacao.valido) {
    return res.status(400).json({ erro: validacao.erro });
  }

  const mapaItens = new Map();
  for (const entry of listaBruta) {
    const id = Number(entry.item_id);
    const qtd = Number(entry.quantidade);
    mapaItens.set(id, (mapaItens.get(id) || 0) + qtd);
  }

  const itensConsolidados = Array.from(mapaItens.entries())
    .map(([id, qtd]) => ({ item_id: id, quantidade: qtd }))
    .sort((a, b) => a.item_id - b.item_id);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const itensConfirmados = [];

    for (const entry of itensConsolidados) {
      const itemRes = await client.query(
        'SELECT id, nome, preco, estoque, disponivel FROM itens_cardapio WHERE id = $1 FOR UPDATE',
        [entry.item_id]
      );
      const item = itemRes.rows[0];

      const checkEstoque = verificarDisponibilidadeEstoque(item, entry.quantidade);
      if (!checkEstoque.disponivel) {
        await client.query('ROLLBACK');
        return res.status(400).json({ erro: checkEstoque.erro });
      }

      await client.query(
        'UPDATE itens_cardapio SET estoque = estoque - $1 WHERE id = $2',
        [entry.quantidade, entry.item_id]
      );

      itensConfirmados.push({
        item_id: item.id,
        nome: item.nome,
        preco: Number(item.preco),
        quantidade: entry.quantidade
      });
    }

    const valorTotal = calcularTotalCarrinho(itensConfirmados);

    const pedidoRes = await client.query(
      `INSERT INTO pedidos (aluno_nome, turma, valor_total, status)
       VALUES ($1, $2, $3, 'PENDENTE')
       RETURNING id, aluno_nome, turma, valor_total, status, criado_em`,
      [aluno_nome.trim(), turma.trim(), valorTotal]
    );

    const pedidoCriado = pedidoRes.rows[0];

    for (const ic of itensConfirmados) {
      await client.query(
        `INSERT INTO pedido_itens (pedido_id, item_id, quantidade, preco_unitario)
         VALUES ($1, $2, $3, $4)`,
        [pedidoCriado.id, ic.item_id, ic.quantidade, ic.preco]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({
      mensagem: 'Pedido enviado para a cantina! Aguardando aprovacao.',
      pedido: {
        ...pedidoCriado,
        itens: itensConfirmados
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ERRO] Falha ao registrar pedido:', err.message);
    res.status(500).json({ erro: 'Erro ao processar pedido.' });
  } finally {
    client.release();
  }
});

app.patch('/api/pedidos/:id/status', autenticarAdmin, async (req, res) => {
  const pedidoId = Number(req.params.id);
  const { status } = req.body;

  if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
    return res.status(400).json({ erro: 'ID do pedido invalido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pedidoRes = await client.query(
      'SELECT id, status FROM pedidos WHERE id = $1 FOR UPDATE',
      [pedidoId]
    );
    const pedido = pedidoRes.rows[0];

    if (!pedido) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Pedido nao encontrado.' });
    }

    const transicao = validarTransicaoStatus(pedido.status, status);
    if (!transicao.valido) {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: transicao.erro });
    }

    // Se recusado, devolve os itens ao estoque
    if (status === 'RECUSADO') {
      const itensRes = await client.query(
        'SELECT item_id, quantidade FROM pedido_itens WHERE pedido_id = $1 ORDER BY item_id ASC',
        [pedidoId]
      );
      for (const row of itensRes.rows) {
        await client.query(
          'UPDATE itens_cardapio SET estoque = estoque + $1 WHERE id = $2',
          [row.quantidade, row.item_id]
        );
      }
    }

    const updateRes = await client.query(
      'UPDATE pedidos SET status = $1 WHERE id = $2 RETURNING id, aluno_nome, turma, valor_total, status',
      [status, pedidoId]
    );

    await client.query('COMMIT');
    res.json({
      mensagem: `Pedido #${pedidoId} atualizado para ${status}.`,
      pedido: updateRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ERRO] Falha ao atualizar status do pedido:', err.message);
    res.status(500).json({ erro: 'Erro interno ao atualizar status do pedido.' });
  } finally {
    client.release();
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[INFO] EstuLanches v${APP_VERSION} rodando em producao na porta ${PORT}`);
});