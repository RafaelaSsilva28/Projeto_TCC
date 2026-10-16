
import { useCallback, useEffect, useState } from "react";
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
} from "react-icons/fi";

import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

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

const FORMULARIO_INICIAL = {
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
  const tokenDireto = localStorage.getItem("@AndraRecursos:token");

  if (tokenDireto) {
    return tokenDireto;
  }

  try {
    const usuarioSalvo = JSON.parse(
      localStorage.getItem("@AndraRecursos:usuario") || "null"
    );

    return (
      usuarioSalvo?.token ||
      usuarioSalvo?.accessToken ||
      usuarioSalvo?.access_token ||
      ""
    );
  } catch {
    return "";
  }
}

function formatarCEP(valor) {
  const numeros = String(valor || "").replace(/\D/g, "").slice(0, 8);

  if (numeros.length > 5) {
    return `${numeros.slice(0, 5)}-${numeros.slice(5)}`;
  }

  return numeros;
}

function formatarTelefone(valor) {
  const numeros = String(valor || "").replace(/\D/g, "").slice(0, 11);

  if (numeros.length <= 2) {
    return numeros ? `(${numeros}` : "";
  }

  if (numeros.length <= 6) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  }

  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(
      2,
      6
    )}-${numeros.slice(6)}`;
  }

  return `(${numeros.slice(0, 2)}) ${numeros.slice(
    2,
    7
  )}-${numeros.slice(7)}`;
}

function normalizarFormulario(instituicao = {}) {
  return {
    gestor: instituicao.gestor || "",
    secretaria_vinculada: instituicao.secretaria_vinculada || "",
    logradouro: instituicao.logradouro || "",
    cep: formatarCEP(instituicao.cep || ""),
    numero: instituicao.numero || "",
    bairro: instituicao.bairro || "",
    telefone: formatarTelefone(instituicao.telefone || ""),
    horario_funcionamento: instituicao.horario_funcionamento || "",
  };
}

function Campo({
  label,
  icon: Icon,
  value,
  onChange,
  editing,
  name,
  placeholder,
  type = "text",
  required = false,
  maxLength,
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
        {required && editing && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      <div
        className={`flex min-h-[48px] items-center gap-3 rounded-xl border px-3 transition ${
          editing
            ? "border-blue-200 bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        <Icon
          size={18}
          className="shrink-0 text-slate-400"
        />

        {editing ? (
          <input
            id={name}
            name={name}
            type={type}
            value={value ?? ""}
            onChange={onChange}
            placeholder={placeholder || label}
            required={required}
            maxLength={maxLength}
            className="w-full min-w-0 bg-transparent py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
        ) : (
          <p className="min-w-0 flex-1 break-words py-3 text-sm text-slate-700">
            {value || (
              <span className="italic text-slate-400">
                Não informado
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function CampoSomenteLeitura({
  label,
  icon: Icon,
  value,
}) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <div className="flex min-h-[48px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3">
        <Icon size={18} className="shrink-0 text-slate-400" />

        <p className="min-w-0 flex-1 break-words py-3 text-sm text-slate-700">
          {value || (
            <span className="italic text-slate-400">
              Não informado
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function PerfilInstituicao() {
  const navigate = useNavigate();

  const [instituicao, setInstituicao] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState("");

  const buscarPerfil = useCallback(async (mostrarToast = false) => {
    const token = obterToken();

    if (!token) {
      setErro("Sua sessão não foi encontrada. Entre novamente no sistema.");
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErro("");

    try {
      const resposta = await fetch(`${API}/instituicoes/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        throw new Error(
          dados.message ||
            dados.mensagem ||
            "Não foi possível carregar os dados da instituição."
        );
      }

      const perfil = dados?.instituicao || dados?.perfil || dados;

      if (!perfil || typeof perfil !== "object") {
        throw new Error("Os dados da instituição não foram encontrados.");
      }

      setInstituicao(perfil);
      setFormulario(normalizarFormulario(perfil));

      if (mostrarToast) {
        toast.success("Perfil atualizado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao buscar perfil institucional:", error);

      setErro(
        error.message ||
          "Ocorreu um erro ao carregar o perfil da instituição."
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    buscarPerfil();
  }, [buscarPerfil]);

  function alterarCampo(evento) {
    const { name, value } = evento.target;

    let valor = value;

    if (name === "cep") {
      valor = formatarCEP(value);
    }

    if (name === "telefone") {
      valor = formatarTelefone(value);
    }

    if (name === "numero") {
      valor = value.slice(0, 10);
    }

    setFormulario((anterior) => ({
      ...anterior,
      [name]: valor,
    }));
  }

  function cancelarEdicao() {
    setFormulario(normalizarFormulario(instituicao));
    setEditando(false);
  }

  async function salvarAlteracoes(evento) {
    evento.preventDefault();

    if (salvando) return;

    const token = obterToken();

    if (!token) {
      toast.error("Sua sessão expirou. Entre novamente no sistema.");
      return;
    }

    const camposObrigatorios = [
      ["gestor", "Informe o nome do gestor."],
      ["secretaria_vinculada", "Informe a secretaria vinculada."],
      ["logradouro", "Informe o logradouro."],
      ["cep", "Informe o CEP."],
      ["numero", "Informe o número."],
      ["bairro", "Informe o bairro."],
      ["telefone", "Informe o telefone."],
      [
        "horario_funcionamento",
        "Informe o horário de funcionamento.",
      ],
    ];

    for (const [campo, mensagem] of camposObrigatorios) {
      if (!String(formulario[campo] || "").trim()) {
        toast.error(mensagem);
        return;
      }
    }

    const cepNumerico = String(formulario.cep).replace(/\D/g, "");
    const telefoneNumerico = String(formulario.telefone).replace(
      /\D/g,
      ""
    );

    if (cepNumerico.length !== 8) {
      toast.error("O CEP deve conter 8 números.");
      return;
    }

    if (![10, 11].includes(telefoneNumerico.length)) {
      toast.error(
        "O telefone deve conter DDD e 8 ou 9 números."
      );
      return;
    }

    const dadosParaEnviar = {};

    for (const campo of CAMPOS_EDITAVEIS) {
      let valor = String(formulario[campo] || "").trim();

      if (campo === "cep") {
        valor = cepNumerico;
      }

      if (campo === "telefone") {
        valor = telefoneNumerico;
      }

      dadosParaEnviar[campo] = valor;
    }

    setSalvando(true);

    try {
      const resposta = await fetch(`${API}/instituicoes/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(dadosParaEnviar),
      });

      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        throw new Error(
          dados.message ||
            dados.mensagem ||
            "Não foi possível salvar as alterações."
        );
      }

      const perfilAtualizado =
        dados?.instituicao || dados?.perfil || null;

      if (perfilAtualizado) {
        setInstituicao(perfilAtualizado);
        setFormulario(normalizarFormulario(perfilAtualizado));
      } else {
        await buscarPerfil();
      }

      setEditando(false);
      toast.success("Dados da instituição salvos com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar perfil institucional:", error);
      toast.error(
        error.message || "Erro ao salvar os dados da instituição."
      );
    } finally {
      setSalvando(false);
    }
  }

  const cadastroCompleto =
    instituicao?.cadastro_completo === true ||
    instituicao?.cadastro_completo === "true";

  const statusInstituicao =
    instituicao?.status_instituicao || "Não informado";

  if (carregando && !instituicao) {
    return (
      <div className="min-h-screen bg-slate-50 p-5 md:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
            <FiRefreshCw
              size={36}
              className="animate-spin text-blue-700"
            />

            <p className="text-sm font-medium text-slate-600">
              Carregando perfil da instituição...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (erro && !instituicao) {
    return (
      <div className="min-h-screen bg-slate-50 p-5 md:p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-100 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <FiAlertCircle size={28} />
          </div>

          <h1 className="text-xl font-bold text-[#082d56]">
            Não foi possível carregar o perfil
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {erro}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => buscarPerfil()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1759ad] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#104889]"
            >
              <FiRefreshCw size={17} />
              Tentar novamente
            </button>

            <button
              type="button"
              onClick={() => navigate("/principal-inst")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FiArrowLeft size={17} />
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-9">
      <div className="mx-auto max-w-6xl">
        {/* CABEÇALHO */}
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700">
              <FiHome size={17} />
              Área institucional
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#082d56] md:text-3xl">
              Perfil da Instituição
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Consulte e mantenha atualizados os dados cadastrais da
              sua instituição.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => buscarPerfil()}
              disabled={carregando || salvando}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiRefreshCw
                size={17}
                className={carregando ? "animate-spin" : ""}
              />
              Atualizar
            </button>

            {!editando ? (
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1759ad] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#104889]"
              >
                <FiEdit3 size={17} />
                Editar perfil
              </button>
            ) : (
              <button
                type="button"
                onClick={cancelarEdicao}
                disabled={salvando}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <FiX size={17} />
                Cancelar
              </button>
            )}
          </div>
        </div>

        {/* AVISO DE EDIÇÃO */}
        {editando && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <FiAlertCircle
              size={20}
              className="mt-0.5 shrink-0 text-blue-700"
            />

            <div>
              <p className="text-sm font-bold text-[#082d56]">
                Modo de edição ativado
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Altere os campos disponíveis e clique em salvar. O nome,
                o e-mail institucional e o status são somente para
                visualização nesta tela.
              </p>
            </div>
          </div>
        )}

        {/* CARTÃO PRINCIPAL */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-2 bg-gradient-to-r from-[#082d56] via-[#1759ad] to-[#78a8e8]" />

          <div className="p-5 md:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-[#1759ad]">
                <FiHome size={38} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  Instituição cadastrada
                </p>

                <h2 className="break-words text-xl font-bold text-[#082d56] md:text-2xl">
                  {instituicao?.nome || "Instituição"}
                </h2>

                <p className="mt-2 flex items-start gap-2 break-all text-sm text-slate-500">
                  <FiMail
                    size={16}
                    className="mt-0.5 shrink-0"
                  />
                  {instituicao?.email_institucional ||
                    "E-mail não informado"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${
                    cadastroCompleto
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  <FiCheckCircle size={15} />
                  {cadastroCompleto
                    ? "Cadastro completo"
                    : "Cadastro pendente"}
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-400">
                  <FiHash size={17} />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Código da instituição
                  </span>
                </div>

                <p className="break-words text-base font-bold text-[#082d56]">
                  {instituicao?.id_instituicao ?? "Não informado"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-400">
                  <FiShield size={17} />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Tipo de acesso
                  </span>
                </div>

                <p className="break-words text-base font-bold text-[#082d56]">
                  {instituicao?.tipo_acesso || "Usuário Institucional"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-400">
                  <FiCheckCircle size={17} />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Status
                  </span>
                </div>

                <p className="break-words text-base font-bold text-[#082d56]">
                  {statusInstituicao}
                </p>
              </div>
            </div>
          </div>
        </section>

        <form onSubmit={salvarAlteracoes}>
          {/* DADOS INSTITUCIONAIS */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1759ad]">
                <FiBriefcase size={22} />
              </div>

              <div>
                <h2 className="font-bold text-[#082d56]">
                  Dados institucionais
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Informações de identificação e gestão.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <CampoSomenteLeitura
                label="Nome da instituição"
                icon={FiHome}
                value={instituicao?.nome}
              />

              <CampoSomenteLeitura
                label="E-mail institucional"
                icon={FiMail}
                value={instituicao?.email_institucional}
              />

              <Campo
                label="Nome do gestor"
                icon={FiUser}
                name="gestor"
                value={formulario.gestor}
                onChange={alterarCampo}
                editing={editando}
                placeholder="Nome completo do gestor"
                required
              />

              <Campo
                label="Secretaria vinculada"
                icon={FiBriefcase}
                name="secretaria_vinculada"
                value={formulario.secretaria_vinculada}
                onChange={alterarCampo}
                editing={editando}
                placeholder="Nome da secretaria"
                required
              />
            </div>
          </section>

          {/* ENDEREÇO */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1759ad]">
                <FiMapPin size={22} />
              </div>

              <div>
                <h2 className="font-bold text-[#082d56]">
                  Endereço da instituição
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Localização e informações de endereço.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Campo
                label="Logradouro"
                icon={FiMapPin}
                name="logradouro"
                value={formulario.logradouro}
                onChange={alterarCampo}
                editing={editando}
                placeholder="Rua, avenida ou praça"
                required
              />

              <Campo
                label="Bairro"
                icon={FiMapPin}
                name="bairro"
                value={formulario.bairro}
                onChange={alterarCampo}
                editing={editando}
                placeholder="Nome do bairro"
                required
              />

              <Campo
                label="Número"
                icon={FiHash}
                name="numero"
                value={formulario.numero}
                onChange={alterarCampo}
                editing={editando}
                placeholder="Número do endereço"
                required
                maxLength={10}
              />

              <Campo
                label="CEP"
                icon={FiMapPin}
                name="cep"
                value={formulario.cep}
                onChange={alterarCampo}
                editing={editando}
                placeholder="00000-000"
                required
                maxLength={9}
              />
            </div>
          </section>

          {/* CONTATO E FUNCIONAMENTO */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1759ad]">
                <FiPhone size={22} />
              </div>

              <div>
                <h2 className="font-bold text-[#082d56]">
                  Contato e funcionamento
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Telefone e horário de atendimento.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Campo
                label="Telefone institucional"
                icon={FiPhone}
                name="telefone"
                value={formulario.telefone}
                onChange={alterarCampo}
                editing={editando}
                placeholder="(00) 00000-0000"
                required
                maxLength={15}
              />

              <Campo
                label="Horário de funcionamento"
                icon={FiClock}
                name="horario_funcionamento"
                value={formulario.horario_funcionamento}
                onChange={alterarCampo}
                editing={editando}
                placeholder="Ex.: Segunda a sexta, das 8h às 17h"
                required
                maxLength={150}
              />
            </div>
          </section>

          {/* AÇÕES */}
          {editando && (
            <div className="sticky bottom-4 z-10 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cancelarEdicao}
                disabled={salvando}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiX size={18} />
                Cancelar
              </button>

              <button
                type="submit"
                disabled={salvando}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1759ad] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#104889] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? (
                  <>
                    <FiRefreshCw size={18} className="animate-spin" />
                    Salvando alterações...
                  </>
                ) : (
                  <>
                    <FiSave size={18} />
                    Salvar alterações
                  </>
                )}
              </button>
            </div>
          )}
        </form>

        {/* RODAPÉ */}
        <div className="mt-7 flex flex-col gap-2 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>AndraRecursos — Gestão de Recursos Institucionais</p>

          <p className="flex items-center gap-2">
            <FiShield size={14} />
            Área institucional protegida
          </p>
        </div>
      </div>
    </main>
  );
}

export default PerfilInstituicao;
