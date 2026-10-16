
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

const API = String(enderecoServidor).replace(/\/$/, "");

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

        const resposta = await fetch(`${API}${caminho}`, {
            ...opcoes,
            headers: {
                Authorization: `Bearer ${token}`,
                ...opcoes.headers,
            },
        });

        const dados = await resposta
            .json()
            .catch(() => null);

        if (!resposta.ok) {
            throw new Error(
                dados?.error ||
                dados?.message ||
                `Erro ${resposta.status} na API.`
            );
        }

        return dados;
    }

    // ==========================================
    // CARREGAR DOCUMENTOS
    // ==========================================

    const carregarDocumentos = useCallback(
        async (signal) => {
            setCarregando(true);
            setErro("");

            try {
                const dados = await chamarAPI(
                    `/solicitacoes/${idSolicitacao}/documentos`,
                    { signal }
                );

                const lista = Array.isArray(dados)
                    ? dados
                    : dados?.documentos ?? [];

                if (!Array.isArray(lista)) {
                    throw new Error(
                        "A API retornou uma lista de documentos inválida."
                    );
                }

                setDocumentos(lista);
            } catch (error) {
                if (error.name === "AbortError") {
                    return;
                }

                setErro(error.message);
                setDocumentos([]);
            } finally {
                if (!signal?.aborted) {
                    setCarregando(false);
                }
            }
        },
        [idSolicitacao]
    );

    useEffect(() => {
        const controlador = new AbortController();

        carregarDocumentos(controlador.signal);

        return () => controlador.abort();
    }, [carregarDocumentos]);

    // ==========================================
    // OBTER LINK SEGURO DO DOCUMENTO
    // ==========================================

    async function obterUrlDocumento(documento) {
        const dados = await chamarAPI(
            `/documentos/${documento.id_documento}/download`
        );

        if (!dados?.url) {
            throw new Error(
                "O servidor não retornou o link do arquivo."
            );
        }

        return dados;
    }

    // ==========================================
    // VISUALIZAR DOCUMENTO
    // ==========================================

    async function abrirDocumento(documento) {
        if (processando !== null) return;

        setProcessando(documento.id_documento);

        try {
            const dados = await obterUrlDocumento(documento);

            const url = new URL(dados.url);

            if (!["https:", "http:"].includes(url.protocol)) {
                throw new Error(
                    "O servidor retornou um link inválido."
                );
            }

            // Abre o documento em outra aba.
            const link = document.createElement("a");

            link.href = url.href;
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            document.body.appendChild(link);
            link.click();
            link.remove();

        } catch (error) {
            toast.error(
                error.message ||
                "Não foi possível abrir o documento."
            );
        } finally {
            setProcessando(null);
        }
    }

    // ==========================================
    // BAIXAR DOCUMENTO
    // ==========================================

    async function baixarDocumento(documento) {
        if (processando !== null) return;

        setProcessando(documento.id_documento);

        try {
            const dados = await obterUrlDocumento(documento);

            const url = new URL(dados.url);

            if (!["https:", "http:"].includes(url.protocol)) {
                throw new Error(
                    "O servidor retornou um link inválido."
                );
            }

            const link = document.createElement("a");

            link.href = url.href;
            link.download =
                dados.nome_arquivo ||
                documento.nome_arquivo ||
                "documento";

            link.rel = "noopener noreferrer";

            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.success(
                "Download solicitado com sucesso!"
            );
        } catch (error) {
            toast.error(
                error.message ||
                "Não foi possível baixar o documento."
            );
        } finally {
            setProcessando(null);
        }
    }

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

                    <button
                        type="button"
                        onClick={() => carregarDocumentos()}
                        className="mt-3 text-sm font-semibold text-red-700 underline"
                    >
                        Tentar novamente
                    </button>
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
                        {documentos.map((documento) => {
                            const ocupado =
                                processando === documento.id_documento;

                            return (
                                <article
                                    key={documento.id_documento}
                                    className="rounded-xl border border-gray-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm"
                                >
                                    <div className="flex min-w-0 items-start gap-3">
                                        <span className="shrink-0 rounded-lg bg-blue-50 p-3 text-[#1759ad]">
                                            <FiFileText size={22} />
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <p
                                                title={documento.nome_arquivo}
                                                className="break-words text-sm font-semibold text-[#082d56]"
                                            >
                                                {documento.nome_arquivo ||
                                                    "Documento sem nome"}
                                            </p>

                                            <p className="mt-1 text-xs text-gray-500">
                                                {documento.tipo ||
                                                    "Tipo não informado"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                abrirDocumento(documento)
                                            }
                                            disabled={
                                                processando !== null
                                            }
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
                                            onClick={() =>
                                                baixarDocumento(documento)
                                            }
                                            disabled={
                                                processando !== null
                                            }
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
