
import { useEffect, useState } from "react";
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

function visualizarStatus(valor) {
    const status = String(valor ?? "").toLowerCase().trim();

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

    return {
        texto: "PENDENTE",
        classe: "bg-amber-100 text-amber-700",
    };
}

function formatarData(valor) {
    if (!valor) return "Não informada";

    const texto = String(valor);

    if (/^\d{2}\/\d{2}\/\d{4}/.test(texto)) {
        return texto;
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

export default function DetalhesSolicitacaoAdmin({
    solicitacao,
    idSolicitacao,
    onClose,
    onAtualizar,
}) {
    const [atual, setAtual] = useState(solicitacao);
    const [eventos, setEventos] = useState([]);
    const [resposta, setResposta] = useState("");
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState("");

    const id = Number(idSolicitacao ?? solicitacao?.id);

    async function chamarAPI(caminho, opcoes = {}) {
        const token = localStorage.getItem(
            "@AndraRecursos:token"
        );

        if (!token) {
            throw new Error("Sessão expirada. Faça login novamente.");
        }

        const retorno = await fetch(`${API}${caminho}`, {
            ...opcoes,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(opcoes.body
                    ? { "Content-Type": "application/json" }
                    : {}),
                ...opcoes.headers,
            },
        });

        const dados = await retorno.json().catch(() => null);

        if (!retorno.ok) {
            throw new Error(
                dados?.error ||
                dados?.message ||
                `Erro ${retorno.status} na API.`
            );
        }

        return dados;
    }


    async function carregarDetalhes() {
        if (!Number.isInteger(id) || id <= 0) return;

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

            const listaSolicitacoes = Array.isArray(dadosSolicitacoes)
                ? dadosSolicitacoes
                : dadosSolicitacoes?.solicitacoes ??
                dadosSolicitacoes?.dados ??
                [];

            const encontrada = listaSolicitacoes.find(
                (item) =>
                    Number(item.id_solicitacoes ?? item.id) === id
            );

            if (!encontrada) {
                throw new Error("Solicitação não encontrada.");
            }

            setAtual({
                id,
                titulo: encontrada.titulo,
                descricao: encontrada.descricao,
                instituicao:
                    encontrada.nome_instituicao ??
                    "Instituição não informada",
                prioridade: encontrada.prioridade,
                setor: encontrada.setor,
                status: encontrada.status,
                data: encontrada.data_pedido,
            });

            const movimentacoes = (
                Array.isArray(dadosHistorico) ? dadosHistorico : []
            ).map((item) => ({
                chave: `historico-${item.id_historico}`,
                tipo: "movimentacao",
                autor: "SISTEMA / MOVIMENTAÇÃO",
                mensagem: item.descricao,
                data: item.data_alteracao,
            }));

            const mensagens = (
                Array.isArray(dadosRespostas) ? dadosRespostas : []
            ).map((item) => ({
                chave: `resposta-${item.id_resposta}`,
                tipo: "resposta",
                autor: "ADMINISTRADOR",
                mensagem: item.mensagem,
                data: item.data_resposta,
            }));

            const linhaDoTempo = [
                ...movimentacoes,
                ...mensagens,
            ].sort((a, b) => {
                const dataA = new Date(a.data).getTime();
                const dataB = new Date(b.data).getTime();

                if (!Number.isFinite(dataA)) return 1;
                if (!Number.isFinite(dataB)) return -1;

                return dataA - dataB;
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

    async function alterarStatus(novoStatus) {
        if (salvando || !atual) return;

        const confirmou = window.confirm(
            `Deseja realmente ${novoStatus === "aprovada"
                ? "aprovar"
                : "recusar"
            } esta solicitação?`
        );

        if (!confirmou) return;

        setSalvando(true);
        setErro("");
        setSucesso("");

        try {
            await chamarAPI(`/solicitacoes/${id}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status: novoStatus }),
            });

            await carregarDetalhes();
            onAtualizar?.();

            setSucesso("Status atualizado com sucesso!");
        } catch (error) {
            setErro(error.message);
        } finally {
            setSalvando(false);
        }
    }


    async function enviarResposta() {
        const texto = resposta.trim();

        if (!texto || salvando) return;

        setSalvando(true);
        setErro("");
        setSucesso("");

        try {
            await chamarAPI("/respostas-adm", {
                method: "POST",
                body: JSON.stringify({
                    mensagem: texto,
                    id_solicitacao: id,
                }),
            });

            // Atualiza as mensagens a partir do Neon.
            await carregarDetalhes();

            setResposta("");
            setSucesso("Mensagem enviada com sucesso!");

        } catch (error) {
            setErro(error.message);
        } finally {
            setSalvando(false);
        }
    }


    if (!Number.isInteger(id) || id <= 0) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                <div className="rounded-xl bg-white p-6">
                    <p>ID da solicitação inválido.</p>
                    <button
                        onClick={onClose}
                        className="mt-4 rounded bg-[#082d56] px-4 py-2 text-white"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        );
    }

    const situacao = visualizarStatus(atual?.status);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#07182b]/70 p-3 backdrop-blur-sm sm:p-6"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !salvando) {
                    onClose();
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-solicitacao-admin"
                className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                {/* CABEÇALHO */}
                <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-[#f3f5f8] p-5 sm:p-6">
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
                                {atual?.titulo ?? "Carregando solicitação..."}
                            </h2>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={salvando}
                        aria-label="Fechar detalhamento"
                        className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-200"
                    >
                        <FiX size={21} />
                    </button>
                </div>

                {/* CONTEÚDO */}
                <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-2">
                    {/* INFORMAÇÕES */}
                    <div className="border-b border-gray-200 p-5 sm:p-6 lg:border-b-0 lg:border-r">
                        <h3 className="mb-5 flex items-center gap-2 text-sm font-bold text-[#1759ad]">
                            <FiFileText />
                            Informações da Solicitação
                        </h3>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div>
                                <p className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                                    <FiHome /> Instituição Solicitante
                                </p>
                                <p className="text-sm font-semibold text-[#082d56]">
                                    {atual?.instituicao ?? "Não informada"}
                                </p>
                            </div>

                            <div>
                                <p className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                                    <FiCalendar /> Data de Emissão
                                </p>
                                <p className="text-sm font-semibold text-[#082d56]">
                                    {formatarData(atual?.data)}
                                </p>
                            </div>

                            <div>
                                <p className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                                    <FiFlag /> Prioridade
                                </p>
                                <p className="text-sm font-semibold capitalize text-[#082d56]">
                                    {atual?.prioridade ?? "Não informada"}
                                </p>
                            </div>

                            <div>
                                <p className="mb-1 text-xs text-gray-500">
                                    Setor responsável
                                </p>
                                <p className="text-sm font-semibold text-[#082d56]">
                                    {atual?.setor ?? "Não informado"}
                                </p>
                            </div>
                        </div>

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
                        <AnexosSolicitacao idSolicitacao={id} />
                    </div>

                    {/* COMUNICAÇÃO */}
                    <div className="flex min-h-0 flex-col p-5 sm:p-6">
                        <h3 className="mb-5 flex items-center gap-2 text-sm font-bold text-[#1759ad]">
                            <FiMessageCircle />
                            Histórico de Comunicação
                        </h3>

                        <div className="max-h-64 min-h-32 space-y-4 overflow-y-auto pr-2">
                            {carregando ? (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <FiRefreshCw className="animate-spin" />
                                    Carregando comunicação...
                                </div>
                            ) : eventos.length ? (
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
                                onChange={(e) => setResposta(e.target.value)}
                                placeholder="Digite sua análise ou instruções adicionais..."
                                className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />

                            <p className="mt-1 text-right text-xs text-gray-400">
                                {resposta.length}/2000 caracteres
                            </p>

                            <button
                                type="button"
                                onClick={enviarResposta}
                                disabled={salvando || !resposta.trim() || !atual}
                                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-5 py-3 text-sm font-semibold text-[#1759ad] transition hover:bg-blue-100 disabled:opacity-50"
                            >
                                <FiSend />
                                {salvando ? "Processando..." : "Responder"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ALERTAS */}
                {(erro || sucesso) && (
                    <div
                        role="status"
                        className={`mx-5 mt-3 flex items-start gap-2 rounded-lg p-3 text-sm ${erro
                            ? "bg-red-50 text-red-700"
                            : "bg-green-50 text-green-700"
                            }`}
                    >
                        <FiAlertCircle className="mt-0.5 shrink-0" />
                        {erro || sucesso}
                    </div>
                )}

                {/* RODAPÉ */}
                <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-[#f3f5f8] px-5 py-4 sm:px-6">
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => alterarStatus("aprovada")}
                            disabled={
                                salvando ||
                                !atual ||
                                visualizarStatus(atual.status).texto === "APROVADA"
                            }
                            className="flex items-center gap-2 rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:opacity-50"
                        >
                            <FiCheckCircle />
                            Aprovar
                        </button>

                        <button
                            type="button"
                            onClick={() => alterarStatus("recusada")}
                            disabled={
                                salvando ||
                                !atual ||
                                visualizarStatus(atual.status).texto === "RECUSADA"
                            }
                            className="flex items-center gap-2 rounded-lg bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-50"
                        >
                            <FiXCircle />
                            Recusar
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={salvando}
                        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-[#082d56] transition hover:bg-gray-100 disabled:opacity-50"
                    >
                        <FiX />
                        Fechar
                    </button>
                </footer>
            </section>
        </div>
    );
}
