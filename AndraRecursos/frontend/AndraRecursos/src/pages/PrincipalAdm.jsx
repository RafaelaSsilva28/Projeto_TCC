
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  FiDownload,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiCheckCircle,
  FiXCircle,
  FiX,
  FiAlertCircle,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";

const API = String(enderecoServidor).replace(/\/$/, "");
const POR_PAGINA = 5;

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function statusVisual(valor) {
  const status = normalizarTexto(valor);

  if (["aprovada", "aprovado"].includes(status)) {
    return {
      texto: "Aprovada",
      classe: "bg-green-100 text-green-700",
      grupo: "aprovada",
    };
  }

  if (
    ["recusada", "recusado", "rejeitada", "rejeitado"].includes(
      status
    )
  ) {
    return {
      texto: "Recusada",
      classe: "bg-red-100 text-red-700",
      grupo: "recusada",
    };
  }

  if (status === "em andamento") {
    return {
      texto: "Em andamento",
      classe: "bg-blue-100 text-blue-700",
      grupo: "em andamento",
    };
  }

  if (status === "pendente") {
    return {
      texto: "Pendente",
      classe: "bg-yellow-100 text-yellow-800",
      grupo: "pendente",
    };
  }

  return {
    texto: valor || "Não informado",
    classe: "bg-gray-100 text-gray-600",
    grupo: status,
  };
}

function prioridadeVisual(valor) {
  const prioridade = normalizarTexto(valor);

  if (["alta", "urgente"].includes(prioridade)) {
    return "bg-red-100 text-red-700";
  }

  if (prioridade === "media") {
    return "bg-blue-100 text-blue-700";
  }

  if (prioridade === "baixa") {
    return "bg-green-100 text-green-700";
  }

  return "bg-gray-100 text-gray-600";
}

// Converte datas da API:
// DD/MM/YYYY HH:mm
// YYYY-MM-DD
// Data ISO
function obterData(valor) {
  if (!valor) return null;

  const texto = String(valor);

  const brasileira = texto.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/
  );

  if (brasileira) {
    const [, dia, mes, ano, hora = "0", minuto = "0"] =
      brasileira;

    const data = new Date(
      Number(ano),
      Number(mes) - 1,
      Number(dia),
      Number(hora),
      Number(minuto)
    );

    return Number.isNaN(data.getTime()) ? null : data;
  }

  const somenteData = texto.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (somenteData) {
    const [, ano, mes, dia] = somenteData;

    return new Date(
      Number(ano),
      Number(mes) - 1,
      Number(dia)
    );
  }

  const data = new Date(valor);

  return Number.isNaN(data.getTime()) ? null : data;
}

function formatarData(valor) {
  if (!valor) return "Não informada";

  const texto = String(valor);

  if (/^\d{2}\/\d{2}\/\d{4}/.test(texto)) {
    return texto.slice(0, 10);
  }

  const data = obterData(valor);

  if (!data) return "Não informada";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(data);
}

function normalizarSolicitacao(item) {
  return {
    id:
      item.id_solicitacoes ??
      item.id_solicitacao ??
      item.id,
    titulo: item.titulo ?? "Sem título",
    instituicao:
      item.nome_instituicao ??
      item.instituicao?.nome ??
      "Instituição não informada",
    prioridade: item.prioridade ?? "",
    status: item.status ?? "",
    setor: item.setor ?? "",
    descricao: item.descricao ?? "",
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

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function PrincipalAdm() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [atualizar, setAtualizar] = useState(0);
  const [pagina, setPagina] = useState(1);

  // FILTROS
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroInstituicao, setFiltroInstituicao] =
    useState("");
  const [filtroData, setFiltroData] = useState("");
  const [filtroPrioridade, setFiltroPrioridade] =
    useState("");

  // CONFIRMAÇÃO DE AÇÕES
  const [confirmacao, setConfirmacao] = useState(null);
  const [processando, setProcessando] = useState(false);

  // ==========================================
  // BUSCAR SOLICITAÇÕES NA API
  // ==========================================

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
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controlador.signal,
          }
        );

        const resultado = await resposta
          .json()
          .catch(() => null);

        if (!resposta.ok) {
          throw new Error(
            resultado?.error ||
            resultado?.message ||
            `Erro ${resposta.status} ao carregar solicitações.`
          );
        }

        const lista = Array.isArray(resultado)
          ? resultado
          : resultado?.solicitacoes ??
            resultado?.dados;

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

  // ==========================================
  // INDICADORES DO DASHBOARD
  // ==========================================

  const indicadores = useMemo(() => {
    const aprovadas = solicitacoes.filter(
      (item) => statusVisual(item.status).grupo === "aprovada"
    ).length;

    const pendentes = solicitacoes.filter(
      (item) => statusVisual(item.status).grupo === "pendente"
    ).length;

    const recusadas = solicitacoes.filter(
      (item) => statusVisual(item.status).grupo === "recusada"
    ).length;

    return {
      total: solicitacoes.length,
      aprovadas,
      pendentes,
      recusadas,
    };
  }, [solicitacoes]);

  const metricas = [
    {
      titulo: "Total de Solicitações",
      valor: indicadores.total,
      cor: "border-l-blue-600",
      texto: "text-blue-700",
    },
    {
      titulo: "Total Aprovadas",
      valor: indicadores.aprovadas,
      cor: "border-l-green-600",
      texto: "text-green-700",
    },
    {
      titulo: "Total Pendentes",
      valor: indicadores.pendentes,
      cor: "border-l-yellow-500",
      texto: "text-yellow-700",
    },
    {
      titulo: "Recusadas",
      valor: indicadores.recusadas,
      cor: "border-l-red-600",
      texto: "text-red-700",
    },
  ];

  // ==========================================
  // OPÇÕES DOS FILTROS
  // ==========================================

  const tiposDisponiveis = useMemo(() => {
    return [...new Set(
      solicitacoes.map((item) => item.titulo).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [solicitacoes]);

  const instituicoesDisponiveis = useMemo(() => {
    return [...new Set(
      solicitacoes.map((item) => item.instituicao).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [solicitacoes]);

  // ==========================================
  // APLICAR FILTROS
  // ==========================================

  const solicitacoesFiltradas = useMemo(() => {
    const hoje = new Date();

    hoje.setHours(0, 0, 0, 0);

    const resultado = solicitacoes.filter((item) => {
      if (
        filtroStatus &&
        statusVisual(item.status).grupo !== filtroStatus
      ) {
        return false;
      }

      if (filtroTipo && item.titulo !== filtroTipo) {
        return false;
      }

      if (
        filtroInstituicao &&
        item.instituicao !== filtroInstituicao
      ) {
        return false;
      }

      if (
        filtroPrioridade &&
        normalizarTexto(item.prioridade) !==
          filtroPrioridade
      ) {
        return false;
      }

      if (["hoje", "7dias", "30dias"].includes(filtroData)) {
        const dataPedido = obterData(item.data);

        if (!dataPedido) return false;

        const inicio = new Date(hoje);

        if (filtroData === "7dias") {
          inicio.setDate(inicio.getDate() - 6);
        }

        if (filtroData === "30dias") {
          inicio.setDate(inicio.getDate() - 29);
        }

        const fim = new Date(hoje);

        fim.setDate(fim.getDate() + 1);

        if (dataPedido < inicio || dataPedido >= fim) {
          return false;
        }
      }

      return true;
    });

    // Mais recentes primeiro por padrão.
    resultado.sort((a, b) => {
      const dataA = obterData(a.data)?.getTime() ?? 0;
      const dataB = obterData(b.data)?.getTime() ?? 0;

      if (filtroData === "antigas") {
        return dataA - dataB || Number(a.id) - Number(b.id);
      }

      return dataB - dataA || Number(b.id) - Number(a.id);
    });

    return resultado;
  }, [
    solicitacoes,
    filtroStatus,
    filtroTipo,
    filtroInstituicao,
    filtroData,
    filtroPrioridade,
  ]);

  function alterarFiltro(setter, valor) {
    setter(valor);
    setPagina(1);
  }

  function limparFiltros() {
    setFiltroStatus("");
    setFiltroTipo("");
    setFiltroInstituicao("");
    setFiltroData("");
    setFiltroPrioridade("");
    setPagina(1);
  }

  // ==========================================
  // PAGINAÇÃO - 5 POR PÁGINA
  // ==========================================

  const totalPaginas = Math.max(
    1,
    Math.ceil(solicitacoesFiltradas.length / POR_PAGINA)
  );

  const paginaAtual = Math.min(pagina, totalPaginas);

  const solicitacoesPagina = solicitacoesFiltradas.slice(
    (paginaAtual - 1) * POR_PAGINA,
    paginaAtual * POR_PAGINA
  );

  // ==========================================
  // EXPORTAR RELATÓRIO
  // ==========================================

  function exportarRelatorio() {
    if (solicitacoesFiltradas.length === 0) {
      toast.error("Não há solicitações para exportar.");
      return;
    }

    const linhas = [
      [
        "ID",
        "Instituição",
        "Tipo",
        "Descrição",
        "Setor",
        "Prioridade",
        "Status",
        "Data",
      ],
      ...solicitacoesFiltradas.map((item) => [
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
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url = URL.createObjectURL(arquivo);

    const link = document.createElement("a");

    link.href = url;
    link.download = "relatorio-dashboard-andrarecursos.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    toast.success("Relatório exportado com sucesso!");
  }

  // ==========================================
  // APROVAR E RECUSAR
  // ==========================================

  function abrirConfirmacao(item, novoStatus) {
    setConfirmacao({
      id: item.id,
      titulo: item.titulo,
      instituicao: item.instituicao,
      status: novoStatus,
    });
  }

  async function confirmarStatus() {
    if (!confirmacao || processando) return;

    const { id, status } = confirmacao;

    setProcessando(true);

    try {
      const token = localStorage.getItem(
        "@AndraRecursos:token"
      );

      if (!token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const resposta = await fetch(
        `${API}/solicitacoes/${id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      const resultado = await resposta
        .json()
        .catch(() => null);

      if (!resposta.ok) {
        throw new Error(
          resultado?.error ||
          resultado?.message ||
          `Erro ${resposta.status} ao atualizar status.`
        );
      }

      // Atualização visual imediata dos indicadores,
      // cartões e filtros.
      setSolicitacoes((anteriores) =>
        anteriores.map((item) =>
          String(item.id) === String(id)
            ? { ...item, status }
            : item
        )
      );

      setConfirmacao(null);

      toast.success(
        status === "aprovada"
          ? "Solicitação aprovada com sucesso!"
          : "Solicitação recusada com sucesso!"
      );

      // Reconcilia os dados com a API.
      setAtualizar((valor) => valor + 1);

    } catch (error) {
      toast.error(
        error.message || "Erro ao atualizar solicitação."
      );
    } finally {
      setProcessando(false);
    }
  }

  // ==========================================
  // CLASSES DE ESTILO
  // ==========================================

  const classeSelect =
    "min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-[#082d56] outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

  const classeCabecalhoTabela =
    "px-5 py-4 text-left text-xs font-semibold tracking-wide text-gray-500";

  const classeCelula =
    "px-5 py-4 text-sm text-gray-600";

  // ==========================================
  // INTERFACE
  // ==========================================

  return (
    <div className="space-y-7">

      {/* CABEÇALHO */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-[#082d56] sm:text-3xl">
            Visão Geral
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Bem-vindo ao nosso painel de controle!
          </p>
        </div>

        <button
          type="button"
          onClick={exportarRelatorio}
          disabled={
            carregando ||
            Boolean(erro) ||
            solicitacoesFiltradas.length === 0
          }
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#082d56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#164675] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <FiDownload size={17} />
          Exportar Relatório
        </button>

      </div>

      {/* ERRO */}
      {erro && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <FiAlertCircle />
          {erro}
        </div>
      )}

      {/* MÉTRICAS */}
      <section
        aria-label="Resumo das solicitações"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metricas.map((metrica) => (
          <div
            key={metrica.titulo}
            className={`min-w-0 rounded-xl border border-gray-200 border-l-4 bg-white p-5 shadow-sm ${metrica.cor}`}
          >
            <span className="block text-sm font-medium text-gray-500">
              {metrica.titulo}
            </span>

            <span
              className={`mt-3 block text-3xl font-bold ${metrica.texto}`}
            >
              {carregando ? "—" : metrica.valor}
            </span>
          </div>
        ))}
      </section>

      {/* FILTROS */}
      <section
        aria-label="Filtros de solicitações"
        className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <span className="mb-4 block text-sm font-semibold text-gray-700">
          Classificar por:
        </span>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">

          {/* STATUS */}
          <select
            aria-label="Filtrar por status"
            value={filtroStatus}
            onChange={(e) =>
              alterarFiltro(setFiltroStatus, e.target.value)
            }
            className={classeSelect}
          >
            <option value="">STATUS</option>
            <option value="pendente">Pendente</option>
            <option value="em andamento">Em andamento</option>
            <option value="aprovada">Aprovada</option>
            <option value="recusada">Recusada</option>
          </select>

          {/* TIPOS */}
          <select
            aria-label="Filtrar por tipo"
            value={filtroTipo}
            onChange={(e) =>
              alterarFiltro(setFiltroTipo, e.target.value)
            }
            className={classeSelect}
          >
            <option value="">TIPOS</option>

            {tiposDisponiveis.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>

          {/* INSTITUIÇÃO */}
          <select
            aria-label="Filtrar por instituição"
            value={filtroInstituicao}
            onChange={(e) =>
              alterarFiltro(
                setFiltroInstituicao,
                e.target.value
              )
            }
            className={classeSelect}
          >
            <option value="">INSTITUIÇÃO</option>

            {instituicoesDisponiveis.map((instituicao) => (
              <option
                key={instituicao}
                value={instituicao}
              >
                {instituicao}
              </option>
            ))}
          </select>

          {/* DATA */}
          <select
            aria-label="Filtrar por data"
            value={filtroData}
            onChange={(e) =>
              alterarFiltro(setFiltroData, e.target.value)
            }
            className={classeSelect}
          >
            <option value="">DATA</option>
            <option value="recentes">Mais recentes</option>
            <option value="antigas">Mais antigas</option>
            <option value="hoje">Hoje</option>
            <option value="7dias">Últimos 7 dias</option>
            <option value="30dias">Últimos 30 dias</option>
          </select>

          {/* PRIORIDADE */}
          <select
            aria-label="Filtrar por prioridade"
            value={filtroPrioridade}
            onChange={(e) =>
              alterarFiltro(
                setFiltroPrioridade,
                e.target.value
              )
            }
            className={classeSelect}
          >
            <option value="">PRIORIDADE</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
            <option value="urgente">Urgente</option>
          </select>

          {/* LIMPAR */}
          <button
            type="button"
            onClick={limparFiltros}
            className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-[#082d56] transition hover:border-blue-300 hover:bg-blue-50"
          >
            Limpar
          </button>

        </div>
      </section>

      {/* TABELA DE SOLICITAÇÕES */}
      <section className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-5">

          <h2 className="text-lg font-semibold text-[#082d56]">
            Solicitações Recentes
          </h2>

          <button
            type="button"
            onClick={() =>
              setAtualizar((valor) => valor + 1)
            }
            disabled={carregando}
            title="Atualizar solicitações"
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-[#082d56] transition hover:bg-gray-50 disabled:opacity-50"
          >
            <FiRefreshCw
              className={carregando ? "animate-spin" : ""}
            />
            Atualizar
          </button>

        </div>

        <div
          className="overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="Tabela de solicitações recentes"
        >
          <table className="w-full min-w-[960px] border-collapse">

            <thead className="bg-gray-50">
              <tr>
                {[
                  "ID",
                  "INSTITUIÇÃO",
                  "TIPO",
                  "PRIORIDADE",
                  "STATUS",
                  "DATA",
                  "AÇÕES",
                ].map((coluna) => (
                  <th
                    key={coluna}
                    scope="col"
                    className={classeCabecalhoTabela}
                  >
                    {coluna}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">

              {carregando ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-gray-500"
                  >
                    <FiRefreshCw className="mr-2 inline animate-spin" />
                    Carregando solicitações...
                  </td>
                </tr>
              ) : solicitacoesPagina.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-gray-500"
                  >
                    Nenhuma solicitação encontrada.
                  </td>
                </tr>
              ) : (
                solicitacoesPagina.map((item) => {
                  const situacao = statusVisual(item.status);

                  return (
                    <tr
                      key={item.id}
                      className="transition hover:bg-gray-50"
                    >

                      {/* ID */}
                      <td className={classeCelula}>
                        <strong className="text-[#082d56]">
                          {item.id}
                        </strong>
                      </td>

                      {/* INSTITUIÇÃO */}
                      <td className={classeCelula}>
                        {item.instituicao}
                      </td>

                      {/* TIPO */}
                      <td className={classeCelula}>
                        {item.titulo}
                      </td>

                      {/* PRIORIDADE */}
                      <td className={classeCelula}>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${prioridadeVisual(item.prioridade)}`}
                        >
                          {String(item.prioridade || "—").toUpperCase()}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className={classeCelula}>
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${situacao.classe}`}
                        >
                          {situacao.texto}
                        </span>
                      </td>

                      {/* DATA */}
                      <td
                        className={`${classeCelula} whitespace-nowrap`}
                      >
                        {formatarData(item.data)}
                      </td>

                      {/* AÇÕES */}
                      <td className={classeCelula}>
                        <div className="flex items-center gap-2">

                          <button
                            type="button"
                            disabled={
                              processando ||
                              situacao.grupo === "aprovada"
                            }
                            onClick={() =>
                              abrirConfirmacao(item, "aprovada")
                            }
                            className="min-h-10 rounded-md bg-green-100 px-3 py-2 text-xs font-bold text-green-700 transition hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            APROVAR
                          </button>

                          <button
                            type="button"
                            disabled={
                              processando ||
                              situacao.grupo === "recusada"
                            }
                            onClick={() =>
                              abrirConfirmacao(item, "recusada")
                            }
                            className="min-h-10 rounded-md bg-red-100 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            RECUSAR
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}

            </tbody>
          </table>
        </div>

        {/* PAGINAÇÃO */}
        {!carregando && !erro && solicitacoesFiltradas.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 px-5 py-5">

            <p className="text-xs text-gray-500">
              Exibindo{" "}
              {(paginaAtual - 1) * POR_PAGINA + 1} a{" "}
              {Math.min(
                paginaAtual * POR_PAGINA,
                solicitacoesFiltradas.length
              )}{" "}
              de {solicitacoesFiltradas.length} solicitações
            </p>

            <div className="flex items-center gap-2">

              <button
                type="button"
                aria-label="Página anterior"
                disabled={paginaAtual === 1}
                onClick={() =>
                  setPagina((valor) =>
                    Math.max(1, valor - 1)
                  )
                }
                className="rounded-lg border border-gray-200 p-2 text-[#082d56] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FiChevronLeft size={18} />
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
                className="rounded-lg border border-gray-200 p-2 text-[#082d56] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FiChevronRight size={18} />
              </button>

            </div>
          </div>
        )}

      </section>

      {/* CONFIRMAÇÃO PERSONALIZADA */}
      {confirmacao && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07182b]/65 p-4 backdrop-blur-sm">

          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmacao"
            aria-describedby="descricao-confirmacao"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >

            <div className="px-6 pb-5 pt-7 text-center">

              <div
                className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                  confirmacao.status === "aprovada"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {confirmacao.status === "aprovada" ? (
                  <FiCheckCircle size={32} />
                ) : (
                  <FiXCircle size={32} />
                )}
              </div>

              <h3
                id="titulo-confirmacao"
                className="text-xl font-bold text-[#082d56]"
              >
                {confirmacao.status === "aprovada"
                  ? "Aprovar solicitação?"
                  : "Recusar solicitação?"}
              </h3>

              <p
                id="descricao-confirmacao"
                className="mt-3 text-sm leading-relaxed text-gray-500"
              >
                {confirmacao.status === "aprovada"
                  ? "Deseja realmente aprovar esta solicitação?"
                  : "Deseja realmente recusar esta solicitação?"}
              </p>

              <div className="mt-5 rounded-xl bg-[#f3f5f8] p-4">
                <p className="text-xs font-semibold text-[#1759ad]">
                  Solicitação #{confirmacao.id}
                </p>

                <p className="mt-1 text-sm font-bold text-[#082d56]">
                  {confirmacao.titulo}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {confirmacao.instituicao}
                </p>
              </div>

            </div>

            <div className="flex gap-3 border-t border-gray-100 bg-gray-50 p-5">

              <button
                type="button"
                disabled={processando}
                onClick={() => setConfirmacao(null)}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={processando}
                onClick={confirmarStatus}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 ${
                  confirmacao.status === "aprovada"
                    ? "bg-green-700 hover:bg-green-800"
                    : "bg-red-700 hover:bg-red-800"
                }`}
              >
                {processando ? (
                  <>
                    <FiRefreshCw className="animate-spin" />
                    Salvando...
                  </>
                ) : confirmacao.status === "aprovada" ? (
                  <>
                    <FiCheckCircle />
                    Sim, aprovar
                  </>
                ) : (
                  <>
                    <FiX />
                    Sim, recusar
                  </>
                )}
              </button>

            </div>

          </section>
        </div>
      )}

    </div>
  );
}
