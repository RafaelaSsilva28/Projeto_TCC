INSERT INTO administradores (nome, email, senha) VALUES
('João Silva', 'joao@admin.com', 'hash_senha_123'),
('Maria Souza', 'maria@admin.com', 'hash_senha_456');

INSERT INTO instituicoes (
nome, email_institucional, senha, cep, telefone, horario_funcionamento,
status_instituicao, gestor, secretaria_vinculada, numero, logradouro, bairro
) VALUES
('Escola Central', 'contato@escola.com', 'hash_senha_inst1', '18650-000',
'(14)99999-1111', '08:00 - 17:00', 'ativa', 'Carlos Mendes',
'Educação', '123', 'Rua das Flores', 'Centro'),

('Creche Pequeno Futuro', 'creche@futuro.com', 'hash_senha_inst2', '18650-100',
'(14)98888-2222', '07:00 - 18:00', 'ativa', 'Ana Lima',
'Assistência Social', '45', 'Av. Brasil', 'Jardim Novo');

INSERT INTO solicitacoes (
titulo, descricao, prioridade, setor, status, id_instituicao
) VALUES
('Manutenção de computadores', 'Computadores do laboratório não ligam',
'alta', 'TI', 'pendente', 1),

('Falta de material escolar', 'Necessidade de cadernos e lápis',
'media', 'Almoxarifado', 'em andamento', 2);

INSERT INTO respostas_adm (
mensagem, id_solicitacao, id_administrador
) VALUES
('Solicitação recebida, equipe será enviada.', 1, 1),
('Material já está sendo providenciado.', 2, 2);

INSERT INTO notificacoes (
mensagem, tipo_informacao, id_administrador
) VALUES
('Nova solicitação recebida', 'alerta', 1),
('Solicitação atualizada', 'informacao', 2);

INSERT INTO documentos (
nome_arquivo, caminho, tipo, id_solicitacao
) VALUES
('relatorio_tecnico.pdf', '/uploads/relatorio1.pdf', 'pdf', 1),
('foto_material.jpg', '/uploads/foto1.jpg', 'imagem', 2);

INSERT INTO historico_solicitacoes (
id_solicitacao, descricao, status, prioridade
) VALUES
(1, 'Solicitação criada', 'pendente', 'alta'),
(1, 'Encaminhada para equipe de TI', 'em andamento', 'alta'),

(2, 'Solicitação criada', 'pendente', 'media'),
(2, 'Pedido em análise', 'em andamento', 'media');