
import { useEffect, useMemo, useState } from "react";

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
} from "react-icons/fi";

import { enderecoServidor } from "../utils";

const ROTA_HISTORICO = "/historico-solicitacoes";
const LIMITE_PAGINA = 10;

function formatarStatus(status) {
    const valor = String(status || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    if (["aprovada", "aprovado", "deferida"].includes(valor)) {
        return {
            texto: "APROVADA",
            estilo: "bg-[#c8eed8] text-[#227248]",
        };
    }

    if (
        ["recusada", "recusado", "rejeitada", "indeferida"].includes(valor)
    ) {
        return {
            texto: "RECUSADA",
            estilo: "bg-[#f8d2d2] text-[#ad3333]",
        };
    }

    if (
        ["pendente", "em andamento", "aguardando"].includes(valor)
    ) {
        return {
            texto: "PENDENTE",
            estilo: "bg-[#fff0c5] text-[#926400]",
        };
    }

    return {
        texto: String(status || "Não informado").toUpperCase(),
        estilo: "bg-gray-200 text-gray-700",
    };
}

function formatarData(registro) {
    if (registro.data_formatada) {
        return registro.data_formatada;
    }

    // Compatibilidade com a resposta antiga da API.
    const valor = registro.data_alteracao;

    if (!valor) return "Data não informada";

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

function formatarRegistro(registro) {
    return {
        id_historico: registro.id_historico,
        id_solicitacao: registro.id_solicitacao ?? null,

        // Será exibido o nome da instituição quando
        // o backend fornecer este campo.
        instituicao:
            registro.nome_instituicao ??
            registro.instituicao ??
            null,

        titulo:
            registro.titulo_solicitacao ??
            "Solicitação sem título",

        descricao: registro.descricao ?? "",
        status: registro.status ?? "Não informado",
        prioridade: registro.prioridade ?? "Não informada",
        data: formatarData(registro),
        dataOriginal: registro.data_alteracao,
    };
}

function csvSeguro(valor) {
    let texto = String(valor ?? "");

    if (/^\s*[=+\-@]/.test(texto)) {
        texto = "'" + texto;
    }

    return `"${texto.replace(/"/g, '""')}"`;
}

export default function HistoricoAdmin() {
    const [historico, setHistorico] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

    const [pesquisa, setPesquisa] = useState("");
    const [filtroStatus, setFiltroStatus] = useState("todos");
    const [pagina, setPagina] = useState(1);
    const [atualizar, setAtualizar] = useState(0);

    const [detalhes, setDetalhes] = useState(null);

    // =============================================
    // CONSULTAR HISTÓRICO NA API / NEON
    // =============================================

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
                        "A API não retornou uma lista de históricos."
                    );
                }

                const registros = resultado.map(formatarRegistro);

                // A API nova já retorna em ordem decrescente.
                // Ordenação adicional para compatibilidade.
                registros.sort((a, b) => {
                    const dataA = Date.parse(a.dataOriginal);
                    const dataB = Date.parse(b.dataOriginal);

                    if (
                        Number.isFinite(dataA) &&
                        Number.isFinite(dataB)
                    ) {
                        return dataB - dataA;
                    }

                    return (b.id_historico ?? 0) -
                        (a.id_historico ?? 0);
                });

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

    // =============================================
    // FILTRO E PESQUISA
    // =============================================

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
                ]
                    .some((valor) =>
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

    // =============================================
    // PAGINAÇÃO
    // =============================================

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

    // =============================================
    // EXPORTAR RELATÓRIO CSV
    // =============================================

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
            item.instituicao || "Não informada",
            item.titulo,
            formatarStatus(item.status).texto,
            item.prioridade,
            item.descricao,
            item.data,
        ]);

        const csv = [
            cabecalho.map(csvSeguro).join(";"),
            ...linhas.map((linha) =>
                linha.map(csvSeguro).join(";")
            ),
        ].join("\r\n");

        const arquivo = new Blob(
            ["\uFEFF", csv],
            { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(arquivo);
        const link = document.createElement("a");

        link.href = url;
        link.download = "historico-andrarecursos.csv";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    }

    // =============================================
    // INTERFACE
    // =============================================

    return (
        <div className="min-w-0">

            {/* CABEÇALHO DA PÁGINA */}
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
                    className="flex items-center gap-2 rounded-md bg-[#082d56] px-5 py-3 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#124675] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <FiDownload size={17} />
                    Exportar Relatório
                </button>
            </div>

            {/* CONTEÚDO BRANCO DO HISTÓRICO */}
            <section className="min-h-[490px] rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">

                {/* PESQUISA E FILTROS */}
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
                            className="w-full rounded-lg border border-gray-200 bg-[#f7f7f7] py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#082d56] focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <select
                        value={filtroStatus}
                        onChange={(e) =>
                            mudarStatus(e.target.value)
                        }
                        className="rounded-lg border border-gray-200 bg-[#f7f7f7] px-4 py-3 text-sm text-[#082d56] outline-none focus:border-[#082d56]"
                    >
                        <option value="todos">
                            Todos os status
                        </option>
                        <option value="APROVADA">Aprovadas</option>
                        <option value="RECUSADA">Recusadas</option>
                        <option value="PENDENTE">Pendentes</option>
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

                {/* ERRO DA API */}
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

                {/* LISTA DE REGISTROS */}
                {!carregando && !erro && (
                    <>
                        <div className="space-y-4">

                            {itensPagina.map((item) => {
                                const status = formatarStatus(item.status);

                                return (
                                    <div
                                        key={item.id_historico}
                                        className="grid grid-cols-1 items-center gap-4 rounded-lg border border-[#d7d7d7] bg-[#f1f1f1] px-5 py-5 shadow-[0_2px_3px_rgba(0,0,0,0.13)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md md:grid-cols-[minmax(0,2fr)_110px_110px_auto]"
                                    >
                                        {/* NOME DA INSTITUIÇÃO / TÍTULO */}
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-bold leading-snug text-[#082d56]">
                                                {item.instituicao || item.titulo}
                                            </h3>

                                            {item.instituicao && (
                                                <p className="mt-1 truncate text-xs text-gray-500">
                                                    {item.titulo}
                                                </p>
                                            )}

                                            {item.id_solicitacao && (
                                                <p className="mt-1 text-xs text-gray-500">
                                                    Solicitação #{item.id_solicitacao}
                                                </p>
                                            )}
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
                                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
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

                                    </div>
                                );
                            })}

                            {/* SEM REGISTROS */}
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
                                        className="rounded-lg border border-gray-200 p-2 text-[#082d56] transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                                        aria-label="Página anterior"
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
                                        className="rounded-lg border border-gray-200 p-2 text-[#082d56] transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                                        aria-label="Próxima página"
                                    >
                                        <FiChevronRight size={18} />
                                    </button>

                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* MODAL DE DETALHES */}
            {detalhes && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={() => setDetalhes(null)}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="detalhes-historico"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2
                                    id="detalhes-historico"
                                    className="text-xl font-bold text-[#082d56]"
                                >
                                    Detalhes da Solicitação
                                </h2>

                                <p className="mt-1 text-xs text-gray-500">
                                    Histórico #{detalhes.id_historico}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setDetalhes(null)}
                                aria-label="Fechar detalhes"
                                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        <div className="mt-6 space-y-4 text-sm">
                            {detalhes.instituicao && (
                                <div>
                                    <p className="text-xs text-gray-500">
                                        Instituição
                                    </p>
                                    <p className="font-semibold text-[#082d56]">
                                        {detalhes.instituicao}
                                    </p>
                                </div>
                            )}

                            <div>
                                <p className="text-xs text-gray-500">
                                    Solicitação
                                </p>
                                <p className="font-semibold text-[#082d56]">
                                    {detalhes.titulo}
                                </p>
                            </div>

                            {detalhes.id_solicitacao && (
                                <div>
                                    <p className="text-xs text-gray-500">
                                        ID da Solicitação
                                    </p>
                                    <p className="font-medium">
                                        {detalhes.id_solicitacao}
                                    </p>
                                </div>
                            )}

                            <div>
                                <p className="text-xs text-gray-500">
                                    Status
                                </p>
                                <span
                                    className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-bold ${formatarStatus(detalhes.status).estilo
                                        }`}
                                >
                                    {formatarStatus(detalhes.status).texto}
                                </span>
                            </div>

                            <div>
                                <p className="text-xs text-gray-500">
                                    Prioridade
                                </p>
                                <p className="font-medium">
                                    {detalhes.prioridade}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs text-gray-500">
                                    Data da alteração
                                </p>
                                <p className="font-medium">
                                    {detalhes.data}
                                </p>
                            </div>

                            {detalhes.descricao && (
                                <div>
                                    <p className="text-xs text-gray-500">
                                        Descrição
                                    </p>
                                    <p className="whitespace-pre-wrap text-gray-700">
                                        {detalhes.descricao}
                                    </p>
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setDetalhes(null)}
                            className="mt-7 w-full rounded-lg bg-[#082d56] py-3 text-sm font-semibold text-white transition hover:bg-[#164675]"
                        >
                            Fechar
                        </button>
                    </section>
                </div>
            )}
        </div>
    );
}
