
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Login from "./pages/Login";
import PrincipalAdm from "./pages/PrincipalAdm";
import PrincipalInst from "./pages/PrincipalInst";
import ObrigatorioInst from "./pages/ObrigatorioInst";
import PerfilAdministrador from "./pages/PerfilAdministrador";
import CadastrarInstADM from "./pages/CadastrarInstADM";

import LayoutAdministrador from "./components/LayoutAdministrador";
import ProtecaoInstituicao from "./components/ProtecaoInstituicao";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* LOGIN */}
        <Route path="/" element={<Login />} />

        {/* ADMINISTRADOR */}
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

        {/* PRIMEIRO CADASTRO INSTITUCIONAL */}
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

        {/* ÁREA INSTITUCIONAL LIBERADA */}
        <Route
          element={<ProtecaoInstituicao exigirCadastro />}
        >
          <Route
            path="/principal-inst"
            element={<PrincipalInst />}
          />

          {/* Outras rotas institucionais
              devem ser adicionadas aqui */}
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
