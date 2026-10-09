
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
    FiCheckCircle,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";

const API = String(enderecoServidor).replace(/\/$/, "");

const CAMPOS_INSTITUCIONAIS = [
    { chave: "razao_social", titulo: "Razão social", max: 200 },
    { chave: "cnpj", titulo: "CNPJ", max: 18 },
    { chave: "gabinete", titulo: "Gabinete do Prefeito", max: 150 },
    { chave: "telefone", titulo: "Telefone", max: 25 },
    { chave: "endereco", titulo: "Endereço", max: 300 },
];

const CAMPOS_EDITAVEIS = [
    { chave: "nome", titulo: "Nome do administrador", max: 150 },
    ...CAMPOS_INSTITUCIONAIS,
];

async function requisicao(caminho, opcoes = {}) {
    const token = localStorage.getItem("@AndraRecursos:token");

    if (!token) {
        throw new Error("Sessão expirada. Faça login novamente.");
    }

    const resposta = await fetch(`${API}${caminho}`, {
        ...opcoes,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(opcoes.body
                ? { "Content-Type": "application/json" }
                : {}),
            ...opcoes.headers,
        },
    });

    const dados = await resposta.json().catch(() => null);

    if (!resposta.ok) {
        throw new Error(
            dados?.message ||
            dados?.error ||
            `Erro ${resposta.status} na API.`
        );
    }

    return dados;
}

function prepararFoto(arquivo) {
    return new Promise((resolve, reject) => {
        if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
            reject(new Error("Selecione uma imagem JPG, PNG ou WebP."));
            return;
        }

        if (arquivo.size > 10 * 1024 * 1024) {
            reject(new Error("A imagem original deve ter até 10 MB."));
            return;
        }

        const leitor = new FileReader();

        leitor.onerror = () =>
            reject(new Error("Não foi possível ler a imagem."));

        leitor.onload = () => {
            const imagem = new Image();

            imagem.onerror = () =>
                reject(new Error("Não foi possível abrir a imagem."));

            imagem.onload = () => {
                const canvas = document.createElement("canvas");
                const tamanho = 320;

                canvas.width = tamanho;
                canvas.height = tamanho;

                const ctx = canvas.getContext("2d");

                if (!ctx) {
                    reject(new Error("Não foi possível processar a imagem."));
                    return;
                }

                const lado = Math.min(imagem.width, imagem.height);

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
                    reject(new Error("A foto ficou muito grande."));
                    return;
                }

                resolve(foto);
            };

            imagem.src = leitor.result;
        };

        leitor.readAsDataURL(arquivo);
    });
}

function Informacao({ Icone, titulo, valor, destaque = false }) {
    return (
        <div className={destaque ? "sm:col-span-2" : ""}>
            <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-500">
                <Icone size={15} className="text-[#5177a5]" />
                {titulo}
            </div>

            <p className="break-words text-sm font-semibold leading-relaxed text-slate-800">
                {valor || "Não informado"}
            </p>
        </div>
    );
}

export default function PerfilAdministrador() {
    const inputFoto = useRef(null);

    const [dados, setDados] = useState(null);
    const [formulario, setFormulario] = useState({});
    const [fotoPendente, setFotoPendente] = useState(null);

    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [salvandoFoto, setSalvandoFoto] = useState(false);
    const [editando, setEditando] = useState(false);
    const [erro, setErro] = useState("");

    useEffect(() => {
        let ativo = true;

        async function carregar() {
            try {
                const perfil = await requisicao("/perfil-administrador");

                if (!ativo) return;

                setDados(perfil);
                setFormulario(perfil);
            } catch (error) {
                if (ativo) setErro(error.message);
            } finally {
                if (ativo) setCarregando(false);
            }
        }

        carregar();

        return () => {
            ativo = false;
        };
    }, []);

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
        } catch {
            // Dados já persistidos no servidor.
        }
    }

    function editar() {
        setFormulario({
            nome: dados.nome || "",
            razao_social: dados.razao_social || "",
            cnpj: dados.cnpj || "",
            gabinete: dados.gabinete || "",
            telefone: dados.telefone || "",
            endereco: dados.endereco || "",
        });

        setEditando(true);
    }

    async function salvarDados(evento) {
        evento.preventDefault();

        if (salvando) return;

        setSalvando(true);

        try {
            const resposta = await requisicao("/perfil-administrador", {
                method: "PATCH",
                body: JSON.stringify(formulario),
            });

            setDados(resposta.administrador);
            atualizarSessao(resposta.administrador);
            setEditando(false);

            toast.success("Dados atualizados com sucesso!");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSalvando(false);
        }
    }

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

    async function salvarFoto() {
        if (!fotoPendente || salvandoFoto) return;

        setSalvandoFoto(true);

        try {
            const resposta = await requisicao(
                "/perfil-administrador/foto",
                {
                    method: "PATCH",
                    body: JSON.stringify({ foto: fotoPendente }),
                }
            );

            setDados(resposta.administrador);
            setFotoPendente(null);

            toast.success("Foto salva com sucesso!");
            window.dispatchEvent(
                new Event("andrarecursos:perfil-atualizado")
            );
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSalvandoFoto(false);
        }
    }

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
                { method: "DELETE" }
            );

            setDados(resposta.administrador);

            toast.success("Foto removida!");
            window.dispatchEvent(
                new Event("andrarecursos:perfil-atualizado")
            );
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSalvandoFoto(false);
        }
    }

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
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                {erro || "Não foi possível carregar os dados do perfil."}
            </div>
        );
    }

    const fotoExibida = fotoPendente || dados.foto_perfil;

    return (
        <div className="space-y-6">
            {/* TÍTULO */}
            <div>
                <h1 className="text-2xl font-bold text-[#082d56] sm:text-3xl">
                    Perfil do Administrador
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                    Gerencie seu nome, foto e informações institucionais.
                </p>
            </div>

            {/* CARTÃO DE PERFIL */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="h-24 bg-[#082d56] sm:h-28">
                    <div className="h-full bg-gradient-to-r from-[#082d56] to-[#164675]" />
                </div>

                <div className="px-5 pb-6 sm:px-7">
                    <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end">
                        {/* FOTO */}
                        <div className="relative w-fit shrink-0">
                            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#eaf2fc] shadow-md sm:h-28 sm:w-28">
                                {fotoExibida ? (
                                    <img
                                        src={fotoExibida}
                                        alt="Foto do administrador"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <FiUser size={42} className="text-[#1759ad]" />
                                )}
                            </div>

                            <button
                                type="button"
                                aria-label="Selecionar foto"
                                title="Selecionar foto"
                                onClick={() => inputFoto.current?.click()}
                                disabled={salvandoFoto}
                                className="absolute bottom-1 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#082d56] text-white shadow-sm hover:bg-[#164675]"
                            >
                                <FiCamera size={16} />
                            </button>
                        </div>

                        {/* NOME SEM SOBREPOSIÇÃO */}
                        <div className="min-w-0 flex-1 pb-1 sm:pt-12">
                            <h2 className="break-words text-xl font-bold text-[#082d56]">
                                {dados.nome}
                            </h2>

                            <p className="mt-1 flex items-center gap-2 break-all text-sm text-slate-500">
                                <FiMail className="shrink-0" />
                                {dados.email}
                            </p>

                            <span className="mt-2 inline-flex rounded-md bg-[#eaf2fc] px-3 py-1 text-xs font-semibold text-[#1759ad]">
                                Administrador
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={editar}
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

                    {/* BOTÕES DA FOTO */}
                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
                        <button
                            type="button"
                            onClick={() => inputFoto.current?.click()}
                            disabled={salvandoFoto}
                            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-[#082d56] hover:bg-slate-50"
                        >
                            <FiCamera />
                            {fotoExibida ? "Trocar foto" : "Adicionar foto"}
                        </button>

                        {fotoPendente && (
                            <button
                                type="button"
                                onClick={salvarFoto}
                                disabled={salvandoFoto}
                                className="flex items-center gap-2 rounded-lg bg-[#082d56] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#164675]"
                            >
                                {salvandoFoto ? (
                                    <FiRefreshCw className="animate-spin" />
                                ) : (
                                    <FiSave />
                                )}
                                Salvar foto
                            </button>
                        )}

                        {fotoExibida && (
                            <button
                                type="button"
                                onClick={removerFoto}
                                disabled={salvandoFoto}
                                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                            >
                                <FiTrash2 />
                                {fotoPendente ? "Cancelar escolha" : "Remover foto"}
                            </button>
                        )}

                        <span className="w-full text-xs text-slate-400">
                            JPG, PNG ou WebP. A foto é ajustada automaticamente.
                        </span>
                    </div>
                </div>
            </section>

            {/* CARTÕES INFERIORES */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* DADOS PESSOAIS */}
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
                            valor="Administrador"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={editar}
                        className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg bg-[#082d56] px-4 py-3 text-sm font-semibold text-white hover:bg-[#164675]"
                    >
                        <FiEdit3 />
                        Atualizar dados
                    </button>
                </section>

                {/* DADOS INSTITUCIONAIS */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-6 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
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
                        onClick={editar}
                        className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg border border-[#082d56] px-4 py-3 text-sm font-semibold text-[#082d56] hover:bg-[#eaf2fc]"
                    >
                        <FiEdit3 />
                        Atualizar dados institucionais
                    </button>
                </section>
            </div>

            {/* MODAL DE EDIÇÃO */}
            {editando && (
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
                                    Atualizar informações
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Edite o nome e os dados institucionais.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setEditando(false)}
                                disabled={salvando}
                                aria-label="Fechar"
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        <form onSubmit={salvarDados} className="space-y-5 p-6">
                            {CAMPOS_EDITAVEIS.map((campo, indice) => (
                                <div key={campo.chave}>
                                    {indice === 1 && (
                                        <h4 className="mb-5 mt-7 border-t border-slate-100 pt-5 text-sm font-bold text-[#082d56]">
                                            Dados institucionais
                                        </h4>
                                    )}

                                    <label
                                        htmlFor={campo.chave}
                                        className="mb-2 block text-sm font-semibold text-slate-700"
                                    >
                                        {campo.titulo}
                                    </label>

                                    <input
                                        id={campo.chave}
                                        type="text"
                                        required
                                        maxLength={campo.max}
                                        value={formulario[campo.chave] ?? ""}
                                        onChange={(e) =>
                                            setFormulario((anterior) => ({
                                                ...anterior,
                                                [campo.chave]: e.target.value,
                                            }))
                                        }
                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#1759ad] focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>
                            ))}

                            <p className="text-xs text-slate-500">
                                O e-mail e o tipo de acesso não podem ser alterados
                                por esta página.
                            </p>

                            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                                <button
                                    type="button"
                                    onClick={() => setEditando(false)}
                                    disabled={salvando}
                                    className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={salvando}
                                    className="flex items-center gap-2 rounded-lg bg-[#082d56] px-5 py-3 text-sm font-semibold text-white hover:bg-[#164675] disabled:opacity-50"
                                >
                                    {salvando ? (
                                        <FiRefreshCw className="animate-spin" />
                                    ) : (
                                        <FiSave />
                                    )}

                                    {salvando ? "Salvando..." : "Salvar alterações"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
}
