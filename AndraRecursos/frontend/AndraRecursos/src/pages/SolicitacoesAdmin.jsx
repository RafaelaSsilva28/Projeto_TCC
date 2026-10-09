
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    FiSearch,
    FiRefreshCw,
    FiEye,
    FiX,
    FiArrowLeft,
    FiCalendar,
    FiHome,
    FiFlag,
    FiFileText,
    FiLayers,
    FiChevronLeft,
    FiChevronRight,
    FiAlertCircle,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";

const POR_PAGINA = 10;

function obterStatus(status) {
    const valor = String(status || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

    if (["aprovado", "aprovada"].includes(valor)) {
        return {
            texto: "APROVADA",
            classe: "bg-green-100 text-green-700",
        };
    }

    if (
        ["recusado", "recusada", "rejeitado", "rejeitada"].includes(valor)
    ) {
        return {
            texto: "RECUSADA",
            classe: "bg-red-100 text-red-700",
        };
    }

    if (valor === "em andamento") {
        return {
            texto: "EM ANDAMENTO",
            classe: "bg-blue-100 text-blue-700",
        };
    }

    if (valor === "pendente") {
        return {
            texto: "PENDENTE",
            classe: "bg-amber-100 text-amber-700",
        };
    }

    return {
        texto: String(status || "Não informado").toUpperCase(),
        classe: "bg-gray-100 text-gray-700",
    };
}

function formatarData(valor) {
    if (!valor) return "Não informada";

    const texto = String(valor);

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        const [ano, mes, dia] = texto.split("-");
        return `${dia}/${mes}/${ano}`;
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return texto;
    }

    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(data);
}

function normalizarSolicitacao(registro) {
    return {
        id: registro.id_solicitacoes ?? registro.id_solicitacao ?? registro.id,
        titulo: registro.titulo ?? "Solicitação sem título",
        descricao: registro.descricao ?? "",
        instituicao:
            registro.nome_instituicao ??
            registro.instituicao?.nome ??
            "Instituição não informada",
        prioridade: registro.prioridade ?? "Não informada",
        setor: registro.setor ?? "Não informado",
        status: registro.status ?? "Não informado",
        data: registro.data_pedido ?? null,
    };
}

export default function SolicitacoesAdmin() {
    const navigate = useNavigate();
    const { id } = useParams();

    const [solicitacoes, setSolicitacoes] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [atualizacao, setAtualizacao] = useState(0);

    const [pesquisa, setPesquisa] = useState("");
    const [filtro, setFiltro] = useState("todos");
    const [pagina, setPagina] = useState(1);

    const [modalId, setModalId] = useState(null);

    useEffect(() => {
        const controlador = new AbortController();

        async function carregarSolicitacoes() {
            setCarregando(true);
            setErro("");

            try {
                const token = localStorage.getItem(
                    "@AndraRecursos:token"
                );

                if (!token) {
                    throw new Error("Faça login para visualizar solicitações.");
                }

                const resposta = await fetch(
                    `${enderecoServidor}/solicitacoes`,
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
                        dados?.message ||
                        dados?.error ||
                        `Erro ${resposta.status} ao consultar solicitações.`
                    );
                }

                const lista = Array.isArray(dados)
                    ? dados
                    : dados?.solicitacoes ?? dados?.dados;

                if (!Array.isArray(lista)) {
                    throw new Error(
                        "A API não retornou uma lista válida de solicitações."
                    );
                }

                if (!controlador.signal.aborted) {
                    setSolicitacoes(lista.map(normalizarSolicitacao));
                }
            } catch (error) {
                if (
                    error.name !== "AbortError" &&
                    !controlador.signal.aborted
                ) {
                    setErro(error.message);
                    setSolicitacoes([]);
                }
            } finally {
                if (!controlador.signal.aborted) {
                    setCarregando(false);
                }
            }
        }

        carregarSolicitacoes();

        return () => controlador.abort();
    }, [atualizacao]);

    const filtradas = useMemo(() => {
        const termo = pesquisa.trim().toLowerCase();

        return solicitacoes.filter((solicitacao) => {
            const correspondePesquisa =
                !termo ||
                [
                    solicitacao.titulo,
                    solicitacao.instituicao,
                    solicitacao.setor,
                    solicitacao.id,
                ].some((campo) =>
                    String(campo ?? "").toLowerCase().includes(termo)
                );

            const correspondeStatus =
                filtro === "todos" ||
                obterStatus(solicitacao.status).texto === filtro;

            return correspondePesquisa && correspondeStatus;
        });
    }, [solicitacoes, pesquisa, filtro]);

    const contadores = useMemo(() => ({
        total: solicitacoes.length,
        pendentes: solicitacoes.filter(
            (item) => obterStatus(item.status).texto === "PENDENTE"
        ).length,
        concluidas: solicitacoes.filter((item) =>
            ["APROVADA", "RECUSADA"].includes(
                obterStatus(item.status).texto
            )
        ).length,
    }), [solicitacoes]);

    const totalPaginas = Math.max(
        1,
        Math.ceil(filtradas.length / POR_PAGINA)
    );

    const paginaAtual = Math.min(pagina, totalPaginas);

    const registrosPagina = filtradas.slice(
        (paginaAtual - 1) * POR_PAGINA,
        paginaAtual * POR_PAGINA
    );

    // A rota /solicitacoes/:id também abre a mesma página,
    // já selecionando a solicitação indicada pelo Histórico.
    const idSelecionado = id ?? modalId;

    const selecionada = solicitacoes.find(
        (item) => String(item.id) === String(idSelecionado)
    );

    function abrirDetalhes(idSolicitacao) {
        setModalId(idSolicitacao);
    }

    function fecharDetalhes() {
        if (id) {
            navigate("/solicitacoes", { replace: true });
        } else {
            setModalId(null);
        }
    }

    return (
        <div className="min-w-0 space-y-6">

            {/* CABEÇALHO */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#082d56]">
                        Solicitações
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Gerencie as solicitações de recursos das instituições
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setAtualizacao((valor) => valor + 1)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d8e1ec] bg-white px-4 py-3 text-sm font-semibold text-[#082d56] transition hover:bg-blue-50"
                >
                    <FiRefreshCw
                        className={carregando ? "animate-spin" : ""}
                    />
                    Atualizar solicitações
                </button>
            </div>

            {/* INDICADORES */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                    {
                        titulo: "Total de solicitações",
                        valor: contadores.total,
                        cor: "text-[#082d56]",
                    },
                    {
                        titulo: "Pendentes",
                        valor: contadores.pendentes,
                        cor: "text-amber-600",
                    },
                    {
                        titulo: "Concluídas",
                        valor: contadores.concluidas,
                        cor: "text-green-700",
                    },
                ].map((card) => (
                    <div
                        key={card.titulo}
                        className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
                    >
                        <p className="text-sm text-gray-500">
                            {card.titulo}
                        </p>
                        <p className={`mt-2 text-3xl font-bold ${card.cor}`}>
                            {carregando ? "..." : card.valor}
                        </p>
                    </div>
                ))}
            </div>

            {/* PAINEL */}
            <section className="min-h-[430px] rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">

                {/* FILTROS */}
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
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#082d56] focus:ring-2 focus:ring-blue-100"
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
                    <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <FiAlertCircle className="shrink-0" />
                        <span>{erro}</span>
                    </div>
                )}

                {carregando && (
                    <div className="flex min-h-52 items-center justify-center gap-2 text-[#082d56]">
                        <FiRefreshCw className="animate-spin" />
                        Buscando solicitações...
                    </div>
                )}

                {!carregando && !erro && (
                    <>
                        <div className="space-y-3">
                            {registrosPagina.map((solicitacao) => {
                                const status = obterStatus(solicitacao.status);

                                return (
                                    <article
                                        key={solicitacao.id}
                                        className="rounded-xl border border-gray-200 bg-[#f5f6f8] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                                    >
                                        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                                    <span className="text-xs font-semibold text-[#51779f]">
                                                        SOLICITAÇÃO #{solicitacao.id}
                                                    </span>
                                                    <span
                                                        className={`rounded-full px-3 py-1 text-[11px] font-bold ${status.classe}`}
                                                    >
                                                        {status.texto}
                                                    </span>
                                                </div>

                                                <h2 className="text-base font-bold text-[#082d56]">
                                                    {solicitacao.titulo}
                                                </h2>

                                                <p className="mt-1 text-sm font-medium text-gray-600">
                                                    {solicitacao.instituicao}
                                                </p>

                                                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1.5">
                                                        <FiFlag />
                                                        Prioridade: {solicitacao.prioridade}
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <FiLayers />
                                                        Setor: {solicitacao.setor}
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <FiCalendar />
                                                        {formatarData(solicitacao.data)}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => abrirDetalhes(solicitacao.id)}
                                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#082d56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#164675]"
                                            >
                                                <FiEye />
                                                Ver detalhes
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}

                            {registrosPagina.length === 0 && (
                                <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-center text-gray-500">
                                    <FiFileText size={36} className="text-gray-300" />
                                    <p className="text-sm">
                                        Nenhuma solicitação encontrada.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* PAGINAÇÃO */}
                        {filtradas.length > 0 && (
                            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
                                <p className="text-xs text-gray-500">
                                    Exibindo{" "}
                                    {(paginaAtual - 1) * POR_PAGINA + 1} a{" "}
                                    {Math.min(
                                        paginaAtual * POR_PAGINA,
                                        filtradas.length
                                    )}{" "}
                                    de {filtradas.length} solicitações
                                </p>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        disabled={paginaAtual === 1}
                                        onClick={() =>
                                            setPagina((valor) => Math.max(1, valor - 1))
                                        }
                                        className="rounded-lg border border-gray-200 p-2 disabled:opacity-40"
                                        aria-label="Página anterior"
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
                                            setPagina((valor) =>
                                                Math.min(totalPaginas, valor + 1)
                                            )
                                        }
                                        className="rounded-lg border border-gray-200 p-2 disabled:opacity-40"
                                        aria-label="Próxima página"
                                    >
                                        <FiChevronRight />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* MODAL DE DETALHES */}
            {idSelecionado && !carregando && !erro && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-[#07182b]/65 p-4 backdrop-blur-sm"
                    onClick={fecharDetalhes}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="titulo-solicitacao"
                        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-[#f7f9fc] p-6">
                            <div>
                                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#52779c]">
                                    Detalhes da solicitação
                                </p>
                                <h2
                                    id="titulo-solicitacao"
                                    className="text-xl font-bold text-[#082d56]"
                                >
                                    {selecionada?.titulo || "Solicitação não encontrada"}
                                </h2>
                                {selecionada && (
                                    <p className="mt-1 text-sm text-gray-500">
                                        Solicitação #{selecionada.id}
                                    </p>
                                )}
                            </div>

                            <button
                                type="button"
                                aria-label="Fechar detalhes"
                                onClick={fecharDetalhes}
                                className="rounded-full p-2 hover:bg-gray-200"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        {selecionada ? (
                            <div className="space-y-6 p-6">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div>
                                        <p className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                                            <FiHome /> Instituição
                                        </p>
                                        <p className="font-semibold text-[#082d56]">
                                            {selecionada.instituicao}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="mb-1 text-xs text-gray-500">
                                            Status atual
                                        </p>
                                        <span
                                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${obterStatus(selecionada.status).classe
                                                }`}
                                        >
                                            {obterStatus(selecionada.status).texto}
                                        </span>
                                    </div>

                                    <div>
                                        <p className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                                            <FiFlag /> Prioridade
                                        </p>
                                        <p className="font-semibold capitalize text-[#082d56]">
                                            {selecionada.prioridade}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                                            <FiLayers /> Setor
                                        </p>
                                        <p className="font-semibold text-[#082d56]">
                                            {selecionada.setor}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                                            <FiCalendar /> Data do pedido
                                        </p>
                                        <p className="font-semibold text-[#082d56]">
                                            {formatarData(selecionada.data)}
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-blue-100 bg-[#f7f9fc] p-5">
                                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#082d56]">
                                        <FiFileText />
                                        Descrição do pedido
                                    </p>
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                                        {selecionada.descricao ||
                                            "Nenhuma descrição informada."}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="p-6 text-sm text-gray-600">
                                Não foi possível localizar essa solicitação na lista
                                retornada pela API.
                            </p>
                        )}

                        <div className="flex justify-between gap-3 border-t border-gray-100 bg-gray-50 p-5">
                            <button
                                type="button"
                                onClick={() => {
                                    fecharDetalhes();
                                    navigate("/historico-adm");
                                }}
                                className="inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-[#082d56] hover:bg-gray-100"
                            >
                                <FiArrowLeft />
                                Histórico
                            </button>

                            <button
                                type="button"
                                onClick={fecharDetalhes}
                                className="rounded-lg bg-[#082d56] px-6 py-3 text-sm font-semibold text-white hover:bg-[#164675]"
                            >
                                Fechar
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
