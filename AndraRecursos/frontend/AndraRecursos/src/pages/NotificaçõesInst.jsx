import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBell,
  FiRefreshCw,
  FiInfo,
  FiAlertCircle,
  FiCheckCircle,
  FiAlertTriangle,
} from "react-icons/fi";
import { enderecoServidor } from "../utils";

import LayoutInstituicao from "../components/LayoutInstituicao";

export default function NotificacoesInst() {
  const navigate = useNavigate();

  const [instituicao, setInstituicao] = useState(null);
  const [notificacoes, setNotificacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    const token = localStorage.getItem("@AndraRecursos:token");

    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    async function carregarDados() {
      try {
        setCarregando(true);
        setErro("");

        const [respostaInstituicao, respostaNotificacoes] = await Promise.all([
          fetch(`${enderecoServidor}/instituicoes/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${enderecoServidor}/notificacoes`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (
          respostaInstituicao.status === 401 ||
          respostaInstituicao.status === 403
        ) {
          localStorage.removeItem("@AndraRecursos:token");
          navigate("/", { replace: true });
          return;
        }

        if (!respostaInstituicao.ok) {
          throw new Error("Não foi possível carregar os dados da instituição.");
        }

        if (!respostaNotificacoes.ok) {
          throw new Error("Não foi possível carregar as notificações.");
        }

        const dadosInstituicao = await respostaInstituicao.json();
        const dadosNotificacoes = await respostaNotificacoes.json();

        if (ativo) {
          setInstituicao(dadosInstituicao);

          setNotificacoes(
            Array.isArray(dadosNotificacoes) ? dadosNotificacoes : [],
          );
        }
      } catch (error) {
        console.error("Erro ao carregar notificações:", error);

        if (ativo) {
          setErro(error.message || "Ocorreu um erro ao carregar a página.");
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarDados();

    return () => {
      ativo = false;
    };
  }, [navigate]);

  async function atualizarNotificacoes() {
    const token = localStorage.getItem("@AndraRecursos:token");

    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    try {
      setCarregando(true);
      setErro("");

      const resposta = await fetch(`${enderecoServidor}/notificacoes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resposta.ok) {
        throw new Error("Não foi possível atualizar as notificações.");
      }

      const dados = await resposta.json();

      setNotificacoes(Array.isArray(dados) ? dados : []);
    } catch (error) {
      console.error("Erro ao atualizar notificações:", error);
      setErro(error.message || "Erro ao atualizar as notificações.");
    } finally {
      setCarregando(false);
    }
  }

  function obterTipo(tipo) {
    const valor = String(tipo || "").toLowerCase();

    if (
      valor.includes("crític") ||
      valor.includes("crit") ||
      valor.includes("urgente") ||
      valor.includes("erro")
    ) {
      return {
        icone: <FiAlertCircle size={21} />,
        cor: "bg-red-50 text-red-600",
        titulo: tipo || "Alerta",
      };
    }

    if (valor.includes("alerta") || valor.includes("aviso")) {
      return {
        icone: <FiAlertTriangle size={21} />,
        cor: "bg-amber-50 text-amber-600",
        titulo: tipo || "Aviso",
      };
    }

    if (valor.includes("sucesso") || valor.includes("aprova")) {
      return {
        icone: <FiCheckCircle size={21} />,
        cor: "bg-green-50 text-green-600",
        titulo: tipo || "Sucesso",
      };
    }

    return {
      icone: <FiInfo size={21} />,
      cor: "bg-blue-50 text-blue-700",
      titulo: tipo || "Informação",
    };
  }

  return (
    <LayoutInstituicao nomeInstituicao={instituicao?.nome}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#082d56]">
            Notificações
          </h1>

          <p className="mt-1 text-sm sm:text-base text-gray-500">
            Notificações sobre as solicitações
          </p>
        </div>

        {erro && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 text-red-600">
              <FiAlertCircle size={21} className="mt-0.5 shrink-0" />
              <p className="text-sm">{erro}</p>
            </div>

            <button
              type="button"
              onClick={atualizarNotificacoes}
              className="self-start rounded-lg bg-[#082d56] px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 transition sm:self-auto"
            >
              Tentar novamente
            </button>
          </div>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm sm:p-6 lg:p-8">
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-600">
                Notificações recebidas
              </h2>

              <button
                type="button"
                onClick={atualizarNotificacoes}
                disabled={carregando}
                aria-label="Atualizar notificações"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#082d56] transition hover:bg-blue-50 disabled:opacity-50"
              >
                <FiRefreshCw
                  size={16}
                  className={carregando ? "animate-spin" : ""}
                />
                <span className="hidden sm:inline">Atualizar</span>
              </button>
            </div>

            {carregando ? (
              <div className="py-12 text-center text-sm text-gray-500">
                Carregando notificações...
              </div>
            ) : notificacoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 px-4 py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#082d56]">
                  <FiBell size={26} />
                </div>

                <h3 className="mt-4 font-semibold text-gray-700">
                  Nenhuma notificação encontrada
                </h3>

                <p className="mt-2 max-w-md text-sm text-gray-500">
                  Quando o administrador enviar notificações para sua
                  instituição, elas aparecerão nesta área.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {notificacoes.map((notificacao) => {
                  const tipo = obterTipo(notificacao.tipo_informacao);

                  return (
                    <article
                      key={notificacao.id_notificacao}
                      className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm sm:items-center sm:gap-4 sm:p-5"
                    >
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tipo.cor}`}
                      >
                        {tipo.icone}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-gray-800">
                            {tipo.titulo}
                          </h3>
                        </div>

                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-500">
                          {notificacao.mensagem}
                        </p>

                        <p className="mt-2 text-xs text-gray-400">
                          Notificação #{notificacao.id_notificacao}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </LayoutInstituicao>
  );
}
