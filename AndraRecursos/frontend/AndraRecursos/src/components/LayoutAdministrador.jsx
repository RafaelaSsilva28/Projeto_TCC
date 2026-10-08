
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import logo from "../assets/AndraRecursos.png";
import IconeAdministrador from "./IconesAdministrador";

const menuPrincipal = [
  { texto: "Dashboard", caminho: "/principal-adm", icone: "dashboard" },
  { texto: "Cadastrar Instituição", caminho: "/cadastrarInstituicao", icone: "instituicao" },
  { texto: "Histórico", caminho: "/historico", icone: "historico" },
  { texto: "Notificações", caminho: "/notificacoes", icone: "sino" },
  { texto: "Solicitações", caminho: "/solicitacoes", icone: "adicionar" },
];

const menuInferior = [
  { texto: "Configurações", caminho: "/configuracoes", icone: "configuracoes" },
  { texto: "Suporte", caminho: "/suporte", icone: "suporte" },
];

export default function LayoutAdministrador({ children }) {
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);

  let usuario = null;

  try {
    usuario = JSON.parse(
      localStorage.getItem("@AndraRecursos:usuario") || "null"
    );
  } catch {
    usuario = null;
  }

  function sair() {
    localStorage.removeItem("@AndraRecursos:token");
    localStorage.removeItem("@AndraRecursos:usuario");
    localStorage.removeItem("@AndraRecursos:lembrar");
    navigate("/");
  }

  const classeMenu =
    "flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition hover:bg-white/10";

  function links(itens) {
    return itens.map((item) => (
      <NavLink
        key={item.caminho}
        to={item.caminho}
        onClick={() => setMenuAberto(false)}
        className={({ isActive }) =>
          `${classeMenu} ${
            isActive
              ? "bg-[#164675] text-white"
              : "text-blue-100"
          }`
        }
      >
        <IconeAdministrador
          tipo={item.icone}
          className="h-5 w-5 shrink-0"
        />
        <span>{item.texto}</span>
      </NavLink>
    ));
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] font-sans text-gray-800 lg:flex">
      {/* MENU LATERAL */}
      <aside className="flex w-full flex-col bg-[#082d56] text-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0">
        {/* LOGOTIPO */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={logo}
              alt="AndraRecursos"
              className="h-14 w-14 shrink-0 object-contain"
            />

            <div className="min-w-0">
              <h2 className="text-lg font-bold">
                AndraRecursos
              </h2>

              <span className="text-xs text-blue-200">
                Gestão Administrativa
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMenuAberto(!menuAberto)}
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuAberto}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-white/10 lg:hidden"
          >
            <IconeAdministrador
              tipo={menuAberto ? "fechar" : "menu"}
            />
          </button>
        </div>

        <div
          className={`${
            menuAberto ? "flex" : "hidden"
          } flex-col lg:flex lg:min-h-0 lg:flex-1`}
        >
          {/* MENU PRINCIPAL */}
          <nav
            aria-label="Menu administrativo"
            className="space-y-2 px-4 py-6"
          >
            {links(menuPrincipal)}
          </nav>

          {/* MENU INFERIOR */}
          <nav
            aria-label="Menu inferior"
            className="mt-auto space-y-2 border-t border-white/10 px-4 py-5"
          >
            {links(menuInferior)}
          </nav>
        </div>
      </aside>

      {/* ÁREA DIREITA */}
      <div className="min-w-0 flex-1">
        {/* CABEÇALHO */}
        <header className="flex flex-wrap items-center gap-4 border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
          <span className="min-w-0 flex-1 text-base font-semibold text-[#082d56] sm:text-lg">
            Dashboard Administrativo
          </span>

          {/* PESQUISA */}
          <div className="order-3 flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 xl:order-none xl:w-64">
            <IconeAdministrador
              tipo="busca"
              className="h-5 w-5 shrink-0 text-gray-400"
            />

            <input
              type="search"
              placeholder="Buscar recursos..."
              aria-label="Buscar recursos"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-gray-400"
            />
          </div>

          {/* AÇÕES SUPERIORES */}
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <button
              type="button"
              onClick={() => navigate("/notificacoes")}
              title="Notificações"
              aria-label="Notificações"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-[#082d56] hover:bg-gray-100"
            >
              <IconeAdministrador tipo="sino" />
            </button>

            <button
              type="button"
              onClick={() => navigate("/configuracoes")}
              title="Configurações"
              aria-label="Configurações"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-[#082d56] hover:bg-gray-100"
            >
              <IconeAdministrador tipo="configuracoes" />
            </button>

            {/* PERFIL CLICÁVEL */}
            <button
              type="button"
              onClick={() => navigate("/perfilAdministrador")}
              title="Perfil do Administrador"
              className="flex items-center gap-3 rounded-lg hover:bg-gray-50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#082d56]">
                <IconeAdministrador tipo="usuario" />
              </span>

              <span className="hidden text-left sm:block">
                <span className="block text-xs text-gray-500">
                  Área
                </span>

                <span className="block max-w-40 truncate text-sm font-semibold text-[#082d56]">
                  {usuario?.nome || "Administrador"}
                </span>
              </span>
            </button>

            {/* SAIR */}
            <button
              type="button"
              onClick={sair}
              className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <IconeAdministrador
                tipo="sair"
                className="h-4 w-4"
              />
              <span>Sair</span>
            </button>
          </div>
        </header>

        {/* CONTEÚDO DE CADA PÁGINA */}
        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
