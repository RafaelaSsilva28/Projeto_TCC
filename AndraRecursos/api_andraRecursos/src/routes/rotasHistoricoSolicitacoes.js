
import { Router } from "express";
import { BD } from "../../db.js";

import {
  autenticarToken,
  autenticarInstituicao,
} from "../middlewares/Autenticacao.js";

const router = Router();

// ============================================
// GET - HISTÓRICO DE SOLICITAÇÕES DA INSTITUIÇÃO
// ============================================
// Retorna todas as movimentações das solicitações
// da instituição logada.
//
// Também inclui solicitações que ainda não possuem
// registros na tabela historico_solicitacoes.
// ============================================

router.get(
  "/historico-instituicao",
  autenticarToken,
  autenticarInstituicao,
  async (req, res) => {
    try {
      const id_instituicao =
        req.instituicao?.id_instituicao;

      if (!id_instituicao) {
        return res.status(401).json({
          mensagem: "Instituição não identificada na sessão.",
        });
      }

      const comando = `
        SELECT
          h.id_historico,
          s.id_solicitacoes AS id_solicitacao,

          COALESCE(
            h.descricao,
            ''
          ) AS descricao,

          COALESCE(
            h.status,
            s.status,
            'Pendente'
          ) AS status,

          COALESCE(
            h.prioridade,
            s.prioridade,
            'Não informada'
          ) AS prioridade,

          TO_CHAR(
            COALESCE(
              h.data_alteracao,
              s.data_pedido
            ),
            'DD/MM/YYYY'
          ) AS data_alteracao,

          s.titulo AS titulo_solicitacao

        FROM solicitacoes s

        LEFT JOIN historico_solicitacoes h
          ON h.id_solicitacao = s.id_solicitacoes

        WHERE s.id_instituicao = $1

        ORDER BY
          COALESCE(
            h.data_alteracao,
            s.data_pedido
          ) DESC NULLS LAST,

          h.id_historico DESC NULLS LAST,

          s.id_solicitacoes DESC
      `;

      const resultado = await BD.query(
        comando,
        [id_instituicao]
      );

      return res.status(200).json(resultado.rows);
    } catch (error) {
      console.error(
        "Erro ao listar histórico da instituição:",
        error
      );

      return res.status(500).json({
        mensagem: "Erro ao listar histórico da instituição.",
      });
    }
  }
);

export default router;
