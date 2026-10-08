
import jwt from "jsonwebtoken";
import { BD } from "../../db.js";

export function autenticarToken(req, res, next) {
  const cabecalho = req.headers.authorization;

  const token = cabecalho?.startsWith("Bearer ")
    ? cabecalho.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      message: "Token não fornecido!",
    });
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET não configurada");
    }

    const usuario = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.usuario = usuario;
    next();

  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      return res.status(401).json({
        message: "Token inválido ou expirado!",
      });
    }

    console.error("Erro de autenticação:", error.message);

    return res.status(500).json({
      message: "Erro na configuração da autenticação.",
    });
  }
}

// AUTORIZAÇÃO ADMINISTRATIVA
export function autenticarAdministrador(req, res, next) {
  if (req.usuario?.tipo_acesso !== "administrador") {
    return res.status(403).json({
      message: "Acesso exclusivo do administrador.",
    });
  }

  next();
}

// AUTORIZAÇÃO INSTITUCIONAL
export async function autenticarInstituicao(req, res, next) {
  if (
    req.usuario?.tipo_acesso !== "instituicao" ||
    !Number.isInteger(req.usuario.id_instituicao)
  ) {
    return res.status(403).json({
      message: "Acesso exclusivo de instituições.",
    });
  }

  try {
    const resultado = await BD.query(
      `SELECT id_instituicao, cadastro_completo
       FROM instituicoes
       WHERE id_instituicao = $1`,
      [req.usuario.id_instituicao]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        message: "Instituição não encontrada.",
      });
    }

    req.instituicao = resultado.rows[0];
    next();

  } catch (error) {
    console.error(error.message);

    return res.status(500).json({
      message: "Erro ao verificar instituição.",
    });
  }
}

// BLOQUEIA RECURSOS ANTES DO PRIMEIRO CADASTRO
export function exigirCadastroCompleto(req, res, next) {
  if (req.instituicao?.cadastro_completo !== true) {
    return res.status(403).json({
      message: "Complete o cadastro obrigatório.",
      cadastro_completo: false,
    });
  }

  next();
}
