
import { useState } from "react";
import {
    NavLink,
    useLocation,
    useNavigate,
} from "react-router-dom";

import {
    FiHome,
    FiPlusCircle,
    FiClock,
    FiBell,
    FiFileText,
    FiSettings,
    FiLogOut,
    FiMenu,
    FiX,
    FiUser,
} from "react-icons/fi";

import logo from "../assets/AndraRecursos.png";

const menuPrincipal = [
    {
        nome: "Dashboard",
        rota: "/principal-inst",
        Icone: FiHome,
    },
    {
        nome: "Solicitações",
        rota: "/solicitacoes-inst",
        Icone: FiPlusCircle,
    },
    {
        nome: "Histórico",
        rota: "/historico-inst",
        Icone: FiClock,
    },
    {
        nome: "Notificações",
        rota: "/notificacoes-inst",
        Icone: FiBell,
    },
    {
        nome: "Relatórios",
        rota: "/relatorios-inst",
        Icone: FiFileText,
    },
];

const titulos = {
    "/principal-inst": "Dashboard Institucional",
    "/solicitacoes-inst": "Solicitações",
    "/historico-inst": "Histórico de Solicitações",
    "/notificacoes-inst": "Notificações",
    "/relatorios-inst": "Relatórios",
    "/configuracoes-inst": "Configurações",
};

export default function LayoutInstituicao({
    children,
    nomeInstituicao,
}) {
    const navigate = useNavigate();
    const location = useLocation();

    const [menuAberto, setMenuAberto] = useState(false);

    const titulo =
        titulos[location.pathname] || "Área Institucional";

    function sair() {
        localStorage.removeItem("@AndraRecursos:token");
        localStorage.removeItem("@AndraRecursos:usuario");
        localStorage.removeItem("@AndraRecursos:lembrar");

        navigate("/", { replace: true });
    }

    function fecharMenu() {
        setMenuAberto(false);
    }

    const classeLink = ({ isActive }) =>
        `flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 ${isActive
            ? "bg-[#1755ad] text-white shadow-sm"
            : "text-blue-100 hover:bg-white/10 hover:text-white"
        }`;

    return (
        <div className="min-h-screen bg-[#f4f6f9] text-slate-800 lg:flex">

            {/* FUNDO MOBILE */}
            {menuAberto && (
                <button
                    type="button"
                    aria-label="Fechar menu lateral"
                    onClick={fecharMenu}
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                />
            )}

            {/* MENU LATERAL */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-[#082d56] text-white shadow-xl transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none ${menuAberto
                        ? "translate-x-0"
                        : "-translate-x-full"
                    }`}
            >

                {/* LOGO */}
                <div className="flex min-h-24 items-center justify-between gap-3 border-b border-white/10 px-4 py-5">

                    <div className="flex min-w-0 items-center gap-3">

                        <img
                            src={logo}
                            alt="Logo AndraRecursos"
                            className="h-16 w-16 shrink-0 object-contain"
                        />

                        <div className="min-w-0">
                            <h1 className="text-base font-bold tracking-tight text-white">
                                AndraRecursos
                            </h1>

                            <p className="mt-1 text-xs text-blue-200">
                                Gestão Institucional
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={fecharMenu}
                        aria-label="Fechar menu"
                        className="rounded-lg p-2 text-white hover:bg-white/10 lg:hidden"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* LINKS */}
                <nav
                    aria-label="Menu institucional"
                    className="flex-1 space-y-2 overflow-y-auto px-4 py-6"
                >
                    {menuPrincipal.map(({ nome, rota, Icone }) => (
                        <NavLink
                            key={rota}
                            to={rota}
                            onClick={fecharMenu}
                            className={classeLink}
                        >
                            <Icone size={20} className="shrink-0" />
                            <span>{nome}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* MENU INFERIOR */}
                <div className="space-y-2 border-t border-white/10 px-4 py-5">
                    <NavLink
                        to="/configuracoes-inst"
                        onClick={fecharMenu}
                        className={classeLink}
                    >
                        <FiSettings size={20} />
                        <span>Configurações</span>
                    </NavLink>

                    <button
                        type="button"
                        onClick={sair}
                        className="flex min-h-12 w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold text-blue-100 transition hover:bg-red-500/20 hover:text-white"
                    >
                        <FiLogOut size={20} />
                        Sair
                    </button>
                </div>
            </aside>

            {/* CONTEÚDO PRINCIPAL */}
            <div className="flex min-w-0 flex-1 flex-col">

                {/* CABEÇALHO */}
                <header className="flex min-h-20 flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">

                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setMenuAberto(true)}
                            aria-label="Abrir menu"
                            className="rounded-lg p-2 text-[#082d56] hover:bg-blue-50 lg:hidden"
                        >
                            <FiMenu size={23} />
                        </button>

                        <div className="min-w-0">
                            <h2 className="text-base font-bold text-[#082d56] sm:text-lg">
                                {titulo}
                            </h2>

                            <p className="text-xs text-slate-500">
                                Painel da Instituição
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-5">

                        <button
                            type="button"
                            title="Notificações"
                            aria-label="Acessar notificações"
                            onClick={() => navigate("/notificacoes-inst")}
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#082d56] transition hover:bg-blue-50"
                        >
                            <FiBell size={21} />
                        </button>

                        <button
                            type="button"
                            title="Configurações"
                            aria-label="Acessar configurações"
                            onClick={() => navigate("/configuracoes-inst")}
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#082d56] transition hover:bg-blue-50"
                        >
                            <FiSettings size={21} />
                        </button>

                        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

                        <div className="flex max-w-44 items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eaf2fc] text-[#1755ad]">
                                <FiUser size={20} />
                            </span>

                            <div className="hidden min-w-0 sm:block">
                                <p className="text-xs text-slate-500">
                                    Instituição
                                </p>

                                <p className="truncate text-sm font-bold text-[#082d56]">
                                    {nomeInstituicao || "Área Institucional"}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={sair}
                            className="hidden items-center gap-2 rounded-lg px-2 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 md:flex"
                        >
                            <FiLogOut size={17} />
                            Sair
                        </button>
                    </div>
                </header>

                {/* PÁGINA ATUAL */}
                <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
