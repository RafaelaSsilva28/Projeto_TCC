
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
import PerfilInstituicao from "./pages/PerfilInstituicao";

import CadastrarInstADM from "./pages/CadastrarInstADM";

import HistoricoAdmin from "./pages/HistoricoAdmin";

import SolicitacoesAdmin from "./pages/SolicitacoesAdmin";
import SolicitacoesInst from "./pages/SolicitacoesInst";
import SolicitacoesInstituicao from "./pages/SolicitacoesInstituicao";

import NotificacoesAdmin from "./pages/NotificacoesAdmin";
import NotificacoesInst from "./pages/NotificaçõesInst";

import RelatoriosInst from "./pages/RelatoriosInst";

import HistoricoInst from "./pages/HistoricoInst";

// ============================================
// CONFIGURAÇÕES
// ============================================

import ConfiguracoesAdmin from "./pages/ConfiguracoesAdmin";
import ConfiguracoesInst from "./pages/ConfiguracoesInst";

// ============================================
// COMPONENTES
// ============================================

import LayoutAdministrador from "./components/LayoutAdministrador";
import LayoutInstituicao from "./components/LayoutInstituicao";

import ProtecaoInstituicao from "./components/ProtecaoInstituicao";

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

function App() {
  return (
    <BrowserRouter>
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

      <Routes>
        {/* ====================================
            LOGIN
        ==================================== */}

        <Route path="/" element={<Login />} />

        {/* ====================================
            ÁREA ADMINISTRATIVA
        ==================================== */}

        <Route
          path="/principal-adm"
          element={
            <LayoutAdministrador>
              <PrincipalAdm />
            </LayoutAdministrador>
          }
        />

        <Route
          path="/perfilAdministrador"
          element={
            <LayoutAdministrador>
              <PerfilAdministrador />
            </LayoutAdministrador>
          }
        />

        <Route
          path="/cadastrarInstituicao"
          element={
            <LayoutAdministrador>
              <CadastrarInstADM />
            </LayoutAdministrador>
          }
        />

        <Route
          path="/historico-adm"
          element={
            <LayoutAdministrador>
              <HistoricoAdmin />
            </LayoutAdministrador>
          }
        />

        <Route
          path="/historico"
          element={<Navigate to="/historico-adm" replace />}
        />

        <Route
          path="/solicitacoes"
          element={
            <LayoutAdministrador>
              <SolicitacoesAdmin />
            </LayoutAdministrador>
          }
        />

        <Route
          path="/solicitacoes/:id"
          element={
            <LayoutAdministrador>
              <SolicitacoesAdmin />
            </LayoutAdministrador>
          }
        />

        <Route
          path="/notificacoes"
          element={
            <LayoutAdministrador>
              <NotificacoesAdmin />
            </LayoutAdministrador>
          }
        />

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

        {/* TELAS PROTEGIDAS DA INSTITUIÇÃO */}
        <Route
          element={
            <ProtecaoInstituicao exigirCadastro={true} />
          }
        >
          {/* DASHBOARD */}
          <Route
            path="/principal-inst"
            element={
              <LayoutInstituicao>
                <PrincipalInst />
              </LayoutInstituicao>
            }
          />

          {/* ENVIAR SOLICITAÇÃO */}
          <Route
            path="/solicitacoes-inst"
            element={
              <LayoutInstituicao>
                <SolicitacoesInst />
              </LayoutInstituicao>
            }
          />

          {/* MINHAS SOLICITAÇÕES */}
          <Route
            path="/instituicao/solicitacoes"
            element={
              <LayoutInstituicao>
                <SolicitacoesInstituicao />
              </LayoutInstituicao>
            }
          />

          {/* DETALHES DA SOLICITAÇÃO */}
          <Route
            path="/instituicao/solicitacoes/:id"
            element={
              <LayoutInstituicao>
                <SolicitacoesInstituicao />
              </LayoutInstituicao>
            }
          />

          {/* HISTÓRICO */}
          <Route
            path="/historico-inst"
            element={
              <LayoutInstituicao>
                <HistoricoInst />
              </LayoutInstituicao>
            }
          />

          {/* NOTIFICAÇÕES */}
          <Route
            path="/notificacoes-inst"
            element={
              <LayoutInstituicao>
                <NotificacoesInst />
              </LayoutInstituicao>
            }
          />

          {/* RELATÓRIOS */}
          <Route
            path="/relatorios-inst"
            element={
              <LayoutInstituicao>
                <RelatoriosInst />
              </LayoutInstituicao>
            }
          />

          {/* PERFIL DA INSTITUIÇÃO */}
          <Route
            path="/perfil-inst"
            element={
              <LayoutInstituicao>
                <PerfilInstituicao />
              </LayoutInstituicao>
            }
          />

          {/* CONFIGURAÇÕES */}
          <Route
            path="/configuracoes-inst"
            element={
              <LayoutInstituicao>
                <ConfiguracoesInst />
              </LayoutInstituicao>
            }
          />
        </Route>

        {/* ====================================
            ROTA NÃO ENCONTRADA
        ==================================== */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
