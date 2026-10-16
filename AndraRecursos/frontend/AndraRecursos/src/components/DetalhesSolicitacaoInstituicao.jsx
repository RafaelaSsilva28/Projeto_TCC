
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
    FiX,
    FiFileText,
    FiMessageCircle,
    FiSend,
    FiClock,
    FiFlag,
    FiCalendar,
    FiRefreshCw,
    FiAlertCircle,
    FiHome,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";
import AnexosSolicitacao from "./AnexosSolicitacao";

const API = String(enderecoServidor).replace(/\/$/, "");

function normalizarTexto(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function visualizarStatus(valor) {
    const status = normalizarTexto(valor);

    if (["aprovada", "aprovado"].includes(status)) {
        return {
            texto: "APROVADA",
            classe: "bg-green-100 text-green-700",
        };
    }

    if (
        ["recusada", "recusado", "rejeitada", "rejeitado"].includes(status)
    ) {
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

function formatarData(valor) {
    if (!valor) return "Não informada";

    const texto = String(valor);

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

function normalizarListaRespostas(dados) {
    if (Array.isArray(dados)) return dados;

    if (Array.isArray(dados?.respostas)) {
        return dados.respostas;
    }

    if (Array.isArray(dados?.dados)) {
        return dados.dados;
    }

    return [];
}

export default function DetalhesSolicitacaoInstituicao({
    solicitacao,
    idSolicitacao,
    onClose,
    onAtualizar,
}) {
    const id = Number(
        idSolicitacao ??
        solicitacao?.id_solicitacoes ??
        solicitacao?.id_solicitacao ??
        solicitacao?.id
    );

    const [atual, setAtual] = useState(solicitacao ?? null);
    const [resposta, setResposta] = useState("");
    const [eventos, setEventos] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState("");

    async function chamarAPI(caminho, opcoes = {}) {
        const token = localStorage.getItem("@AndraRecursos:token");

        if (!token) {
            throw new Error(
                "Sessão expirada. Faça login novamente."
            );
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

    // ==========================================
    // CARREGAR SOLICITAÇÃO E MENSAGENS DOS DOIS LADOS
    // ==========================================

    async function carregarDetalhes() {
        setCarregando(true);
        setErro("");

        try {
            const [
                dadosSolicitacoes,
                dadosRespostasInstituicao,
                dadosRespostasAdmin,
            ] = await Promise.all([
                chamarAPI("/solicitacoes"),

                chamarAPI(
                    `/respostas-instituicao/solicitacao/${id}`
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
                    Number(
                        item.id_solicitacoes ??
                        item.id_solicitacao ??
                        item.id
                    ) === id
            );

            if (!encontrada) {
                throw new Error(
                    "Solicitação não encontrada."
                );
            }

            setAtual({
                ...encontrada,
                id,
                titulo:
                    encontrada.titulo ??
                    "Solicitação sem título",
                descricao: encontrada.descricao ?? "",
                prioridade:
                    encontrada.prioridade ??
                    "Não informada",
                setor:
                    encontrada.setor ??
                    "Não informado",
                status:
                    encontrada.status ??
                    "Não informado",
                data:
                    encontrada.data_pedido ??
                    encontrada.data ??
                    null,
            });

            const respostasInstituicao =
                normalizarListaRespostas(
                    dadosRespostasInstituicao
                );

            const respostasAdmin =
                normalizarListaRespostas(
                    dadosRespostasAdmin
                );

            const mensagensInstituicao =
                respostasInstituicao.map((item, indice) => ({
                    chave: `instituicao-${item.id_resposta ?? indice}`,
                    autor: "INSTITUIÇÃO",
                    mensagem: item.mensagem ?? "",
                    data: item.data_resposta ?? null,
                    origem: "instituicao",
                }));

            const mensagensAdmin = respostasAdmin.map(
                (item, indice) => ({
                    chave: `admin-${item.id_resposta ?? indice}`,
                    autor: "ADMINISTRADOR",
                    mensagem: item.mensagem ?? "",
                    data: item.data_resposta ?? null,
                    origem: "admin",
                })
            );

            const mensagens = [
                ...mensagensInstituicao,
                ...mensagensAdmin,
            ];

            mensagens.sort((a, b) => {
                const dataA = a.data
                    ? new Date(a.data).getTime()
                    : NaN;

                const dataB = b.data
                    ? new Date(b.data).getTime()
                    : NaN;

                if (
                    !Number.isFinite(dataA) &&
                    !Number.isFinite(dataB)
                ) {
                    return 0;
                }

                if (!Number.isFinite(dataA)) return 1;
                if (!Number.isFinite(dataB)) return -1;

                return dataA - dataB;
            });

            setEventos(mensagens);
        } catch (error) {
            setErro(
                error.message ||
                "Não foi possível carregar os detalhes."
            );
        } finally {
            setCarregando(false);
        }
    }

    // ==========================================
    // CARREGAR AO ABRIR O MODAL
    // ==========================================

    useEffect(() => {
        if (!Number.isSafeInteger(id) || id <= 0) {
            setErro("ID da solicitação inválido.");
            setCarregando(false);
            return;
        }

        carregarDetalhes();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // ==========================================
    // ENVIAR RESPOSTA DA INSTITUIÇÃO
    // ==========================================

    async function enviarResposta() {
        const mensagem = resposta.trim();

        if (!mensagem) {
            toast.error(
                "Digite uma mensagem antes de enviar."
            );
            return;
        }

        if (mensagem.length > 2000) {
            toast.error(
                "A mensagem deve ter no máximo 2000 caracteres."
            );
            return;
        }

        if (!Number.isSafeInteger(id) || id <= 0) {
            toast.error("ID da solicitação inválido.");
            return;
        }

        if (salvando || carregando) return;

        setSalvando(true);
        setErro("");

        try {
            await chamarAPI("/respostas-instituicao", {
                method: "POST",
                body: JSON.stringify({
                    id_solicitacao: id,
                    mensagem,
                }),
            });

            setResposta("");

            await carregarDetalhes();

            toast.success(
                "Resposta enviada com sucesso!"
            );

            onAtualizar?.();
        } catch (error) {
            setErro(
                error.message ||
                "Não foi possível enviar a resposta."
            );

            toast.error(
                error.message ||
                "Não foi possível enviar a resposta."
            );
        } finally {
            setSalvando(false);
        }
    }

    const situacao = visualizarStatus(atual?.status);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#07182b]/70 p-3 backdrop-blur-sm sm:p-6"
            onMouseDown={(e) => {
                if (
                    e.target === e.currentTarget &&
                    !salvando
                ) {
                    onClose?.();
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-solicitacao-instituicao"
                className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                {/* CABEÇALHO */}
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
                                id="titulo-solicitacao-instituicao"
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
                        disabled={salvando}
                        aria-label="Fechar detalhamento"
                        className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-200 disabled:opacity-50"
                    >
                        <FiX size={21} />
                    </button>
                </header>

                {/* CONTEÚDO */}
                <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-2">
                    {/* INFORMAÇÕES */}
                    <div className="border-b border-gray-200 p-5 sm:p-6 lg:border-b-0 lg:border-r">
                        <h3 className="mb-5 flex items-center gap-2 text-sm font-bold text-[#1759ad]">
                            <FiFileText />
                            Informações da Solicitação
                        </h3>

                        {carregando && !atual ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <FiRefreshCw className="animate-spin" />
                                Carregando informações...
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <div>
                                        <p className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                                            <FiHome />
                                            Solicitação
                                        </p>

                                        <p className="text-sm font-semibold text-[#082d56]">
                                            #{id}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                                            <FiCalendar />
                                            Data de emissão
                                        </p>

                                        <p className="text-sm font-semibold text-[#082d56]">
                                            {formatarData(atual?.data)}
                                        </p>
                                    </div>

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

                                <div className="mt-6">
                                    <h4 className="mb-2 text-sm font-semibold text-[#1759ad]">
                                        Descrição da solicitação
                                    </h4>

                                    <div className="min-h-32 rounded-lg border border-gray-200 bg-[#f7f7f7] p-4">
                                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                                            {atual?.descricao ||
                                                "Nenhuma descrição registrada."}
                                        </p>
                                    </div>
                                </div>

                                <AnexosSolicitacao
                                    idSolicitacao={id}
                                />
                            </>
                        )}
                    </div>

                    {/* COMUNICAÇÃO */}
                    <div className="flex min-h-0 flex-col p-5 sm:p-6">
                        <h3 className="mb-5 flex items-center gap-2 text-sm font-bold text-[#1759ad]">
                            <FiMessageCircle />
                            Comunicação com a Administração
                        </h3>

                        <div className="max-h-72 min-h-32 space-y-4 overflow-y-auto pr-2">
                            {carregando ? (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <FiRefreshCw className="animate-spin" />
                                    Carregando mensagens...
                                </div>
                            ) : eventos.length > 0 ? (
                                eventos.map((evento) => {
                                    const mensagemAdmin =
                                        evento.origem === "admin";

                                    return (
                                        <div
                                            key={evento.chave}
                                            className={`relative border-l-2 pl-4 ${
                                                mensagemAdmin
                                                    ? "border-blue-300"
                                                    : "border-green-300"
                                            }`}
                                        >
                                            <span
                                                className={`absolute -left-[6px] top-1 h-2.5 w-2.5 rounded-full ${
                                                    mensagemAdmin
                                                        ? "bg-blue-600"
                                                        : "bg-green-600"
                                                }`}
                                            />

                                            <div className="flex flex-wrap items-center justify-between gap-1">
                                                <p
                                                    className={`text-xs font-bold ${
                                                        mensagemAdmin
                                                            ? "text-blue-700"
                                                            : "text-green-700"
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
                                    );
                                })
                            ) : (
                                <p className="text-sm text-gray-500">
                                    Nenhuma mensagem registrada para esta solicitação.
                                </p>
                            )}
                        </div>

                        {/* ENVIAR RESPOSTA */}
                        <div className="mt-6 border-t border-gray-100 pt-5">
                            <label
                                htmlFor="mensagem-instituicao"
                                className="mb-2 block text-sm font-semibold text-[#082d56]"
                            >
                                Enviar mensagem para a administração
                            </label>

                            <textarea
                                id="mensagem-instituicao"
                                rows={4}
                                maxLength={2000}
                                value={resposta}
                                onChange={(e) =>
                                    setResposta(e.target.value)
                                }
                                disabled={salvando || carregando}
                                placeholder="Digite sua mensagem para a administração..."
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
                                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#082d56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#164675] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {salvando ? (
                                    <FiRefreshCw className="animate-spin" />
                                ) : (
                                    <FiSend />
                                )}

                                {salvando
                                    ? "Enviando..."
                                    : "Enviar mensagem"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ERRO */}
                {erro && (
                    <div className="mx-5 my-3 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                        <FiAlertCircle className="mt-0.5 shrink-0" />
                        <span>{erro}</span>
                    </div>
                )}

                {/* RODAPÉ */}
                <footer className="flex justify-end border-t border-gray-200 bg-[#f3f5f8] px-5 py-4 sm:px-6">
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
