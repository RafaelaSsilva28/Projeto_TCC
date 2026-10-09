
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    FiDownload,
    FiEye,
    FiX,
    FiSearch,
    FiRefreshCw,
    FiChevronLeft,
    FiChevronRight,
    FiCalendar,
    FiAlertCircle,
    FiFileText,
    FiArrowUpRight,
    FiClipboard,
    FiClock,
    FiFlag,
    FiHome,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";

const ROTA_HISTORICO = "/historico-solicitacoes";
const LIMITE_PAGINA = 10;

// Ajuste apenas se a rota real da página de
// solicitações tiver outro endereço.
const ROTA_SOLICITACOES = "/solicitacoes";

// ============================================
// FORMATAR STATUS
// ============================================

function formatarStatus(status) {
    const valor = String(status || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    if (["aprovada", "aprovado", "deferida"].includes(valor)) {
        return {
            texto: "APROVADA",
            estilo: "bg-green-100 text-green-700",
        };
    }

    if (
        ["recusada", "recusado", "rejeitada", "indeferida"].includes(valor)
    ) {
        return {
            texto: "RECUSADA",
            estilo: "bg-red-100 text-red-700",
        };
    }

    if (valor === "em andamento") {
        return {
            texto: "EM ANDAMENTO",
            estilo: "bg-blue-100 text-blue-700",
        };
    }

    if (["pendente", "aguardando"].includes(valor)) {
        return {
            texto: "PENDENTE",
            estilo: "bg-yellow-100 text-yellow-700",
        };
    }

    return {
        texto: String(status || "Não informado").toUpperCase(),
        estilo: "bg-gray-200 text-gray-700",
    };
}

// ============================================
// FORMATAR DATA
// ============================================

function formatarData(registro) {
    if (registro.data_formatada) {
        return registro.data_formatada;
    }

    const valor = registro.data_alteracao;

    if (!valor) return "Não informada";

    const texto = String(valor);

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
        return texto;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        const [ano, mes, dia] = texto.split("-");
        return `${dia}/${mes}/${ano}`;
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return texto;
    }

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "America/Sao_Paulo",
    }).format(data);
}

// ============================================
// NORMALIZAR DADOS DA API
// ============================================

function formatarRegistro(registro) {
    return {
        id_historico: registro.id_historico,

        id_solicitacao: registro.id_solicitacao ?? null,

        instituicao:
            registro.nome_instituicao ||
            "Instituição não informada",

        titulo:
            registro.titulo_solicitacao ||
            "Solicitação sem título",

        descricao: registro.descricao || "",

        status: registro.status || "Não informado",

        prioridade:
            registro.prioridade || "Não informada",

        data: formatarData(registro),

        dataOriginal: registro.data_alteracao,
    };
}

// ============================================
// PROTEÇÃO DO ARQUIVO CSV
// ============================================

function escaparCSV(valor) {
    let texto = String(valor ?? "");

    if (/^\s*[=+\-@]/.test(texto)) {
        texto = "'" + texto;
    }

    return `"${texto.replace(/"/g, '""')}"`;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function HistoricoAdmin() {
    const navigate = useNavigate();

    const [historico, setHistorico] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

    const [pesquisa, setPesquisa] = useState("");
    const [filtroStatus, setFiltroStatus] = useState("todos");
    const [pagina, setPagina] = useState(1);
    const [atualizar, setAtualizar] = useState(0);

    const [detalhes, setDetalhes] = useState(null);

    // ==========================================
    // BUSCAR HISTÓRICO NA API
    // ==========================================

    useEffect(() => {
        const controlador = new AbortController();

        async function carregarHistorico() {
            setCarregando(true);
            setErro("");

            const token = localStorage.getItem(
                "@AndraRecursos:token"
            );

            if (!token) {
                setErro("Sessão expirada. Faça login novamente.");
                setCarregando(false);
                return;
            }

            try {
                const resposta = await fetch(
                    `${enderecoServidor}${ROTA_HISTORICO}`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        signal: controlador.signal,
                    }
                );

                const resultado = await resposta
                    .json()
                    .catch(() => null);

                if (!resposta.ok) {
                    throw new Error(
                        resultado?.message ||
                        resultado?.error ||
                        `Erro ${resposta.status} ao buscar histórico.`
                    );
                }

                if (!Array.isArray(resultado)) {
                    throw new Error(
                        "A API não retornou uma lista válida."
                    );
                }

                const registros = resultado.map(formatarRegistro);

                if (!controlador.signal.aborted) {
                    setHistorico(registros);
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

        carregarHistorico();

        return () => controlador.abort();
    }, [atualizar]);

    // ==========================================
    // FILTRO E PESQUISA
    // ==========================================

    const historicoFiltrado = useMemo(() => {
        const termo = pesquisa.toLowerCase().trim();

        return historico.filter((item) => {
            const correspondePesquisa =
                !termo ||
                [
                    item.instituicao,
                    item.titulo,
                    item.descricao,
                    item.id_solicitacao,
                    item.id_historico,
                ].some((valor) =>
                    String(valor ?? "")
                        .toLowerCase()
                        .includes(termo)
                );

            const status = formatarStatus(item.status).texto;

            const correspondeStatus =
                filtroStatus === "todos" ||
                status === filtroStatus;

            return correspondePesquisa && correspondeStatus;
        });
    }, [historico, pesquisa, filtroStatus]);

    // ==========================================
    // PAGINAÇÃO
    // ==========================================

    const totalPaginas = Math.max(
        1,
        Math.ceil(historicoFiltrado.length / LIMITE_PAGINA)
    );

    const paginaAtual = Math.min(pagina, totalPaginas);

    const itensPagina = historicoFiltrado.slice(
        (paginaAtual - 1) * LIMITE_PAGINA,
        paginaAtual * LIMITE_PAGINA
    );

    function mudarPesquisa(valor) {
        setPesquisa(valor);
        setPagina(1);
    }

    function mudarStatus(valor) {
        setFiltroStatus(valor);
        setPagina(1);
    }

    // ==========================================
    // EXPORTAR RELATÓRIO
    // ==========================================

    function exportarRelatorio() {
        if (historicoFiltrado.length === 0) return;

        const cabecalho = [
            "ID Histórico",
            "ID Solicitação",
            "Instituição",
            "Título",
            "Status",
            "Prioridade",
            "Descrição",
            "Data",
        ];

        const linhas = historicoFiltrado.map((item) => [
            item.id_historico,
            item.id_solicitacao,
            item.instituicao,
            item.titulo,
            formatarStatus(item.status).texto,
            item.prioridade,
            item.descricao,
            item.data,
        ]);

        const csv = [
            cabecalho.map(escaparCSV).join(";"),
            ...linhas.map((linha) =>
                linha.map(escaparCSV).join(";")
            ),
        ].join("\r\n");

        const arquivo = new Blob(
            ["\uFEFF", csv],
            { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(arquivo);
        const link = document.createElement("a");

        link.href = url;
        link.download = "historico-administrativo.csv";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    }

    // ==========================================
    // SABER MAIS
    // ==========================================

    function saberMais() {
        if (!detalhes?.id_solicitacao) return;

        const id = detalhes.id_solicitacao;

        setDetalhes(null);

        navigate(
            `${ROTA_SOLICITACOES}/${encodeURIComponent(id)}`
        );
    }

    // ==========================================
    // INTERFACE
    // ==========================================

    return (
        <div className="min-w-0">

            {/* CABEÇALHO DO HISTÓRICO */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">

                <div>
                    <h1 className="text-[28px] font-bold text-[#082d56]">
                        Histórico
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        Históricos de solicitações de recursos
                    </p>
                </div>

                <button
                    type="button"
                    onClick={exportarRelatorio}
                    disabled={
                        carregando ||
                        historicoFiltrado.length === 0
                    }
                    className="flex items-center gap-2 rounded-md bg-[#082d56] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#164675] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <FiDownload size={17} />
                    Exportar Relatório
                </button>
            </div>

            {/* PAINEL */}
            <section className="min-h-[480px] rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">

                {/* FILTROS */}
                <div className="mb-6 flex flex-col gap-3 md:flex-row">

                    <div className="relative flex-1">
                        <FiSearch
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                            type="search"
                            value={pesquisa}
                            onChange={(e) =>
                                mudarPesquisa(e.target.value)
                            }
                            placeholder="Pesquisar instituição ou solicitação..."
                            className="w-full rounded-lg border border-gray-200 bg-[#f7f7f7] py-3 pl-10 pr-4 text-sm outline-none focus:border-[#082d56] focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <select
                        value={filtroStatus}
                        onChange={(e) =>
                            mudarStatus(e.target.value)
                        }
                        className="rounded-lg border border-gray-200 bg-[#f7f7f7] px-4 py-3 text-sm text-[#082d56] outline-none"
                    >
                        <option value="todos">
                            Todos os status
                        </option>

                        <option value="APROVADA">
                            Aprovadas
                        </option>

                        <option value="RECUSADA">
                            Recusadas
                        </option>

                        <option value="PENDENTE">
                            Pendentes
                        </option>

                        <option value="EM ANDAMENTO">
                            Em andamento
                        </option>
                    </select>

                    <button
                        type="button"
                        onClick={() =>
                            setAtualizar((valor) => valor + 1)
                        }
                        className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm text-[#082d56] transition hover:bg-gray-100"
                    >
                        <FiRefreshCw size={16} />
                        Atualizar
                    </button>
                </div>

                {/* ERROS */}
                {erro && (
                    <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <FiAlertCircle
                            size={19}
                            className="shrink-0"
                        />
                        <p>{erro}</p>
                    </div>
                )}

                {/* CARREGAMENTO */}
                {carregando && (
                    <div className="flex min-h-52 items-center justify-center gap-3 text-[#082d56]">
                        <FiRefreshCw className="animate-spin" />
                        Carregando históricos...
                    </div>
                )}

                {/* REGISTROS */}
                {!carregando && !erro && (
                    <>
                        <div className="space-y-3">

                            {itensPagina.map((item) => {
                                const status = formatarStatus(item.status);

                                return (
                                    <article
                                        key={item.id_historico}
                                        className="grid grid-cols-1 items-center gap-3 rounded-lg border border-[#dddddd] bg-[#f1f1f1] px-5 py-4 shadow-[0_2px_2px_rgba(0,0,0,0.15)] transition duration-200 hover:-translate-y-0.5 hover:shadow-md md:grid-cols-[minmax(0,2fr)_125px_115px_130px]"
                                    >
                                        {/* INSTITUIÇÃO */}
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-bold text-[#082d56]">
                                                {item.instituicao}
                                            </h3>

                                            <p className="mt-1 text-xs text-gray-600">
                                                {item.titulo}
                                            </p>
                                        </div>

                                        {/* STATUS */}
                                        <div>
                                            <span
                                                className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-bold ${status.estilo}`}
                                            >
                                                {status.texto}
                                            </span>
                                        </div>

                                        {/* DATA */}
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <FiCalendar size={14} />
                                            {item.data}
                                        </div>

                                        {/* VER SOLICITAÇÃO */}
                                        <button
                                            type="button"
                                            onClick={() => setDetalhes(item)}
                                            className="flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-[#082d56] transition hover:text-blue-600 hover:underline"
                                        >
                                            <FiEye size={16} />
                                            Ver Solicitação
                                        </button>

                                    </article>
                                );
                            })}

                            {itensPagina.length === 0 && (
                                <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
                                    <FiFileText
                                        size={38}
                                        className="text-gray-300"
                                    />

                                    <p className="text-sm text-gray-500">
                                        Nenhum histórico encontrado.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* PAGINAÇÃO */}
                        {historicoFiltrado.length > 0 && (
                            <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-5 sm:flex-row">

                                <p className="text-xs text-gray-500">
                                    Exibindo{" "}
                                    {(paginaAtual - 1) * LIMITE_PAGINA + 1} a{" "}
                                    {Math.min(
                                        paginaAtual * LIMITE_PAGINA,
                                        historicoFiltrado.length
                                    )}{" "}
                                    de {historicoFiltrado.length} registros
                                </p>

                                <div className="flex items-center gap-2">

                                    <button
                                        type="button"
                                        disabled={paginaAtual === 1}
                                        onClick={() =>
                                            setPagina((atual) =>
                                                Math.max(1, atual - 1)
                                            )
                                        }
                                        className="rounded-lg border border-gray-200 p-2 text-[#082d56] transition hover:bg-gray-100 disabled:opacity-40"
                                    >
                                        <FiChevronLeft size={18} />
                                    </button>

                                    <span className="rounded-lg bg-[#082d56] px-3 py-2 text-xs font-semibold text-white">
                                        {paginaAtual} / {totalPaginas}
                                    </span>

                                    <button
                                        type="button"
                                        disabled={paginaAtual === totalPaginas}
                                        onClick={() =>
                                            setPagina((atual) =>
                                                Math.min(totalPaginas, atual + 1)
                                            )
                                        }
                                        className="rounded-lg border border-gray-200 p-2 text-[#082d56] transition hover:bg-gray-100 disabled:opacity-40"
                                    >
                                        <FiChevronRight size={18} />
                                    </button>

                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* ======================================
          MODAL DE DETALHES
      ====================================== */}

            {detalhes && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-[#07182b]/65 p-4 backdrop-blur-[3px]"
                    onClick={() => setDetalhes(null)}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="titulo-detalhes"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                    >

                        {/* CABEÇALHO DO MODAL */}
                        <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-[#f7f9fc] px-6 py-5">

                            <div className="min-w-0">
                                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#47719e]">
                                    Detalhes da Solicitação
                                </p>

                                <h2
                                    id="titulo-detalhes"
                                    className="text-xl font-bold text-[#082d56]"
                                >
                                    {detalhes.titulo}
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    Solicitação #{detalhes.id_solicitacao}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setDetalhes(null)}
                                aria-label="Fechar detalhes"
                                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-200"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        {/* INFORMAÇÕES */}
                        <div className="space-y-5 px-6 py-6">

                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                                {/* INSTITUIÇÃO */}
                                <div className="flex items-start gap-3">
                                    <span className="rounded-lg bg-blue-50 p-2.5 text-[#082d56]">
                                        <FiHome size={17} />
                                    </span>

                                    <div>
                                        <p className="mb-1 text-xs text-gray-500">
                                            Instituição
                                        </p>

                                        <p className="text-sm font-semibold text-[#082d56]">
                                            {detalhes.instituicao}
                                        </p>
                                    </div>
                                </div>

                                {/* STATUS */}
                                <div className="flex items-start gap-3">
                                    <span className="rounded-lg bg-blue-50 p-2.5 text-[#082d56]">
                                        <FiClipboard size={17} />
                                    </span>

                                    <div>
                                        <p className="mb-1 text-xs text-gray-500">
                                            Status atual
                                        </p>

                                        <span
                                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${formatarStatus(detalhes.status).estilo
                                                }`}
                                        >
                                            {formatarStatus(detalhes.status).texto}
                                        </span>
                                    </div>
                                </div>

                                {/* PRIORIDADE */}
                                <div className="flex items-start gap-3">
                                    <span className="rounded-lg bg-blue-50 p-2.5 text-[#082d56]">
                                        <FiFlag size={17} />
                                    </span>

                                    <div>
                                        <p className="mb-1 text-xs text-gray-500">
                                            Prioridade
                                        </p>

                                        <p className="text-sm font-semibold capitalize text-[#082d56]">
                                            {detalhes.prioridade}
                                        </p>
                                    </div>
                                </div>

                                {/* DATA */}
                                <div className="flex items-start gap-3">
                                    <span className="rounded-lg bg-blue-50 p-2.5 text-[#082d56]">
                                        <FiClock size={17} />
                                    </span>

                                    <div>
                                        <p className="mb-1 text-xs text-gray-500">
                                            Última atualização
                                        </p>

                                        <p className="text-sm font-semibold text-[#082d56]">
                                            {detalhes.data}
                                        </p>
                                    </div>
                                </div>

                            </div>

                            {/* DESCRIÇÃO */}
                            <div className="rounded-xl border border-[#e6edf5] bg-[#f7f9fc] p-4">

                                <div className="mb-2 flex items-center gap-2">
                                    <FiFileText
                                        size={16}
                                        className="text-[#47719e]"
                                    />

                                    <p className="text-xs font-semibold text-[#47719e]">
                                        Descrição da movimentação
                                    </p>
                                </div>

                                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                                    {detalhes.descricao ||
                                        "Nenhuma descrição registrada."}
                                </p>
                            </div>

                        </div>

                        {/* BOTÕES DO MODAL */}
                        <div className="flex flex-col gap-3 border-t border-gray-100 bg-[#fcfcfd] px-6 py-5 sm:flex-row">

                            <button
                                type="button"
                                onClick={() => setDetalhes(null)}
                                className="flex-1 rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                            >
                                Fechar
                            </button>

                            <button
                                type="button"
                                onClick={saberMais}
                                disabled={!detalhes.id_solicitacao}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#082d56] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#164675] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Saber mais
                                <FiArrowUpRight size={18} />
                            </button>

                        </div>

                    </section>
                </div>
            )}
        </div>
    );
}
