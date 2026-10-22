
import jwt from "jsonwebtoken";
import { BD } from "../../db.js";

// ============================================
// NORMALIZAR TIPO DE ACESSO
// ============================================

export function obterTipoAcesso(usuario) {
  const tipo = String(
    usuario?.tipo_acesso ??
    usuario?.tipoAcesso ??
    usuario?.tipo ??
    ""
  )
    .trim()
    .toLowerCase();

  if (
    tipo === "administrador" ||
    tipo === "admin"
  ) {
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
// OBTER IDENTIFICADOR DA INSTITUIÇÃO DO TOKEN
// ============================================

function obterIdInstituicaoToken(usuario) {
  const tipoAcesso = obterTipoAcesso(usuario);

  // Não usar o ID do administrador como ID institucional.
  if (tipoAcesso !== "instituicao") {
    return null;
  }

  const valor =
    usuario?.id_instituicao ??
    usuario?.idInstituicao ??
    usuario?.instituicao_id ??
    usuario?.id_instituição ??
    usuario?.id;

  if (
    valor === null ||
    valor === undefined ||
    String(valor).trim() === ""
  ) {
    return null;
  }

  const id = Number(valor);

  return Number.isSafeInteger(id) && id > 0
    ? id
    : null;
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
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      return res.status(401).json({
        message: "Token inválido.",
      });
    }

    const tipoAcesso = obterTipoAcesso(payload);
    const idInstituicao = obterIdInstituicaoToken(payload);

    req.usuario = {
      ...payload,
      tipo_acesso_normalizado: tipoAcesso,

      // Normaliza o identificador para as rotas existentes.
      ...(tipoAcesso === "instituicao" &&
      idInstituicao !== null
        ? { id_instituicao: idInstituicao }
        : {}),
    };

    console.log("Token autenticado:", {
      tipo_acesso: req.usuario.tipo_acesso,
      tipo_acesso_normalizado:
        req.usuario.tipo_acesso_normalizado,
      id_instituicao: req.usuario.id_instituicao ?? null,
      id_administrador:
        req.usuario.id_administrador ?? null,
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
  const tipoAcesso =
    req.usuario?.tipo_acesso_normalizado;

  if (tipoAcesso !== "administrador") {
    console.warn("Acesso administrativo recusado:", {
      tipo_acesso: req.usuario?.tipo_acesso,
      tipo_acesso_normalizado: tipoAcesso,
      id_administrador:
        req.usuario?.id_administrador ?? null,
    });

    return res.status(403).json({
      message: "Acesso exclusivo do administrador.",
    });
  }

  return next();
}

// ============================================
// AUTORIZAÇÃO INSTITUCIONAL
// ============================================

export async function autenticarInstituicao(
  req,
  res,
  next
) {
  const idInstituicao = obterIdInstituicaoToken(
    req.usuario
  );

  if (
    req.usuario?.tipo_acesso_normalizado !== "instituicao" ||
    idInstituicao === null
  ) {
    console.warn("Acesso institucional recusado:", {
      tipo_acesso: req.usuario?.tipo_acesso,
      tipo_acesso_normalizado:
        req.usuario?.tipo_acesso_normalizado,
      id_instituicao:
        req.usuario?.id_instituicao ?? null,
    });

    return res.status(403).json({
      message:
        "Acesso exclusivo de instituições. Verifique o tipo de acesso e o identificador no token.",
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
      console.warn(
        "Instituição do token não encontrada:",
        idInstituicao
      );

      return res.status(404).json({
        message: "Instituição não encontrada.",
      });
    }

    // Dados institucionais confirmados pelo banco.
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

export function exigirCadastroCompleto(
  req,
  res,
  next
) {
  if (req.instituicao?.cadastro_completo !== true) {
    return res.status(403).json({
      message: "Complete o cadastro obrigatório.",
      cadastro_completo: false,
    });
  }

  return next();
}
