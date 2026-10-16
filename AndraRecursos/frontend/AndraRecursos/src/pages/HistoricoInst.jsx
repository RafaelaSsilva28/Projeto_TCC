import { useState, useEffect } from "react";
import { enderecoServidor } from "../utils";
import LayoutInstituicao from "../components/LayoutInstituicao";

function obterToken() {
  const valor = localStorage.getItem("@AndraRecursos:usuario");

  if (!valor) return null;

  try {
    const usuario = JSON.parse(valor);

    if (typeof usuario === "string") {
      return usuario;
    }

    return (
      usuario?.token ||
      usuario?.accessToken ||
      usuario?.access_token ||
      null
    );
  } catch {
    return valor;
  }
}

export default function HistoricoInst() {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");

  async function buscarHistorico() {
    try {
      setCarregando(true);
      setErro("");

      const token = obterToken();

      if (!token) {
        throw new Error(
          "Sua sessão não foi encontrada. Entre novamente na sua conta."
        );
      }

      const resposta = await fetch(
        `${enderecoServidor}/historico-instituicao`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const texto = await resposta.text();

      let dados;

      try {
        dados = texto ? JSON.parse(texto) : [];
      } catch {
        throw new Error(
          "A API retornou uma resposta inválida."
        );
      }

      if (!resposta.ok) {
        throw new Error(
          dados?.error ||
            dados?.mensagem ||
            "Não foi possível carregar o histórico."
        );
      }

      const registros = Array.isArray(dados)
        ? dados
        : dados?.historico ||
          dados?.dados ||
          dados?.registros ||
          [];

      setHistorico(registros);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
      setErro(error.message || "Erro ao carregar o histórico.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    buscarHistorico();
  }, []);

  const historicoFiltrado = historico.filter((item) => {
    const termo = busca.toLowerCase();

    return [
      item.titulo_solicitacao,
      item.descricao,
      item.status,
      item.prioridade,
      item.id_solicitacao,
      item.data_alteracao,
    ].some((valor) =>
      String(valor ?? "").toLowerCase().includes(termo)
    );
  });

  function corStatus(status) {
    switch (String(status || "").toLowerCase()) {
      case "aprovada":
        return "bg-green-100 text-green-700";
      case "recusada":
        return "bg-red-100 text-red-700";
      case "em andamento":
        return "bg-blue-100 text-blue-700";
      case "pendente":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  return (
    <LayoutInstituicao>
      <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Histórico de Solicitações
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Acompanhe as atualizações das suas solicitações.
              </p>
            </div>

            <button
              type="button"
              onClick={buscarHistorico}
              disabled={carregando}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {carregando ? "Carregando..." : "Atualizar histórico"}
            </button>
          </div>

          <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
            <label
              htmlFor="busca-historico"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Buscar no histórico
            </label>

            <input
              id="busca-historico"
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquise por título, status ou descrição..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {carregando ? (
            <div className="rounded-xl bg-white p-10 text-center shadow-sm">
              <p className="text-gray-600">
                Carregando histórico...
              </p>
            </div>
          ) : erro ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <p className="font-medium text-red-700">
                Não foi possível carregar o histórico
              </p>

              <p className="mt-2 text-sm text-red-600">
                {erro}
              </p>

              <button
                type="button"
                onClick={buscarHistorico}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Tentar novamente
              </button>
            </div>
          ) : historicoFiltrado.length === 0 ? (
            <div className="rounded-xl bg-white p-10 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800">
                Nenhum registro encontrado
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                {historico.length === 0
                  ? "Ainda não existem registros de histórico para suas solicitações."
                  : "Nenhum registro corresponde à sua pesquisa."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {historicoFiltrado.map((item, indice) => (
                <article
                  key={
                    item.id_historico ??
                    `${item.id_solicitacao}-${indice}`
                  }
                  className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">
                        {item.titulo_solicitacao ||
                          `Solicitação #${item.id_solicitacao}`}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        Solicitação nº {item.id_solicitacao}
                      </p>
                    </div>

                    {item.status && (
                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${corStatus(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <p className="text-sm leading-6 text-gray-600">
                      {item.descricao ||
                        "Nenhuma descrição informada."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
                      {item.prioridade && (
                        <p>
                          <span className="font-medium text-gray-700">
                            Prioridade:
                          </span>{" "}
                          {item.prioridade}
                        </p>
                      )}

                      {item.data_alteracao && (
                        <p>
                          <span className="font-medium text-gray-700">
                            Data:
                          </span>{" "}
                          {item.data_alteracao}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!carregando && !erro && historico.length > 0 && (
            <p className="mt-5 text-sm text-gray-500">
              {historicoFiltrado.length} registro(s) encontrado(s).
            </p>
          )}
        </div>
      </main>
    </LayoutInstituicao>
  );
}

