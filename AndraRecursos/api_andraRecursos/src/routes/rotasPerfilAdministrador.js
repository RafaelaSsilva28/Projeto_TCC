
import { Router } from "express";
import { BD } from "../../db.js";

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

const CONSULTA = `
  SELECT
    a.id_administrador,
    a.nome,
    a.email,
    a.foto_perfil,
    d.razao_social,
    d.cnpj,
    d.gabinete,
    d.telefone,
    d.endereco
  FROM administradores a
  LEFT JOIN dados_institucionais_administrador d
    ON d.id_administrador = a.id_administrador
  WHERE a.id_administrador = $1
`;

async function buscarPerfil(id) {
    const resultado = await BD.query(CONSULTA, [id]);
    return resultado.rows[0] || null;
}

// ============================================
// GET - PERFIL
// ============================================
router.get("/perfil-administrador", async (req, res) => {
    const id = obterId(req);

    if (!id) {
        return res.status(403).json({
            message: "Administrador não identificado.",
        });
    }

    try {
        const perfil = await buscarPerfil(id);

        if (!perfil) {
            return res.status(404).json({
                message: "Administrador não encontrado.",
            });
        }

        return res.json(perfil);
    } catch (error) {
        console.error("Erro ao consultar perfil:", error.message);

        return res.status(500).json({
            message: "Erro ao consultar perfil.",
        });
    }
});

// ============================================
// PATCH - NOME + DADOS INSTITUCIONAIS
// ============================================
router.patch("/perfil-administrador", async (req, res) => {
    const id = obterId(req);

    if (!id) {
        return res.status(403).json({
            message: "Administrador não identificado.",
        });
    }

    const {
        nome,
        razao_social,
        cnpj,
        gabinete,
        telefone,
        endereco,
    } = req.body || {};

    const campos = [
        ["nome", nome, 150],
        ["razao_social", razao_social, 200],
        ["cnpj", cnpj, 18],
        ["gabinete", gabinete, 150],
        ["telefone", telefone, 25],
        ["endereco", endereco, 300],
    ];

    if (
        campos.some(
            ([, valor, limite]) =>
                typeof valor !== "string" ||
                !valor.trim() ||
                valor.trim().length > limite
        )
    ) {
        return res.status(400).json({
            message: "Preencha corretamente todos os campos.",
        });
    }

    const cnpjLimpo = cnpj.replace(/\D/g, "");

    if (cnpjLimpo.length !== 14) {
        return res.status(400).json({
            message: "O CNPJ deve conter 14 dígitos.",
        });
    }

    const cliente = await BD.connect().catch(() => null);

    if (!cliente) {
        return res.status(500).json({
            message: "Não foi possível iniciar a atualização.",
        });
    }

    try {
        await cliente.query("BEGIN");

        const atualizacao = await cliente.query(
            `
      UPDATE administradores
      SET nome = $1
      WHERE id_administrador = $2
      RETURNING id_administrador
      `,
            [nome.trim(), id]
        );

        if (!atualizacao.rows.length) {
            await cliente.query("ROLLBACK");

            return res.status(404).json({
                message: "Administrador não encontrado.",
            });
        }

        await cliente.query(
            `
      INSERT INTO dados_institucionais_administrador (
        id_administrador,
        razao_social,
        cnpj,
        gabinete,
        telefone,
        endereco
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id_administrador)
      DO UPDATE SET
        razao_social = EXCLUDED.razao_social,
        cnpj = EXCLUDED.cnpj,
        gabinete = EXCLUDED.gabinete,
        telefone = EXCLUDED.telefone,
        endereco = EXCLUDED.endereco,
        atualizado_em = CURRENT_TIMESTAMP
      `,
            [
                id,
                razao_social.trim(),
                cnpj.trim(),
                gabinete.trim(),
                telefone.trim(),
                endereco.trim(),
            ]
        );

        await cliente.query("COMMIT");

        const perfil = await buscarPerfil(id);

        return res.json({
            message: "Dados atualizados com sucesso!",
            administrador: perfil,
        });
    } catch (error) {
        await cliente.query("ROLLBACK").catch(() => { });

        console.error("Erro ao atualizar perfil:", error.message);

        return res.status(500).json({
            message: "Erro ao atualizar os dados.",
        });
    } finally {
        cliente.release();
    }
});

// ============================================
// VALIDAÇÃO DE IMAGEM
// ============================================
function validarImagem(foto) {
    if (typeof foto !== "string" || foto.length > 600000) {
        return false;
    }

    const correspondencia = foto.match(
        /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/
    );

    if (!correspondencia) return false;

    const tipo = correspondencia[1];
    const buffer = Buffer.from(correspondencia[2], "base64");

    if (!buffer.length || buffer.length > 400 * 1024) {
        return false;
    }

    const jpeg =
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff;

    const png =
        buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(
            Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
        );

    const webp =
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP";

    return (
        (tipo === "jpeg" && jpeg) ||
        (tipo === "png" && png) ||
        (tipo === "webp" && webp)
    );
}

// ============================================
// PATCH - SALVAR FOTO
// ============================================
router.patch("/perfil-administrador/foto", async (req, res) => {
    const id = obterId(req);
    const foto = req.body?.foto;

    if (!id) {
        return res.status(403).json({
            message: "Administrador não identificado.",
        });
    }

    if (!validarImagem(foto)) {
        return res.status(400).json({
            message: "Envie uma imagem JPG, PNG ou WebP de até 400 KB.",
        });
    }

    try {
        const resultado = await BD.query(
            `
      UPDATE administradores
      SET foto_perfil = $1
      WHERE id_administrador = $2
      RETURNING id_administrador
      `,
            [foto, id]
        );

        if (!resultado.rows.length) {
            return res.status(404).json({
                message: "Administrador não encontrado.",
            });
        }

        return res.json({
            message: "Foto atualizada com sucesso!",
            administrador: await buscarPerfil(id),
        });
    } catch (error) {
        console.error("Erro ao salvar foto:", error.message);

        return res.status(500).json({
            message: "Erro ao salvar foto.",
        });
    }
});

// ============================================
// DELETE - REMOVER FOTO
// ============================================
router.delete("/perfil-administrador/foto", async (req, res) => {
    const id = obterId(req);

    if (!id) {
        return res.status(403).json({
            message: "Administrador não identificado.",
        });
    }

    try {
        const resultado = await BD.query(
            `
      UPDATE administradores
      SET foto_perfil = NULL
      WHERE id_administrador = $1
      RETURNING id_administrador
      `,
            [id]
        );

        if (!resultado.rows.length) {
            return res.status(404).json({
                message: "Administrador não encontrado.",
            });
        }

        return res.json({
            message: "Foto removida!",
            administrador: await buscarPerfil(id),
        });
    } catch (error) {
        console.error("Erro ao remover foto:", error.message);

        return res.status(500).json({
            message: "Erro ao remover foto.",
        });
    }
});

export default router;
