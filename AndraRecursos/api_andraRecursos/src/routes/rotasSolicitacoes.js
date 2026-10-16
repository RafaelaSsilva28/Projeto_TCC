
import { Router } from "express";
import { BD } from "../../db.js";
import multer from "multer";
import { randomUUID } from "node:crypto";

import {
  supabase,
  bucketDocumentos,
} from "../../config/supabase.js";

import {
  autenticarToken,
  autenticarAdministrador,
  autenticarInstituicao,
} from "../middlewares/Autenticacao.js";

const router = Router();

// ============================================
// VALIDAÇÕES
// ============================================

function idValido(valor) {
  const numero = Number(valor);

  return Number.isSafeInteger(numero) && numero > 0;
}

function tipoAcessoNormalizado(usuario) {
  const tipo = String(
    usuario?.tipo_acesso_normalizado ??
    usuario?.tipo_acesso ??
    ""
  )
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (tipo.includes("admin")) return "administrador";

  if (
    tipo === "instituicao" ||
    tipo.includes("institucional")
  ) {
    return "instituicao";
  }

  return "";
}

function obterIdInstituicaoUsuario(req) {
  const id = Number(
    req.instituicao?.id_instituicao ??
    req.usuario?.id_instituicao
  );

  return idValido(id) ? id : null;
}


function textoValido(valor) {
  return typeof valor === "string" && valor.trim().length > 0;
}

const tiposPermitidos = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const extensoesPorTipo = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

const statusPermitidos = [
  "pendente",
  "em andamento",
  "aprovada",
  "recusada",
];

// ============================================
// MULTER
// ============================================

const uploadDocumentos = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 10,
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    if (!tiposPermitidos.includes(file.mimetype)) {
      return callback(
        new Error("Formato não permitido. Envie PDF, JPG ou PNG.")
      );
    }

    return callback(null, true);
  },
});

function receberDocumentos(req, res, next) {
  uploadDocumentos.array("documentos", 10)(
    req,
    res,
    (erro) => {
      if (!erro) return next();

      const mensagem =
        erro.code === "LIMIT_FILE_SIZE"
          ? "Cada arquivo deve ter no máximo 10 MB."
          : erro.code === "LIMIT_FILE_COUNT"
            ? "Você pode enviar no máximo 10 arquivos."
            : erro.message ||
              "Não foi possível receber os documentos.";

      return res.status(400).json({
        error: mensagem,
      });
    }
  );
}

// ============================================
// SUPABASE STORAGE
// ============================================

async function enviarArquivoSupabase(arquivo, idInstituicao) {
  const extensao = extensoesPorTipo[arquivo.mimetype];

  if (!extensao) {
    throw new Error(
      `Tipo de arquivo não permitido: ${arquivo.mimetype}`
    );
  }

  const nomeArquivo = `${randomUUID()}${extensao}`;

  const caminho =
    `solicitacoes/${idInstituicao}/${nomeArquivo}`;

  const { data, error } = await supabase.storage
    .from(bucketDocumentos)
    .upload(caminho, arquivo.buffer, {
      contentType: arquivo.mimetype,
      upsert: false,
    });

  if (error) {
    console.error("Falha no upload para o Supabase:", {
      message: error.message,
      statusCode: error.statusCode,
      bucket: bucketDocumentos,
      caminho,
    });

    throw new Error("Falha ao enviar documento para o armazenamento.");
  }

  return data?.path || caminho;
}

async function removerArquivosSupabase(caminhos = []) {
  if (!caminhos.length) return;

  const { error } = await supabase.storage
    .from(bucketDocumentos)
    .remove(caminhos);

  if (error) {
    console.error("Erro ao remover arquivos do Supabase:", {
      message: error.message,
      bucket: bucketDocumentos,
      quantidade: caminhos.length,
    });
  }
}

// ============================================
// GET - LISTAR SOLICITAÇÕES
// Administrador: todas.
// Instituição: somente as próprias.
// ============================================

router.get(
  "/solicitacoes",
  autenticarToken,
  async (req, res) => {
    try {
      const tipoAcesso =
        req.usuario?.tipo_acesso_normalizado;

      if (tipoAcesso === "administrador") {
        const resultado = await BD.query(`
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
            ON i.id_instituicao = s.id_instituicao
          ORDER BY
            s.data_pedido DESC NULLS LAST,
            s.id_solicitacoes DESC
        `);

        return res.status(200).json(resultado.rows);
      }

      if (tipoAcesso === "instituicao") {
        const idInstituicao = Number(
          req.usuario?.id_instituicao
        );

        if (!idValido(idInstituicao)) {
          return res.status(403).json({
            message: "Instituição não identificada.",
          });
        }

        const resultado = await BD.query(
          `
            SELECT
              id_solicitacoes,
              titulo,
              descricao,
              prioridade,
              setor,
              status,
              id_instituicao,
              data_pedido
            FROM solicitacoes
            WHERE id_instituicao = $1
            ORDER BY
              data_pedido DESC NULLS LAST,
              id_solicitacoes DESC
          `,
          [idInstituicao]
        );

        return res.status(200).json(resultado.rows);
      }

      return res.status(403).json({
        message: "Perfil sem permissão para consultar solicitações.",
      });
    } catch (error) {
      console.error("Erro ao listar solicitações:", error.message);

      return res.status(500).json({
        message: "Erro ao listar solicitações.",
      });
    }
  }
);

// ============================================
// GET - LISTAR SOLICITAÇÕES DA INSTITUIÇÃO
// Mantém compatibilidade com o endpoint existente.
// ============================================

router.get(
  "/solicitacoes/instituicoes",
  autenticarToken,
  autenticarInstituicao,
  async (req, res) => {
    try {
      const resultado = await BD.query(
        `
          SELECT
            id_solicitacoes,
            titulo,
            descricao,
            prioridade,
            setor,
            status,
            id_instituicao,
            data_pedido
          FROM solicitacoes
          WHERE id_instituicao = $1
          ORDER BY
            data_pedido DESC NULLS LAST,
            id_solicitacoes DESC
        `,
        [req.instituicao.id_instituicao]
      );

      return res.status(200).json(resultado.rows);
    } catch (error) {
      console.error(
        "Erro ao listar solicitações da instituição:",
        error.message
      );

      return res.status(500).json({
        message: "Erro ao consultar solicitações.",
      });
    }
  }
);

// ============================================
// GET - FILTRAR POR PRIORIDADE
// Somente administrador.
// ============================================

router.get(
  "/solicitacoes/prioridade/:prioridade",
  autenticarToken,
  autenticarAdministrador,
  async (req, res) => {
    try {
      const resultado = await BD.query(
        `
          SELECT
            s.*,
            i.nome AS nome_instituicao
          FROM solicitacoes s
          LEFT JOIN instituicoes i
            ON i.id_instituicao = s.id_instituicao
          WHERE LOWER(s.prioridade) = LOWER($1)
          ORDER BY s.data_pedido DESC NULLS LAST
        `,
        [req.params.prioridade]
      );

      return res.status(200).json(resultado.rows);
    } catch (error) {
      console.error("Erro ao filtrar por prioridade:", error.message);

      return res.status(500).json({
        error: "Erro ao filtrar por prioridade.",
      });
    }
  }
);

// ============================================
// GET - FILTRAR POR SETOR
// Somente administrador.
// ============================================

router.get(
  "/solicitacoes/setor/:setor",
  autenticarToken,
  autenticarAdministrador,
  async (req, res) => {
    try {
      const resultado = await BD.query(
        `
          SELECT
            s.*,
            i.nome AS nome_instituicao
          FROM solicitacoes s
          LEFT JOIN instituicoes i
            ON i.id_instituicao = s.id_instituicao
          WHERE LOWER(s.setor) = LOWER($1)
          ORDER BY s.data_pedido DESC NULLS LAST
        `,
        [req.params.setor]
      );

      return res.status(200).json(resultado.rows);
    } catch (error) {
      console.error("Erro ao filtrar por setor:", error.message);

      return res.status(500).json({
        error: "Erro ao filtrar por setor.",
      });
    }
  }
);

// ============================================
// GET - FILTRAR POR STATUS
// Somente administrador.
// ============================================

router.get(
  "/solicitacoes/status/:status",
  autenticarToken,
  autenticarAdministrador,
  async (req, res) => {
    try {
      const resultado = await BD.query(
        `
          SELECT
            s.*,
            i.nome AS nome_instituicao
          FROM solicitacoes s
          LEFT JOIN instituicoes i
            ON i.id_instituicao = s.id_instituicao
          WHERE LOWER(s.status) = LOWER($1)
          ORDER BY s.data_pedido DESC NULLS LAST
        `,
        [req.params.status]
      );

      return res.status(200).json(resultado.rows);
    } catch (error) {
      console.error("Erro ao filtrar por status:", error.message);

      return res.status(500).json({
        error: "Erro ao filtrar por status.",
      });
    }
  }
);

// ============================================
// POST - CADASTRAR SOLICITAÇÃO PELO ADMINISTRADOR
// ============================================

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
    } = req.body || {};

    if (
      !textoValido(titulo) ||
      !textoValido(descricao) ||
      !textoValido(prioridade) ||
      !textoValido(setor) ||
      !idValido(id_instituicao)
    ) {
      return res.status(400).json({
        error: "Preencha os dados obrigatórios.",
      });
    }

    const statusFinal = String(status || "pendente")
      .trim()
      .toLowerCase();

    if (!statusPermitidos.includes(statusFinal)) {
      return res.status(400).json({
        error: "Status inválido.",
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
          statusFinal,
          data_pedido || new Date(),
          Number(id_instituicao),
        ]
      );

      return res.status(201).json({
        message: "Solicitação cadastrada com sucesso.",
        solicitacao: resultado.rows[0],
      });
    } catch (error) {
      console.error("Erro ao cadastrar solicitação:", error.message);

      return res.status(500).json({
        error: "Erro ao cadastrar solicitação.",
      });
    }
  }
);

// ============================================
// POST - CADASTRAR SOLICITAÇÃO DA INSTITUIÇÃO
// Inclui upload opcional de documentos.
// ============================================

router.post(
  "/solicitacoes/instituicoes",
  autenticarToken,
  autenticarInstituicao,
  receberDocumentos,
  async (req, res) => {
    const {
      titulo,
      descricao,
      prioridade,
      setor,
      status,
      data_pedido,
    } = req.body || {};

    const arquivos = req.files || [];
    const idInstituicao = Number(
      req.instituicao.id_instituicao
    );

    if (
      !textoValido(titulo) ||
      !textoValido(descricao) ||
      !textoValido(prioridade) ||
      !textoValido(setor)
    ) {
      return res.status(400).json({
        error: "Preencha os dados obrigatórios.",
      });
    }

    // A instituição não pode escolher um status privilegiado.
    const statusFinal = "pendente";

    let cliente;
    let transacaoIniciada = false;
    const caminhosEnviados = [];

    try {
      cliente = await BD.connect();

      await cliente.query("BEGIN");
      transacaoIniciada = true;

      const resultado = await cliente.query(
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
          statusFinal,
          data_pedido || new Date(),
          idInstituicao,
        ]
      );

      const solicitacao = resultado.rows[0];
      const documentosCadastrados = [];

      for (const arquivo of arquivos) {
        const caminho = await enviarArquivoSupabase(
          arquivo,
          idInstituicao
        );

        caminhosEnviados.push(caminho);

        const documento = await cliente.query(
          `
            INSERT INTO documentos (
              nome_arquivo,
              caminho,
              tipo,
              id_solicitacao
            )
            VALUES ($1, $2, $3, $4)
            RETURNING
              id_documento,
              nome_arquivo,
              caminho,
              tipo,
              id_solicitacao
          `,
          [
            arquivo.originalname,
            caminho,
            arquivo.mimetype,
            solicitacao.id_solicitacoes,
          ]
        );

        documentosCadastrados.push(documento.rows[0]);
      }

      await cliente.query("COMMIT");
      transacaoIniciada = false;

      return res.status(201).json({
        message: "Solicitação cadastrada com sucesso.",
        solicitacao,
        documentos_cadastrados: documentosCadastrados.length,
        documentos: documentosCadastrados,
      });
    } catch (error) {
      if (cliente && transacaoIniciada) {
        await cliente.query("ROLLBACK").catch((erroRollback) => {
          console.error(
            "Erro ao desfazer transação:",
            erroRollback.message
          );
        });
      }

      await removerArquivosSupabase(caminhosEnviados);

      console.error("Erro ao cadastrar solicitação institucional:", {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack,
      });

      return res.status(500).json({
        error: "Erro ao cadastrar solicitação ou documentos.",
      });
    } finally {
      cliente?.release();
    }
  }
);

// ============================================
// PATCH - ATUALIZAR STATUS E REGISTRAR HISTÓRICO
// Somente administrador.
// ============================================

router.patch(
  "/solicitacoes/:id_solicitacoes/status",
  autenticarToken,
  autenticarAdministrador,
  async (req, res) => {
    const id = Number(req.params.id_solicitacoes);

    const novoStatus = String(req.body?.status || "")
      .trim()
      .toLowerCase();

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
    let transacaoIniciada = false;

    try {
      cliente = await BD.connect();

      await cliente.query("BEGIN");
      transacaoIniciada = true;

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
        transacaoIniciada = false;

        return res.status(404).json({
          error: "Solicitação não encontrada.",
        });
      }

      const anterior = consulta.rows[0];

      if (
        String(anterior.status).trim().toLowerCase() === novoStatus
      ) {
        await cliente.query("ROLLBACK");
        transacaoIniciada = false;

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
      transacaoIniciada = false;

      return res.status(200).json({
        message: "Status atualizado com sucesso.",
        solicitacao: atualizado.rows[0],
      });
    } catch (error) {
      if (cliente && transacaoIniciada) {
        await cliente.query("ROLLBACK").catch(() => {});
      }

      console.error("Erro ao atualizar solicitação:", error.message);

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
// Somente administrador.
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
    } = req.body || {};

    if (
      !textoValido(titulo) ||
      !textoValido(descricao) ||
      !textoValido(prioridade) ||
      !textoValido(setor) ||
      !textoValido(status) ||
      !data_pedido ||
      !idValido(id_instituicao)
    ) {
      return res.status(400).json({
        error: "Informe todos os campos da solicitação.",
      });
    }

    const statusFinal = status.trim().toLowerCase();

    if (!statusPermitidos.includes(statusFinal)) {
      return res.status(400).json({
        error: "Status inválido.",
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
          statusFinal,
          data_pedido,
          Number(id_instituicao),
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
      console.error("Erro ao atualizar solicitação:", error.message);

      return res.status(500).json({
        error: "Erro ao atualizar solicitação.",
      });
    }
  }
);

// ============================================
// DELETE - EXCLUIR SOLICITAÇÃO
// Somente administrador.
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
      console.error("Erro ao excluir solicitação:", error.message);

      return res.status(500).json({
        error:
          "Não foi possível excluir a solicitação. Verifique se existem registros vinculados.",
      });
    }
  }
);

// ============================================
// DELETE - EXCLUIR SOLICITAÇÃO DA INSTITUIÇÃO
// Somente a própria instituição.
// ============================================
router.delete(
  "/instituicao/solicitacoes/:id_solicitacoes",
  autenticarToken,
  autenticarInstituicao,
  async (req, res) => {
    const id = Number(req.params.id_solicitacoes);
    const idInstituicao = Number(
      req.instituicao.id_instituicao
    );

    if (!idValido(id)) {
      return res.status(400).json({
        error: "ID inválido.",
      });
    }

    let cliente;

    try {
      cliente = await BD.connect();
      await cliente.query("BEGIN");

      const consulta = await cliente.query(
        `SELECT id_solicitacoes
         FROM solicitacoes
         WHERE id_solicitacoes = $1
           AND id_instituicao = $2
         FOR UPDATE`,
        [id, idInstituicao]
      );

      if (!consulta.rows.length) {
        await cliente.query("ROLLBACK");

        return res.status(404).json({
          error:
            "Solicitação não encontrada ou não pertence à sua instituição.",
        });
      }

      await cliente.query(
        `DELETE FROM documentos
         WHERE id_solicitacao = $1`,
        [id]
      );

      await cliente.query(
        `DELETE FROM historico_solicitacoes
         WHERE id_solicitacao = $1`,
        [id]
      );

      await cliente.query(
        `DELETE FROM solicitacoes
         WHERE id_solicitacoes = $1
           AND id_instituicao = $2`,
        [id, idInstituicao]
      );

      await cliente.query("COMMIT");

      return res.status(200).json({
        message: "Solicitação excluída com sucesso.",
      });
    } catch (error) {
      if (cliente) {
        await cliente.query("ROLLBACK").catch(() => {});
      }

      console.error(
        "Erro ao excluir solicitação da instituição:",
        error.message
      );

      return res.status(500).json({
        error: "Não foi possível excluir a solicitação.",
      });
    } finally {
      cliente?.release();
    }
  }
);

// ============================================
// GET - LISTAR DOCUMENTOS DE UMA SOLICITAÇÃO
// Somente administrador.
// ============================================


router.get(
  "/solicitacoes/:id_solicitacoes/documentos",
  autenticarToken,
  async (req, res) => {
    const id = Number(req.params.id_solicitacoes);
    const tipo = tipoAcessoNormalizado(req.usuario);
    const idInstituicao = obterIdInstituicaoUsuario(req);

    if (!idValido(id)) {
      return res.status(400).json({
        error: "ID da solicitação inválido.",
      });
    }

    if (
      tipo !== "administrador" &&
      tipo !== "instituicao"
    ) {
      return res.status(403).json({
        error: "Perfil sem permissão para consultar documentos.",
      });
    }

    if (tipo === "instituicao" && !idInstituicao) {
      return res.status(403).json({
        error: "Instituição não identificada.",
      });
    }

    try {
      const parametros = [id];
      let filtroInstituicao = "";

      if (tipo === "instituicao") {
        parametros.push(idInstituicao);
        filtroInstituicao = "AND s.id_instituicao = $2";
      }

      const resultado = await BD.query(
        `
          SELECT
            d.id_documento,
            d.nome_arquivo,
            d.tipo,
            d.id_solicitacao
          FROM documentos d
          INNER JOIN solicitacoes s
            ON s.id_solicitacoes = d.id_solicitacao
          WHERE s.id_solicitacoes = $1
          ${filtroInstituicao}
          ORDER BY d.id_documento ASC
        `,
        parametros
      );

      return res.status(200).json({
        documentos: resultado.rows,
      });
    } catch (error) {
      console.error(
        "Erro ao listar documentos da solicitação:",
        error.message
      );

      return res.status(500).json({
        error: "Não foi possível listar os documentos.",
      });
    }
  }
);


router.get(
  "/documentos/solicitacao/:id_solicitacoes",
  autenticarToken,
  async (req, res) => {
    const id = Number(req.params.id_solicitacoes);
    const tipo = tipoAcessoNormalizado(req.usuario);
    const idInstituicao = obterIdInstituicaoUsuario(req);

    if (!idValido(id)) {
      return res.status(400).json({
        error: "ID da solicitação inválido.",
      });
    }

    if (
      tipo !== "administrador" &&
      tipo !== "instituicao"
    ) {
      return res.status(403).json({
        error: "Perfil sem permissão para consultar documentos.",
      });
    }

    if (tipo === "instituicao" && !idInstituicao) {
      return res.status(403).json({
        error: "Instituição não identificada.",
      });
    }

    try {
      const parametros = [id];
      let filtroInstituicao = "";

      if (tipo === "instituicao") {
        parametros.push(idInstituicao);
        filtroInstituicao = "AND s.id_instituicao = $2";
      }

      const resultado = await BD.query(
        `
          SELECT
            d.id_documento,
            d.nome_arquivo,
            d.tipo,
            d.id_solicitacao
          FROM documentos d
          INNER JOIN solicitacoes s
            ON s.id_solicitacoes = d.id_solicitacao
          WHERE s.id_solicitacoes = $1
          ${filtroInstituicao}
          ORDER BY d.id_documento ASC
        `,
        parametros
      );

      return res.status(200).json(resultado.rows);
    } catch (error) {
      console.error(
        "Erro ao consultar documentos:",
        error.message
      );

      return res.status(500).json({
        error: "Não foi possível consultar os documentos.",
      });
    }
  }
);


// ============================================
// GET - DOWNLOAD SEGURO DE DOCUMENTO
// Somente administrador.
// ============================================


router.get(
  "/documentos/:id_documento/download",
  autenticarToken,
  async (req, res) => {
    const idDocumento = Number(req.params.id_documento);
    const tipo = tipoAcessoNormalizado(req.usuario);
    const idInstituicao = obterIdInstituicaoUsuario(req);

    if (!idValido(idDocumento)) {
      return res.status(400).json({
        error: "ID do documento inválido.",
      });
    }

    if (
      tipo !== "administrador" &&
      tipo !== "instituicao"
    ) {
      return res.status(403).json({
        error: "Perfil sem permissão para baixar documentos.",
      });
    }

    if (tipo === "instituicao" && !idInstituicao) {
      return res.status(403).json({
        error: "Instituição não identificada.",
      });
    }

    try {
      const parametros = [idDocumento];
      let filtroInstituicao = "";

      if (tipo === "instituicao") {
        parametros.push(idInstituicao);
        filtroInstituicao = "AND s.id_instituicao = $2";
      }

      const resultado = await BD.query(
        `
          SELECT
            d.id_documento,
            d.nome_arquivo,
            d.caminho,
            d.tipo
          FROM documentos d
          INNER JOIN solicitacoes s
            ON s.id_solicitacoes = d.id_solicitacao
          WHERE d.id_documento = $1
          ${filtroInstituicao}
          LIMIT 1
        `,
        parametros
      );

      if (!resultado.rows.length) {
        return res.status(404).json({
          error: "Documento não encontrado ou sem acesso.",
        });
      }

      const documento = resultado.rows[0];

      if (!documento.caminho) {
        return res.status(404).json({
          error: "O documento não possui um caminho armazenado.",
        });
      }

      const { data, error } = await supabase.storage
        .from(bucketDocumentos)
        .createSignedUrl(
          documento.caminho,
          60,
          {
            download: documento.nome_arquivo,
          }
        );

      if (error || !data?.signedUrl) {
        console.error(
          "Erro ao gerar URL de download:",
          error?.message
        );

        return res.status(502).json({
          error: "Não foi possível preparar o download.",
        });
      }

      return res.status(200).json({
        url: data.signedUrl,
        nome_arquivo: documento.nome_arquivo,
      });
    } catch (error) {
      console.error(
        "Erro ao preparar download:",
        error.message
      );

      return res.status(500).json({
        error: "Erro ao preparar o download do documento.",
      });
    }
  }
);


export default router;
