import { useEffect, useState } from "react";
import LayoutInstituicao from "../components/LayoutInstituicao";
import {
  FiLock,
  FiEye,
  FiEyeOff,
  FiShield,
  FiUser,
  FiMail,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
  FiMonitor,
} from "react-icons/fi";

import { enderecoServidor } from "../utils";

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================
async function requisicaoAPI(caminho, metodo = "GET", dados = null) {
  const token = localStorage.getItem("@AndraRecursos:token");

  if (!token) {
    throw new Error("Sua sessão expirou. Entre novamente na sua conta.");
  }

  const opcoes = {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  };

  if (dados !== null) {
    opcoes.headers["Content-Type"] = "application/json";
    opcoes.body = JSON.stringify(dados);
  }

  let resposta;

  try {
    resposta = await fetch(`${enderecoServidor}${caminho}`, opcoes);
  } catch {
    throw new Error(
      "Não foi possível conectar ao servidor. Verifique sua conexão.",
    );
  }

  const texto = await resposta.text();
  let resultado = {};

  if (texto) {
    try {
      resultado = JSON.parse(texto);
    } catch {
      resultado = { message: texto };
    }
  }

  if (!resposta.ok) {
    throw new Error(
      resultado.message ||
        resultado.mensagem ||
        `Erro na solicitação (${resposta.status}).`,
    );
  }

  return resultado;
}

// ==========================================
// IDENTIDADE LOCAL
// ==========================================
function lerIdentidadeLocal() {
  const identidade = {
    nome: "",
    email_institucional: "",
  };

  try {
    const token = localStorage.getItem("@AndraRecursos:token");

    if (token) {
      const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");

      const payload = JSON.parse(decodeURIComponent(escape(atob(base64))));

      identidade.nome = payload.nome || payload.nome_instituicao || "";

      identidade.email_institucional =
        payload.email_institucional || payload.email || "";
    }
  } catch {
    // Ignora token fora do padrão esperado.
  }

  if (!identidade.nome || !identidade.email_institucional) {
    for (const chave of [
      "@AndraRecursos:usuario",
      "@AndraRecursos:user",
      "@AndraRecursos:instituicao",
    ]) {
      try {
        const salvo = JSON.parse(localStorage.getItem(chave) || "null");

        if (salvo) {
          identidade.nome = identidade.nome || salvo.nome || "";

          identidade.email_institucional =
            identidade.email_institucional ||
            salvo.email_institucional ||
            salvo.email ||
            "";
        }
      } catch {
        // Ignora dados locais inválidos.
      }
    }
  }

  return identidade;
}

// ==========================================
// CAMPO DE SENHA
// ==========================================
function CampoSenha({
  campo,
  titulo,
  placeholder,
  valor,
  visivel,
  autoComplete,
  onChange,
  onAlternar,
}) {
  return (
    <div>
      <label
        htmlFor={campo}
        className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
      >
        {titulo}
      </label>

      <div className="relative">
        <input
          id={campo}
          name={campo}
          type={visivel ? "text" : "password"}
          value={valor}
          onChange={(event) => onChange(campo, event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={72}
          required
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#1755ad] focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-900 dark:focus:ring-blue-900/40"
        />

        <button
          type="button"
          onClick={() => onAlternar(campo)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-[#082d56] dark:hover:bg-slate-700 dark:hover:text-white"
        >
          {visivel ? <FiEyeOff size={18} /> : <FiEye size={18} />}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// PÁGINA
// ==========================================
export default function ConfiguracoesInst() {
  const [configuracoes, setConfiguracoes] = useState({
    nome: "",
    email_institucional: "",
  });

  const [senhas, setSenhas] = useState({
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: "",
  });

  const [mostrarSenhas, setMostrarSenhas] = useState({
    senhaAtual: false,
    novaSenha: false,
    confirmarSenha: false,
  });

  const [carregando, setCarregando] = useState(true);
  const [alterandoSenha, setAlterandoSenha] = useState(false);

  const [mensagem, setMensagem] = useState({
    tipo: "",
    texto: "",
  });

  // ---------- CARREGAR DADOS ----------
  async function carregarConfiguracoes() {
    setCarregando(true);

    try {
      const resposta = await requisicaoAPI("/configuracoes-inst");

      const dados = resposta.dados || resposta.configuracoes || resposta;

      const local = lerIdentidadeLocal();

      setConfiguracoes({
        nome: dados.nome || local.nome,
        email_institucional:
          dados.email_institucional || local.email_institucional,
      });
    } catch (error) {
      console.error("Erro ao carregar dados da instituição:", error);

      const local = lerIdentidadeLocal();

      setConfiguracoes((anterior) => ({
        nome: anterior.nome || local.nome,
        email_institucional:
          anterior.email_institucional || local.email_institucional,
      }));

      setMensagem({
        tipo: "erro",
        texto:
          error.message || "Não foi possível carregar os dados da instituição.",
      });
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  // ---------- SENHA ----------
  function alterarCampoSenha(campo, valor) {
    setSenhas((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function alternarVisibilidade(campo) {
    setMostrarSenhas((anterior) => ({
      ...anterior,
      [campo]: !anterior[campo],
    }));
  }

  async function alterarSenha(event) {
    event.preventDefault();

    setMensagem({
      tipo: "",
      texto: "",
    });

    if (!senhas.senhaAtual || !senhas.novaSenha || !senhas.confirmarSenha) {
      setMensagem({
        tipo: "erro",
        texto: "Preencha todos os campos de senha.",
      });
      return;
    }

    if (senhas.novaSenha.length < 8 || senhas.novaSenha.length > 72) {
      setMensagem({
        tipo: "erro",
        texto: "A nova senha deve conter entre 8 e 72 caracteres.",
      });
      return;
    }

    if (senhas.novaSenha !== senhas.confirmarSenha) {
      setMensagem({
        tipo: "erro",
        texto: "A confirmação da nova senha não corresponde.",
      });
      return;
    }

    setAlterandoSenha(true);

    try {
      const resposta = await requisicaoAPI(
        "/configuracoes-inst/senha",
        "PATCH",
        {
          senhaAtual: senhas.senhaAtual,
          novaSenha: senhas.novaSenha,
          confirmarSenha: senhas.confirmarSenha,
        },
      );

      setSenhas({
        senhaAtual: "",
        novaSenha: "",
        confirmarSenha: "",
      });

      setMostrarSenhas({
        senhaAtual: false,
        novaSenha: false,
        confirmarSenha: false,
      });

      setMensagem({
        tipo: "sucesso",
        texto:
          resposta.message ||
          resposta.mensagem ||
          "Senha alterada com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao alterar senha:", error);

      setMensagem({
        tipo: "erro",
        texto: error.message || "Não foi possível alterar a senha.",
      });
    } finally {
      setAlterandoSenha(false);
    }
  }

  const classeCartao =
    "h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800";

  const classeCabecalhoCartao =
    "flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6 dark:border-slate-700";

  const classeIconeCartao =
    "rounded-xl bg-blue-50 p-3 text-[#1755ad] dark:bg-slate-700 dark:text-blue-300";

  const classeBotaoSalvar =
    "flex w-full items-center justify-center gap-2 rounded-xl bg-[#1755ad] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#124477] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[#1f66c9]";

  const classeCampoLeitura =
    "flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-900";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-900">
      <div className="mx-auto w-full max-w-none">
        {/* CABEÇALHO */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <FiMonitor size={16} />
            <span>Instituição</span>
            <span>/</span>
            <span className="font-medium text-[#1755ad] dark:text-blue-300">
              Configurações
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#082d56] sm:text-3xl dark:text-white">
            Configurações
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base dark:text-slate-400">
            Gerencie os dados da instituição e a segurança da sua conta.
          </p>
        </div>

        {/* MENSAGEM */}
        {mensagem.texto && (
          <div
            role="status"
            className={`mb-6 flex items-start gap-3 rounded-xl border p-4 ${
              mensagem.tipo === "sucesso"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
            }`}
          >
            {mensagem.tipo === "sucesso" ? (
              <FiCheckCircle className="mt-0.5 shrink-0" size={20} />
            ) : (
              <FiAlertCircle className="mt-0.5 shrink-0" size={20} />
            )}

            <p className="flex-1 text-sm font-medium">{mensagem.texto}</p>

            <button
              type="button"
              onClick={() => setMensagem({ tipo: "", texto: "" })}
              aria-label="Fechar mensagem"
              className="text-current opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {carregando ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <FiLoader
              size={30}
              className="animate-spin text-[#1755ad] dark:text-blue-300"
            />

            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Carregando configurações...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2">
            {/* DADOS DA INSTITUIÇÃO */}
            <section className={classeCartao}>
              <div className={classeCabecalhoCartao}>
                <div className={classeIconeCartao}>
                  <FiUser size={21} />
                </div>

                <div>
                  <h2 className="font-bold text-[#082d56] dark:text-white">
                    Dados da instituição
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Informações da conta autenticada.
                  </p>
                </div>
              </div>

              <div className="flex h-full flex-col justify-between space-y-5 p-5 sm:p-6">
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Nome da instituição
                    </label>

                    <div className={classeCampoLeitura}>
                      <FiUser className="shrink-0 text-slate-400" size={18} />

                      <span className="text-sm text-slate-700 dark:text-slate-200">
                        {configuracoes.nome || "Não informado"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                      E-mail institucional
                    </label>

                    <div className={classeCampoLeitura}>
                      <FiMail className="shrink-0 text-slate-400" size={18} />

                      <span className="break-all text-sm text-slate-700 dark:text-slate-200">
                        {configuracoes.email_institucional || "Não informado"}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="pt-4 text-xs leading-relaxed text-slate-400 dark:text-slate-500">
                  Para alterar os dados cadastrais, entre na área de atendimento
                  responsável pelo cadastro da instituição.
                </p>
              </div>
            </section>

            {/* FORMULÁRIO DE SENHA */}
            <section className={classeCartao}>
              <div className={classeCabecalhoCartao}>
                <div className={classeIconeCartao}>
                  <FiLock size={21} />
                </div>

                <div>
                  <h2 className="font-bold text-[#082d56] dark:text-white">
                    Alterar senha
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Proteja seu acesso.
                  </p>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <form onSubmit={alterarSenha} className="space-y-4">
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={configuracoes.email_institucional || ""}
                    readOnly
                    hidden
                  />

                  <CampoSenha
                    campo="senhaAtual"
                    titulo="Senha atual"
                    placeholder="Digite sua senha atual"
                    valor={senhas.senhaAtual}
                    visivel={mostrarSenhas.senhaAtual}
                    autoComplete="current-password"
                    onChange={alterarCampoSenha}
                    onAlternar={alternarVisibilidade}
                  />

                  <CampoSenha
                    campo="novaSenha"
                    titulo="Nova senha"
                    placeholder="Mínimo de 8 caracteres"
                    valor={senhas.novaSenha}
                    visivel={mostrarSenhas.novaSenha}
                    autoComplete="new-password"
                    onChange={alterarCampoSenha}
                    onAlternar={alternarVisibilidade}
                  />

                  <CampoSenha
                    campo="confirmarSenha"
                    titulo="Confirmar nova senha"
                    placeholder="Digite a nova senha novamente"
                    valor={senhas.confirmarSenha}
                    visivel={mostrarSenhas.confirmarSenha}
                    autoComplete="new-password"
                    onChange={alterarCampoSenha}
                    onAlternar={alternarVisibilidade}
                  />

                  <button
                    type="submit"
                    disabled={alterandoSenha}
                    className={classeBotaoSalvar}
                  >
                    {alterandoSenha ? (
                      <FiLoader className="animate-spin" size={18} />
                    ) : (
                      <FiShield size={18} />
                    )}

                    {alterandoSenha ? "Alterando senha..." : "Atualizar senha"}
                  </button>
                </form>
              </div>
            </section>

            {/* SEGURANÇA DA CONTA */}
            <section className="w-full overflow-hidden rounded-2xl bg-[#082d56] p-5 text-white shadow-sm sm:p-6 dark:border dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                <FiShield size={24} />
              </div>

              <h2 className="text-lg font-bold">Segurança da conta</h2>

              <p className="mt-2 text-sm leading-relaxed text-blue-100">
                Mantenha sua senha atualizada e não compartilhe suas credenciais
                com outras pessoas.
              </p>

              <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <FiLock size={17} />
                  Alteração de senha
                </div>

                <p className="mt-2 text-xs leading-relaxed text-blue-100">
                  Utilize uma senha com pelo menos 8 caracteres.
                </p>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
