
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    FiSearch,
    FiRefreshCw,
    FiDownload,
    FiEye,
    FiCalendar,
    FiFlag,
    FiLayers,
    FiChevronLeft,
    FiChevronRight,
    FiAlertCircle,
    FiFileText,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";
import DetalhesSolicitacaoAdmin from "../components/DetalhesSolicitacaoAdmin";

const POR_PAGINA = 5;
const API = String(enderecoServidor).replace(/\/$/, "");

function statusVisual(valor) {
    const status = String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    if (["aprovada", "aprovado"].includes(status)) {
        return {
            texto: "APROVADA",
            classe: "bg-green-100 text-green-700",
        };
    }

    if (["recusada", "recusado", "rejeitada"].includes(status)) {
        return {
            texto: "RECUSADA",
            classe: "bg-red-100 text-red-700",
        };
    }

    if (status === "em andamento") {
        return {
            texto: "EM ANDAMENTO",
            classe: "bg-blue-100 text-blue-700",
        };
    }

    if (status === "pendente") {
        return {
            texto: "PENDENTE",
            classe: "bg-amber-100 text-amber-700",
        };
    }

    return {
        texto: String(valor || "NÃO INFORMADO").toUpperCase(),
        classe: "bg-gray-100 text-gray-700",
    };
}

function formatarData(valor) {
    if (!valor) return "Não informada";

    const texto = String(valor);

    // Sua API já retorna DD/MM/YYYY HH:mm.
    if (/^\d{2}\/\d{2}\/\d{4}/.test(texto)) {
        return texto;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        const [ano, mes, dia] = texto.split("-");
        return `${dia}/${mes}/${ano}`;
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) return texto;

    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(data);
}

function normalizar(item) {
    return {
        id:
            item.id_solicitacoes ??
            item.id_solicitacao ??
            item.id,
        titulo: item.titulo ?? "Solicitação sem título",
        descricao: item.descricao ?? "",
        instituicao:
            item.nome_instituicao ??
            item.instituicao?.nome ??
            "Instituição não informada",
        prioridade: item.prioridade ?? "Não informada",
        setor: item.setor ?? "Não informado",
        status: item.status ?? "Não informado",
        data: item.data_pedido ?? null,
    };
}

function escaparCSV(valor) {
    let texto = String(valor ?? "");

    if (/^\s*[=+\-@]/.test(texto)) {
        texto = "'" + texto;
    }

    return `"${texto.replace(/"/g, '""')}"`;
}

export default function SolicitacoesAdmin() {
    const navigate = useNavigate();
    const { id } = useParams();

    const [solicitacoes, setSolicitacoes] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [atualizar, setAtualizar] = useState(0);

    const [pesquisa, setPesquisa] = useState("");
    const [filtro, setFiltro] = useState("todos");
    const [pagina, setPagina] = useState(1);
    const [modalId, setModalId] = useState(null);

    useEffect(() => {
        const controlador = new AbortController();

        async function buscarSolicitacoes() {
            setCarregando(true);
            setErro("");

            try {
                const token = localStorage.getItem(
                    "@AndraRecursos:token"
                );

                if (!token) {
                    throw new Error(
                        "Sessão expirada. Faça login novamente."
                    );
                }

                const resposta = await fetch(
                    `${API}/solicitacoes`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        signal: controlador.signal,
                    }
                );

                const dados = await resposta.json().catch(() => null);

                if (!resposta.ok) {
                    throw new Error(
                        dados?.error ||
                        dados?.message ||
                        `Erro ${resposta.status}.`
                    );
                }

                const lista = Array.isArray(dados)
                    ? dados
                    : dados?.solicitacoes ?? dados?.dados;

                if (!Array.isArray(lista)) {
                    throw new Error(
                        "A API não retornou uma lista válida."
                    );
                }

                if (!controlador.signal.aborted) {
                    setSolicitacoes(lista.map(normalizar));
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

        buscarSolicitacoes();

        return () => controlador.abort();
    }, [atualizar]);

    const filtradas = useMemo(() => {
        const termo = pesquisa.toLowerCase().trim();

        return solicitacoes.filter((item) => {
            const correspondeBusca =
                !termo ||
                [
                    item.id,
                    item.titulo,
                    item.instituicao,
                    item.setor,
                    item.descricao,
                ].some((campo) =>
                    String(campo ?? "").toLowerCase().includes(termo)
                );

            const correspondeFiltro =
                filtro === "todos" ||
                statusVisual(item.status).texto === filtro;

            return correspondeBusca && correspondeFiltro;
        });
    }, [solicitacoes, pesquisa, filtro]);

    const indicadores = useMemo(() => {
        return {
            total: solicitacoes.length,
            pendentes: solicitacoes.filter(
                (item) => statusVisual(item.status).texto === "PENDENTE"
            ).length,
            emAndamento: solicitacoes.filter(
                (item) =>
                    statusVisual(item.status).texto === "EM ANDAMENTO"
            ).length,
            concluidas: solicitacoes.filter((item) =>
                ["APROVADA", "RECUSADA"].includes(
                    statusVisual(item.status).texto
                )
            ).length,
        };
    }, [solicitacoes]);

    const totalPaginas = Math.max(
        1,
        Math.ceil(filtradas.length / POR_PAGINA)
    );

    const paginaAtual = Math.min(pagina, totalPaginas);

    const itensPagina = filtradas.slice(
        (paginaAtual - 1) * POR_PAGINA,
        paginaAtual * POR_PAGINA
    );

    const idSelecionado = id ?? modalId;

    const selecionada = solicitacoes.find(
        (item) => String(item.id) === String(idSelecionado)
    );

    function fecharDetalhes() {
        if (id) {
            navigate("/solicitacoes", { replace: true });
        } else {
            setModalId(null);
        }
    }

    function exportarRelatorio() {
        if (!filtradas.length) return;

        const linhas = [
            [
                "ID",
                "Instituição",
                "Título",
                "Descrição",
                "Setor",
                "Prioridade",
                "Status",
                "Data do pedido",
            ],
            ...filtradas.map((item) => [
                item.id,
                item.instituicao,
                item.titulo,
                item.descricao,
                item.setor,
                item.prioridade,
                statusVisual(item.status).texto,
                formatarData(item.data),
            ]),
        ];

        const conteudo = linhas
            .map((linha) => linha.map(escaparCSV).join(";"))
            .join("\r\n");

        const arquivo = new Blob(
            ["\uFEFF", conteudo],
            { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(arquivo);
        const link = document.createElement("a");

        link.href = url;
        link.download = "relatorio-solicitacoes-andrarecursos.csv";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    }

    return (
        <div className="min-w-0 space-y-6">
            {/* CABEÇALHO */}
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#082d56]">
                        Solicitações
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Gerencie os pedidos de recursos das instituições
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={exportarRelatorio}
                        disabled={
                            carregando || Boolean(erro) || !filtradas.length
                        }
                        className="flex items-center gap-2 rounded-lg bg-[#082d56] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#164675] disabled:opacity-50"
                    >
                        <FiDownload />
                        Exportar Relatório
                    </button>

                    <button
                        type="button"
                        onClick={() => setAtualizar((valor) => valor + 1)}
                        disabled={carregando}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#082d56] transition hover:bg-blue-50 disabled:opacity-50"
                    >
                        <FiRefreshCw
                            className={carregando ? "animate-spin" : ""}
                        />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* INDICADORES */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    ["Total de solicitações", indicadores.total, "text-[#082d56]"],
                    ["Pendentes", indicadores.pendentes, "text-amber-600"],
                    ["Em andamento", indicadores.emAndamento, "text-blue-600"],
                    ["Concluídas", indicadores.concluidas, "text-green-700"],
                ].map(([titulo, valor, cor]) => (
                    <div
                        key={titulo}
                        className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
                    >
                        <p className="text-xs text-gray-500 sm:text-sm">
                            {titulo}
                        </p>
                        <p className={`mt-2 text-3xl font-bold ${cor}`}>
                            {carregando ? "..." : valor}
                        </p>
                    </div>
                ))}
            </div>

            {/* PAINEL */}
            <section className="min-h-[450px] rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-6 flex flex-col gap-3 md:flex-row">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="search"
                            value={pesquisa}
                            onChange={(e) => {
                                setPesquisa(e.target.value);
                                setPagina(1);
                            }}
                            placeholder="Pesquisar instituição ou solicitação..."
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <select
                        value={filtro}
                        onChange={(e) => {
                            setFiltro(e.target.value);
                            setPagina(1);
                        }}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#082d56] outline-none"
                    >
                        <option value="todos">Todos os status</option>
                        <option value="PENDENTE">Pendentes</option>
                        <option value="EM ANDAMENTO">Em andamento</option>
                        <option value="APROVADA">Aprovadas</option>
                        <option value="RECUSADA">Recusadas</option>
                    </select>
                </div>

                {erro && (
                    <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <FiAlertCircle className="mt-0.5 shrink-0" />
                        {erro}
                    </div>
                )}

                {carregando && (
                    <div className="flex min-h-52 items-center justify-center gap-2 text-sm text-[#082d56]">
                        <FiRefreshCw className="animate-spin" />
                        Carregando solicitações...
                    </div>
                )}

                {!carregando && !erro && (
                    <>
                        <div className="space-y-3">
                            {itensPagina.map((item) => {
                                const situacao = statusVisual(item.status);

                                return (
                                    <article
                                        key={item.id}
                                        className="rounded-xl border border-gray-200 bg-[#f3f4f6] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                                    >
                                        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                                    <span className="text-xs font-semibold text-[#47719e]">
                                                        SOLICITAÇÃO #{item.id}
                                                    </span>

                                                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${situacao.classe}`}>
                                                        {situacao.texto}
                                                    </span>
                                                </div>

                                                <h2 className="text-base font-bold text-[#082d56]">
                                                    {item.titulo}
                                                </h2>

                                                <p className="mt-1 text-sm font-medium text-gray-600">
                                                    {item.instituicao}
                                                </p>

                                                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <FiFlag />
                                                        Prioridade: {item.prioridade}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <FiLayers />
                                                        Setor: {item.setor}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <FiCalendar />
                                                        {formatarData(item.data)}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setModalId(item.id)}
                                                className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#082d56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#164675]"
                                            >
                                                <FiEye />
                                                Ver detalhes
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}

                            {!itensPagina.length && (
                                <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-gray-500">
                                    <FiFileText size={36} className="text-gray-300" />
                                    Nenhuma solicitação encontrada.
                                </div>
                            )}
                        </div>

                        {filtradas.length > 0 && (
                            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
                                <p className="text-xs text-gray-500">
                                    Exibindo {(paginaAtual - 1) * POR_PAGINA + 1} a{" "}
                                    {Math.min(paginaAtual * POR_PAGINA, filtradas.length)}{" "}
                                    de {filtradas.length} solicitações
                                </p>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        aria-label="Página anterior"
                                        disabled={paginaAtual === 1}
                                        onClick={() =>
                                            setPagina((valor) => Math.max(1, valor - 1))
                                        }
                                        className="rounded-lg border border-gray-200 p-2 text-[#082d56] disabled:opacity-40"
                                    >
                                        <FiChevronLeft />
                                    </button>

                                    <span className="rounded-lg bg-[#082d56] px-3 py-2 text-xs font-semibold text-white">
                                        {paginaAtual} / {totalPaginas}
                                    </span>

                                    <button
                                        type="button"
                                        aria-label="Próxima página"
                                        disabled={paginaAtual === totalPaginas}
                                        onClick={() =>
                                            setPagina((valor) =>
                                                Math.min(totalPaginas, valor + 1)
                                            )
                                        }
                                        className="rounded-lg border border-gray-200 p-2 text-[#082d56] disabled:opacity-40"
                                    >
                                        <FiChevronRight />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* MODAL DE DETALHAMENTO */}
            {idSelecionado != null && !carregando && !erro && (
                <DetalhesSolicitacaoAdmin
                    key={String(idSelecionado)}
                    solicitacao={selecionada}
                    idSolicitacao={idSelecionado}
                    onClose={fecharDetalhes}
                    onAtualizar={() =>
                        setAtualizar((valor) => valor + 1)
                    }
                />
            )}
        </div>
    );
}
