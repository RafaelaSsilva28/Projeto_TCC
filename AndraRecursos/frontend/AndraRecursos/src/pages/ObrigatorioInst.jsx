import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/EstilosObrigatorio.css"; 
import logo from "../assets/AndraRecursos.png"; // Certifique-se de ter o brasão nesta pasta
import { enderecoServidor } from "../utils";
import { FiChevronLeft } from "react-icons/fi";


export default function ObrigatorioInst() {
  const [dadoslogin, setDadosLogin] = useState(null);
  const navigate = useNavigate();

  // Estados dos campos do formulário
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [secretaria, setSecretaria] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [cep, setCep] = useState("");
  const [numeroComplemento, setNumeroComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [telefone, setTelefone] = useState("");
  const [horario, setHorario] = useState("");
  const [status, setStatus] = useState("");
  const [emailInst, setEmailInst] = useState("");

  useEffect(() => {
    const usuarioLogado = localStorage.getItem('UsuarioLogado');
    if (usuarioLogado) {
      setDadosLogin(JSON.parse(usuarioLogado));
    }
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const dadosFormulario = {
      nomeCompleto,
      secretaria,
      logradouro,
      cep,
      cidade: "Andradina",
      numeroComplemento,
      bairro,
      telefone,
      horario,
      status,
      emailInst
    };

    try {
      // Exemplo de envio para o seu backend
      const resposta = await fetch(`${enderecoServidor}/instituicao/obrigatorio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // "Authorization": `Bearer ${localStorage.getItem('@AndraRecursos:token')}` // Se usar token
        },
        body: JSON.stringify(dadosFormulario),
      });

      if (resposta.ok) {
        navigate("/principal-inst"); // Redireciona para o dashboard após salvar
      } else {
        alert("Erro ao salvar as informações obrigatórias.");
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
    }
  };

   function botaoLogout() {
    localStorage.removeItem("@AndraRecursos:token");
    localStorage.removeItem("@AndraRecursos:usuario");
    localStorage.removeItem("@AndraRecursos:lembrar");
    setDadosLogin(null);
    navigate("/");
  }

  return (
    <div className="andra-ob-container">
     <button className="andra-logout-linked" onClick={botaoLogout}>
  <FiChevronLeft size={20} />
  <span>Voltar</span>
</button>
      <p className="andra-ob-top-text">
        Para continuar acessando o sistema AndraRecursos, por favor preencha as informações obrigatórias da sua unidade.
      </p>

      <div className="andra-ob-card">
        <form onSubmit={handleSubmit} className="andra-ob-form">
          
          {/* COLUNA ESQUERDA */}
          <div className="andra-ob-column">
            <h3 className="andra-ob-section-title">Responsável e Vínculo</h3>
            <div className="andra-ob-row">
              <input 
                type="text" 
                placeholder="Nome Completo" 
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                required 
              />
              <select 
                value={secretaria} 
                onChange={(e) => setSecretaria(e.target.value)} 
                required
              >
                <option value="" disabled selected hidden>Selecione Secretaria</option>
                <option value="Saude">Secretaria de Saúde</option>
                <option value="Educacao">Secretaria de Educação</option>
                <option value="Administracao">Secretaria de Administração</option>
                <option value="Fazenda">Secretaria da Fazenda</option>
              </select>
            </div>

            <h3 className="andra-ob-section-title">Endereço Institucional</h3>
            <div className="andra-ob-row full-width">
              <input 
                type="text" 
                placeholder="Logradouro" 
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
                required 
              />
            </div>
            <div className="andra-ob-row">
              <input 
                type="text" 
                placeholder="CEP" 
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                required 
              />
              <input type="text" value="Andradina" disabled className="input-disabled" />
            </div>
            <div className="andra-ob-row">
              <input 
                type="text" 
                placeholder="N° / Complemento" 
                value={numeroComplemento}
                onChange={(e) => setNumeroComplemento(e.target.value)}
                required 
              />
              <input 
                type="text" 
                placeholder="Bairro" 
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                required 
              />
            </div>

            <div className="andra-ob-alert-desktop">
              * Campos de preenchimento obrigatório para liberação do acesso.
            </div>
          </div>

          {/* COLUNA DIREITA */}
          <div className="andra-ob-column">
            {/* Banner Institucional Identificador */}
            <div className="andra-ob-banner">
              <img src={logo} alt="Brasão de Andradina" className="andra-ob-banner-logo" />
              <div className="andra-ob-banner-text">
                <h2>AndraRecursos</h2>
                <span>Gestão institucional</span>
              </div>
            </div>

            <h3 className="andra-ob-section-title">Comunicação e Operação</h3>
            <div className="andra-ob-row">
              <input 
                type="text" 
                placeholder="Telefone Institucional" 
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                required 
              />
              <input 
                type="text" 
                placeholder="Horário de Funcionamento" 
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                required 
              />
            </div>
            <div className="andra-ob-row">
              <input 
                type="text" 
                placeholder="Status" 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required 
              />
              <input 
                type="email" 
                placeholder="Email Institucional" 
                value={emailInst}
                onChange={(e) => setEmailInst(e.target.value)}
                required 
              />
            </div>

            <div className="andra-ob-footer-actions">
              <button type="submit" className="andra-ob-btn-submit">
                Finalizar
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}