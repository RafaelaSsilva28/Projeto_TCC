
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import logo from "../assets/AndraRecursos.png";
import { enderecoServidor } from "../utils";

import {
  FiChevronLeft,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
} from "react-icons/fi";

const dadosIniciais = {
  gestor: "",
  secretaria_vinculada: "",
  logradouro: "",
  cep: "",
  numero: "",
  bairro: "",
  telefone: "",
  horario_funcionamento: "",
  status_instituicao: "",
};

const secretarias = [
  "Secretaria de Saúde",
  "Secretaria de Educação",
  "Secretaria de Administração",
  "Secretaria da Fazenda",
];

const classeInput =
  "w-full min-w-0 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-[#06458f] focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100";

function Campo({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  maxLength,
}) {
  return (
    <div className="min-w-0 space-y-2">
      <label
        htmlFor={name}
        className="block text-sm font-semibold text-gray-700"
      >
        {label}
        <span className="ml-1 text-red-600">*</span>
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        required
        className={classeInput}
      />
    </div>
  );
}

export default function ObrigatorioInst() {
  const navigate = useNavigate();

  const [dados, setDados] = useState(dadosIniciais);
  const [instituicao, setInstituicao] = useState(null);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function buscarDados() {
      const token = localStorage.getItem(
        "@AndraRecursos:token"
      );

      if (!token) {
        navigate("/", { replace: true });
        return;
      }

      try {
        const resposta = await fetch(
          `${enderecoServidor}/instituicoes/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!resposta.ok) {
          throw new Error(
            "Não foi possível consultar a instituição."
          );
        }

        const resultado = await resposta.json();

        if (!ativo) return;

        if (resultado.cadastro_completo === true) {
          navigate("/principal-inst", { replace: true });
          return;
        }

        setInstituicao(resultado);

        setDados({
          gestor: resultado.gestor || "",
          secretaria_vinculada:
            resultado.secretaria_vinculada || "",
          logradouro: resultado.logradouro || "",
          cep: resultado.cep || "",
          numero: resultado.numero || "",
          bairro: resultado.bairro || "",
          telefone: resultado.telefone || "",
          horario_funcionamento:
            resultado.horario_funcionamento || "",
          status_instituicao:
            resultado.status_instituicao || "",
        });

      } catch (error) {
        if (ativo) setErro(error.message);
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    buscarDados();

    return () => {
      ativo = false;
    };
  }, [navigate]);

  function alterarCampo(event) {
    const { name, value } = event.target;

    setDados((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  }

  function voltarLogin() {
    localStorage.removeItem("@AndraRecursos:token");
    localStorage.removeItem("@AndraRecursos:usuario");
    localStorage.removeItem("@AndraRecursos:lembrar");

    navigate("/", { replace: true });
  }

  async function finalizarCadastro(event) {
    event.preventDefault();

    if (salvando) return;

    setErro("");

    const token = localStorage.getItem(
      "@AndraRecursos:token"
    );

    if (!token) {
      setErro("Sessão expirada. Faça login novamente.");
      return;
    }

    const faltando = Object.values(dados).some(
      (valor) => !String(valor).trim()
    );

    if (faltando) {
      setErro("Todos os campos são obrigatórios.");
      return;
    }

    const cepNumerico = dados.cep.replace(/\D/g, "");
    const telefoneNumerico = dados.telefone.replace(
      /\D/g,
      ""
    );

    if (cepNumerico.length !== 8) {
      setErro("O CEP deve possuir 8 números.");
      return;
    }

    if (
      telefoneNumerico.length < 10 ||
      telefoneNumerico.length > 11
    ) {
      setErro("Informe um telefone válido.");
      return;
    }

    setSalvando(true);

    try {
      const resposta = await fetch(
        `${enderecoServidor}/instituicoes/completar-cadastro`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(dados),
        }
      );

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado.message || "Erro ao finalizar cadastro."
        );
      }

      if (resultado.cadastro_completo !== true) {
        throw new Error(
          "O cadastro não foi confirmado pelo servidor."
        );
      }

      setSucesso(true);

    } catch (error) {
      setErro(error.message);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f5f8]">
        <div className="flex items-center gap-3 text-[#082d56]">
          <FiLoader className="animate-spin text-2xl" />
          <span>Carregando informações...</span>
        </div>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f5f8] p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">

          <FiCheckCircle className="mx-auto text-6xl text-green-600" />

          <h1 className="mt-5 text-2xl font-bold text-[#082d56]">
            Acesso liberado!
          </h1>

          <p className="mt-3 text-gray-600">
            O cadastro obrigatório de
            <strong className="block text-[#06458f]">
              {instituicao?.nome}
            </strong>
            foi concluído com sucesso.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/principal-inst", { replace: true })
            }
            className="mt-6 w-full rounded-lg bg-[#06458f] px-5 py-3 font-semibold text-white hover:bg-[#04366d]"
          >
            Acessar Dashboard
          </button>

        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#e9edf3] px-4 py-6 font-sans text-gray-800 sm:px-6 lg:px-10">

      {/* VOLTAR */}
      <button
        type="button"
        onClick={voltarLogin}
        className="mb-5 flex items-center gap-2 text-sm font-semibold text-[#082d56] hover:text-blue-600"
      >
        <FiChevronLeft size={20} />
        Voltar
      </button>

      {/* ORIENTAÇÃO */}
      <div className="mx-auto mb-6 max-w-6xl">
        <h1 className="text-2xl font-bold text-[#082d56]">
          Cadastro Obrigatório
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Para continuar acessando o sistema AndraRecursos,
          preencha todas as informações obrigatórias da sua
          unidade. Este procedimento é realizado apenas no
          primeiro acesso.
        </p>
      </div>

      {/* CARTÃO PRINCIPAL */}
      <div className="mx-auto max-w-6xl rounded-2xl border border-gray-200 bg-white p-5 shadow-lg sm:p-7">

        <form
          onSubmit={finalizarCadastro}
          className="grid grid-cols-1 gap-8 lg:grid-cols-2"
        >

          {/* COLUNA ESQUERDA */}
          <div className="space-y-6">

            <section>
              <h2 className="mb-4 border-b border-gray-200 pb-2 text-lg font-bold text-[#06458f]">
                Responsável e Vínculo
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <Campo
                  label="Nome Completo"
                  name="gestor"
                  value={dados.gestor}
                  onChange={alterarCampo}
                  placeholder="Nome do responsável"
                />

                <div className="space-y-2">
                  <label
                    htmlFor="secretaria_vinculada"
                    className="block text-sm font-semibold text-gray-700"
                  >
                    Secretaria Vinculada
                    <span className="ml-1 text-red-600">*</span>
                  </label>

                  <select
                    id="secretaria_vinculada"
                    name="secretaria_vinculada"
                    value={dados.secretaria_vinculada}
                    onChange={alterarCampo}
                    required
                    className={classeInput}
                  >
                    <option value="">Selecione Secretaria</option>

                    {secretarias.map((secretaria) => (
                      <option key={secretaria} value={secretaria}>
                        {secretaria}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 border-b border-gray-200 pb-2 text-lg font-bold text-[#06458f]">
                Endereço Institucional
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div className="sm:col-span-2">
                  <Campo
                    label="Logradouro"
                    name="logradouro"
                    value={dados.logradouro}
                    onChange={alterarCampo}
                    placeholder="Rua ou avenida"
                  />
                </div>

                <Campo
                  label="CEP"
                  name="cep"
                  value={dados.cep}
                  onChange={alterarCampo}
                  placeholder="16900-000"
                  maxLength={9}
                />

                <div className="space-y-2">
                  <label className="block text-sm font-semibold">
                    Cidade
                  </label>

                  <input
                    value="Andradina"
                    readOnly
                    className={`${classeInput} bg-gray-100`}
                  />
                </div>

                <Campo
                  label="Número"
                  name="numero"
                  value={dados.numero}
                  onChange={alterarCampo}
                  maxLength={10}
                  placeholder="Número"
                />

                <Campo
                  label="Bairro"
                  name="bairro"
                  value={dados.bairro}
                  onChange={alterarCampo}
                  placeholder="Bairro"
                />

              </div>
            </section>

            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-[#06458f]">
              * Todos os campos são obrigatórios para liberar
              o primeiro acesso ao sistema.
            </div>
          </div>

          {/* COLUNA DIREITA */}
          <div className="flex flex-col gap-6">

            {/* BANNER */}
            <div className="flex items-center gap-4 rounded-xl bg-[#082d56] px-5 py-5 text-white">
              <img
                src={logo}
                alt="AndraRecursos"
                className="h-16 w-16 object-contain"
              />

              <div>
                <h2 className="text-xl font-bold">
                  AndraRecursos
                </h2>

                <p className="text-sm text-blue-200">
                  Gestão Institucional
                </p>
              </div>
            </div>

            <section>
              <h2 className="mb-4 border-b border-gray-200 pb-2 text-lg font-bold text-[#06458f]">
                Comunicação e Operação
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <Campo
                  label="Telefone Institucional"
                  name="telefone"
                  value={dados.telefone}
                  onChange={alterarCampo}
                  placeholder="(18) 00000-0000"
                  type="tel"
                />

                <Campo
                  label="Horário de Funcionamento"
                  name="horario_funcionamento"
                  value={dados.horario_funcionamento}
                  onChange={alterarCampo}
                  placeholder="07:00 às 17:00"
                />

                <div className="space-y-2">
                  <label
                    htmlFor="status_instituicao"
                    className="block text-sm font-semibold"
                  >
                    Status
                    <span className="ml-1 text-red-600">*</span>
                  </label>

                  <select
                    id="status_instituicao"
                    name="status_instituicao"
                    value={dados.status_instituicao}
                    onChange={alterarCampo}
                    required
                    className={classeInput}
                  >
                    <option value="">Selecione</option>
                    <option value="Ativa">Ativa</option>
                    <option value="Inativa">Inativa</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold">
                    E-mail Institucional
                  </label>

                  <input
                    type="email"
                    value={instituicao?.email_institucional || ""}
                    readOnly
                    className={`${classeInput} bg-gray-100`}
                  />
                </div>

              </div>
            </section>

            <div className="mt-auto">

              {erro && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  <FiAlertCircle className="mt-1 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={salvando}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#06458f] px-5 py-3 font-semibold text-white transition hover:bg-[#04366d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? (
                  <>
                    <FiLoader className="animate-spin" />
                    Salvando informações...
                  </>
                ) : (
                  <>
                    <FiCheckCircle />
                    Finalizar Cadastro
                  </>
                )}
              </button>
            </div>

          </div>
        </form>
      </div>
    </main>
  );
}
