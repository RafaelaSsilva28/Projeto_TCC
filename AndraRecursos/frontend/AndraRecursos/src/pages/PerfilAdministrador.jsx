import React, { useState, useRef } from "react";
import { 
    FiUser, FiMail, FiBriefcase, FiHome, FiPhone, FiMapPin, 
    FiCamera, FiSave, FiTrash2, FiEdit3, FiRefreshCw, FiX 
} from "react-icons/fi";

export default function PerfilAdministrador() {
    const [dados, setDados] = useState(null);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState(null);
    const [editando, setEditando] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [salvandoFoto, setSalvandoFoto] = useState(false);
    const [fotoPendente, setFotoPendente] = useState(null);
    const [formulario, setFormulario] = useState({ nome: "", email: "" });

    const inputFoto = useRef(null);

    const CAMPOS_EDITAVEIS = [
        { chave: "nome", titulo: "Nome completo", tipo: "text", max: 100 },
        { chave: "email", titulo: "E-mail de acesso", tipo: "email", max: 100 }
    ];

    // Mock de funções auxiliares (substitua pelas reais do seu projeto)
    const requisicao = async (url, options) => ({ administrador: {} });
    const atualizarSessao = (admin) => {};
    const prepararFoto = async (arquivo) => URL.createObjectURL(arquivo);

    function editar() {
        setFormulario({
            nome: dados?.nome || "",
            email: dados?.email || ""
        });
        setEditando(true);
    }

    async function salvarDados(e) {
        e.preventDefault();
        if (salvando) return;

        setSalvando(true);

        try {
            const payload = {
                nome: formulario.nome,
                email: formulario.email,
            };

            if (!payload.nome) {
                toast.error("Informe seu nome.");
                return;
            }

            if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
                toast.error("Informe um e-mail válido.");
                return;
            }

            const resposta = await requisicao("/perfil-administrador", {
                method: "PATCH",
                body: JSON.stringify(payload),
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
                    Gerencie seu nome, e-mail e foto de perfil.
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

                            <input
                                type="file"
                                ref={inputFoto}
                                onChange={escolherFoto}
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                            />
                        </div>

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
                </div>
            </section>

            {/* CARTÕES INFERIORES */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* DADOS PESSOAIS */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 flex flex-col justify-between">
                    <div>
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
                            {/* Substitua por seu componente Informacao */}
                            <div className="text-sm"><strong>Nome completo:</strong> {dados.nome}</div>
                            <div className="text-sm"><strong>E-mail de acesso:</strong> {dados.email}</div>
                            <div className="text-sm"><strong>Tipo de acesso:</strong> Administrador</div>
                        </div>
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
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 flex flex-col justify-between">
                    <div>
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
                            <div className="text-sm"><strong>Razão social:</strong> {dados.razao_social}</div>
                            <div className="text-sm"><strong>CNPJ:</strong> {dados.cnpj}</div>
                            <div className="text-sm"><strong>Gabinete:</strong> {dados.gabinete}</div>
                            <div className="text-sm"><strong>Telefone:</strong> {dados.telefone}</div>
                            <div className="text-sm sm:col-span-2"><strong>Endereço:</strong> {dados.endereco}</div>
                        </div>
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
                                    Altere somente seu nome e e-mail de acesso.
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
                            {CAMPOS_EDITAVEIS.map((campo) => (
                                <div key={campo.chave}>
                                    <label
                                        htmlFor={campo.chave}
                                        className="mb-2 block text-sm font-semibold text-slate-700"
                                    >
                                        {campo.titulo}
                                    </label>

                                    <input
                                        id={campo.chave}
                                        type={campo.tipo}
                                        required
                                        maxLength={campo.max}
                                        autoComplete={campo.chave === "email" ? "email" : "name"}
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

                            <p className="rounded-lg bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-800">
                                Apenas seu nome e e-mail de acesso podem ser alterados aqui.
                                Os dados institucionais e o tipo de acesso permanecem somente para consulta.
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