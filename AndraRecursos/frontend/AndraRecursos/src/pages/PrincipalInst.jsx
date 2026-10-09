
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
import LayoutInstituicao from "../components/LayoutInstituicao";

const API = String(enderecoServidor).replace(/\/$/, "");

function CartaoIndicador({
  titulo,
  valor,
  Icone,
  cor,
  fundo,
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm text-slate-500">
          {titulo}
        </p>

        <p className="mt-3 text-2xl font-bold text-[#082d56]">
          {valor}
        </p>
      </div>

      <span className={`rounded-xl p-3 ${fundo} ${cor}`}>
        <Icone size={21} />
      </span>
    </div>
  );
}

function DadoInstituicao({ Icone, titulo, valor }) {
  return (
    <div className="flex items-start gap-3">
      <Icone
        size={19}
        className="mt-0.5 shrink-0 text-[#1755ad]"
      />

      <div className="min-w-0">
        <p className="text-xs text-slate-500">
          {titulo}
        </p>

        <p className="mt-1 break-words text-sm font-semibold text-[#082d56]">
          {valor || "Não informado"}
        </p>
      </div>
    </div>
  );
}

export default function PrincipalInst() {
  const navigate = useNavigate();

  const [instituicao, setInstituicao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    const token = localStorage.getItem(
      "@AndraRecursos:token"
    );

    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    async function buscarInstituicao() {
      setCarregando(true);
      setErro("");

      try {
        const resposta = await fetch(
          `${API}/instituicoes/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const dados = await resposta.json().catch(() => null);

        if (!resposta.ok) {
          throw new Error(
            dados?.message ||
              dados?.error ||
              `Erro ${resposta.status} ao buscar instituição.`
          );
        }

        if (ativo) {
          setInstituicao(dados);
        }
      } catch (error) {
        if (ativo) {
          setErro(error.message);
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    buscarInstituicao();

    return () => {
      ativo = false;
    };
  }, [navigate]);

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 bg-[#f4f6f9] text-sm font-semibold text-[#082d56]">
        <FiRefreshCw className="animate-spin" />
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

  return (
    <LayoutInstituicao nomeInstituicao={instituicao?.nome}>

      <div className="mx-auto max-w-7xl space-y-6">

        {/* ERRO */}
        {erro && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <FiAlertCircle />
            {erro}
          </div>
        )}

        {/* BOAS-VINDAS */}
        <section className="overflow-hidden rounded-2xl bg-[#082d56] p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

            <div>
              <p className="mb-2 text-sm text-blue-200">
                Bem-vindo(a) ao AndraRecursos
              </p>

              <h1 className="text-2xl font-bold sm:text-3xl">
                {instituicao?.nome || "Instituição"}
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-relaxed text-blue-100">
                Acompanhe suas solicitações, consulte o
                histórico e gerencie as informações da instituição.
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
            valor="—"
            Icone={FiClipboard}
            cor="text-[#1755ad]"
            fundo="bg-blue-50"
          />

          <CartaoIndicador
            titulo="Pendentes"
            valor="—"
            Icone={FiClock}
            cor="text-amber-600"
            fundo="bg-amber-50"
          />

          <CartaoIndicador
            titulo="Aprovadas"
            valor="—"
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

        {/* OBSERVAÇÃO DOS INDICADORES */}
        <p className="text-xs text-slate-500">
          Os indicadores de solicitações serão preenchidos
          quando a consulta institucional de solicitações
          estiver integrada à API.
        </p>

        {/* SEÇÕES INFERIORES */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* SOLICITAÇÕES RECENTES */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">

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
                onClick={() => navigate("/solicitacoes-inst")}
                className="flex items-center gap-2 text-sm font-semibold text-[#1755ad] hover:underline"
              >
                Ver solicitações
                <FiArrowRight />
              </button>
            </div>

            <div className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">

              <span className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400">
                <FiClipboard size={27} />
              </span>

              <h3 className="font-semibold text-[#082d56]">
                Solicitações ainda não carregadas
              </h3>

              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Consulte a página de Solicitações para
                visualizar os pedidos disponíveis.
              </p>

              <button
                type="button"
                onClick={() => navigate("/solicitacoes-inst")}
                className="mt-5 rounded-lg bg-[#082d56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#164675]"
              >
                Ir para solicitações
              </button>
            </div>
          </div>

          {/* DADOS INSTITUCIONAIS */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
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
    </LayoutInstituicao>
  );
}
