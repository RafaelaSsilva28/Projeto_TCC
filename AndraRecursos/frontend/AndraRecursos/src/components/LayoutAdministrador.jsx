import { useCallback, useEffect, useRef, useState } from "react";
import {
  NavLink,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  FiBell,
  FiCheck,
  FiChevronRight,
  FiClock,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";

import logo from "../assets/AndraRecursos.png";
import IconeAdministrador from "./IconesAdministrador";
import { enderecoServidor } from "../utils";

const API = String(enderecoServidor).replace(/\/$/, "");
const TOKEN_KEY = "@AndraRecursos:token";
const USUARIO_KEY = "@AndraRecursos:usuario";
const LIMITE_PREVIEW = 5;

const menuPrincipal = [
  { texto: "Dashboard", caminho: "/principal-adm", icone: "dashboard" },
  { texto: "Cadastrar Instituição", caminho: "/cadastrarInstituicao", icone: "instituicao" },
  { texto: "Histórico", caminho: "/historico-adm", icone: "historico" },
  { texto: "Notificações", caminho: "/notificacoes", icone: "sino" },
  { texto: "Solicitações", caminho: "/solicitacoes", icone: "adicionar" },
];

const menuInferior = [
  { texto: "Configurações", caminho: "/configuracoes", icone: "configuracoes" },
];

const titulosPaginas = {
  "/principal-adm": "Dashboard Administrativo",
  "/cadastrarInstituicao": "Cadastrar Instituição",
  "/historico-adm": "Histórico Administrativo",
  "/notificacoes": "Notificações",
  "/solicitacoes": "Solicitações",
  "/configuracoes": "Configurações",
  "/perfilAdministrador": "Perfil do Administrador",
};

function formatarData(valor) {
  if (!valor) return "Data não informada";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function resumir(texto, limite = 105) {
  const valor = String(texto || "Nova notificação");
  return valor.length > limite ? `${valor.slice(0, limite).trim()}…` : valor;
}

export default function LayoutAdministrador({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuAberto, setMenuAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);
  const [carregandoNotificacoes, setCarregandoNotificacoes] = useState(true);
  const [erroNotificacoes, setErroNotificacoes] = useState("");
  const [painelNotificacoesAberto, setPainelNotificacoesAberto] = useState(false);
  const [marcandoId, setMarcandoId] = useState(null);

  const sinoRef = useRef(null);
  const painelRef = useRef(null);

  let usuario = null;
  try {
    usuario = JSON.parse(localStorage.getItem(USUARIO_KEY) || "null");
  } catch {
    usuario = null;
  }

  const tituloAtual = titulosPaginas[location.pathname] || "AndraRecursos";
  const naoLidas = notificacoes.filter((item) => !item.lida).length;
  const recentes = notificacoes.slice(0, LIMITE_PREVIEW);

  const requisicao = useCallback(async (caminho, opcoes = {}) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Sessão expirada. Faça login novamente.");

    const resposta = await fetch(`${API}${caminho}`, {
      ...opcoes,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(opcoes.body ? { "Content-Type": "application/json" } : {}),
        ...opcoes.headers,
      },
    });

    const dados = await resposta.json().catch(() => null);
    if (!resposta.ok) {
      throw new Error(
        dados?.error || dados?.message || `Erro ${resposta.status} na API.`
      );
    }
    return dados;
  }, []);

  const carregarNotificacoes = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregandoNotificacoes(true);
    setErroNotificacoes("");

    try {
      const dados = await requisicao("/notificacoes");
      if (!Array.isArray(dados)) {
        throw new Error("A API não retornou uma lista válida de notificações.");
      }

      const ordenadas = [...dados].sort((a, b) => {
        const dataA = new Date(a.data_notificacao || 0).getTime();
        const dataB = new Date(b.data_notificacao || 0).getTime();
        return dataB - dataA;
      });

      setNotificacoes(ordenadas);
    } catch (error) {
      setErroNotificacoes(error.message || "Não foi possível carregar as notificações.");
    } finally {
      if (!silencioso) setCarregandoNotificacoes(false);
    }
  }, [requisicao]);

  useEffect(() => {
    carregarNotificacoes();

    // Atualiza a contagem periodicamente para refletir novas notificações da API.
    const intervalo = window.setInterval(() => {
      if (localStorage.getItem(TOKEN_KEY)) carregarNotificacoes(true);
    }, 30000);

    return () => window.clearInterval(intervalo);
  }, [carregarNotificacoes]);

  useEffect(() => {
    if (!painelNotificacoesAberto) return undefined;

    function fecharAoClicarFora(evento) {
      if (
        painelRef.current &&
        !painelRef.current.contains(evento.target) &&
        sinoRef.current &&
        !sinoRef.current.contains(evento.target)
      ) {
        setPainelNotificacoesAberto(false);
      }
    }

    function fecharComEscape(evento) {
      if (evento.key === "Escape") setPainelNotificacoesAberto(false);
    }

    document.addEventListener("mousedown", fecharAoClicarFora);
    document.addEventListener("keydown", fecharComEscape);
    return () => {
      document.removeEventListener("mousedown", fecharAoClicarFora);
      document.removeEventListener("keydown", fecharComEscape);
    };
  }, [painelNotificacoesAberto]);

  useEffect(() => {
    setPainelNotificacoesAberto(false);
  }, [location.pathname]);

  function sair() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    localStorage.removeItem("@AndraRecursos:lembrar");
    navigate("/", { replace: true });
  }

  const classeMenu =
    "flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 hover:bg-white/10";

  function links(itens) {
    return itens.map((item) => (
      <NavLink
        key={item.caminho}
        to={item.caminho}
        onClick={() => setMenuAberto(false)}
        className={({ isActive }) =>
          `${classeMenu} ${
            isActive
              ? "bg-[#164675] text-white shadow-sm"
              : "text-blue-100 hover:text-white"
          }`
        }
      >
        <IconeAdministrador tipo={item.icone} className="h-5 w-5 shrink-0" />
        <span>{item.texto}</span>
      </NavLink>
    ));
  }

  async function marcarComoLida(item) {
    if (item.lida || marcandoId === item.id_notificacao) return;

    setMarcandoId(item.id_notificacao);
    try {
      await requisicao(`/notificacoes/${item.id_notificacao}/lida`, {
        method: "PATCH",
      });

      setNotificacoes((anteriores) =>
        anteriores.map((notificacao) =>
          notificacao.id_notificacao === item.id_notificacao
            ? { ...notificacao, lida: true }
            : notificacao
        )
      );
    } catch (error) {
      setErroNotificacoes(error.message || "Não foi possível marcar como lida.");
    } finally {
      setMarcandoId(null);
    }
  }

  async function abrirNotificacao(item) {
    if (!item.lida) {
      try {
        await requisicao(`/notificacoes/${item.id_notificacao}/lida`, {
          method: "PATCH",
        });
        setNotificacoes((anteriores) =>
          anteriores.map((notificacao) =>
            notificacao.id_notificacao === item.id_notificacao
              ? { ...notificacao, lida: true }
              : notificacao
          )
        );
      } catch (error) {
        setErroNotificacoes(error.message || "Não foi possível atualizar a notificação.");
        return;
      }
    }

    setPainelNotificacoesAberto(false);
    if (item.id_solicitacao) {
      navigate(`/solicitacoes/${item.id_solicitacao}`);
    } else {
      navigate("/notificacoes");
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] font-sans text-gray-800 lg:flex">
      {/* MENU LATERAL */}
      <aside className="flex w-full flex-col bg-[#082d56] text-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={logo}
              alt="AndraRecursos"
              className="h-14 w-14 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <h2 className="text-lg font-bold">AndraRecursos</h2>
              <span className="text-xs text-blue-200">Gestão Administrativa</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMenuAberto((anterior) => !anterior)}
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuAberto}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition hover:bg-white/10 lg:hidden"
          >
            <IconeAdministrador tipo={menuAberto ? "fechar" : "menu"} />
          </button>
        </div>

        <div
          className={`${
            menuAberto ? "flex" : "hidden"
          } flex-col lg:flex lg:min-h-0 lg:flex-1`}
        >
          <nav aria-label="Menu administrativo" className="space-y-2 px-4 py-6">
            {links(menuPrincipal)}
          </nav>

          <nav
            aria-label="Menu inferior"
            className="mt-auto space-y-2 border-t border-white/10 px-4 py-5"
          >
            {links(menuInferior)}
          </nav>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-4 border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
          <span className="min-w-0 flex-1 text-base font-semibold text-[#082d56] sm:text-lg">
            {tituloAtual}
          </span>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            {/* SINO + CONTADOR + PAINEL FLUTUANTE */}
            <div className="relative">
              <button
                ref={sinoRef}
                type="button"
                onClick={() => {
                  const abrir = !painelNotificacoesAberto;
                  setPainelNotificacoesAberto(abrir);
                  if (abrir) carregarNotificacoes(true);
                }}
                title={naoLidas ? `${naoLidas} notificações não lidas` : "Notificações"}
                aria-label={`Notificações${naoLidas ? `, ${naoLidas} não lidas` : ""}`}
                aria-expanded={painelNotificacoesAberto}
                aria-haspopup="dialog"
                className={`relative flex h-11 w-11 items-center justify-center rounded-xl text-[#082d56] transition hover:bg-blue-50 ${
                  painelNotificacoesAberto ? "bg-blue-50" : ""
                }`}
              >
                <FiBell
                  size={21}
                  className={naoLidas > 0 ? "origin-top animate-[sino_1.8s_ease-in-out_infinite]" : ""}
                />

                {naoLidas > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-h-[20px] min-w-[20px] animate-[badgePulse_2s_ease-in-out_infinite] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-extrabold leading-none text-white shadow-sm">
                    {naoLidas > 99 ? "99+" : naoLidas}
                  </span>
                )}
              </button>

              {painelNotificacoesAberto && (
                <section
                  ref={painelRef}
                  role="dialog"
                  aria-label="Notificações recentes"
                  className="absolute right-0 top-[calc(100%+12px)] z-[100] w-[min( calc(100vw-2rem), 390px)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-left text-slate-800 shadow-[0_18px_55px_rgba(8,45,86,0.22)] sm:w-[390px]"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-[#082d56]">Notificações</h2>
                        {naoLidas > 0 && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                            {naoLidas} não lida{naoLidas !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Atualizações recentes do sistema</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => carregarNotificacoes()}
                        disabled={carregandoNotificacoes}
                        title="Atualizar notificações"
                        aria-label="Atualizar notificações"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                      >
                        <FiRefreshCw className={carregandoNotificacoes ? "animate-spin" : ""} size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPainelNotificacoesAberto(false)}
                        aria-label="Fechar notificações"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                      >
                        <FiX size={17} />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[min(65vh,440px)] overflow-y-auto">
                    {carregandoNotificacoes && notificacoes.length === 0 ? (
                      <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500">
                        <FiRefreshCw className="animate-spin" />
                        Carregando notificações...
                      </div>
                    ) : erroNotificacoes && notificacoes.length === 0 ? (
                      <div className="px-4 py-7 text-center">
                        <p className="text-sm font-medium text-red-600">{erroNotificacoes}</p>
                        <button
                          type="button"
                          onClick={() => carregarNotificacoes()}
                          className="mt-3 text-xs font-bold text-[#1759ad] hover:underline"
                        >
                          Tentar novamente
                        </button>
                      </div>
                    ) : recentes.length === 0 ? (
                      <div className="flex flex-col items-center px-5 py-9 text-center">
                        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#1759ad]">
                          <FiBell size={22} />
                        </span>
                        <p className="text-sm font-semibold text-slate-700">Tudo em dia!</p>
                        <p className="mt-1 text-xs text-slate-500">Você não tem notificações no momento.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {recentes.map((item) => (
                          <article
                            key={item.id_notificacao}
                            className={`group relative px-4 py-3 transition hover:bg-blue-50/70 ${
                              item.lida ? "bg-white" : "bg-blue-50/60"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => abrirNotificacao(item)}
                              className="block w-full pr-1 text-left"
                            >
                              <span className="flex items-start gap-3">
                                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                  item.lida
                                    ? "bg-slate-100 text-slate-500"
                                    : "bg-blue-100 text-[#1759ad]"
                                }`}>
                                  <FiBell size={16} />
                                </span>

                                <span className="min-w-0 flex-1">
                                  <span className="flex items-start justify-between gap-2">
                                    <span className={`text-xs leading-5 ${
                                      item.lida ? "font-medium text-slate-700" : "font-bold text-[#082d56]"
                                    }`}>
                                      {item.titulo_solicitacao || item.tipo_informacao || "Notificação"}
                                    </span>
                                    {!item.lida && (
                                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" title="Não lida" />
                                    )}
                                  </span>
                                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                                    {resumir(item.mensagem)}
                                  </span>
                                  {item.nome_instituicao && (
                                    <span className="mt-1 block truncate text-[11px] font-medium text-[#1759ad]">
                                      {item.nome_instituicao}
                                    </span>
                                  )}
                                  <span className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                                    <FiClock size={11} />
                                    {formatarData(item.data_notificacao)}
                                  </span>
                                </span>
                              </span>
                            </button>

                            {!item.lida && (
                              <button
                                type="button"
                                title="Marcar como lida"
                                aria-label="Marcar notificação como lida"
                                onClick={() => marcarComoLida(item)}
                                disabled={marcandoId === item.id_notificacao}
                                className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-lg border border-blue-100 bg-white text-[#1759ad] opacity-100 transition hover:bg-blue-100 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                              >
                                {marcandoId === item.id_notificacao ? (
                                  <FiRefreshCw className="animate-spin" size={13} />
                                ) : (
                                  <FiCheck size={14} />
                                )}
                              </button>
                            )}
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50 p-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPainelNotificacoesAberto(false);
                        navigate("/notificacoes");
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold text-[#1759ad] transition hover:bg-blue-50"
                    >
                      Ver todas as notificações
                      <FiChevronRight size={15} />
                    </button>
                  </div>
                </section>
              )}
            </div>

            {/* CONFIGURAÇÕES */}
            <button
              type="button"
              onClick={() => navigate("/configuracoes")}
              title="Configurações"
              aria-label="Configurações"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-[#082d56] transition hover:bg-gray-100"
            >
              <IconeAdministrador tipo="configuracoes" />
            </button>

            {/* PERFIL DO ADMINISTRADOR */}
            <button
              type="button"
              onClick={() => navigate("/perfilAdministrador")}
              title="Perfil do Administrador"
              className="flex items-center gap-3 rounded-lg transition hover:bg-gray-50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#082d56]">
                <IconeAdministrador tipo="usuario" />
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-xs text-gray-500">Área</span>
                <span className="block max-w-40 truncate text-sm font-semibold text-[#082d56]">
                  {usuario?.nome || "Administrador"}
                </span>
              </span>
            </button>

            {/* SAIR */}
            <button
              type="button"
              onClick={sair}
              className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              <IconeAdministrador tipo="sair" className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Animações locais do contador e do sino */}
      <style>{`
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
        @keyframes sino {
          0%, 88%, 100% { transform: rotate(0deg); }
          90% { transform: rotate(12deg); }
          92% { transform: rotate(-12deg); }
          94% { transform: rotate(9deg); }
          96% { transform: rotate(-6deg); }
          98% { transform: rotate(3deg); }
        }
      `}</style>
    </div>
  );
}
