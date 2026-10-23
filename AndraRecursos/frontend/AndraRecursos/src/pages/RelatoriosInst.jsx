import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import {
  FiFileText,
  FiFile,
  FiDownload,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiXCircle,
  FiClipboard,
  FiCheck,
  FiTrash2,
  FiEye,
  FiChevronDown,
  FiFilePlus,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";

// =====================================================
// CONFIGURAÇÕES
// =====================================================

const ENDPOINT_RELATORIOS = "/historico-instituicao";
const CHAVE_RELATORIOS = "@AndraRecursos:relatorios";

const STATUS_PADRAO = [
  "pendente",
  "em andamento",
  "concluida",
  "aprovada",
  "recusada",
  "cancelada",
];

const STATUS_LABELS = {
  pendente: "Pendente",
  "em andamento": "Em andamento",
  concluida: "Concluída",
  aprovada: "Aprovada",
  recusada: "Recusada",
  cancelada: "Cancelada",
};

const TIPOS_SOLICITACAO = [
  "Alimentício",
  "Almoxarifado",
  "Outro",
  "Recursos Humanos",
  "TI",
  "Tecnologia",
];

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function obterToken() {
  return localStorage.getItem("@AndraRecursos:token");
}

function obterUrl(endpoint) {
  return `${String(enderecoServidor).replace(/\/+$/, "")}${endpoint}`;
}

// Normaliza acentos, espaços e letras maiúsculas/minúsculas.
// Ex.: "Concluída", "concluida" e " CONCLUÍDA " são equivalentes.
function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
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

  // Aceita DD/MM/AAAA e DD/MM/AAAA HH:mm:ss.
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

// =====================================================
// IDENTIFICAÇÃO DA SOLICITAÇÃO
// =====================================================

function obterSolicitacaoRelacionada(item) {
  const relacionada =
    item?.solicitacao ??
    item?.solicitação ??
    item?.solicitacao_relacionada ??
    item?.solicitacaoRelacionada ??
    item?.dados_solicitacao ??
    item?.dadosSolicitacao ??
    item?.pedido ??
    item?.requisicao ??
    null;

  if (relacionada && typeof relacionada === "object") {
    return relacionada;
  }

  return null;
}

// Corrigido para encontrar o tipo mesmo quando a API retorna
// o setor como "tipo_solicitacao" ou dentro da solicitação relacionada.
function obterTipo(item) {
  const solicitacao = obterSolicitacaoRelacionada(item);

  const candidatos = [
    item?.tipo_solicitacao,
    item?.setor,
    item?.tipo,
    item?.categoria?.nome,
    item?.categoria,
    item?.nome_categoria,
    solicitacao?.tipo_solicitacao,
    solicitacao?.setor,
    solicitacao?.tipo,
    solicitacao?.categoria?.nome,
  ];

  const tipo = candidatos.find((valor) => {
    if (typeof valor !== "string" || !valor.trim()) {
      return false;
    }

    return normalizarTexto(valor) !== "nao informado";
  });

  return tipo?.trim() || "Não informado";
}
function pareceEventoHistorico(valor) {
  return /status\s+(foi\s+)?alterad[oa]|alterou\s+o\s+status|mudou\s+o\s+status|solicita[cç][aã]o\s+(foi\s+)?(aprovada|recusada|cancelada)/i.test(
    normalizarTexto(valor),
  );
}

function obterTitulo(item) {
  const solicitacao = obterSolicitacaoRelacionada(item);

  const candidatos = [
    solicitacao?.titulo,
    solicitacao?.titulo_solicitacao,
    solicitacao?.assunto,
    solicitacao?.nome_solicitacao,
    solicitacao?.nome,
    solicitacao?.descricao_solicitacao,
    item?.titulo_solicitacao,
    item?.solicitacao_titulo,
    item?.assunto_solicitacao,
    item?.nome_solicitacao,
    item?.nomeSolicitacao,
    item?.solicitacao_nome,
    item?.solicitacaoNome,
    item?.titulo,
    item?.assunto,
    item?.nome,
    item?.nome_servico,
    item?.servico,
    item?.tipo_solicitacao,
    typeof item?.tipo === "object" ? item?.tipo?.nome : item?.tipo,
    typeof item?.categoria === "object"
      ? item?.categoria?.nome
      : item?.categoria,
  ];

  const titulo = candidatos.find(
    (valor) =>
      typeof valor === "string" &&
      valor.trim() !== "" &&
      !pareceEventoHistorico(valor),
  );

  if (titulo) return titulo.trim();

  const id =
    item?.id_solicitacoes ??
    item?.id_solicitacao ??
    item?.solicitacao_id ??
    item?.id_pedido ??
    null;

  return id != null ? `Solicitação #${id}` : "Nome da solicitação indisponível";
}

function obterDescricao(item) {
  const solicitacao = obterSolicitacaoRelacionada(item);

  const candidatos = [
    solicitacao?.descricao_solicitacao,
    solicitacao?.descricao,
    solicitacao?.descricao_pedido,
    solicitacao?.detalhes,
    solicitacao?.observacao,
    item?.descricao_solicitacao,
    item?.descricao_pedido,
    item?.detalhes_solicitacao,
    item?.observacao_solicitacao,
    item?.descricao,
    item?.detalhes,
    item?.observacao,
  ];

  const descricao = candidatos.find(
    (valor) =>
      typeof valor === "string" &&
      valor.trim() !== "" &&
      !pareceEventoHistorico(valor),
  );

  return descricao?.trim() || "Descrição não informada";
}

function obterIdentificador(item) {
  const solicitacao = obterSolicitacaoRelacionada(item);

  return (
    item?.id_solicitacoes ??
    item?.id_solicitacao ??
    solicitacao?.id_solicitacoes ??
    solicitacao?.id_solicitacao ??
    item?.solicitacao_id ??
    item?.id_pedido ??
    item?.id ??
    "-"
  );
}

function obterPrioridade(item) {
  const solicitacao = obterSolicitacaoRelacionada(item);

  return solicitacao?.prioridade ?? item?.prioridade ?? "Não informada";
}

function obterNomeInstituicao(item, nomeInstituicao) {
  return (
    item?.nome_instituicao ||
    item?.instituicao_nome ||
    nomeInstituicao ||
    "Instituição"
  );
}

function obterRegistrosResposta(resultado) {
  if (Array.isArray(resultado)) return resultado;

  const registros =
    resultado?.solicitacoes ??
    resultado?.historico ??
    resultado?.dados ??
    resultado?.registros;

  return Array.isArray(registros) ? registros : null;
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

function obterClasseStatus(status) {
  const valor = normalizarTexto(status);

  if (valor === "concluida" || valor === "aprovada") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (valor === "recusada" || valor === "cancelada") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (valor === "em andamento") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function obterStatusLabel(status) {
  return STATUS_LABELS[normalizarTexto(status)] || status || "Não informado";
}

// =====================================================
// COMPONENTE
// =====================================================

export default function RelatoriosInst() {
  const [dados, setDados] = useState([]);
  const [nomeInstituicao, setNomeInstituicao] = useState("");

  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");

  // null = todos selecionados; [] = nenhum selecionado.
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
  const [resumoRelatorio, setResumoRelatorio] = useState("");

  const [relatorioExpandido, setRelatorioExpandido] = useState(null);

  // =====================================================
  // CARREGAR DADOS
  // =====================================================

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

      const resultadoRelatorios = await respostaRelatorios
        .json()
        .catch(() => ({}));

      if (!respostaRelatorios.ok) {
        throw new Error(
          resultadoRelatorios?.message ||
            resultadoRelatorios?.error ||
            "Não foi possível carregar os dados dos relatórios.",
        );
      }

      const registros = obterRegistrosResposta(resultadoRelatorios);

      if (!registros) {
        throw new Error("A API não retornou uma lista de registros válida.");
      }

      setDados(registros);

      if (respostaInstituicao.ok) {
        const instituicao = await respostaInstituicao.json().catch(() => ({}));

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

  // =====================================================
  // OPÇÕES DOS FILTROS
  // =====================================================

  const opcoesStatus = useMemo(() => {
    const encontrados = dados
      .map((item) => String(obterStatus(item)).trim())
      .filter(Boolean);

    const todos = [...STATUS_PADRAO, ...encontrados];
    const unicos = new Map();

    todos.forEach((status) => {
      const chave = normalizarTexto(status);

      if (chave && !unicos.has(chave)) {
        unicos.set(chave, status);
      }
    });

    return [...unicos.values()].sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  }, [dados]);

  const opcoesTipos = useMemo(() => {
    const encontrados = dados
      .map((item) => String(obterTipo(item)).trim())
      .filter(
        (tipo) =>
          tipo && normalizarTexto(tipo) !== "nao informado",
      );

    const unicos = new Map();

    [...TIPOS_SOLICITACAO, ...encontrados].forEach((tipo) => {
      const chave = normalizarTexto(tipo);

      if (chave && !unicos.has(chave)) {
        unicos.set(chave, tipo);
      }
    });

    return [...unicos.values()].sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  }, [dados]);

  // =====================================================
  // APLICAR FILTROS
  // =====================================================

  const registrosFiltrados = useMemo(() => {
    const inicio = dataInicial
      ? new Date(`${dataInicial}T00:00:00`)
      : null;

    const fim = dataFinal
      ? new Date(`${dataFinal}T23:59:59.999`)
      : null;

    return dados.filter((item) => {
      const dataRegistro = converterData(obterDataRegistro(item));

      if (inicio && (!dataRegistro || dataRegistro < inicio)) {
        return false;
      }

      if (fim && (!dataRegistro || dataRegistro > fim)) {
        return false;
      }

      if (statusSelecionados !== null) {
        const statusAtual = normalizarTexto(obterStatus(item));

        if (
          !statusSelecionados.some(
            (status) => normalizarTexto(status) === statusAtual,
          )
        ) {
          return false;
        }
      }

      if (tiposSelecionados !== null) {
        const tipoAtual = normalizarTexto(obterTipo(item));

        if (
          !tiposSelecionados.some(
            (tipo) => normalizarTexto(tipo) === tipoAtual,
          )
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    dados,
    dataInicial,
    dataFinal,
    statusSelecionados,
    tiposSelecionados,
  ]);

  // Alterna a seleção respeitando os valores normalizados.
  function alternarFiltro(valor, selecionados, atualizar, opcoes) {
  const valorNormalizado = normalizarTexto(valor);

  if (selecionados === null) {
    atualizar(
      opcoes.filter(
        (item) => normalizarTexto(item) !== valorNormalizado,
      ),
    );
    return;
  }

  const jaSelecionado = selecionados.some(
    (item) => normalizarTexto(item) === valorNormalizado,
  );

  atualizar(
    jaSelecionado
      ? selecionados.filter(
          (item) => normalizarTexto(item) !== valorNormalizado,
        )
      : [...selecionados, valor],
  );
}

  function limparFiltros() {
    setDataInicial("");
    setDataFinal("");
    setStatusSelecionados(null);
    setTiposSelecionados(null);
    setMensagem("");
    setErro("");
  }

  // =====================================================
  // DADOS PARA EXPORTAÇÃO
  // =====================================================

  function obterLinhasExportacao(registros, resumo = "") {
    return registros.map((item) => ({
      "Nº da solicitação": obterIdentificador(item),
      "Título da solicitação": obterTitulo(item),
      "Descrição da solicitação": obterDescricao(item),
      "Tipo / Setor": obterTipo(item),
      Status: obterStatusLabel(obterStatus(item)),
      Prioridade: obterPrioridade(item),
      "Data da solicitação": formatarData(obterDataRegistro(item)),
      Instituição: obterNomeInstituicao(item, nomeInstituicao),
      "Resumo do relatório": resumo || "Nenhum resumo informado",
    }));
  }

  // =====================================================
  // GERAR PDF
  // =====================================================

  function gerarPDF(registros, resumo = "") {
    const documento = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    documento.setFont("helvetica", "bold");
    documento.setFontSize(18);
    documento.setTextColor(15, 39, 74);
    documento.text("Relatório de Solicitações", 14, 16);

    documento.setFont("helvetica", "normal");
    documento.setFontSize(10);
    documento.setTextColor(80, 90, 105);

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

    documento.setFont("helvetica", "bold");
    documento.setFontSize(10);
    documento.setTextColor(15, 39, 74);
    documento.text("Resumo do relatório:", 14, 43);

    documento.setFont("helvetica", "normal");
    documento.setFontSize(9);
    documento.setTextColor(71, 85, 105);

    const resumoTexto = documento.splitTextToSize(
      resumo.trim() || "Nenhum resumo informado.",
      265,
    );

    const resumoLimitado = resumoTexto.slice(0, 5);
    documento.text(resumoLimitado, 14, 48);

    const alturaResumo = Math.max(5, resumoLimitado.length * 4);
    const inicioTabela = 48 + alturaResumo + 4;

    const linhas = registros.map((item) => [
      String(obterIdentificador(item)),
      obterTitulo(item),
      obterDescricao(item),
      obterTipo(item),
      obterStatusLabel(obterStatus(item)),
      obterPrioridade(item),
      formatarData(obterDataRegistro(item)),
    ]);

    autoTable(documento, {
      startY: inicioTabela,
      head: [
        [
          "ID",
          "Solicitação",
          "Descrição",
          "Tipo / Setor",
          "Status",
          "Prioridade",
          "Data",
        ],
      ],
      body: linhas,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 7,
        cellPadding: 2,
        overflow: "linebreak",
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        valign: "middle",
      },
      headStyles: {
        fillColor: [15, 39, 74],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 36 },
        2: { cellWidth: 65 },
        3: { cellWidth: 32 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 28 },
      },
      margin: {
        left: 14,
        right: 14,
        bottom: 14,
      },
      didDrawPage: () => {
        const pagina = documento.internal.getNumberOfPages();

        documento.setFontSize(8);
        documento.setTextColor(120, 130, 145);

        documento.text(
          `Página ${pagina}`,
          documento.internal.pageSize.getWidth() - 25,
          documento.internal.pageSize.getHeight() - 7,
        );
      },
    });

    documento.save(
      `relatorio_solicitacoes_${new Date().toISOString().slice(0, 10)}.pdf`,
    );
  }

  // =====================================================
  // GERAR EXCEL
  // =====================================================

  function gerarExcel(registros, resumo = "") {
    const linhas = obterLinhasExportacao(registros, resumo);
    const planilha = XLSX.utils.json_to_sheet(linhas);

    planilha["!cols"] = [
      { wch: 18 },
      { wch: 30 },
      { wch: 50 },
      { wch: 22 },
      { wch: 18 },
      { wch: 20 },
      { wch: 22 },
      { wch: 30 },
      { wch: 50 },
    ];

    const livro = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(livro, planilha, "Relatório");

    const resumoPlanilha = XLSX.utils.aoa_to_sheet([
      ["RESUMO DO RELATÓRIO"],
      [resumo.trim() || "Nenhum resumo informado."],
      [],
      ["Instituição", nomeInstituicao || "Instituição logada"],
      ["Período", `${dataInicial || "Início"} até ${dataFinal || "Hoje"}`],
      ["Total de registros", registros.length],
      ["Gerado em", formatarData(new Date())],
    ]);

    resumoPlanilha["!cols"] = [{ wch: 25 }, { wch: 90 }];

    XLSX.utils.book_append_sheet(livro, resumoPlanilha, "Resumo");

    XLSX.writeFile(
      livro,
      `relatorio_solicitacoes_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  }

  // =====================================================
  // GERAR CSV
  // =====================================================

  function gerarCSV(registros, resumo = "") {
    const linhas = obterLinhasExportacao(registros, resumo);
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

  // =====================================================
  // EXPORTAR CONFORME O FORMATO
  // =====================================================

  function exportarRelatorio(registros, formatoArquivo, resumo = "") {
    if (formatoArquivo === "PDF") {
      gerarPDF(registros, resumo);
    } else if (formatoArquivo === "EXCEL") {
      gerarExcel(registros, resumo);
    } else {
      gerarCSV(registros, resumo);
    }
  }

  // =====================================================
  // FILTRAR REGISTROS PARA EXPORTAÇÃO
  // =====================================================

  function filtrarRegistros(registros, filtros) {
    const inicio = filtros.dataInicial
      ? new Date(`${filtros.dataInicial}T00:00:00`)
      : null;

    const fim = filtros.dataFinal
      ? new Date(`${filtros.dataFinal}T23:59:59.999`)
      : null;

    return registros.filter((item) => {
      const data = converterData(obterDataRegistro(item));

      if (inicio && (!data || data < inicio)) return false;
      if (fim && (!data || data > fim)) return false;

      if (filtros.status !== null && filtros.status !== undefined) {
        const statusAtual = normalizarTexto(obterStatus(item));

        if (
          !filtros.status.some(
            (status) => normalizarTexto(status) === statusAtual,
          )
        ) {
          return false;
        }
      }

      if (filtros.tipos !== null && filtros.tipos !== undefined) {
        const tipoAtual = normalizarTexto(obterTipo(item));

        if (
          !filtros.tipos.some(
            (tipo) => normalizarTexto(tipo) === tipoAtual,
          )
        ) {
          return false;
        }
      }

      return true;
    });
  }

  // =====================================================
  // GERAR RELATÓRIO
  // =====================================================

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

      const resultado = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        throw new Error(
          resultado?.message ||
            resultado?.error ||
            "Não foi possível atualizar os registros.",
        );
      }

      const registrosAtuais = obterRegistrosResposta(resultado);

      if (!registrosAtuais) {
        throw new Error("A API não retornou uma lista válida de registros.");
      }

      setDados(registrosAtuais);

      const filtros = {
        dataInicial,
        dataFinal,
        status: statusSelecionados,
        tipos: tiposSelecionados,
      };

      const filtrados = filtrarRegistros(registrosAtuais, filtros);

      if (filtrados.length === 0) {
        setMensagem("Nenhum registro corresponde aos filtros selecionados.");
        return;
      }

      const resumo = resumoRelatorio.trim();

      exportarRelatorio(filtrados, formato, resumo);

      const relatorio = {
        id: `${Date.now()}`,
        nome: `Relatório ${new Date().toLocaleString("pt-BR")}`,
        formato,
        criadoEm: new Date().toISOString(),
        filtros,
        quantidade: filtrados.length,
        resumo,
      };

      const atualizados = [relatorio, ...carregarRelatoriosSalvos()].slice(
        0,
        10,
      );

      localStorage.setItem(CHAVE_RELATORIOS, JSON.stringify(atualizados));

      setRelatoriosSalvos(atualizados);
      setRelatorioExpandido(relatorio.id);

      setMensagem(
        `Relatório gerado com ${filtrados.length} registro(s). O resumo foi incluído no arquivo.`,
      );
    } catch (error) {
      setErro(error.message || "Erro ao gerar o relatório.");
    } finally {
      setGerando(false);
    }
  }

  // =====================================================
  // BAIXAR NOVAMENTE UM RELATÓRIO
  // =====================================================

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

      const resultado = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        throw new Error(
          resultado?.message ||
            resultado?.error ||
            "Não foi possível recuperar os registros.",
        );
      }

      const registros = obterRegistrosResposta(resultado);

      if (!registros) {
        throw new Error("A API não retornou uma lista válida.");
      }

      const filtros = relatorio.filtros || {};
      const filtrados = filtrarRegistros(registros, filtros);

      if (filtrados.length === 0) {
        setMensagem("Nenhum registro corresponde aos filtros desse relatório.");
        return;
      }

      const resumoSalvo = relatorio.resumo || "";

      exportarRelatorio(filtrados, relatorio.formato, resumoSalvo);

      setRelatorioExpandido(relatorio.id);

      setMensagem(
        `Relatório baixado novamente com ${filtrados.length} registro(s). O resumo original foi mantido.`,
      );
    } catch (error) {
      setErro(error.message || "Erro ao baixar o relatório.");
    } finally {
      setGerando(false);
    }
  }

  // =====================================================
  // EXCLUIR RELATÓRIO SALVO
  // =====================================================

  function excluirRelatorioSalvo(id) {
    const atualizados = relatoriosSalvos.filter(
      (relatorio) => relatorio.id !== id,
    );

    localStorage.setItem(CHAVE_RELATORIOS, JSON.stringify(atualizados));
    setRelatoriosSalvos(atualizados);

    if (relatorioExpandido === id) {
      setRelatorioExpandido(null);
    }

    setMensagem("Relatório removido do histórico deste navegador.");
  }

  // =====================================================
  // ESTILOS
  // =====================================================

  const cardClass =
    "rounded-2xl border border-slate-200 bg-white shadow-sm";

  const inputClass =
    "w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

  const periodoTexto = (relatorio) => {
    const filtros = relatorio?.filtros || {};

    return `${
      filtros.dataInicial
        ? filtros.dataInicial.split("-").reverse().join("/")
        : "Início"
    } – ${
      filtros.dataFinal
        ? filtros.dataFinal.split("-").reverse().join("/")
        : "Hoje"
    }`;
  };

  // =====================================================
  // INTERFACE
  // =====================================================

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-4 px-1 pb-8 text-[#082f67] sm:px-2">
      {/* CABEÇALHO */}
      <header className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Exportação de Relatórios
            </h1>

            <p className="text-xs text-slate-600">
              Selecione os filtros e o formato desejado para gerar o relatório.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={carregarDados}
              disabled={carregando || gerando}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-xs font-semibold text-blue-900 shadow-sm transition hover:bg-blue-50 disabled:opacity-50"
            >
              <FiRefreshCw
                className={carregando ? "animate-spin" : ""}
                size={14}
              />
              Atualizar
            </button>

            <button
              type="button"
              onClick={gerarRelatorio}
              disabled={carregando || gerando}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#062d62] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0a438a] focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {gerando ? (
                <FiRefreshCw className="animate-spin" size={15} />
              ) : (
                <FiDownload size={15} />
              )}

              {gerando ? "Gerando..." : "Gerar e Baixar Relatório"}
            </button>
          </div>
        </div>
      </header>

      {/* MENSAGENS */}
      {erro && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <FiAlertCircle className="mt-0.5 shrink-0" size={17} />

          <div className="min-w-0 flex-1">
            <p className="font-semibold">Não foi possível concluir a ação</p>
            <p className="mt-1">{erro}</p>
          </div>

          <button
            type="button"
            onClick={() => setErro("")}
            aria-label="Fechar erro"
          >
            <FiXCircle size={17} />
          </button>
        </div>
      )}

      {mensagem && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          <FiCheckCircle className="mt-0.5 shrink-0" size={17} />

          <p className="flex-1">{mensagem}</p>

          <button
            type="button"
            onClick={() => setMensagem("")}
            aria-label="Fechar mensagem"
          >
            <FiXCircle size={17} />
          </button>
        </div>
      )}

      {/* FILTROS */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {/* PERÍODO */}
        <div className="rounded-2xl border-l-[5px] border-[#06458f] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide">
            Período
          </h2>

          <div className="grid grid-cols-2 gap-2">
            <label className="min-w-0">
              <span className="mb-1 block text-[10px] font-semibold text-slate-500">
                Data inicial
              </span>

              <input
                aria-label="Data inicial"
                type="date"
                value={dataInicial}
                max={dataFinal || undefined}
                onChange={(e) => setDataInicial(e.target.value)}
                className={inputClass}
              />
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-[10px] font-semibold text-slate-500">
                Data final
              </span>

              <input
                aria-label="Data final"
                type="date"
                value={dataFinal}
                min={dataInicial || undefined}
                onChange={(e) => setDataFinal(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
        </div>

        {/* FILTRO: TIPO DE SOLICITAÇÃO */}
        <div className="rounded-2xl border-l-[5px] border-[#06458f] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide">
            Tipo de solicitação
          </h2>

          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-slate-300 px-3 py-2.5 text-xs text-slate-700 hover:bg-slate-50">
              <span className="truncate">
                {tiposSelecionados === null
                  ? "Todos os tipos"
                  : tiposSelecionados.length === 0
                    ? "Nenhum tipo selecionado"
                    : `${tiposSelecionados.length} tipo(s) selecionado(s)`}
              </span>

              <FiChevronDown
                className="shrink-0 transition group-open:rotate-180"
                size={15}
              />
            </summary>

            <div className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              <div className="flex items-center justify-between gap-2 px-2 pb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                  Tipos disponíveis
                </span>

                <button
                  type="button"
                  onClick={() => setTiposSelecionados(null)}
                  className="text-[10px] font-bold text-blue-800 hover:underline"
                >
                  Todos
                </button>
              </div>

              {opcoesTipos.map((item) => (
                <label
                  key={`tipo-${normalizarTexto(item)}`}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={
                      tiposSelecionados === null ||
                      tiposSelecionados.some(
                        (tipo) =>
                          normalizarTexto(tipo) === normalizarTexto(item),
                      )
                    }
                    onChange={() =>
                      alternarFiltro(
                        item,
                        tiposSelecionados,
                        setTiposSelecionados,
                        opcoesTipos,
                      )
                    }
                    className="accent-blue-800"
                  />

                  <span className="break-words">{item}</span>
                </label>
              ))}

              <div className="mt-2 border-t border-slate-100 pt-1">
                <button
                  type="button"
                  onClick={() => setTiposSelecionados([])}
                  className="w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-50"
                >
                  Limpar seleção
                </button>
              </div>
            </div>
          </details>

          <p className="mt-2 text-[10px] text-slate-500">
            Filtre as solicitações pelo setor ou tipo.
          </p>
        </div>

        {/* FILTRO: STATUS */}
        <div className="rounded-2xl border-l-[5px] border-[#06458f] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide">
            Status da solicitação
          </h2>

          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-slate-300 px-3 py-2.5 text-xs text-slate-700 hover:bg-slate-50">
              <span className="truncate">
                {statusSelecionados === null
                  ? "Todos os status"
                  : statusSelecionados.length === 0
                    ? "Nenhum status selecionado"
                    : `${statusSelecionados.length} status selecionado(s)`}
              </span>

              <FiChevronDown
                className="shrink-0 transition group-open:rotate-180"
                size={15}
              />
            </summary>

            <div className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              <div className="flex items-center justify-between gap-2 px-2 pb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                  Status disponíveis
                </span>

                <button
                  type="button"
                  onClick={() => setStatusSelecionados(null)}
                  className="text-[10px] font-bold text-blue-800 hover:underline"
                >
                  Todos
                </button>
              </div>

              {opcoesStatus.map((item) => (
                <label
                  key={`status-${normalizarTexto(item)}`}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={
                      statusSelecionados === null ||
                      statusSelecionados.some(
                        (status) =>
                          normalizarTexto(status) === normalizarTexto(item),
                      )
                    }
                    onChange={() =>
                      alternarFiltro(
                        item,
                        statusSelecionados,
                        setStatusSelecionados,
                        opcoesStatus,
                      )
                    }
                    className="accent-blue-800"
                  />

                  <span>{obterStatusLabel(item)}</span>
                </label>
              ))}

              <div className="mt-2 border-t border-slate-100 pt-1">
                <button
                  type="button"
                  onClick={() => setStatusSelecionados([])}
                  className="w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-50"
                >
                  Limpar seleção
                </button>
              </div>
            </div>
          </details>

          <p className="mt-2 text-[10px] text-slate-500">
            Filtre pelo andamento de cada solicitação.
          </p>
        </div>
      </section>

      {/* FORMATOS */}
      <section>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-3 text-xs font-bold text-slate-600">
            Escolher formato do arquivo
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                valor: "PDF",
                nome: "PDF",
                descricao: "Ideal para impressão e relatórios formais",
                icone: FiFileText,
              },
              {
                valor: "EXCEL",
                nome: "EXCEL",
                descricao: "Para manipulação de dados",
                icone: FiFile,
              },
              {
                valor: "CSV",
                nome: "CSV",
                descricao: "Para importar e compartilhar dados",
                icone: FiClipboard,
              },
            ].map((item) => {
              const Icone = item.icone;
              const ativo = formato === item.valor;

              return (
                <button
                  key={item.valor}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setFormato(item.valor)}
                  className={`relative flex min-h-[88px] items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${
                    ativo
                      ? "border-blue-700 bg-[#d7e6ff] ring-2 ring-blue-700/15"
                      : "border-blue-100 bg-[#eaf1fc] hover:border-blue-300 hover:bg-[#dfeaff]"
                  }`}
                >
                  <Icone
                    className="shrink-0 text-[#06458f]"
                    size={34}
                    strokeWidth={1.7}
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-extrabold leading-5 text-[#06458f]">
                      {item.nome}
                    </span>

                    <span className="mt-1 block text-[10px] leading-4 text-slate-600">
                      {item.descricao}
                    </span>
                  </span>

                  {ativo && (
                    <span className="absolute bottom-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#06458f] text-white">
                      <FiCheck size={11} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRÉVIA E RESUMO */}
      <section className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,1fr)]">
        {/* PRÉVIA */}
        <div className={`${cardClass} min-w-0 overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
            <div>
              <h2 className="text-sm font-bold text-[#082f67]">
                Prévia do Relatório
              </h2>

              <p className="mt-1 text-[11px] text-slate-500">
                Confira os nomes e as descrições das solicitações antes de
                exportar.
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">
              {carregando
                ? "Carregando..."
                : `${registrosFiltrados.length} registro(s)`}
            </span>
          </div>

          {carregando ? (
            <div className="flex min-h-44 flex-col items-center justify-center gap-2 p-6 text-center">
              <FiRefreshCw className="animate-spin text-blue-700" size={24} />

              <p className="text-sm text-slate-600">
                Carregando solicitações...
              </p>
            </div>
          ) : registrosFiltrados.length === 0 ? (
            <div className="flex min-h-44 flex-col items-center justify-center p-6 text-center">
              <FiFileText size={28} className="mb-2 text-slate-300" />

              <p className="text-sm font-semibold text-slate-700">
                Nenhum registro encontrado
              </p>

              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                Altere os filtros ou limpe a seleção para visualizar outros
                registros.
              </p>

              <button
                type="button"
                onClick={limparFiltros}
                className="mt-3 text-xs font-bold text-blue-800 hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left">
                <thead className="bg-[#e8e5e5]">
                  <tr>
                    {[
                      "ID",
                      "Solicitação",
                      "Descrição da solicitação",
                      "Data",
                      "Status",
                      "Formato",
                    ].map((coluna) => (
                      <th
                        key={coluna}
                        className="px-3 py-2.5 text-[10px] font-extrabold text-[#06458f] sm:px-4"
                      >
                        {coluna}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {registrosFiltrados.slice(0, 8).map((item, indice) => (
                    <tr
                      key={`${obterIdentificador(item)}-${indice}`}
                      className="align-top transition hover:bg-blue-50/40"
                    >
                      <td className="px-3 py-3 text-xs font-semibold text-blue-800 sm:px-4">
                        {obterIdentificador(item)}
                      </td>

                      <td className="max-w-[220px] px-3 py-3 text-xs font-semibold text-slate-700 sm:px-4">
                        <div className="break-words">{obterTitulo(item)}</div>
                      </td>

                      <td className="max-w-[320px] px-3 py-3 text-xs leading-5 text-slate-600 sm:px-4">
                        <div className="whitespace-normal break-words">
                          {obterDescricao(item)}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-[10px] text-slate-600 sm:px-4">
                        {formatarData(obterDataRegistro(item)).split(",")[0]}
                      </td>

                      <td className="px-3 py-3 sm:px-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold ${obterClasseStatus(
                            obterStatus(item),
                          )}`}
                        >
                          {obterStatusLabel(obterStatus(item))}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-[10px] font-semibold text-slate-600 sm:px-4">
                        {formato}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {registrosFiltrados.length > 8 && (
                <p className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-500">
                  Exibindo 8 de {registrosFiltrados.length} registros. O arquivo
                  exportado conterá todos os registros filtrados.
                </p>
              )}
            </div>
          )}
        </div>

        {/* CAMPO DE RESUMO */}
        <div className={`${cardClass} flex min-w-0 flex-col p-4 sm:p-5`}>
          <div className="mb-3 flex items-start gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-800">
              <FiFilePlus size={19} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-[#082f67]">
                Resumo do Relatório
              </h2>

              <p className="mt-1 text-[11px] leading-4 text-slate-500">
                Esta observação será incluída no arquivo exportado e ficará
                salva no histórico.
              </p>
            </div>
          </div>

          <textarea
            value={resumoRelatorio}
            onChange={(e) => setResumoRelatorio(e.target.value)}
            rows={5}
            maxLength={1500}
            placeholder="Digite sua análise, observações ou informações adicionais..."
            className="min-h-[145px] w-full flex-1 resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-400">
              {resumoRelatorio.length}/1500 caracteres
            </span>

            <button
              type="button"
              onClick={() => setResumoRelatorio("")}
              className="text-[10px] font-semibold text-slate-500 transition hover:text-red-600"
            >
              Limpar resumo
            </button>
          </div>

          <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-blue-900">
              <FiEye size={13} />
              Prévia do resumo
            </p>

            <p className="whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">
              {resumoRelatorio.trim() ||
                "O resumo digitado aparecerá aqui e será incluído no relatório quando você gerar o arquivo."}
            </p>
          </div>
        </div>
      </section>

      {/* HISTÓRICO DOS RELATÓRIOS */}
      <section className={`${cardClass} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-bold text-[#082f67]">
              Últimos Relatórios Gerados
            </h2>

            <p className="mt-1 text-[11px] text-slate-500">
              Baixe novamente, consulte o resumo salvo ou remova um registro do
              histórico.
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {relatoriosSalvos.length}/10 salvos
          </span>
        </div>

        {relatoriosSalvos.length === 0 ? (
          <div className="px-5 py-9 text-center">
            <FiClock className="mx-auto mb-2 text-slate-300" size={25} />

            <p className="text-sm font-semibold text-slate-700">
              Nenhum relatório gerado ainda
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Depois de gerar um arquivo, ele aparecerá nesta lista.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="bg-[#e8e5e5]">
                <tr>
                  {[
                    "ID",
                    "Data de geração",
                    "Período",
                    "Formato",
                    "Registros",
                    "Ações",
                  ].map((coluna) => (
                    <th
                      key={coluna}
                      className="px-3 py-3 text-[10px] font-extrabold text-[#06458f] sm:px-4"
                    >
                      {coluna}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {relatoriosSalvos.map((relatorio) => {
                  const expandido = relatorioExpandido === relatorio.id;

                  return (
                    <Fragment key={relatorio.id}>
                      <tr className="transition hover:bg-blue-50/30">
                        <td className="px-3 py-3 text-xs font-semibold text-blue-800 sm:px-4">
                          #{String(relatorio.id).slice(-6)}
                        </td>

                        <td className="whitespace-nowrap px-3 py-3 text-[10px] text-slate-600 sm:px-4">
                          {formatarData(relatorio.criadoEm)}
                        </td>

                        <td className="whitespace-nowrap px-3 py-3 text-[10px] text-slate-600 sm:px-4">
                          {periodoTexto(relatorio)}
                        </td>

                        <td className="px-3 py-3 sm:px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold ${
                              relatorio.formato === "PDF"
                                ? "bg-red-50 text-red-700"
                                : relatorio.formato === "EXCEL"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {relatorio.formato === "PDF" ? (
                              <FiFileText size={13} />
                            ) : relatorio.formato === "EXCEL" ? (
                              <FiFile size={13} />
                            ) : (
                              <FiClipboard size={13} />
                            )}

                            {relatorio.formato}
                          </span>
                        </td>

                        <td className="px-3 py-3 text-xs font-medium text-slate-600 sm:px-4">
                          {relatorio.quantidade}
                        </td>

                        <td className="px-3 py-3 sm:px-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setRelatorioExpandido(
                                  expandido ? null : relatorio.id,
                                )
                              }
                              title="Consultar resumo"
                              aria-label={`Consultar resumo de ${relatorio.nome}`}
                              aria-expanded={expandido}
                              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
                                expandido
                                  ? "border-blue-300 bg-blue-100 text-blue-800"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                              }`}
                            >
                              {expandido ? (
                                <FiChevronDown
                                  className="rotate-180"
                                  size={16}
                                />
                              ) : (
                                <FiEye size={16} />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => baixarNovamente(relatorio)}
                              disabled={gerando}
                              title="Baixar novamente"
                              aria-label={`Baixar novamente ${relatorio.nome}`}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#062d62] px-3 text-[10px] font-bold text-white transition hover:bg-[#0a438a] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <FiDownload size={14} />
                              Baixar
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                excluirRelatorioSalvo(relatorio.id)
                              }
                              title="Excluir do histórico"
                              aria-label={`Excluir ${relatorio.nome}`}
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-white text-red-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                            >
                              <FiTrash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* RESUMO SALVO NO HISTÓRICO */}
                      {expandido && (
                        <tr>
                          <td
                            colSpan={6}
                            className="border-t border-blue-100 bg-blue-50/50 px-4 py-4 sm:px-5"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-800 shadow-sm ring-1 ring-blue-100">
                                <FiFileText size={17} />
                              </div>

                              <div className="min-w-0 flex-1">
                                <h3 className="text-xs font-bold text-[#082f67]">
                                  Resumo do relatório
                                </h3>

                                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">
                                  {relatorio.resumo?.trim() ||
                                    "Nenhum resumo foi informado na geração deste relatório."}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                                  <span>Formato: {relatorio.formato}</span>

                                  <span>Registros: {relatorio.quantidade}</span>

                                  <span>
                                    Gerado em:{" "}
                                    {formatarData(relatorio.criadoEm)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}