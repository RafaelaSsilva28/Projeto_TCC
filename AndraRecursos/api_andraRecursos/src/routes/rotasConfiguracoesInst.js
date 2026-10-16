import { Router } from "express";
import { BD } from "../../db.js";
import bcrypt from "bcrypt";

import {
  autenticarToken,
  autenticarInstituicao,
} from "../middlewares/Autenticacao.js";

const router = Router();

router.use(autenticarToken, autenticarInstituicao);

function obterId(req) {
  const id = Number(req.instituicao?.id_instituicao);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// ==========================================
// GET - CONFIGURAÇÕES DA INSTITUIÇÃO
// ==========================================
router.get("/configuracoes-inst", async (req, res) => {
  const id = obterId(req);

  if (!id) {
    return res.status(403).json({
      message: "Instituição não identificada.",
    });
  }

  try {
    await BD.query(
      `
            INSERT INTO configuracoes_instituicao (id_instituicao)
            VALUES ($1)
            ON CONFLICT (id_instituicao) DO NOTHING
            `,
      [id],
    );

    const resultado = await BD.query(
      `
            SELECT
                c.id_instituicao,
                i.nome,
                i.email_institucional,
                c.notificar_atualizacoes_solicitacoes,
                c.notificar_respostas_administrador,
                c.modo_escuro,
                c.atualizado_em
            FROM configuracoes_instituicao c
            INNER JOIN instituicoes i
                ON i.id_instituicao = c.id_instituicao
            WHERE c.id_instituicao = $1
            `,
      [id],
    );

    if (!resultado.rows.length) {
      return res.status(404).json({
        message: "Instituição não encontrada.",
      });
    }

    return res.status(200).json(resultado.rows[0]);
  } catch (error) {
    console.error(
      "Erro ao buscar configurações da instituição:",
      error.message,
    );

    return res.status(500).json({
      message: "Erro ao buscar configurações.",
    });
  }
});

// ==========================================
// PATCH - SALVAR PREFERÊNCIAS
// ==========================================
router.patch("/configuracoes-inst", async (req, res) => {
  const id = obterId(req);

  if (!id) {
    return res.status(403).json({
      message: "Instituição não identificada.",
    });
  }

  const {
    notificar_atualizacoes_solicitacoes,
    notificar_respostas_administrador,
    modo_escuro,
  } = req.body || {};

  const valores = [
    notificar_atualizacoes_solicitacoes,
    notificar_respostas_administrador,
    modo_escuro,
  ];

  if (valores.some((valor) => typeof valor !== "boolean")) {
    return res.status(400).json({
      message: "As preferências devem ser valores booleanos.",
    });
  }

  try {
    const resultado = await BD.query(
      `
            INSERT INTO configuracoes_instituicao (
                id_instituicao,
                notificar_atualizacoes_solicitacoes,
                notificar_respostas_administrador,
                modo_escuro,
                atualizado_em
            )
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (id_instituicao)
            DO UPDATE SET
                notificar_atualizacoes_solicitacoes =
                    EXCLUDED.notificar_atualizacoes_solicitacoes,
                notificar_respostas_administrador =
                    EXCLUDED.notificar_respostas_administrador,
                modo_escuro =
                    EXCLUDED.modo_escuro,
                atualizado_em = CURRENT_TIMESTAMP
            RETURNING *
            `,
      [id, ...valores],
    );

    return res.status(200).json({
      message: "Preferências salvas com sucesso!",
      configuracoes: resultado.rows[0],
    });
  } catch (error) {
    console.error(
      "Erro ao salvar configurações da instituição:",
      error.message,
    );

    return res.status(500).json({
      message: "Erro ao salvar configurações.",
    });
  }
});

// ==========================================
// PATCH - ALTERAR SENHA
// ==========================================
router.patch("/configuracoes-inst/senha", async (req, res) => {
  const id = obterId(req);

  if (!id) {
    return res.status(403).json({
      message: "Instituição não identificada.",
    });
  }

  const { senhaAtual, novaSenha, confirmarSenha } = req.body || {};

  if (
    typeof senhaAtual !== "string" ||
    typeof novaSenha !== "string" ||
    typeof confirmarSenha !== "string" ||
    !senhaAtual ||
    !novaSenha ||
    !confirmarSenha
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
            FROM instituicoes
            WHERE id_instituicao = $1
            `,
      [id],
    );

    if (!resultado.rows.length) {
      return res.status(404).json({
        message: "Instituição não encontrada.",
      });
    }

    const senhaArmazenada = resultado.rows[0].senha;

    const senhaCorreta = await bcrypt.compare(senhaAtual, senhaArmazenada);

    if (!senhaCorreta) {
      return res.status(400).json({
        message: "A senha atual está incorreta.",
      });
    }

    const senhaIgual = await bcrypt.compare(novaSenha, senhaArmazenada);

    if (senhaIgual) {
      return res.status(400).json({
        message: "A nova senha deve ser diferente da atual.",
      });
    }

    const senhaCriptografada = await bcrypt.hash(novaSenha, 10);

    await BD.query(
      `
            UPDATE instituicoes
            SET senha = $1
            WHERE id_instituicao = $2
            `,
      [senhaCriptografada, id],
    );

    return res.status(200).json({
      message: "Senha alterada com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao alterar senha da instituição:", error.message);

    return res.status(500).json({
      message: "Erro interno ao alterar senha.",
    });
  }
});

export default router;
