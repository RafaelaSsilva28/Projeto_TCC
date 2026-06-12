import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/EstilosLogin.css";
import logo from "../assets/AndraRecursos.png";

//ORIGINAL
// export default function Login() {
//   const [tipoAcesso, setTipoAcesso] = useState("Usuario Institucional");
//   const [email, setEmail] = useState("gustavopequeno@email.com");
//   const [senha, setSenha] = useState("senha123");
//   const [verSenha, setVerSenha] = useState(false);
  
//   const [carregando, setCarregando] = useState(false);
//   const [mensagemErro, setMensagemErro] = useState("");
  
//   const navigate = useNavigate();

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     setCarregando(true);
//     setMensagemErro("");

//     const urlBackend = "http://localhost:3001/login"; 

//     try {
//       const resposta = await fetch(urlBackend, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ email, senha }),
//       });

//       const dados = await resposta.json();

//       if (!resposta.ok) {
//         throw new Error(dados.message || "E-mail ou senha incorretos.");
//       }

//       localStorage.setItem("@AndraRecursos:token", dados.token);
//       localStorage.setItem("@AndraRecursos:usuario", JSON.stringify(dados.usuario));
      
//       if (tipoAcesso === "Administrador") {
//         navigate("/principal-adm");
//       } else {
//         navigate("/principal-inst");
//       }

//     } catch (error) {
//       setMensagemErro(error.message);
//     } finally {
//       setCarregando(false);
//     }
//   };

//   return (
//     <div className="andra-split-container">
//       {/* LADO ESQUERDO: Painel de Formulário */}
//       <div className="andra-login-side">
//         <span className="andra-top-label">Login Institucional</span>

//         <img src={logo} alt="logoAR"
//           style={{
//             height: 240,
//             transform: 'translateY(86px)'
//           }}
//         />
//         <div className="andra-card">
//           <div className="andra-header">
//             <div className="andra-logo-wrapper">
              
//             </div>
//           </div>

//           <form onSubmit={handleLogin} className="andra-form">
//             {mensagemErro && <div className="andra-error-alert">⚠️ {mensagemErro}</div>}

//             <div className="andra-input-group">
//               <label>Tipo de Acesso</label>
//               <select 
//                 value={tipoAcesso} 
//                 onChange={(e) => setTipoAcesso(e.target.value)}
//                 disabled={carregando}
//               >
//                 <option value="Usuario Institucional">Usuário Institucional</option>
//                 <option value="Administrador">Administrador</option>
//               </select>
//             </div>

//             <div className="andra-input-group">
//               <label>E-mail</label>
//               <div className="andra-field-wrapper">
//                 <span className="andra-icon">✉️</span>
//                 <input
//                   type="email"
//                   placeholder="nome@usuario.com.br"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   disabled={carregando}
//                   required
//                 />
//               </div>
//             </div>

//             <div className="andra-input-group">
//               <div className="andra-label-row">
//                 <label>Senha</label>
//                 <a href="#esqueci" className="andra-forgot">Esqueci minha senha</a>
//               </div>
//               <div className="andra-field-wrapper">
//                 <span className="andra-icon">🔒</span>
//                 <input
//                   type={verSenha ? "text" : "password"}
//                   placeholder="••••••••"
//                   value={senha}
//                   onChange={(e) => setSenha(e.target.value)}
//                   disabled={carregando}
//                   required
//                 />
//                 <button 
//                   type="button" 
//                   className="andra-toggle-pass"
//                   onClick={() => setVerSenha(!verSenha)}
//                   disabled={carregando}
//                 >
//                   {verSenha ? "👁️" : "👁️‍🗨️"}
//                 </button>
//               </div>
//             </div>

//             <button type="submit" className="andra-btn-submit" disabled={carregando}>
//               {carregando ? "Autenticando..." : "Entrar"} <span className="andra-arrow">➔</span>
//             </button>

//             <div className="andra-divider">
//               <span className="andra-line"></span>
//               <span className="andra-divider-text">SEGURANÇA INSTITUCIONAL</span>
//               <span className="andra-line"></span>
//             </div>
//           </form>
//         </div>

//         <div className="andra-left-footer">
//           <span>© 2026 Prefeitura Municipal de Andradina</span>
//         </div>
//       </div>

//       {/* LADO DIREITO: Painel de Imagem que preenche a tela toda */}
//       <div className="andra-image-side">
//         <div className="andra-image-overlay">
//           <div className="andra-overlay-content">
//             <h3>Governo Inteligente</h3>
//             <p>Conectando a gestão pública e otimizando os recursos municipais.</p>
//           </div>
//           <div className="andra-right-footer-links">
//             <a href="#privacidade">Privacidade</a>
//             <a href="#termos">Termos de Uso</a>
//             <a href="#suporte">Suporte</a>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

//NOVO
export default function Login() {
  const [tipoAcesso, setTipoAcesso] = useState("Usuario Institucional");
  const [email, setEmail] = useState("gustavopequeno@email.com");
  const [senha, setSenha] = useState("senha123");
  const [verSenha, setVerSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setMensagemErro("");

    const urlBackend = "http://localhost:3001/login";

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

      const tipoRetornado = dados.usuario.tipo; // "Administrador" ou "Instituicao"

      const tipoEsperado = tipoAcesso === "Administrador" ? "Administrador" : "Instituicao";
      if (tipoRetornado !== tipoEsperado) {
        throw new Error(
          tipoRetornado === "Administrador"
            ? "Este usuário é um Administrador. Selecione o acesso correto."
            : "Este usuário é Institucional. Selecione o acesso correto."
        );
      }

      localStorage.setItem("@AndraRecursos:token", dados.token);
      localStorage.setItem("@AndraRecursos:usuario", JSON.stringify(dados.usuario));

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
    <div className="andra-split-container">
      {/* LADO ESQUERDO: Painel de Formulário */}
      <div className="andra-login-side">
        <span className="andra-top-label">Login Institucional</span>

        <img
          src={logo}
          alt="logoAR"
          style={{ height: 240, transform: "translateY(86px)" }}
        />

        <div className="andra-card">
          <div className="andra-header">
            <div className="andra-logo-wrapper"></div>
          </div>

          <form onSubmit={handleLogin} className="andra-form">
            {mensagemErro && (
              <div className="andra-error-alert">⚠️ {mensagemErro}</div>
            )}

            <div className="andra-input-group">
              <label>Tipo de Acesso</label>
              <select
                value={tipoAcesso}
                onChange={(e) => setTipoAcesso(e.target.value)}
                disabled={carregando}
              >
                <option value="Usuario Institucional">Usuário Institucional</option>
                <option value="Administrador">Administrador</option>
              </select>
            </div>

            <div className="andra-input-group">
              <label>E-mail</label>
              <div className="andra-field-wrapper">
                <span className="andra-icon">✉️</span>
                <input
                  type="email"
                  placeholder="nome@usuario.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={carregando}
                  required
                />
              </div>
            </div>

            <div className="andra-input-group">
              <div className="andra-label-row">
                <label>Senha</label>
                <a href="#esqueci" className="andra-forgot">
                  Esqueci minha senha
                </a>
              </div>
              <div className="andra-field-wrapper">
                <span className="andra-icon">🔒</span>
                <input
                  type={verSenha ? "text" : "password"}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  disabled={carregando}
                  required
                />
                <button
                  type="button"
                  className="andra-toggle-pass"
                  onClick={() => setVerSenha(!verSenha)}
                  disabled={carregando}
                >
                  {verSenha ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="andra-btn-submit"
              disabled={carregando}
            >
              {carregando ? "Autenticando..." : "Entrar"}{" "}
              <span className="andra-arrow">➔</span>
            </button>

            <div className="andra-divider">
              <span className="andra-line"></span>
              <span className="andra-divider-text">SEGURANÇA INSTITUCIONAL</span>
              <span className="andra-line"></span>
            </div>
          </form>
        </div>

        <div className="andra-left-footer">
          <span>© 2026 Prefeitura Municipal de Andradina</span>
        </div>
      </div>

      {/* LADO DIREITO: Painel de Imagem */}
      <div className="andra-image-side">
        <div className="andra-image-overlay">
          <div className="andra-overlay-content">
            <h3>Governo Inteligente</h3>
            <p>Conectando a gestão pública e otimizando os recursos municipais.</p>
          </div>
          <div className="andra-right-footer-links">
            <a href="#privacidade">Privacidade</a>
            <a href="#termos">Termos de Uso</a>
            <a href="#suporte">Suporte</a>
          </div>
        </div>
      </div>
    </div>
  );
}