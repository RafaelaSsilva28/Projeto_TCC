
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
    FiSearch,
    FiRefreshCw,
    FiEye,
    FiCalendar,
    FiFlag,
    FiLayers,
    FiChevronLeft,
    FiChevronRight,
    FiAlertCircle,
    FiFileText,
    FiMessageCircle,
} from "react-icons/fi";

import toast from "react-hot-toast";

import { enderecoServidor } from "../utils";
import DetalhesSolicitacaoInstituicao from "../components/DetalhesSolicitacaoInstituicao";

const API = String(enderecoServidor).replace(/\/$/, "");

const TOKEN_KEY = "@AndraRecursos:token";
const USUARIO_KEY = "@AndraRecursos:usuario";

const POR_PAGINA = 8;

// ============================================
// AUTENTICAÇÃO
// ============================================

function obterToken() {
    const token = localStorage.getItem(TOKEN_KEY);

    if (token && token !== "null" && token !== "undefined") {
        return token;
    }

    try {
        const usuario = JSON.parse(
            localStorage.getItem(USUARIO_KEY) || "null"
        );

        if (typeof usuario === "string") {
            return usuario;
        }

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
// IDENTIFICADOR DA SOLICITAÇÃO
// ============================================

function obterIdSolicitacao(item) {
    const possiveisIds = [
        item?.id_solicitacoes,
        item?.id_solicitacao,
        item?.id,
    ];

    for (const valor of possiveisIds) {
        if (
            valor !== null &&
            valor !== undefined &&
            String(valor).trim() !== ""
        ) {
            const id = Number(valor);

            if (Number.isSafeInteger(id) && id > 0) {
                return id;
            }
        }
    }

    return null;
}

// ============================================
// FORMATAÇÃO
// ============================================

function formatarData(valor) {
    if (!valor) {
        return "Não informada";
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return String(valor);
    }

    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(data);
}

// ============================================
// STATUS
// ============================================

function normalizarStatus(status) {
    const valor = String(status || "")
        .toLowerCase()
        .trim();

    if (
        ["concluida", "concluída", "concluido", "concluído"]
            .includes(valor)
    ) {
        return "Concluída";
    }

    if (
        ["em andamento", "em_andamento", "andamento"]
            .includes(valor)
    ) {
        return "Em andamento";
    }

    if (
        ["pendente", "aberta", "aberto", "nova"]
            .includes(valor)
    ) {
        return "Pendente";
    }

    if (
        ["cancelada", "cancelado"]
            .includes(valor)
    ) {
        return "Cancelada";
    }

    return status || "Não informado";
}

function classeStatus(status) {
    switch (normalizarStatus(status)) {
        case "Concluída":
            return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";

        case "Em andamento":
            return "bg-blue-50 text-blue-700 ring-blue-600/20";

        case "Pendente":
            return "bg-amber-50 text-amber-700 ring-amber-600/20";

        case "Cancelada":
            return "bg-red-50 text-red-700 ring-red-600/20";

        default:
            return "bg-slate-100 text-slate-600 ring-slate-500/20";
    }
}

// ============================================
// PRIORIDADE
// ============================================

function classePrioridade(prioridade) {
    const valor = String(prioridade || "").toLowerCase();

    if (
        valor.includes("alta") ||
        valor.includes("urgente")
    ) {
        return "bg-red-50 text-red-700";
    }

    if (
        valor.includes("média") ||
        valor.includes("media")
    ) {
        return "bg-amber-50 text-amber-700";
    }

    return "bg-slate-100 text-slate-600";
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function SolicitacoesInstituicao() {
    const navigate = useNavigate();
    const { id: idSolicitacaoUrl } = useParams();

    const [solicitacoes, setSolicitacoes] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [atualizando, setAtualizando] = useState(false);
    const [erro, setErro] = useState("");

    const [busca, setBusca] = useState("");
    const [filtroStatus, setFiltroStatus] = useState("Todas");
    const [pagina, setPagina] = useState(1);

    const [
        solicitacaoSelecionada,
        setSolicitacaoSelecionada,
    ] = useState(null);

    // ============================================
    // REQUISIÇÕES À API
    // ============================================

    const requisicao = useCallback(async (caminho) => {
        const token = obterToken();

        if (!token) {
            navigate("/", { replace: true });

            throw new Error(
                "Sua sessão expirou. Entre novamente."
            );
        }

        const resposta = await fetch(`${API}${caminho}`, {
            headers: {
                Authorization: `Bearer ${token}`,
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
                "Sua sessão expirou ou você não possui autorização."
            );
        }

        if (!resposta.ok) {
            throw new Error(
                dados?.error ||
                dados?.message ||
                `Erro na requisição (${resposta.status}).`
            );
        }

        return dados;
    }, [navigate]);

    // ============================================
    // CARREGAR SOLICITAÇÕES
    // ============================================

    const carregarSolicitacoes = useCallback(
        async (silencioso = false) => {
            if (silencioso) {
                setAtualizando(true);
            } else {
                setCarregando(true);
            }

            setErro("");

            try {
                const dados = await requisicao("/solicitacoes");

                const lista = Array.isArray(dados)
                    ? dados
                    : Array.isArray(dados?.solicitacoes)
                        ? dados.solicitacoes
                        : Array.isArray(dados?.dados)
                            ? dados.dados
                            : null;

                if (!lista) {
                    throw new Error(
                        "A API não retornou uma lista válida de solicitações."
                    );
                }

                const listaValida = lista.filter((item) => {
                    const id = obterIdSolicitacao(item);

                    if (id === null) {
                        console.error(
                            "Solicitação retornada sem ID válido:",
                            item
                        );

                        return false;
                    }

                    return true;
                });

                setSolicitacoes(listaValida);
            } catch (error) {
                setErro(
                    error.message ||
                    "Não foi possível carregar as solicitações."
                );

                if (!silencioso) {
                    toast.error(
                        error.message ||
                        "Erro ao carregar as solicitações."
                    );
                }
            } finally {
                setCarregando(false);
                setAtualizando(false);
            }
        },
        [requisicao]
    );

    useEffect(() => {
        carregarSolicitacoes();
    }, [carregarSolicitacoes]);

    // ============================================
    // ABRIR MODAL AUTOMATICAMENTE PELA URL
    // ============================================

    useEffect(() => {
        // Sem ID na URL, a página funciona normalmente.
        if (!idSolicitacaoUrl) {
            return;
        }

        // Aguarda a API concluir o carregamento.
        if (carregando || atualizando) {
            return;
        }

        // Não tenta localizar o registro quando a API falha.
        if (erro) {
            return;
        }

        const idUrl = Number(idSolicitacaoUrl);

        if (
            !Number.isSafeInteger(idUrl) ||
            idUrl <= 0
        ) {
            toast.error(
                "O identificador da solicitação é inválido."
            );

            navigate("/instituicao/solicitacoes", {
                replace: true,
            });

            return;
        }

        const solicitacao = solicitacoes.find(
            (item) => obterIdSolicitacao(item) === idUrl
        );

        if (!solicitacao) {
            toast.error(
                "A solicitação não foi encontrada na lista da instituição."
            );

            navigate("/instituicao/solicitacoes", {
                replace: true,
            });

            return;
        }

        setSolicitacaoSelecionada({
            ...solicitacao,
            id_solicitacoes: idUrl,
            id_solicitacao: idUrl,
            id: idUrl,
        });
    }, [
        idSolicitacaoUrl,
        carregando,
        atualizando,
        erro,
        solicitacoes,
        navigate,
    ]);

    // ============================================
    // PESQUISA E FILTROS
    // ============================================

    const solicitacoesFiltradas = useMemo(() => {
        const termo = busca.toLowerCase().trim();

        return solicitacoes.filter((item) => {
            const titulo = String(item.titulo || "")
                .toLowerCase();

            const descricao = String(item.descricao || "")
                .toLowerCase();

            const setor = String(item.setor || "")
                .toLowerCase();

            const id = String(obterIdSolicitacao(item));

            const correspondeBusca =
                !termo ||
                titulo.includes(termo) ||
                descricao.includes(termo) ||
                setor.includes(termo) ||
                id.includes(termo);

            const status = normalizarStatus(item.status);

            const correspondeStatus =
                filtroStatus === "Todas" ||
                status === filtroStatus;

            return correspondeBusca && correspondeStatus;
        });
    }, [solicitacoes, busca, filtroStatus]);

    useEffect(() => {
        setPagina(1);
    }, [busca, filtroStatus]);

    // ============================================
    // PAGINAÇÃO
    // ============================================

    const totalPaginas = Math.max(
        1,
        Math.ceil(
            solicitacoesFiltradas.length / POR_PAGINA
        )
    );

    const paginaAtual = Math.min(pagina, totalPaginas);

    const solicitacoesPagina = solicitacoesFiltradas.slice(
        (paginaAtual - 1) * POR_PAGINA,
        paginaAtual * POR_PAGINA
    );

    // ============================================
    // INDICADORES
    // ============================================

    const pendentes = solicitacoes.filter(
        (item) => normalizarStatus(item.status) === "Pendente"
    ).length;

    const emAndamento = solicitacoes.filter(
        (item) => normalizarStatus(item.status) === "Em andamento"
    ).length;

    const concluidas = solicitacoes.filter(
        (item) => normalizarStatus(item.status) === "Concluída"
    ).length;

    // ============================================
    // DETALHES
    // ============================================

    function abrirDetalhes(item) {
        const id = obterIdSolicitacao(item);

        if (id === null) {
            console.error(
                "Não foi possível abrir a solicitação. ID inválido:",
                item
            );

            toast.error(
                "Não foi possível identificar esta solicitação."
            );

            return;
        }

        const solicitacao = {
            ...item,
            id_solicitacoes: id,
            id_solicitacao: id,
            id,
        };

        setSolicitacaoSelecionada(solicitacao);
    }

    function fecharDetalhes() {
        setSolicitacaoSelecionada(null);

        // Se chegou pelo link de uma notificação,
        // retorna à lista sem o ID na URL.
        if (idSolicitacaoUrl) {
            navigate("/instituicao/solicitacoes", {
                replace: true,
            });
        }

        carregarSolicitacoes(true);
    }

    // ============================================
    // RENDERIZAÇÃO
    // ============================================

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6">

            {/* TÍTULO */}

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <p className="text-sm font-semibold text-[#1755ad]">
                        Área institucional
                    </p>

                    <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#082d56] sm:text-3xl">
                        Solicitações
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Consulte as solicitações vinculadas à sua instituição.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => carregarSolicitacoes(true)}
                    disabled={atualizando || carregando}
                    className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#082d56] shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
                >
                    <FiRefreshCw
                        size={17}
                        className={
                            atualizando ? "animate-spin" : ""
                        }
                    />

                    Atualizar
                </button>
            </div>

            {/* INDICADORES */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-500">
                            Total de solicitações
                        </span>

                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1755ad]">
                            <FiFileText size={21} />
                        </span>
                    </div>

                    <p className="mt-4 text-3xl font-extrabold text-[#082d56]">
                        {solicitacoes.length}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                        Solicitações cadastradas
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-500">
                            Pendentes
                        </span>

                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <FiFlag size={21} />
                        </span>
                    </div>

                    <p className="mt-4 text-3xl font-extrabold text-amber-600">
                        {pendentes}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                        Aguardando andamento
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-500">
                            Em andamento
                        </span>

                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <FiLayers size={21} />
                        </span>
                    </div>

                    <p className="mt-4 text-3xl font-extrabold text-indigo-600">
                        {emAndamento}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                        Em tratamento
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-500">
                            Concluídas
                        </span>

                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <FiMessageCircle size={21} />
                        </span>
                    </div>

                    <p className="mt-4 text-3xl font-extrabold text-emerald-600">
                        {concluidas}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                        Solicitações finalizadas
                    </p>
                </div>

            </div>

            {/* LISTA */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="border-b border-slate-100 p-5 sm:p-6">

                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                        <div>
                            <h2 className="text-lg font-bold text-[#082d56]">
                                Solicitações da instituição
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Pesquise, filtre e abra uma solicitação para consultar os detalhes.
                            </p>
                        </div>

                        <span className="self-start rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#1755ad]">
                            {solicitacoesFiltradas.length} resultado(s)
                        </span>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">

                        <div className="relative">
                            <FiSearch
                                size={18}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <input
                                type="search"
                                value={busca}
                                onChange={(evento) =>
                                    setBusca(evento.target.value)
                                }
                                placeholder="Buscar por título, descrição, setor ou número..."
                                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#1755ad] focus:bg-white focus:ring-4 focus:ring-blue-100"
                            />
                        </div>

                        <select
                            value={filtroStatus}
                            onChange={(evento) =>
                                setFiltroStatus(evento.target.value)
                            }
                            className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#1755ad] focus:ring-4 focus:ring-blue-100"
                        >
                            <option value="Todas">
                                Todos os status
                            </option>

                            <option value="Pendente">
                                Pendente
                            </option>

                            <option value="Em andamento">
                                Em andamento
                            </option>

                            <option value="Concluída">
                                Concluída
                            </option>

                            <option value="Cancelada">
                                Cancelada
                            </option>
                        </select>

                    </div>
                </div>

                {/* CARREGAMENTO */}

                {carregando ? (

                    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                        <FiRefreshCw
                            className="animate-spin text-[#1755ad]"
                            size={30}
                        />

                        <p className="mt-4 text-sm font-semibold text-slate-600">
                            Carregando solicitações...
                        </p>
                    </div>

                ) : erro && solicitacoes.length === 0 ? (

                    <div className="px-6 py-14 text-center">
                        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
                            <FiAlertCircle size={25} />
                        </span>

                        <h3 className="mt-4 font-bold text-slate-800">
                            Não foi possível carregar as solicitações
                        </h3>

                        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                            {erro}
                        </p>

                        <button
                            type="button"
                            onClick={() => carregarSolicitacoes()}
                            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1755ad] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#10468f]"
                        >
                            <FiRefreshCw size={16} />
                            Tentar novamente
                        </button>
                    </div>

                ) : erro ? (

                    <div className="px-6 py-10 text-center">
                        <FiAlertCircle
                            className="mx-auto text-red-500"
                            size={26}
                        />

                        <p className="mt-3 text-sm text-red-700">
                            {erro}
                        </p>

                        <button
                            type="button"
                            onClick={() => carregarSolicitacoes()}
                            className="mt-4 rounded-xl bg-[#1755ad] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#10468f]"
                        >
                            Tentar novamente
                        </button>
                    </div>

                ) : solicitacoesFiltradas.length === 0 ? (

                    <div className="px-6 py-16 text-center">
                        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#1755ad]">
                            <FiFileText size={25} />
                        </span>

                        <h3 className="mt-4 font-bold text-slate-800">
                            Nenhuma solicitação encontrada
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                            {busca || filtroStatus !== "Todas"
                                ? "Tente alterar a pesquisa ou o filtro de status."
                                : "Ainda não há solicitações para exibir."}
                        </p>
                    </div>

                ) : (

                    <>

                        <div className="divide-y divide-slate-100">

                            {solicitacoesPagina.map((item) => {
                                const id = obterIdSolicitacao(item);

                                if (id === null) {
                                    return null;
                                }

                                return (
                                    <article
                                        key={id}
                                        className="p-5 transition hover:bg-slate-50/70 sm:p-6"
                                    >
                                        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">

                                            <div className="min-w-0 flex-1">

                                                <div className="flex flex-wrap items-center gap-2">

                                                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                                                        Solicitação #{id}
                                                    </span>

                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${classeStatus(item.status)}`}
                                                    >
                                                        {normalizarStatus(item.status)}
                                                    </span>

                                                    {item.prioridade && (
                                                        <span
                                                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${classePrioridade(item.prioridade)}`}
                                                        >
                                                            {item.prioridade}
                                                        </span>
                                                    )}

                                                </div>

                                                <h3 className="mt-3 break-words text-base font-bold text-[#082d56] sm:text-lg">
                                                    {item.titulo || "Solicitação sem título"}
                                                </h3>

                                                <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                                                    {item.descricao || "Nenhuma descrição informada."}
                                                </p>

                                                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">

                                                    <span className="inline-flex items-center gap-1.5">
                                                        <FiLayers size={14} />
                                                        Setor: {item.setor || "Não informado"}
                                                    </span>

                                                    <span className="inline-flex items-center gap-1.5">
                                                        <FiCalendar size={14} />
                                                        Data: {formatarData(item.data_pedido)}
                                                    </span>

                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => abrirDetalhes(item)}
                                                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1755ad] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#10468f] focus:outline-none focus:ring-4 focus:ring-blue-100"
                                            >
                                                <FiEye size={17} />
                                                Ver detalhes
                                            </button>

                                        </div>
                                    </article>
                                );
                            })}

                        </div>

                        {/* PAGINAÇÃO */}

                        <div className="flex flex-col justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center">

                            <p className="text-xs text-slate-500">
                                Exibindo{" "}

                                <strong>
                                    {solicitacoesFiltradas.length > 0
                                        ? (paginaAtual - 1) * POR_PAGINA + 1
                                        : 0}
                                </strong>{" "}

                                a{" "}

                                <strong>
                                    {Math.min(
                                        paginaAtual * POR_PAGINA,
                                        solicitacoesFiltradas.length
                                    )}
                                </strong>{" "}

                                de{" "}

                                <strong>
                                    {solicitacoesFiltradas.length}
                                </strong>
                            </p>

                            <div className="flex items-center justify-between gap-2 sm:justify-end">

                                <button
                                    type="button"
                                    disabled={paginaAtual <= 1}
                                    onClick={() =>
                                        setPagina((p) =>
                                            Math.max(1, p - 1)
                                        )
                                    }
                                    className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <FiChevronLeft size={17} />
                                    Anterior
                                </button>

                                <span className="px-2 text-xs font-semibold text-slate-500">
                                    {paginaAtual} / {totalPaginas}
                                </span>

                                <button
                                    type="button"
                                    disabled={paginaAtual >= totalPaginas}
                                    onClick={() =>
                                        setPagina((p) =>
                                            Math.min(totalPaginas, p + 1)
                                        )
                                    }
                                    className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Próxima
                                    <FiChevronRight size={17} />
                                </button>

                            </div>
                        </div>

                    </>
                )}
            </section>

            {/* MODAL DE DETALHES */}

            {solicitacaoSelecionada && (
                <DetalhesSolicitacaoInstituicao
                    solicitacao={solicitacaoSelecionada}
                    onClose={fecharDetalhes}
                />
            )}

        </div>
    );
}
