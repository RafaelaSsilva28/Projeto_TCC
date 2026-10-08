
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import logo from "../assets/AndraRecursos.png";
import imagemAndradina from "../assets/Andradina.jpg";
import { enderecoServidor } from "../utils";

import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiBarChart2,
  FiShield,
  FiUsers,
  FiChevronDown,
  FiLoader,
} from "react-icons/fi";

const CHAVE_TOKEN = "@AndraRecursos:token";
const CHAVE_USUARIO = "@AndraRecursos:usuario";
const CHAVE_LEMBRAR = "@AndraRecursos:lembrar";

export default function Login() {
  const navigate = useNavigate();

  const [tipoAcesso, setTipoAcesso] = useState(
    "Usuario Institucional"
  );

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [lembrar, setLembrar] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState("");

  // VERIFICAR SESSÃO LEMBRADA
  useEffect(() => {
    let ativo = true;

    async function verificarSessao() {
      const lembrarSalvo = localStorage.getItem(
        CHAVE_LEMBRAR
      );

      const token = localStorage.getItem(CHAVE_TOKEN);

      if (lembrarSalvo !== "true" || !token) {
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

        if (!resposta.ok) return;

        const instituicao = await resposta.json();

        if (!ativo) return;

        if (instituicao.cadastro_completo === true) {
          navigate("/principal-inst", {
            replace: true,
          });
        } else {
          navigate("/obrigatorio-inst", {
            replace: true,
          });
        }
      } catch (error) {
        console.error(
          "Não foi possível restaurar a sessão:",
          error
        );
      }
    }

    verificarSessao();

    return () => {
      ativo = false;
    };
  }, [navigate]);

  // REALIZAR LOGIN
  async function handleLogin(e) {
    e.preventDefault();

    if (carregando) return;

    setCarregando(true);
    setMensagemErro("");

    const acessoInstitucional =
      tipoAcesso === "Usuario Institucional";

    const rota = acessoInstitucional
      ? "/login-instituicao"
      : "/login";

    const corpo = acessoInstitucional
      ? {
          email_institucional: email.trim(),
          senha,
        }
      : {
          email: email.trim(),
          senha,
        };

    try {
      const resposta = await fetch(
        `${enderecoServidor}${rota}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(corpo),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.message ||
            "E-mail ou senha incorretos."
        );
      }

      if (!dados.token) {
        throw new Error(
          "A API não retornou o token de acesso."
        );
      }

      let usuario;
      let destino;

      // LOGIN INSTITUCIONAL
      if (acessoInstitucional) {
        if (!dados.instituicao?.id) {
          throw new Error(
            "A API não retornou os dados da instituição."
          );
        }

        usuario = {
          ...dados.instituicao,
          tipo: "Instituicao",
        };

        // CONSULTA O CADASTRO DO NEON
        const respostaCadastro = await fetch(
          `${enderecoServidor}/instituicoes/me`,
          {
            headers: {
              Authorization: `Bearer ${dados.token}`,
            },
          }
        );

        if (!respostaCadastro.ok) {
          throw new Error(
            "Não foi possível verificar o cadastro institucional."
          );
        }

        const cadastro = await respostaCadastro.json();

        destino =
          cadastro.cadastro_completo === true
            ? "/principal-inst"
            : "/obrigatorio-inst";
      }

      // LOGIN ADMINISTRADOR
      else {
        if (dados.usuario?.tipo !== "Administrador") {
          throw new Error(
            "Este usuário não possui acesso administrativo."
          );
        }

        usuario = dados.usuario;
        destino = "/principal-adm";
      }

      // ARMAZENAR SESSÃO
      localStorage.setItem(
        CHAVE_TOKEN,
        dados.token
      );

      localStorage.setItem(
        CHAVE_USUARIO,
        JSON.stringify(usuario)
      );

      localStorage.setItem(
        CHAVE_LEMBRAR,
        String(lembrar)
      );

      // REDIRECIONAR
      navigate(destino, {
        replace: true,
      });

    } catch (error) {
      setMensagemErro(
        error.message || "Não foi possível entrar."
      );
    } finally {
      setCarregando(false);
    }
  }

  const inputStyle =
    "w-full rounded-md border-[1.5px] border-[#b0b0b0] bg-white py-3 pl-10 pr-11 text-sm text-[#333] outline-none transition-all duration-300 focus:border-[#003366] focus:shadow-[0_0_10px_rgba(0,51,102,0.1)] disabled:opacity-60";

  const beneficios = [
    {
      titulo: "Mais Eficiência",
      descricao:
        "Processos integrados para uma gestão mais ágil.",
      icone: FiBarChart2,
    },
    {
      titulo: "Mais Transparência",
      descricao:
        "Informações seguras e acessíveis para a sociedade.",
      icone: FiShield,
    },
    {
      titulo: "Mais Resultados",
      descricao:
        "Decisões inteligentes para transformar a vida das pessoas.",
      icone: FiUsers,
    },
  ];

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#ebebeb] font-['Segoe_UI',Arial,sans-serif] lg:flex lg:h-screen lg:overflow-hidden">

      {/* LADO ESQUERDO */}
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#ebebeb] px-5 py-10 sm:px-8 lg:h-screen lg:w-1/2 lg:pb-[12vh]">

        {/* IDENTIFICAÇÃO */}
        <span className="absolute left-5 top-6 text-xs font-medium text-[#888] sm:left-8 sm:text-sm">
          {tipoAcesso === "Administrador"
            ? "Login Administrativo"
            : "Login Institucional"}
        </span>

        {/* LOGO */}
        <img
          src={logo}
          alt="AndraRecursos"
          className="relative z-20 h-[170px] w-auto object-contain sm:h-[190px] lg:h-[24vh] lg:translate-y-[7vh]"
        />

        {/* CARD DE LOGIN */}
        <div className="relative z-10 box-border w-full max-w-[400px] rounded-lg border border-[#d0d0d0] bg-white px-5 py-7 shadow-[0_10px_30px_rgba(0,0,0,0.06)] sm:px-8 lg:px-10">

          <form
            onSubmit={handleLogin}
            className="flex flex-col gap-5"
          >

            {/* TIPO DE ACESSO */}
            <div>
              <label className="mb-1.5 block text-left text-[13px] font-semibold text-[#333]">
                Tipo de Acesso
              </label>

              <div className="relative">
                <select
                  value={tipoAcesso}
                  onChange={(e) => {
                    setTipoAcesso(e.target.value);
                    setMensagemErro("");
                  }}
                  disabled={carregando}
                  className="w-full appearance-none rounded-md border-[1.5px] border-[#b0b0b0] bg-white px-3.5 py-3 pr-10 text-sm text-[#333] outline-none transition focus:border-[#003366]"
                >
                  <option value="Usuario Institucional">
                    Usuário Institucional
                  </option>

                  <option value="Administrador">
                    Administrador
                  </option>
                </select>

                <FiChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#333]" />
              </div>
            </div>

            {/* EMAIL */}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-[#333]">
                E-mail
              </label>

              <div className="relative flex items-center">
                <FiMail className="absolute left-3.5 text-[#777]" />

                <input
                  type="email"
                  placeholder="Digite seu e-mail"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  disabled={carregando}
                  autoComplete="email"
                  required
                  className={inputStyle}
                />
              </div>
            </div>

            {/* SENHA */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[13px] font-semibold text-[#333]">
                  Senha
                </label>

                <a
                  href="#esqueci"
                  className="text-[11px] text-[#0056b3] hover:underline"
                >
                  Esqueci minha senha
                </a>
              </div>

              <div className="relative flex items-center">
                <FiLock className="absolute left-3.5 text-[#777]" />

                <input
                  type={verSenha ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(e) =>
                    setSenha(e.target.value)
                  }
                  disabled={carregando}
                  autoComplete="current-password"
                  required
                  className={inputStyle}
                />

                <button
                  type="button"
                  onClick={() =>
                    setVerSenha(!verSenha)
                  }
                  disabled={carregando}
                  aria-label={
                    verSenha
                      ? "Ocultar senha"
                      : "Mostrar senha"
                  }
                  className="absolute right-3.5 text-[#777] transition hover:text-[#003366]"
                >
                  {verSenha ? (
                    <FiEyeOff size={16} />
                  ) : (
                    <FiEye size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* LEMBRAR-ME */}
            <div className="flex items-center gap-2">
              <input
                id="lembrar"
                type="checkbox"
                checked={lembrar}
                onChange={(e) =>
                  setLembrar(e.target.checked)
                }
                className="h-4 w-4 cursor-pointer accent-[#003366]"
              />

              <label
                htmlFor="lembrar"
                className="cursor-pointer text-sm text-[#555]"
              >
                Lembrar-me
              </label>
            </div>

            {/* BOTÃO ENTRAR */}
            <button
              type="submit"
              disabled={carregando}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-md bg-[#003366] p-3.5 text-[15px] font-bold text-white transition-all duration-200 hover:bg-[#002244] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {carregando ? (
                <>
                  <FiLoader className="animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  Entrar
                  <FiArrowRight size={17} />
                </>
              )}
            </button>

            {/* ERRO */}
            {mensagemErro && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 p-3 text-center text-[13px] font-medium text-red-700"
              >
                {mensagemErro}
              </div>
            )}

            {/* DIVISÓRIA */}
            <div className="mt-1 flex items-center justify-center gap-3">
              <span className="h-px flex-1 bg-[#ccc]" />

              <span className="whitespace-nowrap text-[10px] font-bold tracking-[1px] text-[#777]">
                SEGURANÇA INSTITUCIONAL
              </span>

              <span className="h-px flex-1 bg-[#ccc]" />
            </div>

          </form>
        </div>

        {/* RODAPÉ */}
        <div className="mt-6 text-center text-[11px] text-[#888] lg:absolute lg:bottom-[4vh]">
          © 2026 Prefeitura Municipal de Andradina
        </div>
      </div>

      {/* LADO DIREITO */}
      <div
        className="relative hidden w-1/2 flex-col items-start justify-center overflow-hidden bg-[#082a59] bg-cover bg-center px-[8%] py-8 lg:flex"
        style={{
          backgroundImage: `
            linear-gradient(
              135deg,
              rgba(8,42,89,0.96) 0%,
              rgba(5,30,61,0.92) 100%
            ),
            url(${imagemAndradina})
          `,
        }}
      >
        <div className="relative z-10 flex w-full max-w-[520px] flex-col gap-7">

          {/* TÍTULO */}
          <div>
            <h2 className="text-[40px] font-extrabold leading-tight tracking-tight text-white xl:text-[52px]">
              Governo
              <span className="block text-[#ffcc00]">
                Inteligente
              </span>
            </h2>

            <p className="mt-3 max-w-[480px] text-sm leading-relaxed text-[#b0c4de]">
              Conectando a gestão pública e
              otimizando os recursos municipais.
            </p>
          </div>

          {/* BENEFÍCIOS */}
          <div className="flex flex-col gap-4">
            {beneficios.map((beneficio) => {
              const Icone = beneficio.icone;

              return (
                <div
                  key={beneficio.titulo}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-md transition-all duration-300 hover:translate-x-1 hover:border-[#ffcc00]/30 hover:bg-white/10"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#0088ff]/20 bg-[#003366]/60 text-[#0088ff]">
                    <Icone size={20} />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white xl:text-base">
                      {beneficio.titulo}
                    </h3>

                    <p className="mt-1 text-xs leading-relaxed text-[#9cb3c9]">
                      {beneficio.descricao}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FRASE FINAL */}
          <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-center">
            <p className="text-sm font-semibold leading-relaxed text-white xl:text-base">
              <span className="mr-2 text-2xl font-bold text-[#ffcc00]">
                “
              </span>
              Tecnologia e inovação a serviço de uma
              cidade melhor para todos.
              <span className="ml-2 text-2xl font-bold text-[#ffcc00]">
                ”
              </span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
