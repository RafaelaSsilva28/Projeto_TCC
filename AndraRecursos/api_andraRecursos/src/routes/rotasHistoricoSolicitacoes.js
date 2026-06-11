import express, { Router } from "express";
import { BD } from "../../db.js";

const router = Router();

// GET - Listar todo o histórico
router.get("/historico-solicitacoes", async (req, res) => {
  try {
    const comando = `
      SELECT 
        h.id_historico,
        h.descricao,
        h.status,
        h.prioridade,
        TO_CHAR(h.data_alteracao, 'DD/MM/YYYY') AS data_alteracao,
        s.titulo AS titulo_solicitacao
      FROM historico_solicitacoes h
      LEFT JOIN solicitacoes s ON h.id_solicitacao = s.id_solicitacoes
    `;

    //Cria uma variável para receber o retorno do SQL
    const historico = await BD.query(comando);

    //Retorno para a pagina, o json com os dados buscados do SQL
    res.status(200).json(historico.rows);
  } 
  catch (error) {
    console.error(" Erro ao listar histórico ", error.message);
    res
      .status(500)
      .json({ error: "Erro ao listar histórico " + error.message });
  }
});

// GET - Buscar histórico por solicitação
router.get("/historico-solicitacoes/solicitacao/:id_solicitacao", async (req, res) => {
  const { id_solicitacao } = req.params;
  try {
    const query = `
      SELECT * FROM historico_solicitacoes
      WHERE id_solicitacao = $1
      ORDER BY data_alteracao ASC
    `;

    const historico = await BD.query(query, [id_solicitacao]);

    res.status(200).json(historico.rows);

  } catch (error) {
    console.error("Erro ao buscar histórico da solicitação", error.message);
    res.status(500).json({ error: "Erro ao buscar histórico da solicitação" });
  }
});

// POST - Criar novo histórico
router.post("/historico-solicitacoes", async (req, res) => {
  const { id_solicitacao, descricao, status, prioridade } = req.body;

  try {
    const comando = `INSERT INTO historico_solicitacoes( id_solicitacao, descricao, status, prioridade ) 
            VALUES($1, $2, $3, $4)`;

    const valores = [id_solicitacao, descricao, status, prioridade];

    await BD.query(comando, valores);
    console.log(comando, valores);

    return res.status(201).json("Histórico cadastrado");
  } catch (error) {
    console.error("Erro ao cadastrar histórico", error.message);
    return res.status(500).json({ error: "Erro ao cadastrar histórico" });
  }
});

// PUT - Atualizar histórico
router.put("/historico-solicitacoes/:id_historico", async (req, res) => {
  //Id recebido via parametro

  const { id_historico } = req.params;
  //Dados do Usuario via corpo da pagina
  const { id_solicitacao, descricao, status, prioridade } = req.body;

  try {
    //Verificar se o usuario existe
    const verificarHistorico = await BD.query(
      `SELECT * FROM historico_solicitacoes WHERE id_historico = $1`,
      [id_historico],
    );
    if (verificarHistorico.rows.length === 0) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    //Atualiza todos os campos da tabela(PUT substituição completa)
    const comando = `UPDATE historico_solicitacoes SET id_solicitacao = $1, descricao = $2, status = $3, prioridade = $4
      WHERE id_historico = $5`;

    const valores = [
      id_solicitacao,
      descricao,
      status,
      prioridade,
      id_historico,
    ];
    await BD.query(comando, valores);

    return res.status(200).json("Histórico atualizado com sucesso");
  } catch (error) {
    console.error("Erro ao atualizar histórico");
    return res.status(500).json({ error: "Erro ao atualizar histórico" });
  }
});

// DELETE - Deletar histórico
router.delete("/historico-solicitacoes/:id_historico", async (req, res) => {
  //Id recebido via parametro
  const { id_historico } = req.params;

  try {
    const comando = `DELETE FROM historico_solicitacoes WHERE id_historico = $1`;
    // const comando = `DELETE FROM usuarios WHERE id_usuario = $1`
    await BD.query(comando, [id_historico]);
    return res.status(200).json({ message: " excluida com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir histórico", error.message);
    return res
      .status(500)
      .json({ message: "Erro interno no servidor" + error.message });
  }
});

export default router;
