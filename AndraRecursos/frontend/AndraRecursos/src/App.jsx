import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from "./pages/Login"; 
import PrincipalAdm from "./pages/PrincipalAdm";
import PrincipalInst from "./pages/PrincipalInst";
import ObrigatorioInst from "./pages/ObrigatorioInst"; 

function App () {
  return (
     <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/principal-adm" element={<PrincipalAdm />} />
          <Route path="/principal-inst" element={<PrincipalInst />} />
          <Route path="/obrigatorio-inst" element={<ObrigatorioInst />} />
        </Routes>
      </BrowserRouter>
  )
}
export default App