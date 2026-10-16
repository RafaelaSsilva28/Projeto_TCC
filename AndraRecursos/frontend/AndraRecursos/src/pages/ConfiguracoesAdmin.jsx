import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
  FiSettings,
  FiShield,
  FiMonitor,
  FiLock,
  FiEye,
  FiEyeOff,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiUser,
  FiMail,
  FiMoon,
  FiSun,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";

const API = String(enderecoServidor).replace(/\/$/, "");
const CHAVE_TEMA = "@AndraRecursos:modo_escuro";

// =============================================
// TEMA LOCAL
// =============================================

function lerTemaLocal() {
  return localStorage.getItem(CHAVE_TEMA) === "true";
}

function aplicarTema(escuro) {
  document.documentElement.classList.toggle("dark", escuro);

  localStorage.setItem(CHAVE_TEMA, String(escuro));
}

// =============================================
// CONEXÃO COM A API
// =============================================

async function requisicao(caminho, opcoes = {}) {
  const token = localStorage.getItem("@AndraRecursos:token");

  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

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
      dados?.message || dados?.error || `Erro ${resposta.status} na API.`,
    );
  }

  return dados;
}

// =============================================
// OPÇÃO DE TEMA
// =============================================

function OpcaoConfiguracao({ titulo, descricao, valor, aoAlterar }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-[#f8fafc] p-4 transition hover:border-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[#082d56] dark:text-gray-100">
          {titulo}
        </span>

        <span className="mt-1 block text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          {descricao}
        </span>
      </span>

      <span className="relative shrink-0">
        <input
          type="checkbox"
          checked={valor}
          onChange={(evento) => aoAlterar(evento.target.checked)}
          className="peer sr-only"
        />

        <span className="block h-7 w-12 rounded-full bg-gray-300 transition peer-checked:bg-[#1759ad] peer-focus-visible:ring-4 peer-focus-visible:ring-blue-200 dark:bg-gray-600" />

        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

// =============================================
// PÁGINA DE CONFIGURAÇÕES
// =============================================

export default function ConfiguracoesAdmin() {
  const [aba, setAba] = useState("seguranca");

  const [carregando, setCarregando] = useState(true);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [erro, setErro] = useState("");

  const [administrador, setAdministrador] = useState({
    nome: "",
    email: "",
  });

  const [temaEscuro, setTemaEscuro] = useState(lerTemaLocal);

  const [senhas, setSenhas] = useState({
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: "",
  });

  const [mostrarSenha, setMostrarSenha] = useState(false);

  // ==========================================
  // APLICAR TEMA
  // ==========================================

  useEffect(() => {
    aplicarTema(temaEscuro);
  }, [temaEscuro]);

  // ==========================================
  // CARREGAR DADOS DO ADMINISTRADOR
  // ==========================================

  useEffect(() => {
    let ativo = true;

    async function carregarConfiguracoes() {
      setCarregando(true);
      setErro("");

      try {
        const dados = await requisicao("/configuracoes-admin");

        if (!ativo) return;

        setAdministrador({
          nome: dados.nome || "",
          email: dados.email || "",
        });
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

    carregarConfiguracoes();

    return () => {
      ativo = false;
    };
  }, []);

  // ==========================================
  // ALTERAR TEMA
  // ==========================================

  function alterarTema(valor) {
    setTemaEscuro(valor);
  }

  // ==========================================
  // ALTERAR SENHA DO ADMINISTRADOR
  // ==========================================

  async function alterarSenha(evento) {
    evento.preventDefault();

    if (salvandoSenha) return;

    if (!senhas.senhaAtual) {
      toast.error("Informe a senha atual.");
      return;
    }

    if (senhas.novaSenha.length < 8 || senhas.novaSenha.length > 72) {
      toast.error("A nova senha deve ter entre 8 e 72 caracteres.");
      return;
    }

    if (senhas.novaSenha !== senhas.confirmarSenha) {
      toast.error("As senhas informadas não coincidem.");
      return;
    }

    setSalvandoSenha(true);

    try {
      await requisicao("/configuracoes-admin/senha", {
        method: "PATCH",
        body: JSON.stringify(senhas),
      });

      setSenhas({
        senhaAtual: "",
        novaSenha: "",
        confirmarSenha: "",
      });

      setMostrarSenha(false);

      toast.success("Senha alterada com sucesso!");
    } catch (error) {
      toast.error(error.message || "Não foi possível alterar a senha.");
    } finally {
      setSalvandoSenha(false);
    }
  }

  // ==========================================
  // ABAS DO MENU INTERNO
  // ==========================================

  const abas = [
    {
      id: "seguranca",
      nome: "Segurança",
      Icone: FiShield,
    },
    {
      id: "aparencia",
      nome: "Aparência",
      Icone: FiMonitor,
    },
  ];

  // ==========================================
  // TELA DE CARREGAMENTO
  // ==========================================

  if (carregando) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-[#082d56] dark:text-gray-100">
        <FiRefreshCw className="animate-spin" />
        Carregando configurações...
      </div>
    );
  }

  // ==========================================
  // INTERFACE PRINCIPAL
  // ==========================================

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-[#082d56] dark:text-gray-100 sm:text-3xl">
          <FiSettings />
          Configurações
        </h1>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Gerencie a segurança e as preferências da sua conta.
        </p>
      </div>

      {/* ERROS */}
      {erro && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          <FiAlertCircle />
          {erro}
        </div>
      )}

      {/* CARTÃO DO ADMINISTRADOR */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#082d56] dark:bg-blue-950 dark:text-blue-200">
          <FiUser size={25} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-bold text-[#082d56] dark:text-gray-100">
            {administrador.nome || "Administrador"}
          </p>

          <p className="mt-1 flex items-center gap-2 break-all text-xs text-gray-500 dark:text-gray-400">
            <FiMail className="shrink-0" />
            {administrador.email || "E-mail não informado"}
          </p>
        </div>

        <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold text-[#1759ad] dark:bg-blue-950 dark:text-blue-200">
          ADMINISTRADOR
        </span>
      </div>

      {/* LAYOUT INTERNO */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        {/* MENU DE ABAS */}
        <aside className="h-fit rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
            Preferências
          </p>

          <div className="space-y-1">
            {abas.map(({ id, nome, Icone }) => (
              <button
                key={id}
                type="button"
                onClick={() => setAba(id)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${
                  aba === id
                    ? "bg-[#082d56] text-white"
                    : "text-gray-600 hover:bg-blue-50 hover:text-[#082d56] dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                }`}
              >
                <Icone size={18} />
                {nome}
              </button>
            ))}
          </div>
        </aside>

        {/* CONTEÚDO DAS ABAS */}
        <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-7">
          {/* SEGURANÇA */}
          {aba === "seguranca" && (
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-100 p-3 text-[#1759ad] dark:bg-blue-950 dark:text-blue-200">
                  <FiLock size={21} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-[#082d56] dark:text-gray-100">
                    Segurança da conta
                  </h2>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Atualize sua senha de acesso ao AndraRecursos.
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700" />

              <form onSubmit={alterarSenha} className="max-w-xl space-y-5">
                {[
                  {
                    campo: "senhaAtual",
                    titulo: "Senha atual",
                    placeholder: "Digite sua senha atual",
                  },
                  {
                    campo: "novaSenha",
                    titulo: "Nova senha",
                    placeholder: "Digite a nova senha",
                  },
                  {
                    campo: "confirmarSenha",
                    titulo: "Confirmar nova senha",
                    placeholder: "Repita a nova senha",
                  },
                ].map((item) => (
                  <div key={item.campo}>
                    <label
                      htmlFor={item.campo}
                      className="mb-2 block text-sm font-semibold text-[#082d56] dark:text-gray-200"
                    >
                      {item.titulo}
                    </label>

                    <div className="relative">
                      <input
                        id={item.campo}
                        type={mostrarSenha ? "text" : "password"}
                        required
                        autoComplete={
                          item.campo === "senhaAtual"
                            ? "current-password"
                            : "new-password"
                        }
                        value={senhas[item.campo]}
                        onChange={(evento) =>
                          setSenhas((anterior) => ({
                            ...anterior,
                            [item.campo]: evento.target.value,
                          }))
                        }
                        placeholder={item.placeholder}
                        className="min-h-12 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-12 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
                      />

                      <button
                        type="button"
                        onClick={() => setMostrarSenha((valor) => !valor)}
                        title={
                          mostrarSenha ? "Ocultar senhas" : "Mostrar senhas"
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        {mostrarSenha ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                ))}

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Utilize uma senha exclusiva com pelo menos 8 caracteres.
                </p>

                <button
                  type="submit"
                  disabled={salvandoSenha}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#082d56] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#164675] disabled:opacity-50"
                >
                  {salvandoSenha ? (
                    <FiRefreshCw className="animate-spin" />
                  ) : (
                    <FiCheckCircle />
                  )}

                  {salvandoSenha ? "Alterando senha..." : "Alterar senha"}
                </button>
              </form>
            </div>
          )}

          {/* APARÊNCIA */}
          {aba === "aparencia" && (
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-100 p-3 text-[#1759ad] dark:bg-blue-950 dark:text-blue-200">
                  {temaEscuro ? <FiMoon size={21} /> : <FiSun size={21} />}
                </div>

                <div>
                  <h2 className="text-xl font-bold text-[#082d56] dark:text-gray-100">
                    Aparência do sistema
                  </h2>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Personalize o tema da sua experiência no AndraRecursos.
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700" />

              <OpcaoConfiguracao
                titulo={
                  temaEscuro ? "Tema escuro ativado" : "Tema claro ativado"
                }
                descricao="Alterne entre o tema claro e o escuro. Sua preferência fica salva neste navegador."
                valor={temaEscuro}
                aoAlterar={alterarTema}
              />

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                <p className="text-sm font-semibold text-[#082d56] dark:text-blue-100">
                  Identidade visual do sistema
                </p>

                <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                  O AndraRecursos utiliza azul-marinho, branco e tons suaves
                  para manter consistência visual entre as páginas.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
