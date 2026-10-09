
import { Router } from "express";
import { BD } from "../../db.js";

import {
  autenticarToken,
  autenticarAdministrador,
} from "../middlewares/Autenticacao.js";

const router = Router();

// =============================================
// GET - LISTAR HISTÓRICO ADMINISTRATIVO
// =============================================
// Retorna a movimentação mais recente
// de cada solicitação.
//
// Inclui:
// - Instituição
// - Título da solicitação
// - Status atual
// - Prioridade
// - Descrição
// - Data da última movimentação

router.get(
  "/historico-solicitacoes",
  autenticarToken,
  autenticarAdministrador,
  async (req, res) => {
    try {
      const comando = `
        SELECT *
        FROM (
          SELECT DISTINCT ON (s.id_solicitacoes)
            h.id_historico,
            h.id_solicitacao,
            h.descricao,
            h.prioridade,
            h.data_alteracao,

            TO_CHAR(
              h.data_alteracao,
              'DD/MM/YYYY'
            ) AS data_formatada,

            s.titulo AS titulo_solicitacao,
            s.status AS status,
            i.nome AS nome_instituicao

          FROM historico_solicitacoes h

          INNER JOIN solicitacoes s
            ON h.id_solicitacao = s.id_solicitacoes

          LEFT JOIN instituicoes i
            ON s.id_instituicao = i.id_instituicao

          ORDER BY
            s.id_solicitacoes,
            h.data_alteracao DESC NULLS LAST,
            h.id_historico DESC
        ) AS ultimos_historicos

        ORDER BY
          data_alteracao DESC NULLS LAST,
          id_historico DESC
      `;

      const resultado = await BD.query(comando);

      return res.status(200).json(resultado.rows);

    } catch (error) {
      console.error(
        "Erro ao listar histórico:",
        error.message
      );

      return res.status(500).json({
        error: "Erro ao listar histórico.",
      });
    }
  }
);

// =============================================
// GET - HISTÓRICO DE UMA SOLICITAÇÃO
// =============================================
// Retorna todas as movimentações associadas
// a uma solicitação específica.
//
// Disponível para administradores.
// O controle de acesso institucional a um
// histórico próprio deve ser implementado
// separadamente.

router.get(
  "/historico-solicitacoes/solicitacao/:id_solicitacao",
  autenticarToken,
  autenticarAdministrador,
  async (req, res) => {
    const { id_solicitacao } = req.params;

    if (
      !Number.isInteger(Number(id_solicitacao)) ||
      Number(id_solicitacao) <= 0
    ) {
      return res.status(400).json({
        error: "ID da solicitação inválido.",
      });
    }

    try {
      const comando = `
        SELECT
          h.id_historico,
          h.id_solicitacao,
          h.descricao,
          h.status,
          h.prioridade,
          h.data_alteracao,

          TO_CHAR(
            h.data_alteracao,
            'DD/MM/YYYY'
          ) AS data_formatada

        FROM historico_solicitacoes h

        WHERE h.id_solicitacao = $1

        ORDER BY
          h.data_alteracao ASC NULLS LAST,
          h.id_historico ASC
      `;

      const resultado = await BD.query(
        comando,
        [id_solicitacao]
      );

      return res.status(200).json(resultado.rows);

    } catch (error) {
      console.error(
        "Erro ao buscar histórico da solicitação:",
        error.message
      );

      return res.status(500).json({
        error: "Erro ao buscar histórico da solicitação.",
      });
    }
  }
);

// =============================================
// POST - CADASTRAR HISTÓRICO
// =============================================

router.post(
  "/historico-solicitacoes",
  autenticarToken,
  autenticarAdministrador,
  async (req, res) => {
    const {
      id_solicitacao,
      descricao,
      status,
      prioridade,
    } = req.body;

    if (
      !Number.isInteger(Number(id_solicitacao)) ||
      Number(id_solicitacao) <= 0 ||
      typeof descricao !== "string" ||
      !descricao.trim() ||
      typeof status !== "string" ||
      !status.trim() ||
      typeof prioridade !== "string" ||
      !prioridade.trim()
    ) {
      return res.status(400).json({
        error: "Preencha todos os campos corretamente.",
      });
    }

    try {
      const verificarSolicitacao = await BD.query(
        `
          SELECT id_solicitacoes
          FROM solicitacoes
          WHERE id_solicitacoes = $1
        `,
        [id_solicitacao]
      );

      if (verificarSolicitacao.rows.length === 0) {
        return res.status(404).json({
          error: "Solicitação não encontrada.",
        });
      }

      const comando = `
        INSERT INTO historico_solicitacoes (
          id_solicitacao,
          descricao,
          status,
          prioridade
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const valores = [
        id_solicitacao,
        descricao.trim(),
        status.trim(),
        prioridade.trim(),
      ];

      const resultado = await BD.query(
        comando,
        valores
      );

      return res.status(201).json({
        message: "Histórico cadastrado com sucesso.",
        historico: resultado.rows[0],
      });

    } catch (error) {
      console.error(
        "Erro ao cadastrar histórico:",
        error.message
      );

      return res.status(500).json({
        error: "Erro ao cadastrar histórico.",
      });
    }
  }
);

// =============================================
// PUT - ATUALIZAR HISTÓRICO
// =============================================

router.put(
  "/historico-solicitacoes/:id_historico",
  autenticarToken,
  autenticarAdministrador,
  async (req, res) => {
    const { id_historico } = req.params;

    const {
      id_solicitacao,
      descricao,
      status,
      prioridade,
    } = req.body;

    if (
      !Number.isInteger(Number(id_historico)) ||
      Number(id_historico) <= 0 ||
      !Number.isInteger(Number(id_solicitacao)) ||
      Number(id_solicitacao) <= 0 ||
      typeof descricao !== "string" ||
      !descricao.trim() ||
      typeof status !== "string" ||
      !status.trim() ||
      typeof prioridade !== "string" ||
      !prioridade.trim()
    ) {
      return res.status(400).json({
        error: "Dados do histórico inválidos.",
      });
    }

    try {
      const comando = `
        UPDATE historico_solicitacoes

        SET
          id_solicitacao = $1,
          descricao = $2,
          status = $3,
          prioridade = $4

        WHERE id_historico = $5

        RETURNING *
      `;

      const valores = [
        id_solicitacao,
        descricao.trim(),
        status.trim(),
        prioridade.trim(),
        id_historico,
      ];

      const resultado = await BD.query(
        comando,
        valores
      );

      if (resultado.rows.length === 0) {
        return res.status(404).json({
          error: "Histórico não encontrado.",
        });
      }

      return res.status(200).json({
        message: "Histórico atualizado com sucesso.",
        historico: resultado.rows[0],
      });

    } catch (error) {
      console.error(
        "Erro ao atualizar histórico:",
        error.message
      );

      return res.status(500).json({
        error: "Erro ao atualizar histórico.",
      });
    }
  }
);

// =============================================
// DELETE - EXCLUIR HISTÓRICO
// =============================================

router.delete(
  "/historico-solicitacoes/:id_historico",
  autenticarToken,
  autenticarAdministrador,
  async (req, res) => {
    const { id_historico } = req.params;

    if (
      !Number.isInteger(Number(id_historico)) ||
      Number(id_historico) <= 0
    ) {
      return res.status(400).json({
        error: "ID do histórico inválido.",
      });
    }

    try {
      const comando = `
        DELETE FROM historico_solicitacoes

        WHERE id_historico = $1

        RETURNING id_historico
      `;

      const resultado = await BD.query(
        comando,
        [id_historico]
      );

      if (resultado.rows.length === 0) {
        return res.status(404).json({
          error: "Histórico não encontrado.",
        });
      }

      return res.status(200).json({
        message: "Histórico excluído com sucesso.",
      });

    } catch (error) {
      console.error(
        "Erro ao excluir histórico:",
        error.message
      );

      return res.status(500).json({
        error: "Erro ao excluir histórico.",
      });
    }
  }
);

export default router;
