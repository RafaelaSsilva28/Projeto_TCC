import { Router } from "express";
import { BD } from "../../db.js";
import jwt from "jsonwebtoken";
import { autenticarToken } from "../middlewares/autenticacao.js";

const router = Router();
const SECRET_KEY = "minha_chave_secreta";

//Rotas com o total de solicitações
router.get("/dashboard/total/solicitacoes", autenticarToken, async (req, res) => {
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
router.get("/dashboard/solicitacoes/pendentes", autenticarToken, async (req, res) => {
    try {
        const selecaoSolicitacoesPendentes = `
            SELECT COUNT(*) AS pendentes FROM solicitacoes
            WHERE status = 'em andamento'
        `;

        const resSolicitacoesPendentes = await BD.query(selecaoSolicitacoesPendentes);

        return res.status(200).json(resSolicitacoesPendentes.rows[0]);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


//Rotas com as solicitações aprovadas
router.get("/dashboard/solicitacoes/aprovadas", autenticarToken, async (req, res) => {
    try {
        const selecaoSolicitacoesAprovadas = ` SELECT COUNT(*) AS aprovadas FROM solicitacoes
        WHERE status = 'concluida' `;

            const resSolicitacoesAprovadas = await BD.query(selecaoSolicitacoesAprovadas);
            return res.status(200).json(resSolicitacoesAprovadas.rows[0]);
        } catch (error) {
        return res.status(500).json({ error: error.message });
        }
});

//Rotas com as solicitações recusadas
router.get("/dashboard/solicitacoes/recusadas", autenticarToken, async (req, res) => {
    try {
    const selecaoSolicitacoesRecusadas = ` SELECT COUNT(*) AS recusadas FROM solicitacoes
    WHERE status = 'recusada' `;

    const resSolicitacoesRecusadas = await BD.query(selecaoSolicitacoesRecusadas);
    return res.status(200).json(resSolicitacoesRecusadas.rows[0]);

    } catch (error) {
    return res.status(500).json({ error: error.message });
    }
});

//Rotas para solicitações recentes
// router.get("/dashboard/solicitacoes/recentes", async (req, res) => {
//     try {
//         const selecaoSolicitacoesRecentes = `
//             SELECT id_solicitacoes, titulo, descricao,
//             prioridade, status, data_pedido, id_instituicao
//             FROM solicitacoes
//             ORDER BY data_pedido DESC 
//             LIMIT 3
//         `;

//         const resSolicitacoesRecentes = await BD.query(selecaoSolicitacoesRecentes);

//         return res.status(200).json(resSolicitacoesRecentes.rows);

//     } catch (error) {
//         return res.status(500).json({ error: error.message });
//     }
// });

router.get("/dashboard/solicitacoes/recentes", autenticarToken, async (req, res) => {
    try {
        const selecaoSolicitacoesRecentes = `
            SELECT 
                s.id_solicitacoes, 
                s.titulo, 
                s.descricao,
                s.prioridade, 
                s.status, 
                s.data_pedido, 
                s.id_instituicao,
                i.nome AS nome_instituicao
            FROM solicitacoes s
            LEFT JOIN instituicoes i 
                ON s.id_instituicao = i.id_instituicao
            ORDER BY s.data_pedido DESC 
            LIMIT 3
        `;

        const resSolicitacoesRecentes = await BD.query(selecaoSolicitacoesRecentes);

        return res.status(200).json(resSolicitacoesRecentes.rows);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

export default router;
