
import jwt from "jsonwebtoken";
import { BD } from "../../db.js";

// ============================================
// NORMALIZAR TIPO DE ACESSO
// ============================================

export function obterTipoAcesso(usuario) {
  const tipo = String(usuario?.tipo_acesso || "")
    .trim()
    .toLowerCase();

  if (tipo === "administrador") {
    return "administrador";
  }

  if (
    tipo === "instituicao" ||
    tipo === "instituição" ||
    tipo === "usuário institucional" ||
    tipo === "usuario institucional"
  ) {
    return "instituicao";
  }

  return null;
}

// ============================================
// AUTENTICAR TOKEN JWT
// ============================================

export function autenticarToken(req, res, next) {
  const cabecalho = req.headers.authorization;

  const token = cabecalho?.startsWith("Bearer ")
    ? cabecalho.slice(7).trim()
    : null;

  if (!token) {
    return res.status(401).json({
      message: "Token não fornecido.",
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET não configurada.");

    return res.status(500).json({
      message: "Erro na configuração da autenticação.",
    });
  }

  try {
    const usuario = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (
      !usuario ||
      typeof usuario !== "object" ||
      Array.isArray(usuario)
    ) {
      return res.status(401).json({
        message: "Token inválido.",
      });
    }

    req.usuario = {
      ...usuario,
      tipo_acesso_normalizado: obterTipoAcesso(usuario),
    };

    console.log("Usuário autenticado:", {
      id: req.usuario.id,
      id_instituicao: req.usuario.id_instituicao,
      tipo_acesso: req.usuario.tipo_acesso,
      tipo_acesso_normalizado:
        req.usuario.tipo_acesso_normalizado,
    });

    return next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        message: "Token inválido ou expirado.",
      });
    }

    console.error(
      "Erro de autenticação:",
      error.message
    );

    return res.status(500).json({
      message: "Erro na configuração da autenticação.",
    });
  }
}

// ============================================
// AUTORIZAÇÃO ADMINISTRATIVA
// ============================================

export function autenticarAdministrador(req, res, next) {
  if (
    req.usuario?.tipo_acesso_normalizado !== "administrador"
  ) {
    return res.status(403).json({
      message: "Acesso exclusivo do administrador.",
    });
  }

  return next();
}

// ============================================
// AUTORIZAÇÃO INSTITUCIONAL
// ============================================

export async function autenticarInstituicao(req, res, next) {
  const idInstituicao = Number(
    req.usuario?.id_instituicao
  );

  if (
    req.usuario?.tipo_acesso_normalizado !== "instituicao" ||
    !Number.isSafeInteger(idInstituicao) ||
    idInstituicao <= 0
  ) {
    return res.status(403).json({
      message: "Acesso exclusivo de instituições.",
    });
  }

  try {
    const resultado = await BD.query(
      `
        SELECT
          id_instituicao,
          cadastro_completo
        FROM instituicoes
        WHERE id_instituicao = $1
        LIMIT 1
      `,
      [idInstituicao]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        message: "Instituição não encontrada.",
      });
    }

    req.instituicao = resultado.rows[0];

    return next();
  } catch (error) {
    console.error(
      "Erro ao verificar instituição:",
      error.message
    );

    return res.status(500).json({
      message: "Erro ao verificar instituição.",
    });
  }
}

// ============================================
// EXIGIR CADASTRO INSTITUCIONAL COMPLETO
// ============================================

export function exigirCadastroCompleto(req, res, next) {
  if (req.instituicao?.cadastro_completo !== true) {
    return res.status(403).json({
      message: "Complete o cadastro obrigatório.",
      cadastro_completo: false,
    });
  }

  return next();
}
