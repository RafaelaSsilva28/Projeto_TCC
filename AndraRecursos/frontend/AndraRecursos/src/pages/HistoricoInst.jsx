
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiClipboard,
  FiX,
  FiDownload,
  FiFileText,
  FiClock,
  FiSearch,
  FiEye,
  FiRefreshCw,
  FiAlertCircle,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiFlag,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FiTrash2 } from "react-icons/fi";

const LIMITE_PAGINA = 10;

// ============================================
// FORMATAR STATUS
// ============================================

function formatarStatus(status) {
  const valor = String(status || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (
    ["aprovada", "aprovado", "deferida", "deferido"].includes(valor) ||
    valor.includes("aprov")
  ) {
    return {
      texto: "APROVADA",
      estilo: "bg-green-100 text-green-700",
    };
  }

  if (
    [
      "recusada",
      "recusado",
      "rejeitada",
      "rejeitado",
      "indeferida",
      "indeferido",
      "cancelada",
      "cancelado",
    ].includes(valor) ||
    valor.includes("recus") ||
    valor.includes("rejeit") ||
    valor.includes("cancel") ||
    valor.includes("indefer")
  ) {
    return {
      texto: "RECUSADA",
      estilo: "bg-red-100 text-red-700",
    };
  }

  if (
    valor.includes("andamento") ||
    valor.includes("analise") ||
    valor.includes("em analise")
  ) {
    return {
      texto: "EM ANDAMENTO",
      estilo: "bg-blue-100 text-blue-700",
    };
  }

  if (
    ["pendente", "pendentes", "aguardando"].includes(valor) ||
    valor.includes("pendente") ||
    valor.includes("aguardando")
  ) {
    return {
      texto: "PENDENTE",
      estilo: "bg-yellow-100 text-yellow-700",
    };
  }

  if (
    valor.includes("conclu") ||
    valor.includes("finaliz")
  ) {
    return {
      texto: "CONCLUÍDA",
      estilo: "bg-blue-100 text-blue-700",
    };
  }

  return {
    texto: String(status || "Não informado").toUpperCase(),
    estilo: "bg-gray-200 text-gray-700",
  };
}

// ============================================
// FORMATAR DATA
// ============================================

function formatarData(valor) {
  if (!valor) return "Não informada";

  const texto = String(valor).trim();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
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
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(data);
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function HistoricoInst() {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [pesquisa, setPesquisa] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [atualizar, setAtualizar] = useState(0);

  const [solicitacaoSelecionada, setSolicitacaoSelecionada] =
    useState(null);

  // ==========================================
  // BUSCAR HISTÓRICO NA API
  // ==========================================

  const buscarHistorico = useCallback(async (signal) => {
  const token = localStorage.getItem("@AndraRecursos:token");

    if (!token) {
      window.location.replace("/");
      return;
    }

    setCarregando(true);
    setErro("");

    try {
      const resposta = await fetch(
        `${enderecoServidor}/historico-instituicao`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal,
        },
      );

      if (resposta.status === 401 || resposta.status === 403) {
        localStorage.removeItem("@AndraRecursos:token");
        window.location.replace("/");
        return;
      }

      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        throw new Error(
          dados?.message ||
            dados?.error ||
            `Não foi possível carregar o histórico. Erro ${resposta.status}.`,
        );
      }

      if (!Array.isArray(dados)) {
        throw new Error(
          "A API retornou um formato de histórico inválido.",
        );
      }

      if (!signal?.aborted) {
        setHistorico(dados);
      }
    } catch (error) {
      if (error.name !== "AbortError" && !signal?.aborted) {
        console.error(
          "Erro ao buscar histórico da instituição:",
          error,
        );

        setErro(error.message || "Erro ao carregar o histórico.");
      }
    } finally {
      if (!signal?.aborted) {
        setCarregando(false);
      }
    }
  }, []);

  useEffect(() => {
    const controlador = new AbortController();

    buscarHistorico(controlador.signal);

    return () => controlador.abort();
  }, [buscarHistorico, atualizar]);

  // ==========================================
  // FECHAR MODAL COM ESC
  // ==========================================

  useEffect(() => {
    function fecharModal(event) {
      if (event.key === "Escape") {
        setSolicitacaoSelecionada(null);
      }
    }

    window.addEventListener("keydown", fecharModal);

    return () => {
      window.removeEventListener("keydown", fecharModal);
    };
  }, []);

  // ==========================================
  // PESQUISA E FILTROS
  // ==========================================

  const historicoFiltrado = useMemo(() => {
    const termo = pesquisa.toLowerCase().trim();

    return historico.filter((item) => {
      const correspondePesquisa =
        !termo ||
        [
          item.titulo_solicitacao,
          item.status,
          item.descricao,
          item.prioridade,
          item.id_solicitacao,
          item.id_historico,
          item.data_alteracao,
        ].some((valor) =>
          String(valor ?? "")
            .toLowerCase()
            .includes(termo),
        );

      const status = formatarStatus(item.status).texto;

      const correspondeStatus =
        filtroStatus === "todos" || status === filtroStatus;

      return correspondePesquisa && correspondeStatus;
    });
  }, [historico, pesquisa, filtroStatus]);

  // ==========================================
  // PAGINAÇÃO
  // ==========================================

  const totalPaginas = Math.max(
    1,
    Math.ceil(historicoFiltrado.length / LIMITE_PAGINA),
  );

  const paginaAtual = Math.min(pagina, totalPaginas);

  const itensPagina = historicoFiltrado.slice(
    (paginaAtual - 1) * LIMITE_PAGINA,
    paginaAtual * LIMITE_PAGINA,
  );

  function mudarPesquisa(valor) {
    setPesquisa(valor);
    setPagina(1);
  }

  function mudarStatus(valor) {
    setFiltroStatus(valor);
    setPagina(1);
  }

  // ==========================================
  // INDICADORES
  // ==========================================

  const totalRegistros = historico.length;

  const totalAprovados = historico.filter(
    (item) => formatarStatus(item.status).texto === "APROVADA",
  ).length;

  const totalRecusados = historico.filter(
    (item) => formatarStatus(item.status).texto === "RECUSADA",
  ).length;

  const totalPendentes = historico.filter(
    (item) =>
      formatarStatus(item.status).texto === "PENDENTE" ||
      formatarStatus(item.status).texto === "EM ANDAMENTO",
  ).length;

  
  // ==========================================
  // FUNÇÃO PARA EXCLUIR SOLICITAÇÃO
  // ==========================================
  async function excluirSolicitacao(solicitacao) {
    const id = solicitacao?.id_solicitacao;

    if (!id) {
      alert("Não foi possível identificar a solicitação.");
      return;
    }

    const confirmar = window.confirm(
      `Deseja excluir a solicitação #${id} inteira? Esta ação não poderá ser desfeita.`
    );

    if (!confirmar) return;

    try {
      const token = localStorage.getItem("@AndraRecursos:token");

      if (!token) {
        alert("Sua sessão expirou. Faça login novamente.");
        return;
      }

      const resposta = await fetch(
        `${enderecoServidor}/solicitacoes/instituicao/solicitacoes/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const resultado = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        throw new Error(
          resultado.error ||
          resultado.message ||
          "Não foi possível excluir a solicitação."
        );
      }

      // Remove do histórico todos os registros
      // relacionados à solicitação excluída.
      setHistorico((listaAtual) =>
        listaAtual.filter(
          (item) => item.id_solicitacao !== id
        )
      );

      setSolicitacaoSelecionada(null);

      alert("Solicitação excluída com sucesso!");
    } catch (erro) {
      console.error("Erro ao excluir solicitação:", erro);
      alert(erro.message || "Erro ao excluir a solicitação.");
    }
  }

  // ==========================================
  // EXPORTAR RELATÓRIO PDF
  // ==========================================

  function exportarRelatorio() {
    if (historicoFiltrado.length === 0) {
      alert("Não há registros no histórico para exportar.");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const azul = [8, 45, 86];
      const larguraPagina = doc.internal.pageSize.getWidth();

      const dataEmissao = new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      }).format(new Date());

      const contarStatus = (statusDesejado) =>
        historicoFiltrado.filter(
          (item) =>
            formatarStatus(item.status).texto === statusDesejado,
        ).length;

      // CABEÇALHO
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(...azul);
      doc.text("AndraRecursos", 14, 17);

      doc.setFontSize(14);
      doc.text(
        "Relatório do Histórico de Solicitações",
        14,
        26,
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(90, 100, 115);

      doc.text(`Data de emissão: ${dataEmissao}`, 14, 33);

      doc.text(
        `Registros exportados: ${historicoFiltrado.length}`,
        14,
        39,
      );

      // RESUMO
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...azul);
      doc.text("Resumo do histórico", 14, 49);

      autoTable(doc, {
        startY: 53,
        head: [
          [
            "Total",
            "Aprovadas",
            "Recusadas",
            "Pendentes",
            "Em andamento",
            "Concluídas",
          ],
        ],
        body: [
          [
            historicoFiltrado.length,
            contarStatus("APROVADA"),
            contarStatus("RECUSADA"),
            contarStatus("PENDENTE"),
            contarStatus("EM ANDAMENTO"),
            contarStatus("CONCLUÍDA"),
          ],
        ],
        theme: "grid",
        headStyles: {
          fillColor: azul,
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: 3,
          halign: "center",
        },
      });

      // FILTROS APLICADOS
      const filtros = [];

      if (pesquisa.trim()) {
        filtros.push(`Pesquisa: ${pesquisa.trim()}`);
      }

      if (filtroStatus !== "todos") {
        filtros.push(`Status: ${filtroStatus}`);
      }

      const inicioFiltros = doc.lastAutoTable.finalY + 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...azul);
      doc.text("Filtros utilizados", 14, inicioFiltros);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(70, 80, 95);

      const textoFiltros = filtros.length
        ? filtros.join(" | ")
        : "Nenhum filtro específico aplicado.";

      const linhasFiltros = doc.splitTextToSize(
        textoFiltros,
        larguraPagina - 28,
      );

      doc.text(linhasFiltros, 14, inicioFiltros + 6);

      const inicioTabela =
        inicioFiltros + 10 + linhasFiltros.length * 4;

      // TABELA DOS REGISTROS FILTRADOS
      autoTable(doc, {
        startY: inicioTabela,
        head: [
          [
            "ID Histórico",
            "ID Solicitação",
            "Solicitação",
            "Status",
            "Prioridade",
            "Descrição",
            "Data",
          ],
        ],
        body: historicoFiltrado.map((item) => [
          item.id_historico ?? "—",
          item.id_solicitacao ?? "—",
          item.titulo_solicitacao ||
            `Solicitação #${item.id_solicitacao ?? "—"}`,
          formatarStatus(item.status).texto,
          item.prioridade || "Não informada",
          item.descricao || "Sem descrição",
          formatarData(item.data_alteracao),
        ]),
        theme: "striped",
        headStyles: {
          fillColor: azul,
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [245, 248, 252],
        },
        styles: {
          font: "helvetica",
          fontSize: 7,
          cellPadding: 2.5,
          overflow: "linebreak",
          valign: "middle",
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 23 },
          2: { cellWidth: 43 },
          3: { cellWidth: 27 },
          4: { cellWidth: 25 },
          5: { cellWidth: "auto" },
          6: { cellWidth: 25 },
        },
        margin: {
          top: 15,
          right: 10,
          bottom: 18,
          left: 10,
        },
        showHead: "everyPage",
        didDrawPage: () => {
          const numeroPagina = doc.internal.getNumberOfPages();
          const altura = doc.internal.pageSize.getHeight();
          const largura = doc.internal.pageSize.getWidth();

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(120, 130, 145);

          doc.text(
            "AndraRecursos - Área da Instituição",
            10,
            altura - 8,
          );

          doc.text(
            `Página ${numeroPagina}`,
            largura - 10,
            altura - 8,
            { align: "right" },
          );
        },
      });

      const dataArquivo = new Date()
        .toLocaleDateString("pt-BR")
        .replace(/\//g, "-");

      doc.save(`Historico_Instituicao_${dataArquivo}.pdf`);
    } catch (error) {
      console.error("Erro ao exportar histórico em PDF:", error);
      alert("Não foi possível gerar o relatório PDF.");
    }
  }

  // ==========================================
  // INTERFACE
  // ==========================================

  return (
    <div className="min-w-0">
      {/* CABEÇALHO */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#082d56]">
            Histórico
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Histórico de alterações das suas solicitações
          </p>
        </div>

        <button
          type="button"
          onClick={exportarRelatorio}
          disabled={carregando || historicoFiltrado.length === 0}
          className="flex items-center gap-2 rounded-md bg-[#082d56] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#164675] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FiDownload size={17} />
          Exportar Relatório
        </button>
      </div>

      {/* INDICADORES */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">
                Registros no histórico
              </p>

              <p className="mt-2 text-2xl font-bold text-[#082d56]">
                {totalRegistros}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[#082d56]">
              <FiFileText size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">
                Registros aprovados
              </p>

              <p className="mt-2 text-2xl font-bold text-green-700">
                {totalAprovados}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-50 text-green-600">
              <FiClipboard size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">
                Pendentes / em andamento
              </p>

              <p className="mt-2 text-2xl font-bold text-amber-600">
                {totalPendentes}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <FiClock size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* PAINEL PRINCIPAL */}
      <section className="min-h-[480px] rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        {/* FILTROS */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <FiSearch
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="search"
              value={pesquisa}
              onChange={(e) => mudarPesquisa(e.target.value)}
              placeholder="Pesquisar solicitação..."
              aria-label="Pesquisar no histórico"
              className="w-full rounded-lg border border-gray-200 bg-[#f7f7f7] py-3 pl-10 pr-4 text-sm outline-none focus:border-[#082d56] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <select
            value={filtroStatus}
            onChange={(e) => mudarStatus(e.target.value)}
            aria-label="Filtrar por status"
            className="rounded-lg border border-gray-200 bg-[#f7f7f7] px-4 py-3 text-sm text-[#082d56] outline-none focus:border-[#082d56]"
          >
            <option value="todos">Todos os status</option>
            <option value="APROVADA">Aprovadas</option>
            <option value="RECUSADA">Recusadas</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="EM ANDAMENTO">Em andamento</option>
            <option value="CONCLUÍDA">Concluídas</option>
          </select>

          <button
            type="button"
            onClick={() => setAtualizar((valor) => valor + 1)}
            disabled={carregando}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm text-[#082d56] transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiRefreshCw
              size={16}
              className={carregando ? "animate-spin" : ""}
            />
            Atualizar
          </button>
        </div>

        {/* ERRO */}
        {erro && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <FiAlertCircle size={19} className="shrink-0" />

            <div className="flex-1">
              <p>{erro}</p>

              <button
                type="button"
                onClick={() => setAtualizar((valor) => valor + 1)}
                className="mt-2 font-semibold underline"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* CARREGAMENTO */}
        {carregando && (
          <div className="flex min-h-52 items-center justify-center gap-3 text-[#082d56]">
            <FiRefreshCw className="animate-spin" />
            Carregando históricos...
          </div>
        )}

        {/* REGISTROS */}
        {!carregando && !erro && (
          <>
            <div className="space-y-3">
              {itensPagina.map((item, indice) => {
                const status = formatarStatus(item.status);

                return (
                  <article
                    key={
                      item.id_historico ??
                      `${item.id_solicitacao}-${indice}`
                    }
                    className="grid grid-cols-1 items-center gap-3 rounded-lg border border-[#dddddd] bg-[#f1f1f1] px-5 py-4 shadow-[0_2px_2px_rgba(0,0,0,0.15)] transition duration-200 hover:-translate-y-0.5 hover:shadow-md md:grid-cols-[minmax(0,2fr)_145px_115px_130px]"
                  >
                    {/* SOLICITAÇÃO */}
                    <div className="min-w-0">
                      <h3 className="break-words text-sm font-bold text-[#082d56]">
                        {item.titulo_solicitacao ||
                          `Solicitação #${item.id_solicitacao ?? "—"}`}
                      </h3>

                      <p className="mt-1 text-xs text-gray-600">
                        Solicitação #{item.id_solicitacao ?? "—"}
                      </p>
                    </div>

                    {/* STATUS */}
                    <div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-bold ${status.estilo}`}
                      >
                        {status.texto}
                      </span>
                    </div>

                    {/* DATA */}
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <FiCalendar size={14} className="shrink-0" />
                      <span>{formatarData(item.data_alteracao)}</span>
                    </div>

                    {/* DETALHES */}
                    <button
                      type="button"
                      onClick={() => setSolicitacaoSelecionada(item)}
                      className="flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-[#082d56] transition hover:text-blue-600 hover:underline"
                    >
                      <FiEye size={16} />
                      Ver Solicitação
                    </button>
                  </article>
                );
              })}

              {/* ESTADO VAZIO */}
              {itensPagina.length === 0 && (
                <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
                  <FiFileText size={38} className="text-gray-300" />

                  <p className="text-sm text-gray-500">
                    {pesquisa || filtroStatus !== "todos"
                      ? "Nenhum histórico encontrado para os filtros aplicados."
                      : "Nenhum histórico disponível."}
                  </p>

                  {(pesquisa || filtroStatus !== "todos") && (
                    <button
                      type="button"
                      onClick={() => {
                        setPesquisa("");
                        setFiltroStatus("todos");
                        setPagina(1);
                      }}
                      className="text-sm font-semibold text-[#082d56] hover:underline"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* PAGINAÇÃO */}
            {historicoFiltrado.length > 0 && (
              <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-5 sm:flex-row">
                <p className="text-xs text-gray-500">
                  Exibindo{" "}
                  {(paginaAtual - 1) * LIMITE_PAGINA + 1} a{" "}
                  {Math.min(
                    paginaAtual * LIMITE_PAGINA,
                    historicoFiltrado.length,
                  )}{" "}
                  de {historicoFiltrado.length} registros
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Página anterior"
                    disabled={paginaAtual === 1}
                    onClick={() =>
                      setPagina((atual) => Math.max(1, atual - 1))
                    }
                    className="rounded-lg border border-gray-200 p-2 text-[#082d56] transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
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
                      setPagina((atual) =>
                        Math.min(totalPaginas, atual + 1),
                      )
                    }
                    className="rounded-lg border border-gray-200 p-2 text-[#082d56] transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FiChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* MODAL DE DETALHES */}
      {solicitacaoSelecionada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#07182b]/65 p-4 backdrop-blur-[3px]"
          onClick={() => setSolicitacaoSelecionada(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-detalhes"
            onClick={(e) => e.stopPropagation()}
            className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* CABEÇALHO DO MODAL */}
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-[#f7f9fc] px-6 py-5">
              <div className="min-w-0">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#47719e]">
                  Detalhes da Solicitação
                </p>

                <h2
                  id="titulo-detalhes"
                  className="break-words text-xl font-bold text-[#082d56]"
                >
                  {solicitacaoSelecionada.titulo_solicitacao ||
                    `Solicitação #${solicitacaoSelecionada.id_solicitacao ?? "—"}`}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Solicitação #
                  {solicitacaoSelecionada.id_solicitacao ?? "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSolicitacaoSelecionada(null)}
                aria-label="Fechar detalhes"
                className="shrink-0 rounded-full p-2 text-gray-500 transition hover:bg-gray-200"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* INFORMAÇÕES */}
            <div className="space-y-5 px-6 py-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* ID */}
                <div className="flex items-start gap-3">
                  <span className="rounded-lg bg-blue-50 p-2.5 text-[#082d56]">
                    <FiClipboard size={17} />
                  </span>

                  <div>
                    <p className="mb-1 text-xs text-gray-500">
                      ID do histórico
                    </p>

                    <p className="text-sm font-semibold text-[#082d56]">
                      {solicitacaoSelecionada.id_historico ?? "—"}
                    </p>
                  </div>
                </div>

                {/* STATUS */}
                <div className="flex items-start gap-3">
                  <span className="rounded-lg bg-blue-50 p-2.5 text-[#082d56]">
                    <FiClipboard size={17} />
                  </span>

                  <div>
                    <p className="mb-1 text-xs text-gray-500">
                      Status registrado
                    </p>

                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${
                        formatarStatus(
                          solicitacaoSelecionada.status,
                        ).estilo
                      }`}
                    >
                      {
                        formatarStatus(
                          solicitacaoSelecionada.status,
                        ).texto
                      }
                    </span>
                  </div>
                </div>

                {/* PRIORIDADE */}
                <div className="flex items-start gap-3">
                  <span className="rounded-lg bg-blue-50 p-2.5 text-[#082d56]">
                    <FiFlag size={17} />
                  </span>

                  <div>
                    <p className="mb-1 text-xs text-gray-500">
                      Prioridade
                    </p>

                    <p className="text-sm font-semibold capitalize text-[#082d56]">
                      {solicitacaoSelecionada.prioridade ||
                        "Não informada"}
                    </p>
                  </div>
                </div>

                {/* DATA */}
                <div className="flex items-start gap-3">
                  <span className="rounded-lg bg-blue-50 p-2.5 text-[#082d56]">
                    <FiClock size={17} />
                  </span>

                  <div>
                    <p className="mb-1 text-xs text-gray-500">
                      Data da alteração
                    </p>

                    <p className="text-sm font-semibold text-[#082d56]">
                      {formatarData(
                        solicitacaoSelecionada.data_alteracao,
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* DESCRIÇÃO */}
              <div className="rounded-xl border border-[#e6edf5] bg-[#f7f9fc] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <FiFileText
                    size={16}
                    className="text-[#47719e]"
                  />

                  <p className="text-xs font-semibold text-[#47719e]">
                    Descrição da movimentação
                  </p>
                </div>

                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">
                  {solicitacaoSelecionada.descricao ||
                    "Nenhuma descrição registrada."}
                </p>
              </div>
            </div>


            {/* CABEÇALHO DE BOTÕES */}
            {/* BOTÃO FECHAR  */}
            <div className="border-t border-gray-100 bg-[#fcfcfd] px-6 py-5">
              <button
                type="button"
                onClick={() => setSolicitacaoSelecionada(null)}
                className="w-full rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Fechar
              </button>

              {/* EXCLUIR SOLICITAÇÃO CASO DESEJADO - - - BOTÃO EXCLUIR */}
              <button 
              type="button"
              onClick={() => excluirSolicitacao(solicitacaoSelecionada)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            > Excluir 
            </button>
            </div>

            

            



          </section>
        </div>
      )}
    </div>
  );
}

