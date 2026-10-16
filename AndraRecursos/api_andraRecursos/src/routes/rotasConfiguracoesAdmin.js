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
// GET - DADOS DO ADMINISTRADOR
// ==========================================
router.get("/configuracoes-admin", async (req, res) => {
  const id = obterId(req);

  if (!id) {
    return res.status(403).json({
      message: "Administrador não identificado.",
    });
  }

  try {
    const resultado = await BD.query(
      `
            SELECT
                id_administrador,
                nome,
                email
            FROM administradores
            WHERE id_administrador = $1
            `,
      [id],
    );

    if (!resultado.rows.length) {
      return res.status(404).json({
        message: "Administrador não encontrado.",
      });
    }

    return res.status(200).json(resultado.rows[0]);
  } catch (error) {
    console.error("Erro ao buscar administrador:", error.message);

    return res.status(500).json({
      message: "Erro ao buscar dados do administrador.",
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

  const { senhaAtual, novaSenha, confirmarSenha } = req.body || {};

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
      [id],
    );

    if (!resultado.rows.length) {
      return res.status(404).json({
        message: "Administrador não encontrado.",
      });
    }

    const senhaCorreta = await bcrypt.compare(
      senhaAtual,
      resultado.rows[0].senha,
    );

    if (!senhaCorreta) {
      return res.status(400).json({
        message: "A senha atual está incorreta.",
      });
    }

    const senhaIgual = await bcrypt.compare(novaSenha, resultado.rows[0].senha);

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
      [senhaCriptografada, id],
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
