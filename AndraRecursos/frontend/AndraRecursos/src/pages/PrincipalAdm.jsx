import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/EstilosDashboard.css" // Certifique-se de criar este arquivo CSS
// import logo do municipio de Andradina antiga ou brasão se tiver no asset
import logo from "../assets/AndraRecursos.png";

export default function PrincipalAdm() {
  const [dadoslogin, setDadosLogin] = useState(null)
  const [solicitacoes, setSolicitacoes] = useState([]);

  const navigate = useNavigate()

  useEffect(() => {
    function buscarUsuario() {
      const usuarioLogado = localStorage.getItem('UsuarioLogado')
      if (usuarioLogado) {
        setDadosLogin(JSON.parse(usuarioLogado))
      }
    }
  async function buscarSolicitacoes() {
  try {
    // 1. CORRIGIDO: Adicionado as barras duplas '//' nas URLs
    const [resTotal, resAprovadas, resPendentes, resRecusadas, resRecentes] = await Promise.all([
      fetch("http://localhost:3001/dashboard/total/solicitacoes"),
      fetch("http://localhost:3001/dashboard/solicitacoes/aprovadas"),
      fetch("http://localhost:3001/dashboard/solicitacoes/pendentes"), // Corrigido endpoint duplicado
      fetch("http://localhost:3001/dashboard/solicitacoes/recusadas"),
      fetch("http://localhost:3001/dashboard/solicitacoes/recentes")
    ]);

    const total = await resTotal.json()
    const aprovadas = await resAprovadas.json()
    const pendentes = await resPendentes.json()
    const recusadas = await resRecusadas.json()
    const recentes = await resRecentes.json()

    setSolicitacoes({
    total: total.total,
    aprovadas: aprovadas.aprovadas,
    pendentes: pendentes.pendentes,
    recusadas: recusadas.recusadas,
    recentes: recentes
  });

  } catch (error) {
    console.error("Erro de conexão com o Swagger/Backend:", error)
  }
}
    buscarUsuario()
    buscarSolicitacoes()

  }, [])

  function botaoLogout () {
    localStorage.removeItem('UsuarioLogado')
    setDadosLogin(null)
    navigate('/')
  }

  return (
    <div className="andra-dash-layout">
      {/* 1. BARRA LATERAL (SIDEBAR) */}
      <aside className="andra-dash-sidebar">
        <div className="andra-sidebar-brand">
          <img src={logo} alt="Logo" className="andra-sidebar-logo"/>
          <div className="andra-sidebar-brand-text">
            <h2>AndraRecursos</h2>
            <span>Gestão Administrativa</span>
          </div>
        </div>
        
        <nav className="andra-sidebar-menu">
          <a href="#dashboard" className="andra-menu-item active">📊 Dashboard</a>
          <a href="#cadastrar" className="andra-menu-item">🏢 Cadastrar Instituição</a>
          <a href="#historico" className="andra-menu-item">⏳ Histórico</a>
          <a href="#notificacoes" className="andra-menu-item">🔔 Notificações</a>
          <a href="#solicitacoes" className="andra-menu-item">➕ Solicitações</a>
        </nav>

        <div className="andra-sidebar-footer">
          <a href="#configuracoes" className="andra-menu-item">⚙️ Configurações</a>
          <a href="#suporte" className="andra-menu-item">❓ Suporte</a>
        </div>
      </aside>

      {/* RECIPIENTE DO CONTEÚDO PRINCIPAL */}
      <div className="andra-dash-main">
        
        {/* 2. CABEÇALHO SUPERIOR (TOPBAR) */}
        <header className="andra-dash-topbar">
          <span className="andra-topbar-title">Dashboard Administrativo</span>
          <div className="andra-search-box">
            <span className="andra-search-icon">🔍</span>
            <input type="text" placeholder="Buscar recursos..." />
          </div>
          <div className="andra-topbar-actions">
            <button className="andra-topbar-icon-btn">⚙️</button>
            <div className="andra-topbar-profile">
              <span className="andra-profile-icon">👤</span>
              <div className="andra-profile-text">
                <span className="andra-profile-role">Área</span>
                <span className="andra-profile-name">Administrador</span>
              </div>
            </div>
            <button className="andra-logout-link" onClick={botaoLogout}>Sair</button>
          </div>
        </header>

        {/* 3. CONTEÚDO DO PAINEL */}
        <main className="andra-dash-content">
          <div className="andra-content-header">
            <div className="andra-page-title">
              <h1>Visão Geral</h1>
              <p>Bem-vindo ao nosso painel de controle!</p>
            </div>
            <button className="andra-btn-export">📄 Exportar Relatório</button>
          </div>

          {/* 4. CARDS DE MÉTRICAS */}
          <section className="andra-metrics-grid">
            <div className="andra-metric-card blue">
              <span className="andra-metric-label">Total de Solicitações</span>
              <span className="andra-metric-value">{solicitacoes.total}</span>
            </div>
            <div className="andra-metric-card green">
              <span className="andra-metric-label">Total Aprovadas</span>
              <span className="andra-metric-value">{solicitacoes.aprovadas}</span>
            </div>
            <div className="andra-metric-card yellow">
              <span className="andra-metric-label">Total Pendentes</span>
              <span className="andra-metric-value">{solicitacoes.pendentes}</span>
            </div>
            <div className="andra-metric-card red">
              <span className="andra-metric-label">Recusadas</span>
              <span className="andra-metric-value">{solicitacoes.recusadas}</span>
            </div>
          </section>

          {/* 5. SEÇÃO DE FILTROS */}
          <section className="andra-filter-card">
            <span className="andra-filter-title">Classificar por:</span>
            <div className="andra-filter-inputs">
              <select><option>STATUS</option></select>
              <select><option>TIPOS</option></select>
              <select><option>INSTITUIÇÃO</option></select>
              <select><option>DATA</option></select>
              <select><option>PRIORIDADE</option></select>
              <button className="andra-btn-clear">Limpar</button>
            </div>
          </section>

          {/* 6. TABELA DE SOLICITAÇÕES RECENTES - ficticia*/}
          {/* <section className="andra-table-card">
            <h2>Solicitações Recentes</h2>
            <div className="andra-table-responsive">
              <table className="andra-data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>INSTITUIÇÃO</th>
                    <th>TIPO</th>
                    <th>PRIORIDADE</th>
                    <th>STATUS</th>
                    <th>DATA</th>
                    <th>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>1</strong></td>
                    <td>Escola Municipal João XXIII</td>
                    <td>Reforma Estrutural</td>
                    <td><span className="badge-priority high">ALTA</span></td>
                    <td><span className="badge-status pending">Pendentes</span></td>
                    <td>23/04/2026</td>
                    <td>
                      <div className="andra-table-actions">
                        <button className="andra-action-approve">APROVAR</button>
                        <button className="andra-action-reject">RECUSAR</button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>2</strong></td>
                    <td>Escola Municipal Paschoalino de Oliveira</td>
                    <td>Notebooks Novos</td>
                    <td><span className="badge-priority low">BAIXA</span></td>
                    <td><span className="badge-status approved">Aprovado</span></td>
                    <td>23/04/2026</td>
                    <td>
                      <div className="andra-table-actions">
                        <button className="andra-action-approve disabled" disabled>APROVAR</button>
                        <button className="andra-action-reject">RECUSAR</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section> */}
          {/* 6. TABELA DE SOLICITAÇÕES RECENTES */}
          <section className="andra-table-card">
            <h2>Solicitações Recentes</h2>
            <div className="andra-table-responsive">
              <table className="andra-data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>INSTITUIÇÃO</th>
                    <th>TIPO</th>
                    <th>PRIORIDADE</th>
                    <th>STATUS</th>
                    <th>DATA</th>
                    <th>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitacoes?.recentes?.map((solicitacao) => (
                    <tr key={solicitacao.id_solicitacoes}>
                      <td><strong>{solicitacao.id_solicitacoes}</strong></td>
                      <td>{solicitacao.nome_instituicao}</td>
                      <td>{solicitacao.titulo}</td>
                      <td>
                        <span className={`badge-priority ${solicitacao.prioridade === "Alta" ? "high" : "low"}`}>
                          {solicitacao.prioridade?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`badge-status ${
                          solicitacao.status === "aprovada" ? "approved" :
                          solicitacao.status === "recusada" ? "rejected" : "pending"
                        }`}>
                          {solicitacao.status}
                        </span>
                      </td>
                      <td>{new Date(solicitacao.data_pedido).toLocaleDateString("pt-BR")}</td>
                      <td>
                        <div className="andra-table-actions">
                          <button
                            className={`andra-action-approve ${solicitacao.status === "aprovada" ? "disabled" : ""}`}
                            disabled={solicitacao.status === "aprovada"}
                            onClick={() => atualizarStatusSolicitacao(solicitacao.id_solicitacoes, "aprovada")}>
                            APROVAR
                          </button>
                          <button
                            className="andra-action-reject"
                            onClick={() => atualizarStatusSolicitacao(solicitacao.id_solicitacoes, "recusada")}>
                            RECUSAR
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}