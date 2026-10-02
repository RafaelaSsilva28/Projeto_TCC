import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBell,
  FiClipboard,
  FiHome,
  FiLogOut,
  FiMenu,
  FiSettings,
  FiUser,
  FiX,
} from "react-icons/fi";
import { enderecoServidor } from "../utils";

export default function PrincipalInst() {
  const navigate = useNavigate();

  const [instituicao, setInstituicao] = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let usuario = null;

    try {
      usuario = JSON.parse(localStorage.getItem("@AndraRecursos:usuario"));
    } catch {
      usuario = null;
    }

    const token = localStorage.getItem("@AndraRecursos:token");

    if (!usuario || !token) {
      navigate("/");
      return;
    }

    async function buscarInstituicao() {
      try {
        const resposta = await fetch(`${enderecoServidor}/instituicoes`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!resposta.ok) {
          throw new Error("Erro ao buscar instituição");
        }

        const dados = await resposta.json();

        const encontrada = dados.find(
          (item) => item.id_instituicao === usuario.id,
        );

        setInstituicao(encontrada);
      } catch (error) {
        console.error("Erro ao carregar instituição:", error);
      } finally {
        setCarregando(false);
      }
    }

    buscarInstituicao();
  }, [navigate]);

  function sair() {
    localStorage.removeItem("@AndraRecursos:token");
    localStorage.removeItem("@AndraRecursos:usuario");
    localStorage.removeItem("@AndraRecursos:lembrar");

    navigate("/");
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-[#082d56] font-medium">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {menuAberto && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setMenuAberto(false)}
        />
      )}

      <aside
        className={`fixed lg:sticky z-40 top-0 left-0 h-screen w-64 shrink-0 bg-[#082d56] text-white transform transition-transform duration-300 ${
          menuAberto ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/10">
          <div>
            <h1 className="text-xl font-bold">AndraRecursos</h1>
            <p className="text-xs text-blue-200 mt-1">Área da Instituição</p>
          </div>

          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMenuAberto(false)}
            className="lg:hidden text-white"
          >
            <FiX size={22} />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/10 text-white"
            onClick={() => setMenuAberto(false)}
          >
            <FiHome size={19} />
            <span>Principal</span>
          </button>

          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100 hover:bg-white/10 transition"
          >
            <FiClipboard size={19} />
            <span>Solicitações</span>
          </button>

          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100 hover:bg-white/10 transition"
          >
            <FiBell size={19} />
            <span>Notificações</span>
          </button>

          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100 hover:bg-white/10 transition"
          >
            <FiSettings size={19} />
            <span>Configurações</span>
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <button
            type="button"
            onClick={sair}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100 hover:bg-red-500/20 hover:text-white transition"
          >
            <FiLogOut size={19} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Abrir menu"
              onClick={() => setMenuAberto(true)}
              className="lg:hidden text-gray-600"
            >
              <FiMenu size={24} />
            </button>

            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                Principal
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                Painel da instituição
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Notificações"
            className="relative text-gray-600 hover:text-[#082d56] transition"
          >
            <FiBell size={22} />

            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
          </button>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <section className="bg-[#082d56] rounded-xl p-6 sm:p-8 text-white mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div>
                <p className="text-blue-200 text-sm mb-2">Bem-vindo(a)</p>

                <h1 className="text-2xl sm:text-3xl font-bold">
                  {instituicao?.nome || "Instituição"}
                </h1>

                <p className="text-blue-100 mt-2 text-sm">
                  Gerencie as solicitações e informações da sua instituição.
                </p>
              </div>

              <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center">
                <FiHome size={28} />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Solicitações</p>
                  <h3 className="text-2xl font-bold text-gray-800 mt-2">0</h3>
                </div>

                <div className="w-11 h-11 rounded-lg bg-blue-50 text-[#082d56] flex items-center justify-center">
                  <FiClipboard size={21} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pendentes</p>
                  <h3 className="text-2xl font-bold text-gray-800 mt-2">0</h3>
                </div>

                <div className="w-11 h-11 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center">
                  <FiClipboard size={21} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Aprovadas</p>
                  <h3 className="text-2xl font-bold text-gray-800 mt-2">0</h3>
                </div>

                <div className="w-11 h-11 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                  <FiClipboard size={21} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Status</p>

                  <h3 className="text-lg font-bold text-gray-800 mt-2">
                    {instituicao?.status_instituicao || "Não informado"}
                  </h3>
                </div>

                <div className="w-11 h-11 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                  <FiHome size={21} />
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-5 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">
                  Solicitações recentes
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Acompanhe as solicitações realizadas pela instituição.
                </p>
              </div>

              <div className="p-5">
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-4">
                    <FiClipboard size={25} />
                  </div>

                  <h3 className="font-medium text-gray-700">
                    Nenhuma solicitação encontrada
                  </h3>

                  <p className="text-sm text-gray-500 mt-1">
                    As solicitações da instituição aparecerão aqui.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-5 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">
                  Dados da instituição
                </h2>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <FiUser className="text-[#082d56] mt-1" size={19} />

                  <div>
                    <p className="text-xs text-gray-500">Gestor</p>
                    <p className="text-sm font-medium text-gray-800">
                      {instituicao?.gestor || "Não informado"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FiClipboard className="text-[#082d56] mt-1" size={19} />

                  <div>
                    <p className="text-xs text-gray-500">
                      Secretaria vinculada
                    </p>
                    <p className="text-sm font-medium text-gray-800">
                      {instituicao?.secretaria_vinculada || "Não informado"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FiHome className="text-[#082d56] mt-1" size={19} />

                  <div>
                    <p className="text-xs text-gray-500">Endereço</p>
                    <p className="text-sm font-medium text-gray-800">
                      {instituicao?.logradouro
                        ? `${instituicao.logradouro}, ${instituicao.numero || "S/N"}`
                        : "Não informado"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FiBell className="text-[#082d56] mt-1" size={19} />

                  <div>
                    <p className="text-xs text-gray-500">Telefone</p>
                    <p className="text-sm font-medium text-gray-800">
                      {instituicao?.telefone || "Não informado"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
