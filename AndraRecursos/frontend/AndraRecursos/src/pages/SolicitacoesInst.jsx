
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FiArrowLeft,
  FiArrowRight,
  FiUploadCloud,
  FiFileText,
  FiTrash2,
  FiCheckCircle,
  FiAlertCircle,
  FiMenu,
  FiHome,
  FiClipboard,
  FiX,
  FiClock,
  FiBell,
  FiSettings,
  FiLogOut,
} from "react-icons/fi";

export default function SolicitacoesInst() {
  const navigate = useNavigate();
  const inputArquivoRef = useRef(null);

  const [etapa, setEtapa] = useState(1);
  const [menuAberto, setMenuAberto] = useState(false);
  const [arquivos, setArquivos] = useState([]);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const [dados, setDados] = useState({
    titulo: "",
    setor: "",
    prioridade: "Media",
    descricao: "",
  });

  const etapas = [
    { numero: 1, titulo: "Informações" },
    { numero: 2, titulo: "Anexos" },
    { numero: 3, titulo: "Revisão" },
  ];

  function sair() {
    localStorage.removeItem("@AndraRecursos:token");
    localStorage.removeItem("@AndraRecursos:usuario");
    localStorage.removeItem("@AndraRecursos:lembrar");

    navigate("/", { replace: true });
  }

  function atualizarCampo(event) {
    const { name, value } = event.target;

    setDados((anterior) => ({
      ...anterior,
      [name]: value,
    }));

    setErro("");
  }

  function adicionarArquivos(event) {
    const selecionados = Array.from(event.target.files || []);
    const permitidos = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    const tamanhoMaximo = 10 * 1024 * 1024;

    for (const arquivo of selecionados) {
      if (!permitidos.includes(arquivo.type)) {
        setErro(
          `O arquivo "${arquivo.name}" não é permitido. Envie PDF, JPG ou PNG.`
        );
        event.target.value = "";
        return;
      }

      if (arquivo.size > tamanhoMaximo) {
        setErro(
          `O arquivo "${arquivo.name}" ultrapassa o limite de 10 MB.`
        );
        event.target.value = "";
        return;
      }
    }

    setArquivos((anteriores) => {
      const novos = selecionados.filter(
        (novo) =>
          !anteriores.some(
            (anterior) =>
              anterior.name === novo.name &&
              anterior.size === novo.size
          )
      );

      return [...anteriores, ...novos];
    });

    setErro("");
    event.target.value = "";
  }

  function removerArquivo(indice) {
    setArquivos((anteriores) =>
      anteriores.filter((_, i) => i !== indice)
    );

    setErro("");
  }

  function validarEtapaAtual() {
    setErro("");

    if (etapa === 1) {
      if (
        !dados.titulo.trim() ||
        !dados.setor.trim() ||
        !dados.descricao.trim()
      ) {
        setErro("Preencha todos os campos obrigatórios.");
        return false;
      }

      return true;
    }

    return true;
  }

  function avancarEtapa() {
    if (!validarEtapaAtual()) return;

    setEtapa((anterior) => Math.min(anterior + 1, 3));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function voltarEtapa() {
    setErro("");
    setEtapa((anterior) => Math.max(anterior - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function enviarSolicitacao(event) {
    event.preventDefault();
    setErro("");

    if (!validarEtapaAtual()) {
      setEtapa(1);
      return;
    }

    /*
      O formulário está estruturado, mas o envio precisa ser
      conectado ao endpoint de criação de solicitações da API.
      Ainda não há uma requisição POST nesta função.
    */

    setErro(
      "O formulário está pronto, mas o envio ainda precisa ser conectado à API."
    );
  }

  function formatarTamanho(bytes) {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const itemMenu =
    "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors";

  const itemInativo =
    "text-slate-600 hover:bg-blue-50 hover:text-blue-700";

  const itemAtivo =
    "bg-blue-50 text-blue-700";

  return (
    <div className="flex min-h-screen bg-gray-100 text-slate-800">
      {/* Fundo escuro do menu no celular */}
      {menuAberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMenuAberto(false)}
        />
      )}

      {/* Menu lateral */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          menuAberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-blue-800">
              AndraRecursos
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Área da instituição
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMenuAberto(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Fechar menu"
          >
            <FiX size={21} />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          <p className="mb-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Menu principal
          </p>

          <button
            type="button"
            onClick={() => navigate("/principal-inst")}
            className={`${itemMenu} ${itemInativo}`}
          >
            <FiHome size={19} />
            <span>Painel inicial</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/solicitacoes-inst")}
            className={`${itemMenu} ${itemAtivo}`}
          >
            <FiClipboard size={19} />
            <span>Solicitações</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/historico-inst")}
            className={`${itemMenu} ${itemInativo}`}
          >
            <FiClock size={19} />
            <span>Histórico</span>
          </button>

          <div className="!my-5 border-t border-slate-100" />

          <p className="mb-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Conta
          </p>

          <button
            type="button"
            onClick={() => navigate("/perfil-inst")}
            className={`${itemMenu} ${itemInativo}`}
          >
            <FiSettings size={19} />
            <span>Perfil da instituição</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/notificacoes-inst")}
            className={`${itemMenu} ${itemInativo}`}
          >
            <FiBell size={19} />
            <span>Notificações</span>
          </button>
        </nav>

        <div className="border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={sair}
            className={`${itemMenu} text-red-600 hover:bg-red-50`}
          >
            <FiLogOut size={19} />
            <span>Sair da conta</span>
          </button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="min-w-0 flex-1">
        {/* Cabeçalho */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuAberto(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Abrir menu"
            >
              <FiMenu size={23} />
            </button>

            <div>
              <p className="text-sm text-slate-500">
                Área da instituição
              </p>
              <h2 className="text-lg font-semibold text-slate-800">
                Nova solicitação
              </h2>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 sm:flex">
            <FiClipboard size={17} />
            Solicitações
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
          {/* Introdução */}
          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-700">
              Atendimento institucional
            </p>

            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Registre uma solicitação
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Preencha as informações abaixo para registrar sua
              solicitação. Revise os dados antes de finalizar.
            </p>
          </div>

          {/* Indicador das etapas */}
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="flex items-start">
              {etapas.map((item, indice) => {
                const concluida = etapa > item.numero;
                const atual = etapa === item.numero;

                return (
                  <div
                    key={item.numero}
                    className={`relative flex flex-1 flex-col items-center ${
                      indice < etapas.length - 1
                        ? "after:absolute after:left-1/2 after:top-5 after:h-0.5 after:w-full after:translate-x-1/2 after:bg-slate-200"
                        : ""
                    }`}
                  >
                    <div
                      className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                        concluida
                          ? "border-blue-700 bg-blue-700 text-white"
                          : atual
                            ? "border-blue-700 bg-white text-blue-700"
                            : "border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      {concluida ? (
                        <FiCheckCircle size={19} />
                      ) : (
                        item.numero
                      )}
                    </div>

                    <span
                      className={`mt-3 text-center text-xs font-medium sm:text-sm ${
                        atual || concluida
                          ? "text-blue-800"
                          : "text-slate-400"
                      }`}
                    >
                      {item.titulo}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Formulário */}
          <form
            onSubmit={enviarSolicitacao}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 px-5 py-5 sm:px-8">
              <h2 className="text-lg font-semibold text-slate-900">
                {etapa === 1
                  ? "Informações da solicitação"
                  : etapa === 2
                    ? "Documentos e anexos"
                    : "Revise sua solicitação"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {etapa === 1
                  ? "Informe os detalhes necessários para entendermos sua necessidade."
                  : etapa === 2
                    ? "Adicione documentos que possam ajudar na análise."
                    : "Confira os dados preenchidos antes de concluir."}
              </p>
            </div>

            <div className="space-y-6 p-5 sm:p-8">
              {/* Etapa 1 */}
              {etapa === 1 && (
                <>
                  <div>
                    <label
                      htmlFor="titulo"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Título da solicitação *
                    </label>

                    <input
                      id="titulo"
                      name="titulo"
                      type="text"
                      value={dados.titulo}
                      onChange={atualizarCampo}
                      placeholder="Ex.: Solicitação de materiais"
                      maxLength={150}
                      required
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="setor"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Setor responsável *
                      </label>

                      <input
                        id="setor"
                        name="setor"
                        type="text"
                        value={dados.setor}
                        onChange={atualizarCampo}
                        placeholder="Informe o setor"
                        maxLength={100}
                        required
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="prioridade"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Prioridade *
                      </label>

                      <select
                        id="prioridade"
                        name="prioridade"
                        value={dados.prioridade}
                        onChange={atualizarCampo}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="Baixa">Baixa</option>
                        <option value="Media">Média</option>
                        <option value="Alta">Alta</option>
                        <option value="Urgente">Urgente</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="descricao"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Descrição da solicitação *
                    </label>

                    <textarea
                      id="descricao"
                      name="descricao"
                      value={dados.descricao}
                      onChange={atualizarCampo}
                      placeholder="Descreva sua solicitação com o máximo de detalhes possível..."
                      rows={6}
                      maxLength={3000}
                      required
                      className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />

                    <p className="mt-2 text-right text-xs text-slate-400">
                      {dados.descricao.length}/3000 caracteres
                    </p>
                  </div>
                </>
              )}

              {/* Etapa 2 */}
              {etapa === 2 && (
                <>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      Anexar documentos
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Formatos aceitos: PDF, JPG e PNG. Tamanho máximo
                      de 10 MB por arquivo.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => inputArquivoRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center transition hover:border-blue-400 hover:bg-blue-50/50"
                  >
                    <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <FiUploadCloud size={28} />
                    </span>

                    <span className="font-semibold text-slate-800">
                      Clique para selecionar arquivos
                    </span>

                    <span className="mt-2 text-sm text-slate-500">
                      Você pode adicionar mais de um documento
                    </span>
                  </button>

                  <input
                    ref={inputArquivoRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    multiple
                    onChange={adicionarArquivos}
                    className="hidden"
                  />

                  {arquivos.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-700">
                        Arquivos selecionados ({arquivos.length})
                      </h3>

                      {arquivos.map((arquivo, indice) => (
                        <div
                          key={`${arquivo.name}-${arquivo.size}-${indice}`}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                            <FiFileText size={21} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {arquivo.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {formatarTamanho(arquivo.size)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removerArquivo(indice)}
                            aria-label={`Remover ${arquivo.name}`}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-slate-500">
                    Os anexos são opcionais. Você pode continuar sem
                    adicionar arquivos.
                  </p>
                </>
              )}

              {/* Etapa 3 */}
              {etapa === 3 && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <div className="flex gap-3">
                      <FiCheckCircle
                        className="mt-0.5 shrink-0 text-blue-700"
                        size={20}
                      />

                      <div>
                        <p className="font-semibold text-blue-900">
                          Confira antes de finalizar
                        </p>

                        <p className="mt-1 text-sm leading-6 text-blue-800">
                          Verifique se as informações estão corretas.
                          Você pode voltar às etapas anteriores para
                          fazer alterações.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Título
                      </p>
                      <p className="mt-1 break-words font-medium text-slate-800">
                        {dados.titulo}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Setor responsável
                        </p>
                        <p className="mt-1 font-medium text-slate-800">
                          {dados.setor}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Prioridade
                        </p>
                        <p className="mt-1 font-medium text-slate-800">
                          {dados.prioridade === "Media"
                            ? "Média"
                            : dados.prioridade}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Descrição
                      </p>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                        {dados.descricao}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Anexos ({arquivos.length})
                      </p>

                      {arquivos.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-500">
                          Nenhum arquivo anexado.
                        </p>
                      ) : (
                        <ul className="mt-2 space-y-2">
                          {arquivos.map((arquivo, indice) => (
                            <li
                              key={`${arquivo.name}-${arquivo.size}-${indice}`}
                              className="flex items-center gap-2 text-sm text-slate-700"
                            >
                              <FiFileText
                                className="shrink-0 text-blue-700"
                                size={17}
                              />
                              <span className="break-all">
                                {arquivo.name}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Mensagem de erro */}
              {erro && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  <FiAlertCircle
                    className="mt-0.5 shrink-0"
                    size={19}
                  />
                  <p>{erro}</p>
                </div>
              )}
            </div>

            {/* Botões de navegação */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <button
                type="button"
                onClick={
                  etapa === 1
                    ? () => navigate("/principal-inst")
                    : voltarEtapa
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <FiArrowLeft size={17} />
                {etapa === 1 ? "Voltar ao painel" : "Etapa anterior"}
              </button>

              {etapa < 3 ? (
                <button
                  type="button"
                  onClick={avancarEtapa}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  Continuar
                  <FiArrowRight size={17} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={enviando}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FiCheckCircle size={18} />
                  {enviando ? "Enviando..." : "Finalizar solicitação"}
                </button>
              )}
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            AndraRecursos · Área institucional
          </p>
        </main>
      </div>
    </div>
  );
}