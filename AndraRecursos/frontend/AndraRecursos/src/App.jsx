
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

import HistoricoInst from "./pages/HistoricoInst";

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

        {/* ===================================
            LOGIN
        =================================== */}

        <Route
          path="/"
          element={<Login />}
        />

        {/* ===================================
            ÁREA ADMINISTRATIVA
        =================================== */}

        {/* DASHBOARD ADMINISTRATIVO */}
        <Route
          path="/principal-adm"
          element={
            <LayoutAdministrador>
              <PrincipalAdm />
            </LayoutAdministrador>
          }
        />

        {/* PERFIL DO ADMINISTRADOR */}
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

        {/* CORRIGIR LINKS ANTIGOS DO HISTÓRICO */}
        <Route
          path="/historico"
          element={
            <Navigate
              to="/historico-adm"
              replace
            />
          }
        />

        {/* ===================================
            PRIMEIRO ACESSO INSTITUCIONAL
        =================================== */}

        <Route
          element={
            <ProtecaoInstituicao
              exigirCadastro={false}
            />
          }
        >
          <Route
            path="/obrigatorio-inst"
            element={<ObrigatorioInst />}
          />
        </Route>

        {/* ===================================
            ÁREA INSTITUCIONAL LIBERADA
        =================================== */}

        <Route
          element={
            <ProtecaoInstituicao
              exigirCadastro={true}
            />
          }
        >
          {/* DASHBOARD INSTITUCIONAL */}
          <Route
            path="/principal-inst"
            element={<PrincipalInst />}
          />

          {/* ADICIONE FUTURAS PÁGINAS
              INSTITUCIONAIS AQUI */}
        </Route>

        {/* ===================================
            ROTAS NÃO ENCONTRADAS
        =================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
