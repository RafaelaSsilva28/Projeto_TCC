
import { Router } from "express";
import { BD } from "../../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import {
  autenticarToken,
  autenticarAdministrador,
} from "../middlewares/Autenticacao.js";

const router = Router();

// ======================================================
// LISTAR ADMINISTRADORES
// GET /administradores
// ======================================================

router.get(
  "/administradores",
  autenticarToken,
  autenticarAdministrador,
  async (req, res) => {
    try {
      const resultado = await BD.query(
        `SELECT
          id_administrador,
          nome,
          email
         FROM administradores
         ORDER BY id_administrador`
      );

      return res.status(200).json(resultado.rows);

    } catch (error) {
      console.error(
        "Erro ao listar administradores:",
        error.message
      );

      return res.status(500).json({
        message: "Erro ao listar administradores.",
      });
    }
  }
);

// ======================================================
// CADASTRAR ADMINISTRADOR
// POST /administradores
// ======================================================

router.post(
  "/administradores",
  autenticarToken,
  autenticarAdministrador,
  async (req, res) => {
    const { nome, email, senha } = req.body || {};

    if (
      typeof nome !== "string" ||
      typeof email !== "string" ||
      typeof senha !== "string" ||
      !nome.trim() ||
      !email.trim() ||
      senha.length < 8
    ) {
      return res.status(400).json({
        message:
          "Nome, e-mail e senha com pelo menos 8 caracteres são obrigatórios.",
      });
    }

    const emailNormalizado = email.trim().toLowerCase();

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)
    ) {
      return res.status(400).json({
        message: "Informe um e-mail válido.",
      });
    }

    try {
      const verificarEmail = await BD.query(
        `SELECT id_administrador
         FROM administradores
         WHERE LOWER(email) = LOWER($1)`,
        [emailNormalizado]
      );

      if (verificarEmail.rows.length > 0) {
        return res.status(409).json({
          message: "Este e-mail já está cadastrado.",
        });
      }

      const senhaCriptografada = await bcrypt.hash(
        senha,
        10
      );

      const resultado = await BD.query(
        `INSERT INTO administradores
          (nome, email, senha)
         VALUES ($1, $2, $3)
         RETURNING
           id_administrador,
           nome,
           email`,
        [
          nome.trim(),
          emailNormalizado,
          senhaCriptografada,
        ]
      );

      return res.status(201).json({
        message: "Administrador cadastrado com sucesso!",
        administrador: resultado.rows[0],
      });

    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          message: "Este e-mail já está cadastrado.",
        });
      }

      console.error(
        "Erro ao cadastrar administrador:",
        error.message
      );

      return res.status(500).json({
        message: "Erro interno ao cadastrar administrador.",
      });
    }
  }
);

// ======================================================
// ATUALIZAR ADMINISTRADOR
// PATCH /administradores/:id_administrador
// ======================================================

router.patch(
  "/administradores/:id_administrador",
  autenticarToken,
  autenticarAdministrador,
  async (req, res) => {
    const id = Number(req.params.id_administrador);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "ID do administrador inválido.",
      });
    }

    const { nome, email, senha } = req.body || {};

    const campos = [];
    const valores = [];

    if (nome !== undefined) {
      if (
        typeof nome !== "string" ||
        !nome.trim()
      ) {
        return res.status(400).json({
          message: "Nome inválido.",
        });
      }

      valores.push(nome.trim());

      campos.push(`nome = $${valores.length}`);
    }

    if (email !== undefined) {
      if (
        typeof email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email.trim()
        )
      ) {
        return res.status(400).json({
          message: "E-mail inválido.",
        });
      }

      valores.push(email.trim().toLowerCase());

      campos.push(`email = $${valores.length}`);
    }

    if (senha !== undefined) {
      if (
        typeof senha !== "string" ||
        senha.length < 8
      ) {
        return res.status(400).json({
          message:
            "A nova senha deve ter pelo menos 8 caracteres.",
        });
      }

      try {
        const senhaHash = await bcrypt.hash(senha, 10);

        valores.push(senhaHash);

        campos.push(`senha = $${valores.length}`);

      } catch (error) {
        console.error(
          "Erro ao criptografar senha:",
          error.message
        );

        return res.status(500).json({
          message: "Erro ao processar a senha.",
        });
      }
    }

    if (campos.length === 0) {
      return res.status(400).json({
        message: "Nenhum campo enviado para atualização.",
      });
    }

    valores.push(id);

    try {
      const resultado = await BD.query(
        `UPDATE administradores
         SET ${campos.join(", ")}
         WHERE id_administrador = $${valores.length}
         RETURNING
           id_administrador,
           nome,
           email`,
        valores
      );

      if (resultado.rows.length === 0) {
        return res.status(404).json({
          message: "Administrador não encontrado.",
        });
      }

      return res.status(200).json({
        message: "Administrador atualizado com sucesso!",
        administrador: resultado.rows[0],
      });

    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          message: "Este e-mail já está em uso.",
        });
      }

      console.error(
        "Erro ao atualizar administrador:",
        error.message
      );

      return res.status(500).json({
        message: "Erro interno ao atualizar administrador.",
      });
    }
  }
);

// ======================================================
// EXCLUIR ADMINISTRADOR
// DELETE /administradores/:id_administrador
// ======================================================

router.delete(
  "/administradores/:id_administrador",
  autenticarToken,
  autenticarAdministrador,
  async (req, res) => {
    const id = Number(req.params.id_administrador);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "ID do administrador inválido.",
      });
    }

    // Impede que o administrador exclua a própria
    // conta durante uma sessão autenticada.
    if (req.usuario?.id_administrador === id) {
      return res.status(403).json({
        message:
          "Você não pode excluir sua própria conta.",
      });
    }

    try {
      const resultado = await BD.query(
        `DELETE FROM administradores
         WHERE id_administrador = $1
         RETURNING id_administrador`,
        [id]
      );

      if (resultado.rows.length === 0) {
        return res.status(404).json({
          message: "Administrador não encontrado.",
        });
      }

      return res.status(200).json({
        message: "Administrador excluído com sucesso!",
      });

    } catch (error) {
      console.error(
        "Erro ao excluir administrador:",
        error.message
      );

      return res.status(500).json({
        message: "Erro interno ao excluir administrador.",
      });
    }
  }
);

// ======================================================
// LOGIN ADMINISTRATIVO
// POST /login
// ======================================================

router.post("/login", async (req, res) => {
  const { email, senha } = req.body || {};

  if (
    typeof email !== "string" ||
    typeof senha !== "string" ||
    !email.trim() ||
    !senha
  ) {
    return res.status(400).json({
      message: "E-mail e senha são obrigatórios.",
    });
  }

  try {
    // BUSCAR SOMENTE NA TABELA DE ADMINISTRADORES
    const resultado = await BD.query(
      `SELECT
        id_administrador,
        nome,
        email,
        senha
       FROM administradores
       WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({
        message: "E-mail ou senha inválidos.",
      });
    }

    const administrador = resultado.rows[0];

    // CONFERIR SENHA CRIPTOGRAFADA
    const senhaCorreta = await bcrypt.compare(
      senha,
      administrador.senha
    );

    if (!senhaCorreta) {
      return res.status(401).json({
        message: "E-mail ou senha inválidos.",
      });
    }

    // CHAVE JWT CONFIGURADA NA VERCEL / .ENV
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET não configurada.");
    }

    // GERAR TOKEN DO ADMINISTRADOR
    const token = jwt.sign(
      {
        id_administrador:
          administrador.id_administrador,
        tipo_acesso: "administrador",
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    // RETORNAR DADOS PARA O REACT
    return res.status(200).json({
      message: "Login realizado com sucesso!",
      token,
      usuario: {
        id: administrador.id_administrador,
        nome: administrador.nome,
        email: administrador.email,
        tipo: "Administrador",
      },
    });

  } catch (error) {
    console.error(
      "Erro no login administrativo:",
      error.message
    );

    return res.status(500).json({
      message: "Erro interno ao realizar login.",
    });
  }
});

export default router;
