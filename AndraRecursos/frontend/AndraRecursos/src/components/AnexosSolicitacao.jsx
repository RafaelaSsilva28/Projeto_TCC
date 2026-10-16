
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
    FiFileText,
    FiDownload,
    FiRefreshCw,
    FiAlertCircle,
    FiPaperclip,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";

const API = String(enderecoServidor).replace(/\/$/, "");

export default function AnexosSolicitacao({ idSolicitacao }) {
    const [documentos, setDocumentos] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [baixando, setBaixando] = useState(null);

    const carregarDocumentos = useCallback(
        async (signal) => {
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
                    `${API}/solicitacoes/${idSolicitacao}/documentos`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        signal,
                    }
                );

                const dados = await resposta.json().catch(() => null);

                if (!resposta.ok) {
                    throw new Error(
                        dados?.error ||
                        dados?.message ||
                        `Erro ${resposta.status} ao carregar documentos.`
                    );
                }

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
                if (error.name === "AbortError") return;

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

    async function baixarDocumento(documento) {
        if (baixando !== null) return;

        setBaixando(documento.id_documento);

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
                `${API}/documentos/${documento.id_documento}/download`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const dados = await resposta.json().catch(() => null);

            if (!resposta.ok) {
                throw new Error(
                    dados?.error ||
                    dados?.message ||
                    `Erro ${resposta.status} ao baixar o documento.`
                );
            }

            if (!dados?.url) {
                throw new Error(
                    "O servidor não retornou o link do arquivo."
                );
            }

            // A URL assinada já contém a autorização temporária.
            // Não é necessário enviar o token novamente ao Supabase.
            const link = document.createElement("a");
            link.href = dados.url;
            link.download =
                dados.nome_arquivo ||
                documento.nome_arquivo ||
                "documento";

            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.success("Download solicitado com sucesso!");
        } catch (error) {
            toast.error(
                error.message || "Não foi possível baixar o documento."
            );
        } finally {
            setBaixando(null);
        }
    }

    return (
        <section className="mt-6">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1759ad]">
                <FiPaperclip />
                Documentos anexados
                {!carregando && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                        {documentos.length}
                    </span>
                )}
            </h4>

            {carregando && (
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                    <FiRefreshCw className="animate-spin" />
                    Carregando documentos...
                </div>
            )}

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

            {!carregando && !erro && documentos.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
                    <FiFileText className="mx-auto mb-2 text-2xl text-gray-400" />

                    <p className="text-sm font-medium text-gray-600">
                        Nenhum documento anexado.
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                        Os arquivos enviados pela instituição aparecerão aqui.
                    </p>
                </div>
            )}

            {!carregando && !erro && documentos.length > 0 && (
                <div className="space-y-2">
                    {documentos.map((documento) => (
                        <div
                            key={documento.id_documento}
                            className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 transition hover:border-blue-200"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="shrink-0 rounded-lg bg-blue-50 p-2 text-[#1759ad]">
                                    <FiFileText size={20} />
                                </span>

                                <div className="min-w-0">
                                    <p
                                        title={documento.nome_arquivo}
                                        className="break-words text-sm font-medium text-[#082d56]"
                                    >
                                        {documento.nome_arquivo || "Documento sem nome"}
                                    </p>

                                    <p className="mt-1 text-xs text-gray-500">
                                        {documento.tipo || "Tipo não informado"}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => baixarDocumento(documento)}
                                disabled={baixando !== null}
                                title="Baixar documento"
                                aria-label={`Baixar ${documento.nome_arquivo}`}
                                className="flex shrink-0 items-center gap-2 rounded-lg bg-[#082d56] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#164675] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {baixando === documento.id_documento ? (
                                    <FiRefreshCw className="animate-spin" />
                                ) : (
                                    <FiDownload />
                                )}

                                <span className="hidden sm:inline">
                                    {baixando === documento.id_documento
                                        ? "Preparando..."
                                        : "Baixar"}
                                </span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
