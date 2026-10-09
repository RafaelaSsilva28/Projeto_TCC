
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiCheckCircle,
  FiFileText,
  FiUploadCloud,
  FiTrash2,
  FiAlertCircle,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";

import LayoutInstituicao from "../components/LayoutInstituicao";
import { enderecoServidor } from "../utils";

const API = String(enderecoServidor).replace(/\/$/, "");

const ETAPAS = [
  "Informações",
  "Detalhes",
  "Confirmação",
];

const FORMULARIO_INICIAL = {
  titulo: "",
  setor: "",
  prioridade: "Média",
  descricao: "",
};

const estiloInput =
  "h-12 w-full rounded-lg border border-[#d4dce7] bg-white px-4 text-sm text-[#082d56] outline-none transition focus:border-[#1759ad] focus:ring-2 focus:ring-blue-100";

const estiloLabel =
  "mb-2 block text-sm font-semibold text-[#082d56]";

function ItemRevisao({ titulo, valor, grande = false }) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-[#f8fafc] p-4 ${
        grande ? "md:col-span-2" : ""
      }`}
    >
      <p className="text-xs font-semibold text-slate-500">
        {titulo}
      </p>

      <p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium text-[#082d56]">
        {valor || "Não informado"}
      </p>
    </div>
  );
}

export default function SolicitacoesInst() {
  const navigate = useNavigate();
  const inputArquivo = useRef(null);

  const [etapa, setEtapa] = useState(1);
  const [formulario, setFormulario] = useState(
    FORMULARIO_INICIAL
  );
  const [arquivos, setArquivos] = useState([]);

  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const [modalCancelar, setModalCancelar] = useState(false);
  const [modalEnviar, setModalEnviar] = useState(false);

  // ============================================
  // VALIDAÇÃO
  // ============================================

  const etapa1Completa =
    formulario.titulo.trim().length >= 3 &&
    formulario.setor.trim().length > 0 &&
    formulario.prioridade.trim().length > 0;

  const etapa2Completa =
    formulario.descricao.trim().length >= 10;

  const formularioCompleto =
    etapa1Completa && etapa2Completa;

  function atualizarCampo(evento) {
    const { name, value } = evento.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }));

    setErro("");
  }

  function validarEtapa(numero) {
    if (numero === 1 && !etapa1Completa) {
      setErro(
        "Informe um título com pelo menos 3 caracteres, o setor e a prioridade."
      );
      return false;
    }

    if (numero === 2 && !etapa2Completa) {
      setErro(
        "A descrição deve conter pelo menos 10 caracteres."
      );
      return false;
    }

    setErro("");
    return true;
  }

  function avancar() {
    if (!validarEtapa(etapa)) return;

    setEtapa((anterior) => Math.min(anterior + 1, 3));
    setErro("");
  }

  function voltar() {
    setEtapa((anterior) => Math.max(anterior - 1, 1));
    setErro("");
  }

  function selecionarEtapa(numero) {
    if (enviando) return;

    if (numero === 2 && !etapa1Completa) {
      setErro("Preencha a primeira etapa para continuar.");
      return;
    }

    if (numero === 3 && !formularioCompleto) {
      setErro("Preencha as informações e os detalhes.");
      return;
    }

    setEtapa(numero);
    setErro("");
  }

  // ============================================
  // ANEXOS
  // ============================================

  function adicionarArquivos(evento) {
    const selecionados = Array.from(
      evento.target.files || []
    );

    evento.target.value = "";

    const tiposPermitidos = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    const arquivoInvalido = selecionados.find(
      (arquivo) =>
        !tiposPermitidos.includes(arquivo.type) ||
        arquivo.size > 10 * 1024 * 1024
    );

    if (arquivoInvalido) {
      toast.error(
        "Envie apenas PDF, JPG ou PNG de até 10 MB."
      );
      return;
    }

    setArquivos((anteriores) => {
      const novos = selecionados.filter(
        (arquivo) =>
          !anteriores.some(
            (existente) =>
              existente.name === arquivo.name &&
              existente.size === arquivo.size
          )
      );

      return [...anteriores, ...novos];
    });
  }

  function removerArquivo(indice) {
    setArquivos((anteriores) =>
      anteriores.filter((_, i) => i !== indice)
    );
  }

  // ============================================
  // CANCELAMENTO
  // ============================================

  function cancelarSolicitacao() {
    setModalCancelar(false);
    setFormulario(FORMULARIO_INICIAL);
    setArquivos([]);
    setEtapa(1);
    setErro("");

    navigate("/principal-inst");
  }

  // ============================================
  // CADASTRO NA API
  // ============================================

  async function enviarSolicitacao() {
    if (!formularioCompleto || enviando) return;

    // Ainda não há integração real para upload.
    if (arquivos.length > 0) {
      setModalEnviar(false);
      toast.error(
        "O envio de anexos ainda não está disponível. Remova os arquivos para concluir."
      );
      return;
    }

    const token = localStorage.getItem(
      "@AndraRecursos:token"
    );

    if (!token) {
      toast.error("Faça login novamente.");
      return;
    }

    setEnviando(true);
    setErro("");

    try {
      const resposta = await fetch(
        `${API}/solicitacoes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            titulo: formulario.titulo.trim(),
            setor: formulario.setor,
            prioridade: formulario.prioridade,
            descricao: formulario.descricao.trim(),
          }),
        }
      );

      const dados = await resposta
        .json()
        .catch(() => ({}));

      if (!resposta.ok) {
        throw new Error(
          dados.message ||
          dados.mensagem ||
          dados.error ||
          dados.erro ||
          `Erro ${resposta.status} ao cadastrar solicitação.`
        );
      }

      setModalEnviar(false);

      toast.success(
        "Solicitação cadastrada com sucesso!"
      );

      setFormulario(FORMULARIO_INICIAL);
      setArquivos([]);
      setEtapa(1);

      navigate("/principal-inst");
    } catch (error) {
      setErro(error.message);
      setModalEnviar(false);
      toast.error(error.message);
    } finally {
      setEnviando(false);
    }
  }

  // ============================================
  // INDICADOR DE ETAPAS
  // ============================================

  function IndicadorEtapas() {
    return (
      <div className="grid grid-cols-3 gap-0">
        {ETAPAS.map((nome, indice) => {
          const numero = indice + 1;

          const concluida =
            numero === 1
              ? etapa1Completa
              : numero === 2
                ? etapa2Completa && etapa1Completa
                : false;

          const liberada =
            numero === 1 ||
            (numero === 2 && etapa1Completa) ||
            (numero === 3 && formularioCompleto);

          const atual = etapa === numero;

          return (
            <div
              key={numero}
              className="relative flex min-w-0 flex-col items-center"
            >
              {indice > 0 && (
                <div
                  className={`absolute right-1/2 top-[23px] h-[3px] w-full ${
                    liberada
                      ? "bg-[#1759ad]"
                      : "bg-slate-200"
                  }`}
                />
              )}

              <button
                type="button"
                onClick={() => selecionarEtapa(numero)}
                disabled={!liberada || enviando}
                aria-label={`Etapa ${numero}: ${nome}`}
                aria-current={atual ? "step" : undefined}
                className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-xl border-2 text-base font-bold transition ${
                  atual
                    ? "border-[#1759ad] bg-[#1759ad] text-white shadow-sm"
                    : concluida
                      ? "border-[#1759ad] bg-[#eaf2fc] text-[#1759ad]"
                      : liberada
                        ? "border-[#1759ad] bg-white text-[#1759ad]"
                        : "border-slate-200 bg-[#e5e7eb] text-slate-500"
                } disabled:cursor-not-allowed`}
              >
                {concluida && !atual ? (
                  <FiCheck size={20} />
                ) : (
                  numero
                )}
              </button>

              <span
                className={`mt-2 text-center text-xs sm:text-sm ${
                  atual
                    ? "font-semibold text-[#082d56]"
                    : "text-slate-500"
                }`}
              >
                {nome}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // ============================================
  // INTERFACE
  // ============================================

  return (
    <LayoutInstituicao>
      <div className="mx-auto w-full max-w-6xl space-y-5">

        {/* TÍTULO DA PÁGINA */}
        <section>
          <h1 className="text-2xl font-bold text-[#082d56] sm:text-3xl">
            Nova Solicitação
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Preencha as informações, detalhe seu pedido e
            confirme o cadastro.
          </p>
        </section>

        {/* CARTÃO PRINCIPAL */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          {/* INDICADOR COMPACTO */}
          <div className="px-5 pb-6 pt-6 sm:px-8">
            <IndicadorEtapas />
          </div>

          <div className="border-t border-slate-100 px-5 pb-7 pt-6 sm:px-8">

            {/* TÍTULO DA ETAPA */}
            <h2 className="mb-6 text-lg font-bold text-[#082d56] sm:text-xl">
              {etapa === 1 && "Informações da Solicitação"}
              {etapa === 2 && "Detalhes da Solicitação"}
              {etapa === 3 && "Confirmação da Solicitação"}
            </h2>

            {erro && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                <FiAlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                />
                {erro}
              </div>
            )}

            {/* ====================================
                ETAPA 1
            ==================================== */}

            {etapa === 1 && (
              <div className="space-y-5">

                <div>
                  <label
                    htmlFor="titulo"
                    className={estiloLabel}
                  >
                    Título da Solicitação
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <input
                    id="titulo"
                    name="titulo"
                    type="text"
                    maxLength={150}
                    value={formulario.titulo}
                    onChange={atualizarCampo}
                    placeholder="Ex.: Aquisição de computadores"
                    className={estiloInput}
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="setor"
                      className={estiloLabel}
                    >
                      Setor Responsável
                      <span className="ml-1 text-red-500">*</span>
                    </label>

                    <select
                      id="setor"
                      name="setor"
                      value={formulario.setor}
                      onChange={atualizarCampo}
                      className={estiloInput}
                    >
                      <option value="">
                        Selecione o setor
                      </option>
                      <option value="Administrativo">
                        Administrativo
                      </option>
                      <option value="Infraestrutura">
                        Infraestrutura
                      </option>
                      <option value="Tecnologia">
                        Tecnologia
                      </option>
                      <option value="Recursos Humanos">
                        Recursos Humanos
                      </option>
                      <option value="Financeiro">
                        Financeiro
                      </option>
                      <option value="Alimentício">
                        Alimentício
                      </option>
                      <option value="Outro">
                        Outro
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="prioridade"
                      className={estiloLabel}
                    >
                      Prioridade
                      <span className="ml-1 text-red-500">*</span>
                    </label>

                    <select
                      id="prioridade"
                      name="prioridade"
                      value={formulario.prioridade}
                      onChange={atualizarCampo}
                      className={estiloInput}
                    >
                      <option value="Baixa">Baixa</option>
                      <option value="Média">Média</option>
                      <option value="Alta">Alta</option>
                      <option value="Urgente">Urgente</option>
                    </select>
                  </div>
                </div>

              </div>
            )}

            {/* ====================================
                ETAPA 2
            ==================================== */}

            {etapa === 2 && (
              <div className="space-y-5">

                <div>
                  <label
                    htmlFor="descricao"
                    className={estiloLabel}
                  >
                    Descrição da Solicitação
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <textarea
                    id="descricao"
                    name="descricao"
                    rows={5}
                    maxLength={3000}
                    value={formulario.descricao}
                    onChange={atualizarCampo}
                    placeholder="Descreva os recursos necessários e a justificativa do pedido..."
                    className="w-full resize-y rounded-lg border border-[#d4dce7] bg-white px-4 py-3 text-sm text-[#082d56] outline-none focus:border-[#1759ad] focus:ring-2 focus:ring-blue-100"
                  />

                  <p className="mt-1 text-right text-xs text-slate-400">
                    {formulario.descricao.length}/3000 caracteres
                  </p>
                </div>

                <div>
                  <label className={estiloLabel}>
                    Documentos e imagens (opcional)
                  </label>

                  <button
                    type="button"
                    onClick={() => inputArquivo.current?.click()}
                    className="flex w-full items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-[#fafbfc] px-5 py-6 text-left transition hover:border-[#1759ad] hover:bg-blue-50"
                  >
                    <FiUploadCloud
                      size={27}
                      className="shrink-0 text-[#1759ad]"
                    />

                    <div>
                      <p className="text-sm font-semibold text-[#082d56]">
                        Selecionar documentos
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        PDF, JPG ou PNG, até 10 MB por arquivo
                      </p>
                    </div>
                  </button>

                  <input
                    ref={inputArquivo}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={adicionarArquivos}
                    className="hidden"
                  />

                  {arquivos.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {arquivos.map((arquivo, indice) => (
                        <div
                          key={`${arquivo.name}-${indice}`}
                          className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3"
                        >
                          <FiFileText className="text-[#1759ad]" />

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[#082d56]">
                              {arquivo.name}
                            </p>

                            <p className="text-xs text-slate-500">
                              {(arquivo.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removerArquivo(indice)}
                            aria-label={`Remover ${arquivo.name}`}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          >
                            <FiTrash2 size={17} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="mt-2 text-xs text-amber-700">
                    O upload ainda não está integrado à API.
                    Para concluir o pedido, não deixe arquivos selecionados.
                  </p>
                </div>

              </div>
            )}

            {/* ====================================
                ETAPA 3
            ==================================== */}

            {etapa === 3 && (
              <div className="space-y-5">

                <div className="grid gap-4 md:grid-cols-2">
                  <ItemRevisao
                    titulo="Título"
                    valor={formulario.titulo}
                    grande
                  />

                  <ItemRevisao
                    titulo="Setor responsável"
                    valor={formulario.setor}
                  />

                  <ItemRevisao
                    titulo="Prioridade"
                    valor={formulario.prioridade}
                  />

                  <ItemRevisao
                    titulo="Descrição"
                    valor={formulario.descricao}
                    grande
                  />

                  <ItemRevisao
                    titulo="Documentos selecionados"
                    valor={
                      arquivos.length
                        ? `${arquivos.length} arquivo(s) — upload indisponível`
                        : "Nenhum documento selecionado"
                    }
                    grande
                  />
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-[#f0f6fd] p-4">
                  <FiCheckCircle
                    className="shrink-0 text-[#1759ad]"
                    size={20}
                  />

                  <p className="text-sm text-[#082d56]">
                    Confira os dados antes de concluir.
                    Você pode voltar para corrigir qualquer informação.
                  </p>
                </div>

              </div>
            )}

          </div>
        </section>

        {/* BOTÕES FORA DO CARTÃO */}
        <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">

          <button
            type="button"
            disabled={enviando}
            onClick={
              etapa === 1
                ? () => setModalCancelar(true)
                : voltar
            }
            className="flex items-center justify-center gap-2 rounded-lg border border-[#a8bfdf] bg-[#c9d8eb] px-6 py-3 text-sm font-semibold text-[#082d56] transition hover:bg-[#b4c9e3] disabled:opacity-50"
          >
            <FiArrowLeft />
            Voltar
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">

            {etapa < 3 ? (
              <button
                type="button"
                onClick={avancar}
                disabled={
                  etapa === 1
                    ? !etapa1Completa
                    : !etapa2Completa
                }
                className="flex items-center justify-center gap-2 rounded-lg bg-[#0b4b9b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#083b7d] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continuar
                <FiArrowRight />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setModalEnviar(true)}
                disabled={!formularioCompleto || enviando}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#0b4b9b] px-6 py-3 text-sm font-semibold text-white hover:bg-[#083b7d] disabled:opacity-50"
              >
                <FiCheckCircle />
                Finalizar cadastro
              </button>
            )}

            <button
              type="button"
              disabled={enviando}
              onClick={() => setModalCancelar(true)}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#9db9df] px-6 py-3 text-sm font-semibold text-[#082d56] transition hover:bg-[#88a9d6] disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>

      </div>

      {/* MODAL CANCELAR */}
      {modalCancelar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07182b]/65 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancelar-titulo"
            className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl"
          >
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
              <FiAlertCircle size={28} />
            </span>

            <h3
              id="cancelar-titulo"
              className="mt-4 text-xl font-bold text-[#082d56]"
            >
              Cancelar solicitação?
            </h3>

            <p className="mt-3 text-sm text-slate-500">
              Os dados preenchidos serão descartados.
              Deseja realmente cancelar?
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setModalCancelar(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold"
              >
                Não
              </button>

              <button
                type="button"
                onClick={cancelarSolicitacao}
                className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
              >
                Sim, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ENVIO */}
      {modalEnviar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07182b]/65 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="envio-titulo"
            className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl"
          >
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
              <FiCheckCircle size={28} />
            </span>

            <h3
              id="envio-titulo"
              className="mt-4 text-xl font-bold text-[#082d56]"
            >
              Confirmar solicitação?
            </h3>

            <p className="mt-3 text-sm text-slate-500">
              Deseja enviar esta solicitação para análise?
            </p>

            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-[#082d56]">
              {formulario.titulo}
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={enviando}
                onClick={() => setModalEnviar(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold disabled:opacity-50"
              >
                Voltar
              </button>

              <button
                type="button"
                disabled={enviando}
                onClick={enviarSolicitacao}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
              >
                {enviando ? (
                  <>
                    <FiRefreshCw className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <FiCheck />
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </LayoutInstituicao>
  );
}
