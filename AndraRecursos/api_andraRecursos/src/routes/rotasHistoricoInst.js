import { Router } from "express";
import { BD } from "../../db.js";
import {
  autenticarToken,
  autenticarInstituicao,
} from "../middlewares/Autenticacao.js";

const router = Router();

// GET - Listar todas as solicitações da instituição logada
router.get(
  "/historico-instituicao",
  autenticarToken,
  autenticarInstituicao,
  async (req, res) => {
    try {
      const id_instituicao = req.instituicao.id_instituicao;

      const comando = `
        SELECT
          h.id_historico,
          s.id_solicitacoes AS id_solicitacao,
          COALESCE(
            h.descricao,
            s.descricao,
            ''
          ) AS descricao,
          COALESCE(
            h.status,
            s.status::text,
            'Pendente'
          ) AS status,
          COALESCE(
            h.prioridade,
            s.prioridade::text,
            'Não informada'
          ) AS prioridade,
          TO_CHAR(
            COALESCE(h.data_alteracao, s.data_solicitacao),
            'DD/MM/YYYY'
          ) AS data_alteracao,
          s.titulo AS titulo_solicitacao
        FROM solicitacoes s
        LEFT JOIN historico_solicitacoes h
          ON h.id_solicitacao = s.id_solicitacoes
        WHERE s.id_instituicao = $1
        ORDER BY
          COALESCE(h.data_alteracao, s.data_solicitacao) DESC NULLS LAST,
          s.id_solicitacoes DESC
      `;

      const historico = await BD.query(comando, [id_instituicao]);

      return res.status(200).json(historico.rows);
    } catch (error) {
      console.error("Erro ao listar histórico da instituição:", error.message);

      return res.status(500).json({
        error: "Erro ao listar histórico da instituição.",
      });
    }
  },
);

export default router;
