
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
// MIDDLEWARE DAS ROTAS INSTITUCIONAIS
// ============================================

const acessoInstitucional = [
    autenticarToken,
    autenticarInstituicao,
    exigirCadastroCompleto,
];

// ============================================
// AUTORIZAÇÃO PARA CONSULTAR RESPOSTAS
// ADMINISTRADOR OU INSTITUIÇÃO
// ============================================

function permitirAdministradorOuInstituicao(req, res, next) {
    if (
        req.usuario?.tipo_acesso_normalizado === "administrador"
    ) {
        return autenticarAdministrador(req, res, next);
    }

    return autenticarInstituicao(req, res, next);
}

// ============================================
// GET - LISTAR RESPOSTAS DA INSTITUIÇÃO
// Exclusivo da instituição autenticada.
// ============================================

router.get(
    "/respostas-instituicao",
    ...acessoInstitucional,
    async (req, res) => {
        const idInstituicao = req.instituicao.id_instituicao;

        try {
            const resultado = await BD.query(
                `
                    SELECT
                        ri.id_resposta,
                        ri.mensagem,
                        ri.data_resposta,
                        ri.id_solicitacao,
                        ri.id_instituicao
                    FROM respostas_instituicao ri
                    WHERE ri.id_instituicao = $1
                    ORDER BY
                        ri.data_resposta ASC NULLS LAST,
                        ri.id_resposta ASC
                `,
                [idInstituicao]
            );

            return res.status(200).json(resultado.rows);
        } catch (error) {
            console.error(
                "Erro ao listar respostas institucionais:",
                error.message
            );

            return res.status(500).json({
                error: "Erro ao listar respostas da instituição.",
            });
        }
    }
);

// ============================================
// GET - LISTAR RESPOSTAS DE UMA SOLICITAÇÃO
//
// Administrador: consulta as respostas da solicitação.
// Instituição: consulta somente as próprias respostas.
// ============================================

router.get(
    "/respostas-instituicao/solicitacao/:id_solicitacao",
    autenticarToken,
    permitirAdministradorOuInstituicao,
    async (req, res) => {
        const idSolicitacao = Number(req.params.id_solicitacao);

        if (!idValido(idSolicitacao)) {
            return res.status(400).json({
                error: "ID da solicitação inválido.",
            });
        }

        const ehAdministrador =
            req.usuario?.tipo_acesso_normalizado === "administrador";

        const idInstituicao = ehAdministrador
            ? null
            : Number(req.instituicao?.id_instituicao);

        try {
            // Verifica a existência da solicitação.
            // Instituições só podem consultar solicitações próprias.
            const consultaSolicitacao = ehAdministrador
                ? `
                    SELECT id_solicitacoes
                    FROM solicitacoes
                    WHERE id_solicitacoes = $1
                    LIMIT 1
                `
                : `
                    SELECT id_solicitacoes
                    FROM solicitacoes
                    WHERE id_solicitacoes = $1
                      AND id_instituicao = $2
                    LIMIT 1
                `;

            const parametrosSolicitacao = ehAdministrador
                ? [idSolicitacao]
                : [idSolicitacao, idInstituicao];

            const solicitacao = await BD.query(
                consultaSolicitacao,
                parametrosSolicitacao
            );

            if (solicitacao.rows.length === 0) {
                return res.status(404).json({
                    error: "Solicitação não encontrada.",
                });
            }

            let resultado;

            if (ehAdministrador) {
                // Administrador visualiza as respostas da solicitação.
                resultado = await BD.query(
                    `
                        SELECT
                            ri.id_resposta,
                            ri.mensagem,
                            ri.data_resposta,
                            ri.id_solicitacao,
                            ri.id_instituicao
                        FROM respostas_instituicao ri
                        WHERE ri.id_solicitacao = $1
                        ORDER BY
                            ri.data_resposta ASC NULLS LAST,
                            ri.id_resposta ASC
                    `,
                    [idSolicitacao]
                );
            } else {
                // Instituição visualiza apenas suas próprias respostas.
                resultado = await BD.query(
                    `
                        SELECT
                            ri.id_resposta,
                            ri.mensagem,
                            ri.data_resposta,
                            ri.id_solicitacao,
                            ri.id_instituicao
                        FROM respostas_instituicao ri
                        WHERE ri.id_solicitacao = $1
                          AND ri.id_instituicao = $2
                        ORDER BY
                            ri.data_resposta ASC NULLS LAST,
                            ri.id_resposta ASC
                    `,
                    [idSolicitacao, idInstituicao]
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
// POST - ENVIAR RESPOSTA DA INSTITUIÇÃO
// ============================================

router.post(
    "/respostas-instituicao",
    ...acessoInstitucional,
    async (req, res) => {
        const idSolicitacao = Number(req.body.id_solicitacao);
        const idInstituicao = req.instituicao.id_instituicao;
        const mensagem = String(req.body.mensagem ?? "").trim();

        if (!idValido(idSolicitacao)) {
            return res.status(400).json({
                error: "Selecione uma solicitação válida.",
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
                      AND id_instituicao = $2
                    LIMIT 1
                `,
                [idSolicitacao, idInstituicao]
            );

            if (solicitacao.rows.length === 0) {
                return res.status(404).json({
                    error: "Solicitação não encontrada para esta instituição.",
                });
            }

            const resultado = await BD.query(
                `
                    INSERT INTO respostas_instituicao (
                        mensagem,
                        data_resposta,
                        id_solicitacao,
                        id_instituicao
                    )
                    VALUES ($1, CURRENT_TIMESTAMP, $2, $3)
                    RETURNING
                        id_resposta,
                        mensagem,
                        data_resposta,
                        id_solicitacao,
                        id_instituicao
                `,
                [mensagem, idSolicitacao, idInstituicao]
            );

            return res.status(201).json({
                message: "Resposta enviada com sucesso!",
                resposta: resultado.rows[0],
            });
        } catch (error) {
            console.error(
                "Erro ao enviar resposta institucional:",
                error.message
            );

            return res.status(500).json({
                error: "Erro ao registrar resposta da instituição.",
            });
        }
    }
);

// ============================================
// PUT - EDITAR RESPOSTA DA INSTITUIÇÃO
// ============================================

router.put(
    "/respostas-instituicao/:id_resposta",
    ...acessoInstitucional,
    async (req, res) => {
        const idResposta = Number(req.params.id_resposta);
        const idInstituicao = req.instituicao.id_instituicao;
        const mensagem = String(req.body.mensagem ?? "").trim();

        if (!idValido(idResposta)) {
            return res.status(400).json({
                error: "ID da resposta inválido.",
            });
        }

        if (!mensagem || mensagem.length > 2000) {
            return res.status(400).json({
                error: "A mensagem deve ter entre 1 e 2000 caracteres.",
            });
        }

        try {
            const resultado = await BD.query(
                `
                    UPDATE respostas_instituicao
                    SET mensagem = $1
                    WHERE id_resposta = $2
                      AND id_instituicao = $3
                    RETURNING
                        id_resposta,
                        mensagem,
                        data_resposta,
                        id_solicitacao,
                        id_instituicao
                `,
                [mensagem, idResposta, idInstituicao]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    error: "Resposta não encontrada para esta instituição.",
                });
            }

            return res.status(200).json({
                message: "Resposta atualizada com sucesso!",
                resposta: resultado.rows[0],
            });
        } catch (error) {
            console.error(
                "Erro ao editar resposta institucional:",
                error.message
            );

            return res.status(500).json({
                error: "Erro ao atualizar resposta.",
            });
        }
    }
);

// ============================================
// DELETE - EXCLUIR RESPOSTA DA INSTITUIÇÃO
// ============================================

router.delete(
    "/respostas-instituicao/:id_resposta",
    ...acessoInstitucional,
    async (req, res) => {
        const idResposta = Number(req.params.id_resposta);
        const idInstituicao = req.instituicao.id_instituicao;

        if (!idValido(idResposta)) {
            return res.status(400).json({
                error: "ID da resposta inválido.",
            });
        }

        try {
            const resultado = await BD.query(
                `
                    DELETE FROM respostas_instituicao
                    WHERE id_resposta = $1
                      AND id_instituicao = $2
                    RETURNING id_resposta
                `,
                [idResposta, idInstituicao]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    error: "Resposta não encontrada para esta instituição.",
                });
            }

            return res.status(200).json({
                message: "Resposta excluída com sucesso!",
            });
        } catch (error) {
            console.error(
                "Erro ao excluir resposta institucional:",
                error.message
            );

            return res.status(500).json({
                error: "Erro ao excluir resposta.",
            });
        }
    }
);

export default router;
