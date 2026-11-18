CREATE TABLE IF NOT EXISTS itens_cardapio (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    preco NUMERIC(10, 2) NOT NULL CHECK (preco >= 0),
    estoque INT NOT NULL DEFAULT 0 CHECK (estoque >= 0),
    disponivel BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    aluno_nome VARCHAR(100) NOT NULL,
    turma VARCHAR(30) NOT NULL,
    valor_total NUMERIC(10, 2) NOT NULL CHECK (valor_total >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedido_itens (
    id SERIAL PRIMARY KEY,
    pedido_id INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES itens_cardapio(id),
    quantidade INT NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(10, 2) NOT NULL CHECK (preco_unitario >= 0)
);

INSERT INTO itens_cardapio (nome, categoria, preco, estoque, disponivel) VALUES
    ('Coxinha de Frango Assada', 'Salgados', 6.50, 40, TRUE),
    ('Pao de Queijo Integral', 'Salgados', 4.50, 50, TRUE),
    ('Sanduiche Natural de Peru', 'Lanches', 9.00, 25, TRUE),
    ('Suco Natural de Laranja 300ml', 'Bebidas', 5.50, 35, TRUE),
    ('Salada de Frutas', 'Sobremesas', 7.00, 20, TRUE),
    ('Hamburgão', 'Lanches', 15.00, 60, TRUE);