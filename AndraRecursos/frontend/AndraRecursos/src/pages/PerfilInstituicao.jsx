
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const token = localStorage.getItem("@AndraRecursos:token");

  if (token) return token;

  try {
    const usuario = JSON.parse(
      localStorage.getItem("@AndraRecursos:usuario") || "null"
    );

    return (
      usuario?.token ||
      usuario?.accessToken ||
      usuario?.access_token ||
      ""
    );
  } catch {
    return "";
  }
}

function formatarCEP(valor) {
  const numeros = String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 8);

  return numeros.length > 5
    ? `${numeros.slice(0, 5)}-${numeros.slice(5)}`
    : numeros;
}

function formatarTelefone(valor) {
  const numeros = String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 11);

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
  name,
  value,
  onChange,
  editando,
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
        {editando && required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      {editando ? (
        <input
          id={name}
          name={name}
          type={type}
          value={value ?? ""}
          onChange={onChange}
          placeholder={placeholder || label}
          required={required}
          maxLength={maxLength}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
        />
      ) : (
        <div className="flex min-h-12 items-center rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="break-words text-sm text-slate-700">
            {value || (
              <span className="text-slate-400">Não informado</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

function CampoBloqueado({ label, value }) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <div className="flex min-h-12 items-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-3">
        <p className="break-words text-sm text-slate-600">
          {value || "Não informado"}
        </p>
      </div>
    </div>
  );
}

function Secao({ icon: Icon, titulo, descricao, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-5 md:px-7">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1759ad]">
          <Icon size={20} />
        </div>

        <div className="min-w-0">
          <h2 className="font-bold text-[#082d56]">{titulo}</h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            {descricao}
          </p>
        </div>
      </div>

      <div className="grid gap-x-6 gap-y-5 p-5 md:grid-cols-2 md:p-7">
        {children}
      </div>
    </section>
  );
}

function Indicador({ titulo, valor, icon: Icon }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-[#1759ad]">
        <Icon size={19} />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{titulo}</p>
        <p className="mt-1 break-words text-sm font-bold text-[#082d56]">
          {valor || "Não informado"}
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

  const buscarPerfil = useCallback(async () => {
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
            "Não foi possível carregar o perfil."
        );
      }

      const perfil = dados?.instituicao || dados?.perfil || dados;

      if (!perfil || typeof perfil !== "object") {
        throw new Error("Os dados da instituição não foram encontrados.");
      }

      setInstituicao(perfil);
      setFormulario(normalizarFormulario(perfil));
    } catch (error) {
      console.error("Erro ao buscar perfil institucional:", error);
      setErro(
        error.message || "Ocorreu um erro ao carregar os dados."
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
    let novoValor = value;

    if (name === "cep") novoValor = formatarCEP(value);
    if (name === "telefone") novoValor = formatarTelefone(value);
    if (name === "numero") novoValor = value.slice(0, 10);

    setFormulario((anterior) => ({
      ...anterior,
      [name]: novoValor,
    }));
  }

  function iniciarEdicao() {
    setFormulario(normalizarFormulario(instituicao));
    setEditando(true);
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

    const obrigatorios = [
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

    for (const [campo, mensagem] of obrigatorios) {
      if (!String(formulario[campo] || "").trim()) {
        toast.error(mensagem);
        return;
      }
    }

    const cep = String(formulario.cep).replace(/\D/g, "");
    const telefone = String(formulario.telefone).replace(/\D/g, "");

    if (cep.length !== 8) {
      toast.error("O CEP deve conter 8 números.");
      return;
    }

    if (![10, 11].includes(telefone.length)) {
      toast.error("Informe o telefone com DDD e 8 ou 9 números.");
      return;
    }

    const dadosParaEnviar = {};

    for (const campo of CAMPOS_EDITAVEIS) {
      let valor = String(formulario[campo] || "").trim();

      if (campo === "cep") valor = cep;
      if (campo === "telefone") valor = telefone;

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
      toast.success("Perfil atualizado com sucesso!");
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

  if (carregando && !instituicao) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <FiRefreshCw
            size={32}
            className="animate-spin text-[#1759ad]"
          />
          <p className="text-sm text-slate-500">
            Carregando perfil da instituição...
          </p>
        </div>
      </main>
    );
  }

  if (erro && !instituicao) {
    return (
      <main className="min-h-[60vh] bg-slate-50 p-5 md:p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-7">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <FiAlertCircle size={25} />
          </div>

          <h1 className="text-xl font-bold text-[#082d56]">
            Não foi possível abrir o perfil
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {erro}
          </p>

          <button
            type="button"
            onClick={buscarPerfil}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1759ad] px-5 py-3 text-sm font-semibold text-white hover:bg-[#104889]"
          >
            <FiRefreshCw size={17} />
            Tentar novamente
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        {/* CAMINHO DE NAVEGAÇÃO */}
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <button
            type="button"
            onClick={() => navigate("/principal-inst")}
            className="transition hover:text-[#1759ad]"
          >
            Área institucional
          </button>

          <FiChevronRight size={15} />

          <span className="font-semibold text-[#082d56]">
            Meu perfil
          </span>
        </div>

        {/* CABEÇALHO DA PÁGINA */}
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#082d56] md:text-3xl">
              Meu perfil
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Consulte e gerencie as informações da sua instituição.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={buscarPerfil}
              disabled={carregando || salvando}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
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
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1759ad] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#104889]"
              >
                <FiEdit3 size={16} />
                Editar informações
              </button>
            )}
          </div>
        </div>

        {/* IDENTIFICAÇÃO DA INSTITUIÇÃO */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 bg-[#1759ad]" />

          <div className="p-5 md:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
              <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-2xl bg-[#edf4ff] text-[#1759ad]">
                <FiHome size={34} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Instituição
                </p>

                <h2 className="break-words text-xl font-bold text-[#082d56] md:text-2xl">
                  {instituicao?.nome || "Nome não informado"}
                </h2>

                <p className="mt-2 flex items-start gap-2 break-all text-sm text-slate-500">
                  <FiMail size={16} className="mt-0.5 shrink-0" />
                  {instituicao?.email_institucional || "E-mail não informado"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${
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

            <div className="mt-6 grid gap-3 border-t border-slate-100 pt-6 sm:grid-cols-2 lg:grid-cols-3">
              <Indicador
                titulo="Código institucional"
                valor={instituicao?.id_instituicao}
                icon={FiHash}
              />

              <Indicador
                titulo="Tipo de acesso"
                valor={instituicao?.tipo_acesso || "Usuário Institucional"}
                icon={FiShield}
              />

              <Indicador
                titulo="Status da instituição"
                valor={instituicao?.status_instituicao}
                icon={FiCheckCircle}
              />
            </div>
          </div>
        </section>

        {/* FORMULÁRIO */}
        <form onSubmit={salvarAlteracoes}>
          {editando && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <FiAlertCircle
                size={19}
                className="mt-0.5 shrink-0 text-[#1759ad]"
              />

              <div>
                <p className="text-sm font-bold text-[#082d56]">
                  Você está editando seu perfil
                </p>

                <p className="mt-1 text-sm leading-5 text-slate-600">
                  Os campos marcados com asterisco são obrigatórios.
                  Nome, e-mail institucional e status não podem ser
                  alterados por esta tela.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-5">
            {/* GESTÃO */}
            <Secao
              icon={FiBriefcase}
              titulo="Dados da gestão"
              descricao="Responsáveis e vínculo administrativo da instituição."
            >
              <CampoBloqueado
                label="Nome da instituição"
                value={instituicao?.nome}
              />

              <CampoBloqueado
                label="E-mail institucional"
                value={instituicao?.email_institucional}
              />

              <Campo
                label="Nome do gestor"
                name="gestor"
                value={formulario.gestor}
                onChange={alterarCampo}
                editando={editando}
                placeholder="Digite o nome completo do gestor"
                required
              />

              <Campo
                label="Secretaria vinculada"
                name="secretaria_vinculada"
                value={formulario.secretaria_vinculada}
                onChange={alterarCampo}
                editando={editando}
                placeholder="Digite a secretaria responsável"
                required
              />
            </Secao>

            {/* LOCALIZAÇÃO */}
            <Secao
              icon={FiMapPin}
              titulo="Endereço"
              descricao="Localização e endereço cadastrado da instituição."
            >
              <Campo
                label="Logradouro"
                name="logradouro"
                value={formulario.logradouro}
                onChange={alterarCampo}
                editando={editando}
                placeholder="Rua, avenida ou praça"
                required
              />

              <Campo
                label="Bairro"
                name="bairro"
                value={formulario.bairro}
                onChange={alterarCampo}
                editando={editando}
                placeholder="Digite o bairro"
                required
              />

              <Campo
                label="Número"
                name="numero"
                value={formulario.numero}
                onChange={alterarCampo}
                editando={editando}
                placeholder="Número do endereço"
                required
                maxLength={10}
              />

              <Campo
                label="CEP"
                name="cep"
                value={formulario.cep}
                onChange={alterarCampo}
                editando={editando}
                placeholder="00000-000"
                required
                maxLength={9}
              />
            </Secao>

            {/* CONTATO */}
            <Secao
              icon={FiPhone}
              titulo="Contato e funcionamento"
              descricao="Telefone e horário de atendimento ao público."
            >
              <Campo
                label="Telefone institucional"
                name="telefone"
                value={formulario.telefone}
                onChange={alterarCampo}
                editando={editando}
                placeholder="(00) 00000-0000"
                required
                maxLength={15}
              />

              <Campo
                label="Horário de funcionamento"
                name="horario_funcionamento"
                value={formulario.horario_funcionamento}
                onChange={alterarCampo}
                editando={editando}
                placeholder="Ex.: Segunda a sexta, das 8h às 17h"
                required
                maxLength={150}
              />
            </Secao>
          </div>

          {/* BOTÕES DE EDIÇÃO */}
          {editando && (
            <div className="mt-6 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-slate-500">
                Confira os dados antes de salvar as alterações.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={cancelarEdicao}
                  disabled={salvando}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <FiX size={17} />
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvando}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1759ad] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#104889] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvando ? (
                    <>
                      <FiRefreshCw size={17} className="animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <FiSave size={17} />
                      Salvar alterações
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* RODAPÉ */}
        <footer className="mt-8 flex flex-col gap-2 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>AndraRecursos · Gestão de Recursos Institucionais</span>

          <span className="flex items-center gap-2">
            <FiShield size={14} />
            Área institucional protegida
          </span>
        </footer>
      </div>
    </main>
  );
}

export default PerfilInstituicao;
