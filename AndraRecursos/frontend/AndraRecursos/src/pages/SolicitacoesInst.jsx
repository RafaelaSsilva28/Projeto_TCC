import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiMenu,
  FiX,
  FiHome,
  FiClipboard,
  FiClock,
  FiBell,
  FiSettings,
  FiLogOut,
  FiArrowLeft,
  FiArrowRight,
  FiUploadCloud,
  FiFileText,
  FiTrash2,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";

const etapas = [
  "Informações",
  "Detalhes",
  "Revisão",
];

export default function SolicitacoesInst() {
  const navigate = useNavigate();
  const inputArquivo = useRef(null);

  const [menuAberto, setMenuAberto] = useState(false);
  const [etapa, setEtapa] = useState(1);
  const [arquivos, setArquivos] = useState([]);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [formulario, setFormulario] = useState({
    titulo: "",
    setor: "",
    prioridade: "Média",
    descricao: "",
  });

  function sair() {
    localStorage.removeItem("@AndraRecursos:token");
    localStorage.removeItem("@AndraRecursos:instituicao");
    navigate("/");
  }

  function atualizarCampo(event) {
    const { name, value } = event.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }));

    setErro("");
    setSucesso("");
  }

  function adicionarArquivos(event) {
    const selecionados = Array.from(event.target.files || []);
    const permitidos = ["application/pdf", "image/jpeg", "image/png"];
    const tamanhoMaximo = 10 * 1024 * 1024;

    for (const arquivo of selecionados) {
      if (!permitidos.includes(arquivo.type)) {
        setErro("Envie somente arquivos PDF, JPG ou PNG.");
        event.target.value = "";
        return;
      }

      if (arquivo.size > tamanhoMaximo) {
        setErro(`O arquivo "${arquivo.name}" ultrapassa o limite de 10 MB.`);
        event.target.value = "";
        return;
      }
    }

    setArquivos((anteriores) => {
      const novos = selecionados.filter(
        (novo) =>
          !anteriores.some(
            (existente) =>
              existente.name === novo.name &&
              existente.size === novo.size
          )
      );

      return [...anteriores, ...novos];
    });

    setErro("");
    setSucesso("");
    event.target.value = "";
  }

  function removerArquivo(indice) {
    setArquivos((anteriores) =>
      anteriores.filter((_, i) => i !== indice)
    );
  }

  function validarEtapaAtual() {
    if (etapa === 1) {
      if (!formulario.titulo.trim() || !formulario.setor) {
        setErro("Preencha o título e selecione o setor responsável.");
        return false;
      }
    }

    if (etapa === 2) {
      if (!formulario.descricao.trim()) {
        setErro("Descreva os detalhes da solicitação.");
        return false;
      }

      if (formulario.descricao.trim().length < 10) {
        setErro("A descrição precisa ter pelo menos 10 caracteres.");
        return false;
      }
    }

    setErro("");
    return true;
  }

  function avancarEtapa() {
    if (!validarEtapaAtual()) return;

    setEtapa((anterior) => Math.min(anterior + 1, 3));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function voltarEtapa() {
    setErro("");
    setSucesso("");
    setEtapa((anterior) => Math.max(anterior - 1, 1));
  }

  function enviarSolicitacao() {
    if (!validarEtapaAtual()) return;

    /*
      Este exemplo prepara a solicitação para revisão.
      Para gravar no banco de dados, conecte esta função
      à rota POST real da sua API.
    */

    setErro("");
    setSucesso(
      "Formulário validado! Para registrar a solicitação, conecte o envio à API."
    );
  }

  const classeInput =
    "mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#082d56] focus:ring-2 focus:ring-[#082d56]/10";

  const classeLabel =
    "block text-sm font-semibold text-gray-700";

  return (
    <div className="flex min-h-screen bg-gray-100">
      {menuAberto && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMenuAberto(false)}
        />
      )}

      {/* MENU LATERAL */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-64 shrink-0 transform bg-[#082d56] text-white transition-transform duration-300 lg:sticky ${
          menuAberto
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div>
            <h1 className="text-xl font-bold">AndraRecursos</h1>
            <p className="mt-1 text-xs text-blue-200">
              Área da Instituição
            </p>
          </div>

          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMenuAberto(false)}
            className="text-white lg:hidden"
          >
            <FiX size={22} />
          </button>
        </div>

        <nav className="space-y-2 p-4">
          <button
            type="button"
            onClick={() => {
              setMenuAberto(false);
              navigate("/principal-inst");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-blue-100 transition hover:bg-white/10"
          >
            <FiHome size={19} />
            <span>Principal</span>
          </button>

          <button
            type="button"
            onClick={() => setMenuAberto(false)}
            className="flex w-full items-center gap-3 rounded-lg bg-white/10 px-4 py-3 text-white"
          >
            <FiClipboard size={19} />
            <span>Solicitações</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/historico-inst")}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-blue-100 transition hover:bg-white/10"
          >
            <FiClock size={19} />
            <span>Histórico Solicitações</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/notificacoes-inst")}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-blue-100 transition hover:bg-white/10"
          >
            <FiBell size={19} />
            <span>Notificações</span>
          </button>

          <button
            type="button"
            onClick={() => setErro("A página de configurações ainda não está conectada.")}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-blue-100 transition hover:bg-white/10"
          >
            <FiSettings size={19} />
            <span>Configurações</span>
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <button
            type="button"
            onClick={sair}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-blue-100 transition hover:bg-red-500/20 hover:text-white"
          >
            <FiLogOut size={19} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="min-w-0 flex-1">
        <header className="flex h-20 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Abrir menu"
              onClick={() => setMenuAberto(true)}
              className="text-gray-600 lg:hidden"
            >
              <FiMenu size={24} />
            </button>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 sm:text-xl">
                Solicitações
              </h2>
              <p className="text-xs text-gray-500 sm:text-sm">
                Registre uma nova solicitação da instituição
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Notificações"
            onClick={() => navigate("/notificacoes-inst")}
            className="relative text-gray-600 transition hover:text-[#082d56]"
          >
            <FiBell size={22} />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
          </button>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <div className="space-y-7">
            {/* TÍTULO */}
            <section>
              <h1 className="text-2xl font-bold text-[#082d56] sm:text-3xl">
                Nova solicitação
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Preencha as informações abaixo para registrar sua solicitação.
              </p>
            </section>

            {/* INDICADOR DE ETAPAS */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start">
                {etapas.map((nome, indice) => {
                  const numero = indice + 1;
                  const concluida = numero < etapa;
                  const atual = numero === etapa;

                  return (
                    <div
                      key={nome}
                      className="relative flex flex-1 flex-col items-center"
                    >
                      {indice > 0 && (
                        <div
                          className={`absolute right-1/2 top-5 h-0.5 w-full ${
                            numero <= etapa
                              ? "bg-[#082d56]"
                              : "bg-gray-200"
                          }`}
                        />
                      )}

                      <div
                        className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                          concluida || atual
                            ? "border-[#082d56] bg-[#082d56] text-white"
                            : "border-gray-300 bg-white text-gray-500"
                        }`}
                      >
                        {concluida ? (
                          <FiCheckCircle size={19} />
                        ) : (
                          numero
                        )}
                      </div>

                      <span
                        className={`mt-3 text-center text-xs sm:text-sm ${
                          atual
                            ? "font-semibold text-[#082d56]"
                            : "text-gray-500"
                        }`}
                      >
                        {nome}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* FORMULÁRIO */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
              <div className="mb-6 border-b border-gray-100 pb-5">
                <p className="text-sm font-medium text-[#082d56]">
                  Etapa {etapa} de 3
                </p>

                <h2 className="mt-2 text-xl font-bold text-gray-800">
                  {etapa === 1 && "Informações da solicitação"}
                  {etapa === 2 && "Detalhes da solicitação"}
                  {etapa === 3 && "Revise suas informações"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {etapa === 1 &&
                    "Informe o assunto e o setor responsável."}
                  {etapa === 2 &&
                    "Explique o que precisa e anexe documentos, se necessário."}
                  {etapa === 3 &&
                    "Confira os dados antes de concluir."}
                </p>
              </div>

              {erro && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  <FiAlertCircle className="mt-0.5 shrink-0" size={18} />
                  <span>{erro}</span>
                </div>
              )}

              {sucesso && (
                <div
                  role="status"
                  className="mb-5 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-[#082d56]"
                >
                  <FiCheckCircle className="mt-0.5 shrink-0" size={18} />
                  <span>{sucesso}</span>
                </div>
              )}

              {/* ETAPA 1 */}
              {etapa === 1 && (
                <div className="space-y-5">
                  <div>
                    <label htmlFor="titulo" className={classeLabel}>
                      Título da solicitação *
                    </label>
                    <input
                      id="titulo"
                      name="titulo"
                      value={formulario.titulo}
                      onChange={atualizarCampo}
                      placeholder="Ex.: Solicitação de manutenção"
                      maxLength={150}
                      className={classeInput}
                    />
                  </div>

                  <div>
                    <label htmlFor="setor" className={classeLabel}>
                      Setor responsável *
                    </label>
                    <select
                      id="setor"
                      name="setor"
                      value={formulario.setor}
                      onChange={atualizarCampo}
                      className={classeInput}
                    >
                      <option value="">Selecione um setor</option>
                      <option value="Administrativo">Administrativo</option>
                      <option value="Infraestrutura">Infraestrutura</option>
                      <option value="Tecnologia">Tecnologia</option>
                      <option value="Recursos Humanos">Recursos Humanos</option>
                      <option value="Financeiro">Financeiro</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="prioridade" className={classeLabel}>
                      Prioridade
                    </label>
                    <select
                      id="prioridade"
                      name="prioridade"
                      value={formulario.prioridade}
                      onChange={atualizarCampo}
                      className={classeInput}
                    >
                      <option value="Baixa">Baixa</option>
                      <option value="Média">Média</option>
                      <option value="Alta">Alta</option>
                      <option value="Urgente">Urgente</option>
                    </select>
                    <p className="mt-2 text-xs text-gray-500">
                      Selecione a prioridade de acordo com a urgência do pedido.
                    </p>
                  </div>
                </div>
              )}

              {/* ETAPA 2 */}
              {etapa === 2 && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="descricao" className={classeLabel}>
                      Descrição *
                    </label>
                    <textarea
                      id="descricao"
                      name="descricao"
                      value={formulario.descricao}
                      onChange={atualizarCampo}
                      placeholder="Descreva a solicitação com o máximo de detalhes possível..."
                      rows={6}
                      maxLength={3000}
                      className={`${classeInput} resize-y`}
                    />
                    <p className="mt-2 text-right text-xs text-gray-400">
                      {formulario.descricao.length}/3000 caracteres
                    </p>
                  </div>

                  <div>
                    <label className={classeLabel}>
                      Documentos e imagens (opcional)
                    </label>

                    <button
                      type="button"
                      onClick={() => inputArquivo.current?.click()}
                      className="mt-2 flex w-full flex-col items-center rounded-lg border-2 border-dashed border-gray-300 px-4 py-8 text-center transition hover:border-[#082d56] hover:bg-gray-50"
                    >
                      <FiUploadCloud size={32} className="text-[#082d56]" />
                      <span className="mt-3 text-sm font-semibold text-gray-700">
                        Clique para selecionar arquivos
                      </span>
                      <span className="mt-1 text-xs text-gray-500">
                        PDF, JPG ou PNG — máximo de 10 MB por arquivo
                      </span>
                    </button>

                    <input
                      ref={inputArquivo}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      multiple
                      onChange={adicionarArquivos}
                      className="hidden"
                    />

                    {arquivos.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {arquivos.map((arquivo, indice) => (
                          <div
                            key={`${arquivo.name}-${arquivo.size}-${indice}`}
                            className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                          >
                            <FiFileText
                              size={20}
                              className="shrink-0 text-[#082d56]"
                            />

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-700">
                                {arquivo.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(arquivo.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>

                            <button
                              type="button"
                              aria-label={`Remover ${arquivo.name}`}
                              onClick={() => removerArquivo(indice)}
                              className="shrink-0 rounded-lg p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <FiTrash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ETAPA 3 */}
              {etapa === 3 && (
                <div className="space-y-5">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Título
                    </p>
                    <p className="mt-1 break-words text-sm font-medium text-gray-800">
                      {formulario.titulo}
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Setor responsável
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {formulario.setor}
                      </p>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Prioridade
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {formulario.prioridade}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Descrição
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
                      {formulario.descricao}
                    </p>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Arquivos anexados
                    </p>

                    {arquivos.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-500">
                        Nenhum arquivo anexado.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {arquivos.map((arquivo, indice) => (
                          <li
                            key={`${arquivo.name}-${arquivo.size}-${indice}`}
                            className="flex items-center gap-2 text-sm text-gray-700"
                          >
                            <FiFileText className="shrink-0 text-[#082d56]" />
                            <span className="break-all">{arquivo.name}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <p className="text-xs leading-5 text-gray-500">
                    Confira todos os dados. Ao concluir, a solicitação ainda
                    precisará ser enviada e registrada pela API do sistema.
                  </p>
                </div>
              )}

              {/* BOTÕES */}
              <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-gray-100 pt-6 sm:flex-row">
                <button
                  type="button"
                  onClick={etapa === 1 ? () => navigate("/principal-inst") : voltarEtapa}
                  className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  <FiArrowLeft size={17} />
                  {etapa === 1 ? "Cancelar" : "Voltar"}
                </button>

                {etapa < 3 ? (
                  <button
                    type="button"
                    onClick={avancarEtapa}
                    className="flex items-center justify-center gap-2 rounded-lg bg-[#082d56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#164675]"
                  >
                    Próxima etapa
                    <FiArrowRight size={17} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={enviarSolicitacao}
                    className="flex items-center justify-center gap-2 rounded-lg bg-[#082d56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#164675]"
                  >
                    <FiCheckCircle size={17} />
                    Concluir solicitação
                  </button>
                )}
              </div>
            </section>

            <p className="pb-2 text-center text-xs text-gray-400">
              AndraRecursos · Área da Instituição
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
