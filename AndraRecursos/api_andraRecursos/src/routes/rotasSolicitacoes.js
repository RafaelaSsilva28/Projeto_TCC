
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
} from "../middlewares/Autenticacao.js";

const router = Router();

// ============================================
// VALIDAÇÕES
// ============================================

function idValido(valor) {
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0;
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

// ============================================
// CONFIGURAÇÃO DO MULTER
// Arquivos mantidos temporariamente na memória.
// Não utiliza a pasta uploads da Vercel.
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

    callback(null, true);
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

async function enviarArquivoSupabase(
  arquivo,
  idInstituicao
) {
  const extensao = extensoesPorTipo[arquivo.mimetype];

  if (!extensao) {
    throw new Error(
      `Tipo de arquivo não permitido: ${arquivo.mimetype}`
    );
  }

  const nomeArquivo = `${randomUUID()}${extensao}`;

  const caminho =
    `solicitacoes/${idInstituicao}/${nomeArquivo}`;

  console.log("Iniciando upload para o Supabase:", {
    bucket: bucketDocumentos,
    caminho,
    tipo: arquivo.mimetype,
    tamanhoBytes: arquivo.size,
  });

  const { data, error } = await supabase.storage
    .from(bucketDocumentos)
    .upload(caminho, arquivo.buffer, {
      contentType: arquivo.mimetype,
      upsert: false,
    });

  if (error) {
    console.error("Falha no upload para o Supabase:", {
      message: error.message,
      name: error.name,
      status: error.status,
      statusCode: error.statusCode,
      bucket: bucketDocumentos,
      caminho,
    });

    // O erro original fica registrado nos logs da Vercel.
    // A resposta enviada ao cliente não expõe detalhes internos.
    throw new Error(
      `Falha no Supabase Storage: ${error.message}`
    );
  }

  console.log("Upload concluído no Supabase:", {
    bucket: bucketDocumentos,
    caminho: data?.path || caminho,
  });

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
      name: error.name,
      status: error.status,
      statusCode: error.statusCode,
      bucket: bucketDocumentos,
      quantidade: caminhos.length,
    });
  }
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
          ON s.id_instituicao = i.id_instituicao
        ORDER BY
          s.data_pedido DESC NULLS LAST,
          s.id_solicitacoes DESC
      `);

      return res.status(200).json(resultado.rows);
    } catch (error) {
      console.error("Erro ao listar solicitações:", error.message);

      return res.status(500).json({
        error: "Erro ao listar solicitações.",
      });
    }
  }
);

// ============================================
// GET - LISTAR SOLICITAÇÕES DA INSTITUIÇÃO
// ============================================

router.get(
  "/solicitacoes/instituicoes",
  autenticarToken,
  async (req, res) => {
    const idInstituicao = req.usuario?.id_instituicao;

    if (
      req.usuario?.tipo_acesso !== "instituicao" ||
      !idValido(idInstituicao)
    ) {
      return res.status(403).json({
        message: "Acesso exclusivo da instituição.",
      });
    }

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
      console.error(
        "Erro ao filtrar por prioridade:",
        error.message
      );

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
      console.error(
        "Erro ao filtrar por setor:",
        error.message
      );

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
      console.error(
        "Erro ao filtrar por status:",
        error.message
      );

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
// POST - CADASTRAR SOLICITAÇÃO DA INSTITUIÇÃO
// COM DOCUMENTOS NO SUPABASE STORAGE
// ============================================

router.post(
  "/solicitacoes/instituicoes",
  autenticarToken,
  receberDocumentos,
  async (req, res) => {
    const {
      titulo,
      descricao,
      prioridade,
      setor,
      status,
      data_pedido,
    } = req.body;

    const arquivos = req.files || [];
    const idInstituicao = req.usuario?.id_instituicao;

    if (
      req.usuario?.tipo_acesso !== "instituicao" ||
      !idValido(idInstituicao)
    ) {
      return res.status(403).json({
        error: "Acesso exclusivo da instituição.",
      });
    }

    if (
      !titulo?.trim() ||
      !descricao?.trim() ||
      !prioridade?.trim() ||
      !setor?.trim()
    ) {
      return res.status(400).json({
        error: "Preencha os dados obrigatórios.",
      });
    }

    let cliente;
    let transacaoIniciada = false;
    const caminhosEnviados = [];

    try {
      // 1. Conecta ao banco Neon.
      console.log("Conectando ao banco para cadastrar solicitação.");

      cliente = await BD.connect();

      await cliente.query("BEGIN");
      transacaoIniciada = true;

      // 2. Cadastra a solicitação no Neon.
      console.log("Inserindo solicitação no banco.");

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
          status || "pendente",
          data_pedido || new Date(),
          idInstituicao,
        ]
      );

      const solicitacao = resultado.rows[0];
      const documentosCadastrados = [];

      // 3. Envia documentos e salva seus metadados.
      for (const arquivo of arquivos) {
        console.log("Processando documento:", {
          nome: arquivo.originalname,
          tipo: arquivo.mimetype,
          tamanhoBytes: arquivo.size,
        });

        const caminho = await enviarArquivoSupabase(
          arquivo,
          idInstituicao
        );

        caminhosEnviados.push(caminho);

        console.log("Registrando metadados do documento no Neon.");

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

      // 4. Confirma as alterações no banco.
      await cliente.query("COMMIT");
      transacaoIniciada = false;

      console.log("Solicitação cadastrada com sucesso:", {
        idSolicitacao: solicitacao.id_solicitacoes,
        quantidadeDocumentos: documentosCadastrados.length,
      });

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
            "Erro ao desfazer transação no Neon:",
            erroRollback.message
          );
        });
      }

      // Remove do Storage os arquivos enviados caso o banco falhe.
      await removerArquivosSupabase(caminhosEnviados);

      // Log detalhado para diagnóstico na Vercel.
      console.error(
        "Erro ao cadastrar solicitação da instituição:",
        {
          message: error.message,
          name: error.name,
          code: error.code,
          detail: error.detail,
          hint: error.hint,
          status: error.status,
          statusCode: error.statusCode,
          stack: error.stack,
        }
      );

      return res.status(500).json({
        error: "Erro ao cadastrar solicitação ou documentos.",
      });
    } finally {
      cliente?.release();
    }
  }
);

// ============================================
// PATCH - ATUALIZAR STATUS E HISTÓRICO
// ============================================

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
        String(anterior.status).toLowerCase().trim() === novoStatus
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
        await cliente.query("ROLLBACK").catch(() => {});
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
      console.error(
        "Erro ao atualizar solicitação:",
        error.message
      );

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
      console.error(
        "Erro ao excluir solicitação:",
        error.message
      );

      return res.status(500).json({
        error:
          "Não foi possível excluir a solicitação. Verifique se existem registros vinculados.",
      });
    }
  }
);

/* ============================================
   GET - LISTAR DOCUMENTOS DE UMA SOLICITAÇÃO
   Acesso exclusivo do administrador
============================================ */

router.get(
  "/solicitacoes/:id_solicitacoes/documentos",
  autenticarToken,
  autenticarAdministrador,
  async (req, res) => {
    const id = Number(req.params.id_solicitacoes);

    if (!idValido(id)) {
      return res.status(400).json({
        error: "ID da solicitação inválido.",
      });
    }

    try {
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
          ORDER BY d.id_documento ASC
        `,
        [id]
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

/* ============================================
   GET - GERAR DOWNLOAD SEGURO DO DOCUMENTO
   O arquivo permanece privado no Supabase
============================================ */

router.get(
  "/documentos/:id_documento/download",
  autenticarToken,
  autenticarAdministrador,
  async (req, res) => {
    const idDocumento = Number(req.params.id_documento);

    if (!idValido(idDocumento)) {
      return res.status(400).json({
        error: "ID do documento inválido.",
      });
    }

    try {
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
          LIMIT 1
        `,
        [idDocumento]
      );

      if (!resultado.rows.length) {
        return res.status(404).json({
          error: "Documento não encontrado.",
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
          error: "Não foi possível preparar o download do documento.",
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
