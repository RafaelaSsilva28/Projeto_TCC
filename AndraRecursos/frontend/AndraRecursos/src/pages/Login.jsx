import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/EstilosLogin.css";
import logo from "../assets/AndraRecursos.png";

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

      const tipoRetornado = dados.usuario.tipo; 

      const tipoEsperado = tipoAcesso === "Administrador" ? "Administrador" : "Instituicao";
      if (tipoRetornado !== tipoEsperado) {
        throw new Error(
          tipoRetornado === "Administrador"
            ? " ⚠️ Este usuário é um Administrator ⚠️ Selecione o acesso correto"
            : " ⚠️ Este usuário é Institucional ⚠️ Selecione o acesso correto"
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

        <img src={logo} alt="Brasão Andradina" className="andra-avatar" 
        style={{ height: 240, transform: "translateY(80px)" }} />

        <div className="andra-card">
          <form onSubmit={handleLogin} className="andra-form">

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
                  placeholder="Digite seu email"
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
                <a href="#esqueci" className="andra-forgot">Esqueci minha senha</a>
              </div>
              <div className="andra-field-wrapper">
                <span className="andra-icon">🔒</span>
                <input
                  type={verSenha ? "text" : "password"}
                  placeholder="Digite sua senha"
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

            <button type="submit" className="andra-btn-submit" disabled={carregando}>
              {carregando ? "Autenticando..." : "Entrar"} <span className="andra-arrow">➔</span>
            </button>

            {mensagemErro && (
              <div className="andra-error-alert"
                style={{
                  textAlign: "center",
                  color: "#800020", // bordô
                  fontWeight: "500",
                  marginTop: "15px"
                }}
              >
                {mensagemErro}
              </div>
            )}

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

      {/* LADO DIREITO: Painel Governamental Inteligente Reformulado */}
      <div className="andra-info-side">
        {/* Detalhes Dourados e Estrelas flutuando no fundo azul */}
        <div className="andra-decor-dots-left"></div>
        <div className="andra-decor-dots-right"></div>

        <div className="andra-info-content">
          
          <div className="andra-main-header">
            <h3 className="andra-right-title">
              Governo <span>Inteligente</span>
            </h3>
            <p className="andra-right-subtitle">
              Conectando a gestão pública e otimizando os recursos municipais.
            </p>
          </div>

          <div className="andra-features-list">
            <div className="andra-feature-item">
              <div className="andra-feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              </div>
              <div className="andra-feature-text-group">
                <h4 className="andra-feature-title">Mais Eficiência</h4>
                <p className="andra-feature-desc">Processos integrados para uma gestão mais ágil.</p>
              </div>
            </div>

            <div className="andra-feature-item">
              <div className="andra-feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              </div>
              <div className="andra-feature-text-group">
                <h4 className="andra-feature-title">Mais Transparência</h4>
                <p className="andra-feature-desc">Informações seguras e acessíveis para a sociedade.</p>
              </div>
            </div>

            <div className="andra-feature-item">
              <div className="andra-feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
              <div className="andra-feature-text-group">
                <h4 className="andra-feature-title">Mais Resultados</h4>
                <p className="andra-feature-desc">Decisões inteligentes para transformar a vida das pessoas.</p>
              </div>
            </div>
          </div>

          <div className="andra-quote-card">
            <p>
              <span className="andra-quote-mark left">“</span>
              Tecnologia e inovação a serviço de uma cidade melhor para todos.
              <span className="andra-quote-mark right">”</span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
