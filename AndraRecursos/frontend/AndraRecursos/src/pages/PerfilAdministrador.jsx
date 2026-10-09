
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import {
    FiUser,
    FiCamera,
    FiEdit3,
    FiMail,
    FiShield,
    FiSave,
    FiX,
    FiTrash2,
    FiRefreshCw,
    FiBuilding,
    FiMapPin,
    FiPhone,
    FiBriefcase,
    FiCheckCircle,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";
import logo from "../assets/AndraRecursos.png";

const API = String(enderecoServidor).replace(/\/$/, "");

// Dados institucionais que já constavam no perfil.
// Mantidos como informações de referência.
const instituicao = {
    razaoSocial: "PREFEITURA MUNICIPAL DE ANDRADINA",
    cnpj: "43.535.151/0001-67",
    gabinete: "MÁRIO CELSO LOPES",
    telefone: "(18) 3702-2200",
    endereco:
        "Rua Paes Leme, 1407 - Centro, Andradina - SP, 16901-110",
};

async function chamarAPI(caminho, opcoes = {}) {
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

// Redimensionar e compactar a foto antes do envio
function prepararImagem(arquivo) {
    return new Promise((resolve, reject) => {
        if (!arquivo.type.startsWith("image/")) {
            reject(new Error("Escolha um arquivo de imagem."));
            return;
        }

        if (arquivo.size > 10 * 1024 * 1024) {
            reject(new Error("Selecione uma imagem de até 10 MB."));
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
                const tamanho = 320;
                const canvas = document.createElement("canvas");

                canvas.width = tamanho;
                canvas.height = tamanho;

                const contexto = canvas.getContext("2d");

                if (!contexto) {
                    reject(new Error("Erro ao processar a imagem."));
                    return;
                }

                const lado = Math.min(imagem.width, imagem.height);
                const origemX = (imagem.width - lado) / 2;
                const origemY = (imagem.height - lado) / 2;

                // Preenche todo o quadrado usando o centro da foto.
                contexto.drawImage(
                    imagem,
                    origemX,
                    origemY,
                    lado,
                    lado,
                    0,
                    0,
                    tamanho,
                    tamanho
                );

                const foto = canvas.toDataURL("image/jpeg", 0.8);

                // Aproximadamente 400 KB antes da conversão base64.
                if (foto.length > 550000) {
                    reject(new Error("A imagem ainda ficou muito grande."));
                    return;
                }

                resolve(foto);
            };

            imagem.src = String(leitor.result);
        };

        leitor.readAsDataURL(arquivo);
    });
}

function CampoInfo({ Icone, titulo, valor, grande = false }) {
    return (
        <div className={grande ? "sm:col-span-2" : ""}>
            <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
                <Icone size={15} className="text-[#1759ad]" />
                {titulo}
            </div>

            <p className="break-words text-sm font-semibold leading-relaxed text-[#082d56]">
                {valor || "Não informado"}
            </p>
        </div>
    );
}

export default function PerfilAdministrador() {
    const inputFotoRef = useRef(null);

    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [salvandoFoto, setSalvandoFoto] = useState(false);

    const [administrador, setAdministrador] = useState({
        nome: "",
        email: "",
        foto_perfil: null,
    });

    const [formulario, setFormulario] = useState({
        nome: "",
        email: "",
    });

    const [editando, setEditando] = useState(false);

    // Foto selecionada ainda não salva no Neon
    const [fotoSelecionada, setFotoSelecionada] = useState(null);

    useEffect(() => {
        let ativo = true;

        async function carregarPerfil() {
            try {
                const dados = await chamarAPI("/perfil-administrador");

                if (!ativo) return;

                setAdministrador(dados);

                setFormulario({
                    nome: dados.nome ?? "",
                    email: dados.email ?? "",
                });
            } catch (error) {
                if (ativo) toast.error(error.message);
            } finally {
                if (ativo) setCarregando(false);
            }
        }

        carregarPerfil();

        return () => {
            ativo = false;
        };
    }, []);

    // Atualizar nome no usuário da sessão
    function atualizarSessao(dados) {
        try {
            const usuario = JSON.parse(
                localStorage.getItem("@AndraRecursos:usuario") || "{}"
            );

            localStorage.setItem(
                "@AndraRecursos:usuario",
                JSON.stringify({
                    ...usuario,
                    nome: dados.nome,
                    email: dados.email,
                })
            );

            window.dispatchEvent(
                new Event("andrarecursos:perfil-atualizado")
            );
        } catch {
            // A alteração no banco já foi concluída.
        }
    }

    function abrirEdicao() {
        setFormulario({
            nome: administrador.nome || "",
            email: administrador.email || "",
        });

        setEditando(true);
    }

    // ========================================
    // SALVAR NOME E E-MAIL
    // ========================================

    async function salvarDados(evento) {
        evento.preventDefault();

        if (salvando) return;

        const nome = formulario.nome.trim();
        const email = formulario.email.trim();

        if (!nome || !email) {
            toast.error("Preencha nome e e-mail.");
            return;
        }

        setSalvando(true);

        try {
            const resultado = await chamarAPI(
                "/perfil-administrador",
                {
                    method: "PATCH",
                    body: JSON.stringify({ nome, email }),
                }
            );

            const dados = resultado.administrador;

            setAdministrador(dados);

            setFormulario({
                nome: dados.nome,
                email: dados.email,
            });

            atualizarSessao(dados);
            setEditando(false);

            toast.success("Perfil atualizado com sucesso!");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSalvando(false);
        }
    }

    // ========================================
    // SELECIONAR FOTO
    // ========================================

    async function selecionarFoto(evento) {
        const arquivo = evento.target.files?.[0];

        evento.target.value = "";

        if (!arquivo) return;

        try {
            const foto = await prepararImagem(arquivo);
            setFotoSelecionada(foto);
        } catch (error) {
            toast.error(error.message);
        }
    }

    // ========================================
    // SALVAR FOTO NO NEON
    // ========================================

    async function salvarFoto() {
        if (!fotoSelecionada || salvandoFoto) return;

        setSalvandoFoto(true);

        try {
            const resultado = await chamarAPI(
                "/perfil-administrador/foto",
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        foto: fotoSelecionada,
                    }),
                }
            );

            setAdministrador(resultado.administrador);
            setFotoSelecionada(null);

            window.dispatchEvent(
                new Event("andrarecursos:perfil-atualizado")
            );

            toast.success("Foto de perfil salva com sucesso!");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSalvandoFoto(false);
        }
    }

    // ========================================
    // REMOVER FOTO
    // ========================================

    async function removerFoto() {
        if (salvandoFoto) return;

        if (fotoSelecionada) {
            setFotoSelecionada(null);
            return;
        }

        if (!administrador.foto_perfil) return;

        setSalvandoFoto(true);

        try {
            const resultado = await chamarAPI(
                "/perfil-administrador/foto",
                { method: "DELETE" }
            );

            setAdministrador(resultado.administrador);

            window.dispatchEvent(
                new Event("andrarecursos:perfil-atualizado")
            );

            toast.success("Foto de perfil removida!");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSalvandoFoto(false);
        }
    }

    if (carregando) {
        return (
            <div className="flex min-h-72 items-center justify-center gap-3 text-[#082d56]">
                <FiRefreshCw className="animate-spin" />
                Carregando perfil...
            </div>
        );
    }

    const fotoExibida =
        fotoSelecionada || administrador.foto_perfil;

    return (
        <div className="space-y-6">
            {/* TÍTULO */}
            <div>
                <h1 className="text-2xl font-bold text-[#082d56] sm:text-3xl">
                    Perfil do Administrador
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                    Gerencie suas informações pessoais e sua foto de perfil.
                </p>
            </div>

            {/* CARTÃO PRINCIPAL */}
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="h-28 bg-gradient-to-r from-[#082d56] via-[#1759ad] to-[#438bd1] sm:h-36" />

                <div className="relative px-5 pb-6 sm:px-8">
                    {/* FOTO CIRCULAR */}
                    <div className="-mt-14 flex flex-col gap-5 sm:flex-row sm:items-end">
                        <div className="relative shrink-0">
                            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-blue-50 shadow-lg sm:h-32 sm:w-32">
                                {fotoExibida ? (
                                    <img
                                        src={fotoExibida}
                                        alt="Foto do administrador"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <FiUser size={49} className="text-[#1759ad]" />
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => inputFotoRef.current?.click()}
                                disabled={salvandoFoto}
                                title="Selecionar foto de perfil"
                                className="absolute bottom-1 right-0 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#082d56] text-white shadow-md transition hover:bg-[#1759ad] disabled:opacity-50"
                            >
                                <FiCamera size={18} />
                            </button>
                        </div>

                        <div className="min-w-0 flex-1 pb-1">
                            <h2 className="break-words text-xl font-bold text-[#082d56] sm:text-2xl">
                                {administrador.nome || "Administrador"}
                            </h2>

                            <p className="mt-1 flex items-center gap-2 break-all text-sm text-gray-500">
                                <FiMail className="shrink-0" />
                                {administrador.email || "E-mail não informado"}
                            </p>

                            <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-[#1759ad]">
                                <FiShield />
                                ADMINISTRADOR
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={abrirEdicao}
                            className="flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-[#1759ad] transition hover:bg-blue-100"
                        >
                            <FiEdit3 />
                            Editar perfil
                        </button>
                    </div>

                    <input
                        ref={inputFotoRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={selecionarFoto}
                        className="hidden"
                        aria-label="Selecionar foto de perfil"
                    />

                    {/* AÇÕES DA FOTO */}
                    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5">
                        <button
                            type="button"
                            onClick={() => inputFotoRef.current?.click()}
                            disabled={salvandoFoto}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-[#082d56] hover:bg-gray-50"
                        >
                            <FiCamera />
                            {fotoExibida ? "Trocar foto" : "Adicionar foto"}
                        </button>

                        {fotoSelecionada && (
                            <button
                                type="button"
                                onClick={salvarFoto}
                                disabled={salvandoFoto}
                                className="inline-flex items-center gap-2 rounded-lg bg-[#082d56] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1759ad] disabled:opacity-50"
                            >
                                {salvandoFoto ? (
                                    <FiRefreshCw className="animate-spin" />
                                ) : (
                                    <FiSave />
                                )}

                                {salvandoFoto ? "Salvando..." : "Salvar foto"}
                            </button>
                        )}

                        {(fotoSelecionada || administrador.foto_perfil) && (
                            <button
                                type="button"
                                onClick={removerFoto}
                                disabled={salvandoFoto}
                                className="inline-flex items-center gap-2 rounded-lg border border-red-100 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                                <FiTrash2 />
                                {fotoSelecionada
                                    ? "Cancelar escolha"
                                    : "Remover foto"}
                            </button>
                        )}

                        <p className="w-full text-xs text-gray-400">
                            Formatos aceitos: JPG, PNG e WebP. A imagem será
                            ajustada automaticamente para o perfil.
                        </p>
                    </div>
                </div>
            </section>

            {/* INFORMAÇÕES */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* CONTA */}
                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center gap-3">
                        <span className="rounded-xl bg-blue-100 p-3 text-[#1759ad]">
                            <FiUser size={21} />
                        </span>

                        <div>
                            <h3 className="text-lg font-bold text-[#082d56]">
                                Dados do Administrador
                            </h3>

                            <p className="text-xs text-gray-500">
                                Informações da sua conta
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-5">
                        <CampoInfo
                            Icone={FiUser}
                            titulo="Nome completo"
                            valor={administrador.nome}
                        />

                        <CampoInfo
                            Icone={FiMail}
                            titulo="E-mail de acesso"
                            valor={administrador.email}
                        />

                        <CampoInfo
                            Icone={FiShield}
                            titulo="Tipo de acesso"
                            valor="Administrador"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={abrirEdicao}
                        className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg bg-[#082d56] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#1759ad]"
                    >
                        <FiEdit3 />
                        Atualizar dados
                    </button>
                </section>

                {/* INSTITUIÇÃO */}
                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center gap-3">
                        <span className="rounded-xl bg-blue-100 p-3 text-[#1759ad]">
                            <FiBuilding size={21} />
                        </span>

                        <div>
                            <h3 className="text-lg font-bold text-[#082d56]">
                                Dados Institucionais
                            </h3>

                            <p className="text-xs text-gray-500">
                                Informações da organização
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <CampoInfo
                            Icone={FiBuilding}
                            titulo="Razão social"
                            valor={instituicao.razaoSocial}
                            grande
                        />

                        <CampoInfo
                            Icone={FiBriefcase}
                            titulo="CNPJ"
                            valor={instituicao.cnpj}
                        />

                        <CampoInfo
                            Icone={FiUser}
                            titulo="Gabinete do Prefeito"
                            valor={instituicao.gabinete}
                        />

                        <CampoInfo
                            Icone={FiPhone}
                            titulo="Telefone"
                            valor={instituicao.telefone}
                        />

                        <CampoInfo
                            Icone={FiMapPin}
                            titulo="Endereço"
                            valor={instituicao.endereco}
                            grande
                        />
                    </div>
                </section>
            </div>

            {/* INFORMAÇÃO */}
            <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-[#082d56]">
                <FiCheckCircle className="mt-0.5 shrink-0 text-[#1759ad]" />
                <p>
                    Os dados pessoais e a foto são vinculados à sua conta
                    administrativa e permanecem salvos no banco de dados.
                </p>
            </div>

            {/* MODAL DE EDIÇÃO */}
            {editando && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#07182b]/65 p-4 backdrop-blur-sm">
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="titulo-edicao-perfil"
                        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                            <h3
                                id="titulo-edicao-perfil"
                                className="text-lg font-bold text-[#082d56]"
                            >
                                Editar perfil
                            </h3>

                            <button
                                type="button"
                                onClick={() => setEditando(false)}
                                disabled={salvando}
                                aria-label="Fechar edição"
                                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                            >
                                <FiX />
                            </button>
                        </div>

                        <form onSubmit={salvarDados} className="space-y-5 p-6">
                            <div>
                                <label
                                    htmlFor="nome-admin"
                                    className="mb-2 block text-sm font-semibold text-[#082d56]"
                                >
                                    Nome completo
                                </label>

                                <input
                                    id="nome-admin"
                                    type="text"
                                    required
                                    maxLength={150}
                                    value={formulario.nome}
                                    onChange={(e) =>
                                        setFormulario((anterior) => ({
                                            ...anterior,
                                            nome: e.target.value,
                                        }))
                                    }
                                    className="min-h-12 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="email-admin"
                                    className="mb-2 block text-sm font-semibold text-[#082d56]"
                                >
                                    E-mail
                                </label>

                                <input
                                    id="email-admin"
                                    type="email"
                                    required
                                    maxLength={150}
                                    value={formulario.email}
                                    onChange={(e) =>
                                        setFormulario((anterior) => ({
                                            ...anterior,
                                            email: e.target.value,
                                        }))
                                    }
                                    className="min-h-12 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
                                <button
                                    type="button"
                                    onClick={() => setEditando(false)}
                                    disabled={salvando}
                                    className="rounded-lg border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={salvando}
                                    className="flex items-center gap-2 rounded-lg bg-[#082d56] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1759ad] disabled:opacity-50"
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
