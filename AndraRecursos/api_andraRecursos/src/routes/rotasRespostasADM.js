import express, { Router } from "express";
import { BD } from "../../db.js";

const router = Router();

//Criando o endpoint para listar todos as respostas
router.get("/respostas-adm", async (req, res) => {
  try {
    const query = `SELECT * FROM respostas_adm ORDER BY id_resposta `;

    //Cria uma variável para receber o retorno do SQL
    const respostas_adm = await BD.query(query);

    //Retorno para a pagina, o json com os dados buscados do SQL
    res.status(200).json(respostas_adm.rows);
  } 
  catch (error) {
    console.error(" Erro ao listar Respostas do ADM ", error.message);
    res.status(500).json({ error: "Erro ao listar Respostas do ADM " });
  }
});

//Criando o endpoint para criar novas respostas
router.post("/respostas-adm", async (req, res) => {
  const { mensagem, id_solicitacao, id_administrador } = req.body;

  try {
    const comando = `INSERT INTO respostas_adm(mensagem, data_resposta, id_solicitacao, id_administrador) VALUES($1, $2, $3, $4)`;
    const valores = [mensagem, id_solicitacao, data_resposta, id_administrador];

    await BD.query(comando, valores);
    console.log(comando, valores);

    return res.status(201).json("Resposta cadastrada");
  } 
  catch (error) {
    console.error("Erro ao cadastrar resposta", error.message);
    return res.status(500).json({ error: "Erro ao cadastrar resposta" });
  }
});

//Criando o endpoint para atualizar as respostas
router.put("/resposta-adm/:id_resposta", async (req, res) => {
  //Id recebido via parametro
  const { id_resposta } = req.params;
  //Dados do Usuario via corpo da pagina
  const { mensagem, data_resposta, id_solicitacao, id_administrador } = req.body;

  try {
    //Verificar se o usuario existe
    const verificarResposta = await BD.query(
      `SELECT * FROM resposta_adm WHERE id_resposta = $1`,
      [id_resposta],
    );
    if (verificarResposta.rows.length === 0) {
      return res.status(404).json({ message: "Resposta não encontrada" });
    }

    //Atualiza todos os campos da tabela(PUT substituição completa)
    const comando = `UPDATE resposta_adm SET mensagem = $1, id_solicitacao = $2, id_administrador = $3 WHERE id_resposta = $4`;
    const valores = [mensagem, id_solicitacao, id_administrador, id_resposta];
    await BD.query(comando, valores);

    return res.status(200).json("Resposta atualizada com sucesso");
  } 
  catch (error) {
    console.error("Erro ao atualizar resposta");
    return res.status(500).json({ error: "Erro ao atualizar respostas" });
  }
});

//Rota para DELETE
router.delete("/resposta-adm/:id_resposta", async (req, res) => {
    
  //Id recebido via parametro
  const { id_resposta } = req.params;

  try {
    const comando = `DELETE FROM respostas_adm WHERE id_resposta = $1`;

    await BD.query(comando, [id_resposta]);
    return res.status(200).json({ message: "Resposta excluída com sucesso" });
  } 
  catch (error) {
    console.error("Erro ao excluir Resposta", error.message);
    return res.status(500).json({ message: "Erro interno no servidor" + error.message });
  }
});

export default router;
