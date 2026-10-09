import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  FiFileText,
  FiFile,
  FiDownload,
  FiRefreshCw,
  FiCalendar,
  FiFilter,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiXCircle,
  FiHome,
  FiClipboard,
  FiBell,
  FiSettings,
  FiLogOut,
} from "react-icons/fi";
import { enderecoServidor } from "../utils";

// =============================================
// CONFIGURAÇÕES
// =============================================

const ENDPOINT_RELATORIOS = "/historico-instituicao";
const CHAVE_RELATORIOS = "@AndraRecursos:relatorios";

const STATUS_PADRAO = [
  "pendente",
  "em andamento",
  "concluida",
  "concluída",
  "aprovada",
  "recusada",
  "cancelada",
];

const STATUS_LABELS = {
  pendente: "Pendente",
  "em andamento": "Em andamento",
  concluida: "Concluída",
  concluída: "Concluída",
  aprovada: "Aprovada",
  recusada: "Recusada",
  cancelada: "Cancelada",
};

// =============================================
// FUNÇÕES AUXILIARES
// =============================================

function obterToken() {
  const valor = localStorage.getItem("@AndraRecursos:usuario");

  if (!valor) return null;

  try {
    const usuario = JSON.parse(valor);

    if (typeof usuario === "string") {
      return usuario;
    }

    return (
      usuario?.token || usuario?.accessToken || usuario?.access_token || null
    );
  } catch {
    return valor;
  }
}

function obterUrl(endpoint) {
  return `${enderecoServidor.replace(/\/+$/, "")}${endpoint}`;
}

function normalizarTexto(valor) {
  return String(valor ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function obterDataRegistro(item) {
  return (
    item?.data_pedido ||
    item?.data_solicitacao ||
    item?.data_criacao ||
    item?.data_alteracao ||
    item?.data_hora ||
    item?.created_at ||
    item?.data ||
    null
  );
}

function converterData(valor) {
  if (!valor) return null;

  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor;
  }

  const texto = String(valor).trim();

  const brasileira = texto.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (brasileira) {
    const [, dia, mes, ano, hora = "00", minuto = "00", segundo = "00"] =
      brasileira;

    const data = new Date(
      Number(ano),
      Number(mes) - 1,
      Number(dia),
      Number(hora),
      Number(minuto),
      Number(segundo),
    );

    return Number.isNaN(data.getTime()) ? null : data;
  }

  const data = new Date(texto);

  return Number.isNaN(data.getTime()) ? null : data;
}

function formatarData(valor) {
  const data = converterData(valor);

  if (!data) return "Não informada";

  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function obterStatus(item) {
  return (
    item?.status ??
    item?.status_atual ??
    item?.status_novo ??
    item?.situacao ??
    ""
  );
}

function obterTipo(item) {
  return (
    item?.tipo_solicitacao ??
    item?.tipo ??
    item?.setor ??
    item?.categoria ??
    item?.nome_categoria ??
    "Não informado"
  );
}

function obterTitulo(item) {
  return (
    item?.titulo ??
    item?.assunto ??
    item?.nome_solicitacao ??
    item?.descricao ??
    "Solicitação sem título"
  );
}

function obterDescricao(item) {
  return (
    item?.descricao ?? item?.observacao ?? item?.detalhes ?? "Não informada"
  );
}

function obterIdentificador(item) {
  return item?.id_solicitacoes ?? item?.id_solicitacao ?? item?.id ?? "-";
}

function obterPrioridade(item) {
  return item?.prioridade ?? "Não informada";
}

function obterNomeInstituicao(item, nomeInstituicao) {
  return (
    item?.nome_instituicao ||
    item?.instituicao_nome ||
    nomeInstituicao ||
    "Instituição"
  );
}

function carregarRelatoriosSalvos() {
  try {
    const valor = localStorage.getItem(CHAVE_RELATORIOS);
    const dados = valor ? JSON.parse(valor) : [];

    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

// =============================================
// COMPONENTE
// =============================================

export default function RelatoriosInst() {
  const navigate = useNavigate();

  const [dados, setDados] = useState([]);
  const [nomeInstituicao, setNomeInstituicao] = useState("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [statusSelecionados, setStatusSelecionados] = useState(null);
  const [tiposSelecionados, setTiposSelecionados] = useState(null);
  const [formato, setFormato] = useState("PDF");
  const [relatoriosSalvos, setRelatoriosSalvos] = useState(
    carregarRelatoriosSalvos,
  );
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  function sair() {
    localStorage.removeItem("@AndraRecursos:token");
    localStorage.removeItem("@AndraRecursos:usuario");
    localStorage.removeItem("@AndraRecursos:lembrar");

    navigate("/");
  }

  // =============================================
  // BUSCAR DADOS DA API
  // =============================================

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro("");
    setMensagem("");

    try {
      const token = obterToken();

      if (!token) {
        throw new Error(
          "Token de acesso não encontrado. Faça login novamente.",
        );
      }

      const cabecalhos = {
        Authorization: `Bearer ${token}`,
      };

      const [respostaRelatorios, respostaInstituicao] = await Promise.all([
        fetch(obterUrl(ENDPOINT_RELATORIOS), {
          headers: cabecalhos,
        }),
        fetch(obterUrl("/instituicoes/me"), {
          headers: cabecalhos,
        }),
      ]);

      const resultadoRelatorios = await respostaRelatorios.json();

      if (!respostaRelatorios.ok) {
        throw new Error(
          resultadoRelatorios?.message ||
            resultadoRelatorios?.error ||
            "Não foi possível carregar os dados dos relatórios.",
        );
      }

      const registros = Array.isArray(resultadoRelatorios)
        ? resultadoRelatorios
        : (resultadoRelatorios?.solicitacoes ??
          resultadoRelatorios?.historico ??
          resultadoRelatorios?.dados ??
          resultadoRelatorios?.registros);

      if (!Array.isArray(registros)) {
        throw new Error("A API não retornou uma lista de registros válida.");
      }

      setDados(registros);

      if (respostaInstituicao.ok) {
        const instituicao = await respostaInstituicao.json();

        setNomeInstituicao(
          instituicao?.nome || instituicao?.instituicao?.nome || "",
        );
      }
    } catch (error) {
      setErro(error.message || "Erro ao carregar os dados.");
      setDados([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // =============================================
  // OPÇÕES DOS FILTROS
  // =============================================

  const opcoesStatus = useMemo(() => {
    const encontrados = dados
      .map((item) => String(obterStatus(item)).trim())
      .filter(Boolean);

    return [...new Set([...STATUS_PADRAO, ...encontrados])]
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .filter(
        (status, indice, lista) =>
          lista.findIndex(
            (item) => normalizarTexto(item) === normalizarTexto(status),
          ) === indice,
      );
  }, [dados]);

  const opcoesTipos = useMemo(() => {
    const encontrados = dados
      .map((item) => String(obterTipo(item)).trim())
      .filter((tipo) => tipo && normalizarTexto(tipo) !== "não informado");

    return [...new Set(encontrados)].sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  }, [dados]);

  // =============================================
  // APLICAR TODOS OS FILTROS
  // =============================================

  const registrosFiltrados = useMemo(() => {
    const inicio = dataInicial ? new Date(`${dataInicial}T00:00:00`) : null;
    const fim = dataFinal ? new Date(`${dataFinal}T23:59:59.999`) : null;

    return dados.filter((item) => {
      const valorData = obterDataRegistro(item);
      const dataRegistro = converterData(valorData);

      if (inicio && (!dataRegistro || dataRegistro < inicio)) return false;
      if (fim && (!dataRegistro || dataRegistro > fim)) return false;

      if (
        statusSelecionados !== null &&
        !statusSelecionados.some(
          (status) =>
            normalizarTexto(status) === normalizarTexto(obterStatus(item)),
        )
      ) {
        return false;
      }

      if (
        tiposSelecionados !== null &&
        !tiposSelecionados.some(
          (tipo) => normalizarTexto(tipo) === normalizarTexto(obterTipo(item)),
        )
      ) {
        return false;
      }

      return true;
    });
  }, [dados, dataInicial, dataFinal, statusSelecionados, tiposSelecionados]);

  function alternarFiltro(valor, selecionados, atualizar, opcoes) {
    if (selecionados === null) {
      atualizar(opcoes.filter((item) => item !== valor));
      return;
    }

    const jaSelecionado = selecionados.includes(valor);

    const novosSelecionados = jaSelecionado
      ? selecionados.filter((item) => item !== valor)
      : [...selecionados, valor];

    atualizar(novosSelecionados);
  }

  function limparFiltros() {
    setDataInicial("");
    setDataFinal("");
    setStatusSelecionados(null);
    setTiposSelecionados(null);
    setMensagem("");
    setErro("");
  }

  // =============================================
  // DADOS EXPORTADOS
  // =============================================

  function obterLinhasExportacao(registros) {
    return registros.map((item) => ({
      "Nº da solicitação": obterIdentificador(item),
      Título: obterTitulo(item),
      Descrição: obterDescricao(item),
      "Tipo / Setor": obterTipo(item),
      Status: obterStatus(item) || "Não informado",
      Prioridade: obterPrioridade(item),
      "Data da solicitação": formatarData(obterDataRegistro(item)),
      Instituição: obterNomeInstituicao(item, nomeInstituicao),
    }));
  }

  // =============================================
  // GERAR PDF
  // =============================================

  function gerarPDF(registros) {
    const documento = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    documento.setFontSize(18);
    documento.text("Relatório de Solicitações", 14, 16);

    documento.setFontSize(10);
    documento.text(
      `Instituição: ${nomeInstituicao || "Instituição logada"}`,
      14,
      24,
    );

    documento.text(
      `Período: ${dataInicial || "Início"} até ${dataFinal || "Hoje"}`,
      14,
      30,
    );

    documento.text(`Registros encontrados: ${registros.length}`, 14, 36);

    const linhas = registros.map((item) => [
      String(obterIdentificador(item)),
      obterTitulo(item),
      obterTipo(item),
      obterStatus(item) || "Não informado",
      obterPrioridade(item),
      formatarData(obterDataRegistro(item)),
    ]);

    autoTable(documento, {
      startY: 42,
      head: [["ID", "Título", "Tipo / Setor", "Status", "Prioridade", "Data"]],
      body: linhas,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [11, 49, 100],
      },
      margin: {
        left: 14,
        right: 14,
      },
    });

    documento.save(
      `relatorio_solicitacoes_${new Date().toISOString().slice(0, 10)}.pdf`,
    );
  }

  // =============================================
  // GERAR EXCEL
  // =============================================

  function gerarExcel(registros) {
    const linhas = obterLinhasExportacao(registros);
    const planilha = XLSX.utils.json_to_sheet(linhas);

    planilha["!cols"] = [
      { wch: 18 },
      { wch: 30 },
      { wch: 45 },
      { wch: 20 },
      { wch: 20 },
      { wch: 18 },
      { wch: 22 },
      { wch: 30 },
    ];

    const livro = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(livro, planilha, "Relatório");

    XLSX.writeFile(
      livro,
      `relatorio_solicitacoes_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  }

  // =============================================
  // GERAR CSV
  // =============================================

  function gerarCSV(registros) {
    const linhas = obterLinhasExportacao(registros);
    const planilha = XLSX.utils.json_to_sheet(linhas);

    const conteudo = XLSX.utils.sheet_to_csv(planilha, {
      FS: ";",
    });

    const arquivo = new Blob(["\uFEFF", conteudo], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");

    link.href = url;
    link.download = `relatorio_solicitacoes_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  // =============================================
  // GERAR RELATÓRIO
  // =============================================

  async function gerarRelatorio() {
    setErro("");
    setMensagem("");

    if (dataInicial && dataFinal && dataInicial > dataFinal) {
      setErro("A data inicial não pode ser posterior à data final.");
      return;
    }

    setGerando(true);

    try {
      const token = obterToken();

      if (!token) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      const resposta = await fetch(obterUrl(ENDPOINT_RELATORIOS), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado?.message ||
            resultado?.error ||
            "Não foi possível atualizar os registros.",
        );
      }

      const registrosAtuais = Array.isArray(resultado)
        ? resultado
        : (resultado?.solicitacoes ??
          resultado?.historico ??
          resultado?.dados ??
          resultado?.registros);

      if (!Array.isArray(registrosAtuais)) {
        throw new Error("A API não retornou uma lista válida de registros.");
      }

      setDados(registrosAtuais);

      const inicio = dataInicial ? new Date(`${dataInicial}T00:00:00`) : null;
      const fim = dataFinal ? new Date(`${dataFinal}T23:59:59.999`) : null;

      const filtrados = registrosAtuais.filter((item) => {
        const data = converterData(obterDataRegistro(item));

        if (inicio && (!data || data < inicio)) return false;
        if (fim && (!data || data > fim)) return false;

        if (
          statusSelecionados !== null &&
          !statusSelecionados.some(
            (status) =>
              normalizarTexto(status) === normalizarTexto(obterStatus(item)),
          )
        ) {
          return false;
        }

        if (
          tiposSelecionados !== null &&
          !tiposSelecionados.some(
            (tipo) =>
              normalizarTexto(tipo) === normalizarTexto(obterTipo(item)),
          )
        ) {
          return false;
        }

        return true;
      });

      if (filtrados.length === 0) {
        setMensagem("Nenhum registro corresponde aos filtros selecionados.");
        return;
      }

      if (formato === "PDF") {
        gerarPDF(filtrados);
      } else if (formato === "EXCEL") {
        gerarExcel(filtrados);
      } else {
        gerarCSV(filtrados);
      }

      const relatorio = {
        id: `${Date.now()}`,
        nome: `Relatório ${new Date().toLocaleString("pt-BR")}`,
        formato,
        criadoEm: new Date().toISOString(),
        filtros: {
          dataInicial,
          dataFinal,
          status: statusSelecionados,
          tipos: tiposSelecionados,
        },
        quantidade: filtrados.length,
      };

      const atualizados = [relatorio, ...carregarRelatoriosSalvos()].slice(
        0,
        10,
      );

      localStorage.setItem(CHAVE_RELATORIOS, JSON.stringify(atualizados));

      setRelatoriosSalvos(atualizados);
      setMensagem(`Relatório gerado com ${filtrados.length} registro(s).`);
    } catch (error) {
      setErro(error.message || "Erro ao gerar o relatório.");
    } finally {
      setGerando(false);
    }
  }

  // =============================================
  // BAIXAR NOVAMENTE UM RELATÓRIO SALVO
  // =============================================

  async function baixarNovamente(relatorio) {
    setErro("");
    setMensagem("");
    setGerando(true);

    try {
      const token = obterToken();

      if (!token) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      const resposta = await fetch(obterUrl(ENDPOINT_RELATORIOS), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado?.message || "Não foi possível recuperar os registros.",
        );
      }

      const registros = Array.isArray(resultado)
        ? resultado
        : (resultado?.solicitacoes ??
          resultado?.historico ??
          resultado?.dados ??
          resultado?.registros);

      if (!Array.isArray(registros)) {
        throw new Error("A API não retornou uma lista válida.");
      }

      const filtros = relatorio.filtros || {};
      const inicio = filtros.dataInicial
        ? new Date(`${filtros.dataInicial}T00:00:00`)
        : null;
      const fim = filtros.dataFinal
        ? new Date(`${filtros.dataFinal}T23:59:59.999`)
        : null;

      const filtrados = registros.filter((item) => {
        const data = converterData(obterDataRegistro(item));

        if (inicio && (!data || data < inicio)) return false;
        if (fim && (!data || data > fim)) return false;

        if (
          filtros.status !== null &&
          filtros.status !== undefined &&
          !filtros.status.some(
            (status) =>
              normalizarTexto(status) === normalizarTexto(obterStatus(item)),
          )
        ) {
          return false;
        }

        if (
          filtros.tipos !== null &&
          filtros.tipos !== undefined &&
          !filtros.tipos.some(
            (tipo) =>
              normalizarTexto(tipo) === normalizarTexto(obterTipo(item)),
          )
        ) {
          return false;
        }

        return true;
      });

      if (filtrados.length === 0) {
        setMensagem("Nenhum registro corresponde aos filtros desse relatório.");
        return;
      }

      if (relatorio.formato === "PDF") {
        gerarPDF(filtrados);
      } else if (relatorio.formato === "EXCEL") {
        gerarExcel(filtrados);
      } else {
        gerarCSV(filtrados);
      }

      setMensagem("Relatório baixado novamente.");
    } catch (error) {
      setErro(error.message || "Erro ao baixar o relatório.");
    } finally {
      setGerando(false);
    }
  }

  function excluirRelatorioSalvo(id) {
    const atualizados = relatoriosSalvos.filter(
      (relatorio) => relatorio.id !== id,
    );

    localStorage.setItem(CHAVE_RELATORIOS, JSON.stringify(atualizados));

    setRelatoriosSalvos(atualizados);
  }

  // =============================================
  // INTERFACE
  // =============================================

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* MENU LATERAL */}
      <aside className="flex w-64 shrink-0 flex-col bg-[#0b3164] text-white">
        <div className="border-b border-white/10 px-6 py-6">
          <h2 className="text-xl font-bold">AndraRecursos</h2>
          <p className="mt-1 text-sm text-blue-200">Área institucional</p>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          <button
            type="button"
            onClick={() => navigate("/principal-inst")}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-blue-100 transition hover:bg-white/10"
          >
            <FiHome size={19} />
            <span>Principal</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/solicitacoes-inst")}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-blue-100 transition hover:bg-white/10"
          >
            <FiClipboard size={19} />
            <span>Solicitações</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/historico-inst")}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-blue-100 transition hover:bg-white/10"
          >
            <FiClock size={19} />
            <span>Histórico Solicitações</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/notificacoes-inst")}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-blue-100 transition hover:bg-white/10"
          >
            <FiBell size={19} />
            <span>Notificações</span>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg bg-white/15 px-4 py-3 font-semibold text-white"
          >
            <FiFileText size={19} />
            <span>Relatórios</span>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-blue-100 transition hover:bg-white/10"
          >
            <FiSettings size={19} />
            <span>Configurações</span>
          </button>
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            onClick={sair}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-blue-100 transition hover:bg-red-500/20 hover:text-white"
          >
            <FiLogOut size={19} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* CONTEÚDO DOS RELATÓRIOS */}
      <main className="min-w-0 flex-1 bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                Área institucional
              </p>

              <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                Relatórios
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                {nomeInstituicao || "Consulte e exporte suas solicitações."}
              </p>
            </div>

            <button
              type="button"
              onClick={carregarDados}
              disabled={carregando || gerando}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiRefreshCw className={carregando ? "animate-spin" : ""} />
              Atualizar dados
            </button>
          </header>

          {erro && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <FiAlertCircle className="mt-0.5 shrink-0" size={19} />
              <p>{erro}</p>
            </div>
          )}

          {mensagem && (
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <FiCheckCircle className="mt-0.5 shrink-0" size={19} />
              <p>{mensagem}</p>
            </div>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-3 text-blue-800">
                <FiFilter size={21} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  Configurar relatório
                </h2>
                <p className="text-sm text-slate-500">
                  Selecione os critérios que deseja incluir no arquivo.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <FiCalendar />
                  Data inicial
                </span>

                <input
                  type="date"
                  value={dataInicial}
                  onChange={(e) => setDataInicial(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <FiCalendar />
                  Data final
                </span>

                <input
                  type="date"
                  value={dataFinal}
                  min={dataInicial || undefined}
                  onChange={(e) => setDataFinal(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <fieldset>
                <legend className="mb-3 text-sm font-semibold text-slate-700">
                  Status
                </legend>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {opcoesStatus.map((item) => (
                    <label
                      key={item}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={
                          statusSelecionados === null ||
                          statusSelecionados.includes(item)
                        }
                        onChange={() =>
                          alternarFiltro(
                            item,
                            statusSelecionados,
                            setStatusSelecionados,
                            opcoesStatus,
                          )
                        }
                        className="h-4 w-4 accent-blue-800"
                      />

                      <span>
                        {STATUS_LABELS[normalizarTexto(item)] || item}
                      </span>
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setStatusSelecionados(null)}
                  className="mt-2 text-xs font-semibold text-blue-800 hover:underline"
                >
                  Selecionar todos os status
                </button>
              </fieldset>

              <fieldset>
                <legend className="mb-3 text-sm font-semibold text-slate-700">
                  Tipo / setor
                </legend>

                {opcoesTipos.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                    Nenhum tipo disponível nos dados carregados.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {opcoesTipos.map((item) => (
                      <label
                        key={item}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700 transition hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={
                            tiposSelecionados === null ||
                            tiposSelecionados.includes(item)
                          }
                          onChange={() =>
                            alternarFiltro(
                              item,
                              tiposSelecionados,
                              setTiposSelecionados,
                              opcoesTipos,
                            )
                          }
                          className="h-4 w-4 accent-blue-800"
                        />

                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setTiposSelecionados(null)}
                  className="mt-2 text-xs font-semibold text-blue-800 hover:underline"
                >
                  Selecionar todos os tipos
                </button>
              </fieldset>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Formato do arquivo
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  {
                    valor: "PDF",
                    nome: "PDF",
                    descricao: "Documento para impressão",
                    icone: FiFileText,
                  },
                  {
                    valor: "EXCEL",
                    nome: "Excel",
                    descricao: "Planilha editável",
                    icone: FiFile,
                  },
                  {
                    valor: "CSV",
                    nome: "CSV",
                    descricao: "Dados separados por ponto e vírgula",
                    icone: FiDownload,
                  },
                ].map((item) => {
                  const Icone = item.icone;

                  return (
                    <button
                      key={item.valor}
                      type="button"
                      onClick={() => setFormato(item.valor)}
                      className={`flex items-center gap-3 rounded-lg border p-4 text-left transition ${
                        formato === item.valor
                          ? "border-blue-800 bg-blue-50 ring-1 ring-blue-800"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <Icone
                        size={22}
                        className={
                          formato === item.valor
                            ? "text-blue-800"
                            : "text-slate-500"
                        }
                      />

                      <span>
                        <span className="block text-sm font-semibold text-slate-800">
                          {item.nome}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {item.descricao}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={limparFiltros}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Limpar filtros
              </button>

              <button
                type="button"
                onClick={gerarRelatorio}
                disabled={carregando || gerando}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiDownload size={18} />
                {gerando ? "Gerando relatório..." : "Gerar relatório"}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-slate-900">
                  Prévia dos registros
                </h2>
                <p className="text-sm text-slate-500">
                  Os mesmos registros serão usados no arquivo exportado.
                </p>
              </div>

              <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-900">
                {carregando
                  ? "Carregando..."
                  : `${registrosFiltrados.length} registro(s)`}
              </span>
            </div>

            {carregando ? (
              <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500">
                <FiRefreshCw className="animate-spin" />
                Carregando solicitações...
              </div>
            ) : registrosFiltrados.length === 0 ? (
              <div className="py-12 text-center">
                <FiFileText size={32} className="mx-auto mb-3 text-slate-300" />
                <p className="font-semibold text-slate-700">
                  Nenhum registro encontrado
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Altere os filtros ou atualize os dados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Solicitação</th>
                      <th className="px-4 py-3">Tipo / setor</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Prioridade</th>
                      <th className="px-4 py-3">Data</th>
                    </tr>
                  </thead>

                  <tbody>
                    {registrosFiltrados.map((item, indice) => (
                      <tr
                        key={
                          obterIdentificador(item) === "-"
                            ? indice
                            : obterIdentificador(item)
                        }
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="max-w-xs px-4 py-3">
                          <p className="font-semibold text-slate-800">
                            {obterTitulo(item)}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                            {obterDescricao(item)}
                          </p>
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {obterTipo(item)}
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {STATUS_LABELS[
                              normalizarTexto(obterStatus(item))
                            ] ||
                              obterStatus(item) ||
                              "Não informado"}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {obterPrioridade(item)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {formatarData(obterDataRegistro(item))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-3 text-slate-700">
                <FiClock size={20} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  Relatórios recentes
                </h2>
                <p className="text-sm text-slate-500">
                  Histórico local dos últimos relatórios gerados.
                </p>
              </div>
            </div>

            {relatoriosSalvos.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Nenhum relatório foi gerado nesta sessão do navegador.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {relatoriosSalvos.map((relatorio) => (
                  <div
                    key={relatorio.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">
                        {relatorio.nome}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Formato: {relatorio.formato} · {relatorio.quantidade}{" "}
                        registro(s)
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => baixarNovamente(relatorio)}
                        disabled={gerando}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-blue-900 transition hover:bg-blue-50 disabled:opacity-50"
                      >
                        <FiDownload size={16} />
                        Baixar novamente
                      </button>

                      <button
                        type="button"
                        onClick={() => excluirRelatorioSalvo(relatorio.id)}
                        aria-label="Excluir registro do relatório"
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-700"
                      >
                        <FiXCircle size={17} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
