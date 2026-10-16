
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  FiBell,
  FiCheck,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiDownload,
  FiExternalLink,
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiAlertCircle,
  FiAlertTriangle,
  FiInfo,
  FiTrash2,
  FiCheckSquare,
  FiX,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";

const API = String(enderecoServidor).replace(/\/$/, "");
const POR_PAGINA = 5;

function obterToken() {
  const tokenSalvo = localStorage.getItem("@AndraRecursos:token");

  if (tokenSalvo && tokenSalvo !== "null" && tokenSalvo !== "undefined") {
    return tokenSalvo;
  }

  const usuarioSalvo = localStorage.getItem("@AndraRecursos:usuario");

  if (!usuarioSalvo) return null;

  try {
    const usuario = JSON.parse(usuarioSalvo);

    if (typeof usuario === "string") return usuario;

    return (
      usuario?.token ||
      usuario?.accessToken ||
      usuario?.access_token ||
      null
    );
  } catch {
    return usuarioSalvo;
  }
}

function formatarData(valor) {
  if (!valor) return "Data não informada";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) return String(valor);

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function obterTipo(tipo) {
  const valor = String(tipo || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (
    valor.includes("crit") ||
    valor.includes("urgente") ||
    valor.includes("erro")
  ) {
    return {
      Icone: FiAlertCircle,
      cor: "bg-red-100 text-red-700",
      borda: "border-l-red-500",
    };
  }

  if (valor.includes("alerta") || valor.includes("aviso")) {
    return {
      Icone: FiAlertTriangle,
      cor: "bg-amber-100 text-amber-700",
      borda: "border-l-amber-500",
    };
  }

  if (valor.includes("sucesso") || valor.includes("aprova")) {
    return {
      Icone: FiCheckCircle,
      cor: "bg-green-100 text-green-700",
      borda: "border-l-green-500",
    };
  }

  return {
    Icone: FiInfo,
    cor: "bg-blue-100 text-[#1759ad]",
    borda: "border-l-[#1759ad]",
  };
}

export default function NotificacoesInst() {
  const navigate = useNavigate();

  const [instituicao, setInstituicao] = useState(null);
  const [notificacoes, setNotificacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [filtro, setFiltro] = useState("todas");
  const [pesquisa, setPesquisa] = useState("");
  const [pagina, setPagina] = useState(1);
  const [atualizar, setAtualizar] = useState(0);

  const [processando, setProcessando] = useState(false);
  const [idProcessando, setIdProcessando] = useState(null);

  useEffect(() => {
    const controlador = new AbortController();

    async function carregarDados() {
      const token = obterToken();

      if (!token) {
        navigate("/", { replace: true });
        return;
      }

      setCarregando(true);
      setErro("");

      try {
        const cabecalhos = {
          Authorization: `Bearer ${token}`,
        };

        const [respostaInstituicao, respostaNotificacoes] =
          await Promise.all([
            fetch(`${API}/instituicoes/me`, {
              headers: cabecalhos,
              signal: controlador.signal,
            }),
            fetch(`${API}/notificacoes/instituicao`, {
              headers: cabecalhos,
              signal: controlador.signal,
            }),
          ]);

        if (
          respostaInstituicao.status === 401 ||
          respostaInstituicao.status === 403 ||
          respostaNotificacoes.status === 401 ||
          respostaNotificacoes.status === 403
        ) {
          localStorage.removeItem("@AndraRecursos:token");
          navigate("/", { replace: true });
          return;
        }

        const dadosInstituicao = await respostaInstituicao
          .json()
          .catch(() => null);

        const dadosNotificacoes = await respostaNotificacoes
          .json()
          .catch(() => null);

        if (!respostaInstituicao.ok) {
          throw new Error(
            dadosInstituicao?.error ||
              dadosInstituicao?.message ||
              "Não foi possível carregar os dados da instituição."
          );
        }

        if (!respostaNotificacoes.ok) {
          throw new Error(
            dadosNotificacoes?.error ||
              dadosNotificacoes?.message ||
              "Não foi possível carregar as notificações."
          );
        }

        if (!Array.isArray(dadosNotificacoes)) {
          throw new Error("A API não retornou uma lista válida.");
        }

        if (!controlador.signal.aborted) {
          setInstituicao(dadosInstituicao);
          setNotificacoes(dadosNotificacoes);
        }
      } catch (error) {
        if (
          error.name !== "AbortError" &&
          !controlador.signal.aborted
        ) {
          console.error("Erro ao carregar notificações:", error);
          setErro(error.message || "Erro ao carregar as notificações.");
        }
      } finally {
        if (!controlador.signal.aborted) {
          setCarregando(false);
        }
      }
    }

    carregarDados();

    return () => controlador.abort();
  }, [navigate, atualizar]);

  const totais = useMemo(() => {
    const lidas = notificacoes.filter((item) => Boolean(item.lida)).length;

    return {
      total: notificacoes.length,
      lidas,
      naoLidas: notificacoes.length - lidas,
    };
  }, [notificacoes]);

  const filtradas = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();

    return notificacoes.filter((item) => {
      if (filtro === "lidas" && !item.lida) return false;
      if (filtro === "nao-lidas" && item.lida) return false;

      return (
        !termo ||
        [
          item.mensagem,
          item.tipo_informacao,
          item.titulo_solicitacao,
          item.status_solicitacao,
          item.id_notificacao,
          item.id_solicitacao,
        ].some((valor) =>
          String(valor ?? "").toLowerCase().includes(termo)
        )
      );
    });
  }, [notificacoes, filtro, pesquisa]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(filtradas.length / POR_PAGINA)
  );

  const paginaAtual = Math.min(pagina, totalPaginas);

  const itensPagina = filtradas.slice(
    (paginaAtual - 1) * POR_PAGINA,
    paginaAtual * POR_PAGINA
  );

  function atualizarNotificacoes() {
    setAtualizar((valor) => valor + 1);
  }

  async function requisicaoAutenticada(url, metodo) {
    const token = obterToken();

    if (!token) {
      navigate("/", { replace: true });
      throw new Error("Sua sessão expirou. Entre novamente.");
    }

    const resposta = await fetch(url, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const dados = await resposta.json().catch(() => null);

    if (resposta.status === 401 || resposta.status === 403) {
      localStorage.removeItem("@AndraRecursos:token");
      navigate("/", { replace: true });
      throw new Error("Sessão inválida ou sem autorização.");
    }

    if (!resposta.ok) {
      throw new Error(
        dados?.error ||
          dados?.message ||
          "Não foi possível concluir a operação."
      );
    }

    return dados;
  }

  // ==========================================
  // CONFIRMAÇÃO UTILIZANDO TOAST
  // ==========================================

  function confirmarAcao(mensagem, executar, textoBotao = "Confirmar") {
    toast(
      (t) => (
        <div className="w-full max-w-sm">
          <p className="text-sm font-semibold text-gray-800">
            {mensagem}
          </p>

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => toast.dismiss(t.id)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => {
                toast.dismiss(t.id);
                executar();
              }}
              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
            >
              {textoBotao}
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        position: "top-center",
        style: {
          padding: "16px",
          borderRadius: "14px",
          maxWidth: "440px",
          width: "calc(100vw - 32px)",
        },
      }
    );
  }

  // ==========================================
  // MARCAR UMA NOTIFICAÇÃO COMO LIDA
  // ==========================================

  async function marcarComoLida(id) {
    if (processando || idProcessando !== null) return;

    setIdProcessando(id);

    try {
      await requisicaoAutenticada(
        `${API}/notificacoes/instituicao/${id}/lida`,
        "PATCH"
      );

      setNotificacoes((lista) =>
        lista.map((item) =>
          Number(item.id_notificacao) === Number(id)
            ? { ...item, lida: true }
            : item
        )
      );

      toast.success("Notificação marcada como lida.");
    } catch (error) {
      toast.error(error.message || "Erro ao marcar como lida.");
    } finally {
      setIdProcessando(null);
    }
  }

  // ==========================================
  // MARCAR TODAS COMO LIDAS
  // ==========================================

  async function marcarTodasComoLidas() {
    if (
      processando ||
      idProcessando !== null ||
      totais.naoLidas === 0
    ) {
      return;
    }

    confirmarAcao(
      `Deseja marcar todas as ${totais.naoLidas} notificações não lidas como lidas?`,
      async () => {
        setProcessando(true);

        try {
          await requisicaoAutenticada(
            `${API}/notificacoes/instituicao/marcar-todas-lidas`,
            "PATCH"
          );

          setNotificacoes((lista) =>
            lista.map((item) => ({ ...item, lida: true }))
          );

          toast.success("Todas as notificações foram marcadas como lidas.");
        } catch (error) {
          toast.error(error.message || "Erro ao marcar as notificações.");
        } finally {
          setProcessando(false);
        }
      },
      "Marcar como lidas"
    );
  }

  // ==========================================
  // EXCLUIR UMA NOTIFICAÇÃO
  // ==========================================

  async function excluirNotificacao(id) {
    if (processando || idProcessando !== null) return;

    confirmarAcao(
      "Deseja excluir esta notificação? Ela deixará de aparecer para sua instituição.",
      async () => {
        setIdProcessando(id);

        try {
          await requisicaoAutenticada(
            `${API}/notificacoes/instituicao/${id}`,
            "DELETE"
          );

          setNotificacoes((lista) =>
            lista.filter(
              (item) => Number(item.id_notificacao) !== Number(id)
            )
          );

          toast.success("Notificação excluída.");
        } catch (error) {
          toast.error(error.message || "Erro ao excluir notificação.");
        } finally {
          setIdProcessando(null);
        }
      },
      "Excluir"
    );
  }

  // ==========================================
  // EXCLUIR TODAS AS NOTIFICAÇÕES
  // ==========================================

  async function excluirTodasNotificacoes() {
    if (
      processando ||
      idProcessando !== null ||
      notificacoes.length === 0
    ) {
      return;
    }

    confirmarAcao(
      `Deseja excluir todas as ${notificacoes.length} notificações da sua instituição?`,
      async () => {
        setProcessando(true);

        try {
          await requisicaoAutenticada(
            `${API}/notificacoes/instituicao/todas`,
            "DELETE"
          );

          setNotificacoes([]);
          setPagina(1);

          toast.success("Todas as notificações foram excluídas.");
        } catch (error) {
          toast.error(error.message || "Erro ao excluir notificações.");
        } finally {
          setProcessando(false);
        }
      },
      "Excluir todas"
    );
  }

  // ==========================================
  // VER SOLICITAÇÃO
  // ==========================================

  function verSolicitacao(idSolicitacao) {
    if (!idSolicitacao) {
      toast.error("Esta notificação não possui uma solicitação vinculada.");
      return;
    }

    // Rota provisória: ajustaremos quando criarmos a página de detalhes.
    navigate(`/instituicao/solicitacoes/${idSolicitacao}`);
  }

  // ==========================================
  // EXPORTAR PDF
  // ==========================================

  function exportarRelatorio() {
    if (!filtradas.length) {
      toast.error("Não há notificações para exportar.");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const azul = [8, 45, 86];

      const dataEmissao = new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      }).format(new Date());

      const totalLidas = filtradas.filter((item) => Boolean(item.lida)).length;
      const totalNaoLidas = filtradas.length - totalLidas;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(...azul);
      doc.text("AndraRecursos", 14, 17);

      doc.setFontSize(14);
      doc.text("Relatório de Notificações da Instituição", 14, 26);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(90, 100, 115);

      doc.text(
        `Instituição: ${instituicao?.nome || "Não identificada"}`,
        14,
        33
      );

      doc.text(`Data de emissão: ${dataEmissao}`, 14, 39);
      doc.text(`Total de notificações: ${filtradas.length}`, 14, 45);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...azul);
      doc.text("Resumo das notificações", 14, 55);

      autoTable(doc, {
        startY: 59,
        head: [["Total", "Lidas", "Não lidas"]],
        body: [[filtradas.length, totalLidas, totalNaoLidas]],
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

      const inicioTabela = doc.lastAutoTable.finalY + 10;

      autoTable(doc, {
        startY: inicioTabela,
        head: [[
          "ID",
          "Mensagem",
          "Tipo",
          "Solicitação",
          "Status",
          "Situação",
          "Data",
        ]],
        body: filtradas.map((item) => [
          item.id_notificacao ?? "—",
          item.mensagem || "Sem mensagem",
          item.tipo_informacao || "Não informado",
          item.titulo_solicitacao || "Não informada",
          item.status_solicitacao || "Não informado",
          item.lida ? "Lida" : "Não lida",
          formatarData(item.data_notificacao),
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
          0: { cellWidth: 15 },
          1: { cellWidth: 90 },
          2: { cellWidth: 30 },
          3: { cellWidth: 45 },
          4: { cellWidth: 35 },
          5: { cellWidth: 20 },
          6: { cellWidth: 35 },
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
            "AndraRecursos - Notificações da Instituição",
            10,
            altura - 8
          );

          doc.text(
            `Página ${numeroPagina}`,
            largura - 10,
            altura - 8,
            { align: "right" }
          );
        },
      });

      const dataArquivo = new Date()
        .toLocaleDateString("pt-BR")
        .replace(/\//g, "-");

      doc.save(
        `Notificacoes_Instituicao_AndraRecursos_${dataArquivo}.pdf`
      );

      toast.success("Relatório PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      toast.error("Não foi possível gerar o relatório PDF.");
    }
  }

  return (
    <div className="w-full min-w-0">
      <div className="mx-auto min-w-0 max-w-7xl space-y-6 pb-8">

        {/* CABEÇALHO */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-[#1759ad]">
                <FiBell size={25} />
              </span>

              <div>
                <h1 className="text-2xl font-bold text-[#082d56] sm:text-3xl">
                  Notificações
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Acompanhe as atualizações da sua instituição.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportarRelatorio}
              disabled={carregando || !!erro || !filtradas.length}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#082d56] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#164675] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiDownload size={17} />
              Exportar PDF
            </button>

            <button
              type="button"
              onClick={atualizarNotificacoes}
              disabled={carregando || processando}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#082d56] transition hover:bg-blue-50 disabled:opacity-50"
            >
              <FiRefreshCw
                size={16}
                className={carregando ? "animate-spin" : ""}
              />
              Atualizar
            </button>
          </div>
        </div>

        {/* CONTADORES */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <span className="rounded-xl bg-blue-50 p-3 text-[#1759ad]">
                <FiBell size={21} />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-[#082d56]">
              {carregando ? "..." : totais.total}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Notificações recebidas
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-blue-700">Não lidas</p>
              <span className="rounded-xl bg-blue-100 p-3 text-blue-700">
                <FiClock size={21} />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-blue-800">
              {carregando ? "..." : totais.naoLidas}
            </p>
            <p className="mt-1 text-xs text-blue-600">
              Precisam da sua atenção
            </p>
          </div>

          <div className="rounded-2xl border border-green-100 bg-green-50/60 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-green-700">Lidas</p>
              <span className="rounded-xl bg-green-100 p-3 text-green-700">
                <FiCheckCircle size={21} />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-green-800">
              {carregando ? "..." : totais.lidas}
            </p>
            <p className="mt-1 text-xs text-green-600">
              Notificações já consultadas
            </p>
          </div>
        </div>

        {/* PAINEL DE NOTIFICAÇÕES */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <h2 className="text-lg font-bold text-[#082d56]">
                  Caixa de notificações
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Gerencie as notificações recebidas.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={marcarTodasComoLidas}
                  disabled={
                    processando ||
                    idProcessando !== null ||
                    carregando ||
                    totais.naoLidas === 0 ||
                    !!erro
                  }
                  title="Marcar todas as notificações como lidas"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm font-semibold text-green-800 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FiCheckSquare size={17} />
                  <span>Marcar todas como lidas</span>
                </button>

                <button
                  type="button"
                  onClick={excluirTodasNotificacoes}
                  disabled={
                    processando ||
                    idProcessando !== null ||
                    carregando ||
                    notificacoes.length === 0 ||
                    !!erro
                  }
                  title="Excluir todas as notificações"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FiTrash2 size={17} />
                  <span>Excluir todas</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {/* FILTROS E PESQUISA */}
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {[
                  ["todas", "Todas", totais.total],
                  ["nao-lidas", "Não lidas", totais.naoLidas],
                  ["lidas", "Lidas", totais.lidas],
                ].map(([valor, titulo, quantidade]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => {
                      setFiltro(valor);
                      setPagina(1);
                    }}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                      filtro === valor
                        ? "bg-[#082d56] text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-[#082d56]"
                    }`}
                  >
                    {titulo}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        filtro === valor
                          ? "bg-white/15 text-white"
                          : "bg-white text-gray-600"
                      }`}
                    >
                      {quantidade}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative w-full lg:max-w-sm">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={pesquisa}
                  onChange={(e) => {
                    setPesquisa(e.target.value);
                    setPagina(1);
                  }}
                  placeholder="Pesquisar notificações..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#1759ad] focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* ERRO */}
            {erro && (
              <div className="mb-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <FiAlertCircle className="mt-0.5 shrink-0" size={18} />
                  <p>{erro}</p>
                </div>

                <button
                  type="button"
                  onClick={atualizarNotificacoes}
                  className="self-start font-semibold underline sm:self-center"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {/* CARREGAMENTO */}
            {carregando ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-[#082d56]">
                <FiRefreshCw size={27} className="animate-spin" />
                <p className="text-sm font-medium">
                  Carregando notificações...
                </p>
              </div>
            ) : !erro ? (
              <>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-gray-500">
                    {filtradas.length} resultado(s)
                  </p>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>

                {/* LISTA */}
                <div className="space-y-4">
                  {itensPagina.map((notificacao) => {
                    const tipo = obterTipo(notificacao.tipo_informacao);
                    const Icone = tipo.Icone;

                    const estaProcessando =
                      Number(idProcessando) ===
                      Number(notificacao.id_notificacao);

                    return (
                      <article
                        key={notificacao.id_notificacao}
                        className={`group rounded-xl border border-l-4 p-4 transition duration-200 hover:shadow-md sm:p-5 ${
                          tipo.borda
                        } ${
                          notificacao.lida
                            ? "border-t-gray-200 border-r-gray-200 border-b-gray-200 bg-white"
                            : "border-t-blue-100 border-r-blue-100 border-b-blue-100 bg-blue-50/60"
                        }`}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tipo.cor}`}
                          >
                            <Icone size={22} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="break-words text-sm font-bold text-[#082d56] sm:text-base">
                                {notificacao.titulo_solicitacao ||
                                  notificacao.tipo_informacao ||
                                  "Notificação"}
                              </h3>

                              {!notificacao.lida && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-800">
                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                  Nova
                                </span>
                              )}

                              {notificacao.lida && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold text-green-800">
                                  <FiCheck size={12} />
                                  Lida
                                </span>
                              )}
                            </div>

                            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600">
                              {notificacao.mensagem || "Sem mensagem."}
                            </p>

                            {notificacao.status_solicitacao && (
                              <div className="mt-3">
                                <span className="inline-flex items-center rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-semibold text-[#1759ad]">
                                  Status: {notificacao.status_solicitacao}
                                </span>
                              </div>
                            )}

                            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-400">
                              <span className="inline-flex items-center gap-1.5">
                                <FiClock size={14} />
                                {formatarData(notificacao.data_notificacao)}
                              </span>

                              <span className="inline-flex items-center gap-1.5">
                                <FiFileText size={14} />
                                Notificação #{notificacao.id_notificacao}
                              </span>

                              {notificacao.id_solicitacao && (
                                <span className="inline-flex items-center gap-1.5">
                                  <FiExternalLink size={14} />
                                  Solicitação #{notificacao.id_solicitacao}
                                </span>
                              )}
                            </div>

                            {/* AÇÕES INDIVIDUAIS */}
                            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                              {notificacao.id_solicitacao && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    verSolicitacao(notificacao.id_solicitacao)
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#082d56] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#164675]"
                                  title="Ver detalhes da solicitação"
                                >
                                  <FiExternalLink size={14} />
                                  Ver solicitação
                                </button>
                              )}

                              {!notificacao.lida && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    marcarComoLida(notificacao.id_notificacao)
                                  }
                                  disabled={
                                    processando || idProcessando !== null
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                                  title="Marcar esta notificação como lida"
                                >
                                  {estaProcessando ? (
                                    <FiRefreshCw
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <FiCheckCircle size={14} />
                                  )}
                                  Marcar como lida
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  excluirNotificacao(notificacao.id_notificacao)
                                }
                                disabled={
                                  processando || idProcessando !== null
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Excluir esta notificação"
                              >
                                {estaProcessando ? (
                                  <FiRefreshCw
                                    size={14}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <FiTrash2 size={14} />
                                )}
                                Excluir
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}

                  {/* ESTADO VAZIO */}
                  {itensPagina.length === 0 && (
                    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-5 text-center">
                      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-300">
                        <FiBell size={31} />
                      </span>

                      <h3 className="mt-4 text-base font-bold text-[#082d56]">
                        Nenhuma notificação encontrada
                      </h3>

                      <p className="mt-2 max-w-sm text-sm text-gray-500">
                        Não há notificações para os filtros selecionados.
                        Tente mudar a situação ou a pesquisa.
                      </p>

                      {(filtro !== "todas" || pesquisa) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFiltro("todas");
                            setPesquisa("");
                            setPagina(1);
                          }}
                          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#082d56] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#164675]"
                        >
                          <FiX size={15} />
                          Limpar filtros
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* PAGINAÇÃO */}
                {filtradas.length > 0 && (
                  <div className="mt-6 flex flex-col gap-4 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-gray-500">
                      Exibindo{" "}
                      {(paginaAtual - 1) * POR_PAGINA + 1} a{" "}
                      {Math.min(
                        paginaAtual * POR_PAGINA,
                        filtradas.length
                      )}{" "}
                      de {filtradas.length} notificações
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={paginaAtual === 1}
                        onClick={() =>
                          setPagina((p) => Math.max(1, p - 1))
                        }
                        aria-label="Página anterior"
                        className="rounded-lg border border-gray-200 bg-white p-2.5 text-[#082d56] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <FiChevronLeft size={17} />
                      </button>

                      <span className="rounded-lg bg-[#082d56] px-4 py-2.5 text-xs font-semibold text-white">
                        {paginaAtual} / {totalPaginas}
                      </span>

                      <button
                        type="button"
                        disabled={paginaAtual === totalPaginas}
                        onClick={() =>
                          setPagina((p) =>
                            Math.min(totalPaginas, p + 1)
                          )
                        }
                        aria-label="Próxima página"
                        className="rounded-lg border border-gray-200 bg-white p-2.5 text-[#082d56] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <FiChevronRight size={17} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </section>

        {/* RODAPÉ */}
        <p className="text-center text-xs text-gray-400">
          AndraRecursos · Central de notificações da instituição
        </p>
      </div>
    </div>
  );
}
