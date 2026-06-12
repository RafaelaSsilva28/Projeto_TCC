import { Router } from "express";
import { BD } from "../../db.js";
import jwt from "jsonwebtoken";
import { autenticarToken } from "../middlewares/autenticacao.js";

const router = Router();
const SECRET_KEY = "minha_chave_secreta";

//Rotas com o total de solicitações
router.get("/dashboard/total/solicitacoes", async (req, res) => {
    try {
        const selecaoTotalSolicitacoes = `
            SELECT COUNT(*) AS total 
            FROM solicitacoes
        `;

        const resTotalSolicitacoes = await BD.query(selecaoTotalSolicitacoes);

        return res.status(200).json(resTotalSolicitacoes.rows[0]);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

//Rotas com as solicitações ainda pendentes
router.get("/dashboard/solicitacoes/pendentes", async (req, res) => {
    try {
        const selecaoSolicitacoesPendentes = `
            SELECT COUNT(*) AS pendentes FROM solicitacoes
            WHERE status = 'Pendentes'
        `;

        const resSolicitacoesPendentes = await BD.query(selecaoSolicitacoesPendentes);

        return res.status(200).json(resSolicitacoesPendentes.rows[0]);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


//Rotas com as solicitações aprovadas
router.get("/dashboard/solicitacoes/aprovadas", async (req, res) => {
  try {
    const selecaoSolicitacoesAprovadas = ` SELECT COUNT(*) AS aprovadas FROM solicitacoes
    WHERE status = 'Aprovada' `;

        const resSolicitacoesAprovadas = await BD.query(selecaoSolicitacoesAprovadas);
        return res.status(200).json(resSolicitacoesAprovadas.rows[0]);
      } catch (error) {
      return res.status(500).json({ error: error.message });
    }
});

//Rotas com as solicitações recusadas
router.get("/dashboard/solicitacoes/recusadas", async (req, res) => {
    try {
    const selecaoSolicitacoesRecusadas = ` SELECT COUNT(*) AS recusadas FROM solicitacoes
    WHERE status = 'Recusada' `;

      const resSolicitacoesRecusadas = await BD.query(selecaoSolicitacoesRecusadas);
      return res.status(200).json(resSolicitacoesRecusadas.rows[0]);

    } catch (error) {
    return res.status(500).json({ error: error.message });
      }
});

//Rotas para solicitações recentes
router.get("/dashboard/solicitacoes/recentes", async (req, res) => {
    try {
        const selecaoSolicitacoesRecentes = `
            SELECT id_solicitacoes, titulo, descricao,
            prioridade, status, data_pedido, id_instituicao
            FROM solicitacoes
            ORDER BY data_pedido DESC 
            LIMIT 3
        `;

        const resSolicitacoesRecentes = await BD.query(selecaoSolicitacoesRecentes);

        return res.status(200).json(resSolicitacoesRecentes.rows);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

export default router;
