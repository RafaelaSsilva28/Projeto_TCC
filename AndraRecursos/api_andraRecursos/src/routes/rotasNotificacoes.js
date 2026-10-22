
import { Router } from "express";
import { BD } from "../../db.js";

import {
    autenticarToken,
    autenticarAdministrador,
    autenticarInstituicao,
} from "../middlewares/Autenticacao.js";

const router = Router();

// =============================================
// FUNÇÕES AUXILIARES
// =============================================

function obterIdAdministrador(req) {
    return Number(
        req.usuario?.id_administrador ??
        req.administrador?.id_administrador
    );
}

function obterIdInstituicao(req) {
    return Number(
        req.instituicao?.id_instituicao ??
        req.usuario?.id_instituicao
    );
}

function validarId(valor) {
    const id = Number(valor);
    return Number.isSafeInteger(id) && id > 0;
}

// =============================================
// GET - LISTAR NOTIFICAÇÕES DO ADMINISTRADOR
// GET /notificacoes
// =============================================

router.get(
    "/notificacoes",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        const idAdministrador = obterIdAdministrador(req);

        if (!validarId(idAdministrador)) {
            return res.status(403).json({
                error: "Administrador não identificado.",
            });
        }

        try {
            const resultado = await BD.query(
                `
                SELECT
                    n.id_notificacao,
                    n.mensagem,
                    n.tipo_informacao,
                    n.id_administrador,
                    n.id_solicitacao,
                    n.lida,
                    n.data_notificacao,
                    s.titulo AS titulo_solicitacao,
                    s.status AS status_solicitacao,
                    s.prioridade,
                    i.nome AS nome_instituicao
                FROM notificacoes n
                LEFT JOIN solicitacoes s
                    ON s.id_solicitacoes = n.id_solicitacao
                LEFT JOIN instituicoes i
                    ON i.id_instituicao = s.id_instituicao
                WHERE n.id_administrador = $1
                  AND n.excluida_admin = FALSE
                ORDER BY
                    n.data_notificacao DESC,
                    n.id_notificacao DESC
                `,
                [idAdministrador]
            );

            return res.status(200).json(resultado.rows);
        } catch (error) {
            console.error(
                "Erro ao listar notificações do administrador:",
                error.message
            );

            return res.status(500).json({
                error: "Erro ao listar notificações.",
            });
        }
    }
);

// =============================================
// GET - LISTAR NOTIFICAÇÕES DA INSTITUIÇÃO
// GET /notificacoes/instituicao
// =============================================

router.get(
    "/notificacoes/instituicao",
    autenticarToken,
    autenticarInstituicao,
    async (req, res) => {
        const idInstituicao = obterIdInstituicao(req);

        if (!validarId(idInstituicao)) {
            return res.status(403).json({
                error: "Instituição não identificada.",
            });
        }

        try {
            const resultado = await BD.query(
                `
                SELECT
                    n.id_notificacao,
                    n.mensagem,
                    n.tipo_informacao,
                    n.id_solicitacao,
                    n.lida_instituicao AS lida,
                    n.data_notificacao,
                    s.titulo AS titulo_solicitacao,
                    s.status AS status_solicitacao
                FROM notificacoes n
                INNER JOIN solicitacoes s
                    ON s.id_solicitacoes = n.id_solicitacao
                WHERE s.id_instituicao = $1
                  AND n.excluida_instituicao = FALSE
                ORDER BY
                    n.data_notificacao DESC,
                    n.id_notificacao DESC
                `,
                [idInstituicao]
            );

            return res.status(200).json(resultado.rows);
        } catch (error) {
            console.error(
                "Erro ao listar notificações da instituição:",
                error.message
            );

            return res.status(500).json({
                error: "Erro ao listar notificações da instituição.",
            });
        }
    }
);

// =============================================
// GET - RESUMO DAS NOTIFICAÇÕES DO ADMINISTRADOR
// GET /notificacoes/resumo
// =============================================

router.get(
    "/notificacoes/resumo",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        const idAdministrador = obterIdAdministrador(req);

        if (!validarId(idAdministrador)) {
            return res.status(403).json({
                error: "Administrador não identificado.",
            });
        }

        try {
            const resultado = await BD.query(
                `
                SELECT
                    COUNT(*)::INTEGER AS total,
                    COUNT(*) FILTER (
                        WHERE lida = FALSE
                    )::INTEGER AS nao_lidas,
                    COUNT(*) FILTER (
                        WHERE lida = TRUE
                    )::INTEGER AS lidas
                FROM notificacoes
                WHERE id_administrador = $1
                  AND excluida_admin = FALSE
                `,
                [idAdministrador]
            );

            return res.status(200).json(resultado.rows[0]);
        } catch (error) {
            console.error(
                "Erro ao consultar resumo de notificações:",
                error.message
            );

            return res.status(500).json({
                error: "Erro ao consultar resumo de notificações.",
            });
        }
    }
);

// =============================================
// POST - CRIAR NOTIFICAÇÃO PARA O ADMINISTRADOR
// POST /notificacoes
// =============================================

router.post(
    "/notificacoes",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        const idAdministrador = obterIdAdministrador(req);

        const mensagem = String(
            req.body?.mensagem ?? ""
        ).trim();

        const tipo = String(
            req.body?.tipo_informacao ?? ""
        ).trim();

        const idSolicitacao =
            req.body?.id_solicitacao == null
                ? null
                : Number(req.body.id_solicitacao);

        if (!validarId(idAdministrador)) {
            return res.status(403).json({
                error: "Administrador não identificado.",
            });
        }

        if (!mensagem || !tipo || mensagem.length > 2000) {
            return res.status(400).json({
                error: "Mensagem ou tipo de informação inválidos.",
            });
        }

        if (
            idSolicitacao !== null &&
            !validarId(idSolicitacao)
        ) {
            return res.status(400).json({
                error: "ID da solicitação inválido.",
            });
        }

        try {
            if (idSolicitacao !== null) {
                const solicitacao = await BD.query(
                    `
                    SELECT id_solicitacoes
                    FROM solicitacoes
                    WHERE id_solicitacoes = $1
                    `,
                    [idSolicitacao]
                );

                if (!solicitacao.rows.length) {
                    return res.status(404).json({
                        error: "Solicitação não encontrada.",
                    });
                }
            }

            const resultado = await BD.query(
                `
                INSERT INTO notificacoes (
                    mensagem,
                    tipo_informacao,
                    id_administrador,
                    id_solicitacao,
                    lida,
                    lida_instituicao,
                    excluida_admin,
                    excluida_instituicao,
                    data_notificacao
                )
                VALUES (
                    $1, $2, $3, $4,
                    FALSE, FALSE, FALSE, FALSE,
                    CURRENT_TIMESTAMP
                )
                RETURNING *
                `,
                [
                    mensagem,
                    tipo,
                    idAdministrador,
                    idSolicitacao,
                ]
            );

            return res.status(201).json({
                message: "Notificação criada com sucesso.",
                notificacao: resultado.rows[0],
            });
        } catch (error) {
            console.error(
                "Erro ao criar notificação:",
                error.message
            );

            return res.status(500).json({
                error: "Erro ao criar notificação.",
            });
        }
    }
);

// =============================================
// PATCH - MARCAR TODAS COMO LIDAS (ADMINISTRADOR)
// =============================================

router.patch(
    "/notificacoes/marcar-todas-lidas",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        const idAdministrador = obterIdAdministrador(req);

        if (!validarId(idAdministrador)) {
            return res.status(403).json({
                error: "Administrador não identificado.",
            });
        }

        try {
            const resultado = await BD.query(
                `
                UPDATE notificacoes
                SET lida = TRUE
                WHERE id_administrador = $1
                  AND lida = FALSE
                  AND excluida_admin = FALSE
                `,
                [idAdministrador]
            );

            return res.status(200).json({
                message:
                    "Todas as notificações foram marcadas como lidas.",
                alteradas: resultado.rowCount,
            });
        } catch (error) {
            console.error(
                "Erro ao marcar notificações do administrador:",
                error.message
            );

            return res.status(500).json({
                error: "Erro ao marcar notificações como lidas.",
            });
        }
    }
);

// =============================================
// PATCH - MARCAR UMA COMO LIDA (ADMINISTRADOR)
// =============================================

router.patch(
    "/notificacoes/:id_notificacao/lida",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        const idAdministrador = obterIdAdministrador(req);
        const idNotificacao = Number(
            req.params.id_notificacao
        );

        if (
            !validarId(idAdministrador) ||
            !validarId(idNotificacao)
        ) {
            return res.status(400).json({
                error: "Identificação inválida.",
            });
        }

        try {
            const resultado = await BD.query(
                `
                UPDATE notificacoes
                SET lida = TRUE
                WHERE id_notificacao = $1
                  AND id_administrador = $2
                  AND excluida_admin = FALSE
                RETURNING *
                `,
                [idNotificacao, idAdministrador]
            );

            if (!resultado.rows.length) {
                return res.status(404).json({
                    error: "Notificação não encontrada.",
                });
            }

            return res.status(200).json({
                message: "Notificação marcada como lida.",
                notificacao: resultado.rows[0],
            });
        } catch (error) {
            console.error(
                "Erro ao marcar notificação do administrador:",
                error.message
            );

            return res.status(500).json({
                error: "Erro ao marcar notificação como lida.",
            });
        }
    }
);

// =============================================
// DELETE - EXCLUIR TODAS (ADMINISTRADOR)
// =============================================

router.delete(
    "/notificacoes/todas",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        const idAdministrador = obterIdAdministrador(req);

        if (!validarId(idAdministrador)) {
            return res.status(403).json({
                error: "Administrador não identificado.",
            });
        }

        try {
            const resultado = await BD.query(
                `
                UPDATE notificacoes
                SET excluida_admin = TRUE
                WHERE id_administrador = $1
                  AND excluida_admin = FALSE
                `,
                [idAdministrador]
            );

            return res.status(200).json({
                message: "Notificações excluídas com sucesso.",
                excluidas: resultado.rowCount,
            });
        } catch (error) {
            console.error(
                "Erro ao excluir notificações do administrador:",
                error.message
            );

            return res.status(500).json({
                error: "Erro ao excluir notificações.",
            });
        }
    }
);

// =============================================
// DELETE - EXCLUIR UMA (ADMINISTRADOR)
// =============================================

router.delete(
    "/notificacoes/:id_notificacao",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        const idAdministrador = obterIdAdministrador(req);
        const idNotificacao = Number(
            req.params.id_notificacao
        );

        if (
            !validarId(idAdministrador) ||
            !validarId(idNotificacao)
        ) {
            return res.status(400).json({
                error: "Identificação inválida.",
            });
        }

        try {
            const resultado = await BD.query(
                `
                UPDATE notificacoes
                SET excluida_admin = TRUE
                WHERE id_notificacao = $1
                  AND id_administrador = $2
                  AND excluida_admin = FALSE
                RETURNING id_notificacao
                `,
                [idNotificacao, idAdministrador]
            );

            if (!resultado.rows.length) {
                return res.status(404).json({
                    error: "Notificação não encontrada.",
                });
            }

            return res.status(200).json({
                message: "Notificação excluída com sucesso.",
            });
        } catch (error) {
            console.error(
                "Erro ao excluir notificação do administrador:",
                error.message
            );

            return res.status(500).json({
                error: "Erro ao excluir notificação.",
            });
        }
    }
);

// =============================================
// PATCH - MARCAR TODAS COMO LIDAS (INSTITUIÇÃO)
// =============================================

router.patch(
    "/notificacoes/instituicao/marcar-todas-lidas",
    autenticarToken,
    autenticarInstituicao,
    async (req, res) => {
        const idInstituicao = obterIdInstituicao(req);

        if (!validarId(idInstituicao)) {
            return res.status(403).json({
                error: "Instituição não identificada.",
            });
        }

        try {
            const resultado = await BD.query(
                `
                UPDATE notificacoes n
                SET lida_instituicao = TRUE
                FROM solicitacoes s
                WHERE n.id_solicitacao = s.id_solicitacoes
                  AND s.id_instituicao = $1
                  AND n.lida_instituicao = FALSE
                  AND n.excluida_instituicao = FALSE
                `,
                [idInstituicao]
            );

            return res.status(200).json({
                message:
                    "Todas as notificações foram marcadas como lidas.",
                alteradas: resultado.rowCount,
            });
        } catch (error) {
            console.error(
                "Erro ao marcar notificações da instituição:",
                error.message
            );

            return res.status(500).json({
                error: "Erro ao marcar notificações como lidas.",
            });
        }
    }
);

// =============================================
// PATCH - MARCAR UMA COMO LIDA (INSTITUIÇÃO)
// =============================================

router.patch(
    "/notificacoes/instituicao/:id_notificacao/lida",
    autenticarToken,
    autenticarInstituicao,
    async (req, res) => {
        const idInstituicao = obterIdInstituicao(req);
        const idNotificacao = Number(
            req.params.id_notificacao
        );

        if (
            !validarId(idInstituicao) ||
            !validarId(idNotificacao)
        ) {
            return res.status(400).json({
                error: "Identificação inválida.",
            });
        }

        try {
            const resultado = await BD.query(
                `
                UPDATE notificacoes n
                SET lida_instituicao = TRUE
                FROM solicitacoes s
                WHERE n.id_solicitacao = s.id_solicitacoes
                  AND n.id_notificacao = $1
                  AND s.id_instituicao = $2
                  AND n.excluida_instituicao = FALSE
                RETURNING n.id_notificacao
                `,
                [idNotificacao, idInstituicao]
            );

            if (!resultado.rows.length) {
                return res.status(404).json({
                    error: "Notificação não encontrada.",
                });
            }

            return res.status(200).json({
                message: "Notificação marcada como lida.",
            });
        } catch (error) {
            console.error(
                "Erro ao marcar notificação da instituição:",
                error.message
            );

            return res.status(500).json({
                error: "Erro ao marcar notificação como lida.",
            });
        }
    }
);

// =============================================
// DELETE - EXCLUIR TODAS (INSTITUIÇÃO)
// =============================================

router.delete(
    "/notificacoes/instituicao/todas",
    autenticarToken,
    autenticarInstituicao,
    async (req, res) => {
        const idInstituicao = obterIdInstituicao(req);

        if (!validarId(idInstituicao)) {
            return res.status(403).json({
                error: "Instituição não identificada.",
            });
        }

        try {
            const resultado = await BD.query(
                `
                UPDATE notificacoes n
                SET excluida_instituicao = TRUE
                FROM solicitacoes s
                WHERE n.id_solicitacao = s.id_solicitacoes
                  AND s.id_instituicao = $1
                  AND n.excluida_instituicao = FALSE
                `,
                [idInstituicao]
            );

            return res.status(200).json({
                message: "Notificações excluídas com sucesso.",
                excluidas: resultado.rowCount,
            });
        } catch (error) {
            console.error(
                "Erro ao excluir notificações da instituição:",
                error.message
            );

            return res.status(500).json({
                error: "Erro ao excluir notificações.",
            });
        }
    }
);

// =============================================
// DELETE - EXCLUIR UMA (INSTITUIÇÃO)
// =============================================

router.delete(
    "/notificacoes/instituicao/:id_notificacao",
    autenticarToken,
    autenticarInstituicao,
    async (req, res) => {
        const idInstituicao = obterIdInstituicao(req);
        const idNotificacao = Number(
            req.params.id_notificacao
        );

        if (
            !validarId(idInstituicao) ||
            !validarId(idNotificacao)
        ) {
            return res.status(400).json({
                error: "Identificação inválida.",
            });
        }

        try {
            const resultado = await BD.query(
                `
                UPDATE notificacoes n
                SET excluida_instituicao = TRUE
                FROM solicitacoes s
                WHERE n.id_solicitacao = s.id_solicitacoes
                  AND n.id_notificacao = $1
                  AND s.id_instituicao = $2
                  AND n.excluida_instituicao = FALSE
                RETURNING n.id_notificacao
                `,
                [idNotificacao, idInstituicao]
            );

            if (!resultado.rows.length) {
                return res.status(404).json({
                    error: "Notificação não encontrada.",
                });
            }

            return res.status(200).json({
                message: "Notificação excluída com sucesso.",
            });
        } catch (error) {
            console.error(
                "Erro ao excluir notificação da instituição:",
                error.message
            );

            return res.status(500).json({
                error: "Erro ao excluir notificação.",
            });
        }
    }
);

export default router;
