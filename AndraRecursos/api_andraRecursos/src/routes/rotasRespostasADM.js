
import { Router } from "express";
import { BD } from "../../db.js";

import {
  autenticarToken,
  autenticarAdministrador,
  autenticarInstituicao,
  exigirCadastroCompleto,
} from "../middlewares/Autenticacao.js";

const router = Router();

// ============================================
// VALIDAÇÃO DE ID
// ============================================

function idValido(valor) {
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0;
}

// ============================================
// AUTORIZAÇÃO PARA CONSULTAR UMA SOLICITAÇÃO
// Administrador: acesso administrativo.
// Instituição: acesso somente às próprias solicitações.
// ============================================

function autenticarAdministradorOuInstituicao(req, res, next) {
  // O token administrativo já é utilizado pelo POST existente,
  // que identifica o administrador por id_administrador.
  if (idValido(req.usuario?.id_administrador)) {
    return autenticarAdministrador(req, res, next);
  }

  return autenticarInstituicao(req, res, (erro) => {
    if (erro) {
      return next(erro);
    }

    return exigirCadastroCompleto(req, res, next);
  });
}

// ============================================
// GET - LISTAR TODAS AS RESPOSTAS
// Exclusivo do administrador.
// ============================================

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
        ORDER BY
          data_resposta ASC NULLS LAST,
          id_resposta ASC
      `);

      return res.status(200).json(resultado.rows);
    } catch (error) {
      console.error(
        "Erro ao listar respostas do administrador:",
        error.message
      );

      return res.status(500).json({
        error: "Erro ao listar respostas do administrador.",
      });
    }
  }
);

// ============================================
// GET - RESPOSTAS DE UMA SOLICITAÇÃO
// Administrador: pode consultar normalmente.
// Instituição: somente suas próprias solicitações.
// ============================================

router.get(
  "/respostas-adm/solicitacao/:id_solicitacao",
  autenticarToken,
  autenticarAdministradorOuInstituicao,
  async (req, res) => {
    const idSolicitacao = Number(req.params.id_solicitacao);

    if (!idValido(idSolicitacao)) {
      return res.status(400).json({
        error: "ID da solicitação inválido.",
      });
    }

    try {
      let resultado;

      if (idValido(req.instituicao?.id_instituicao)) {
        // A instituição só recebe respostas de uma solicitação
        // que pertença à própria instituição.
        resultado = await BD.query(
          `
            SELECT
              ra.id_resposta,
              ra.mensagem,
              ra.data_resposta,
              ra.id_solicitacao,
              ra.id_administrador
            FROM respostas_adm ra
            INNER JOIN solicitacoes s
              ON s.id_solicitacoes = ra.id_solicitacao
            WHERE ra.id_solicitacao = $1
              AND s.id_instituicao = $2
            ORDER BY
              ra.data_resposta ASC NULLS LAST,
              ra.id_resposta ASC
          `,
          [idSolicitacao, req.instituicao.id_instituicao]
        );
      } else {
        // O administrador mantém a consulta por solicitação.
        resultado = await BD.query(
          `
            SELECT
              id_resposta,
              mensagem,
              data_resposta,
              id_solicitacao,
              id_administrador
            FROM respostas_adm
            WHERE id_solicitacao = $1
            ORDER BY
              data_resposta ASC NULLS LAST,
              id_resposta ASC
          `,
          [idSolicitacao]
        );
      }

      return res.status(200).json(resultado.rows);
    } catch (error) {
      console.error(
        "Erro ao buscar respostas da solicitação:",
        error.message
      );

      return res.status(500).json({
        error: "Erro ao buscar respostas da solicitação.",
      });
    }
  }
);

// ============================================
// POST - ENVIAR RESPOSTA DO ADMINISTRADOR
// Exclusivo do administrador.
// ============================================

router.post(
  "/respostas-adm",
  autenticarToken,
  autenticarAdministrador,
  async (req, res) => {
    const idSolicitacao = Number(req.body.id_solicitacao);
    const idAdministrador = Number(req.usuario?.id_administrador);
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

// ============================================
// PUT - EDITAR RESPOSTA
// Exclusivo do administrador.
// ============================================

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
          RETURNING
            id_resposta,
            mensagem,
            data_resposta,
            id_solicitacao,
            id_administrador
        `,
        [mensagem, id]
      );

      if (resultado.rows.length === 0) {
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

// ============================================
// DELETE - EXCLUIR RESPOSTA
// Exclusivo do administrador.
// ============================================

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

      if (resultado.rows.length === 0) {
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
