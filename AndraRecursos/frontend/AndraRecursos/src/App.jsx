import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { Toaster } from "react-hot-toast";

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

import NotificacoesAdmin from "./pages/NotificacoesAdmin";

import RelatoriosInst from "./pages/RelatoriosInst";

import HistoricoInst from "./pages/HistoricoInst";

// NOVA PÁGINA DE CONFIGURAÇÕES
import ConfiguracoesAdmin from "./pages/ConfiguracoesAdmin";

// ============================================
// COMPONENTES
// ============================================

import LayoutAdministrador from "./components/LayoutAdministrador";

import ProtecaoInstituicao from "./components/ProtecaoInstituicao";

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

function App() {
  return (
    <BrowserRouter>
      {/* ======================================
          NOTIFICAÇÕES TOAST
      ====================================== */}

      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={12}
        toastOptions={{
          duration: 3500,

          style: {
            background: "#ffffff",
            color: "#082d56",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "15px 18px",
            fontSize: "14px",
            fontWeight: "500",
            boxShadow: "0 10px 30px rgba(8,45,86,0.15)",
          },

          success: {
            iconTheme: {
              primary: "#15803d",
              secondary: "#ffffff",
            },
          },

          error: {
            duration: 4500,

            iconTheme: {
              primary: "#dc2626",
              secondary: "#ffffff",
            },
          },
        }}
      />

      {/* ======================================
          ROTAS DO SISTEMA
      ====================================== */}

      <Routes>
        {/* LOGIN */}
        <Route path="/" element={<Login />} />

        {/* ====================================
            ÁREA ADMINISTRATIVA
        ==================================== */}

        {/* DASHBOARD */}
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

        {/* HISTÓRICO */}
        <Route
          path="/historico-adm"
          element={
            <LayoutAdministrador>
              <HistoricoAdmin />
            </LayoutAdministrador>
          }
        />

        {/* REDIRECIONAMENTO DO HISTÓRICO */}
        <Route
          path="/historico"
          element={<Navigate to="/historico-adm" replace />}
        />

        {/* SOLICITAÇÕES */}
        <Route
          path="/solicitacoes"
          element={
            <LayoutAdministrador>
              <SolicitacoesAdmin />
            </LayoutAdministrador>
          }
        />

        {/* DETALHAMENTO DA SOLICITAÇÃO */}
        <Route
          path="/solicitacoes/:id"
          element={
            <LayoutAdministrador>
              <SolicitacoesAdmin />
            </LayoutAdministrador>
          }
        />

        {/* NOTIFICAÇÕES */}
        <Route
          path="/notificacoes"
          element={
            <LayoutAdministrador>
              <NotificacoesAdmin />
            </LayoutAdministrador>
          }
        />

        {/* ====================================
            NOVA ROTA: CONFIGURAÇÕES
        ==================================== */}

        <Route
          path="/configuracoes"
          element={
            <LayoutAdministrador>
              <ConfiguracoesAdmin />
            </LayoutAdministrador>
          }
        />

        {/* ====================================
            ÁREA INSTITUCIONAL
        ==================================== */}

        {/* PRIMEIRO ACESSO */}
        <Route element={<ProtecaoInstituicao exigirCadastro={false} />}>
          <Route path="/obrigatorio-inst" element={<ObrigatorioInst />} />
        </Route>

        {/* TELAS DA INSTITUIÇÃO */}
        <Route element={<ProtecaoInstituicao exigirCadastro={true} />}>
          <Route path="/principal-inst" element={<PrincipalInst />} />

          <Route path="/solicitacoes-inst" element={<SolicitacoesInst />} />

          <Route path="/historico-inst" element={<HistoricoInst />} />

          <Route path="/notificacoes-inst" element={<NotificacoesAdmin />} />

          <Route path="/relatorios-inst" element={<RelatoriosInst />} />
        </Route>

        {/* ====================================
            ROTA NÃO ENCONTRADA
        ==================================== */}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
