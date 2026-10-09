
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
    FiSettings,
    FiShield,
    FiBell,
    FiMonitor,
    FiLock,
    FiEye,
    FiEyeOff,
    FiSave,
    FiCheckCircle,
    FiAlertCircle,
    FiRefreshCw,
    FiUser,
    FiMail,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";

const API = String(enderecoServidor).replace(/\/$/, "");

const PREFERENCIAS_PADRAO = {
    notificar_novas_solicitacoes: true,
    notificar_prioridade_alta: true,
    reduzir_animacoes: false,
};

// =============================================
// CONEXÃO COM A API
// =============================================

async function requisicao(caminho, opcoes = {}) {
    const token = localStorage.getItem(
        "@AndraRecursos:token"
    );

    if (!token) {
        throw new Error(
            "Sessão expirada. Faça login novamente."
        );
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

// =============================================
// COMPONENTE DOS BOTÕES DE ATIVAR/DESATIVAR
// =============================================

function OpcaoConfiguracao({
    titulo,
    descricao,
    valor,
    aoAlterar,
    desabilitado = false,
}) {
    return (
        <label
            className={`flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-[#f8fafc] p-4 transition hover:border-blue-200 ${desabilitado
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer"
                }`}
        >
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#082d56]">
                    {titulo}
                </span>

                <span className="mt-1 block text-xs leading-relaxed text-gray-500">
                    {descricao}
                </span>
            </span>

            <span className="relative shrink-0">
                <input
                    type="checkbox"
                    checked={valor}
                    disabled={desabilitado}
                    onChange={(evento) =>
                        aoAlterar(evento.target.checked)
                    }
                    className="peer sr-only"
                />

                <span className="block h-7 w-12 rounded-full bg-gray-300 transition peer-checked:bg-[#1759ad] peer-focus-visible:ring-4 peer-focus-visible:ring-blue-200" />

                <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
            </span>
        </label>
    );
}

// =============================================
// PÁGINA DE CONFIGURAÇÕES
// =============================================

export default function ConfiguracoesAdmin() {
    const [aba, setAba] = useState("seguranca");

    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [salvandoSenha, setSalvandoSenha] = useState(false);
    const [erro, setErro] = useState("");

    const [administrador, setAdministrador] = useState({
        nome: "",
        email: "",
    });

    const [preferencias, setPreferencias] = useState(
        PREFERENCIAS_PADRAO
    );

    const [senhas, setSenhas] = useState({
        senhaAtual: "",
        novaSenha: "",
        confirmarSenha: "",
    });

    const [mostrarSenha, setMostrarSenha] = useState(false);

    // ==========================================
    // CARREGAR CONFIGURAÇÕES DO NEON
    // ==========================================

    useEffect(() => {
        let ativo = true;

        async function carregarConfiguracoes() {
            setCarregando(true);
            setErro("");

            try {
                const dados = await requisicao(
                    "/configuracoes-admin"
                );

                if (!ativo) return;

                setAdministrador({
                    nome: dados.nome || "",
                    email: dados.email || "",
                });

                setPreferencias({
                    notificar_novas_solicitacoes:
                        dados.notificar_novas_solicitacoes ?? true,

                    notificar_prioridade_alta:
                        dados.notificar_prioridade_alta ?? true,

                    reduzir_animacoes:
                        dados.reduzir_animacoes ?? false,
                });

                document.documentElement.classList.toggle(
                    "reduzir-animacoes",
                    dados.reduzir_animacoes === true
                );

                localStorage.setItem(
                    "@AndraRecursos:reduzirAnimacoes",
                    String(dados.reduzir_animacoes === true)
                );
            } catch (error) {
                if (ativo) {
                    setErro(error.message);
                }
            } finally {
                if (ativo) {
                    setCarregando(false);
                }
            }
        }

        carregarConfiguracoes();

        return () => {
            ativo = false;
        };
    }, []);

    // ==========================================
    // ALTERAR PREFERÊNCIAS LOCALMENTE
    // ==========================================

    function alterarPreferencia(campo, valor) {
        setPreferencias((anterior) => ({
            ...anterior,
            [campo]: valor,
        }));
    }

    // ==========================================
    // SALVAR PREFERÊNCIAS
    // ==========================================

    async function salvarPreferencias() {
        if (salvando) return;

        setSalvando(true);

        try {
            const dados = await requisicao(
                "/configuracoes-admin",
                {
                    method: "PATCH",
                    body: JSON.stringify(preferencias),
                }
            );

            const configuracoes = dados.configuracoes;

            setPreferencias({
                notificar_novas_solicitacoes:
                    configuracoes.notificar_novas_solicitacoes,

                notificar_prioridade_alta:
                    configuracoes.notificar_prioridade_alta,

                reduzir_animacoes:
                    configuracoes.reduzir_animacoes,
            });

            document.documentElement.classList.toggle(
                "reduzir-animacoes",
                configuracoes.reduzir_animacoes
            );

            localStorage.setItem(
                "@AndraRecursos:reduzirAnimacoes",
                String(configuracoes.reduzir_animacoes)
            );

            toast.success(
                "Preferências salvas com sucesso!"
            );
        } catch (error) {
            toast.error(
                error.message ||
                "Erro ao salvar preferências."
            );
        } finally {
            setSalvando(false);
        }
    }

    // ==========================================
    // ALTERAR SENHA DO ADMINISTRADOR
    // ==========================================

    async function alterarSenha(evento) {
        evento.preventDefault();

        if (salvandoSenha) return;

        if (!senhas.senhaAtual) {
            toast.error("Informe a senha atual.");
            return;
        }

        if (
            senhas.novaSenha.length < 8 ||
            senhas.novaSenha.length > 72
        ) {
            toast.error(
                "A nova senha deve ter entre 8 e 72 caracteres."
            );
            return;
        }

        if (
            senhas.novaSenha !==
            senhas.confirmarSenha
        ) {
            toast.error(
                "As senhas informadas não coincidem."
            );
            return;
        }

        setSalvandoSenha(true);

        try {
            await requisicao(
                "/configuracoes-admin/senha",
                {
                    method: "PATCH",
                    body: JSON.stringify(senhas),
                }
            );

            setSenhas({
                senhaAtual: "",
                novaSenha: "",
                confirmarSenha: "",
            });

            setMostrarSenha(false);

            toast.success(
                "Senha alterada com sucesso!"
            );
        } catch (error) {
            toast.error(
                error.message ||
                "Não foi possível alterar a senha."
            );
        } finally {
            setSalvandoSenha(false);
        }
    }

    // ==========================================
    // ABAS DO MENU INTERNO
    // ==========================================

    const abas = [
        {
            id: "seguranca",
            nome: "Segurança",
            Icone: FiShield,
        },
        {
            id: "notificacoes",
            nome: "Notificações",
            Icone: FiBell,
        },
        {
            id: "aparencia",
            nome: "Aparência",
            Icone: FiMonitor,
        },
    ];

    // ==========================================
    // TELA DE CARREGAMENTO
    // ==========================================

    if (carregando) {
        return (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-[#082d56]">
                <FiRefreshCw className="animate-spin" />
                Carregando configurações...
            </div>
        );
    }

    // ==========================================
    // INTERFACE PRINCIPAL
    // ==========================================

    return (
        <div className="space-y-6">

            {/* CABEÇALHO */}
            <div>
                <h1 className="flex items-center gap-3 text-2xl font-bold text-[#082d56] sm:text-3xl">
                    <FiSettings />
                    Configurações
                </h1>

                <p className="mt-2 text-sm text-gray-500">
                    Gerencie a segurança e as preferências da sua conta.
                </p>
            </div>

            {/* ERROS */}
            {erro && (
                <div
                    role="alert"
                    className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                    <FiAlertCircle />
                    {erro}
                </div>
            )}

            {/* CARTÃO DO ADMINISTRADOR */}
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#082d56]">
                    <FiUser size={25} />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#082d56]">
                        {administrador.nome || "Administrador"}
                    </p>

                    <p className="mt-1 flex items-center gap-2 break-all text-xs text-gray-500">
                        <FiMail className="shrink-0" />
                        {administrador.email || "E-mail não informado"}
                    </p>
                </div>

                <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold text-[#1759ad]">
                    ADMINISTRADOR
                </span>

            </div>

            {/* LAYOUT INTERNO */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">

                {/* MENU DE ABAS */}
                <aside className="h-fit rounded-xl border border-gray-200 bg-white p-3 shadow-sm">

                    <p className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                        Preferências
                    </p>

                    <div className="space-y-1">
                        {abas.map(({ id, nome, Icone }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setAba(id)}
                                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${aba === id
                                        ? "bg-[#082d56] text-white"
                                        : "text-gray-600 hover:bg-blue-50 hover:text-[#082d56]"
                                    }`}
                            >
                                <Icone size={18} />
                                {nome}
                            </button>
                        ))}
                    </div>

                </aside>

                {/* CONTEÚDO DAS ABAS */}
                <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">

                    {/* ====================================
              SEGURANÇA
          ==================================== */}

                    {aba === "seguranca" && (
                        <div className="space-y-6">

                            <div className="flex items-start gap-3">

                                <div className="rounded-lg bg-blue-100 p-3 text-[#1759ad]">
                                    <FiLock size={21} />
                                </div>

                                <div>
                                    <h2 className="text-xl font-bold text-[#082d56]">
                                        Segurança da conta
                                    </h2>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Atualize sua senha de acesso ao AndraRecursos.
                                    </p>
                                </div>

                            </div>

                            <div className="border-t border-gray-100" />

                            <form
                                onSubmit={alterarSenha}
                                className="max-w-xl space-y-5"
                            >

                                {[
                                    {
                                        campo: "senhaAtual",
                                        titulo: "Senha atual",
                                        placeholder: "Digite sua senha atual",
                                    },
                                    {
                                        campo: "novaSenha",
                                        titulo: "Nova senha",
                                        placeholder: "Digite a nova senha",
                                    },
                                    {
                                        campo: "confirmarSenha",
                                        titulo: "Confirmar nova senha",
                                        placeholder: "Repita a nova senha",
                                    },
                                ].map((item) => (
                                    <div key={item.campo}>

                                        <label
                                            htmlFor={item.campo}
                                            className="mb-2 block text-sm font-semibold text-[#082d56]"
                                        >
                                            {item.titulo}
                                        </label>

                                        <div className="relative">

                                            <input
                                                id={item.campo}
                                                type={mostrarSenha ? "text" : "password"}
                                                required
                                                autoComplete={
                                                    item.campo === "senhaAtual"
                                                        ? "current-password"
                                                        : "new-password"
                                                }
                                                value={senhas[item.campo]}
                                                onChange={(evento) =>
                                                    setSenhas((anterior) => ({
                                                        ...anterior,
                                                        [item.campo]: evento.target.value,
                                                    }))
                                                }
                                                placeholder={item.placeholder}
                                                className="min-h-12 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-12 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                            />

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setMostrarSenha((valor) => !valor)
                                                }
                                                title={
                                                    mostrarSenha
                                                        ? "Ocultar senhas"
                                                        : "Mostrar senhas"
                                                }
                                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 text-gray-500 hover:bg-gray-100"
                                            >
                                                {mostrarSenha ? (
                                                    <FiEyeOff />
                                                ) : (
                                                    <FiEye />
                                                )}
                                            </button>

                                        </div>
                                    </div>
                                ))}

                                <p className="text-xs text-gray-500">
                                    Utilize uma senha exclusiva com pelo menos
                                    8 caracteres.
                                </p>

                                <button
                                    type="submit"
                                    disabled={salvandoSenha}
                                    className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#082d56] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#164675] disabled:opacity-50"
                                >
                                    {salvandoSenha ? (
                                        <FiRefreshCw className="animate-spin" />
                                    ) : (
                                        <FiCheckCircle />
                                    )}

                                    {salvandoSenha
                                        ? "Alterando senha..."
                                        : "Alterar senha"}
                                </button>

                            </form>
                        </div>
                    )}

                    {/* ====================================
              NOTIFICAÇÕES
          ==================================== */}

                    {aba === "notificacoes" && (
                        <div className="space-y-6">

                            <div className="flex items-start gap-3">

                                <div className="rounded-lg bg-blue-100 p-3 text-[#1759ad]">
                                    <FiBell size={21} />
                                </div>

                                <div>
                                    <h2 className="text-xl font-bold text-[#082d56]">
                                        Preferências de notificações
                                    </h2>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Escolha quais alertas deseja receber.
                                    </p>
                                </div>

                            </div>

                            <div className="border-t border-gray-100" />

                            <OpcaoConfiguracao
                                titulo="Novas solicitações"
                                descricao="Receber notificações sobre solicitações comuns cadastradas pelas instituições."
                                valor={preferencias.notificar_novas_solicitacoes}
                                aoAlterar={(valor) =>
                                    alterarPreferencia(
                                        "notificar_novas_solicitacoes",
                                        valor
                                    )
                                }
                                desabilitado={Boolean(erro)}
                            />

                            <OpcaoConfiguracao
                                titulo="Solicitações de alta prioridade"
                                descricao="Receber alertas sobre novas solicitações classificadas como alta ou urgente."
                                valor={preferencias.notificar_prioridade_alta}
                                aoAlterar={(valor) =>
                                    alterarPreferencia(
                                        "notificar_prioridade_alta",
                                        valor
                                    )
                                }
                                desabilitado={Boolean(erro)}
                            />

                            <button
                                type="button"
                                onClick={salvarPreferencias}
                                disabled={salvando || Boolean(erro)}
                                className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#082d56] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#164675] disabled:opacity-50"
                            >
                                {salvando ? (
                                    <FiRefreshCw className="animate-spin" />
                                ) : (
                                    <FiSave />
                                )}

                                {salvando
                                    ? "Salvando..."
                                    : "Salvar preferências"}
                            </button>

                        </div>
                    )}

                    {/* ====================================
              APARÊNCIA
          ==================================== */}

                    {aba === "aparencia" && (
                        <div className="space-y-6">

                            <div className="flex items-start gap-3">

                                <div className="rounded-lg bg-blue-100 p-3 text-[#1759ad]">
                                    <FiMonitor size={21} />
                                </div>

                                <div>
                                    <h2 className="text-xl font-bold text-[#082d56]">
                                        Aparência e acessibilidade
                                    </h2>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Personalize sua experiência de navegação.
                                    </p>
                                </div>

                            </div>

                            <div className="border-t border-gray-100" />

                            <OpcaoConfiguracao
                                titulo="Reduzir animações"
                                descricao="Diminui transições e efeitos de movimento nas páginas do sistema."
                                valor={preferencias.reduzir_animacoes}
                                aoAlterar={(valor) =>
                                    alterarPreferencia(
                                        "reduzir_animacoes",
                                        valor
                                    )
                                }
                                desabilitado={Boolean(erro)}
                            />

                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                                <p className="text-sm font-semibold text-[#082d56]">
                                    Identidade visual do sistema
                                </p>

                                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                                    O AndraRecursos utiliza azul-marinho,
                                    branco e tons suaves para manter
                                    consistência visual entre as páginas.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={salvarPreferencias}
                                disabled={salvando || Boolean(erro)}
                                className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#082d56] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#164675] disabled:opacity-50"
                            >
                                {salvando ? (
                                    <FiRefreshCw className="animate-spin" />
                                ) : (
                                    <FiSave />
                                )}

                                {salvando
                                    ? "Salvando..."
                                    : "Salvar preferências"}
                            </button>

                        </div>
                    )}

                </section>
            </div>
        </div>
    );
}
