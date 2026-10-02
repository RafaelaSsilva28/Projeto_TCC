import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import logo from "../assets/AndraRecursos.png";
import { enderecoServidor } from "../utils";

function Icone({ tipo, className = "h-5 w-5" }) {
  const desenhos = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    instituicao: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M9 21v-4h6v4M8 7h1m6 0h1M8 11h1m6 0h1" />
      </>
    ),
    historico: (
      <>
        <path d="M3 11a9 9 0 1 1 2.5 7" />
        <path d="M3 3v8h8M12 7v5l3 2" />
      </>
    ),
    sino: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    adicionar: <path d="M12 5v14M5 12h14" />,
    configuracoes: (
      <>
        <path d="m9 3-.6 2.4-2 .9-2.3-.7-2 3.4 1.7 1.7v2.6L2.1 15l2 3.4 2.3-.7 2 .9L9 21h6l.6-2.4 2-.9 2.3.7 2-3.4-1.7-1.7v-2.6l1.7-1.7-2-3.4-2.3.7-2-.9L15 3Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    suporte: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4" />
        <path d="M12 17h.01" />
      </>
    ),
    busca: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    usuario: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    sair: (
      <>
        <path d="M9 21H4V3h5M9 12h12m-4-4 4 4-4 4" />
      </>
    ),
    arquivo: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M8 13h8M8 17h6" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    fechar: <path d="m6 6 12 12M18 6 6 18" />,
  };

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {desenhos[tipo]}
    </svg>
  );
}

const itensMenu = [
  {
    href: "#dashboard",
    texto: "Dashboard",
    icone: "dashboard",
    ativo: true,
  },
  {
    href: "#cadastrar",
    texto: "Cadastrar Instituição",
    icone: "instituicao",
  },
  {
    href: "#historico",
    texto: "Histórico",
    icone: "historico",
  },
  {
    href: "#notificacoes",
    texto: "Notificações",
    icone: "sino",
  },
  {
    href: "#solicitacoes",
    texto: "Solicitações",
    icone: "adicionar",
  },
];

export default function PrincipalAdm({
  atualizarStatusSolicitacao,
}) {
  const [dadoslogin, setDadosLogin] = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [solicitacoes, setSolicitacoes] = useState({
    total: 0,
    aprovadas: 0,
    pendentes: 0,
    recusadas: 0,
    recentes: [],
  });

  const navigate = useNavigate();

  useEffect(() => {
    let ativo = true;

    const usuarioLogado = localStorage.getItem(
      "@AndraRecursos:usuario"
    );

    if (usuarioLogado) {
      try {
        setDadosLogin(JSON.parse(usuarioLogado));
      } catch {
        setDadosLogin(null);
      }
    }

    async function buscarSolicitacoes() {
      const token = localStorage.getItem("@AndraRecursos:token");

      const opcoes = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      try {
        const caminhos = [
          "/dashboard/total/solicitacoes",
          "/solicitacoes/aprovadas",
          "/dashboard/solicitacoes/pendentes",
          "/dashboard/solicitacoes/recusadas",
          "/dashboard/solicitacoes/recentes",
        ];

        const respostas = await Promise.all(
          caminhos.map((caminho) =>
            fetch(`${enderecoServidor}${caminho}`, opcoes)
          )
        );

        if (respostas.some((resposta) => !resposta.ok)) {
          throw new Error(
            "Não foi possível carregar os dados do dashboard."
          );
        }

        const [
          total,
          aprovadas,
          pendentes,
          recusadas,
          recentes,
        ] = await Promise.all(
          respostas.map((resposta) => resposta.json())
        );

        if (ativo) {
          setSolicitacoes({
            total: total.total ?? 0,
            aprovadas: aprovadas.aprovadas ?? 0,
            pendentes: pendentes.pendentes ?? 0,
            recusadas: recusadas.recusadas ?? 0,
            recentes: Array.isArray(recentes) ? recentes : [],
          });
        }
      } catch (error) {
        if (ativo) setErro(error.message);
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    buscarSolicitacoes();

    return () => {
      ativo = false;
    };
  }, []);

  function botaoLogout() {
    localStorage.removeItem("@AndraRecursos:token");
    localStorage.removeItem("@AndraRecursos:usuario");
    localStorage.removeItem("@AndraRecursos:lembrar");

    setDadosLogin(null);
    navigate("/");
  }

  const metricas = [
    {
      titulo: "Total de Solicitações",
      valor: solicitacoes.total,
      cor: "border-l-blue-600",
      texto: "text-blue-700",
    },
    {
      titulo: "Total Aprovadas",
      valor: solicitacoes.aprovadas,
      cor: "border-l-green-600",
      texto: "text-green-700",
    },
    {
      titulo: "Total Pendentes",
      valor: solicitacoes.pendentes,
      cor: "border-l-yellow-500",
      texto: "text-yellow-700",
    },
    {
      titulo: "Recusadas",
      valor: solicitacoes.recusadas,
      cor: "border-l-red-600",
      texto: "text-red-700",
    },
  ];

  const classeMenu =
    "flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400";

  const classeSelect =
    "min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

  const classeCabecalhoTabela =
    "px-5 py-4 text-left text-xs font-semibold tracking-wide text-gray-500";

  const classeCelula = "px-5 py-4 text-sm text-gray-600";

  const possuiAcaoStatus =
    typeof atualizarStatusSolicitacao === "function";

  return (
    <div className="min-h-screen bg-[#f4f6f9] font-sans text-gray-800 lg:flex">
      {/* Barra lateral */}
      <aside className="flex w-full flex-col bg-[#082d56] text-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={logo}
              alt="AndraRecursos"
              className="h-14 w-14 shrink-0 object-contain"
            />

            <div className="min-w-0">
              <h2 className="text-lg font-bold">
                AndraRecursos
              </h2>

              <span className="text-xs text-blue-200">
                Gestão Administrativa
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMenuAberto((atual) => !atual)}
            aria-label={
              menuAberto ? "Fechar menu" : "Abrir menu"
            }
            aria-expanded={menuAberto}
            aria-controls="menu-administrativo"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400 lg:hidden"
          >
            <Icone tipo={menuAberto ? "fechar" : "menu"} />
          </button>
        </div>

        <div
          id="menu-administrativo"
          className={`${
            menuAberto ? "flex" : "hidden"
          } flex-col lg:flex lg:min-h-0 lg:flex-1`}
        >
          <nav
            aria-label="Menu administrativo"
            className="space-y-2 px-4 py-6"
          >
            {itensMenu.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuAberto(false)}
                aria-current={item.ativo ? "page" : undefined}
                className={`${classeMenu} ${
                  item.ativo
                    ? "bg-[#164675] text-white"
                    : "text-blue-100 hover:bg-white/10"
                }`}
              >
                <Icone
                  tipo={item.icone}
                  className="h-5 w-5 shrink-0"
                />

                {item.texto}
              </a>
            ))}
          </nav>

          <div className="mt-auto space-y-2 border-t border-white/10 px-4 py-5">
            <a
              href="#configuracoes"
              onClick={() => setMenuAberto(false)}
              className={`${classeMenu} text-blue-100 hover:bg-white/10`}
            >
              <Icone tipo="configuracoes" />
              Configurações
            </a>

            <a
              href="#suporte"
              onClick={() => setMenuAberto(false)}
              className={`${classeMenu} text-blue-100 hover:bg-white/10`}
            >
              <Icone tipo="suporte" />
              Suporte
            </a>
          </div>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center gap-4 border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
          <span className="min-w-0 flex-1 text-base font-semibold text-[#082d56] sm:text-lg">
            Dashboard Administrativo
          </span>

          <div className="order-3 flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 xl:order-none xl:w-64">
            <Icone
              tipo="busca"
              className="h-5 w-5 shrink-0 text-gray-400"
            />

            <input
              type="search"
              aria-label="Buscar recursos"
              placeholder="Buscar recursos..."
              className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-gray-400"
            />
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <button
              type="button"
              aria-label="Configurações"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <Icone tipo="configuracoes" />
            </button>

            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#082d56]">
                <Icone tipo="usuario" />
              </span>

              <div className="hidden sm:block">
                <span className="block text-xs text-gray-500">
                  Área
                </span>

                <span
                  title={dadoslogin?.nome || "Administrador"}
                  className="block max-w-40 truncate text-sm font-semibold"
                >
                  Administrador
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={botaoLogout}
              className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-red-600 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600"
            >
              <Icone tipo="sair" className="h-4 w-4" />
              Sair
            </button>
          </div>
        </header>

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          {/* Título */}
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
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#082d56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#164675] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:w-auto"
            >
              <Icone tipo="arquivo" className="h-4 w-4" />
              Exportar Relatório
            </button>
          </div>

          {erro && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {erro}
            </div>
          )}

          {/* Métricas */}
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

          {/* Filtros */}
          <section
            aria-label="Filtros"
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <span className="mb-4 block text-sm font-semibold text-gray-700">
              Classificar por:
            </span>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
              {[
                "STATUS",
                "TIPOS",
                "INSTITUIÇÃO",
                "DATA",
                "PRIORIDADE",
              ].map((filtro) => (
                <select
                  key={filtro}
                  aria-label={`Filtrar por ${filtro.toLowerCase()}`}
                  className={classeSelect}
                >
                  <option>{filtro}</option>
                </select>
              ))}

              <button
                type="button"
                className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                Limpar
              </button>
            </div>
          </section>

          {/* Tabela */}
          <section className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <h2 className="border-b border-gray-200 px-5 py-5 text-lg font-semibold text-[#082d56]">
              Solicitações Recentes
            </h2>

            <div
              className="overflow-x-auto"
              tabIndex={0}
              role="region"
              aria-label="Tabela de solicitações recentes"
            >
              <table className="w-full min-w-[900px] border-collapse">
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
                        className="px-5 py-10 text-center text-sm text-gray-500"
                      >
                        Carregando solicitações...
                      </td>
                    </tr>
                  ) : solicitacoes.recentes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-sm text-gray-500"
                      >
                        Nenhuma solicitação encontrada.
                      </td>
                    </tr>
                  ) : (
                    solicitacoes.recentes.map((solicitacao) => {
                      const status = solicitacao.status;

                      const corStatus =
                        status === "aprovada"
                          ? "bg-green-100 text-green-700"
                          : status === "recusada"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-800";

                      const corPrioridade =
                        solicitacao.prioridade === "Alta"
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700";

                      return (
                        <tr
                          key={solicitacao.id_solicitacoes}
                          className="transition hover:bg-gray-50"
                        >
                          <td className={classeCelula}>
                            <strong className="text-gray-800">
                              {solicitacao.id_solicitacoes}
                            </strong>
                          </td>

                          <td className={classeCelula}>
                            {solicitacao.nome_instituicao}
                          </td>

                          <td className={classeCelula}>
                            {solicitacao.titulo}
                          </td>

                          <td className={classeCelula}>
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${corPrioridade}`}
                            >
                              {solicitacao.prioridade?.toUpperCase()}
                            </span>
                          </td>

                          <td className={classeCelula}>
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${corStatus}`}
                            >
                              {status}
                            </span>
                          </td>

                          <td
                            className={`${classeCelula} whitespace-nowrap`}
                          >
                            {new Date(
                              solicitacao.data_pedido
                            ).toLocaleDateString("pt-BR")}
                          </td>

                          <td className={classeCelula}>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={
                                  status === "aprovada" ||
                                  !possuiAcaoStatus
                                }
                                onClick={() =>
                                  atualizarStatusSolicitacao(
                                    solicitacao.id_solicitacoes,
                                    "aprovada"
                                  )
                                }
                                className="min-h-11 rounded-md bg-green-100 px-3 py-2 text-xs font-bold text-green-700 transition hover:bg-green-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-600 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                APROVAR
                              </button>

                              <button
                                type="button"
                                disabled={!possuiAcaoStatus}
                                onClick={() =>
                                  atualizarStatusSolicitacao(
                                    solicitacao.id_solicitacoes,
                                    "recusada"
                                  )
                                }
                                className="min-h-11 rounded-md bg-red-100 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-40"
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
          </section>
        </main>
      </div>
    </div>
  );
}