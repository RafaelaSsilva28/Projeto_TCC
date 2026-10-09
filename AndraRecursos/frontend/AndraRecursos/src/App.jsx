
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// ============================================
// PÁGINAS
// ============================================

import Login from "./pages/Login";
import PrincipalAdm from "./pages/PrincipalAdm";
import PrincipalInst from "./pages/PrincipalInst";
import ObrigatorioInst from "./pages/ObrigatorioInst";
import PerfilAdministrador from "./pages/PerfilAdministrador";
import CadastrarInstADM from "./pages/CadastrarInstADM";
import HistoricoAdmin from "./pages/HistoricoAdmin";
import SolicitacoesAdmin from "./pages/SolicitacoesAdmin";
import SolicitacoesInst from "./pages/SolicitacoesInst";

// ============================================
// COMPONENTES
// ============================================

import LayoutAdministrador from "./components/LayoutAdministrador";
import ProtecaoInstituicao from "./components/ProtecaoInstituicao";

// ============================================
// APP
// ============================================

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* LOGIN */}
        <Route path="/" element={<Login />} />

        {/* DASHBOARD ADMINISTRATIVO */}
        <Route
          path="/principal-adm"
          element={
            <LayoutAdministrador>
              <PrincipalAdm />
            </LayoutAdministrador>
          }
        />

        {/* PERFIL ADMINISTRATIVO */}
        <Route
          path="/perfilAdministrador"
          element={
            <LayoutAdministrador>
              <PerfilAdministrador />
            </LayoutAdministrador>
          }
        />

        {/* CADASTRAR INSTITUIÇÃO */}
        <Route
          path="/cadastrarInstituicao"
          element={
            <LayoutAdministrador>
              <CadastrarInstADM />
            </LayoutAdministrador>
          }
        />

        {/* HISTÓRICO ADMINISTRATIVO */}
        <Route
          path="/historico-adm"
          element={
            <LayoutAdministrador>
              <HistoricoAdmin />
            </LayoutAdministrador>
          }
        />

        {/* LINK ANTIGO DO HISTÓRICO */}
        <Route
          path="/historico"
          element={
            <Navigate to="/historico-adm" replace />
          }
        />

        {/* LISTA DE SOLICITAÇÕES */}
        <Route
          path="/solicitacoes"
          element={
            <LayoutAdministrador>
              <SolicitacoesAdmin />
            </LayoutAdministrador>
          }
        />

        {/* DETALHES DE UMA SOLICITAÇÃO */}
        <Route
          path="/solicitacoes/:id"
          element={
            <LayoutAdministrador>
              <SolicitacoesAdmin />
            </LayoutAdministrador>
          }
        />

        {/* PRIMEIRO ACESSO INSTITUCIONAL */}
        <Route
          element={
            <ProtecaoInstituicao exigirCadastro={false} />
          }
        >
          <Route
            path="/obrigatorio-inst"
            element={<ObrigatorioInst />}
          />
        </Route>

        {/* ÁREA INSTITUCIONAL */}
        <Route
          element={
            <ProtecaoInstituicao exigirCadastro={true} />
          }
        >
          <Route
            path="/principal-inst"
            element={<PrincipalInst />}
          />
      
          <Route
            path="/solicitacoes-inst"
            element={<SolicitacoesInst />}
          />
      
        </Route>

        {/* ROTA NÃO ENCONTRADA */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
