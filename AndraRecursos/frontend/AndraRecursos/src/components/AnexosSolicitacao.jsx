
import { useEffect, useState } from "react";

import {
    FiDownload,
    FiExternalLink,
    FiFile,
    FiFileText,
    FiImage,
    FiRefreshCw,
    FiAlertCircle,
    FiPaperclip,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";

const API = String(enderecoServidor).replace(/\/$/, "");

function obterLinkSeguro(caminho) {
    if (!caminho || typeof caminho !== "string") {
        return null;
    }

    try {
        const url = new URL(caminho);

        if (!["https:", "http:"].includes(url.protocol)) {
            return null;
        }

        return url.href;
    } catch {
        return null;
    }
}

function obterTipo(documento) {
    const valor = String(
        documento.tipo || documento.nome_arquivo || ""
    ).toLowerCase();

    if (
        valor.includes("image") ||
        /\.(png|jpg|jpeg|webp|gif)$/i.test(valor)
    ) {
        return {
            nome: "Imagem",
            Icone: FiImage,
            classe: "bg-blue-50 text-blue-600",
        };
    }

    if (
        valor.includes("pdf") ||
        /\.pdf$/i.test(valor)
    ) {
        return {
            nome: "PDF",
            Icone: FiFileText,
            classe: "bg-red-50 text-red-600",
        };
    }

    return {
        nome: "Documento",
        Icone: FiFile,
        classe: "bg-gray-100 text-gray-600",
    };
}

export default function AnexosSolicitacao({
    idSolicitacao,
}) {
    const [documentos, setDocumentos] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

    useEffect(() => {
        const controlador = new AbortController();

        async function buscarAnexos() {
            setCarregando(true);
            setErro("");

            try {
                const token = localStorage.getItem(
                    "@AndraRecursos:token"
                );

                if (!token) {
                    throw new Error("Sessão expirada.");
                }

                const resposta = await fetch(
                    `${API}/documentos/solicitacao/${encodeURIComponent(
                        idSolicitacao
                    )}`,
                    {
                        method: "GET",
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
                        `Erro ${resposta.status} ao buscar documentos.`
                    );
                }

                if (!Array.isArray(dados)) {
                    throw new Error(
                        "A API retornou um formato de documentos inválido."
                    );
                }

                if (!controlador.signal.aborted) {
                    setDocumentos(dados);
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

        if (idSolicitacao) {
            buscarAnexos();
        } else {
            setDocumentos([]);
            setCarregando(false);
        }

        return () => controlador.abort();
    }, [idSolicitacao]);

    return (
        <div className="mt-6">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#1759ad]">
                <FiPaperclip size={17} />
                Anexos Comprobatórios

                {!carregando && !erro && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-[#1759ad]">
                        {documentos.length}
                    </span>
                )}
            </h4>

            {carregando && (
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                    <FiRefreshCw className="animate-spin" />
                    Carregando anexos...
                </div>
            )}

            {erro && (
                <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                    <FiAlertCircle className="shrink-0" />
                    {erro}
                </div>
            )}

            {!carregando && !erro && documentos.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                    <FiFile className="mx-auto mb-2 text-gray-400" size={23} />
                    <p className="text-xs text-gray-500">
                        Nenhum anexo disponível para esta solicitação.
                    </p>
                </div>
            )}

            {!carregando && !erro && documentos.length > 0 && (
                <div className="space-y-2">
                    {documentos.map((documento) => {
                        const tipo = obterTipo(documento);
                        const Icone = tipo.Icone;
                        const link = obterLinkSeguro(documento.caminho);

                        return (
                            <div
                                key={documento.id_documento}
                                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-[#f8fafc] px-3 py-3 transition hover:border-blue-200 hover:shadow-sm"
                            >
                                <span
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tipo.classe}`}
                                >
                                    <Icone size={19} />
                                </span>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-semibold text-[#082d56] sm:text-sm">
                                        {documento.nome_arquivo ||
                                            "Arquivo sem nome"}
                                    </p>

                                    <p className="mt-1 text-[11px] text-gray-500">
                                        {tipo.nome}
                                    </p>
                                </div>

                                {link ? (
                                    <a
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={`Abrir ${documento.nome_arquivo}`}
                                        title="Abrir documento"
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#1759ad] transition hover:bg-blue-100"
                                    >
                                        <FiExternalLink size={18} />
                                    </a>
                                ) : (
                                    <span
                                        title="O caminho do documento não é uma URL acessível."
                                        className="flex h-9 w-9 shrink-0 items-center justify-center text-gray-300"
                                    >
                                        <FiDownload size={18} />
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
