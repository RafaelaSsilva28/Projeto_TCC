CREATE TABLE administradores (
id_administrador SERIAL PRIMARY KEY,
nome VARCHAR(100) NOT NULL,
email VARCHAR(150) NOT NULL UNIQUE,
senha TEXT NOT NULL
);
CREATE TABLE instituicoes (
id_instituicao SERIAL PRIMARY KEY,
nome VARCHAR(200) NOT NULL,
email_institucional VARCHAR(150) UNIQUE,
senha TEXT NOT NULL,
cep VARCHAR(20) NOT NULL,
telefone VARCHAR(25),
horario_funcionamento VARCHAR(100),
status_instituicao VARCHAR(30),
gestor VARCHAR(100),
secretaria_vinculada VARCHAR(100),
numero VARCHAR(10),
logradouro VARCHAR(150),
bairro VARCHAR(200)
);
CREATE TABLE solicitacoes (
id_solicitacoes SERIAL PRIMARY KEY,
titulo VARCHAR(100) NOT NULL,
descricao TEXT,
prioridade VARCHAR(20),
setor VARCHAR(100),
status VARCHAR(30),
data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
id_instituicao INTEGER,
FOREIGN KEY (id_instituicao)
REFERENCES instituicoes(id_instituicao)
ON DELETE CASCADE
);
CREATE TABLE respostas_adm (
id_resposta SERIAL PRIMARY KEY,
mensagem TEXT NOT NULL,
data_resposta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
id_solicitacao INTEGER,
id_administrador INTEGER,
FOREIGN KEY (id_solicitacao)
REFERENCES solicitacoes(id_solicitacoes)
ON DELETE CASCADE,
FOREIGN KEY (id_administrador)
REFERENCES administradores(id_administrador)
);
CREATE TABLE notificacoes (
id_notificacao SERIAL PRIMARY KEY,
mensagem TEXT NOT NULL,
tipo_informacao VARCHAR(50) NOT NULL,
id_administrador INTEGER,
FOREIGN KEY (id_administrador)
REFERENCES administradores(id_administrador)
);
CREATE TABLE documentos (
id_documento SERIAL PRIMARY KEY,
nome_arquivo VARCHAR(255) NOT NULL,
caminho VARCHAR(500) NOT NULL,
tipo VARCHAR(50),
id_solicitacao INTEGER,
FOREIGN KEY (id_solicitacao)
REFERENCES solicitacoes(id_solicitacoes)
ON DELETE CASCADE
);
CREATE TABLE historico_solicitacoes (
id_historico SERIAL PRIMARY KEY,
id_solicitacao INTEGER NOT NULL,
descricao TEXT,
status VARCHAR(30),
prioridade VARCHAR(20),
data_alteracao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (id_solicitacao)
REFERENCES solicitacoes(id_solicitacoes)
ON DELETE CASCADE
);
UPDATE administradores 
SET senha = '$2b$10$n8gQh2LhWj7r/bF3C.hOLeMByy8S6lshOqGZcZgR9bK87.yO8PAn6' 
WHERE email IN ('joao@admin.com', 'maria@admin.com');

INSERT INTO administradores (nome, email, senha) 
VALUES (
'Administrador Geral', 
'admin@email.com', 
'$2b$10$n8gQh2LhWj7r/bF3C.hOLeMByy8S6lshOqGZcZgR9bK87.yO8PAn6'
);
ALTER TABLE administradores
ADD COLUMN tipo_acesso VARCHAR(30) NOT NULL DEFAULT 'Administrador';

ALTER TABLE instituicoes
ADD COLUMN tipo_acesso VARCHAR(30) NOT NULL DEFAULT 'Usuário Institucional';