import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiDownload,
  FiFileText,
  FiClock,
  FiSearch,
  FiEye,
  FiX,
  FiRefreshCw,
  FiAlertCircle,
} from "react-icons/fi";
import { enderecoServidor } from "../utils";

export default function HistoricoInst() {
  const navigate = useNavigate();

  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [pesquisa, setPesquisa] = useState("");
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState(null);

  useEffect(() => {
    buscarHistorico();
  }, []);

  async function buscarHistorico() {
    setCarregando(true);
    setErro("");

    try {
      const token = localStorage.getItem("@AndraRecursos:token");

      if (!token) {
        navigate("/");
        return;
      }

      const resposta = await fetch(
        `${enderecoServidor}/historico-instituicao`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (resposta.status === 401) {
        navigate("/");
        return;
      }

      if (!resposta.ok) {
        throw new Error("Não foi possível carregar o histórico.");
      }

      const dados = await resposta.json();
      setHistorico(Array.isArray(dados) ? dados : []);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
      setErro(error.message || "Erro ao carregar o histórico.");
    } finally {
      setCarregando(false);
    }
  }

  const historicoFiltrado = historico.filter((item) => {
    const titulo = item.titulo_solicitacao || "";
    const status = item.status || "";
    const descricao = item.descricao || "";

    const termo = pesquisa.toLowerCase();

    return (
      titulo.toLowerCase().includes(termo) ||
      status.toLowerCase().includes(termo) ||
      descricao.toLowerCase().includes(termo)
    );
  });

  function obterEstiloStatus(status) {
    const valor = (status || "").toLowerCase();

    if (valor.includes("aprov")) {
      return "bg-green-100 text-green-700 border-green-200";
    }

    if (
      valor.includes("análise") ||
      valor.includes("analise") ||
      valor.includes("pendente")
    ) {
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }

    if (
      valor.includes("rejeit") ||
      valor.includes("recus") ||
      valor.includes("cancel")
    ) {
      return "bg-red-100 text-red-700 border-red-200";
    }

    if (valor.includes("conclu") || valor.includes("finaliz")) {
      return "bg-blue-100 text-blue-700 border-blue-200";
    }

    return "bg-gray-100 text-gray-700 border-gray-200";
  }

  function exportarRelatorio() {
    if (historicoFiltrado.length === 0) {
      alert("Não há registros para exportar.");
      return;
    }

    const escaparCSV = (valor) =>
      `"${String(valor ?? "").replace(/"/g, '""')}"`;

    const colunas = [
      "Solicitação",
      "Status",
      "Prioridade",
      "Data da alteração",
      "Descrição",
    ];

    const linhas = historicoFiltrado.map((item) => [
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
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#e9e9e9] px-4 py-6 sm:px-6 lg:px-8">
      <main className="mx-auto max-w-7xl">
        {/* CABEÇALHO */}
        <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate("/principal-inst")}
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#082d56] transition hover:text-blue-700"
            >
              <FiArrowLeft size={17} />
              Voltar ao painel
            </button>

            <h1 className="text-3xl font-bold tracking-tight text-[#082d56] sm:text-4xl">
              Histórico
            </h1>

            <p className="mt-1 text-sm font-medium text-gray-500 sm:text-base">
              Histórico de recursos solicitados
            </p>
          </div>

          <button
            type="button"
            onClick={exportarRelatorio}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#082d56] px-5 py-3.5 font-semibold text-white shadow-sm transition hover:bg-[#104580] sm:w-auto"
          >
            <FiDownload size={20} />
            Exportar Relatório
          </button>
        </div>

        {/* CONTEÚDO */}
        <section className="min-h-[450px] rounded-3xl bg-white p-4 shadow-sm sm:p-6 lg:p-8">
          {/* PESQUISA E CONTADOR */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#082d56]">
                Solicitações anteriores
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Consulte as atualizações das suas solicitações.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <FiSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />

                <input
                  type="text"
                  value={pesquisa}
                  onChange={(e) => setPesquisa(e.target.value)}
                  placeholder="Buscar solicitação..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#082d56] focus:ring-2 focus:ring-blue-100 sm:w-64"
                />
              </div>

              <button
                type="button"
                onClick={buscarHistorico}
                disabled={carregando}
                title="Atualizar histórico"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-[#082d56] transition hover:bg-gray-50 disabled:opacity-50"
              >
                <FiRefreshCw
                  className={carregando ? "animate-spin" : ""}
                  size={17}
                />
                Atualizar
              </button>
            </div>
          </div>

          {/* ERRO */}
          {erro && (
            <div className="mb-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <FiAlertCircle size={20} />
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
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-[#082d56]" />

              <p className="text-sm text-gray-500">Carregando histórico...</p>
            </div>
          ) : erro ? null : historicoFiltrado.length === 0 ? (
            /* ESTADO VAZIO */
            <div className="flex min-h-72 flex-col items-center justify-center px-4 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-[#082d56]">
                <FiFileText size={30} />
              </div>

              <h3 className="text-lg font-semibold text-[#082d56]">
                {pesquisa
                  ? "Nenhum resultado encontrado"
                  : "Nenhum histórico disponível"}
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                {pesquisa
                  ? "Tente pesquisar usando outro título, status ou descrição."
                  : "Quando houver atualizações nas solicitações da sua instituição, elas aparecerão aqui."}
              </p>
            </div>
          ) : (
            /* LISTA DE SOLICITAÇÕES */
            <div className="space-y-4">
              {historicoFiltrado.map((item, indice) => (
                <article
                  key={item.id_historico ?? `${item.id_solicitacao}-${indice}`}
                  className="rounded-2xl border border-gray-100 bg-[#f2f2f2] p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6"
                >
                  <div className="grid grid-cols-1 items-center gap-5 lg:grid-cols-[minmax(0,1.5fr)_auto_auto_auto] lg:gap-8">
                    {/* TÍTULO */}
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-semibold leading-snug text-[#082d56] sm:text-xl">
                        {item.titulo_solicitacao ||
                          `Solicitação #${item.id_solicitacao}`}
                      </h3>

                      {item.descricao && (
                        <p className="mt-2 line-clamp-2 text-sm leading-5 text-gray-500">
                          {item.descricao}
                        </p>
                      )}
                    </div>

                    {/* STATUS */}
                    <div>
                      <span
                        className={`inline-flex max-w-full rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-wide ${obterEstiloStatus(item.status)}`}
                      >
                        {item.status || "Não informado"}
                      </span>
                    </div>

                    {/* DATA */}
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500 sm:text-base">
                      <FiClock size={18} className="shrink-0 text-gray-400" />
                      <span>{item.data_alteracao || "Sem data"}</span>
                    </div>

                    {/* DETALHES */}
                    <button
                      type="button"
                      onClick={() => setSolicitacaoSelecionada(item)}
                      className="inline-flex items-center justify-center gap-2 justify-self-start font-semibold text-[#082d56] transition hover:text-blue-700 hover:underline lg:justify-self-end"
                    >
                      <FiEye size={18} />
                      Ver Solicitação
                    </button>
                  </div>

                  {item.prioridade && (
                    <div className="mt-4 border-t border-gray-200 pt-3">
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

              <p className="pt-3 text-center text-sm text-gray-500">
                Exibindo {historicoFiltrado.length}{" "}
                {historicoFiltrado.length === 1 ? "registro" : "registros"}
              </p>
            </div>
          )}
        </section>

        {/* MODAL DE DETALHES */}
        {solicitacaoSelecionada && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setSolicitacaoSelecionada(null)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-detalhes"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:p-8"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Detalhes da solicitação
                  </p>

                  <h2
                    id="titulo-detalhes"
                    className="mt-2 text-xl font-bold text-[#082d56]"
                  >
                    {solicitacaoSelecionada.titulo_solicitacao ||
                      `Solicitação #${solicitacaoSelecionada.id_solicitacao}`}
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
                    className={`inline-flex rounded-full border px-3 py-2 text-xs font-bold uppercase ${obterEstiloStatus(solicitacaoSelecionada.status)}`}
                  >
                    {solicitacaoSelecionada.status || "Não informado"}
                  </span>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Data da alteração
                  </p>

                  <p className="text-sm text-gray-700">
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
                    Descrição da atualização
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
                Fechar
              </button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
