
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import {
    FiUser,
    FiCamera,
    FiEdit3,
    FiMail,
    FiSave,
    FiX,
    FiTrash2,
    FiRefreshCw,
    FiHome,
    FiMapPin,
    FiPhone,
    FiBriefcase,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";

const API = String(enderecoServidor).replace(/\/$/, "");

const CAMPOS_PESSOAIS = [
    {
        chave: "nome",
        titulo: "Nome do administrador",
        max: 150,
        tipo: "text",
    },
    {
        chave: "email",
        titulo: "E-mail de acesso",
        max: 200,
        tipo: "email",
    },
];

const CAMPOS_INSTITUCIONAIS = [
    {
        chave: "razao_social",
        titulo: "Razão social",
        max: 200,
        tipo: "text",
    },
    {
        chave: "cnpj",
        titulo: "CNPJ",
        max: 18,
        tipo: "text",
    },
    {
        chave: "gabinete",
        titulo: "Gabinete do Prefeito",
        max: 150,
        tipo: "text",
    },
    {
        chave: "telefone",
        titulo: "Telefone",
        max: 25,
        tipo: "tel",
    },
    {
        chave: "endereco",
        titulo: "Endereço",
        max: 300,
        tipo: "text",
    },
];

const VALORES_EDITAVEIS_INICIAIS = {
    nome: "",
    email: "",
    razao_social: "",
    cnpj: "",
    gabinete: "",
    telefone: "",
    endereco: "",
};

// ============================================
// REQUISIÇÕES À API
// ============================================
async function requisicao(caminho, opcoes = {}) {
    const token = localStorage.getItem("@AndraRecursos:token");

    if (!token) {
        throw new Error("Sessão expirada. Faça login novamente.");
    }

    let resposta;

    try {
        resposta = await fetch(`${API}${caminho}`, {
            ...opcoes,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(opcoes.body
                    ? { "Content-Type": "application/json" }
                    : {}),
                ...opcoes.headers,
            },
        });
    } catch {
        throw new Error(
            "Não foi possível conectar à API. Verifique sua conexão e o endereço do servidor."
        );
    }

    const dados = await resposta.json().catch(() => null);

    if (!resposta.ok) {
        console.error("[PERFIL ADMIN] Erro na API:", {
            caminho,
            metodo: opcoes.method || "GET",
            status: resposta.status,
            resposta: dados,
        });

        throw new Error(
            dados?.message ||
            dados?.mensagem ||
            dados?.error ||
            `Não foi possível concluir a operação (HTTP ${resposta.status}).`
        );
    }

    return dados;
}

// ============================================
// NORMALIZAR RESPOSTA DO PERFIL
// ============================================
function extrairAdministrador(resposta) {
    return (
        resposta?.administrador ||
        resposta?.perfil ||
        resposta
    );
}

// ============================================
// PROCESSAR FOTO
// ============================================
function prepararFoto(arquivo) {
    return new Promise((resolve, reject) => {
        if (
            !arquivo ||
            !["image/jpeg", "image/png", "image/webp"].includes(
                arquivo.type
            )
        ) {
            reject(
                new Error("Selecione uma imagem JPG, PNG ou WebP.")
            );
            return;
        }

        if (arquivo.size > 10 * 1024 * 1024) {
            reject(
                new Error("A imagem original deve ter até 10 MB.")
            );
            return;
        }

        const leitor = new FileReader();

        leitor.onerror = () => {
            reject(new Error("Não foi possível ler a imagem."));
        };

        leitor.onload = () => {
            const imagem = new Image();

            imagem.onerror = () => {
                reject(new Error("Não foi possível abrir a imagem."));
            };

            imagem.onload = () => {
                const tamanho = 320;
                const canvas = document.createElement("canvas");

                canvas.width = tamanho;
                canvas.height = tamanho;

                const ctx = canvas.getContext("2d");

                if (!ctx) {
                    reject(
                        new Error("Não foi possível processar a imagem.")
                    );
                    return;
                }

                const lado = Math.min(
                    imagem.width,
                    imagem.height
                );

                ctx.drawImage(
                    imagem,
                    (imagem.width - lado) / 2,
                    (imagem.height - lado) / 2,
                    lado,
                    lado,
                    0,
                    0,
                    tamanho,
                    tamanho
                );

                const foto = canvas.toDataURL("image/jpeg", 0.8);

                if (foto.length > 550000) {
                    reject(
                        new Error(
                            "A foto ficou muito grande após o processamento."
                        )
                    );
                    return;
                }

                resolve(foto);
            };

            imagem.src = leitor.result;
        };

        leitor.readAsDataURL(arquivo);
    });
}

// ============================================
// COMPONENTE DE INFORMAÇÃO
// ============================================
function Informacao({
    Icone,
    titulo,
    valor,
    destaque = false,
}) {
    return (
        <div className={destaque ? "sm:col-span-2" : ""}>
            <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-500">
                <Icone
                    size={15}
                    className="text-[#5177a5]"
                />
                {titulo}
            </div>

            <p className="break-words text-sm font-semibold leading-relaxed text-slate-800">
                {valor || "Não informado"}
            </p>
        </div>
    );
}

// ============================================
// PERFIL DO ADMINISTRADOR
// ============================================
export default function PerfilAdministrador() {
    const inputFoto = useRef(null);

    const [dados, setDados] = useState(null);

    const [formulario, setFormulario] = useState(
        VALORES_EDITAVEIS_INICIAIS
    );

    const [fotoPendente, setFotoPendente] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [salvandoFoto, setSalvandoFoto] = useState(false);
    const [tipoEdicao, setTipoEdicao] = useState(null);
    const [erro, setErro] = useState("");

    // ========================================
    // CARREGAR PERFIL
    // ========================================
    async function carregarPerfil() {
        setCarregando(true);
        setErro("");

        try {
            const resposta = await requisicao(
                "/perfil-administrador"
            );

            const perfil = extrairAdministrador(resposta);

            if (
                !perfil ||
                typeof perfil !== "object" ||
                !perfil.id_administrador
            ) {
                throw new Error(
                    "A API não retornou um perfil válido do administrador."
                );
            }

            setDados(perfil);
        } catch (error) {
            setErro(
                error.message ||
                "Não foi possível carregar o perfil."
            );
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarPerfil();
    }, []);

    // ========================================
    // ATUALIZAR SESSÃO LOCAL
    // ========================================
    function atualizarSessao(perfil) {
        try {
            const usuario = JSON.parse(
                localStorage.getItem("@AndraRecursos:usuario") || "{}"
            );

            localStorage.setItem(
                "@AndraRecursos:usuario",
                JSON.stringify({
                    ...usuario,
                    nome: perfil.nome,
                    email: perfil.email,
                })
            );

            window.dispatchEvent(
                new Event("andrarecursos:perfil-atualizado")
            );
        } catch (error) {
            console.error(
                "Não foi possível atualizar a sessão local:",
                error
            );
        }
    }

    // ========================================
    // ABRIR E FECHAR EDIÇÃO
    // ========================================
    function abrirEdicao(tipo) {
        setFormulario({
            nome: dados?.nome || "",
            email: dados?.email || "",
            razao_social: dados?.razao_social || "",
            cnpj: dados?.cnpj || "",
            gabinete: dados?.gabinete || "",
            telefone: dados?.telefone || "",
            endereco: dados?.endereco || "",
        });

        setTipoEdicao(tipo);
    }

    function fecharEdicao() {
        if (salvando) return;

        setTipoEdicao(null);
    }

    // ========================================
    // SALVAR DADOS PESSOAIS/INSTITUCIONAIS
    // ========================================
    async function salvarDados(evento) {
        evento.preventDefault();

        if (salvando || !tipoEdicao) return;

        let payload = {};

        if (tipoEdicao === "pessoal") {
            const nome = String(
                formulario.nome || ""
            ).trim();

            const email = String(
                formulario.email || ""
            ).trim();

            if (!nome) {
                toast.error(
                    "Informe o nome do administrador."
                );
                return;
            }

            if (
                nome.length > 150
            ) {
                toast.error(
                    "O nome deve ter no máximo 150 caracteres."
                );
                return;
            }

            if (
                !email ||
                email.length > 200 ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
            ) {
                toast.error("Informe um e-mail válido.");
                return;
            }

            payload = {
                nome,
                email,
            };
        }

        if (tipoEdicao === "institucional") {
            payload = {
                razao_social: String(
                    formulario.razao_social || ""
                ).trim(),

                cnpj: String(
                    formulario.cnpj || ""
                ).trim(),

                gabinete: String(
                    formulario.gabinete || ""
                ).trim(),

                telefone: String(
                    formulario.telefone || ""
                ).trim(),

                endereco: String(
                    formulario.endereco || ""
                ).trim(),
            };

            for (const campo of CAMPOS_INSTITUCIONAIS) {
                const valor = payload[campo.chave];

                if (!valor) {
                    toast.error(
                        `Preencha o campo "${campo.titulo}".`
                    );
                    return;
                }

                if (valor.length > campo.max) {
                    toast.error(
                        `O campo "${campo.titulo}" ultrapassou o limite permitido.`
                    );
                    return;
                }
            }

            const cnpjLimpo = payload.cnpj.replace(/\D/g, "");

            if (cnpjLimpo.length !== 14) {
                toast.error(
                    "O CNPJ deve conter 14 dígitos."
                );
                return;
            }
        }

        setSalvando(true);

        try {
            const resposta = await requisicao(
                "/perfil-administrador",
                {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                }
            );

            const administradorRetornado =
                extrairAdministrador(resposta);

            const perfilAtualizado = {
                ...dados,
                ...payload,
                ...(administradorRetornado &&
                typeof administradorRetornado === "object"
                    ? administradorRetornado
                    : {}),
            };

            setDados(perfilAtualizado);

            if (tipoEdicao === "pessoal") {
                atualizarSessao(perfilAtualizado);
            }

            setTipoEdicao(null);

            toast.success(
                tipoEdicao === "pessoal"
                    ? "Dados pessoais atualizados com sucesso!"
                    : "Dados institucionais atualizados com sucesso!"
            );
        } catch (error) {
            toast.error(
                error.message ||
                "Não foi possível salvar as alterações."
            );
        } finally {
            setSalvando(false);
        }
    }

    // ========================================
    // ESCOLHER FOTO
    // ========================================
    async function escolherFoto(evento) {
        const arquivo = evento.target.files?.[0];

        evento.target.value = "";

        if (!arquivo) return;

        try {
            const foto = await prepararFoto(arquivo);
            setFotoPendente(foto);
        } catch (error) {
            toast.error(error.message);
        }
    }

    // ========================================
    // SALVAR FOTO
    // ========================================
    async function salvarFoto() {
        if (!fotoPendente || salvandoFoto) return;

        setSalvandoFoto(true);

        try {
            const resposta = await requisicao(
                "/perfil-administrador/foto",
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        foto: fotoPendente,
                    }),
                }
            );

            const perfil = extrairAdministrador(resposta);

            setDados((anterior) => ({
                ...anterior,
                ...(perfil || {}),
                foto_perfil:
                    perfil?.foto_perfil || fotoPendente,
            }));

            setFotoPendente(null);

            toast.success("Foto salva com sucesso!");

            window.dispatchEvent(
                new Event("andrarecursos:perfil-atualizado")
            );
        } catch (error) {
            toast.error(
                error.message ||
                "Não foi possível salvar a foto."
            );
        } finally {
            setSalvandoFoto(false);
        }
    }

    // ========================================
    // REMOVER FOTO
    // ========================================
    async function removerFoto() {
        if (fotoPendente) {
            setFotoPendente(null);
            return;
        }

        if (!dados?.foto_perfil || salvandoFoto) return;

        setSalvandoFoto(true);

        try {
            const resposta = await requisicao(
                "/perfil-administrador/foto",
                {
                    method: "DELETE",
                }
            );

            const perfil = extrairAdministrador(resposta);

            setDados((anterior) => ({
                ...anterior,
                ...(perfil || {}),
                foto_perfil: null,
            }));

            toast.success("Foto removida!");

            window.dispatchEvent(
                new Event("andrarecursos:perfil-atualizado")
            );
        } catch (error) {
            toast.error(
                error.message ||
                "Não foi possível remover a foto."
            );
        } finally {
            setSalvandoFoto(false);
        }
    }

    // ========================================
    // CARREGAMENTO
    // ========================================
    if (carregando) {
        return (
            <div className="flex min-h-64 items-center justify-center gap-2 text-[#082d56]">
                <FiRefreshCw className="animate-spin" />
                Carregando perfil...
            </div>
        );
    }

    if (erro || !dados) {
        return (
            <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
            >
                <p className="font-semibold">
                    Não foi possível carregar o perfil.
                </p>

                <p className="mt-1">
                    {erro || "A API não retornou os dados do perfil."}
                </p>

                <button
                    type="button"
                    onClick={carregarPerfil}
                    className="mt-3 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    const fotoExibida = fotoPendente || dados.foto_perfil;

    // ========================================
    // INTERFACE
    // ========================================
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#082d56] sm:text-3xl">
                    Perfil do Administrador
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                    Gerencie seus dados pessoais, sua foto e as informações institucionais.
                </p>
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="h-24 bg-gradient-to-r from-[#082d56] to-[#164675] sm:h-28" />

                <div className="px-5 pb-6 sm:px-7">
                    <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end">
                        <div className="relative w-fit shrink-0">
                            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#eaf2fc] shadow-md sm:h-28 sm:w-28">
                                {fotoExibida ? (
                                    <img
                                        src={fotoExibida}
                                        alt="Foto do administrador"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <FiUser
                                        size={42}
                                        className="text-[#1759ad]"
                                    />
                                )}
                            </div>

                            <button
                                type="button"
                                aria-label="Selecionar foto"
                                title="Selecionar foto"
                                onClick={() => inputFoto.current?.click()}
                                disabled={salvandoFoto}
                                className="absolute bottom-1 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#082d56] text-white shadow-sm hover:bg-[#164675] disabled:opacity-50"
                            >
                                <FiCamera size={16} />
                            </button>
                        </div>

                        <div className="min-w-0 flex-1 pb-1 sm:pt-12">
                            <h2 className="break-words text-xl font-bold text-[#082d56]">
                                {dados.nome || "Administrador"}
                            </h2>

                            <p className="mt-1 flex items-center gap-2 break-all text-sm text-slate-500">
                                <FiMail className="shrink-0" />
                                {dados.email || "E-mail não informado"}
                            </p>

                            <span className="mt-2 inline-flex rounded-md bg-[#eaf2fc] px-3 py-1 text-xs font-semibold text-[#1759ad]">
                                Administrador
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => abrirEdicao("pessoal")}
                            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#082d56] hover:bg-slate-50"
                        >
                            <FiEdit3 />
                            Editar dados
                        </button>
                    </div>

                    <input
                        type="file"
                        ref={inputFoto}
                        onChange={escolherFoto}
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                    />

                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
                        <button
                            type="button"
                            onClick={() => inputFoto.current?.click()}
                            disabled={salvandoFoto}
                            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-[#082d56] hover:bg-slate-50 disabled:opacity-50"
                        >
                            <FiCamera />
                            {fotoExibida ? "Trocar foto" : "Adicionar foto"}
                        </button>

                        {fotoPendente && (
                            <button
                                type="button"
                                onClick={salvarFoto}
                                disabled={salvandoFoto}
                                className="flex items-center gap-2 rounded-lg bg-[#082d56] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#164675] disabled:opacity-50"
                            >
                                {salvandoFoto ? (
                                    <FiRefreshCw className="animate-spin" />
                                ) : (
                                    <FiSave />
                                )}

                                {salvandoFoto
                                    ? "Salvando foto..."
                                    : "Salvar foto"}
                            </button>
                        )}

                        {fotoExibida && (
                            <button
                                type="button"
                                onClick={removerFoto}
                                disabled={salvandoFoto}
                                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                                <FiTrash2 />
                                {fotoPendente
                                    ? "Cancelar escolha"
                                    : "Remover foto"}
                            </button>
                        )}

                        <span className="w-full text-xs text-slate-400">
                            JPG, PNG ou WebP. A foto é ajustada automaticamente.
                        </span>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-6 flex items-center gap-3">
                        <span className="rounded-xl bg-[#eaf2fc] p-3 text-[#1759ad]">
                            <FiUser size={20} />
                        </span>

                        <div>
                            <h3 className="text-lg font-bold text-[#082d56]">
                                Dados do Administrador
                            </h3>

                            <p className="text-xs text-slate-500">
                                Informações de identificação
                            </p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <Informacao
                            Icone={FiUser}
                            titulo="Nome completo"
                            valor={dados.nome}
                        />

                        <Informacao
                            Icone={FiMail}
                            titulo="E-mail de acesso"
                            valor={dados.email}
                        />

                        <Informacao
                            Icone={FiBriefcase}
                            titulo="Tipo de acesso"
                            valor={dados.tipo_acesso || "Administrador"}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => abrirEdicao("pessoal")}
                        className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg bg-[#082d56] px-4 py-3 text-sm font-semibold text-white hover:bg-[#164675]"
                    >
                        <FiEdit3 />
                        Atualizar dados pessoais
                    </button>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-6 flex items-center gap-3">
                        <span className="rounded-xl bg-[#eaf2fc] p-3 text-[#1759ad]">
                            <FiHome size={20} />
                        </span>

                        <div>
                            <h3 className="text-lg font-bold text-[#082d56]">
                                Dados Institucionais
                            </h3>

                            <p className="text-xs text-slate-500">
                                Informações da organização
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Informacao
                            Icone={FiHome}
                            titulo="Razão social"
                            valor={dados.razao_social}
                            destaque
                        />

                        <Informacao
                            Icone={FiBriefcase}
                            titulo="CNPJ"
                            valor={dados.cnpj}
                        />

                        <Informacao
                            Icone={FiUser}
                            titulo="Gabinete do Prefeito"
                            valor={dados.gabinete}
                        />

                        <Informacao
                            Icone={FiPhone}
                            titulo="Telefone"
                            valor={dados.telefone}
                        />

                        <Informacao
                            Icone={FiMapPin}
                            titulo="Endereço"
                            valor={dados.endereco}
                            destaque
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => abrirEdicao("institucional")}
                        className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg border border-[#082d56] px-4 py-3 text-sm font-semibold text-[#082d56] hover:bg-[#eaf2fc]"
                    >
                        <FiEdit3 />
                        Atualizar dados institucionais
                    </button>
                </section>
            </div>

            {tipoEdicao && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#06172b]/65 p-4 backdrop-blur-sm">
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="titulo-edicao-perfil"
                        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl"
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
                            <div>
                                <h3
                                    id="titulo-edicao-perfil"
                                    className="text-lg font-bold text-[#082d56]"
                                >
                                    {tipoEdicao === "pessoal"
                                        ? "Atualizar dados pessoais"
                                        : "Atualizar dados institucionais"}
                                </h3>

                                <p className="mt-1 text-xs text-slate-500">
                                    {tipoEdicao === "pessoal"
                                        ? "Altere seu nome e e-mail de acesso."
                                        : "Preencha ou atualize as informações da instituição."}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={fecharEdicao}
                                disabled={salvando}
                                aria-label="Fechar"
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        <form
                            onSubmit={salvarDados}
                            className="space-y-5 p-6"
                        >
                            {(
                                tipoEdicao === "pessoal"
                                    ? CAMPOS_PESSOAIS
                                    : CAMPOS_INSTITUCIONAIS
                            ).map((campo) => (
                                <div key={campo.chave}>
                                    <label
                                        htmlFor={campo.chave}
                                        className="mb-2 block text-sm font-semibold text-slate-700"
                                    >
                                        {campo.titulo}
                                    </label>

                                    <input
                                        id={campo.chave}
                                        name={campo.chave}
                                        type={campo.tipo}
                                        required
                                        maxLength={campo.max}
                                        autoComplete={
                                            campo.chave === "email"
                                                ? "email"
                                                : campo.chave === "nome"
                                                    ? "name"
                                                    : "off"
                                        }
                                        value={
                                            formulario[campo.chave] ?? ""
                                        }
                                        onChange={(evento) =>
                                            setFormulario((anterior) => ({
                                                ...anterior,
                                                [campo.chave]:
                                                    evento.target.value,
                                            }))
                                        }
                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#1759ad] focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>
                            ))}

                            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                                <button
                                    type="button"
                                    onClick={fecharEdicao}
                                    disabled={salvando}
                                    className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={salvando}
                                    className="flex items-center gap-2 rounded-lg bg-[#082d56] px-5 py-3 text-sm font-semibold text-white hover:bg-[#164675] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {salvando ? (
                                        <FiRefreshCw className="animate-spin" />
                                    ) : (
                                        <FiSave />
                                    )}

                                    {salvando
                                        ? "Salvando..."
                                        : "Salvar alterações"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
}
