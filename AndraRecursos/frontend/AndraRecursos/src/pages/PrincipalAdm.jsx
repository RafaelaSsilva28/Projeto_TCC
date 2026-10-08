import { useState, useEffect } from "react";
import { enderecoServidor } from "../utils";
import IconeAdministrador from "../components/IconesAdministrador";

export default function PrincipalAdm({

  atualizarStatusSolicitacao,

}) {

  const [carregando, setCarregando] = useState(true);

  const [erro, setErro] = useState("");


  const [solicitacoes, setSolicitacoes] = useState({

    total: 0,

    aprovadas: 0,

    pendentes: 0,

    recusadas: 0,

    recentes: [],

  });


  useEffect(() => {

    let ativo = true;


    async function buscarSolicitacoes() {

      const token = localStorage.getItem("@AndraRecursos:token");


      const opcoes = {

        headers: {

          Authorization: `Bearer ${token}`,

        },

      };


      try {

        const caminhos = [

  "/dashboard/total/solicitacoes",

  "/dashboard/solicitacoes/aprovadas",

  "/dashboard/solicitacoes/pendentes",

  "/dashboard/solicitacoes/recusadas",

  "/dashboard/solicitacoes/recentes",

        ];


        const respostas = await Promise.all(

          caminhos.map((caminho) =>

            fetch(`${enderecoServidor}${caminho}`, opcoes)

          )

        );


        if (respostas.some((resposta) => !resposta.ok)) {

          throw new Error(

            "Não foi possível carregar os dados do dashboard."

          );

        }


        const [

          total,

          aprovadas,

          pendentes,

          recusadas,

          recentes,

        ] = await Promise.all(

          respostas.map((resposta) => resposta.json())

        );


        if (ativo) {

          setSolicitacoes({

            total: total.total ?? 0,

            aprovadas: aprovadas.aprovadas ?? 0,

            pendentes: pendentes.pendentes ?? 0,

            recusadas: recusadas.recusadas ?? 0,

            recentes: Array.isArray(recentes) ? recentes : [],

          });

        }

      } catch (error) {

        if (ativo) setErro(error.message);

      } finally {

        if (ativo) setCarregando(false);

      }

    }


    buscarSolicitacoes();


    return () => {

      ativo = false;

    };

  }, []);


const metricas = [

    {

      titulo: "Total de Solicitações",

      valor: solicitacoes.total,

      cor: "border-l-blue-600",

      texto: "text-blue-700",

    },

    {

      titulo: "Total Aprovadas",

      valor: solicitacoes.aprovadas,

      cor: "border-l-green-600",

      texto: "text-green-700",

    },

    {

      titulo: "Total Pendentes",

      valor: solicitacoes.pendentes,

      cor: "border-l-yellow-500",

      texto: "text-yellow-700",

    },

    {

      titulo: "Recusadas",

      valor: solicitacoes.recusadas,

      cor: "border-l-red-600",

      texto: "text-red-700",

    },

  ];


  const classeSelect =

    "min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";


  const classeCabecalhoTabela =

    "px-5 py-4 text-left text-xs font-semibold tracking-wide text-gray-500";


  const classeCelula = "px-5 py-4 text-sm text-gray-600";


  const possuiAcaoStatus =

    typeof atualizarStatusSolicitacao === "function";


  return (
    <>
          {/* Título */}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h1 className="text-2xl font-bold text-[#082d56] sm:text-3xl">

                Visão Geral

              </h1>


              <p className="mt-1 text-sm text-gray-500">

                Bem-vindo ao nosso painel de controle!

              </p>

            </div>


            <button

              type="button"

              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#082d56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#164675] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:w-auto"

            >

              <IconeAdministrador tipo="arquivo" className="h-4 w-4" />

              Exportar Relatório

            </button>

          </div>


          {erro && (

            <div

              role="alert"

              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"

            >

              {erro}

            </div>

          )}


          {/* Métricas */}

          <section

            aria-label="Resumo das solicitações"

            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"

          >

            {metricas.map((metrica) => (

              <div

                key={metrica.titulo}

                className={`min-w-0 rounded-xl border border-gray-200 border-l-4 bg-white p-5 shadow-sm ${metrica.cor}`}

              >

                <span className="block text-sm font-medium text-gray-500">

                  {metrica.titulo}

                </span>


                <span

                  className={`mt-3 block text-3xl font-bold ${metrica.texto}`}

                >

                  {carregando ? "—" : metrica.valor}

                </span>

              </div>

            ))}

          </section>


          {/* Filtros */}

          <section

            aria-label="Filtros"

            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"

          >

            <span className="mb-4 block text-sm font-semibold text-gray-700">

              Classificar por:

            </span>


            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">

              {[

                "STATUS",

                "TIPOS",

                "INSTITUIÇÃO",

                "DATA",

                "PRIORIDADE",

              ].map((filtro) => (

                <select

                  key={filtro}

                  aria-label={`Filtrar por ${filtro.toLowerCase()}`}

                  className={classeSelect}

                >

                  <option>{filtro}</option>

                </select>

              ))}


              <button

                type="button"

                className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"

              >

                Limpar

              </button>

            </div>

          </section>


          {/* Tabela */}

          <section className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

            <h2 className="border-b border-gray-200 px-5 py-5 text-lg font-semibold text-[#082d56]">

              Solicitações Recentes

            </h2>


            <div

              className="overflow-x-auto"

              tabIndex={0}

              role="region"

              aria-label="Tabela de solicitações recentes"

            >

              <table className="w-full min-w-[900px] border-collapse">

                <thead className="bg-gray-50">

                  <tr>

                    {[

                      "ID",

                      "INSTITUIÇÃO",

                      "TIPO",

                      "PRIORIDADE",

                      "STATUS",

                      "DATA",

                      "AÇÕES",

                    ].map((coluna) => (

                      <th

                        key={coluna}

                        scope="col"

                        className={classeCabecalhoTabela}

                      >

                        {coluna}

                      </th>

                    ))}

                  </tr>

                </thead>


                <tbody className="divide-y divide-gray-100">

                  {carregando ? (

                    <tr>

                      <td

                        colSpan={7}

                        className="px-5 py-10 text-center text-sm text-gray-500"

                      >

                        Carregando solicitações...

                      </td>

                    </tr>

                  ) : solicitacoes.recentes.length === 0 ? (

                    <tr>

                      <td

                        colSpan={7}

                        className="px-5 py-10 text-center text-sm text-gray-500"

                      >

                        Nenhuma solicitação encontrada.

                      </td>

                    </tr>

                  ) : (

                    solicitacoes.recentes.map((solicitacao) => {

                      const status = solicitacao.status;


                      const corStatus =

                        status === "aprovada"

                          ? "bg-green-100 text-green-700"

                          : status === "recusada"

                            ? "bg-red-100 text-red-700"

                            : "bg-yellow-100 text-yellow-800";


                      const corPrioridade =

                        solicitacao.prioridade === "Alta"

                          ? "bg-red-100 text-red-700"

                          : "bg-blue-100 text-blue-700";


                      return (

                        <tr

                          key={solicitacao.id_solicitacoes}

                          className="transition hover:bg-gray-50"

                        >

                          <td className={classeCelula}>

                            <strong className="text-gray-800">

                              {solicitacao.id_solicitacoes}

                            </strong>

                          </td>


                          <td className={classeCelula}>

                            {solicitacao.nome_instituicao}

                          </td>


                          <td className={classeCelula}>

                            {solicitacao.titulo}

                          </td>


                          <td className={classeCelula}>

                            <span

                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${corPrioridade}`}

                            >

                              {solicitacao.prioridade?.toUpperCase()}

                            </span>

                          </td>


                          <td className={classeCelula}>

                            <span

                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${corStatus}`}

                            >

                              {status}

                            </span>

                          </td>


                          <td

                            className={`${classeCelula} whitespace-nowrap`}

                          >

                            {new Date(

                              solicitacao.data_pedido

                            ).toLocaleDateString("pt-BR")}

                          </td>


                          <td className={classeCelula}>

                            <div className="flex items-center gap-2">

                              <button

                                type="button"

                                disabled={

                                  status === "aprovada" ||

                                  !possuiAcaoStatus

                                }

                                onClick={() =>

                                  atualizarStatusSolicitacao(

                                    solicitacao.id_solicitacoes,

                                    "aprovada"

                                  )

                                }

                                className="min-h-11 rounded-md bg-green-100 px-3 py-2 text-xs font-bold text-green-700 transition hover:bg-green-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-600 disabled:cursor-not-allowed disabled:opacity-40"

                              >

                                APROVAR

                              </button>


                              <button

                                type="button"

                                disabled={!possuiAcaoStatus}

                                onClick={() =>

                                  atualizarStatusSolicitacao(

                                    solicitacao.id_solicitacoes,

                                    "recusada"

                                  )

                                }

                                className="min-h-11 rounded-md bg-red-100 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-40"

                              >

                                RECUSAR

                              </button>

                            </div>

                          </td>

                        </tr>

                      );

                    })

                  )}

                </tbody>

              </table>

            </div>

          </section>

    </>
  );
}
