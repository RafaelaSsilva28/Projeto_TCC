import { useEffect, useState } from "react";
import LayoutInstituicao from "../components/LayoutInstituicao";
import {
  FiBell,
  FiLock,
  FiEye,
  FiEyeOff,
  FiSave,
  FiShield,
  FiUser,
  FiMail,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
  FiMonitor,
  FiRefreshCw,
} from "react-icons/fi";

export default function ConfiguracoesInst() {
  const API_URL = "https://api-andra-recursos.vercel.app";

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
      resposta = await fetch(`${API_URL}${caminho}`, opcoes);
    } catch (erro) {
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
  const [configuracoes, setConfiguracoes] = useState({
    nome: "",
    email_institucional: "",
    notificar_atualizacoes_solicitacoes: true,
    notificar_respostas_administrador: true,
    reduzir_animacoes: false,
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
  const [salvando, setSalvando] = useState(false);
  const [alterandoSenha, setAlterandoSenha] = useState(false);

  const [mensagem, setMensagem] = useState({
    tipo: "",
    texto: "",
  });

  function obterToken() {
    return localStorage.getItem("@AndraRecursos:token");
  }

  // ==========================================
  // CARREGAR CONFIGURAÇÕES
  // ==========================================
  async function carregarConfiguracoes() {
    setCarregando(true);

    try {
      const resposta = await requisicaoAPI("/configuracoes-inst");
      const dados = resposta.dados || resposta.configuracoes || resposta;

      setConfiguracoes((anterior) => ({
        ...anterior,
        ...dados,
      }));
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);

      setMensagem({
        tipo: "erro",
        texto: error.message || "Não foi possível carregar as configurações.",
      });
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  // ==========================================
  // ALTERAR PREFERÊNCIAS
  // ==========================================
  function alterarPreferencia(campo, valor) {
    setConfiguracoes((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  // ==========================================
  // SALVAR PREFERÊNCIAS
  // ==========================================
  async function salvarPreferencias(event) {
    event.preventDefault();

    setSalvando(true);
    setMensagem({ tipo: "", texto: "" });

    try {
      await requisicaoAPI("/configuracoes-inst", "PATCH", {
        notificar_atualizacoes_solicitacoes:
          configuracoes.notificar_atualizacoes_solicitacoes,
        notificar_respostas_administrador:
          configuracoes.notificar_respostas_administrador,
        reduzir_animacoes: configuracoes.reduzir_animacoes,
      });

      setMensagem({
        tipo: "sucesso",
        texto: "Preferências salvas com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao salvar preferências:", error);

      setMensagem({
        tipo: "erro",
        texto: error.message || "Não foi possível salvar suas preferências.",
      });
    } finally {
      setSalvando(false);
    }
  }

  // ==========================================
  // ALTERAR SENHA
  // ==========================================
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
    setMensagem({ tipo: "", texto: "" });

    if (!senhas.senhaAtual || !senhas.novaSenha || !senhas.confirmarSenha) {
      setMensagem({
        tipo: "erro",
        texto: "Preencha todos os campos de senha.",
      });
      return;
    }

    if (senhas.novaSenha.length < 8) {
      setMensagem({
        tipo: "erro",
        texto: "A nova senha deve conter pelo menos 8 caracteres.",
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

  // ==========================================
  // COMPONENTES VISUAIS
  // ==========================================
  function CampoSenha({ campo, titulo, placeholder, valor }) {
    return (
      <div>
        <label
          htmlFor={campo}
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          {titulo}
        </label>

        <div className="relative">
          <input
            id={campo}
            type={mostrarSenhas[campo] ? "text" : "password"}
            value={valor}
            onChange={(event) => alterarCampoSenha(campo, event.target.value)}
            placeholder={placeholder}
            autoComplete="new-password"
            maxLength={72}
            required
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#1755ad] focus:bg-white focus:ring-4 focus:ring-blue-100"
          />

          <button
            type="button"
            onClick={() => alternarVisibilidade(campo)}
            aria-label={
              mostrarSenhas[campo] ? "Ocultar senha" : "Mostrar senha"
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-[#082d56]"
          >
            {mostrarSenhas[campo] ? (
              <FiEyeOff size={18} />
            ) : (
              <FiEye size={18} />
            )}
          </button>
        </div>
      </div>
    );
  }

  function OpcaoPreferencia({ titulo, descricao, campo, icone }) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-4 transition hover:border-blue-100 hover:bg-slate-50">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-blue-50 p-2.5 text-[#1755ad]">
            {icone}
          </div>

          <div>
            <p className="text-sm font-semibold text-[#082d56]">{titulo}</p>

            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              {descricao}
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={configuracoes[campo]}
          aria-label={titulo}
          onClick={() => alterarPreferencia(campo, !configuracoes[campo])}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            configuracoes[campo] ? "bg-[#1755ad]" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              configuracoes[campo] ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    );
  }

  return (
    <LayoutInstituicao>
      <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* CABEÇALHO */}
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
              <FiMonitor size={16} />
              <span>Instituição</span>
              <span>/</span>
              <span className="font-medium text-[#1755ad]">Configurações</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#082d56] sm:text-3xl">
              Configurações
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base">
              Gerencie suas preferências, notificações e configurações de
              segurança.
            </p>
          </div>

          {/* MENSAGEM DE RETORNO */}
          {mensagem.texto && (
            <div
              role="status"
              className={`mb-6 flex items-start gap-3 rounded-xl border p-4 ${
                mensagem.tipo === "sucesso"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700"
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
                onClick={() =>
                  setMensagem({
                    tipo: "",
                    texto: "",
                  })
                }
                aria-label="Fechar mensagem"
                className="text-current opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          )}

          {carregando ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <FiLoader size={30} className="animate-spin text-[#1755ad]" />

              <p className="mt-4 text-sm text-slate-500">
                Carregando configurações...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
              {/* COLUNA PRINCIPAL */}
              <div className="space-y-6 lg:col-span-2">
                {/* DADOS DA INSTITUIÇÃO */}
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div className="rounded-xl bg-blue-50 p-3 text-[#1755ad]">
                      <FiUser size={21} />
                    </div>

                    <div>
                      <h2 className="font-bold text-[#082d56]">
                        Dados da instituição
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Informações da conta autenticada.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5 p-5 sm:p-6">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Nome da instituição
                      </label>

                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <FiUser className="shrink-0 text-slate-400" size={18} />

                        <span className="text-sm text-slate-700">
                          {configuracoes.nome || "Não informado"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        E-mail institucional
                      </label>

                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <FiMail className="shrink-0 text-slate-400" size={18} />

                        <span className="break-all text-sm text-slate-700">
                          {configuracoes.email_institucional || "Não informado"}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed text-slate-400">
                      Para alterar os dados cadastrais, entre na área de
                      atendimento responsável pelo cadastro da instituição.
                    </p>
                  </div>
                </section>

                {/* NOTIFICAÇÕES */}
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div className="rounded-xl bg-blue-50 p-3 text-[#1755ad]">
                      <FiBell size={21} />
                    </div>

                    <div>
                      <h2 className="font-bold text-[#082d56]">Notificações</h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Escolha quais avisos deseja receber.
                      </p>
                    </div>
                  </div>

                  <form
                    onSubmit={salvarPreferencias}
                    className="space-y-3 p-5 sm:p-6"
                  >
                    <OpcaoPreferencia
                      titulo="Atualizações de solicitações"
                      descricao="Receba avisos quando houver atualizações nos pedidos da instituição."
                      campo="notificar_atualizacoes_solicitacoes"
                      icone={<FiRefreshCw size={19} />}
                    />

                    <OpcaoPreferencia
                      titulo="Respostas do administrador"
                      descricao="Receba avisos quando a administração responder às suas solicitações."
                      campo="notificar_respostas_administrador"
                      icone={<FiBell size={19} />}
                    />

                    <div className="flex justify-end border-t border-slate-100 pt-5">
                      <button
                        type="submit"
                        disabled={salvando}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#082d56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#124477] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      >
                        {salvando ? (
                          <FiLoader className="animate-spin" size={18} />
                        ) : (
                          <FiSave size={18} />
                        )}

                        {salvando ? "Salvando..." : "Salvar preferências"}
                      </button>
                    </div>
                  </form>
                </section>

                {/* APARÊNCIA */}
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div className="rounded-xl bg-blue-50 p-3 text-[#1755ad]">
                      <FiMonitor size={21} />
                    </div>

                    <div>
                      <h2 className="font-bold text-[#082d56]">
                        Aparência e acessibilidade
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Ajuste os efeitos visuais da interface.
                      </p>
                    </div>
                  </div>

                  <form
                    onSubmit={salvarPreferencias}
                    className="space-y-4 p-5 sm:p-6"
                  >
                    <OpcaoPreferencia
                      titulo="Reduzir animações"
                      descricao="Prefira transições e movimentos reduzidos durante a navegação."
                      campo="reduzir_animacoes"
                      icone={<FiMonitor size={19} />}
                    />

                    <div className="flex justify-end border-t border-slate-100 pt-5">
                      <button
                        type="submit"
                        disabled={salvando}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#082d56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#124477] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      >
                        {salvando ? (
                          <FiLoader className="animate-spin" size={18} />
                        ) : (
                          <FiSave size={18} />
                        )}

                        {salvando ? "Salvando..." : "Salvar aparência"}
                      </button>
                    </div>
                  </form>
                </section>
              </div>

              {/* COLUNA LATERAL */}
              <aside className="space-y-6">
                <section className="overflow-hidden rounded-2xl bg-[#082d56] p-5 text-white shadow-sm sm:p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                    <FiShield size={24} />
                  </div>

                  <h2 className="text-lg font-bold">Segurança da conta</h2>

                  <p className="mt-2 text-sm leading-relaxed text-blue-100">
                    Mantenha sua senha atualizada e não compartilhe suas
                    credenciais com outras pessoas.
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

                {/* FORMULÁRIO DE SENHA */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="rounded-xl bg-blue-50 p-3 text-[#1755ad]">
                      <FiLock size={21} />
                    </div>

                    <div>
                      <h2 className="font-bold text-[#082d56]">
                        Alterar senha
                      </h2>

                      <p className="mt-1 text-xs text-slate-500">
                        Proteja seu acesso.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={alterarSenha} className="space-y-4">
                    <CampoSenha
                      campo="senhaAtual"
                      titulo="Senha atual"
                      placeholder="Digite sua senha atual"
                      valor={senhas.senhaAtual}
                    />

                    <CampoSenha
                      campo="novaSenha"
                      titulo="Nova senha"
                      placeholder="Mínimo de 8 caracteres"
                      valor={senhas.novaSenha}
                    />

                    <CampoSenha
                      campo="confirmarSenha"
                      titulo="Confirmar nova senha"
                      placeholder="Digite a nova senha novamente"
                      valor={senhas.confirmarSenha}
                    />

                    <button
                      type="submit"
                      disabled={alterandoSenha}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1755ad] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#124477] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {alterandoSenha ? (
                        <FiLoader className="animate-spin" size={18} />
                      ) : (
                        <FiShield size={18} />
                      )}

                      {alterandoSenha
                        ? "Alterando senha..."
                        : "Atualizar senha"}
                    </button>
                  </form>
                </section>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs leading-relaxed text-slate-500">
                    <FiShield
                      className="mr-1 inline text-[#1755ad]"
                      size={14}
                    />
                    Suas configurações são vinculadas à instituição autenticada.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </LayoutInstituicao>
  );
}

