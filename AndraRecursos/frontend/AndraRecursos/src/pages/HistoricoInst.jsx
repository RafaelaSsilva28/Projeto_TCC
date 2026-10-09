import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBell,
  FiClipboard,
  FiHome,
  FiLogOut,
  FiMenu,
  FiSettings,
  FiX,
  FiDownload,
  FiFileText,
  FiClock,
  FiSearch,
  FiEye,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
  FiCalendar,
} from "react-icons/fi";
import { enderecoServidor } from "../utils";

export default function HistoricoInst() {
  const navigate = useNavigate();

  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [pesquisa, setPesquisa] = useState("");
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);

  const buscarHistorico = useCallback(async () => {
    const token = localStorage.getItem("@AndraRecursos:token");

    if (!token) {
      navigate("/", { replace: true });
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
        },
      );

      if (resposta.status === 401 || resposta.status === 403) {
        localStorage.removeItem("@AndraRecursos:token");
        navigate("/", { replace: true });
        return;
      }

      if (!resposta.ok) {
        throw new Error(
          `Não foi possível carregar o histórico. Erro ${resposta.status}.`,
        );
      }

      const dados = await resposta.json();

      if (!Array.isArray(dados)) {
        throw new Error("A API retornou um formato de histórico inválido.");
      }

      setHistorico(dados);
    } catch (error) {
      console.error("Erro ao buscar histórico da instituição:", error);
      setErro(error.message || "Erro ao carregar o histórico.");
    } finally {
      setCarregando(false);
    }
  }, [navigate]);

  useEffect(() => {
    buscarHistorico();
  }, [buscarHistorico]);

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

  function sair() {
    localStorage.removeItem("@AndraRecursos:token");
    localStorage.removeItem("@AndraRecursos:usuario");
    localStorage.removeItem("@AndraRecursos:lembrar");

    navigate("/", { replace: true });
  }

  const historicoFiltrado = historico.filter((item) => {
    const termo = pesquisa.trim().toLowerCase();

    return [
      item.titulo_solicitacao,
      item.status,
      item.descricao,
      item.prioridade,
      item.id_solicitacao,
    ].some((valor) =>
      String(valor ?? "")
        .toLowerCase()
        .includes(termo),
    );
  });

  function obterEstiloStatus(status) {
    const valor = String(status || "").toLowerCase();

    if (valor.includes("aprov")) {
      return "border-green-200 bg-green-50 text-green-700";
    }

    if (
      valor.includes("análise") ||
      valor.includes("analise") ||
      valor.includes("pendente")
    ) {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    if (
      valor.includes("rejeit") ||
      valor.includes("recus") ||
      valor.includes("cancel")
    ) {
      return "border-red-200 bg-red-50 text-red-700";
    }

    if (valor.includes("conclu") || valor.includes("finaliz")) {
      return "border-blue-200 bg-blue-50 text-blue-700";
    }

    return "border-gray-200 bg-gray-100 text-gray-700";
  }

  function exportarRelatorio() {
    if (historicoFiltrado.length === 0) {
      alert("Não há registros para exportar.");
      return;
    }

    function escaparCSV(valor) {
      return `"${String(valor ?? "").replace(/"/g, '""')}"`;
    }

    const colunas = [
      "ID do histórico",
      "ID da solicitação",
      "Solicitação",
      "Status",
      "Prioridade",
      "Data da alteração",
      "Descrição",
    ];

    const linhas = historicoFiltrado.map((item) => [
      item.id_historico,
      item.id_solicitacao,
      item.titulo_solicitacao,
      item.status,
      item.prioridade,
      item.data_alteracao,
      item.descricao,
    ]);

    const conteudo = [colunas, ...linhas]
      .map((linha) => linha.map(escaparCSV).join(";"))
      .join("\r\n");

    const arquivo = new Blob(["\uFEFF" + conteudo], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");

    link.href = url;
    link.download = "historico-instituicao.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  const totalRegistros = historico.length;
  const totalAprovados = historico.filter((item) =>
    String(item.status || "")
      .toLowerCase()
      .includes("aprov"),
  ).length;
  const totalPendentes = historico.filter((item) => {
    const status = String(item.status || "").toLowerCase();

    return (
      status.includes("pendente") ||
      status.includes("análise") ||
      status.includes("analise")
    );
  }).length;

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* FUNDO DO MENU MOBILE */}
      {menuAberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMenuAberto(false)}
        />
      )}
      {/* MENU LATERAL INSTITUCIONAL */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-64 shrink-0 transform bg-[#082d56] text-white transition-transform duration-300 lg:sticky lg:translate-x-0 ${
          menuAberto ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* CABEÇALHO DO MENU */}
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div>
            <h1 className="text-xl font-bold">AndraRecursos</h1>
            <p className="mt-1 text-xs text-blue-200">Área da Instituição</p>
          </div>

          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMenuAberto(false)}
            className="text-white lg:hidden"
          >
            <FiX size={22} />
          </button>
        </div>

        {/* NAVEGAÇÃO */}
        <nav className="space-y-2 p-4">
          <button
            type="button"
            onClick={() => {
              setMenuAberto(false);
              navigate("/principal-inst");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-blue-100 transition hover:bg-white/10"
          >
            <FiHome size={19} />
            <span>Principal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuAberto(false);
              // Configure aqui a rota de solicitações da instituição.
            }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-blue-100 transition hover:bg-white/10"
          >
            <FiClipboard size={19} />
            <span>Solicitações</span>
          </button>

          <button
            type="button"
            aria-current="page"
            onClick={() => setMenuAberto(false)}
            className="flex w-full items-center gap-3 rounded-lg bg-white/10 px-4 py-3 text-white"
          >
            <FiClock size={19} />
            <span>Histórico Solicitações</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuAberto(false);
              alert("A página de notificações ainda não está configurada.");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-blue-100 transition hover:bg-white/10"
          >
            <FiBell size={19} />
            <span>Notificações</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuAberto(false);
              alert("A página de configurações ainda não está configurada.");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-blue-100 transition hover:bg-white/10"
          >
            <FiSettings size={19} />
            <span>Configurações</span>
          </button>
        </nav>

        {/* BOTÃO SAIR */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
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

      {/* ÁREA PRINCIPAL */}
      <div className="min-w-0 flex-1">
        {/* CABEÇALHO */}
        <header className="flex h-20 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Abrir menu"
              onClick={() => setMenuAberto(true)}
              className="text-gray-600 lg:hidden"
            >
              <FiMenu size={24} />
            </button>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 sm:text-xl">
                Solicitações
              </h2>
              <p className="text-xs text-gray-500 sm:text-sm">
                Histórico da instituição
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Atualizar histórico"
            onClick={buscarHistorico}
            disabled={carregando}
            className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-[#082d56] disabled:opacity-50"
          >
            <FiRefreshCw
              size={21}
              className={carregando ? "animate-spin" : ""}
            />
          </button>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          {/* TÍTULO E EXPORTAÇÃO */}
          <section className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-2 text-sm font-medium text-[#082d56]">
                Área institucional / Solicitações
              </p>

              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Histórico de solicitações
              </h1>

              <p className="mt-2 text-sm text-gray-500 sm:text-base">
                Acompanhe as alterações registradas nas suas solicitações.
              </p>
            </div>

            <button
              type="button"
              onClick={exportarRelatorio}
              disabled={historicoFiltrado.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#082d56] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[#104580] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <FiDownload size={19} />
              Exportar relatório
            </button>
          </section>

          {/* INDICADORES */}
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Registros no histórico
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {totalRegistros}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[#082d56]">
                  <FiFileText size={22} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Registros aprovados</p>
                  <p className="mt-2 text-2xl font-bold text-green-700">
                    {totalAprovados}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-50 text-green-600">
                  <FiCheckCircle size={22} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Registros pendentes</p>
                  <p className="mt-2 text-2xl font-bold text-amber-600">
                    {totalPendentes}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <FiClock size={22} />
                </div>
              </div>
            </div>
          </section>

          {/* HISTÓRICO */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Registros de alterações
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Informações retornadas pelo histórico da sua instituição.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <FiSearch
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="search"
                    value={pesquisa}
                    onChange={(e) => setPesquisa(e.target.value)}
                    placeholder="Buscar solicitação..."
                    aria-label="Buscar no histórico"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-700 outline-none transition focus:border-[#082d56] focus:ring-2 focus:ring-blue-100 sm:w-64"
                  />
                </div>

                <button
                  type="button"
                  onClick={buscarHistorico}
                  disabled={carregando}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-[#082d56] transition hover:bg-gray-50 disabled:opacity-50"
                >
                  <FiRefreshCw
                    size={17}
                    className={carregando ? "animate-spin" : ""}
                  />
                  Atualizar
                </button>
              </div>
            </div>

            {/* ERRO */}
            {erro && (
              <div className="mb-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <FiAlertCircle size={20} className="shrink-0" />
                  <p className="text-sm">{erro}</p>
                </div>

                <button
                  type="button"
                  onClick={buscarHistorico}
                  className="self-start text-sm font-semibold underline sm:self-auto"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {/* CARREGAMENTO */}
            {carregando ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#082d56]" />
                <p className="text-sm text-gray-500">Carregando histórico...</p>
              </div>
            ) : erro ? null : historicoFiltrado.length === 0 ? (
              /* ESTADO VAZIO */
              <div className="flex min-h-72 flex-col items-center justify-center px-4 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-[#082d56]">
                  {pesquisa ? <FiSearch size={28} /> : <FiFileText size={30} />}
                </div>

                <h3 className="text-lg font-semibold text-gray-800">
                  {pesquisa
                    ? "Nenhum resultado encontrado"
                    : "Nenhum histórico disponível"}
                </h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                  {pesquisa
                    ? "Tente pesquisar por outro título, status ou descrição."
                    : "Quando houver alterações registradas nas solicitações da sua instituição, elas aparecerão aqui."}
                </p>

                {pesquisa && (
                  <button
                    type="button"
                    onClick={() => setPesquisa("")}
                    className="mt-4 font-semibold text-[#082d56] hover:underline"
                  >
                    Limpar pesquisa
                  </button>
                )}
              </div>
            ) : (
              /* LISTA */
              <div className="space-y-4">
                {historicoFiltrado.map((item, indice) => (
                  <article
                    key={
                      item.id_historico ?? `${item.id_solicitacao}-${indice}`
                    }
                    className="rounded-xl border border-gray-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm sm:p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#082d56]">
                          <FiClipboard size={21} />
                        </div>

                        <div className="min-w-0">
                          <h3 className="break-words font-semibold text-gray-900">
                            {item.titulo_solicitacao ||
                              `Solicitação #${item.id_solicitacao ?? "—"}`}
                          </h3>

                          <p className="mt-1 text-xs text-gray-500">
                            Solicitação #{item.id_solicitacao ?? "—"}
                          </p>

                          {item.descricao && (
                            <p className="mt-2 line-clamp-2 break-words text-sm leading-5 text-gray-500">
                              {item.descricao}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <span
                          className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${obterEstiloStatus(item.status)}`}
                        >
                          {item.status || "Não informado"}
                        </span>

                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <FiCalendar size={17} className="shrink-0" />
                          <span>{item.data_alteracao || "Sem data"}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSolicitacaoSelecionada(item)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-[#082d56] transition hover:bg-blue-50"
                        >
                          <FiEye size={17} />
                          Detalhes
                        </button>
                      </div>
                    </div>

                    {item.prioridade && (
                      <div className="mt-4 border-t border-gray-100 pt-3">
                        <p className="text-xs text-gray-500">
                          Prioridade:{" "}
                          <span className="font-semibold text-gray-700">
                            {item.prioridade}
                          </span>
                        </p>
                      </div>
                    )}
                  </article>
                ))}

                <div className="border-t border-gray-100 pt-4 text-center text-sm text-gray-500">
                  Exibindo {historicoFiltrado.length} de {totalRegistros}{" "}
                  {totalRegistros === 1 ? "registro" : "registros"}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
      {/* MODAL DE DETALHES */}
      {solicitacaoSelecionada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setSolicitacaoSelecionada(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-detalhes"
            onClick={(e) => e.stopPropagation()}
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Histórico da solicitação
                </p>

                <h2
                  id="titulo-detalhes"
                  className="mt-2 break-words text-xl font-bold text-[#082d56]"
                >
                  {solicitacaoSelecionada.titulo_solicitacao ||
                    `Solicitação #${solicitacaoSelecionada.id_solicitacao ?? "—"}`}
                </h2>
              </div>

              <button
                type="button"
                aria-label="Fechar detalhes"
                onClick={() => setSolicitacaoSelecionada(null)}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
              >
                <FiX size={21} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Status
                </p>

                <span
                  className={`inline-flex rounded-full border px-3 py-2 text-xs font-semibold ${obterEstiloStatus(solicitacaoSelecionada.status)}`}
                >
                  {solicitacaoSelecionada.status || "Não informado"}
                </span>
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Data da alteração
                </p>

                <p className="flex items-center gap-2 text-sm text-gray-700">
                  <FiCalendar size={16} />
                  {solicitacaoSelecionada.data_alteracao || "Não informada"}
                </p>
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Prioridade
                </p>

                <p className="text-sm text-gray-700">
                  {solicitacaoSelecionada.prioridade || "Não informada"}
                </p>
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Descrição da alteração
                </p>

                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
                  {solicitacaoSelecionada.descricao ||
                    "Nenhuma descrição informada."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSolicitacaoSelecionada(null)}
              className="mt-8 w-full rounded-xl bg-[#082d56] px-5 py-3 font-semibold text-white transition hover:bg-[#104580]"
            >
              Fechar detalhes
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
