
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FiHome,
  FiClipboard,
  FiClock,
  FiCheckCircle,
  FiUser,
  FiFileText,
  FiPhone,
  FiMapPin,
  FiRefreshCw,
  FiArrowRight,
  FiAlertCircle,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";

const API = String(enderecoServidor).replace(/\/$/, "");

function obterToken() {
  const token = localStorage.getItem("@AndraRecursos:token");

  if (token && token !== "null" && token !== "undefined") {
    return token;
  }

  return null;
}

function CartaoIndicador({ titulo, valor, Icone, cor, fundo }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{titulo}</p>
        <p className="mt-3 break-words text-2xl font-bold text-[#082d56]">
          {valor}
        </p>
      </div>

      <span className={`ml-3 shrink-0 rounded-xl p-3 ${fundo} ${cor}`}>
        <Icone size={21} />
      </span>
    </div>
  );
}

function DadoInstituicao({ Icone, titulo, valor }) {
  return (
    <div className="flex items-start gap-3">
      <Icone size={19} className="mt-0.5 shrink-0 text-[#1755ad]" />

      <div className="min-w-0">
        <p className="text-xs text-slate-500">{titulo}</p>
        <p className="mt-1 break-words text-sm font-semibold text-[#082d56]">
          {valor || "Não informado"}
        </p>
      </div>
    </div>
  );
}

function normalizarStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function obterClasseStatus(status) {
  switch (normalizarStatus(status)) {
    case "recusada":
    case "recusado":
      return "bg-red-100 text-red-700";

    case "aprovada":
    case "aprovado":
      return "bg-green-100 text-green-700";

    case "pendente":
      return "bg-blue-100 text-blue-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function PrincipalInst() {
  const navigate = useNavigate();

  const [instituicao, setInstituicao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [solicitacoes, setSolicitacoes] = useState([]);

  useEffect(() => {
    const controlador = new AbortController();
    const token = obterToken();

    if (!token) {
      navigate("/", { replace: true });
      return () => controlador.abort();
    }

    async function buscarDados() {
      setCarregando(true);
      setErro("");

      try {
        const configuracao = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controlador.signal,
        };

        const [respostaInstituicao, respostaSolicitacoes] =
          await Promise.all([
            fetch(`${API}/instituicoes/me`, configuracao),
            fetch(`${API}/solicitacoes/instituicoes`, configuracao),
          ]);

        if (
          respostaInstituicao.status === 401 ||
          respostaInstituicao.status === 403 ||
          respostaSolicitacoes.status === 401 ||
          respostaSolicitacoes.status === 403
        ) {
          localStorage.removeItem("@AndraRecursos:token");
          navigate("/", { replace: true });
          return;
        }

        const dadosInstituicao = await respostaInstituicao
          .json()
          .catch(() => null);

        const dadosSolicitacoes = await respostaSolicitacoes
          .json()
          .catch(() => null);

        if (!respostaInstituicao.ok) {
          throw new Error(
            dadosInstituicao?.message ||
              dadosInstituicao?.error ||
              `Erro ${respostaInstituicao.status} ao buscar instituição.`
          );
        }

        if (!respostaSolicitacoes.ok) {
          throw new Error(
            dadosSolicitacoes?.message ||
              dadosSolicitacoes?.error ||
              `Erro ${respostaSolicitacoes.status} ao buscar solicitações.`
          );
        }

        if (!controlador.signal.aborted) {
          setInstituicao(dadosInstituicao);

          setSolicitacoes(
            Array.isArray(dadosSolicitacoes)
              ? dadosSolicitacoes
              : Array.isArray(dadosSolicitacoes?.solicitacoes)
                ? dadosSolicitacoes.solicitacoes
                : []
          );
        }
      } catch (error) {
        if (
          error.name !== "AbortError" &&
          !controlador.signal.aborted
        ) {
          console.error("Erro ao carregar painel institucional:", error);
          setErro(
            error.message || "Não foi possível carregar os dados do painel."
          );
        }
      } finally {
        if (!controlador.signal.aborted) {
          setCarregando(false);
        }
      }
    }

    buscarDados();

    return () => controlador.abort();
  }, [navigate]);

  if (carregando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 bg-[#f4f6f9] text-sm font-semibold text-[#082d56]">
        <FiRefreshCw className="animate-spin" size={20} />
        Carregando instituição...
      </div>
    );
  }

  const endereco = instituicao?.logradouro
    ? [
        instituicao.logradouro,
        instituicao.numero,
        instituicao.bairro,
      ]
        .filter(Boolean)
        .join(", ")
    : "Não informado";

  const pendentes = solicitacoes.filter(
    (solicitacao) =>
      normalizarStatus(solicitacao.status) === "pendente"
  ).length;

  const aprovadas = solicitacoes.filter(
    (solicitacao) =>
      ["aprovada", "aprovado"].includes(
        normalizarStatus(solicitacao.status)
      )
  ).length;

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6">
      {/* ERRO */}
      {erro && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <FiAlertCircle className="mt-0.5 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* BOAS-VINDAS */}
      <section className="overflow-hidden rounded-2xl bg-[#082d56] p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="mb-2 text-sm text-blue-200">
              Bem-vindo(a) ao AndraRecursos
            </p>

            <h1 className="break-words text-2xl font-bold sm:text-3xl">
              {instituicao?.nome || "Instituição"}
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-blue-100">
              Acompanhe suas solicitações, consulte o histórico e gerencie as
              informações da instituição.
            </p>
          </div>

          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <FiHome size={29} />
          </span>
        </div>
      </section>

      {/* INDICADORES */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoIndicador
          titulo="Solicitações"
          valor={solicitacoes.length}
          Icone={FiClipboard}
          cor="text-[#1755ad]"
          fundo="bg-blue-50"
        />

        <CartaoIndicador
          titulo="Pendentes"
          valor={pendentes}
          Icone={FiClock}
          cor="text-amber-600"
          fundo="bg-amber-50"
        />

        <CartaoIndicador
          titulo="Aprovadas"
          valor={aprovadas}
          Icone={FiCheckCircle}
          cor="text-green-600"
          fundo="bg-green-50"
        />

        <CartaoIndicador
          titulo="Status da instituição"
          valor={instituicao?.status_instituicao || "Não informado"}
          Icone={FiHome}
          cor="text-green-600"
          fundo="bg-green-50"
        />
      </section>

      {/* SEÇÕES INFERIORES */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* SOLICITAÇÕES RECENTES */}
        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
            <div>
              <h2 className="text-lg font-bold text-[#082d56]">
                Solicitações Recentes
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Acompanhe os pedidos da sua instituição.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/historico-inst")}
              className="flex items-center gap-2 text-sm font-semibold text-[#1755ad] hover:underline"
            >
              Ver solicitações
              <FiArrowRight />
            </button>
          </div>

          <div className="space-y-3 p-5">
            {solicitacoes.length === 0 ? (
              <div className="py-8 text-center">
                <FiClipboard
                  size={27}
                  className="mx-auto mb-3 text-slate-400"
                />

                <p className="font-semibold text-[#082d56]">
                  Nenhuma solicitação cadastrada
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Suas solicitações aparecerão aqui quando forem cadastradas.
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/solicitacoes-inst")}
                  className="mt-5 rounded-lg bg-[#082d56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#164675]"
                >
                  Nova solicitação
                </button>
              </div>
            ) : (
              solicitacoes.slice(0, 3).map((solicitacao, indice) => (
                <div
                  key={
                    solicitacao.id_solicitacoes ??
                    solicitacao.id_solicitacao ??
                    solicitacao.id ??
                    indice
                  }
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="break-words font-semibold text-[#082d56]">
                      {solicitacao.titulo || "Solicitação sem título"}
                    </h3>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${obterClasseStatus(
                        solicitacao.status
                      )}`}
                    >
                      {solicitacao.status || "Pendente"}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    Setor: {solicitacao.setor || "Não informado"}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Prioridade: {solicitacao.prioridade || "Não informada"}
                  </p>
                </div>
              ))
            )}

            {solicitacoes.length > 0 && (
              <button
                type="button"
                onClick={() => navigate("/historico-inst")}
                className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#1755ad] hover:underline"
              >
                Ver todas as solicitações
                <FiArrowRight />
              </button>
            )}
          </div>
        </div>

        {/* DADOS INSTITUCIONAIS */}
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-bold text-[#082d56]">
              Dados da Instituição
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Informações cadastrais
            </p>
          </div>

          <div className="space-y-6 p-5">
            <DadoInstituicao
              Icone={FiUser}
              titulo="Gestor"
              valor={instituicao?.gestor}
            />

            <DadoInstituicao
              Icone={FiFileText}
              titulo="Secretaria vinculada"
              valor={instituicao?.secretaria_vinculada}
            />

            <DadoInstituicao
              Icone={FiMapPin}
              titulo="Endereço"
              valor={endereco}
            />

            <DadoInstituicao
              Icone={FiPhone}
              titulo="Telefone"
              valor={instituicao?.telefone}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
