
import { Router } from "express";
import { BD } from "../../db.js";

import {
    autenticarToken,
    autenticarAdministrador,
} from "../middlewares/Autenticacao.js";

const router = Router();

router.use(autenticarToken, autenticarAdministrador);

function idDoAdministrador(req) {
    const id = Number(req.usuario?.id_administrador);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

const CAMPOS = `
  id_administrador,
  nome,
  email,
  foto_perfil
`;

// CONSULTAR O PRÓPRIO PERFIL
router.get("/perfil-administrador", async (req, res) => {
    const id = idDoAdministrador(req);

    if (!id) {
        return res.status(403).json({
            message: "Administrador não identificado.",
        });
    }

    try {
        const resultado = await BD.query(
            `SELECT ${CAMPOS}
       FROM administradores
       WHERE id_administrador = $1`,
            [id]
        );

        if (!resultado.rows.length) {
            return res.status(404).json({
                message: "Administrador não encontrado.",
            });
        }

        return res.json(resultado.rows[0]);
    } catch (error) {
        console.error("Erro ao consultar perfil:", error.message);

        return res.status(500).json({
            message: "Erro ao consultar perfil.",
        });
    }
});

// ATUALIZAR NOME E E-MAIL
router.patch("/perfil-administrador", async (req, res) => {
    const id = idDoAdministrador(req);

    if (!id) {
        return res.status(403).json({
            message: "Administrador não identificado.",
        });
    }

    const nome = req.body?.nome;
    const email = req.body?.email;

    if (
        typeof nome !== "string" ||
        !nome.trim() ||
        nome.trim().length > 150 ||
        typeof email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        email.trim().length > 150
    ) {
        return res.status(400).json({
            message: "Informe um nome e um e-mail válidos.",
        });
    }

    try {
        const resultado = await BD.query(
            `
      UPDATE administradores
      SET nome = $1, email = $2
      WHERE id_administrador = $3
      RETURNING ${CAMPOS}
      `,
            [nome.trim(), email.trim().toLowerCase(), id]
        );

        if (!resultado.rows.length) {
            return res.status(404).json({
                message: "Administrador não encontrado.",
            });
        }

        return res.json({
            message: "Perfil atualizado com sucesso!",
            administrador: resultado.rows[0],
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                message: "Este e-mail já está cadastrado.",
            });
        }

        console.error("Erro ao atualizar perfil:", error.message);

        return res.status(500).json({
            message: "Erro ao atualizar perfil.",
        });
    }
});

// ENVIAR / ALTERAR FOTO
router.patch("/perfil-administrador/foto", async (req, res) => {
    const id = idDoAdministrador(req);

    if (!id) {
        return res.status(403).json({
            message: "Administrador não identificado.",
        });
    }

    const foto = req.body?.foto;

    if (
        typeof foto !== "string" ||
        foto.length > 600000
    ) {
        return res.status(400).json({
            message: "Imagem inválida ou muito grande.",
        });
    }

    const correspondencia = foto.match(
        /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/
    );

    if (!correspondencia) {
        return res.status(400).json({
            message: "Formato de imagem inválido.",
        });
    }

    const tipo = correspondencia[1];
    const base64 = correspondencia[2];
    const buffer = Buffer.from(base64, "base64");

    const ehJPEG =
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff;

    const ehPNG =
        buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(
            Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
        );

    const ehWEBP =
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP";

    if (
        buffer.length === 0 ||
        buffer.length > 400 * 1024 ||
        (tipo === "jpeg" && !ehJPEG) ||
        (tipo === "png" && !ehPNG) ||
        (tipo === "webp" && !ehWEBP)
    ) {
        return res.status(400).json({
            message: "A imagem é inválida ou ultrapassa 400 KB.",
        });
    }

    try {
        const resultado = await BD.query(
            `
      UPDATE administradores
      SET foto_perfil = $1
      WHERE id_administrador = $2
      RETURNING ${CAMPOS}
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
            administrador: resultado.rows[0],
        });
    } catch (error) {
        console.error("Erro ao salvar foto:", error.message);

        return res.status(500).json({
            message: "Erro ao salvar foto.",
        });
    }
});

// REMOVER FOTO
router.delete("/perfil-administrador/foto", async (req, res) => {
    const id = idDoAdministrador(req);

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
      RETURNING ${CAMPOS}
      `,
            [id]
        );

        if (!resultado.rows.length) {
            return res.status(404).json({
                message: "Administrador não encontrado.",
            });
        }

        return res.json({
            message: "Foto removida com sucesso!",
            administrador: resultado.rows[0],
        });
    } catch (error) {
        console.error("Erro ao remover foto:", error.message);

        return res.status(500).json({
            message: "Erro ao remover foto.",
        });
    }
});

export default router;
