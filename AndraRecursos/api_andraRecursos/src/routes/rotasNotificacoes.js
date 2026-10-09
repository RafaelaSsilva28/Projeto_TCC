
import { Router } from "express";
import { BD } from "../../db.js";

import {
    autenticarToken,
    autenticarAdministrador,
} from "../middlewares/Autenticacao.js";

const router = Router();

function obterIdAdministrador(req) {
    return Number(req.usuario?.id_administrador);
}

function validarId(valor) {
    const id = Number(valor);
    return Number.isSafeInteger(id) && id > 0;
}

// =============================================
// GET - LISTAR NOTIFICAÇÕES DO ADMINISTRADOR
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
        ORDER BY n.data_notificacao DESC,
                 n.id_notificacao DESC
        `,
                [idAdministrador]
            );

            return res.status(200).json(resultado.rows);
        } catch (error) {
            console.error("Erro ao listar notificações:", error.message);
            return res.status(500).json({
                error: "Erro ao listar notificações.",
            });
        }
    }
);

// =============================================
// GET - CONTADORES
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
          COUNT(*) FILTER (WHERE lida = FALSE)::INTEGER AS nao_lidas,
          COUNT(*) FILTER (WHERE lida = TRUE)::INTEGER AS lidas
        FROM notificacoes
        WHERE id_administrador = $1
        `,
                [idAdministrador]
            );

            return res.status(200).json(resultado.rows[0]);
        } catch (error) {
            console.error("Erro ao consultar resumo:", error.message);
            return res.status(500).json({
                error: "Erro ao consultar resumo de notificações.",
            });
        }
    }
);

// =============================================
// POST - CRIAR NOTIFICAÇÃO
// =============================================
// Operação administrativa.
// O destinatário é o administrador autenticado.

router.post(
    "/notificacoes",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        const idAdministrador = obterIdAdministrador(req);

        const mensagem = String(req.body.mensagem ?? "").trim();
        const tipo = String(req.body.tipo_informacao ?? "").trim();
        const idSolicitacao = req.body.id_solicitacao == null
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
            const resultado = await BD.query(
                `
        INSERT INTO notificacoes (
          mensagem,
          tipo_informacao,
          id_administrador,
          id_solicitacao,
          lida,
          data_notificacao
        )
        VALUES ($1, $2, $3, $4, FALSE, CURRENT_TIMESTAMP)
        RETURNING *
        `,
                [mensagem, tipo, idAdministrador, idSolicitacao]
            );

            return res.status(201).json({
                message: "Notificação criada com sucesso.",
                notificacao: resultado.rows[0],
            });
        } catch (error) {
            console.error("Erro ao criar notificação:", error.message);
            return res.status(500).json({
                error: "Erro ao criar notificação.",
            });
        }
    }
);

// =============================================
// PATCH - MARCAR TODAS COMO LIDAS
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
        `,
                [idAdministrador]
            );

            return res.status(200).json({
                message: "Todas as notificações foram marcadas como lidas.",
                alteradas: resultado.rowCount,
            });
        } catch (error) {
            console.error("Erro ao marcar notificações:", error.message);
            return res.status(500).json({
                error: "Erro ao marcar notificações como lidas.",
            });
        }
    }
);

// =============================================
// PATCH - MARCAR NOTIFICAÇÃO COMO LIDA
// =============================================

router.patch(
    "/notificacoes/:id_notificacao/lida",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        const idAdministrador = obterIdAdministrador(req);
        const idNotificacao = Number(req.params.id_notificacao);

        if (!validarId(idAdministrador) || !validarId(idNotificacao)) {
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
            console.error("Erro ao marcar notificação:", error.message);
            return res.status(500).json({
                error: "Erro ao marcar notificação como lida.",
            });
        }
    }
);

// =============================================
// DELETE - EXCLUIR NOTIFICAÇÃO
// =============================================

router.delete(
    "/notificacoes/:id_notificacao",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        const idAdministrador = obterIdAdministrador(req);
        const idNotificacao = Number(req.params.id_notificacao);

        if (!validarId(idAdministrador) || !validarId(idNotificacao)) {
            return res.status(400).json({
                error: "Identificação inválida.",
            });
        }

        try {
            const resultado = await BD.query(
                `
        DELETE FROM notificacoes
        WHERE id_notificacao = $1
          AND id_administrador = $2
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
            console.error("Erro ao excluir notificação:", error.message);
            return res.status(500).json({
                error: "Erro ao excluir notificação.",
            });
        }
    }
);

export default router;
