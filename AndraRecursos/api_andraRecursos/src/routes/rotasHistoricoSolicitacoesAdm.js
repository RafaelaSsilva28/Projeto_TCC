
import { Router } from "express";
import { BD } from "../../db.js";

import {
    autenticarToken,
    autenticarAdministrador,
} from "../middlewares/Autenticacao.js";

const router = Router();

// ============================================
// GET - HISTÓRICO ADMINISTRATIVO
// Cada solicitação aparece apenas uma vez,
// com a alteração mais recente registrada.
// ============================================

router.get(
    "/",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        try {
            const comando = `
                SELECT
                    h.id_historico,
                    s.id_solicitacoes AS id_solicitacao,

                    COALESCE(
                        i.nome,
                        'Instituição não informada'
                    ) AS nome_instituicao,

                    COALESCE(
                        s.titulo,
                        'Solicitação sem título'
                    ) AS titulo_solicitacao,

                    COALESCE(
                        h.descricao,
                        s.descricao,
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

                    COALESCE(
                        h.data_alteracao,
                        s.data_pedido
                    ) AS data_alteracao,

                    TO_CHAR(
                        COALESCE(
                            h.data_alteracao,
                            s.data_pedido
                        ),
                        'DD/MM/YYYY'
                    ) AS data_formatada

                FROM solicitacoes s

                LEFT JOIN LATERAL (
                    SELECT
                        hs.id_historico,
                        hs.descricao,
                        hs.status,
                        hs.prioridade,
                        hs.data_alteracao

                    FROM historico_solicitacoes hs

                    WHERE hs.id_solicitacao = s.id_solicitacoes

                    ORDER BY
                        hs.data_alteracao DESC NULLS LAST,
                        hs.id_historico DESC

                    LIMIT 1
                ) h ON TRUE

                LEFT JOIN instituicoes i
                    ON i.id_instituicao = s.id_instituicao

                ORDER BY
                    COALESCE(
                        h.data_alteracao,
                        s.data_pedido
                    ) DESC NULLS LAST,

                    s.id_solicitacoes DESC
            `;

            const resultado = await BD.query(comando);

            return res.status(200).json(resultado.rows);
        } catch (error) {
            console.error(
                "[ERRO HISTÓRICO ADMINISTRATIVO]",
                {
                    mensagem: error.message,
                    codigo: error.code,
                    detalhe: error.detail,
                    dica: error.hint,
                    tabela: error.table,
                    coluna: error.column,
                    caminho: req.originalUrl,
                }
            );

            return res.status(500).json({
                mensagem:
                    "Erro ao carregar o histórico de solicitações.",
            });
        }
    }
);

export default router;
