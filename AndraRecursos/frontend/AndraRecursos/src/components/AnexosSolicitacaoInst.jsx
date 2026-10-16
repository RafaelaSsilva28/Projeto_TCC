
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
    FiFileText,
    FiDownload,
    FiEye,
    FiRefreshCw,
    FiAlertCircle,
    FiPaperclip,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";

const API = String(enderecoServidor).replace(/\/+$/, "");
const CHAVE_TOKEN = "@AndraRecursos:token";

// ============================================
// NORMALIZAR ID DA SOLICITAÇÃO
// Aceita tanto um ID quanto um objeto de solicitação
// ============================================

function obterIdSolicitacao(valor) {
    const candidato =
        valor && typeof valor === "object"
            ? (
                valor.id_solicitacoes ??
                valor.id_solicitacao ??
                valor.idSolicitacao ??
                valor.id
            )
            : valor;

    if (
        candidato === null ||
        candidato === undefined ||
        String(candidato).trim() === ""
    ) {
        return null;
    }

    const numero = Number(candidato);

    return Number.isSafeInteger(numero) && numero > 0
        ? numero
        : null;
}

// ============================================
// COMPONENTE DE ANEXOS DA SOLICITAÇÃO
// ============================================

export default function AnexosSolicitacaoInst({
    idSolicitacao,
}) {
    const [documentos, setDocumentos] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [processando, setProcessando] = useState(null);

    const id = obterIdSolicitacao(idSolicitacao);

    // ==========================================
    // REQUISIÇÕES AUTENTICADAS
    // ==========================================

    const chamarAPI = useCallback(async (caminho, opcoes = {}) => {
        const token = localStorage.getItem(CHAVE_TOKEN);

        if (!token) {
            throw new Error(
                "Sua sessão expirou. Entre novamente no sistema."
            );
        }

        const resposta = await fetch(`${API}${caminho}`, {
            ...opcoes,
            headers: {
                ...opcoes.headers,
                Authorization: `Bearer ${token}`,
            },
        });

        const dados = await resposta.json().catch(() => null);

        if (!resposta.ok) {
            if (resposta.status === 401) {
                throw new Error(
                    "Sua sessão expirou ou o token é inválido. Entre novamente."
                );
            }

            if (resposta.status === 403) {
                throw new Error(
                    "Acesso negado pelo servidor. O backend precisa autorizar a instituição a consultar os documentos da própria solicitação."
                );
            }

            if (resposta.status === 404) {
                throw new Error(
                    "A rota ou o documento não foi encontrado. Verifique as rotas do backend."
                );
            }

            throw new Error(
                dados?.error ||
                dados?.message ||
                `Erro ${resposta.status} ao consultar o servidor.`
            );
        }

        return dados;
    }, []);

    // ==========================================
    // CARREGAR DOCUMENTOS
    // ==========================================

    const carregarDocumentos = useCallback(async (signal) => {
        if (id === null) {
            setDocumentos([]);
            setErro(
                "O ID da solicitação não foi informado corretamente. Verifique como o componente recebe a propriedade idSolicitacao."
            );
            setCarregando(false);
            return;
        }

        setCarregando(true);
        setErro("");

        try {
            // Rota existente no backend:
            // GET /documentos/solicitacao/:id_solicitacoes

            const dados = await chamarAPI(
                `/documentos/solicitacao/${id}`,
                { signal }
            );

            const lista = Array.isArray(dados)
                ? dados
                : dados?.documentos;

            if (!Array.isArray(lista)) {
                throw new Error(
                    "O servidor não retornou uma lista válida de documentos."
                );
            }

            if (signal?.aborted) return;

            setDocumentos(lista);
        } catch (error) {
            if (error.name === "AbortError") return;

            console.error(
                "Erro ao carregar documentos da solicitação:",
                error
            );

            if (!signal?.aborted) {
                setDocumentos([]);
                setErro(
                    error.message ||
                    "Não foi possível carregar os documentos."
                );
            }
        } finally {
            if (!signal?.aborted) {
                setCarregando(false);
            }
        }
    }, [id, chamarAPI]);

    // ==========================================
    // CARREGAMENTO AUTOMÁTICO
    // ==========================================

    useEffect(() => {
        const controlador = new AbortController();

        carregarDocumentos(controlador.signal);

        return () => controlador.abort();
    }, [carregarDocumentos]);

    // ==========================================
    // OBTER LINK DO DOCUMENTO
    // ==========================================

    const obterUrlDocumento = useCallback(async (documento) => {
        const idDocumento = Number(documento?.id_documento);

        if (
            !Number.isSafeInteger(idDocumento) ||
            idDocumento <= 0
        ) {
            throw new Error(
                "O identificador deste documento é inválido."
            );
        }

        // Esta rota precisa autorizar a instituição proprietária
        // do documento. Se for exclusiva do administrador,
        // o backend deverá ser corrigido.

        const dados = await chamarAPI(
            `/documentos/${idDocumento}/download`
        );

        if (!dados?.url) {
            throw new Error(
                "O servidor não retornou o link para acessar o arquivo."
            );
        }

        let url;

        try {
            url = new URL(dados.url);
        } catch {
            throw new Error(
                "O servidor retornou um endereço de arquivo inválido."
            );
        }

        if (
            !["https:", "http:"].includes(url.protocol) ||
            url.username ||
            url.password
        ) {
            throw new Error(
                "O endereço retornado pelo servidor não é válido."
            );
        }

        return {
            ...dados,
            url: url.href,
        };
    }, [chamarAPI]);

    // ==========================================
    // VISUALIZAR DOCUMENTO
    // ==========================================

    const abrirDocumento = async (documento) => {
        if (processando !== null) return;

        const chave = documento?.id_documento;

        setProcessando(chave);

        try {
            const dados = await obterUrlDocumento(documento);

            window.open(
                dados.url,
                "_blank",
                "noopener,noreferrer"
            );
        } catch (error) {
            console.error("Erro ao abrir documento:", error);
            toast.error(
                error.message ||
                "Não foi possível abrir o documento."
            );
        } finally {
            setProcessando(null);
        }
    };

    // ==========================================
    // BAIXAR DOCUMENTO
    // ==========================================

    const baixarDocumento = async (documento) => {
        if (processando !== null) return;

        const chave = documento?.id_documento;

        setProcessando(chave);

        try {
            const dados = await obterUrlDocumento(documento);

            const link = document.createElement("a");

            link.href = dados.url;
            link.download =
                dados.nome_arquivo ||
                documento.nome_arquivo ||
                "documento";

            link.rel = "noopener noreferrer";

            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.success("Solicitação de download enviada.");
        } catch (error) {
            console.error("Erro ao baixar documento:", error);
            toast.error(
                error.message ||
                "Não foi possível baixar o documento."
            );
        } finally {
            setProcessando(null);
        }
    };

    // ==========================================
    // INTERFACE
    // ==========================================

    return (
        <section className="mt-6">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1759ad]">
                <FiPaperclip />

                Documentos anexados

                {!carregando && !erro && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                        {documentos.length}
                    </span>
                )}
            </h4>

            {/* CARREGAMENTO */}

            {carregando && (
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                    <FiRefreshCw className="animate-spin" />
                    Carregando documentos...
                </div>
            )}

            {/* ERRO */}

            {!carregando && erro && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="flex items-start gap-2 text-sm text-red-700">
                        <FiAlertCircle className="mt-0.5 shrink-0" />
                        <span>{erro}</span>
                    </p>

                    {id !== null && (
                        <button
                            type="button"
                            onClick={() => carregarDocumentos()}
                            className="mt-3 text-sm font-semibold text-red-700 underline"
                        >
                            Tentar novamente
                        </button>
                    )}
                </div>
            )}

            {/* NENHUM DOCUMENTO */}

            {!carregando &&
                !erro &&
                documentos.length === 0 && (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
                        <FiFileText className="mx-auto mb-2 text-2xl text-gray-400" />

                        <p className="text-sm font-medium text-gray-600">
                            Nenhum documento anexado.
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                            Os arquivos enviados nesta solicitação aparecerão aqui.
                        </p>
                    </div>
                )}

            {/* LISTA DE DOCUMENTOS */}

            {!carregando &&
                !erro &&
                documentos.length > 0 && (
                    <div className="space-y-3">
                        {documentos.map((documento, indice) => {
                            const chave = documento.id_documento;
                            const ocupado = processando === chave;

                            return (
                                <article
                                    key={chave ?? indice}
                                    className="rounded-xl border border-gray-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm"
                                >
                                    <div className="flex min-w-0 items-start gap-3">
                                        <span className="shrink-0 rounded-lg bg-blue-50 p-3 text-[#1759ad]">
                                            <FiFileText size={22} />
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <p
                                                title={documento.nome_arquivo || ""}
                                                className="break-words text-sm font-semibold text-[#082d56]"
                                            >
                                                {documento.nome_arquivo ||
                                                    "Documento sem nome"}
                                            </p>

                                            <p className="mt-1 text-xs text-gray-500">
                                                {documento.tipo ||
                                                    documento.tipo_documento ||
                                                    documento.mime_type ||
                                                    "Tipo não informado"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => abrirDocumento(documento)}
                                            disabled={processando !== null}
                                            className="flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-[#1759ad] transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {ocupado ? (
                                                <FiRefreshCw className="animate-spin" />
                                            ) : (
                                                <FiEye />
                                            )}

                                            Visualizar
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => baixarDocumento(documento)}
                                            disabled={processando !== null}
                                            className="flex items-center justify-center gap-2 rounded-lg bg-[#082d56] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#164675] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {ocupado ? (
                                                <FiRefreshCw className="animate-spin" />
                                            ) : (
                                                <FiDownload />
                                            )}

                                            Baixar
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
        </section>
    );
}
