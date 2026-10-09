
import { Router } from "express";
import { BD } from "../../db.js";

import {
    autenticarToken,
    autenticarAdministrador,
} from "../middlewares/Autenticacao.js";

const router = Router();

function idValido(valor) {
    const numero = Number(valor);

    return (
        Number.isSafeInteger(numero) &&
        numero > 0
    );
}

// ============================================
// GET - LISTAR TODAS AS SOLICITAÇÕES
// ============================================

router.get(
    "/solicitacoes",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        try {
            const comando = `
        SELECT
          s.id_solicitacoes,
          s.titulo,
          s.descricao,
          s.prioridade,
          s.setor,
          s.status,
          s.id_instituicao,
          TO_CHAR(
            s.data_pedido,
            'DD/MM/YYYY HH24:MI'
          ) AS data_pedido,
          i.nome AS nome_instituicao
        FROM solicitacoes s
        LEFT JOIN instituicoes i
          ON s.id_instituicao = i.id_instituicao
        ORDER BY
          s.data_pedido DESC NULLS LAST,
          s.id_solicitacoes DESC
      `;

            const resultado = await BD.query(comando);

            return res.status(200).json(resultado.rows);
        } catch (error) {
            console.error(
                "Erro ao listar solicitações:",
                error.message
            );

            return res.status(500).json({
                error: "Erro ao listar solicitações.",
            });
        }
    }
);

// ============================================
// GET - FILTRAR POR PRIORIDADE
// ============================================

router.get(
    "/solicitacoes/prioridade/:prioridade",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        try {
            const resultado = await BD.query(
                `
          SELECT *
          FROM solicitacoes
          WHERE LOWER(prioridade) = LOWER($1)
          ORDER BY id_solicitacoes DESC
        `,
                [req.params.prioridade]
            );

            return res.status(200).json(resultado.rows);
        } catch (error) {
            console.error(error.message);

            return res.status(500).json({
                error: "Erro ao filtrar por prioridade.",
            });
        }
    }
);

// ============================================
// GET - FILTRAR POR SETOR
// ============================================

router.get(
    "/solicitacoes/setor/:setor",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        try {
            const resultado = await BD.query(
                `
          SELECT *
          FROM solicitacoes
          WHERE LOWER(setor) = LOWER($1)
          ORDER BY id_solicitacoes DESC
        `,
                [req.params.setor]
            );

            return res.status(200).json(resultado.rows);
        } catch (error) {
            console.error(error.message);

            return res.status(500).json({
                error: "Erro ao filtrar por setor.",
            });
        }
    }
);

// ============================================
// GET - FILTRAR POR STATUS
// ============================================

router.get(
    "/solicitacoes/status/:status",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        try {
            const resultado = await BD.query(
                `
          SELECT *
          FROM solicitacoes
          WHERE LOWER(status) = LOWER($1)
          ORDER BY id_solicitacoes DESC
        `,
                [req.params.status]
            );

            return res.status(200).json(resultado.rows);
        } catch (error) {
            console.error(error.message);

            return res.status(500).json({
                error: "Erro ao filtrar por status.",
            });
        }
    }
);

// ============================================
// POST - CADASTRAR SOLICITAÇÃO
// ============================================
// Mantém o contrato anterior.
//
// Atenção: esta versão conserva a criação
// administrativa. Para cadastro institucional,
// deve-se obter id_instituicao do token JWT,
// não confiar em um ID fornecido pelo cliente.

router.post(
    "/solicitacoes",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        const {
            titulo,
            descricao,
            prioridade,
            setor,
            status,
            data_pedido,
            id_instituicao,
        } = req.body;

        if (
            !titulo?.trim() ||
            !descricao?.trim() ||
            !prioridade?.trim() ||
            !setor?.trim() ||
            !idValido(id_instituicao)
        ) {
            return res.status(400).json({
                error: "Preencha os dados obrigatórios.",
            });
        }

        try {
            const resultado = await BD.query(
                `
          INSERT INTO solicitacoes (
            titulo,
            descricao,
            prioridade,
            setor,
            status,
            data_pedido,
            id_instituicao
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `,
                [
                    titulo.trim(),
                    descricao.trim(),
                    prioridade.trim(),
                    setor.trim(),
                    status || "pendente",
                    data_pedido || new Date(),
                    id_instituicao,
                ]
            );

            return res.status(201).json({
                message: "Solicitação cadastrada com sucesso.",
                solicitacao: resultado.rows[0],
            });
        } catch (error) {
            console.error(
                "Erro ao cadastrar solicitação:",
                error.message
            );

            return res.status(500).json({
                error: "Erro ao cadastrar solicitação.",
            });
        }
    }
);

// ============================================
// PATCH - ATUALIZAR STATUS E HISTÓRICO
// ============================================
// A transação garante que a alteração
// do status e o registro do histórico
// sejam concluídos juntos.

router.patch(
    "/solicitacoes/:id_solicitacoes/status",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        const id = Number(req.params.id_solicitacoes);

        const novoStatus = String(req.body.status || "")
            .trim()
            .toLowerCase();

        const statusPermitidos = [
            "pendente",
            "em andamento",
            "aprovada",
            "recusada",
        ];

        if (!idValido(id)) {
            return res.status(400).json({
                error: "ID inválido.",
            });
        }

        if (!statusPermitidos.includes(novoStatus)) {
            return res.status(400).json({
                error: "Status inválido.",
            });
        }

        let cliente;

        try {
            cliente = await BD.connect();

            await cliente.query("BEGIN");

            const consulta = await cliente.query(
                `
          SELECT
            id_solicitacoes,
            status,
            prioridade
          FROM solicitacoes
          WHERE id_solicitacoes = $1
          FOR UPDATE
        `,
                [id]
            );

            if (!consulta.rows.length) {
                await cliente.query("ROLLBACK");

                return res.status(404).json({
                    error: "Solicitação não encontrada.",
                });
            }

            const anterior = consulta.rows[0];

            if (
                String(anterior.status).toLowerCase().trim() ===
                novoStatus
            ) {
                await cliente.query("ROLLBACK");

                return res.status(200).json({
                    message: "A solicitação já possui esse status.",
                    solicitacao: anterior,
                });
            }

            const atualizado = await cliente.query(
                `
          UPDATE solicitacoes
          SET status = $1
          WHERE id_solicitacoes = $2
          RETURNING *
        `,
                [novoStatus, id]
            );

            await cliente.query(
                `
          INSERT INTO historico_solicitacoes (
            id_solicitacao,
            descricao,
            status,
            prioridade,
            data_alteracao
          )
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        `,
                [
                    id,
                    `Status alterado de "${anterior.status}" para "${novoStatus}".`,
                    novoStatus,
                    anterior.prioridade,
                ]
            );

            await cliente.query("COMMIT");

            return res.status(200).json({
                message: "Status atualizado com sucesso.",
                solicitacao: atualizado.rows[0],
            });
        } catch (error) {
            if (cliente) {
                await cliente.query("ROLLBACK").catch(() => { });
            }

            console.error(
                "Erro ao atualizar solicitação:",
                error.message
            );

            return res.status(500).json({
                error: "Erro ao atualizar solicitação.",
            });
        } finally {
            cliente?.release();
        }
    }
);

// ============================================
// PUT - ATUALIZAR SOLICITAÇÃO COMPLETA
// ============================================

router.put(
    "/solicitacoes/:id_solicitacoes",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        const id = Number(req.params.id_solicitacoes);

        if (!idValido(id)) {
            return res.status(400).json({
                error: "ID inválido.",
            });
        }

        const {
            titulo,
            descricao,
            prioridade,
            setor,
            status,
            data_pedido,
            id_instituicao,
        } = req.body;

        if (
            !titulo?.trim() ||
            !descricao?.trim() ||
            !prioridade?.trim() ||
            !setor?.trim() ||
            !status?.trim() ||
            !data_pedido ||
            !idValido(id_instituicao)
        ) {
            return res.status(400).json({
                error: "Informe todos os campos da solicitação.",
            });
        }

        try {
            const resultado = await BD.query(
                `
          UPDATE solicitacoes
          SET
            titulo = $1,
            descricao = $2,
            prioridade = $3,
            setor = $4,
            status = $5,
            data_pedido = $6,
            id_instituicao = $7
          WHERE id_solicitacoes = $8
          RETURNING *
        `,
                [
                    titulo.trim(),
                    descricao.trim(),
                    prioridade.trim(),
                    setor.trim(),
                    status.trim(),
                    data_pedido,
                    id_instituicao,
                    id,
                ]
            );

            if (!resultado.rows.length) {
                return res.status(404).json({
                    error: "Solicitação não encontrada.",
                });
            }

            return res.status(200).json({
                message: "Solicitação atualizada com sucesso.",
                solicitacao: resultado.rows[0],
            });
        } catch (error) {
            console.error(error.message);

            return res.status(500).json({
                error: "Erro ao atualizar solicitação.",
            });
        }
    }
);

// ============================================
// DELETE - EXCLUIR SOLICITAÇÃO
// ============================================

router.delete(
    "/solicitacoes/:id_solicitacoes",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        const id = Number(req.params.id_solicitacoes);

        if (!idValido(id)) {
            return res.status(400).json({
                error: "ID inválido.",
            });
        }

        try {
            const resultado = await BD.query(
                `
          DELETE FROM solicitacoes
          WHERE id_solicitacoes = $1
          RETURNING id_solicitacoes
        `,
                [id]
            );

            if (!resultado.rows.length) {
                return res.status(404).json({
                    error: "Solicitação não encontrada.",
                });
            }

            return res.status(200).json({
                message: "Solicitação excluída com sucesso.",
            });
        } catch (error) {
            console.error(error.message);

            return res.status(500).json({
                error:
                    "Não foi possível excluir a solicitação. Verifique se existem registros vinculados.",
            });
        }
    }
);

export default router;
