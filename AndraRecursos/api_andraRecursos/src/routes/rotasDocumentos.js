import express, { Router } from "express";
import { BD } from "../../db.js";

const router = Router();

// GET - Listar todos os documentos
router.get("/documentos", async (req, res) => {
  try {
    const comando = `SELECT d.id_documento, d.nome_arquivo, d.caminho, d.tipo,
            s.titulo AS titulo_solicitacao
            FROM documentos d
            LEFT JOIN solicitacoes s ON d.id_solicitacao = s.id_solicitacoes`;

    //Cria uma variável para receber o retorno do SQL
    const documentos = await BD.query(comando);

    //Retorno para a pagina, o json com os dados buscados do SQL
    res.status(200).json(documentos.rows);
  } 
  catch (error) {
    console.error(" Erro ao listar documentos ", error.message);
    res
      .status(500)
      .json({ error: "Erro ao listar documentos " + error.message });
  }
});

// GET - Buscar docuemnto por tipo
router.get('/documentos/tipo', async (req, res) => {

    const { tipo } = req.query;

    try {
        if (!tipo) {
            return res.status(400).json({ message: 'Informe o tipo do documento' });
        }

        const comando = `
            SELECT d.id_documento, d.nome_arquivo, d.caminho, d.tipo,
            s.titulo AS titulo_solicitacao
            FROM documentos d
            LEFT JOIN solicitacoes s ON d.id_solicitacao = s.id_solicitacoes
            WHERE d.tipo = $1
        `;

        const documentos = await BD.query(comando, [tipo]);

        res.status(200).json(documentos.rows);
    }
    catch (error) {
        console.error(' ❌ ERRO AO LISTAR DOCUMENTOS ❌ ', error.message);
        res.status(500).json({ error: '❌ ERRO AO LISTAR DOCUMENTOS ❌' + error.message });
    }
});

// GET - Buscar documnto por solicitação
router.get('/documentos/solicitacao/:id_solicitacoes', async (req, res) => {

    const { id_solicitacoes } = req.params;

    try {
        const comando = `
            SELECT d.id_documento, d.nome_arquivo, d.caminho, d.tipo,
            s.titulo AS titulo_solicitacao
            FROM documentos d
            LEFT JOIN solicitacoes s ON d.id_solicitacao = s.id_solicitacoes
            WHERE d.id_solicitacao = $1
        `;

        const documentos = await BD.query(comando, [id_solicitacoes]);

        res.status(200).json(documentos.rows);
    }
    catch (error) {
        console.error(' ❌ ERRO AO LISTAR DOCUMENTOS ❌ ', error.message);
        res.status(500).json({ error: '❌ ERRO AO LISTAR DOCUMENTOS ❌' + error.message });
    }
});

// POST - Cadastrar novo documento
router.post("/documentos", async (req, res) => {
  const { nome_arquivo, caminho, tipo, id_solicitacao } = req.body;

  try {
    const comando = `INSERT INTO documentos( nome_arquivo, caminho, tipo, id_solicitacao ) 
            VALUES($1, $2, $3, $4)`;

    const valores = [nome_arquivo, caminho, tipo, id_solicitacao];

    await BD.query(comando, valores);
    console.log(comando, valores);

    return res.status(201).json("Documento cadastrado");
  } catch (error) {
    console.error("Erro ao cadastrar documento", error.message);
    return res.status(500).json({ error: "Erro ao cadastrar documento" });
  }
});

// DELETE - Deletar documento
router.delete("/documentos/:id_documento", async (req, res) => {
  //Id recebido via parametro
  const { id_documento } = req.params;

  try {
    const comando = `DELETE FROM documentos WHERE id_documento = $1`;
    
    await BD.query(comando, [id_documento]);
    return res.status(200).json({ message: " Documento excluido com sucesso" });
  } 
  catch (error) {
    console.error("Erro ao excluir documento", error.message);
    return res
      .status(500)
      .json({ message: "Erro interno no servidor" + error.message });
  }
});

export default router;
