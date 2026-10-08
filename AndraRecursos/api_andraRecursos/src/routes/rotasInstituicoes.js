
import { Router } from "express";
import { BD } from "../../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import {
    autenticarToken,
    autenticarAdministrador,
    autenticarInstituicao,
    exigirCadastroCompleto,
} from "../middlewares/Autenticacao.js";

const router = Router();

// =============================================
// CONFIGURAÇÕES
// =============================================

const camposInstitucionais = [
    "gestor",
    "secretaria_vinculada",
    "logradouro",
    "cep",
    "numero",
    "bairro",
    "telefone",
    "horario_funcionamento",
    "status_instituicao",
];

const selecaoInstituicao = `
  id_instituicao,
  nome,
  email_institucional,
  cep,
  telefone,
  horario_funcionamento,
  status_instituicao,
  gestor,
  secretaria_vinculada,
  numero,
  logradouro,
  bairro,
  tipo_acesso,
  cadastro_completo
`;

// =============================================
// VALIDAR CAMPOS OBRIGATÓRIOS
// =============================================

function validarObrigatorios(body) {
    const dados = {};

    for (const campo of camposInstitucionais) {
        const valor = body?.[campo];

        if (
            typeof valor !== "string" ||
            !valor.trim()
        ) {
            return {
                erro: `O campo ${campo} é obrigatório.`,
            };
        }

        dados[campo] = valor.trim();
    }

    dados.cep = dados.cep.replace(/\D/g, "");

    if (!/^\d{8}$/.test(dados.cep)) {
        return {
            erro: "O CEP deve possuir 8 dígitos.",
        };
    }

    if (dados.numero.length > 10) {
        return {
            erro: "O número deve ter no máximo 10 caracteres.",
        };
    }

    const telefone = dados.telefone.replace(/\D/g, "");

    if (telefone.length < 10 || telefone.length > 11) {
        return {
            erro: "Informe um telefone válido.",
        };
    }

    return { dados };
}

// =============================================
// LOGIN INSTITUCIONAL
// POST /login-instituicao
// =============================================

router.post("/login-instituicao", async (req, res) => {
    const { email_institucional, senha } = req.body || {};

    if (
        typeof email_institucional !== "string" ||
        typeof senha !== "string" ||
        !email_institucional.trim() ||
        !senha
    ) {
        return res.status(400).json({
            message: "E-mail e senha são obrigatórios.",
        });
    }

    try {
        const resultado = await BD.query(
            `SELECT
        id_instituicao,
        nome,
        email_institucional,
        senha,
        cadastro_completo
       FROM instituicoes
       WHERE LOWER(email_institucional) = LOWER($1)`,
            [email_institucional.trim()]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                message: "E-mail ou senha inválidos.",
            });
        }

        const instituicao = resultado.rows[0];

        const senhaCorreta = await bcrypt.compare(
            senha,
            instituicao.senha
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                message: "E-mail ou senha inválidos.",
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET não configurada.");
        }

        const token = jwt.sign(
            {
                id_instituicao: instituicao.id_instituicao,
                tipo_acesso: "instituicao",
            },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        return res.status(200).json({
            message: "Login realizado com sucesso!",
            token,
            cadastro_completo: instituicao.cadastro_completo,
            instituicao: {
                id: instituicao.id_instituicao,
                nome: instituicao.nome,
                email_institucional:
                    instituicao.email_institucional,
                cadastro_completo:
                    instituicao.cadastro_completo,
            },
        });

    } catch (error) {
        console.error(
            "Erro no login institucional:",
            error.message
        );

        return res.status(500).json({
            message: "Erro interno ao realizar login.",
        });
    }
});

// =============================================
// LISTAR INSTITUIÇÕES - ADMINISTRADOR
// GET /instituicoes
// =============================================

router.get(
    "/instituicoes",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        try {
            const resultado = await BD.query(
                `SELECT ${selecaoInstituicao}
         FROM instituicoes
         ORDER BY id_instituicao`
            );

            return res.status(200).json(resultado.rows);

        } catch (error) {
            console.error(
                "Erro ao listar instituições:",
                error.message
            );

            return res.status(500).json({
                message: "Erro ao listar instituições.",
            });
        }
    }
);

// =============================================
// CADASTRAR INSTITUIÇÃO - ADMINISTRADOR
// POST /instituicoes
// =============================================

router.post(
    "/instituicoes",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        const {
            nome,
            email_institucional,
            senha,
        } = req.body || {};

        if (
            typeof nome !== "string" ||
            typeof email_institucional !== "string" ||
            typeof senha !== "string" ||
            !nome.trim() ||
            !email_institucional.trim() ||
            senha.length < 8
        ) {
            return res.status(400).json({
                message:
                    "Nome, e-mail e senha com pelo menos 8 caracteres são obrigatórios.",
            });
        }

        const email = email_institucional
            .trim()
            .toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                message: "E-mail institucional inválido.",
            });
        }

        try {
            const senhaCriptografada = await bcrypt.hash(
                senha,
                10
            );

            const resultado = await BD.query(
                `INSERT INTO instituicoes (
          nome,
          email_institucional,
          senha,
          tipo_acesso,
          cadastro_completo
        )
        VALUES ($1, $2, $3, $4, FALSE)
        RETURNING
          id_instituicao,
          nome,
          email_institucional,
          cadastro_completo`,
                [
                    nome.trim(),
                    email,
                    senhaCriptografada,
                    "Usuário Institucional",
                ]
            );

            return res.status(201).json({
                message: "Instituição cadastrada com sucesso!",
                instituicao: resultado.rows[0],
            });

        } catch (error) {
            if (error.code === "23505") {
                return res.status(409).json({
                    message: "E-mail institucional já cadastrado!",
                });
            }

            console.error(
                "Erro ao cadastrar instituição:",
                error.message
            );

            return res.status(500).json({
                message: "Erro ao cadastrar instituição.",
            });
        }
    }
);

// =============================================
// CONSULTAR DADOS DA INSTITUIÇÃO LOGADA
// GET /instituicoes/me
// =============================================

router.get(
    "/instituicoes/me",
    autenticarToken,
    autenticarInstituicao,
    async (req, res) => {
        try {
            const resultado = await BD.query(
                `SELECT ${selecaoInstituicao}
         FROM instituicoes
         WHERE id_instituicao = $1`,
                [req.instituicao.id_instituicao]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    message: "Instituição não encontrada.",
                });
            }

            return res.status(200).json(resultado.rows[0]);

        } catch (error) {
            console.error(
                "Erro ao consultar instituição:",
                error.message
            );

            return res.status(500).json({
                message: "Erro ao consultar instituição.",
            });
        }
    }
);

// =============================================
// FINALIZAR PRIMEIRO CADASTRO OBRIGATÓRIO
// PUT /instituicoes/completar-cadastro
// =============================================

router.put(
    "/instituicoes/completar-cadastro",
    autenticarToken,
    autenticarInstituicao,
    async (req, res) => {
        // Impede refazer o cadastro inicial.
        if (req.instituicao.cadastro_completo === true) {
            return res.status(409).json({
                message:
                    "O cadastro inicial já foi concluído.",
            });
        }

        const validacao = validarObrigatorios(req.body);

        if (validacao.erro) {
            return res.status(400).json({
                message: validacao.erro,
            });
        }

        const d = validacao.dados;

        try {
            // Atualiza os dados e marca o cadastro
            // como completo na mesma operação.
            const resultado = await BD.query(
                `UPDATE instituicoes
         SET
           gestor = $1,
           secretaria_vinculada = $2,
           logradouro = $3,
           cep = $4,
           numero = $5,
           bairro = $6,
           telefone = $7,
           horario_funcionamento = $8,
           status_instituicao = $9,
           cadastro_completo = TRUE
         WHERE id_instituicao = $10
           AND cadastro_completo = FALSE
           AND NULLIF(TRIM(nome), '') IS NOT NULL
           AND NULLIF(TRIM(email_institucional), '') IS NOT NULL
         RETURNING ${selecaoInstituicao}`,
                [
                    d.gestor,
                    d.secretaria_vinculada,
                    d.logradouro,
                    d.cep,
                    d.numero,
                    d.bairro,
                    d.telefone,
                    d.horario_funcionamento,
                    d.status_instituicao,
                    req.instituicao.id_instituicao,
                ]
            );

            if (resultado.rows.length === 0) {
                return res.status(409).json({
                    message:
                        "Não foi possível concluir o cadastro obrigatório.",
                });
            }

            return res.status(200).json({
                message:
                    "Cadastro obrigatório concluído com sucesso!",
                cadastro_completo: true,
                instituicao: resultado.rows[0],
            });

        } catch (error) {
            console.error(
                "Erro ao finalizar cadastro:",
                error.message
            );

            return res.status(500).json({
                message:
                    "Erro ao salvar as informações obrigatórias.",
            });
        }
    }
);

// =============================================
// EDITAR DADOS APÓS PRIMEIRO ACESSO
// PATCH /instituicoes/me
// =============================================

router.patch(
    "/instituicoes/me",
    autenticarToken,
    autenticarInstituicao,
    exigirCadastroCompleto,
    async (req, res) => {
        const camposPermitidos = [
            "gestor",
            "secretaria_vinculada",
            "logradouro",
            "cep",
            "numero",
            "bairro",
            "telefone",
            "horario_funcionamento",
        ];

        const atualizacoes = [];
        const valores = [];

        for (const campo of camposPermitidos) {
            const valorOriginal = req.body?.[campo];

            if (valorOriginal === undefined) {
                continue;
            }

            if (
                typeof valorOriginal !== "string" ||
                !valorOriginal.trim()
            ) {
                return res.status(400).json({
                    message: `Valor inválido para ${campo}.`,
                });
            }

            let valor = valorOriginal.trim();

            if (campo === "numero" && valor.length > 10) {
                return res.status(400).json({
                    message:
                        "O número deve ter no máximo 10 caracteres.",
                });
            }

            if (campo === "cep") {
                valor = valor.replace(/\D/g, "");

                if (!/^\d{8}$/.test(valor)) {
                    return res.status(400).json({
                        message: "CEP inválido.",
                    });
                }
            }

            if (campo === "telefone") {
                const telefone = valor.replace(/\D/g, "");

                if (
                    telefone.length < 10 ||
                    telefone.length > 11
                ) {
                    return res.status(400).json({
                        message: "Telefone inválido.",
                    });
                }
            }

            valores.push(valor);

            atualizacoes.push(
                `${campo} = $${valores.length}`
            );
        }

        if (atualizacoes.length === 0) {
            return res.status(400).json({
                message:
                    "Nenhum campo informado para atualização.",
            });
        }

        valores.push(req.instituicao.id_instituicao);

        try {
            const resultado = await BD.query(
                `UPDATE instituicoes
         SET ${atualizacoes.join(", ")}
         WHERE id_instituicao = $${valores.length}
         RETURNING ${selecaoInstituicao}`,
                valores
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    message: "Instituição não encontrada.",
                });
            }

            return res.status(200).json({
                message: "Dados atualizados com sucesso!",
                instituicao: resultado.rows[0],
            });

        } catch (error) {
            console.error(
                "Erro ao atualizar dados:",
                error.message
            );

            return res.status(500).json({
                message: "Erro ao atualizar dados.",
            });
        }
    }
);

// =============================================
// ATUALIZAR INSTITUIÇÃO - ADMINISTRADOR
// PUT /instituicoes/:id_instituicao
// =============================================

router.put(
    "/instituicoes/:id_instituicao",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        const id = Number(req.params.id_instituicao);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "ID da instituição inválido.",
            });
        }

        const camposPermitidos = [
            "nome",
            "email_institucional",
            "cep",
            "telefone",
            "horario_funcionamento",
            "status_instituicao",
            "gestor",
            "secretaria_vinculada",
            "numero",
            "logradouro",
            "bairro",
        ];

        const atualizacoes = [];
        const valores = [];

        for (const campo of camposPermitidos) {
            const valorOriginal = req.body?.[campo];

            if (valorOriginal === undefined) {
                continue;
            }

            if (
                valorOriginal !== null &&
                typeof valorOriginal !== "string"
            ) {
                return res.status(400).json({
                    message: `Campo ${campo} inválido.`,
                });
            }

            if (
                ["nome", "email_institucional"].includes(campo) &&
                (
                    typeof valorOriginal !== "string" ||
                    !valorOriginal.trim()
                )
            ) {
                return res.status(400).json({
                    message: `${campo} é obrigatório.`,
                });
            }

            const valor =
                typeof valorOriginal === "string"
                    ? valorOriginal.trim()
                    : null;

            if (
                campo === "numero" &&
                valor !== null &&
                valor.length > 10
            ) {
                return res.status(400).json({
                    message:
                        "Número deve ter no máximo 10 caracteres.",
                });
            }

            if (
                campo === "email_institucional" &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)
            ) {
                return res.status(400).json({
                    message: "E-mail inválido.",
                });
            }

            valores.push(valor);

            atualizacoes.push(
                `${campo} = $${valores.length}`
            );
        }

        // Senha é opcional na atualização.
        if (req.body?.senha !== undefined) {
            if (
                typeof req.body.senha !== "string" ||
                req.body.senha.length < 8
            ) {
                return res.status(400).json({
                    message:
                        "A senha deve ter pelo menos 8 caracteres.",
                });
            }

            try {
                const hash = await bcrypt.hash(
                    req.body.senha,
                    10
                );

                valores.push(hash);

                atualizacoes.push(
                    `senha = $${valores.length}`
                );

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

        if (atualizacoes.length === 0) {
            return res.status(400).json({
                message:
                    "Informe ao menos um campo para atualizar.",
            });
        }

        valores.push(id);

        try {
            const resultado = await BD.query(
                `UPDATE instituicoes
         SET ${atualizacoes.join(", ")}
         WHERE id_instituicao = $${valores.length}
         RETURNING ${selecaoInstituicao}`,
                valores
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    message: "Instituição não encontrada.",
                });
            }

            return res.status(200).json({
                message:
                    "Instituição atualizada com sucesso!",
                instituicao: resultado.rows[0],
            });

        } catch (error) {
            if (error.code === "23505") {
                return res.status(409).json({
                    message:
                        "Este e-mail institucional já está cadastrado.",
                });
            }

            console.error(
                "Erro ao atualizar instituição:",
                error.message
            );

            return res.status(500).json({
                message: "Erro ao atualizar instituição.",
            });
        }
    }
);

// =============================================
// EXCLUIR INSTITUIÇÃO - ADMINISTRADOR
// DELETE /instituicoes/:id_instituicao
// =============================================

router.delete(
    "/instituicoes/:id_instituicao",
    autenticarToken,
    autenticarAdministrador,
    async (req, res) => {
        const id = Number(req.params.id_instituicao);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "ID da instituição inválido.",
            });
        }

        try {
            const resultado = await BD.query(
                `DELETE FROM instituicoes
         WHERE id_instituicao = $1
         RETURNING id_instituicao`,
                [id]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    message: "Instituição não encontrada.",
                });
            }

            return res.status(200).json({
                message:
                    "Instituição excluída com sucesso!",
            });

        } catch (error) {
            console.error(
                "Erro ao excluir instituição:",
                error.message
            );

            return res.status(500).json({
                message: "Erro ao excluir instituição.",
            });
        }
    }
);

export default router;
