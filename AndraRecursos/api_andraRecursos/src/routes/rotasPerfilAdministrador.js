
import { Router } from "express";
import { BD } from "../../db.js";

import {
    autenticarToken,
    autenticarAdministrador,
} from "../middlewares/Autenticacao.js";

const router = Router();

router.use(autenticarToken, autenticarAdministrador);

// ============================================
// LOGS DA ROTA
// ============================================
router.use((req, res, next) => {
    console.log("[PERFIL ADMINISTRADOR]", {
        caminho: req.originalUrl,
        metodo: req.method,
        tipoAcesso: req.usuario?.tipo_acesso,
        idAdministrador: req.usuario?.id_administrador,
    });

    next();
});

// ============================================
// IDENTIFICAR ADMINISTRADOR
// ============================================
function obterId(req) {
    const id = Number(req.usuario?.id_administrador);

    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// ============================================
// CONSULTA DO PERFIL
// ============================================
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

async function buscarPerfil(id, executor = BD) {
    const resultado = await executor.query(CONSULTA, [id]);
    return resultado.rows[0] || null;
}

// ============================================
// GET - CONSULTAR PERFIL
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

        return res.json({
            administrador: perfil,
        });
    } catch (error) {
        console.error(
            "Erro ao consultar perfil:",
            error.message
        );

        return res.status(500).json({
            message: "Erro ao consultar perfil.",
        });
    }
});

// ============================================
// PATCH - ATUALIZAR DADOS PESSOAIS
// E/OU INSTITUCIONAIS
// ============================================
router.patch("/perfil-administrador", async (req, res) => {
    const id = obterId(req);

    if (!id) {
        return res.status(403).json({
            message: "Administrador não identificado.",
        });
    }

    const corpo = req.body || {};

    const camposPessoais = ["nome", "email"];

    const camposInstitucionais = [
        "razao_social",
        "cnpj",
        "gabinete",
        "telefone",
        "endereco",
    ];

    const camposPermitidos = [
        ...camposPessoais,
        ...camposInstitucionais,
    ];

    const recebidos = Object.keys(corpo);

    if (
        recebidos.length === 0 ||
        recebidos.some((campo) => !camposPermitidos.includes(campo))
    ) {
        return res.status(400).json({
            message: "Envie pelo menos um campo válido para atualizar.",
        });
    }

    const pessoaisEnviados = camposPessoais.filter(
        (campo) => Object.prototype.hasOwnProperty.call(corpo, campo)
    );

    const institucionaisEnviados = camposInstitucionais.filter(
        (campo) => Object.prototype.hasOwnProperty.call(corpo, campo)
    );

    const valores = {};

    // ========================================
    // VALIDAR CAMPOS PESSOAIS RECEBIDOS
    // ========================================
    for (const campo of pessoaisEnviados) {
        if (typeof corpo[campo] !== "string") {
            return res.status(400).json({
                message: `O campo ${campo} deve ser um texto válido.`,
            });
        }

        valores[campo] = corpo[campo].trim();
    }

    if (Object.prototype.hasOwnProperty.call(valores, "nome")) {
        if (!valores.nome) {
            return res.status(400).json({
                message: "Informe o nome do administrador.",
            });
        }

        if (valores.nome.length > 150) {
            return res.status(400).json({
                message: "O nome deve ter no máximo 150 caracteres.",
            });
        }
    }

    if (Object.prototype.hasOwnProperty.call(valores, "email")) {
        if (
            !valores.email ||
            valores.email.length > 200 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valores.email)
        ) {
            return res.status(400).json({
                message: "Informe um endereço de e-mail válido.",
            });
        }
    }

    // ========================================
    // VALIDAR CAMPOS INSTITUCIONAIS RECEBIDOS
    // ========================================
    if (institucionaisEnviados.length > 0) {
        const limites = {
            razao_social: 200,
            cnpj: 18,
            gabinete: 150,
            telefone: 25,
            endereco: 300,
        };

        for (const campo of institucionaisEnviados) {
            if (typeof corpo[campo] !== "string") {
                return res.status(400).json({
                    message: `O campo ${campo} deve ser um texto válido.`,
                });
            }

            valores[campo] = corpo[campo].trim();

            if (!valores[campo]) {
                return res.status(400).json({
                    message: "Preencha todos os campos institucionais.",
                });
            }

            if (valores[campo].length > limites[campo]) {
                return res.status(400).json({
                    message: `O campo ${campo} ultrapassou o limite de caracteres.`,
                });
            }
        }

        // A tela institucional envia os cinco campos juntos.
        // Quando uma requisição parcial for utilizada, os campos
        // não enviados serão preservados a partir do banco.
        const cnpj = valores.cnpj;

        if (cnpj !== undefined && cnpj.replace(/\D/g, "").length !== 14) {
            return res.status(400).json({
                message: "O CNPJ deve conter 14 dígitos.",
            });
        }
    }

    let cliente;

    try {
        cliente = await BD.connect();
        await cliente.query("BEGIN");

        // Confirma que o administrador existe.
        const atual = await cliente.query(
            `
                SELECT id_administrador, email
                FROM administradores
                WHERE id_administrador = $1
                FOR UPDATE
            `,
            [id]
        );

        if (!atual.rows.length) {
            await cliente.query("ROLLBACK");

            return res.status(404).json({
                message: "Administrador não encontrado.",
            });
        }

        // ====================================
        // ATUALIZAR NOME E/OU E-MAIL
        // ====================================
        if (pessoaisEnviados.length > 0) {
            const atribuicoes = [];
            const parametros = [];

            for (const campo of pessoaisEnviados) {
                parametros.push(valores[campo]);
                atribuicoes.push(
                    `${campo} = $${parametros.length}`
                );
            }

            parametros.push(id);

            const atualizacao = await cliente.query(
                `
                    UPDATE administradores
                    SET ${atribuicoes.join(", ")}
                    WHERE id_administrador = $${parametros.length}
                    RETURNING id_administrador
                `,
                parametros
            );

            if (!atualizacao.rows.length) {
                throw new Error("Não foi possível atualizar o administrador.");
            }
        }

        // ====================================
        // ATUALIZAR DADOS INSTITUCIONAIS
        // ====================================
        if (institucionaisEnviados.length > 0) {
            const resultadoInstitucional = await cliente.query(
                `
                    SELECT
                        razao_social,
                        cnpj,
                        gabinete,
                        telefone,
                        endereco
                    FROM dados_institucionais_administrador
                    WHERE id_administrador = $1
                    FOR UPDATE
                `,
                [id]
            );

            const existente = resultadoInstitucional.rows[0] || {};

            const institucional = {
                razao_social:
                    valores.razao_social ?? existente.razao_social ?? "",
                cnpj:
                    valores.cnpj ?? existente.cnpj ?? "",
                gabinete:
                    valores.gabinete ?? existente.gabinete ?? "",
                telefone:
                    valores.telefone ?? existente.telefone ?? "",
                endereco:
                    valores.endereco ?? existente.endereco ?? "",
            };

            // Não permitir gravar um cadastro institucional incompleto.
            const camposObrigatorios = [
                ["razao_social", 200],
                ["cnpj", 18],
                ["gabinete", 150],
                ["telefone", 25],
                ["endereco", 300],
            ];

            for (const [campo, limite] of camposObrigatorios) {
                if (
                    typeof institucional[campo] !== "string" ||
                    !institucional[campo].trim() ||
                    institucional[campo].trim().length > limite
                ) {
                    throw Object.assign(
                        new Error(
                            "Preencha corretamente todos os campos institucionais."
                        ),
                        { statusCode: 400 }
                    );
                }
            }

            if (institucional.cnpj.replace(/\D/g, "").length !== 14) {
                throw Object.assign(
                    new Error("O CNPJ deve conter 14 dígitos."),
                    { statusCode: 400 }
                );
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
                    institucional.razao_social.trim(),
                    institucional.cnpj.trim(),
                    institucional.gabinete.trim(),
                    institucional.telefone.trim(),
                    institucional.endereco.trim(),
                ]
            );
        }

        await cliente.query("COMMIT");

        const perfil = await buscarPerfil(id);

        return res.json({
            message: "Dados atualizados com sucesso!",
            administrador: perfil,
        });
    } catch (error) {
        if (cliente) {
            await cliente.query("ROLLBACK").catch(() => {});
        }

        console.error(
            "Erro ao atualizar perfil:",
            error.message
        );

        if (error.statusCode === 400) {
            return res.status(400).json({
                message: error.message,
            });
        }

        if (error.code === "23505") {
            return res.status(409).json({
                message: "Este e-mail ou CNPJ já está cadastrado.",
            });
        }

        return res.status(500).json({
            message: "Erro ao atualizar os dados do administrador.",
        });
    } finally {
        if (cliente) {
            cliente.release();
        }
    }
});

// ============================================
// VALIDAR IMAGEM
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
