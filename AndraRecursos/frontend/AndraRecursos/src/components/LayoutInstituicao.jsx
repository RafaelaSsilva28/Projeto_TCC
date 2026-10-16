
import { useCallback, useEffect, useRef, useState } from "react";
import {
    NavLink,
    useLocation,
    useNavigate,
} from "react-router-dom";

import {
    FiHome,
    FiPlusCircle,
    FiClock,
    FiBell,
    FiFileText,
    FiSettings,
    FiLogOut,
    FiMenu,
    FiX,
    FiUser,
    FiCheck,
    FiChevronRight,
    FiRefreshCw,
} from "react-icons/fi";

import toast from "react-hot-toast";
import logo from "../assets/AndraRecursos.png";
import { enderecoServidor } from "../utils";

const API = String(enderecoServidor).replace(/\/$/, "");
const TOKEN_KEY = "@AndraRecursos:token";
const USUARIO_KEY = "@AndraRecursos:usuario";
const LIMITE_PREVIEW = 5;

// ============================================
// MENU INSTITUCIONAL
// ============================================

const menuPrincipal = [
    {
        nome: "Dashboard",
        rota: "/principal-inst",
        Icone: FiHome,
    },
    {
        nome: "Enviar Solicitação",
        rota: "/solicitacoes-inst",
        Icone: FiPlusCircle,
    },
    {
        nome: "Minhas Solicitações",
        rota: "/instituicao/solicitacoes",
        Icone: FiFileText,
    },
    {
        nome: "Histórico",
        rota: "/historico-inst",
        Icone: FiClock,
    },
    {
        nome: "Notificações",
        rota: "/notificacoes-inst",
        Icone: FiBell,
    },
    {
        nome: "Relatórios",
        rota: "/relatorios-inst",
        Icone: FiFileText,
    },
];

// ============================================
// TÍTULOS DAS PÁGINAS
// ============================================

const titulos = {
    "/principal-inst": "Dashboard Institucional",
    "/solicitacoes-inst": "Enviar Solicitação",
    "/instituicao/solicitacoes": "Minhas Solicitações",
    "/historico-inst": "Histórico de Solicitações",
    "/notificacoes-inst": "Notificações",
    "/relatorios-inst": "Relatórios",
    "/configuracoes-inst": "Configurações",
};

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function formatarData(valor) {
    if (!valor) return "Data não informada";

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) return String(valor);

    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(data);
}

function resumir(texto, limite = 105) {
    const valor = String(texto || "Nova notificação");

    return valor.length > limite
        ? `${valor.slice(0, limite).trim()}…`
        : valor;
}

function obterToken() {
    const tokenSalvo = localStorage.getItem(TOKEN_KEY);

    if (
        tokenSalvo &&
        tokenSalvo !== "null" &&
        tokenSalvo !== "undefined"
    ) {
        return tokenSalvo;
    }

    try {
        const usuario = JSON.parse(
            localStorage.getItem(USUARIO_KEY) || "null"
        );

        if (typeof usuario === "string") return usuario;

        return (
            usuario?.token ||
            usuario?.accessToken ||
            usuario?.access_token ||
            null
        );
    } catch {
        return null;
    }
}

// ============================================
// LAYOUT INSTITUCIONAL
// ============================================

export default function LayoutInstituicao({
    children,
    nomeInstituicao,
}) {
    const navigate = useNavigate();
    const location = useLocation();

    const [menuAberto, setMenuAberto] = useState(false);

    const [notificacoes, setNotificacoes] = useState([]);
    const [carregandoNotificacoes, setCarregandoNotificacoes] =
        useState(true);
    const [erroNotificacoes, setErroNotificacoes] = useState("");

    const [painelNotificacoesAberto, setPainelNotificacoesAberto] =
        useState(false);

    const [marcandoId, setMarcandoId] = useState(null);

    const sinoRef = useRef(null);
    const painelRef = useRef(null);

    const titulo =
        titulos[location.pathname] || "Área Institucional";

    const naoLidas = notificacoes.filter(
        (item) => !Boolean(item.lida)
    ).length;

    const recentes = notificacoes.slice(0, LIMITE_PREVIEW);

    // ============================================
    // REQUISIÇÕES À API
    // ============================================

    const requisicao = useCallback(
        async (caminho, opcoes = {}) => {
            const token = obterToken();

            if (!token) {
                throw new Error(
                    "Sua sessão expirou. Entre novamente."
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

            if (
                resposta.status === 401 ||
                resposta.status === 403
            ) {
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USUARIO_KEY);

                navigate("/", { replace: true });

                throw new Error(
                    "Sua sessão expirou. Entre novamente."
                );
            }

            if (!resposta.ok) {
                throw new Error(
                    dados?.error ||
                    dados?.message ||
                    `Não foi possível concluir a operação (${resposta.status}).`
                );
            }

            return dados;
        },
        [navigate]
    );

    // ============================================
    // CARREGAR NOTIFICAÇÕES
    // ============================================

    const carregarNotificacoes = useCallback(
        async (silencioso = false) => {
            if (!silencioso) {
                setCarregandoNotificacoes(true);
            }

            setErroNotificacoes("");

            try {
                const dados = await requisicao(
                    "/notificacoes/instituicao"
                );

                if (!Array.isArray(dados)) {
                    throw new Error(
                        "A API não retornou uma lista válida de notificações."
                    );
                }

                const ordenadas = [...dados].sort((a, b) => {
                    const dataA = new Date(
                        a.data_notificacao || 0
                    ).getTime();

                    const dataB = new Date(
                        b.data_notificacao || 0
                    ).getTime();

                    return dataB - dataA;
                });

                setNotificacoes(ordenadas);
            } catch (error) {
                setErroNotificacoes(
                    error.message ||
                    "Não foi possível carregar as notificações."
                );
            } finally {
                if (!silencioso) {
                    setCarregandoNotificacoes(false);
                }
            }
        },
        [requisicao]
    );

    // Atualização automática a cada 30 segundos.
    useEffect(() => {
        carregarNotificacoes();

        const intervalo = window.setInterval(() => {
            if (obterToken()) {
                carregarNotificacoes(true);
            }
        }, 30000);

        return () => window.clearInterval(intervalo);
    }, [carregarNotificacoes]);

    // ============================================
    // FECHAR PAINEL DE NOTIFICAÇÕES
    // ============================================

    useEffect(() => {
        if (!painelNotificacoesAberto) return undefined;

        function fecharAoClicarFora(evento) {
            if (
                painelRef.current &&
                !painelRef.current.contains(evento.target) &&
                sinoRef.current &&
                !sinoRef.current.contains(evento.target)
            ) {
                setPainelNotificacoesAberto(false);
            }
        }

        function fecharComEscape(evento) {
            if (evento.key === "Escape") {
                setPainelNotificacoesAberto(false);
            }
        }

        document.addEventListener(
            "mousedown",
            fecharAoClicarFora
        );

        document.addEventListener(
            "keydown",
            fecharComEscape
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                fecharAoClicarFora
            );

            document.removeEventListener(
                "keydown",
                fecharComEscape
            );
        };
    }, [painelNotificacoesAberto]);

    // Fechar os painéis ao mudar de página.
    useEffect(() => {
        setPainelNotificacoesAberto(false);
        setMenuAberto(false);
    }, [location.pathname]);

    // ============================================
    // NAVEGAÇÃO E SESSÃO
    // ============================================

    function sair() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USUARIO_KEY);
        localStorage.removeItem("@AndraRecursos:lembrar");

        navigate("/", { replace: true });
    }

    function fecharMenu() {
        setMenuAberto(false);
    }

    const classeLink = ({ isActive }) =>
        `flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 ${
            isActive
                ? "bg-[#1755ad] text-white shadow-sm"
                : "text-blue-100 hover:bg-white/10 hover:text-white"
        }`;

    // ============================================
    // MARCAR NOTIFICAÇÃO COMO LIDA
    // ============================================

    async function marcarComoLida(item) {
        if (item.lida || marcandoId !== null) return;

        setMarcandoId(item.id_notificacao);

        try {
            await requisicao(
                `/notificacoes/instituicao/${item.id_notificacao}/lida`,
                { method: "PATCH" }
            );

            setNotificacoes((anteriores) =>
                anteriores.map((notificacao) =>
                    Number(notificacao.id_notificacao) ===
                    Number(item.id_notificacao)
                        ? { ...notificacao, lida: true }
                        : notificacao
                )
            );

            toast.success("Notificação marcada como lida.");
        } catch (error) {
            toast.error(
                error.message ||
                "Não foi possível marcar como lida."
            );
        } finally {
            setMarcandoId(null);
        }
    }

    // ============================================
    // ABRIR NOTIFICAÇÃO
    // ============================================

    async function abrirNotificacao(item) {
        if (!item.lida) {
            try {
                await requisicao(
                    `/notificacoes/instituicao/${item.id_notificacao}/lida`,
                    { method: "PATCH" }
                );

                setNotificacoes((anteriores) =>
                    anteriores.map((notificacao) =>
                        Number(notificacao.id_notificacao) ===
                        Number(item.id_notificacao)
                            ? { ...notificacao, lida: true }
                            : notificacao
                    )
                );
            } catch (error) {
                toast.error(
                    error.message ||
                    "Não foi possível atualizar a notificação."
                );

                return;
            }
        }

        setPainelNotificacoesAberto(false);

        if (item.id_solicitacao) {
            navigate(
                `/instituicao/solicitacoes/${item.id_solicitacao}`
            );
        } else {
            navigate("/notificacoes-inst");
        }
    }

    // ============================================
    // LINKS DO MENU
    // ============================================

    function linksMenu() {
        return menuPrincipal.map(
            ({ nome, rota, Icone }) => (
                <NavLink
                    key={rota}
                    to={rota}
                    onClick={fecharMenu}
                    className={classeLink}
                >
                    <Icone
                        size={20}
                        className="shrink-0"
                    />

                    <span>{nome}</span>
                </NavLink>
            )
        );
    }

    // ============================================
    // INTERFACE
    // ============================================

    return (
        <div className="min-h-screen bg-[#f4f6f9] text-slate-800 lg:flex">

            {/* FUNDO MOBILE */}
            {menuAberto && (
                <button
                    type="button"
                    aria-label="Fechar menu lateral"
                    onClick={fecharMenu}
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                />
            )}

            {/* MENU LATERAL */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-[#082d56] text-white shadow-xl transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none ${
                    menuAberto
                        ? "translate-x-0"
                        : "-translate-x-full"
                }`}
            >
                {/* LOGO */}
                <div className="flex min-h-24 items-center justify-between gap-3 border-b border-white/10 px-4 py-5">
                    <div className="flex min-w-0 items-center gap-3">
                        <img
                            src={logo}
                            alt="Logo AndraRecursos"
                            className="h-16 w-16 shrink-0 object-contain"
                        />

                        <div className="min-w-0">
                            <h1 className="text-base font-bold tracking-tight text-white">
                                AndraRecursos
                            </h1>

                            <p className="mt-1 text-xs text-blue-200">
                                Gestão Institucional
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={fecharMenu}
                        aria-label="Fechar menu"
                        className="rounded-lg p-2 text-white hover:bg-white/10 lg:hidden"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* NAVEGAÇÃO */}
                <nav
                    aria-label="Menu institucional"
                    className="flex-1 space-y-2 overflow-y-auto px-4 py-6"
                >
                    {linksMenu()}
                </nav>

                {/* CONFIGURAÇÕES E SAIR */}
                <div className="space-y-2 border-t border-white/10 px-4 py-5">
                    <NavLink
                        to="/configuracoes-inst"
                        onClick={fecharMenu}
                        className={classeLink}
                    >
                        <FiSettings size={20} />
                        <span>Configurações</span>
                    </NavLink>

                    <button
                        type="button"
                        onClick={sair}
                        className="flex min-h-12 w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold text-blue-100 transition hover:bg-red-500/20 hover:text-white"
                    >
                        <FiLogOut size={20} />
                        Sair
                    </button>
                </div>
            </aside>

            {/* CONTEÚDO PRINCIPAL */}
            <div className="flex min-w-0 flex-1 flex-col">

                {/* CABEÇALHO */}
                <header className="flex min-h-20 flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">

                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setMenuAberto(true)}
                            aria-label="Abrir menu"
                            className="rounded-lg p-2 text-[#082d56] hover:bg-blue-50 lg:hidden"
                        >
                            <FiMenu size={23} />
                        </button>

                        <div className="min-w-0">
                            <h2 className="text-base font-bold text-[#082d56] sm:text-lg">
                                {titulo}
                            </h2>

                            <p className="text-xs text-slate-500">
                                Painel da Instituição
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">

                        {/* SINO DE NOTIFICAÇÕES */}
                        <div className="relative">
                            <button
                                ref={sinoRef}
                                type="button"
                                onClick={() => {
                                    const abrir =
                                        !painelNotificacoesAberto;

                                    setPainelNotificacoesAberto(abrir);

                                    if (abrir) {
                                        carregarNotificacoes(true);
                                    }
                                }}
                                title={
                                    naoLidas > 0
                                        ? `${naoLidas} notificações não lidas`
                                        : "Notificações"
                                }
                                aria-label={`Notificações${
                                    naoLidas > 0
                                        ? `, ${naoLidas} não lidas`
                                        : ""
                                }`}
                                aria-expanded={
                                    painelNotificacoesAberto
                                }
                                aria-haspopup="dialog"
                                className={`relative flex h-11 w-11 items-center justify-center rounded-xl text-[#082d56] transition hover:bg-blue-50 ${
                                    painelNotificacoesAberto
                                        ? "bg-blue-50"
                                        : ""
                                }`}
                            >
                                <FiBell
                                    size={22}
                                    className={
                                        naoLidas > 0
                                            ? "origin-top animate-[sino_1.8s_ease-in-out_infinite]"
                                            : ""
                                    }
                                />

                                {naoLidas > 0 && (
                                    <span className="absolute -right-1 -top-1 flex min-h-[20px] min-w-[20px] animate-[badgePulse_2s_ease-in-out_infinite] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-extrabold leading-none text-white shadow-sm">
                                        {naoLidas > 99
                                            ? "99+"
                                            : naoLidas}
                                    </span>
                                )}
                            </button>

                            {/* PAINEL FLUTUANTE */}
                            {painelNotificacoesAberto && (
                                <section
                                    ref={painelRef}
                                    role="dialog"
                                    aria-label="Notificações recentes"
                                    className="absolute right-0 top-[calc(100%+12px)] z-[100] w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-left text-slate-800 shadow-[0_18px_55px_rgba(8,45,86,0.22)]"
                                >
                                    {/* CABEÇALHO DO PAINEL */}
                                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-sm font-bold text-[#082d56]">
                                                    Notificações
                                                </h2>

                                                {naoLidas > 0 && (
                                                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                                                        {naoLidas} não lida
                                                        {naoLidas !== 1
                                                            ? "s"
                                                            : ""}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="mt-1 text-xs text-slate-500">
                                                Atualizações recentes da sua instituição
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    carregarNotificacoes()
                                                }
                                                disabled={
                                                    carregandoNotificacoes
                                                }
                                                title="Atualizar notificações"
                                                aria-label="Atualizar notificações"
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                                            >
                                                <FiRefreshCw
                                                    className={
                                                        carregandoNotificacoes
                                                            ? "animate-spin"
                                                            : ""
                                                    }
                                                    size={15}
                                                />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPainelNotificacoesAberto(
                                                        false
                                                    )
                                                }
                                                aria-label="Fechar notificações"
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                                            >
                                                <FiX size={17} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* LISTA DE NOTIFICAÇÕES */}
                                    <div className="max-h-[min(65vh,440px)] overflow-y-auto">
                                        {carregandoNotificacoes &&
                                        notificacoes.length === 0 ? (
                                            <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500">
                                                <FiRefreshCw className="animate-spin" />
                                                Carregando notificações...
                                            </div>
                                        ) : erroNotificacoes &&
                                          notificacoes.length === 0 ? (
                                            <div className="px-4 py-7 text-center">
                                                <p className="text-sm font-medium text-red-600">
                                                    {erroNotificacoes}
                                                </p>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        carregarNotificacoes()
                                                    }
                                                    className="mt-3 text-xs font-bold text-[#1759ad] hover:underline"
                                                >
                                                    Tentar novamente
                                                </button>
                                            </div>
                                        ) : recentes.length === 0 ? (
                                            <div className="flex flex-col items-center px-5 py-9 text-center">
                                                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#1759ad]">
                                                    <FiBell size={22} />
                                                </span>

                                                <p className="text-sm font-semibold text-slate-700">
                                                    Tudo em dia!
                                                </p>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    Você não tem notificações no momento.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {recentes.map((item) => (
                                                    <article
                                                        key={item.id_notificacao}
                                                        className={`group relative px-4 py-3 transition hover:bg-blue-50/70 ${
                                                            item.lida
                                                                ? "bg-white"
                                                                : "bg-blue-50/60"
                                                        }`}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                abrirNotificacao(
                                                                    item
                                                                )
                                                            }
                                                            className="block w-full text-left"
                                                        >
                                                            <span className="flex items-start gap-3">
                                                                <span
                                                                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                                                        item.lida
                                                                            ? "bg-slate-100 text-slate-500"
                                                                            : "bg-blue-100 text-[#1759ad]"
                                                                    }`}
                                                                >
                                                                    <FiBell size={16} />
                                                                </span>

                                                                <span className="min-w-0 flex-1">
                                                                    <span className="flex items-start justify-between gap-2">
                                                                        <span
                                                                            className={`text-xs leading-5 ${
                                                                                item.lida
                                                                                    ? "font-medium text-slate-700"
                                                                                    : "font-bold text-[#082d56]"
                                                                            }`}
                                                                        >
                                                                            {item.titulo_solicitacao ||
                                                                                item.tipo_informacao ||
                                                                                "Notificação"}
                                                                        </span>

                                                                        {!item.lida && (
                                                                            <span
                                                                                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600"
                                                                                title="Não lida"
                                                                            />
                                                                        )}
                                                                    </span>

                                                                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                                                                        {resumir(
                                                                            item.mensagem
                                                                        )}
                                                                    </span>

                                                                    <span className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                                                                        <FiClock size={11} />
                                                                        {formatarData(
                                                                            item.data_notificacao
                                                                        )}
                                                                    </span>
                                                                </span>
                                                            </span>
                                                        </button>

                                                        {!item.lida && (
                                                            <button
                                                                type="button"
                                                                title="Marcar como lida"
                                                                aria-label="Marcar notificação como lida"
                                                                onClick={() =>
                                                                    marcarComoLida(
                                                                        item
                                                                    )
                                                                }
                                                                disabled={
                                                                    marcandoId !==
                                                                    null
                                                                }
                                                                className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-lg border border-blue-100 bg-white text-[#1759ad] transition hover:bg-blue-100 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                                                            >
                                                                {marcandoId ===
                                                                item.id_notificacao ? (
                                                                    <FiRefreshCw
                                                                        className="animate-spin"
                                                                        size={13}
                                                                    />
                                                                ) : (
                                                                    <FiCheck size={14} />
                                                                )}
                                                            </button>
                                                        )}
                                                    </article>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* RODAPÉ DO PAINEL */}
                                    <div className="border-t border-slate-100 bg-slate-50 p-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPainelNotificacoesAberto(
                                                    false
                                                );

                                                navigate(
                                                    "/notificacoes-inst"
                                                );
                                            }}
                                            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold text-[#1759ad] transition hover:bg-blue-50"
                                        >
                                            Ver todas as notificações
                                            <FiChevronRight size={15} />
                                        </button>
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* CONFIGURAÇÕES */}
                        <button
                            type="button"
                            title="Configurações"
                            aria-label="Acessar configurações"
                            onClick={() =>
                                navigate("/configuracoes-inst")
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#082d56] transition hover:bg-blue-50"
                        >
                            <FiSettings size={21} />
                        </button>

                        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

                        {/* INSTITUIÇÃO */}
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eaf2fc] text-[#1755ad]">
                                <FiUser size={20} />
                            </span>

                            <div className="hidden min-w-0 sm:block">
                                <p className="text-xs text-slate-500">
                                    Instituição
                                </p>

                                <p className="max-w-44 truncate text-sm font-bold text-[#082d56]">
                                    {nomeInstituicao ||
                                        "Área Institucional"}
                                </p>
                            </div>
                        </div>

                        {/* SAIR */}
                        <button
                            type="button"
                            onClick={sair}
                            className="hidden items-center gap-2 rounded-lg px-2 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 md:flex"
                        >
                            <FiLogOut size={17} />
                            Sair
                        </button>
                    </div>
                </header>

                {/* PÁGINA ATUAL */}
                <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>

            {/* ANIMAÇÕES DO SINO E DO CONTADOR */}
            <style>{`
                @keyframes badgePulse {
                    0%, 100% {
                        transform: scale(1);
                    }

                    50% {
                        transform: scale(1.12);
                    }
                }

                @keyframes sino {
                    0%, 88%, 100% {
                        transform: rotate(0deg);
                    }

                    90% {
                        transform: rotate(12deg);
                    }

                    92% {
                        transform: rotate(-12deg);
                    }

                    94% {
                        transform: rotate(9deg);
                    }

                    96% {
                        transform: rotate(-6deg);
                    }

                    98% {
                        transform: rotate(3deg);
                    }
                }
            `}</style>
        </div>
    );
}
