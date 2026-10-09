
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    FiBell,
    FiCheck,
    FiCheckCircle,
    FiCheckSquare,
    FiChevronLeft,
    FiChevronRight,
    FiClock,
    FiDownload,
    FiFileText,
    FiFilter,
    FiRefreshCw,
    FiSearch,
    FiTrash2,
    FiArrowRight,
    FiAlertCircle,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";

const API = String(enderecoServidor).replace(/\/$/, "");
const POR_PAGINA = 5;

function formatarData(valor) {
    if (!valor) return "Data não informada";

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) return String(valor);

    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(data);
}

function statusVisual(valor) {
    const texto = String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    if (["aprovada", "aprovado"].includes(texto)) {
        return {
            nome: "APROVADA",
            classe: "bg-green-100 text-green-700",
        };
    }

    if (["recusada", "recusado"].includes(texto)) {
        return {
            nome: "RECUSADA",
            classe: "bg-red-100 text-red-700",
        };
    }

    if (texto === "em andamento") {
        return {
            nome: "EM ANDAMENTO",
            classe: "bg-blue-100 text-blue-700",
        };
    }

    if (texto === "pendente") {
        return {
            nome: "PENDENTE",
            classe: "bg-amber-100 text-amber-700",
        };
    }

    return null;
}

function tipoVisual(valor) {
    const texto = String(valor ?? "").toLowerCase();

    if (texto.includes("urgent") || texto.includes("prioridade")) {
        return {
            Icone: FiAlertCircle,
            classe: "bg-red-100 text-red-700",
            destaque: "border-red-200",
        };
    }

    if (texto.includes("aprov")) {
        return {
            Icone: FiCheckCircle,
            classe: "bg-green-100 text-green-700",
            destaque: "border-green-200",
        };
    }

    return {
        Icone: FiFileText,
        classe: "bg-blue-100 text-[#1759ad]",
        destaque: "border-blue-200",
    };
}

function escaparCSV(valor) {
    let texto = String(valor ?? "");

    if (/^\s*[=+\-@]/.test(texto)) {
        texto = "'" + texto;
    }

    return `"${texto.replace(/"/g, '""')}"`;
}

export default function NotificacoesAdmin() {
    const navigate = useNavigate();

    const [notificacoes, setNotificacoes] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [processando, setProcessando] = useState(false);
    const [erro, setErro] = useState("");

    const [filtro, setFiltro] = useState("todas");
    const [pesquisa, setPesquisa] = useState("");
    const [pagina, setPagina] = useState(1);
    const [atualizar, setAtualizar] = useState(0);

    async function requisicao(caminho, opcoes = {}) {
        const token = localStorage.getItem(
            "@AndraRecursos:token"
        );

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
                dados?.error ||
                dados?.message ||
                `Erro ${resposta.status} na API.`
            );
        }

        return dados;
    }

    useEffect(() => {
        const controlador = new AbortController();

        async function carregar() {
            setCarregando(true);
            setErro("");

            try {
                const token = localStorage.getItem(
                    "@AndraRecursos:token"
                );

                if (!token) throw new Error("Faça login novamente.");

                const resposta = await fetch(`${API}/notificacoes`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    signal: controlador.signal,
                });

                const dados = await resposta.json().catch(() => null);

                if (!resposta.ok) {
                    throw new Error(
                        dados?.error ||
                        dados?.message ||
                        `Erro ${resposta.status} ao carregar notificações.`
                    );
                }

                if (!Array.isArray(dados)) {
                    throw new Error(
                        "A API não retornou uma lista válida."
                    );
                }

                if (!controlador.signal.aborted) {
                    setNotificacoes(dados);
                }
            } catch (error) {
                if (
                    error.name !== "AbortError" &&
                    !controlador.signal.aborted
                ) {
                    setErro(error.message);
                }
            } finally {
                if (!controlador.signal.aborted) {
                    setCarregando(false);
                }
            }
        }

        carregar();

        return () => controlador.abort();
    }, [atualizar]);

    const totais = useMemo(() => ({
        total: notificacoes.length,
        naoLidas: notificacoes.filter((n) => !n.lida).length,
        lidas: notificacoes.filter((n) => n.lida).length,
    }), [notificacoes]);

    const filtradas = useMemo(() => {
        const termo = pesquisa.trim().toLowerCase();

        return notificacoes.filter((item) => {
            if (filtro === "nao-lidas" && item.lida) return false;
            if (filtro === "lidas" && !item.lida) return false;

            return (
                !termo ||
                [
                    item.mensagem,
                    item.tipo_informacao,
                    item.titulo_solicitacao,
                    item.nome_instituicao,
                ].some((valor) =>
                    String(valor ?? "").toLowerCase().includes(termo)
                )
            );
        });
    }, [notificacoes, pesquisa, filtro]);

    const totalPaginas = Math.max(
        1,
        Math.ceil(filtradas.length / POR_PAGINA)
    );

    const paginaAtual = Math.min(pagina, totalPaginas);

    const itensPagina = filtradas.slice(
        (paginaAtual - 1) * POR_PAGINA,
        paginaAtual * POR_PAGINA
    );

    async function marcarLida(item) {
        if (item.lida || processando) return;

        setProcessando(true);

        try {
            await requisicao(
                `/notificacoes/${item.id_notificacao}/lida`,
                { method: "PATCH" }
            );

            setNotificacoes((anteriores) =>
                anteriores.map((notificacao) =>
                    notificacao.id_notificacao === item.id_notificacao
                        ? { ...notificacao, lida: true }
                        : notificacao
                )
            );

            toast.success("Notificação marcada como lida!");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setProcessando(false);
        }
    }

    async function marcarTodas() {
        if (!totais.naoLidas || processando) return;

        setProcessando(true);

        try {
            await requisicao("/notificacoes/marcar-todas-lidas", {
                method: "PATCH",
            });

            setNotificacoes((anteriores) =>
                anteriores.map((item) => ({ ...item, lida: true }))
            );

            toast.success("Todas as notificações foram marcadas como lidas!");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setProcessando(false);
        }
    }

    async function excluir(item) {
        if (processando) return;

        setProcessando(true);

        try {
            await requisicao(
                `/notificacoes/${item.id_notificacao}`,
                { method: "DELETE" }
            );

            setNotificacoes((anteriores) =>
                anteriores.filter(
                    (n) => n.id_notificacao !== item.id_notificacao
                )
            );

            toast.success("Notificação excluída.");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setProcessando(false);
        }
    }

    async function abrirSolicitacao(item) {
        if (!item.id_solicitacao) return;

        if (!item.lida) {
            try {
                await requisicao(
                    `/notificacoes/${item.id_notificacao}/lida`,
                    { method: "PATCH" }
                );
            } catch (error) {
                toast.error(error.message);
                return;
            }
        }

        navigate(`/solicitacoes/${item.id_solicitacao}`);
    }

    function exportarRelatorio() {
        if (!filtradas.length) return;

        const linhas = [
            [
                "ID",
                "Mensagem",
                "Tipo",
                "Instituição",
                "Solicitação",
                "Status",
                "Lida",
                "Data",
            ],
            ...filtradas.map((item) => [
                item.id_notificacao,
                item.mensagem,
                item.tipo_informacao,
                item.nome_instituicao,
                item.titulo_solicitacao,
                item.status_solicitacao,
                item.lida ? "Sim" : "Não",
                formatarData(item.data_notificacao),
            ]),
        ];

        const csv = linhas
            .map((linha) => linha.map(escaparCSV).join(";"))
            .join("\r\n");

        const arquivo = new Blob(
            ["\uFEFF", csv],
            { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(arquivo);
        const link = document.createElement("a");

        link.href = url;
        link.download = "relatorio-notificacoes-andrarecursos.csv";

        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        toast.success("Relatório exportado com sucesso!");
    }

    return (
        <div className="min-w-0 space-y-6">
            {/* CABEÇALHO */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#082d56]">
                        Notificações
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Acompanhe as atualizações das solicitações
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={exportarRelatorio}
                        disabled={carregando || !!erro || !filtradas.length}
                        className="flex items-center gap-2 rounded-lg bg-[#082d56] px-5 py-3 text-sm font-semibold text-white hover:bg-[#164675] disabled:opacity-50"
                    >
                        <FiDownload />
                        Exportar Relatório
                    </button>

                    <button
                        type="button"
                        onClick={() => setAtualizar((a) => a + 1)}
                        disabled={carregando}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#082d56] hover:bg-blue-50 disabled:opacity-50"
                    >
                        <FiRefreshCw className={carregando ? "animate-spin" : ""} />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* CONTADORES */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    ["Total", totais.total, "text-[#082d56]"],
                    ["Não lidas", totais.naoLidas, "text-[#1759ad]"],
                    ["Lidas", totais.lidas, "text-green-700"],
                ].map(([titulo, quantidade, cor]) => (
                    <div
                        key={titulo}
                        className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5"
                    >
                        <p className="text-xs text-gray-500 sm:text-sm">{titulo}</p>
                        <p className={`mt-2 text-2xl font-bold sm:text-3xl ${cor}`}>
                            {carregando ? "..." : quantidade}
                        </p>
                    </div>
                ))}
            </div>

            {/* LISTAGEM */}
            <section className="min-h-[450px] rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div className="flex flex-wrap gap-2">
                        {[
                            ["todas", "Todas"],
                            ["nao-lidas", "Não lidas"],
                            ["lidas", "Lidas"],
                        ].map(([valor, titulo]) => (
                            <button
                                key={valor}
                                type="button"
                                onClick={() => {
                                    setFiltro(valor);
                                    setPagina(1);
                                }}
                                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${filtro === valor
                                        ? "bg-[#082d56] text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-blue-50"
                                    }`}
                            >
                                {titulo}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={marcarTodas}
                        disabled={processando || totais.naoLidas === 0}
                        className="flex items-center gap-2 text-sm font-semibold text-[#1759ad] hover:underline disabled:opacity-40"
                    >
                        <FiCheckSquare />
                        Marcar todas como lidas
                    </button>
                </div>

                <div className="relative mb-6">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="search"
                        value={pesquisa}
                        onChange={(e) => {
                            setPesquisa(e.target.value);
                            setPagina(1);
                        }}
                        placeholder="Pesquisar notificações..."
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#1759ad] focus:ring-2 focus:ring-blue-100"
                    />
                </div>

                {erro && (
                    <div className="mb-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <FiAlertCircle className="shrink-0" />
                        {erro}
                    </div>
                )}

                {carregando ? (
                    <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-[#082d56]">
                        <FiRefreshCw className="animate-spin" />
                        Carregando notificações...
                    </div>
                ) : !erro ? (
                    <>
                        <div className="mb-4 flex items-center gap-3">
                            <span className="text-xs font-semibold text-gray-500">
                                Recentes
                            </span>
                            <div className="h-px flex-1 bg-gray-200" />
                        </div>

                        <div className="space-y-3">
                            {itensPagina.map((item) => {
                                const visual = tipoVisual(item.tipo_informacao);
                                const Icone = visual.Icone;
                                const status = statusVisual(item.status_solicitacao);

                                return (
                                    <article
                                        key={item.id_notificacao}
                                        className={`rounded-xl border p-4 transition-all hover:shadow-md sm:p-5 ${item.lida
                                                ? "border-gray-200 bg-[#f6f7f9]"
                                                : "border-blue-200 bg-[#eff5ff]"
                                            }`}
                                    >
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${visual.classe}`}>
                                                <Icone size={21} />
                                            </span>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-sm font-bold text-[#082d56]">
                                                        {item.titulo_solicitacao ||
                                                            item.tipo_informacao ||
                                                            "Notificação"}
                                                    </h3>
                                                    {!item.lida && (
                                                        <span
                                                            className="h-2 w-2 rounded-full bg-blue-600"
                                                            title="Não lida"
                                                        />
                                                    )}
                                                    {status && (
                                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${status.classe}`}>
                                                            {status.nome}
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                                                    {item.mensagem}
                                                </p>

                                                {item.nome_instituicao && (
                                                    <p className="mt-1 text-xs font-medium text-[#1759ad]">
                                                        {item.nome_instituicao}
                                                    </p>
                                                )}

                                                <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
                                                    <FiClock />
                                                    {formatarData(item.data_notificacao)}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                                {!item.lida && (
                                                    <button
                                                        type="button"
                                                        title="Marcar como lida"
                                                        onClick={() => marcarLida(item)}
                                                        disabled={processando}
                                                        className="rounded-lg border border-blue-200 bg-white p-2.5 text-[#1759ad] hover:bg-blue-50 disabled:opacity-40"
                                                    >
                                                        <FiCheck />
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    title="Excluir notificação"
                                                    onClick={() => excluir(item)}
                                                    disabled={processando}
                                                    className="rounded-lg border border-red-100 bg-white p-2.5 text-red-500 hover:bg-red-50 disabled:opacity-40"
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        </div>

                                        {item.id_solicitacao && (
                                            <div className="mt-3 flex justify-end border-t border-black/5 pt-3">
                                                <button
                                                    type="button"
                                                    onClick={() => abrirSolicitacao(item)}
                                                    className="inline-flex items-center gap-2 text-xs font-bold text-[#1759ad] hover:underline"
                                                >
                                                    Ver solicitação
                                                    <FiArrowRight />
                                                </button>
                                            </div>
                                        )}
                                    </article>
                                );
                            })}

                            {itensPagina.length === 0 && (
                                <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-center text-gray-500">
                                    <FiBell size={34} className="text-gray-300" />
                                    <p className="text-sm">
                                        Nenhuma notificação encontrada.
                                    </p>
                                </div>
                            )}
                        </div>

                        {filtradas.length > 0 && (
                            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-5">
                                <p className="text-xs text-gray-500">
                                    Exibindo {(paginaAtual - 1) * POR_PAGINA + 1} a{" "}
                                    {Math.min(
                                        paginaAtual * POR_PAGINA,
                                        filtradas.length
                                    )}{" "}
                                    de {filtradas.length} notificações
                                </p>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={paginaAtual === 1}
                                        onClick={() => setPagina((p) => Math.max(1, p - 1))}
                                        aria-label="Página anterior"
                                        className="rounded-lg border border-gray-200 p-2 text-[#082d56] disabled:opacity-40"
                                    >
                                        <FiChevronLeft />
                                    </button>

                                    <span className="rounded-lg bg-[#082d56] px-3 py-2 text-xs font-semibold text-white">
                                        {paginaAtual} / {totalPaginas}
                                    </span>

                                    <button
                                        type="button"
                                        disabled={paginaAtual === totalPaginas}
                                        onClick={() =>
                                            setPagina((p) => Math.min(totalPaginas, p + 1))
                                        }
                                        aria-label="Próxima página"
                                        className="rounded-lg border border-gray-200 p-2 text-[#082d56] disabled:opacity-40"
                                    >
                                        <FiChevronRight />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : null}
            </section>
        </div>
    );
}
