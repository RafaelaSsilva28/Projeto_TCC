
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  FiUser,
  FiMail,
  FiHome,
  FiMapPin,
  FiPhone,
  FiClock,
  FiShield,
  FiEdit3,
  FiSave,
  FiX,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiHash,
  FiBriefcase,
  FiArrowLeft,
  FiChevronRight,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";

const API = String(enderecoServidor).replace(/\/$/, "");

const CAMPOS_EDITAVEIS = [
  "gestor",
  "secretaria_vinculada",
  "logradouro",
  "cep",
  "numero",
  "bairro",
  "telefone",
  "horario_funcionamento",
];

const FORMULARIO_VAZIO = {
  gestor: "",
  secretaria_vinculada: "",
  logradouro: "",
  cep: "",
  numero: "",
  bairro: "",
  telefone: "",
  horario_funcionamento: "",
};

function obterToken() {
  return localStorage.getItem("@AndraRecursos:token");
}

function formatarCEP(valor) {
  const numeros = String(valor ?? "").replace(/\D/g, "").slice(0, 8);

  if (numeros.length > 5) {
    return `${numeros.slice(0, 5)}-${numeros.slice(5)}`;
  }

  return numeros;
}

function formatarTelefone(valor) {
  const numeros = String(valor ?? "").replace(/\D/g, "").slice(0, 11);

  if (numeros.length <= 2) {
    return numeros.length ? `(${numeros}` : "";
  }

  if (numeros.length <= 6) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  }

  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function normalizarFormulario(instituicao = {}) {
  return {
    gestor: instituicao.gestor ?? "",
    secretaria_vinculada: instituicao.secretaria_vinculada ?? "",
    logradouro: instituicao.logradouro ?? "",
    cep: formatarCEP(instituicao.cep ?? ""),
    numero: instituicao.numero ?? "",
    bairro: instituicao.bairro ?? "",
    telefone: formatarTelefone(instituicao.telefone ?? ""),
    horario_funcionamento: instituicao.horario_funcionamento ?? "",
  };
}

function Campo({
  label,
  icon: Icon,
  value,
  onChange,
  editing,
  placeholder,
  type = "text",
  required = false,
  maxLength,
}) {
  const classeInput =
    "min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-[#082d56] outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:cursor-default disabled:bg-gray-50 disabled:text-gray-600";

  return (
    <div className="min-w-0">
      <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-600">
        {Icon && <Icon size={15} className="text-[#1759ad]" />}
        {label}
        {editing && required && <span className="text-red-500">*</span>}
      </label>

      <input
        type={type}
        value={value ?? ""}
        onChange={onChange}
        disabled={!editing}
        required={editing && required}
        maxLength={maxLength}
        placeholder={placeholder || label}
        className={classeInput}
      />
    </div>
  );
}

function CampoBloqueado({ label, icon: Icon, value }) {
  return (
    <div className="min-w-0">
      <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-600">
        {Icon && <Icon size={15} className="text-[#1759ad]" />}
        {label}
      </label>

      <div className="flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
        <span className="min-w-0 break-words">
          {value || "Não informado"}
        </span>
      </div>
    </div>
  );
}

function Secao({ titulo, descricao, icon: Icon, children }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-gray-200 px-5 py-5 sm:px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1759ad]">
          <Icon size={20} />
        </div>

        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[#082d56]">
            {titulo}
          </h2>

          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            {descricao}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
        {children}
      </div>
    </section>
  );
}

function Indicador({ titulo, valor, icon: Icon }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1759ad]">
        <Icon size={19} />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{titulo}</p>
        <p className="mt-1 break-words text-sm font-semibold text-[#082d56]">
          {valor}
        </p>
      </div>
    </div>
  );
}

export default function PerfilInstituicao() {
  const navigate = useNavigate();

  const [instituicao, setInstituicao] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO);
  const [formularioOriginal, setFormularioOriginal] =
    useState(FORMULARIO_VAZIO);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState("");

  const buscarPerfil = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      const token = obterToken();

      if (!token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const resposta = await fetch(`${API}/instituicoes/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const resultado = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        throw new Error(
          resultado?.error ||
            resultado?.message ||
            `Erro ${resposta.status} ao carregar o perfil.`,
        );
      }

      const dados =
        resultado?.instituicao ??
        resultado?.perfil ??
        resultado;

      if (!dados || typeof dados !== "object") {
        throw new Error("A API não retornou os dados da instituição.");
      }

      const formularioInicial = normalizarFormulario(dados);

      setInstituicao(dados);
      setFormulario(formularioInicial);
      setFormularioOriginal(formularioInicial);
    } catch (error) {
      setErro(error.message || "Não foi possível carregar o perfil.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    buscarPerfil();
  }, [buscarPerfil]);

  function alterarCampo(campo, valor) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function iniciarEdicao() {
    setFormularioOriginal({ ...formulario });
    setEditando(true);
    setErro("");
  }

  function cancelarEdicao() {
    setFormulario({ ...formularioOriginal });
    setEditando(false);
    setErro("");
  }

  async function salvarAlteracoes(event) {
    event.preventDefault();

    if (salvando) return;

    const token = obterToken();

    if (!token) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }

    for (const campo of CAMPOS_EDITAVEIS) {
      if (!String(formulario[campo] ?? "").trim()) {
        toast.error("Preencha todos os campos obrigatórios.");
        return;
      }
    }

    const cepNumerico = formulario.cep.replace(/\D/g, "");
    const telefoneNumerico = formulario.telefone.replace(/\D/g, "");

    if (cepNumerico.length !== 8) {
      toast.error("Informe um CEP válido com 8 números.");
      return;
    }

    if (![10, 11].includes(telefoneNumerico.length)) {
      toast.error("Informe um telefone válido com DDD.");
      return;
    }

    if (String(formulario.numero).trim().length > 10) {
      toast.error("O número do endereço deve ter no máximo 10 caracteres.");
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      const corpo = {
        gestor: formulario.gestor.trim(),
        secretaria_vinculada: formulario.secretaria_vinculada.trim(),
        logradouro: formulario.logradouro.trim(),
        cep: cepNumerico,
        numero: String(formulario.numero).trim(),
        bairro: formulario.bairro.trim(),
        telefone: telefoneNumerico,
        horario_funcionamento: formulario.horario_funcionamento.trim(),
      };

      const resposta = await fetch(`${API}/instituicoes/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(corpo),
      });

      const resultado = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        throw new Error(
          resultado?.error ||
            resultado?.message ||
            `Erro ${resposta.status} ao salvar as alterações.`,
        );
      }

      const dadosAtualizados =
        resultado?.instituicao ??
        resultado?.perfil ??
        null;

      if (dadosAtualizados) {
        setInstituicao(dadosAtualizados);

        const novoFormulario = normalizarFormulario(dadosAtualizados);

        setFormulario(novoFormulario);
        setFormularioOriginal(novoFormulario);
      } else {
        await buscarPerfil();
      }

      setEditando(false);
      toast.success(
        resultado?.message || "Perfil atualizado com sucesso!",
      );
    } catch (error) {
      setErro(error.message || "Não foi possível salvar as alterações.");
      toast.error(error.message || "Erro ao atualizar o perfil.");
    } finally {
      setSalvando(false);
    }
  }

  const nomeInstituicao =
    instituicao?.nome || "Instituição";

  const statusInstituicao =
    instituicao?.status_instituicao || "Não informado";

  const nomeGestor =
    formulario.gestor || "Não informado";

  const enderecoCompleto = [
    formulario.logradouro,
    formulario.numero,
    formulario.bairro,
  ]
    .filter(Boolean)
    .join(", ");

  const classeBotaoSecundario =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#082d56] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";

  const classeBotaoPrincipal =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#082d56] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#164675] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="min-w-0 space-y-6">
      {/* CAMINHO DA PÁGINA */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <button
          type="button"
          onClick={() => navigate("/principal-inst")}
          className="transition hover:text-[#1759ad]"
        >
          Início
        </button>

        <FiChevronRight size={14} />

        <span className="font-semibold text-[#082d56]">
          Perfil da instituição
        </span>
      </div>

      {/* CABEÇALHO */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#082d56] sm:text-3xl">
            Perfil da Instituição
          </h1>

          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            Consulte e mantenha atualizados os dados institucionais.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={buscarPerfil}
            disabled={carregando || salvando}
            className={classeBotaoSecundario}
          >
            <FiRefreshCw
              size={16}
              className={carregando ? "animate-spin" : ""}
            />
            Atualizar
          </button>

          {!editando && (
            <button
              type="button"
              onClick={iniciarEdicao}
              disabled={carregando || Boolean(erro) || !instituicao}
              className={classeBotaoPrincipal}
            >
              <FiEdit3 size={16} />
              Editar perfil
            </button>
          )}
        </div>
      </div>

      {/* ERRO */}
      {erro && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <FiAlertCircle size={18} className="mt-0.5 shrink-0" />

          <div className="min-w-0 flex-1">
            <p className="font-semibold">Não foi possível concluir a operação</p>
            <p className="mt-1 break-words">{erro}</p>
          </div>

          <button
            type="button"
            onClick={buscarPerfil}
            className="shrink-0 font-semibold underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* IDENTIFICAÇÃO */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="h-1.5 bg-[#082d56]" />

        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1759ad]">
            <FiHome size={30} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Instituição cadastrada
            </p>

            <h2 className="mt-1 break-words text-xl font-bold text-[#082d56] sm:text-2xl">
              {carregando ? "Carregando..." : nomeInstituicao}
            </h2>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#1759ad]">
                <FiShield size={13} />
                Usuário institucional
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                {statusInstituicao}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* INDICADORES */}
      <section
        aria-label="Resumo do perfil"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        <Indicador
          titulo="Gestor responsável"
          valor={nomeGestor}
          icon={FiUser}
        />

        <Indicador
          titulo="Contato institucional"
          valor={instituicao?.email_institucional || "Não informado"}
          icon={FiMail}
        />

        <Indicador
          titulo="Cadastro"
          valor={
            instituicao?.cadastro_completo
              ? "Completo"
              : "Pendente de conclusão"
          }
          icon={FiCheckCircle}
        />
      </section>

      {/* CARREGAMENTO */}
      {carregando && !instituicao ? (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-14 text-center shadow-sm">
          <FiRefreshCw
            size={24}
            className="mx-auto animate-spin text-[#1759ad]"
          />

          <p className="mt-3 text-sm text-gray-500">
            Carregando os dados da instituição...
          </p>
        </div>
      ) : (
        <form onSubmit={salvarAlteracoes} className="space-y-6">
          {/* IDENTIFICAÇÃO INSTITUCIONAL */}
          <Secao
            titulo="Identificação institucional"
            descricao="Dados principais associados ao cadastro da instituição."
            icon={FiHome}
          >
            <CampoBloqueado
              label="Nome da instituição"
              icon={FiHome}
              value={instituicao?.nome}
            />

            <CampoBloqueado
              label="E-mail institucional"
              icon={FiMail}
              value={instituicao?.email_institucional}
            />

            <CampoBloqueado
              label="Tipo de acesso"
              icon={FiShield}
              value={instituicao?.tipo_acesso || "Usuário Institucional"}
            />

            <CampoBloqueado
              label="Status da instituição"
              icon={FiCheckCircle}
              value={instituicao?.status_instituicao}
            />
          </Secao>

          {/* GESTÃO */}
          <Secao
            titulo="Dados da gestão"
            descricao="Informações do responsável e da secretaria vinculada."
            icon={FiBriefcase}
          >
            <Campo
              label="Gestor responsável"
              icon={FiUser}
              value={formulario.gestor}
              editing={editando}
              required
              placeholder="Nome completo do gestor"
              onChange={(e) => alterarCampo("gestor", e.target.value)}
            />

            <Campo
              label="Secretaria vinculada"
              icon={FiBriefcase}
              value={formulario.secretaria_vinculada}
              editing={editando}
              required
              placeholder="Nome da secretaria"
              onChange={(e) =>
                alterarCampo("secretaria_vinculada", e.target.value)
              }
            />
          </Secao>

          {/* ENDEREÇO */}
          <Secao
            titulo="Endereço da instituição"
            descricao="Localização e endereço cadastrado para contato institucional."
            icon={FiMapPin}
          >
            <div className="sm:col-span-2">
              <Campo
                label="Logradouro"
                icon={FiMapPin}
                value={formulario.logradouro}
                editing={editando}
                required
                placeholder="Rua, avenida ou outro logradouro"
                onChange={(e) => alterarCampo("logradouro", e.target.value)}
              />
            </div>

            <Campo
              label="Número"
              icon={FiHash}
              value={formulario.numero}
              editing={editando}
              required
              maxLength={10}
              placeholder="Número do endereço"
              onChange={(e) => alterarCampo("numero", e.target.value)}
            />

            <Campo
              label="Bairro"
              icon={FiMapPin}
              value={formulario.bairro}
              editing={editando}
              required
              placeholder="Bairro"
              onChange={(e) => alterarCampo("bairro", e.target.value)}
            />

            <Campo
              label="CEP"
              icon={FiMapPin}
              value={formulario.cep}
              editing={editando}
              required
              maxLength={9}
              placeholder="00000-000"
              onChange={(e) =>
                alterarCampo("cep", formatarCEP(e.target.value))
              }
            />

            <CampoBloqueado
              label="Endereço cadastrado"
              icon={FiHome}
              value={enderecoCompleto}
            />
          </Secao>

          {/* CONTATO */}
          <Secao
            titulo="Contato e funcionamento"
            descricao="Telefone e horário de atendimento da instituição."
            icon={FiPhone}
          >
            <Campo
              label="Telefone institucional"
              icon={FiPhone}
              value={formulario.telefone}
              editing={editando}
              required
              maxLength={15}
              placeholder="(00) 00000-0000"
              onChange={(e) =>
                alterarCampo("telefone", formatarTelefone(e.target.value))
              }
            />

            <Campo
              label="Horário de funcionamento"
              icon={FiClock}
              value={formulario.horario_funcionamento}
              editing={editando}
              required
              placeholder="Ex.: Segunda a sexta, das 8h às 17h"
              onChange={(e) =>
                alterarCampo("horario_funcionamento", e.target.value)
              }
            />
          </Secao>

          {/* AÇÕES DE EDIÇÃO */}
          {editando && (
            <div className="flex flex-col-reverse gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-gray-500">
                Os campos de identificação são somente para consulta. As
                alterações serão enviadas ao servidor ao salvar.
              </p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={cancelarEdicao}
                  disabled={salvando}
                  className={classeBotaoSecundario}
                >
                  <FiX size={16} />
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvando}
                  className={classeBotaoPrincipal}
                >
                  {salvando ? (
                    <>
                      <FiRefreshCw size={16} className="animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <FiSave size={16} />
                      Salvar alterações
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* RODAPÉ */}
          {!editando && (
            <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">
                Para atualizar os dados permitidos, selecione “Editar perfil”.
              </p>

              <button
                type="button"
                onClick={() => navigate("/principal-inst")}
                className={classeBotaoSecundario}
              >
                <FiArrowLeft size={16} />
                Voltar ao painel
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
