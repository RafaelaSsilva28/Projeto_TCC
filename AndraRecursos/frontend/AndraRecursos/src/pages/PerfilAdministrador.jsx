import { useState } from "react";
import {
    FaUniversity,
    FaUserTie,
    FaShieldAlt,
    FaCheckCircle,
    FaLock,
    FaClock,
    FaTimes,
    FaSave,
} from "react-icons/fa";

import logo from "../assets/AndraRecursos.png";

const dadosIniciais = {
    razaoSocial: "PREFEITURA MUNICIPAL DE ANDRADINA",
    cnpj: "43.535.151/0001-67",
    gabinete: "MÁRIO CELSO LOPES",
    telefone: "(18) 3702-2200",
    endereco: "Rua Paes Leme, 1407 - Centro, Andradina - SP, 16901-110",
};

const campos = [
    { nome: "Razão social", chave: "razaoSocial" },
    { nome: "CNPJ", chave: "cnpj" },
    { nome: "Gabinete do Prefeito", chave: "gabinete" },
    { nome: "Telefone", chave: "telefone" },
    { nome: "Endereço", chave: "endereco" },
];

const itensSeguranca = [
    { nome: "Verificação em Duas Etapas", icone: FaCheckCircle },
    { nome: "Política de Senhas Fortes", icone: FaLock },
    { nome: "Sessão Expirável", icone: FaClock },
];

export default function PerfilAdministrador() {
    const [dados, setDados] = useState(dadosIniciais);
    const [formulario, setFormulario] = useState(dadosIniciais);
    const [editando, setEditando] = useState(false);

    function abrirEdicao() {
        setFormulario({ ...dados });
        setEditando(true);
    }

    function fecharEdicao() {
        setEditando(false);
    }

    function alterarCampo(event) {
        const { name, value } = event.target;

        setFormulario((anterior) => ({
            ...anterior,
            [name]: value,
        }));
    }

    function salvarDados(event) {
        event.preventDefault();
        setDados({ ...formulario });
        setEditando(false);
    }

    return (
        <>
            {/* TÍTULO */}
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-[#082d56] sm:text-3xl">
                    Perfil do Administrador
                </h1>

                <p className="text-sm text-gray-500">
                    Gerencie suas informações institucionais, segurança e preferências do
                    sistema.
                </p>
            </div>

            {/* ÁREA BRANCA PRINCIPAL */}
            <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    {/* CARD ESQUERDO */}
                    <div className="rounded-3xl border border-gray-200 bg-[#f8f8f8] p-6 shadow-sm">
                        <div className="mb-8 flex items-center gap-4">
                            <FaUniversity className="text-3xl text-[#0a4da2]" />
                            <h2 className="text-2xl font-bold text-[#0a4da2]">
                                Dados Institucionais
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2">
                            {campos.map((campo) => (
                                <div
                                    key={campo.chave}
                                    className={campo.chave === "endereco" ? "sm:col-span-2" : ""}
                                >
                                    <p className="mb-2 text-sm text-gray-400">{campo.nome}</p>
                                    <p className="text-base font-medium text-gray-700 break-words">
                                        {dados[campo.chave]}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={abrirEdicao}
                            className="mt-10 w-full rounded-xl bg-[#0b4b9b] px-4 py-4 text-sm font-semibold text-white shadow-md transition hover:bg-[#083b7d]"
                        >
                            Atualizar Dados
                        </button>
                    </div>

                    {/* COLUNA DIREITA */}
                    <div className="flex flex-col gap-6">
                        {/* PERFIL INSTITUIÇÃO */}
                        <div className="flex items-center gap-4 rounded-2xl bg-white p-2">
                            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                                <img
                                    src="/prefeitura-andradina.jpg"
                                    alt="Prefeitura Municipal de Andradina"
                                    onError={(event) => {
                                        event.currentTarget.onerror = null;
                                        event.currentTarget.src = logo;
                                    }}
                                    className="h-full w-full object-cover"
                                />
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-start gap-2">
                                    <FaUserTie className="mt-1 text-[#0a4da2]" />
                                    <h3 className="text-xl font-bold leading-tight text-[#0a4da2]">
                                        Prefeitura Municipal
                                        <span className="block">de Andradina</span>
                                    </h3>
                                </div>

                                <p className="mt-3 text-sm text-gray-500">
                                    Administrador Central do Sistema AndraRecursos
                                </p>
                            </div>
                        </div>

                        {/* SEGURANÇA */}
                        <div className="rounded-3xl border border-gray-200 bg-[#f8f8f8] p-5 shadow-sm">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1d4f91] text-white">
                                    <FaShieldAlt className="text-xl" />
                                </div>

                                <h3 className="text-2xl font-bold text-[#0a4da2]">
                                    Segurança do Sistema
                                </h3>
                            </div>

                            <div className="space-y-4">
                                {itensSeguranca.map(({ nome, icone: Icone }) => (
                                    <div
                                        key={nome}
                                        className="flex items-center gap-4 rounded-2xl bg-[#e4e8ed] px-4 py-4 shadow-sm"
                                    >
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#77a4cf] bg-[#b8d0e8] text-[#285d99]">
                                            <Icone className="text-lg" />
                                        </div>

                                        <p className="text-sm font-medium text-gray-700">{nome}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* MODAL */}
            {editando && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-[#082d56]">
                                Atualizar Dados Institucionais
                            </h2>

                            <button
                                type="button"
                                onClick={fecharEdicao}
                                className="text-gray-500 hover:text-red-500"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={salvarDados} className="space-y-4">
                            {campos.map((campo) => (
                                <div key={campo.chave}>
                                    <label
                                        htmlFor={campo.chave}
                                        className="mb-2 block text-sm font-semibold text-[#082d56]"
                                    >
                                        {campo.nome}
                                    </label>

                                    <input
                                        id={campo.chave}
                                        name={campo.chave}
                                        value={formulario[campo.chave]}
                                        onChange={alterarCampo}
                                        required
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#0b4b9b] focus:ring-2 focus:ring-[#0b4b9b]/20"
                                    />
                                </div>
                            ))}

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={fecharEdicao}
                                    className="rounded-xl bg-gray-200 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-300"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="flex items-center gap-2 rounded-xl bg-[#0b4b9b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#083b7d]"
                                >
                                    <FaSave />
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}