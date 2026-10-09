
import { Router } from "express";
import { BD } from "../../db.js";
import bcrypt from "bcrypt";

import {
    autenticarToken,
    autenticarAdministrador,
} from "../middlewares/Autenticacao.js";

const router = Router();

router.use(autenticarToken, autenticarAdministrador);

function obterId(req) {
    const id = Number(req.usuario?.id_administrador);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// ==========================================
// GET - CONFIGURAÇÕES DO ADMINISTRADOR
// ==========================================
router.get("/configuracoes-admin", async (req, res) => {
    const id = obterId(req);

    if (!id) {
        return res.status(403).json({
            message: "Administrador não identificado.",
        });
    }

    try {
        await BD.query(
            `
      INSERT INTO configuracoes_administrador (id_administrador)
      VALUES ($1)
      ON CONFLICT (id_administrador) DO NOTHING
      `,
            [id]
        );

        const resultado = await BD.query(
            `
      SELECT
        c.id_administrador,
        a.nome,
        a.email,
        c.notificar_novas_solicitacoes,
        c.notificar_prioridade_alta,
        c.reduzir_animacoes,
        c.atualizado_em
      FROM configuracoes_administrador c
      INNER JOIN administradores a
        ON a.id_administrador = c.id_administrador
      WHERE c.id_administrador = $1
      `,
            [id]
        );

        if (!resultado.rows.length) {
            return res.status(404).json({
                message: "Administrador não encontrado.",
            });
        }

        return res.status(200).json(resultado.rows[0]);
    } catch (error) {
        console.error("Erro ao buscar configurações:", error.message);

        return res.status(500).json({
            message: "Erro ao buscar configurações.",
        });
    }
});

// ==========================================
// PATCH - SALVAR PREFERÊNCIAS
// ==========================================
router.patch("/configuracoes-admin", async (req, res) => {
    const id = obterId(req);

    if (!id) {
        return res.status(403).json({
            message: "Administrador não identificado.",
        });
    }

    const {
        notificar_novas_solicitacoes,
        notificar_prioridade_alta,
        reduzir_animacoes,
    } = req.body || {};

    const valores = [
        notificar_novas_solicitacoes,
        notificar_prioridade_alta,
        reduzir_animacoes,
    ];

    if (valores.some((valor) => typeof valor !== "boolean")) {
        return res.status(400).json({
            message: "As preferências devem ser valores booleanos.",
        });
    }

    try {
        const resultado = await BD.query(
            `
      INSERT INTO configuracoes_administrador (
        id_administrador,
        notificar_novas_solicitacoes,
        notificar_prioridade_alta,
        reduzir_animacoes,
        atualizado_em
      )
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (id_administrador)
      DO UPDATE SET
        notificar_novas_solicitacoes =
          EXCLUDED.notificar_novas_solicitacoes,
        notificar_prioridade_alta =
          EXCLUDED.notificar_prioridade_alta,
        reduzir_animacoes =
          EXCLUDED.reduzir_animacoes,
        atualizado_em = CURRENT_TIMESTAMP
      RETURNING *
      `,
            [id, ...valores]
        );

        return res.status(200).json({
            message: "Preferências salvas com sucesso!",
            configuracoes: resultado.rows[0],
        });
    } catch (error) {
        console.error("Erro ao salvar configurações:", error.message);

        return res.status(500).json({
            message: "Erro ao salvar configurações.",
        });
    }
});

// ==========================================
// PATCH - ALTERAR PRÓPRIA SENHA
// ==========================================
router.patch("/configuracoes-admin/senha", async (req, res) => {
    const id = obterId(req);

    if (!id) {
        return res.status(403).json({
            message: "Administrador não identificado.",
        });
    }

    const {
        senhaAtual,
        novaSenha,
        confirmarSenha,
    } = req.body || {};

    if (
        typeof senhaAtual !== "string" ||
        typeof novaSenha !== "string" ||
        typeof confirmarSenha !== "string"
    ) {
        return res.status(400).json({
            message: "Preencha todos os campos de senha.",
        });
    }

    if (novaSenha.length < 8 || novaSenha.length > 72) {
        return res.status(400).json({
            message: "A nova senha deve conter entre 8 e 72 caracteres.",
        });
    }

    if (novaSenha !== confirmarSenha) {
        return res.status(400).json({
            message: "A confirmação da nova senha não corresponde.",
        });
    }

    try {
        const resultado = await BD.query(
            `
      SELECT senha
      FROM administradores
      WHERE id_administrador = $1
      `,
            [id]
        );

        if (!resultado.rows.length) {
            return res.status(404).json({
                message: "Administrador não encontrado.",
            });
        }

        const senhaCorreta = await bcrypt.compare(
            senhaAtual,
            resultado.rows[0].senha
        );

        if (!senhaCorreta) {
            return res.status(400).json({
                message: "A senha atual está incorreta.",
            });
        }

        const senhaIgual = await bcrypt.compare(
            novaSenha,
            resultado.rows[0].senha
        );

        if (senhaIgual) {
            return res.status(400).json({
                message: "A nova senha deve ser diferente da atual.",
            });
        }

        const senhaCriptografada = await bcrypt.hash(novaSenha, 10);

        await BD.query(
            `
      UPDATE administradores
      SET senha = $1
      WHERE id_administrador = $2
      `,
            [senhaCriptografada, id]
        );

        return res.status(200).json({
            message: "Senha alterada com sucesso!",
        });
    } catch (error) {
        console.error("Erro ao alterar senha:", error.message);

        return res.status(500).json({
            message: "Erro interno ao alterar senha.",
        });
    }
});

export default router;
