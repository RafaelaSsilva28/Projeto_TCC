import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
  FiSettings,
  FiShield,
  FiLock,
  FiEye,
  FiEyeOff,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiUser,
  FiMail,
  FiMonitor,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";

const API = String(enderecoServidor).replace(/\/$/, "");

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
// PÁGINA DE CONFIGURAÇÕES
// =============================================
export default function ConfiguracoesAdmin() {
  const [carregando, setCarregando] = useState(true);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [erro, setErro] = useState("");

  const [administrador, setAdministrador] = useState({
    nome: "",
    email: "",
  });

  const [senhas, setSenhas] = useState({
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: "",
  });

  const [mostrarSenha, setMostrarSenha] = useState(false);

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
  // TELA DE CARREGAMENTO
  // ==========================================
  if (carregando) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-[#082d56] shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100">
        <FiRefreshCw className="animate-spin" size={28} />
        <p className="mt-4">Carregando configurações...</p>
      </div>
    );
  }

  // ==========================================
  // INTERFACE PRINCIPAL
  // ==========================================
  const classeCartao =
    "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800";

  const classeCabecalhoCartao =
    "flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6 dark:border-slate-700";

  const classeIconeCartao =
    "rounded-xl bg-blue-50 p-3 text-[#1755ad] dark:bg-slate-700 dark:text-blue-300";

  const classeCampo =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#1755ad] focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-900 dark:focus:ring-blue-900/40";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-900">
      <div className="mx-auto w-full max-w-none">
        {/* CABEÇALHO */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <FiMonitor size={16} />
            <span>Administrador</span>
            <span>/</span>
            <span className="font-medium text-[#1755ad] dark:text-blue-300">
              Configurações
            </span>
          </div>

          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-[#082d56] sm:text-3xl dark:text-white">
            <FiSettings />
            Configurações
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base dark:text-slate-400">
            Gerencie os dados da sua conta e a segurança do acesso.
          </p>
        </div>

        {/* ERRO DE CARREGAMENTO */}
        {erro && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            <FiAlertCircle className="mt-0.5 shrink-0" size={20} />
            <p className="flex-1">{erro}</p>
          </div>
        )}

        {/* IDENTIFICAÇÃO DO ADMINISTRADOR */}
        <section className={`${classeCartao} mb-6`}>
          <div className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
            <div className={classeIconeCartao}>
              <FiUser size={24} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-[#082d56] dark:text-white">
                {administrador.nome || "Administrador"}
              </h2>

              <p className="mt-1 flex items-center gap-2 break-all text-sm text-slate-500 dark:text-slate-400">
                <FiMail className="shrink-0" />
                {administrador.email || "E-mail não informado"}
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#1755ad] dark:bg-slate-700 dark:text-blue-300">
              ADMINISTRADOR
            </span>
          </div>
        </section>

        {/* CARDS PRINCIPAIS */}
        <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2">
          {/* ALTERAR SENHA */}
          <section className={classeCartao}>
            <div className={classeCabecalhoCartao}>
              <div className={classeIconeCartao}>
                <FiLock size={21} />
              </div>

              <div>
                <h2 className="font-bold text-[#082d56] dark:text-white">
                  Segurança da conta
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Atualize sua senha de acesso ao AndraRecursos.
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <form onSubmit={alterarSenha} className="space-y-5">
                {[
                  {
                    campo: "senhaAtual",
                    titulo: "Senha atual",
                    placeholder: "Digite sua senha atual",
                    autoComplete: "current-password",
                  },
                  {
                    campo: "novaSenha",
                    titulo: "Nova senha",
                    placeholder: "Mínimo de 8 caracteres",
                    autoComplete: "new-password",
                  },
                  {
                    campo: "confirmarSenha",
                    titulo: "Confirmar nova senha",
                    placeholder: "Digite a nova senha novamente",
                    autoComplete: "new-password",
                  },
                ].map((item) => (
                  <div key={item.campo}>
                    <label
                      htmlFor={item.campo}
                      className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      {item.titulo}
                    </label>

                    <div className="relative">
                      <input
                        id={item.campo}
                        name={item.campo}
                        type={mostrarSenha ? "text" : "password"}
                        value={senhas[item.campo]}
                        onChange={(evento) =>
                          setSenhas((anterior) => ({
                            ...anterior,
                            [item.campo]: evento.target.value,
                          }))
                        }
                        placeholder={item.placeholder}
                        autoComplete={item.autoComplete}
                        maxLength={72}
                        required
                        className={classeCampo}
                      />

                      <button
                        type="button"
                        onClick={() => setMostrarSenha((valor) => !valor)}
                        aria-label={
                          mostrarSenha ? "Ocultar senhas" : "Mostrar senhas"
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-[#082d56] dark:hover:bg-slate-700 dark:hover:text-white"
                      >
                        {mostrarSenha ? (
                          <FiEyeOff size={18} />
                        ) : (
                          <FiEye size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}

                <p className="text-xs leading-relaxed text-slate-400 dark:text-slate-500">
                  Utilize uma senha exclusiva com pelo menos 8 caracteres.
                </p>

                <button
                  type="submit"
                  disabled={salvandoSenha}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1755ad] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#124477] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[#1f66c9]"
                >
                  {salvandoSenha ? (
                    <FiRefreshCw className="animate-spin" size={18} />
                  ) : (
                    <FiCheckCircle size={18} />
                  )}

                  {salvandoSenha ? "Alterando senha..." : "Alterar senha"}
                </button>
              </form>
            </div>
          </section>

          {/* ORIENTAÇÕES DE SEGURANÇA */}
          <section className="flex h-full flex-col overflow-hidden rounded-2xl bg-[#082d56] p-5 text-white shadow-sm sm:p-6 dark:border dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <FiShield size={24} />
            </div>

            <h2 className="text-lg font-bold">Proteção da conta</h2>

            <p className="mt-2 text-sm leading-relaxed text-blue-100">
              Mantenha suas credenciais protegidas e não compartilhe sua senha
              com outras pessoas.
            </p>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FiLock size={17} />
                Requisitos de senha
              </div>

              <p className="mt-2 text-xs leading-relaxed text-blue-100">
                A senha deve ter pelo menos 8 caracteres e não pode ultrapassar
                72 caracteres.
              </p>
            </div>

            <div className="mt-auto pt-6">
              <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-blue-100">
                <FiShield className="mt-0.5 shrink-0" size={16} />
                As configurações de segurança são vinculadas à conta autenticada
                do administrador.
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
