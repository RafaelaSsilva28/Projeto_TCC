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

const LIMITE_ARQUIVO = 10 * 1024 * 1024;
const TIPOS_ACEITOS = ["application/pdf", "image/jpeg", "image/png"];
const etapas = ["Informações Básicas", "Descrição e Anexos", "Revisão"];

export default function SolicitacoesInst() {
  const navigate = useNavigate();
  const inputArquivo = useRef(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [etapa, setEtapa] = useState(1);
  const [dados, setDados] = useState({
    titulo: "",
    setor: "",
    prioridade: "Média",
    descricao: "",
  });

  const [arquivos, setArquivos] = useState([]);
  const [erro, setErro] = useState("");

  function atualizarCampo(evento) {
    const { name, value } = evento.target;

    setDados((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  }

  function adicionarArquivos(evento) {
    const selecionados = Array.from(evento.target.files ?? []);
    const validos = [];
    const erros = [];

    for (const arquivo of selecionados) {
      if (!TIPOS_ACEITOS.includes(arquivo.type)) {
        erros.push(`${arquivo.name}: formato não permitido.`);
        continue;
      }

      if (arquivo.size > LIMITE_ARQUIVO) {
        erros.push(`${arquivo.name}: arquivo maior que 10 MB.`);
        continue;
      }

      if (
        arquivos.some(
          (existente) =>
            existente.name === arquivo.name && existente.size === arquivo.size,
        ) ||
        validos.some(
          (existente) =>
            existente.name === arquivo.name && existente.size === arquivo.size,
        )
      ) {
        continue;
      }

      validos.push(arquivo);
    }

    setArquivos((anteriores) => [...anteriores, ...validos]);
    setErro(erros.join(" "));

    // Permite selecionar novamente o mesmo arquivo.
    evento.target.value = "";
  }

  function removerArquivo(indice) {
    setArquivos((anteriores) => anteriores.filter((_, i) => i !== indice));
  }

  function avancar() {
    setErro("");

    if (etapa === 1) {
      if (!dados.titulo.trim() || !dados.setor.trim()) {
        setErro("Preencha o título e o setor da solicitação.");
        return;
      }
    }

    if (etapa === 2 && !dados.descricao.trim()) {
      setErro("Informe a descrição da solicitação.");
      return;
    }

    setEtapa((anterior) => Math.min(3, anterior + 1));
  }

  function voltar() {
    setErro("");

    if (etapa > 1) {
      setEtapa((anterior) => anterior - 1);
    } else {
      navigate("/principal-inst");
    }
  }

  function enviarSolicitacao() {
    setErro(
      "O formulário está pronto, mas ainda precisamos conectar o envio ao endpoint de criação de solicitações da sua API.",
    );
  }

  function formatarTamanho(bytes) {
    return bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${(bytes / 1024).toFixed(0)} KB`;
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* FUNDO DO MENU MOBILE */}
      {menuAberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMenuAberto(false)}
        />
      )}
      {/* MENU LATERAL INSTITUCIONAL */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-64 shrink-0 transform bg-[#082d56] text-white transition-transform duration-300 lg:sticky lg:translate-x-0 ${menuAberto ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
      >
        {/* CABEÇALHO DO MENU */}
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div>
            <h1 className="text-xl font-bold">AndraRecursos</h1>
            <p className="mt-1 text-xs text-blue-200">Área da Instituição</p>
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

        {/* NAVEGAÇÃO */}
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
            onClick={() => {
              setMenuAberto(false);
              navigate("/solicitacoes-inst");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-blue-100 transition hover:bg-white/10"
          >
            <FiClipboard size={19} />
            <span>Solicitações</span>
          </button>

          <button
            type="button"
            aria-current="page"
            onClick={() => setMenuAberto(false)}
            className="flex w-full items-center gap-3 rounded-lg bg-white/10 px-4 py-3 text-white"
          >
            <FiClock size={19} />
            <span>Histórico Solicitações</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuAberto(false);
              navigate("/notificacoes-inst");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-blue-100 transition hover:bg-white/10"
          >
            <FiBell size={19} />
            <span>Notificações</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuAberto(false);
              navigate("/configuracoes-inst");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-blue-100 transition hover:bg-white/10"
          >
            <FiSettings size={19} />
            <span>Configurações</span>
          </button>
        </nav>

        {/* BOTÃO SAIR */}
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
      {/* Barra de etapas */}
      <section className="mb-6 rounded-lg border border-gray-200 bg-white px-4 py-5 sm:px-8">
        <div className="relative grid grid-cols-3">
          <div className="absolute left-[16.66%] right-[16.66%] top-4 h-[3px] bg-gray-300" />

          <div
            className="absolute left-[16.66%] top-4 h-[3px] bg-[#1755b0] transition-all"
            style={{
              width: `${((etapa - 1) / 2) * 66.66}%`,
            }}
          />

          {etapas.map((nome, indice) => {
            const numero = indice + 1;
            const ativo = numero <= etapa;

            return (
              <div
                key={nome}
                className="relative z-10 flex flex-col items-center gap-1"
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl font-bold ${ativo
                      ? "bg-[#08489b] text-white"
                      : "bg-gray-200 text-gray-600"
                    }`}
                >
                  {numero < etapa ? <FiCheckCircle size={18} /> : numero}
                </div>

                <span
                  className={`text-center text-[10px] font-semibold sm:text-xs ${ativo ? "text-[#08489b]" : "text-gray-500"
                    }`}
                >
                  {nome}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Formulário */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-7">
        {etapa === 1 && (
          <>
            <h1 className="text-xl font-bold text-gray-900">
              Informações Básicas
            </h1>

            <p className="mb-6 mt-1 text-sm text-gray-500">
              Informe os dados iniciais do recurso solicitado.
            </p>

            <div className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Título da Solicitação
                  <span className="text-red-600">*</span>
                </label>

                <input
                  name="titulo"
                  value={dados.titulo}
                  onChange={atualizarCampo}
                  maxLength={150}
                  placeholder="Informe o título da solicitação"
                  className="w-full border border-gray-300 p-3 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Setor responsável
                  <span className="text-red-600">*</span>
                </label>

                <input
                  name="setor"
                  value={dados.setor}
                  onChange={atualizarCampo}
                  placeholder="Informe o setor"
                  className="w-full border border-gray-300 p-3 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Prioridade
                </label>

                <select
                  name="prioridade"
                  value={dados.prioridade}
                  onChange={atualizarCampo}
                  className="w-full border border-gray-300 bg-white p-3 text-sm outline-none focus:border-blue-600"
                >
                  <option>Baixa</option>
                  <option>Média</option>
                  <option>Alta</option>
                  <option>Urgente</option>
                </select>
              </div>
            </div>
          </>
        )}

        {etapa === 2 && (
          <>
            <h1 className="text-xl font-bold text-gray-900">
              Detalhes da Solicitação
            </h1>

            <p className="mb-4 mt-1 text-sm text-gray-500">
              Forneça uma descrição detalhada do recurso solicitado e anexe os
              documentos comprobatórios necessários.
            </p>

            <label className="mb-1 block text-sm font-semibold">
              Descrição do Recurso
              <span className="text-red-600">*</span>
            </label>

            <textarea
              name="descricao"
              value={dados.descricao}
              onChange={atualizarCampo}
              maxLength={2000}
              rows={4}
              placeholder="Descreva detalhadamente a necessidade, o objetivo e o impacto de tal solicitação"
              className="w-full resize-y border border-gray-300 p-3 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />

            <p className="mb-5 text-right text-xs text-gray-400">
              {dados.descricao.length}/2000 caracteres
            </p>

            <h2 className="text-sm font-bold">Anexos e Documentação</h2>

            <p className="mb-2 text-xs text-gray-400">
              Formatos aceitos: PDF, JPG e PNG. Tamanho máximo: 10 MB por
              arquivo.
            </p>

            <input
              ref={inputArquivo}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              onChange={adicionarArquivos}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => inputArquivo.current?.click()}
              className="flex min-h-28 w-full flex-col items-center justify-center gap-2 border border-gray-500 bg-[#c5cbd5] text-[#1755b0] transition hover:bg-[#b7c2d4]"
            >
              <span className="rounded-lg bg-white p-3">
                <FiUploadCloud size={30} />
              </span>

              <span className="text-sm font-semibold">
                Clique para anexar documentos
              </span>
            </button>

            {arquivos.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {arquivos.map((arquivo, indice) => (
                  <div
                    key={`${arquivo.name}-${arquivo.size}`}
                    className="flex min-w-0 items-center gap-2 border border-gray-300 p-3"
                  >
                    <FiFileText className="shrink-0 text-blue-700" size={20} />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">
                        {arquivo.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatarTamanho(arquivo.size)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removerArquivo(indice)}
                      aria-label={`Remover ${arquivo.name}`}
                      className="shrink-0 text-red-500 hover:text-red-700"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {etapa === 3 && (
          <>
            <h1 className="text-xl font-bold text-gray-900">
              Revisão da Solicitação
            </h1>

            <p className="mb-6 mt-1 text-sm text-gray-500">
              Confira as informações antes de enviar.
            </p>

            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-3">
                <p className="text-xs text-gray-500">Título</p>
                <p className="font-semibold">{dados.titulo}</p>
              </div>

              <div className="border-b border-gray-200 pb-3">
                <p className="text-xs text-gray-500">Setor</p>
                <p className="font-semibold">{dados.setor}</p>
              </div>

              <div className="border-b border-gray-200 pb-3">
                <p className="text-xs text-gray-500">Prioridade</p>
                <p className="font-semibold">{dados.prioridade}</p>
              </div>

              <div className="border-b border-gray-200 pb-3">
                <p className="text-xs text-gray-500">Descrição</p>
                <p className="whitespace-pre-wrap text-sm">{dados.descricao}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Documentos anexados ({arquivos.length})
                </p>

                {arquivos.length ? (
                  <ul className="mt-2 list-inside list-disc text-sm">
                    {arquivos.map((arquivo) => (
                      <li key={`${arquivo.name}-${arquivo.size}`}>
                        {arquivo.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-gray-600">
                    Nenhum documento anexado.
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {erro && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2 border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <FiAlertCircle className="mt-0.5 shrink-0" />
            {erro}
          </div>
        )}

        {/* Botões */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-5">
          <button
            type="button"
            onClick={voltar}
            className="flex items-center gap-2 border border-blue-700 bg-blue-50 px-4 py-2 text-sm text-blue-800 transition hover:bg-blue-100"
          >
            <FiArrowLeft />
            Voltar
          </button>

          {etapa < 3 ? (
            <button
              type="button"
              onClick={avancar}
              className="flex items-center gap-3 bg-[#08489b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#063975]"
            >
              Próxima etapa
              <FiArrowRight />
            </button>
          ) : (
            <button
              type="button"
              onClick={enviarSolicitacao}
              className="flex items-center gap-3 bg-[#08489b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#063975]"
            >
              Enviar solicitação
              <FiArrowRight />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
