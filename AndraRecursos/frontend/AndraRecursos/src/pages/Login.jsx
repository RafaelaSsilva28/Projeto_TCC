import React, { useState, useEffect } from "react";
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
} from "react-icons/fi";

export default function Login() {
  const [tipoAcesso, setTipoAcesso] = useState("Usuario Institucional");
  const [email, setEmail] = useState("gustavopequeno@email.com");
  const [senha, setSenha] = useState("senha123");
  const [verSenha, setVerSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState("");
  const [lembrar, setLembrar] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const lembrarSalvo = localStorage.getItem("@AndraRecursos:lembrar");
    const usuarioLogado = localStorage.getItem("@AndraRecursos:usuario");

    if (lembrarSalvo === "true" && usuarioLogado) {
      const usuario = JSON.parse(usuarioLogado);

      if (usuario.tipo === "Administrador") {
        navigate(`/principal-adm`);
      } else {
        navigate("/obrigatorio-inst");
      }
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setMensagemErro("");

    const urlBackend = `${enderecoServidor}/login`;

    try {
      const resposta = await fetch(urlBackend, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.message || "E-mail ou senha incorretos.");
      }

      const tipoRetornado = dados.usuario.tipo;

      const tipoEsperado =
        tipoAcesso === "Administrador" ? "Administrador" : "Instituicao";

      if (tipoRetornado !== tipoEsperado) {
        throw new Error(
          tipoRetornado === "Administrador"
            ? "⚠️ Este usuário é um Administrador ⚠️ Selecione o acesso correto"
            : "⚠️ Este usuário é Institucional ⚠️ Selecione o acesso correto",
        );
      }

      localStorage.setItem("@AndraRecursos:token", dados.token);
      localStorage.setItem(
        "@AndraRecursos:usuario",
        JSON.stringify(dados.usuario),
      );
      localStorage.setItem("@AndraRecursos:lembrar", lembrar);

      if (tipoRetornado === "Administrador") {
        navigate("/principal-adm");
      } else {
        navigate("/obrigatorio-inst");
      }
    } catch (error) {
      setMensagemErro(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#ebebeb] font-['Segoe_UI',Arial,sans-serif] lg:flex">
      {/* LADO ESQUERDO: Painel de Formulário */}
      <div
        className="
        relative flex min-h-screen w-full
        flex-col items-center justify-center
        bg-[#ebebeb] px-5 py-8
        sm:px-8
        md:px-10
        lg:w-1/2
        lg:pb-[150px] lg:pt-10
      "
      >
        <span
          className="
          absolute left-5 top-6
          text-xs font-medium text-[#888888]
          sm:left-8 sm:top-7 sm:text-sm
          md:left-10
          lg:top-[50px]
        "
        >
          Login Institucional
        </span>

        <img
          src={logo}
          alt="Brasão Andradina"
          className="
            h-[170px] w-auto object-contain
            sm:h-[190px]
            md:h-[210px]
            lg:h-[240px] lg:translate-y-[80px]
          "
        />

        <div
          className="
          relative z-10
          box-border w-full max-w-[400px]
          rounded-lg border border-[#d0d0d0]
          bg-white px-5 py-6
          shadow-[0_10px_30px_rgba(0,0,0,0.06)]
          sm:px-7 sm:py-7
          md:px-8 md:py-8
          lg:px-10 lg:py-[35px]
        "
        >
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label
                className="
                mb-1.5 block text-left
                text-[13px] font-semibold text-[#333333]
              "
              >
                Tipo de Acesso
              </label>

              <div className="relative">
                <select
                  value={tipoAcesso}
                  onChange={(e) => setTipoAcesso(e.target.value)}
                  disabled={carregando}
                  className="
                    box-border w-full appearance-none
                    rounded-md border-[1.5px] border-[#b0b0b0]
                    bg-white px-[14px] py-3 pr-10
                    text-sm text-[#333333]
                    outline-none transition-all duration-300
                    focus:border-[#003366]
                    focus:shadow-[0_0_10px_rgba(0,51,102,0.1)]
                    disabled:cursor-not-allowed disabled:opacity-60
                  "
                >
                  <option value="Usuario Institucional">
                    Usuário Institucional
                  </option>

                  <option value="Administrador">Administrador</option>
                </select>

                <FiChevronDown
                  className="
                  pointer-events-none
                  absolute right-3.5 top-1/2
                  -translate-y-1/2
                  text-base text-[#333333]
                "
                />
              </div>
            </div>

            <div>
              <label
                className="
                mb-1.5 block text-left
                text-[13px] font-semibold text-[#333333]
              "
              >
                E-mail
              </label>

              <div className="relative flex items-center">
                <FiMail
                  className="
                  absolute left-3.5
                  text-sm text-[#777777]
                "
                />

                <input
                  type="email"
                  placeholder="Digite seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={carregando}
                  required
                  className="
                    box-border w-full rounded-md
                    border-[1.5px] border-[#b0b0b0]
                    bg-white py-3 pl-10 pr-3.5
                    text-sm text-[#333333]
                    outline-none transition-all duration-300
                    focus:border-[#003366]
                    focus:shadow-[0_0_10px_rgba(0,51,102,0.1)]
                    disabled:cursor-not-allowed disabled:opacity-60
                  "
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  className="
                  mb-1.5 block text-left
                  text-[13px] font-semibold text-[#333333]
                "
                >
                  Senha
                </label>

                <a
                  href="#esqueci"
                  className="
                    text-[11px] text-[#0056b3]
                    no-underline hover:underline
                    sm:text-xs
                  "
                >
                  Esqueci minha senha
                </a>
              </div>

              <div className="relative flex items-center">
                <FiLock
                  className="
                  absolute left-3.5
                  text-sm text-[#777777]
                "
                />

                <input
                  type={verSenha ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  disabled={carregando}
                  required
                  className="
                    box-border w-full rounded-md
                    border-[1.5px] border-[#b0b0b0]
                    bg-white py-3 pl-10 pr-11
                    text-sm text-[#333333]
                    outline-none transition-all duration-300
                    focus:border-[#003366]
                    focus:shadow-[0_0_10px_rgba(0,51,102,0.1)]
                    disabled:cursor-not-allowed disabled:opacity-60
                  "
                />

                <button
                  type="button"
                  onClick={() => setVerSenha(!verSenha)}
                  disabled={carregando}
                  className="
                    absolute right-3.5
                    border-none bg-transparent p-0
                    text-[#777777]
                    transition-colors
                    hover:text-[#003366]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {verSenha ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-start">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={lembrar}
                  onChange={(e) => setLembrar(e.target.checked)}
                  className="
                    h-4 w-4 cursor-pointer
                    accent-[#003366]
                  "
                />

                <label className="text-sm text-[#555555]">Lembrar-me</label>
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="
                mt-1 flex w-full
                items-center justify-center gap-2
                rounded-md border-none
                bg-[#003366] p-3.5
                text-[15px] font-bold text-white
                transition-all duration-200
                hover:bg-[#002244]
                active:scale-[0.99]
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {carregando ? "Autenticando..." : "Entrar"}

              <FiArrowRight size={17} />
            </button>

            {mensagemErro && (
              <div
                className="
                text-center
                text-[13px] font-medium
                leading-5 text-[#800020]
              "
              >
                {mensagemErro}
              </div>
            )}

            <div
              className="
              mt-1 flex items-center
              justify-center gap-3
            "
            >
              <span className="h-px flex-1 bg-[#cccccc]"></span>

              <span
                className="
                whitespace-nowrap
                text-[8px] font-bold
                tracking-[1px] text-[#777777]
                sm:text-[10px]
              "
              >
                SEGURANÇA INSTITUCIONAL
              </span>

              <span className="h-px flex-1 bg-[#cccccc]"></span>
            </div>
          </form>
        </div>

        <div
          className="
          mt-5 text-center
          text-[10px] text-[#888888]
          sm:text-xs
          lg:absolute lg:bottom-[47px]
          lg:mt-0
        "
        >
          © 2026 Prefeitura Municipal de Andradina
        </div>
      </div>

      {/* LADO DIREITO: Governo Inteligente */}
      <div
        className="
          relative hidden min-h-screen w-1/2
          flex-col items-start justify-center
          overflow-hidden
          bg-[#082a59]
          bg-cover bg-center
          px-[6%] py-[60px]
          lg:flex
          xl:px-[10%]
        "
        style={{
          backgroundImage: `
            linear-gradient(
              135deg,
              rgba(8, 42, 89, 0.96) 0%,
              rgba(5, 30, 61, 0.92) 100%
            ),
            url(${imagemAndradina})
          `,
        }}
      >
        <div
          className="
          relative z-10
          flex w-full max-w-[520px]
          flex-col gap-7
          xl:gap-[30px]
        "
        >
          <div className="flex flex-col gap-3">
            <h3
              className="
              m-0
              text-[40px] font-extrabold
              leading-[1.1] tracking-[-1px]
              text-white
              xl:text-[52px]
              2xl:text-[58px]
            "
            >
              Governo
              <span className="block text-[#ffcc00]">Inteligente</span>
            </h3>

            <p
              className="
              m-0 max-w-[480px]
              text-[13px] font-normal
              leading-[1.6] text-[#b0c4de]
              xl:text-[15px]
            "
            >
              Conectando a gestão pública e otimizando os recursos municipais.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 xl:gap-4">
            <div
              className="
              flex w-full items-center gap-4
              rounded-2xl
              border border-white/[0.08]
              bg-white/[0.03]
              px-4 py-4
              backdrop-blur-[16px]
              transition-all duration-300
              hover:translate-x-1
              hover:border-[#ffcc00]/30
              hover:bg-white/[0.06]
              xl:gap-5 xl:px-6 xl:py-5
            "
            >
              <div
                className="
                flex h-11 w-11 shrink-0
                items-center justify-center
                rounded-full
                border border-[#0088ff]/20
                bg-gradient-to-br
                from-[#0056b3]/40 to-[#003366]/60
                text-[#0088ff]
                shadow-[0_0_15px_rgba(0,136,255,0.15)]
                xl:h-[46px] xl:w-[46px]
              "
              >
                <FiBarChart2 size={20} />
              </div>

              <div className="flex flex-col gap-[3px]">
                <h4
                  className="
                  m-0 text-sm font-bold text-white
                  xl:text-base
                "
                >
                  Mais Eficiência
                </h4>

                <p
                  className="
                  m-0 text-[11px]
                  leading-[1.4] text-[#9cb3c9]
                  xl:text-[13px]
                "
                >
                  Processos integrados para uma gestão mais ágil.
                </p>
              </div>
            </div>

            <div
              className="
              flex w-full items-center gap-4
              rounded-2xl
              border border-white/[0.08]
              bg-white/[0.03]
              px-4 py-4
              backdrop-blur-[16px]
              transition-all duration-300
              hover:translate-x-1
              hover:border-[#ffcc00]/30
              hover:bg-white/[0.06]
              xl:gap-5 xl:px-6 xl:py-5
            "
            >
              <div
                className="
                flex h-11 w-11 shrink-0
                items-center justify-center
                rounded-full
                border border-[#0088ff]/20
                bg-gradient-to-br
                from-[#0056b3]/40 to-[#003366]/60
                text-[#0088ff]
                shadow-[0_0_15px_rgba(0,136,255,0.15)]
                xl:h-[46px] xl:w-[46px]
              "
              >
                <FiShield size={20} />
              </div>

              <div className="flex flex-col gap-[3px]">
                <h4
                  className="
                  m-0 text-sm font-bold text-white
                  xl:text-base
                "
                >
                  Mais Transparência
                </h4>

                <p
                  className="
                  m-0 text-[11px]
                  leading-[1.4] text-[#9cb3c9]
                  xl:text-[13px]
                "
                >
                  Informações seguras e acessíveis para a sociedade.
                </p>
              </div>
            </div>

            <div
              className="
              flex w-full items-center gap-4
              rounded-2xl
              border border-white/[0.08]
              bg-white/[0.03]
              px-4 py-4
              backdrop-blur-[16px]
              transition-all duration-300
              hover:translate-x-1
              hover:border-[#ffcc00]/30
              hover:bg-white/[0.06]
              xl:gap-5 xl:px-6 xl:py-5
            "
            >
              <div
                className="
                flex h-11 w-11 shrink-0
                items-center justify-center
                rounded-full
                border border-[#0088ff]/20
                bg-gradient-to-br
                from-[#0056b3]/40 to-[#003366]/60
                text-[#0088ff]
                shadow-[0_0_15px_rgba(0,136,255,0.15)]
                xl:h-[46px] xl:w-[46px]
              "
              >
                <FiUsers size={20} />
              </div>

              <div className="flex flex-col gap-[3px]">
                <h4
                  className="
                  m-0 text-sm font-bold text-white
                  xl:text-base
                "
                >
                  Mais Resultados
                </h4>

                <p
                  className="
                  m-0 text-[11px]
                  leading-[1.4] text-[#9cb3c9]
                  xl:text-[13px]
                "
                >
                  Decisões inteligentes para transformar a vida das pessoas.
                </p>
              </div>
            </div>
          </div>

          <div
            className="
            mx-auto mt-1 flex w-full
            items-center justify-center
            rounded-2xl
            border border-white/[0.08]
            bg-white/[0.04]
            px-5 py-5
            xl:mt-2.5 xl:w-4/5
            xl:rounded-[24px]
            xl:px-8 xl:py-6
          "
          >
            <p
              className="
              m-0 text-center
              text-sm font-semibold
              leading-[1.6] text-white
              xl:text-[18px]
            "
            >
              <span
                className="
                mr-2 font-serif
                text-2xl font-extrabold
                text-[#ffcc00]
                xl:text-[30px]
              "
              >
                “
              </span>
              Tecnologia e inovação a serviço de uma cidade melhor para todos.
              <span
                className="
                ml-2 font-serif
                text-2xl font-extrabold
                text-[#ffcc00]
                xl:text-[30px]
              "
              >
                ”
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
