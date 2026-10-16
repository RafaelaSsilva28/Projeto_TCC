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
// GET - DADOS DA INSTITUIÇÃO
// ==========================================
router.get("/configuracoes-inst", async (req, res) => {
  const id = obterId(req);

  if (!id) {
    return res.status(403).json({
      message: "Instituição não identificada.",
    });
  }

  try {
    const resultado = await BD.query(
      `
      SELECT
        id_instituicao,
        nome,
        email_institucional
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

    return res.status(200).json(resultado.rows[0]);
  } catch (error) {
    console.error("Erro ao buscar dados da instituição:", error.message);

    return res.status(500).json({
      message: "Erro ao buscar dados da instituição.",
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
