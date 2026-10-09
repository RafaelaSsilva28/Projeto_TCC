
import { useEffect, useState } from "react";

import toast from "react-hot-toast";

import {
    FiX,
    FiFileText,
    FiMessageCircle,
    FiSend,
    FiCheckCircle,
    FiXCircle,
    FiClock,
    FiFlag,
    FiHome,
    FiCalendar,
    FiRefreshCw,
    FiAlertCircle,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";
import AnexosSolicitacao from "./AnexosSolicitacao";

const API = String(enderecoServidor).replace(/\/$/, "");

// ============================================
// FORMATAR STATUS
// ============================================

function visualizarStatus(valor) {
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

    if (["recusada", "recusado"].includes(status)) {
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
        texto: String(valor || "Não informado").toUpperCase(),
        classe: "bg-gray-100 text-gray-700",
    };
}

// ============================================
// FORMATAR DATA
// ============================================

function formatarData(valor) {
    if (!valor) return "Não informada";

    const texto = String(valor);

    // Sua API retorna algumas datas já formatadas.
    if (/^\d{2}\/\d{2}\/\d{4}/.test(texto)) {
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
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(data);
}

// ============================================
// NORMALIZAR SOLICITAÇÃO
// ============================================

function normalizarSolicitacao(item) {
    return {
        id:
            item.id_solicitacoes ??
            item.id_solicitacao ??
            item.id,

        titulo:
            item.titulo ??
            "Solicitação sem título",

        descricao: item.descricao ?? "",

        instituicao:
            item.nome_instituicao ??
            item.instituicao?.nome ??
            item.instituicao ??
            "Instituição não informada",

        prioridade:
            item.prioridade ?? "Não informada",

        setor:
            item.setor ?? "Não informado",

        status:
            item.status ?? "Não informado",

        data:
            item.data_pedido ?? item.data ?? null,
    };
}

// ============================================
// COMPONENTE
// ============================================

export default function DetalhesSolicitacaoAdmin({
    solicitacao,
    idSolicitacao,
    onClose,
    onAtualizar,
}) {
    const id = Number(
        idSolicitacao ?? solicitacao?.id
    );

    const [atual, setAtual] = useState(
        solicitacao || null
    );

    const [eventos, setEventos] = useState([]);

    const [resposta, setResposta] = useState("");

    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);

    const [erro, setErro] = useState("");

    // NOVO: confirmação personalizada
    const [confirmacao, setConfirmacao] = useState(null);

    // ==========================================
    // REQUISIÇÕES AUTENTICADAS
    // ==========================================

    async function chamarAPI(caminho, opcoes = {}) {
        const token = localStorage.getItem(
            "@AndraRecursos:token"
        );

        if (!token) {
            throw new Error(
                "Sessão expirada. Faça login novamente."
            );
        }

        const retorno = await fetch(
            `${API}${caminho}`,
            {
                ...opcoes,
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...(opcoes.body
                        ? { "Content-Type": "application/json" }
                        : {}),
                    ...opcoes.headers,
                },
            }
        );

        const dados = await retorno
            .json()
            .catch(() => null);

        if (!retorno.ok) {
            throw new Error(
                dados?.error ||
                dados?.message ||
                `Erro ${retorno.status} na API.`
            );
        }

        return dados;
    }

    // ==========================================
    // CARREGAR SOLICITAÇÃO E HISTÓRICO
    // ==========================================

    async function carregarDetalhes() {
        if (!Number.isInteger(id) || id <= 0) {
            return;
        }

        setCarregando(true);
        setErro("");

        try {
            const [
                dadosSolicitacoes,
                dadosHistorico,
                dadosRespostas,
            ] = await Promise.all([
                chamarAPI("/solicitacoes"),

                chamarAPI(
                    `/historico-solicitacoes/solicitacao/${id}`
                ),

                chamarAPI(
                    `/respostas-adm/solicitacao/${id}`
                ),
            ]);

            // BUSCAR A SOLICITAÇÃO
            const lista = Array.isArray(dadosSolicitacoes)
                ? dadosSolicitacoes
                : dadosSolicitacoes?.solicitacoes ??
                dadosSolicitacoes?.dados ??
                [];

            const encontrada = Array.isArray(lista)
                ? lista.find(
                    (item) =>
                        Number(
                            item.id_solicitacoes ??
                            item.id_solicitacao ??
                            item.id
                        ) === id
                )
                : null;

            if (!encontrada) {
                throw new Error(
                    "Solicitação não encontrada na API."
                );
            }

            setAtual(
                normalizarSolicitacao(encontrada)
            );

            // MOVIMENTAÇÕES DA SOLICITAÇÃO
            const movimentacoes = (
                Array.isArray(dadosHistorico)
                    ? dadosHistorico
                    : []
            ).map((item) => ({
                chave: `historico-${item.id_historico}`,
                tipo: "movimentacao",
                autor: "SISTEMA / MOVIMENTAÇÃO",
                mensagem: item.descricao,
                data: item.data_alteracao,
            }));

            // RESPOSTAS DO ADMINISTRADOR
            const mensagens = (
                Array.isArray(dadosRespostas)
                    ? dadosRespostas
                    : []
            ).map((item) => ({
                chave: `resposta-${item.id_resposta}`,
                tipo: "resposta",
                autor: "ADMINISTRADOR",
                mensagem: item.mensagem,
                data: item.data_resposta,
            }));

            // LINHA DO TEMPO CRONOLÓGICA
            const linhaDoTempo = [
                ...movimentacoes,
                ...mensagens,
            ].sort((a, b) => {
                const tempoA = new Date(a.data).getTime();
                const tempoB = new Date(b.data).getTime();

                if (
                    !Number.isFinite(tempoA) &&
                    !Number.isFinite(tempoB)
                ) {
                    return 0;
                }

                if (!Number.isFinite(tempoA)) return 1;
                if (!Number.isFinite(tempoB)) return -1;

                return tempoA - tempoB;
            });

            setEventos(linhaDoTempo);

        } catch (error) {
            setErro(error.message);
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarDetalhes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // ==========================================
    // ABRIR CONFIRMAÇÃO PERSONALIZADA
    // ==========================================

    function solicitarConfirmacao(novoStatus) {
        if (salvando || carregando || !atual) {
            return;
        }

        setConfirmacao(novoStatus);
    }

    // ==========================================
    // APROVAR OU RECUSAR
    // ==========================================

    async function alterarStatus(novoStatus) {
        if (salvando || !atual) return;

        setSalvando(true);
        setErro("");

        try {
            await chamarAPI(
                `/solicitacoes/${id}/status`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        status: novoStatus,
                    }),
                }
            );

            setConfirmacao(null);

            toast.success(
                novoStatus === "aprovada"
                    ? "Solicitação aprovada com sucesso!"
                    : "Solicitação recusada com sucesso!"
            );

            // Fecha o modal e atualiza os cartões.
            // O toast permanece visível no aplicativo.
            onClose?.();
            onAtualizar?.();

        } catch (error) {
            toast.error(
                error.message ||
                "Erro ao atualizar a solicitação."
            );
        } finally {
            setSalvando(false);
        }
    }

    // ==========================================
    // ENVIAR RESPOSTA
    // ==========================================

    async function enviarResposta() {
        const mensagem = resposta.trim();

        if (
            !mensagem ||
            salvando ||
            carregando ||
            !atual
        ) {
            return;
        }

        setSalvando(true);
        setErro("");

        try {
            await chamarAPI("/respostas-adm", {
                method: "POST",
                body: JSON.stringify({
                    id_solicitacao: id,
                    mensagem,
                }),
            });

            // A mensagem já foi salva no banco.
            setResposta("");

            toast.success(
                "Resposta enviada com sucesso!"
            );

            // Recarrega o histórico de comunicação.
            await carregarDetalhes();

        } catch (error) {
            toast.error(
                error.message ||
                "Erro ao enviar resposta."
            );
        } finally {
            setSalvando(false);
        }
    }

    // ==========================================
    // ID INVÁLIDO
    // ==========================================

    if (!Number.isInteger(id) || id <= 0) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                    <p className="font-semibold text-red-600">
                        ID da solicitação inválido.
                    </p>

                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-5 rounded-lg bg-[#082d56] px-5 py-3 text-sm font-semibold text-white"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        );
    }

    const situacao = visualizarStatus(atual?.status);

    const aprovando = confirmacao === "aprovada";

    // ==========================================
    // INTERFACE
    // ==========================================

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#07182b]/70 p-3 backdrop-blur-sm sm:p-6"
            onMouseDown={(e) => {
                if (
                    e.target === e.currentTarget &&
                    !salvando &&
                    !confirmacao
                ) {
                    onClose?.();
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-solicitacao-admin"
                className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                {/* ====================================
            CABEÇALHO
        ==================================== */}

                <header className="flex items-start justify-between gap-4 border-b border-gray-200 bg-[#f3f5f8] p-5 sm:p-6">

                    <div className="flex min-w-0 items-start gap-4">

                        <span className="rounded-xl bg-blue-100 p-3 text-[#1759ad]">
                            <FiFileText size={24} />
                        </span>

                        <div className="min-w-0">

                            <div className="mb-2 flex flex-wrap items-center gap-2">

                                <span className="text-xs font-semibold text-gray-500">
                                    #{id}
                                </span>

                                <span
                                    className={`rounded-full px-3 py-1 text-[10px] font-bold ${situacao.classe}`}
                                >
                                    {situacao.texto}
                                </span>

                            </div>

                            <h2
                                id="titulo-solicitacao-admin"
                                className="text-lg font-bold text-[#082d56] sm:text-xl"
                            >
                                {atual?.titulo ??
                                    "Carregando solicitação..."}
                            </h2>

                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={salvando || Boolean(confirmacao)}
                        aria-label="Fechar detalhamento"
                        className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-200 disabled:opacity-50"
                    >
                        <FiX size={21} />
                    </button>

                </header>

                {/* ====================================
            CONTEÚDO PRINCIPAL
        ==================================== */}

                <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-2">

                    {/* COLUNA ESQUERDA */}
                    <div className="border-b border-gray-200 p-5 sm:p-6 lg:border-b-0 lg:border-r">

                        <h3 className="mb-5 flex items-center gap-2 text-sm font-bold text-[#1759ad]">
                            <FiFileText />
                            Informações da Solicitação
                        </h3>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                            {/* INSTITUIÇÃO */}
                            <div>
                                <p className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                                    <FiHome />
                                    Instituição Solicitante
                                </p>

                                <p className="text-sm font-semibold text-[#082d56]">
                                    {atual?.instituicao ??
                                        "Não informada"}
                                </p>
                            </div>

                            {/* DATA */}
                            <div>
                                <p className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                                    <FiCalendar />
                                    Data de Emissão
                                </p>

                                <p className="text-sm font-semibold text-[#082d56]">
                                    {formatarData(atual?.data)}
                                </p>
                            </div>

                            {/* PRIORIDADE */}
                            <div>
                                <p className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                                    <FiFlag />
                                    Prioridade
                                </p>

                                <p className="text-sm font-semibold capitalize text-[#082d56]">
                                    {atual?.prioridade ??
                                        "Não informada"}
                                </p>
                            </div>

                            {/* SETOR */}
                            <div>
                                <p className="mb-1 text-xs text-gray-500">
                                    Setor responsável
                                </p>

                                <p className="text-sm font-semibold text-[#082d56]">
                                    {atual?.setor ??
                                        "Não informado"}
                                </p>
                            </div>

                        </div>

                        {/* DESCRIÇÃO */}
                        <div className="mt-6">

                            <h4 className="mb-2 text-sm font-semibold text-[#1759ad]">
                                Descrição do Recurso
                            </h4>

                            <div className="min-h-32 rounded-lg border border-gray-200 bg-[#f7f7f7] p-4">

                                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                                    {atual?.descricao ||
                                        "Nenhuma descrição registrada."}
                                </p>

                            </div>
                        </div>

                        {/* ANEXOS REAIS DA API */}
                        <AnexosSolicitacao
                            idSolicitacao={id}
                        />

                    </div>

                    {/* COLUNA DIREITA */}
                    <div className="flex min-h-0 flex-col p-5 sm:p-6">

                        <h3 className="mb-5 flex items-center gap-2 text-sm font-bold text-[#1759ad]">
                            <FiMessageCircle />
                            Histórico de Comunicação
                        </h3>

                        {/* LINHA DO TEMPO */}
                        <div className="max-h-64 min-h-32 space-y-4 overflow-y-auto pr-2">

                            {carregando ? (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <FiRefreshCw className="animate-spin" />
                                    Carregando comunicação...
                                </div>
                            ) : eventos.length > 0 ? (

                                eventos.map((evento) => (
                                    <div
                                        key={evento.chave}
                                        className={`relative border-l-2 pl-4 ${evento.tipo === "resposta"
                                                ? "border-green-300"
                                                : "border-blue-300"
                                            }`}
                                    >

                                        <span
                                            className={`absolute -left-[6px] top-1 h-2.5 w-2.5 rounded-full ${evento.tipo === "resposta"
                                                    ? "bg-green-600"
                                                    : "bg-blue-600"
                                                }`}
                                        />

                                        <div className="flex flex-wrap items-center justify-between gap-1">

                                            <p
                                                className={`text-xs font-bold ${evento.tipo === "resposta"
                                                        ? "text-green-700"
                                                        : "text-[#1759ad]"
                                                    }`}
                                            >
                                                {evento.autor}
                                            </p>

                                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                                <FiClock />
                                                {formatarData(evento.data)}
                                            </span>

                                        </div>

                                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                                            {evento.mensagem}
                                        </p>

                                    </div>
                                ))

                            ) : (
                                <p className="text-sm text-gray-500">
                                    Nenhuma comunicação registrada.
                                </p>
                            )}

                        </div>

                        {/* CAMPO DE RESPOSTA */}
                        <div className="mt-6 border-t border-gray-100 pt-5">

                            <label
                                htmlFor="mensagem-admin"
                                className="mb-2 block text-sm font-semibold text-[#082d56]"
                            >
                                Resposta do Administrador
                            </label>

                            <textarea
                                id="mensagem-admin"
                                rows={4}
                                maxLength={2000}
                                value={resposta}
                                onChange={(e) =>
                                    setResposta(e.target.value)
                                }
                                disabled={salvando}
                                placeholder="Digite sua análise ou instruções adicionais..."
                                className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                            />

                            <p className="mt-1 text-right text-xs text-gray-400">
                                {resposta.length}/2000 caracteres
                            </p>

                            <button
                                type="button"
                                onClick={enviarResposta}
                                disabled={
                                    salvando ||
                                    carregando ||
                                    !resposta.trim() ||
                                    !atual
                                }
                                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-5 py-3 text-sm font-semibold text-[#1759ad] transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {salvando ? (
                                    <FiRefreshCw className="animate-spin" />
                                ) : (
                                    <FiSend />
                                )}

                                {salvando
                                    ? "Enviando..."
                                    : "Responder"}
                            </button>

                        </div>
                    </div>
                </div>

                {/* ERRO DE CARREGAMENTO */}
                {erro && (
                    <div className="mx-5 my-3 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                        <FiAlertCircle className="mt-0.5 shrink-0" />
                        {erro}
                    </div>
                )}

                {/* ====================================
            RODAPÉ PRINCIPAL
        ==================================== */}

                <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-[#f3f5f8] px-5 py-4 sm:px-6">

                    <div className="flex flex-wrap gap-3">

                        {/* APROVAR */}
                        <button
                            type="button"
                            onClick={() =>
                                solicitarConfirmacao("aprovada")
                            }
                            disabled={
                                salvando ||
                                carregando ||
                                !atual ||
                                situacao.texto === "APROVADA"
                            }
                            className="flex items-center gap-2 rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <FiCheckCircle />
                            Aprovar
                        </button>

                        {/* RECUSAR */}
                        <button
                            type="button"
                            onClick={() =>
                                solicitarConfirmacao("recusada")
                            }
                            disabled={
                                salvando ||
                                carregando ||
                                !atual ||
                                situacao.texto === "RECUSADA"
                            }
                            className="flex items-center gap-2 rounded-lg bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <FiXCircle />
                            Recusar
                        </button>

                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={salvando || Boolean(confirmacao)}
                        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-[#082d56] transition hover:bg-gray-100 disabled:opacity-50"
                    >
                        <FiX />
                        Fechar
                    </button>

                </footer>

                {/* ====================================
            MODAL DE CONFIRMAÇÃO ESTILIZADO
        ==================================== */}

                {confirmacao && (
                    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-[#06172b]/65 p-4 backdrop-blur-sm">

                        <div
                            role="alertdialog"
                            aria-modal="true"
                            aria-labelledby="titulo-confirmacao"
                            aria-describedby="descricao-confirmacao"
                            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
                        >

                            <div className="px-6 pb-5 pt-7 text-center">

                                <div
                                    className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${aprovando
                                            ? "bg-green-100 text-green-700"
                                            : "bg-red-100 text-red-700"
                                        }`}
                                >
                                    {aprovando ? (
                                        <FiCheckCircle size={31} />
                                    ) : (
                                        <FiXCircle size={31} />
                                    )}
                                </div>

                                <h3
                                    id="titulo-confirmacao"
                                    className="text-xl font-bold text-[#082d56]"
                                >
                                    {aprovando
                                        ? "Aprovar solicitação?"
                                        : "Recusar solicitação?"}
                                </h3>

                                <p
                                    id="descricao-confirmacao"
                                    className="mt-3 text-sm leading-relaxed text-gray-500"
                                >
                                    {aprovando
                                        ? "Tem certeza de que deseja aprovar esta solicitação? O status será atualizado no sistema."
                                        : "Tem certeza de que deseja recusar esta solicitação? O status será atualizado no sistema."}
                                </p>

                                <div className="mt-4 rounded-lg bg-[#f3f5f8] px-4 py-3">
                                    <p className="text-xs font-semibold text-[#1759ad]">
                                        Solicitação #{id}
                                    </p>

                                    <p className="mt-1 text-sm font-bold text-[#082d56]">
                                        {atual?.titulo}
                                    </p>
                                </div>

                            </div>

                            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 p-5 sm:flex-row">

                                {/* CANCELAR */}
                                <button
                                    type="button"
                                    onClick={() =>
                                        setConfirmacao(null)
                                    }
                                    disabled={salvando}
                                    className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
                                >
                                    Cancelar
                                </button>

                                {/* CONFIRMAR */}
                                <button
                                    type="button"
                                    onClick={() =>
                                        alterarStatus(confirmacao)
                                    }
                                    disabled={salvando}
                                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50 ${aprovando
                                            ? "bg-green-700 hover:bg-green-800"
                                            : "bg-red-700 hover:bg-red-800"
                                        }`}
                                >

                                    {salvando && (
                                        <FiRefreshCw className="animate-spin" />
                                    )}

                                    {salvando
                                        ? "Processando..."
                                        : aprovando
                                            ? "Sim, aprovar"
                                            : "Sim, recusar"}

                                </button>

                            </div>
                        </div>
                    </div>
                )}

            </section>
        </div>
    );
}
