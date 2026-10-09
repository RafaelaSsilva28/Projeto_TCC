
import { Router } from "express";
import { BD } from "../../db.js";

import {
  autenticarToken,
  autenticarAdministrador,
} from "../middlewares/Autenticacao.js";

const router = Router();

function idValido(valor) {
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0;
}

// GET - Listar respostas
router.get(
  "/respostas-adm",
  autenticarToken,
  autenticarAdministrador,
  async (req, res) => {
    try {
      const resultado = await BD.query(`
        SELECT
          id_resposta,
          mensagem,
          data_resposta,
          id_solicitacao,
          id_administrador
        FROM respostas_adm
        ORDER BY data_resposta DESC NULLS LAST,
                 id_resposta DESC
      `);

      return res.status(200).json(resultado.rows);
    } catch (error) {
      console.error("Erro ao listar respostas:", error.message);

      return res.status(500).json({
        error: "Erro ao listar respostas do administrador.",
      });
    }
  }
);

// GET - Respostas de uma solicitação
router.get(
  "/respostas-adm/solicitacao/:id_solicitacao",
  autenticarToken,
  autenticarAdministrador,
  async (req, res) => {
    const id = Number(req.params.id_solicitacao);

    if (!idValido(id)) {
      return res.status(400).json({
        error: "ID da solicitação inválido.",
      });
    }

    try {
      const resultado = await BD.query(
        `
          SELECT
            id_resposta,
            mensagem,
            data_resposta,
            id_solicitacao,
            id_administrador
          FROM respostas_adm
          WHERE id_solicitacao = $1
          ORDER BY data_resposta ASC NULLS LAST,
                   id_resposta ASC
        `,
        [id]
      );

      return res.status(200).json(resultado.rows);
    } catch (error) {
      console.error("Erro ao buscar respostas:", error.message);

      return res.status(500).json({
        error: "Erro ao buscar respostas da solicitação.",
      });
    }
  }
);

// POST - Enviar mensagem do administrador
router.post(
  "/respostas-adm",
  autenticarToken,
  autenticarAdministrador,
  async (req, res) => {
    const idSolicitacao = Number(req.body.id_solicitacao);
    const idAdministrador = Number(
      req.usuario?.id_administrador
    );
    const mensagem = String(req.body.mensagem ?? "").trim();

    if (!idValido(idSolicitacao)) {
      return res.status(400).json({
        error: "Selecione uma solicitação válida.",
      });
    }

    if (!idValido(idAdministrador)) {
      return res.status(403).json({
        error: "Administrador não identificado no token.",
      });
    }

    if (!mensagem || mensagem.length > 2000) {
      return res.status(400).json({
        error: "A mensagem deve ter entre 1 e 2000 caracteres.",
      });
    }

    try {
      const solicitacao = await BD.query(
        `
          SELECT id_solicitacoes
          FROM solicitacoes
          WHERE id_solicitacoes = $1
        `,
        [idSolicitacao]
      );

      if (solicitacao.rows.length === 0) {
        return res.status(404).json({
          error: "Solicitação não encontrada.",
        });
      }

      const resultado = await BD.query(
        `
          INSERT INTO respostas_adm (
            mensagem,
            data_resposta,
            id_solicitacao,
            id_administrador
          )
          VALUES ($1, CURRENT_TIMESTAMP, $2, $3)
          RETURNING
            id_resposta,
            mensagem,
            data_resposta,
            id_solicitacao,
            id_administrador
        `,
        [mensagem, idSolicitacao, idAdministrador]
      );

      return res.status(201).json({
        message: "Mensagem enviada com sucesso!",
        resposta: resultado.rows[0],
      });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error.message);

      return res.status(500).json({
        error: "Erro ao registrar mensagem no banco.",
      });
    }
  }
);

// PUT - Editar resposta
router.put(
  "/respostas-adm/:id_resposta",
  autenticarToken,
  autenticarAdministrador,
  async (req, res) => {
    const id = Number(req.params.id_resposta);
    const mensagem = String(req.body.mensagem ?? "").trim();

    if (!idValido(id) || !mensagem || mensagem.length > 2000) {
      return res.status(400).json({
        error: "Dados da resposta inválidos.",
      });
    }

    try {
      const resultado = await BD.query(
        `
          UPDATE respostas_adm
          SET mensagem = $1
          WHERE id_resposta = $2
          RETURNING *
        `,
        [mensagem, id]
      );

      if (!resultado.rows.length) {
        return res.status(404).json({
          error: "Resposta não encontrada.",
        });
      }

      return res.status(200).json({
        message: "Resposta atualizada com sucesso.",
        resposta: resultado.rows[0],
      });
    } catch (error) {
      console.error("Erro ao editar resposta:", error.message);

      return res.status(500).json({
        error: "Erro ao atualizar resposta.",
      });
    }
  }
);

// DELETE - Excluir resposta
router.delete(
  "/respostas-adm/:id_resposta",
  autenticarToken,
  autenticarAdministrador,
  async (req, res) => {
    const id = Number(req.params.id_resposta);

    if (!idValido(id)) {
      return res.status(400).json({
        error: "ID da resposta inválido.",
      });
    }

    try {
      const resultado = await BD.query(
        `
          DELETE FROM respostas_adm
          WHERE id_resposta = $1
          RETURNING id_resposta
        `,
        [id]
      );

      if (!resultado.rows.length) {
        return res.status(404).json({
          error: "Resposta não encontrada.",
        });
      }

      return res.status(200).json({
        message: "Resposta excluída com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao excluir resposta:", error.message);

      return res.status(500).json({
        error: "Erro ao excluir resposta.",
      });
    }
  }
);

export default router;
