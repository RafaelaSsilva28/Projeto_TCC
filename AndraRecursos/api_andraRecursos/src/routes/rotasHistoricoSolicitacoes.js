
import { Router } from "express";
import { BD } from "../../db.js";

import {
    autenticarToken,
    autenticarInstituicao,
    autenticarAdministrador,
} from "../middlewares/Autenticacao.js";

const router = Router();

// ============================================
// GET - HISTÓRICO DE UMA SOLICITAÇÃO
// ADMINISTRADOR
// ============================================

router.get(
    "/historico-solicitacoes/solicitacao/:id",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    mensagem: "ID da solicitação inválido.",
                });
            }

            // Verifica se a solicitação existe.
            const solicitacao = await BD.query(
                `
                SELECT id_solicitacoes
                FROM solicitacoes
                WHERE id_solicitacoes = $1
                `,
                [id]
            );

            if (solicitacao.rows.length === 0) {
                return res.status(404).json({
                    mensagem: "Solicitação não encontrada.",
                });
            }

            // Busca todas as movimentações.
            const resultado = await BD.query(
                `
                SELECT
                    id_historico,
                    id_solicitacao,
                    descricao,
                    status,
                    prioridade,
                    data_alteracao

                FROM historico_solicitacoes

                WHERE id_solicitacao = $1

                ORDER BY
                    data_alteracao ASC NULLS LAST,
                    id_historico ASC
                `,
                [id]
            );

            // Solicitação sem histórico retorna lista vazia.
            return res.status(200).json(resultado.rows);

        } catch (error) {
            console.error(
                "[ERRO HISTÓRICO DA SOLICITAÇÃO]",
                {
                    mensagem: error.message,
                    codigo: error.code,
                    detalhe: error.detail,
                    caminho: req.originalUrl,
                }
            );

            return res.status(500).json({
                mensagem:
                    "Erro ao carregar o histórico da solicitação.",
            });
        }
    }
);

// ============================================
// GET - HISTÓRICO DE SOLICITAÇÕES DA INSTITUIÇÃO
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
                    mensagem:
                        "Instituição não identificada na sessão.",
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
                mensagem:
                    "Erro ao listar histórico da instituição.",
            });
        }
    }
);

export default router;
