import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import logo from "../assets/AndraRecursos.png";
import { enderecoServidor } from "../utils";

function Icone({ tipo, className = "h-5 w-5" }) {
    const desenhos = {
        painel: (
            <>
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
            </>
        ),
        instituicao: (
            <path d="m3 9 9-6 9 6H3ZM3 21h18M5 10v8m5-8v8m4-8v8m5-8v8" />
        ),
        email: (
            <>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 6 9 7 9-7" />
            </>
        ),
        senha: (
            <>
                <rect x="5" y="10" width="14" height="11" rx="2" />
                <path d="M8 10V6a4 4 0 0 1 8 0v4" />
            </>
        ),
        olho: (
            <>
                <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
            </>
        ),
        ocultar: (
            <>
                <path d="m3 3 18 18M10 5h2c6 0 10 7 10 7a20 20 0 0 1-3 4M6 6c-3 2-4 6-4 6s4 7 10 7a12 12 0 0 0 5-1" />
            </>
        ),
        voltar: <path d="M20 12H4m6-6-6 6 6 6" />,
        avancar: <path d="M4 12h16m-6-6 6 6-6 6" />,
        verificar: <path d="m5 12 4 4L19 6" />,
        usuario: (
            <>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
            </>
        ),
        menu: <path d="M4 6h16M4 12h16M4 18h16" />,
        fechar: <path d="m6 6 12 12M18 6 6 18" />,
    };

    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            {desenhos[tipo]}
        </svg>
    );
}

function Campo({ label, icone, className = "", ...props }) {
    return (
        <div className={`space-y-2 ${className}`}>
            <label
                htmlFor={props.name}
                className="block text-sm font-semibold"
            >
                {label}
                {props.required && (
                    <span className="ml-1 text-red-600">*</span>
                )}
            </label>

            <div className="flex items-center gap-3 rounded-md border border-gray-300 bg-white px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
                {icone && (
                    <Icone
                        tipo={icone}
                        className="h-5 w-5 shrink-0 text-[#06458f]"
                    />
                )}

                <input
                    {...props}
                    id={props.name}
                    className="min-w-0 w-full bg-transparent py-3 text-base outline-none placeholder:text-gray-400"
                />
            </div>
        </div>
    );
}

const dadosIniciais = {
    nome: "",
    email_institucional: "",
    senha: "",
    cep: "",
    telefone: "",
    horario_funcionamento: "",
    status_instituicao: "",
    gestor: "",
    secretaria_vinculada: "",
    numero: "",
    logradouro: "",
    bairro: "",
};

const camposIdentificacao = [
    {
        name: "nome",
        label: "Nome da Instituição",
        icone: "instituicao",
        required: true,
        largo: true,
    },
    { name: "gestor", label: "Gestor", icone: "usuario" },
    { name: "secretaria_vinculada", label: "Secretaria Vinculada" },
    { name: "telefone", label: "Telefone", type: "tel" },
    {
        name: "horario_funcionamento",
        label: "Horário de Funcionamento",
        placeholder: "Ex.: 07:00 às 17:00",
    },
    { name: "cep", label: "CEP", inputMode: "numeric" },
    { name: "logradouro", label: "Logradouro" },
    { name: "numero", label: "Número" },
    { name: "bairro", label: "Bairro" },
];

export default function CadastrarInstADM() {
    const navigate = useNavigate();

    const [etapa, setEtapa] = useState(1);
    const [dados, setDados] = useState(dadosIniciais);
    const [verSenha, setVerSenha] = useState(false);
    const [menuAberto, setMenuAberto] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState(false);

    function alterarCampo(e) {
        const { name, value } = e.target;

        setDados((anteriores) => ({
            ...anteriores,
            [name]: value,
        }));
    }

    function sair() {
        localStorage.removeItem("@AndraRecursos:token");
        localStorage.removeItem("@AndraRecursos:usuario");
        localStorage.removeItem("@AndraRecursos:lembrar");
        navigate("/");
    }

    async function enviarFormulario(e) {
        e.preventDefault();

        if (salvando) return;

        setErro("");

        if (etapa < 3) {
            setEtapa((atual) => atual + 1);
            return;
        }

        const token = localStorage.getItem("@AndraRecursos:token");

        if (!token) {
            setErro("Faça login novamente para cadastrar a instituição.");
            return;
        }

        setSalvando(true);

        try {
            // Remove espaços extras dos campos, preservando a senha.
            const corpo = Object.fromEntries(
                Object.entries(dados).map(([campo, valor]) => [
                    campo,
                    campo === "senha" ? valor : valor.trim(),
                ])
            );

            const resposta = await fetch(
                `${enderecoServidor}/instituicoes`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(corpo),
                }
            );

            // A API pode retornar uma string ou um objeto JSON.
            const texto = await resposta.text();
            let retorno = null;

            try {
                retorno = texto ? JSON.parse(texto) : null;
            } catch {
                retorno = null;
            }

            if (!resposta.ok) {
                const mensagem =
                    resposta.status === 401
                        ? "Sua sessão expirou. Faça login novamente."
                        : resposta.status === 403
                            ? "Você não tem permissão para cadastrar instituições."
                            : typeof retorno === "string"
                                ? retorno
                                : retorno?.message ||
                                retorno?.error ||
                                `Não foi possível cadastrar. Erro ${resposta.status}.`;

                throw new Error(mensagem);
            }

            setDados((anteriores) => ({
                ...anteriores,
                senha: "",
            }));

            setSucesso(true);
        } catch (error) {
            setErro(
                error instanceof TypeError
                    ? "Não foi possível conectar à API. Confira sua conexão e tente novamente."
                    : error.message
            );
        } finally {
            setSalvando(false);
        }
    }

    const classeBotao =
        "flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50";

    const resumo = [
        ["Instituição", dados.nome],
        ["Gestor", dados.gestor],
        ["Secretaria Vinculada", dados.secretaria_vinculada],
        ["Telefone", dados.telefone],
        ["Horário de Funcionamento", dados.horario_funcionamento],
        ["CEP", dados.cep],
        ["Logradouro", dados.logradouro],
        ["Número", dados.numero],
        ["Bairro", dados.bairro],
        ["E-mail de Login", dados.email_institucional],
        ["Status", dados.status_instituicao],
        ["Permissões", "Institucional"],
    ];

    return (
        <div className="min-h-screen bg-[#e9e9e9] font-sans text-gray-800 lg:flex">
            {/* Menu lateral */}
            <aside className="flex w-full flex-col bg-[#0c2e55] text-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0">
                <div className="flex items-center justify-between gap-3 px-4 py-6">
                    <div className="flex min-w-0 items-center gap-2">
                        <img
                            src={logo}
                            alt="AndraRecursos"
                            className="h-16 w-16 shrink-0 object-contain"
                        />

                        <div>
                            <h2 className="text-lg font-bold">AndraRecursos</h2>
                            <p className="text-xs text-blue-200">
                                Gestão Administrativa
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
                        aria-expanded={menuAberto}
                        aria-controls="menu-cadastro"
                        onClick={() => setMenuAberto((atual) => !atual)}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-white/10 lg:hidden"
                    >
                        <Icone tipo={menuAberto ? "fechar" : "menu"} />
                    </button>
                </div>

                <nav
                    id="menu-cadastro"
                    aria-label="Menu administrativo"
                    className={`${menuAberto ? "block" : "hidden"} space-y-2 px-3 pb-6 lg:block`}
                >
                    <Link
                        to="/principal-adm"
                        className="flex min-h-12 items-center gap-3 rounded-md px-4 py-3 font-semibold hover:bg-white/10"
                    >
                        <Icone tipo="painel" />
                        Dashboard
                    </Link>

                    <Link
                        to="/cadastrar-instituicao"
                        aria-current="page"
                        className="flex min-h-12 items-center gap-3 rounded-md border-l-4 border-white bg-[#1958ad] px-3 py-3 font-semibold"
                    >
                        <Icone tipo="instituicao" />
                        Cadastrar Instituição
                    </Link>
                </nav>
            </aside>

            <div className="min-w-0 flex-1">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-300 bg-[#f8f8f8] px-4 py-4 shadow-sm sm:px-6">
                    <h1 className="text-base font-bold text-[#2168b8] sm:text-lg">
                        Cadastrar Nova Instituição
                    </h1>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-[#06458f]">
                            <Icone tipo="usuario" />

                            <div className="hidden text-xs sm:block">
                                <span className="block">Área</span>
                                <span className="font-semibold">Administrador</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={sair}
                            disabled={salvando}
                            className="min-h-11 rounded px-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                            Sair
                        </button>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
                    {sucesso ? (
                        <section
                            role="status"
                            className="rounded-md border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-10"
                        >
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
                                <Icone tipo="verificar" className="h-8 w-8" />
                            </div>

                            <h2 className="mt-4 text-xl font-bold text-[#06458f]">
                                Instituição cadastrada com sucesso!
                            </h2>

                            <p className="mt-2 text-sm text-gray-500">
                                Os dados foram salvos.
                            </p>

                            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDados({ ...dadosIniciais });
                                        setEtapa(1);
                                        setErro("");
                                        setSucesso(false);
                                        setVerSenha(false);
                                    }}
                                    className={`${classeBotao} bg-[#06458f] text-white hover:bg-[#03336c]`}
                                >
                                    Cadastrar Outra Instituição
                                </button>

                                <Link
                                    to="/principal-adm"
                                    className={`${classeBotao} border border-gray-300 text-[#06458f] hover:bg-gray-50`}
                                >
                                    Voltar ao Dashboard
                                </Link>
                            </div>
                        </section>
                    ) : (
                        <form onSubmit={enviarFormulario} aria-busy={salvando}>
                            <section className="rounded-md border border-gray-300 bg-white p-4 shadow-md sm:p-6">
                                {/* Indicador das etapas */}
                                <ol
                                    aria-label="Etapas do cadastro"
                                    className="mb-7 flex items-start"
                                >
                                    {["Identificação", "Acesso", "Confirmação"].map(
                                        (titulo, indice) => {
                                            const numero = indice + 1;

                                            return (
                                                <li
                                                    key={titulo}
                                                    aria-current={
                                                        etapa === numero ? "step" : undefined
                                                    }
                                                    className="relative flex flex-1 flex-col items-center"
                                                >
                                                    {indice < 2 && (
                                                        <span
                                                            aria-hidden="true"
                                                            className={`absolute left-1/2 top-5 h-1 w-full ${etapa > numero
                                                                    ? "bg-[#06458f]"
                                                                    : "bg-gray-300"
                                                                }`}
                                                        />
                                                    )}

                                                    <span
                                                        className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-xl text-xl font-bold sm:h-11 sm:w-11 ${etapa >= numero
                                                                ? "bg-[#06458f] text-white"
                                                                : "bg-gray-200 text-gray-600"
                                                            }`}
                                                    >
                                                        {numero}
                                                    </span>

                                                    <span className="mt-2 text-center text-[10px] font-semibold text-[#06458f] sm:text-xs">
                                                        {titulo}
                                                    </span>
                                                </li>
                                            );
                                        }
                                    )}
                                </ol>

                                <h2 className="mb-5 text-xl font-bold text-[#06458f]">
                                    {etapa === 1
                                        ? "Identificação da Instituição"
                                        : etapa === 2
                                            ? "Acesso e Permissões"
                                            : "Confirmação do Cadastro"}
                                </h2>

                                {/* Identificação */}
                                {etapa === 1 && (
                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                        {camposIdentificacao.map(
                                            ({ largo, ...campo }) => (
                                                <Campo
                                                    key={campo.name}
                                                    {...campo}
                                                    value={dados[campo.name]}
                                                    onChange={alterarCampo}
                                                    className={largo ? "sm:col-span-2" : ""}
                                                />
                                            )
                                        )}
                                    </div>
                                )}

                                {/* Acesso */}
                                {etapa === 2 && (
                                    <div className="space-y-5">
                                        <Campo
                                            label="Instituição"
                                            name="instituicao_visualizacao"
                                            icone="instituicao"
                                            value={dados.nome}
                                            readOnly
                                        />

                                        <Campo
                                            label="E-mail de Login"
                                            name="email_institucional"
                                            icone="email"
                                            type="email"
                                            autoComplete="off"
                                            placeholder="instituicao@email.com"
                                            value={dados.email_institucional}
                                            onChange={alterarCampo}
                                            required
                                        />

                                        <div className="space-y-2">
                                            <label
                                                htmlFor="senha"
                                                className="block text-sm font-semibold"
                                            >
                                                Senha
                                                <span className="ml-1 text-red-600">*</span>
                                            </label>

                                            <div className="flex items-center gap-3 rounded-md border border-gray-300 px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
                                                <Icone
                                                    tipo="senha"
                                                    className="h-5 w-5 shrink-0 text-[#06458f]"
                                                />

                                                <input
                                                    id="senha"
                                                    name="senha"
                                                    type={verSenha ? "text" : "password"}
                                                    autoComplete="new-password"
                                                    placeholder="Digite a senha inicial"
                                                    value={dados.senha}
                                                    onChange={alterarCampo}
                                                    required
                                                    className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none"
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setVerSenha((atual) => !atual)
                                                    }
                                                    aria-label={
                                                        verSenha ? "Ocultar senha" : "Mostrar senha"
                                                    }
                                                    aria-pressed={verSenha}
                                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-[#06458f] hover:bg-blue-50"
                                                >
                                                    <Icone tipo={verSenha ? "ocultar" : "olho"} />
                                                </button>
                                            </div>

                                            <p className="text-xs text-gray-500">
                                                Senha inicial da instituição.
                                            </p>
                                        </div>

                                        <Campo
                                            label="Status da Instituição"
                                            name="status_instituicao"
                                            value={dados.status_instituicao}
                                            onChange={alterarCampo}
                                            required
                                        />

                                        <div className="space-y-2">
                                            <label
                                                htmlFor="permissoes"
                                                className="block text-sm font-semibold"
                                            >
                                                Permissões
                                            </label>

                                            <select
                                                id="permissoes"
                                                disabled
                                                className="min-h-12 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-700"
                                            >
                                                <option>
                                                    Institucional (acesso a solicitações)
                                                </option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* Confirmação */}
                                {etapa === 3 && (
                                    <>
                                        <p className="mb-5 text-sm text-gray-500">
                                            Confira os dados antes de finalizar.
                                        </p>

                                        <dl className="grid grid-cols-1 gap-5 rounded-md border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 sm:p-5">
                                            {resumo.map(([titulo, valor]) => (
                                                <div key={titulo} className="min-w-0">
                                                    <dt className="text-xs font-semibold text-gray-500">
                                                        {titulo}
                                                    </dt>

                                                    <dd className="mt-1 break-words text-sm font-medium">
                                                        {valor || "Não informado"}
                                                    </dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </>
                                )}

                                {erro && (
                                    <p
                                        role="alert"
                                        className="mt-5 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700"
                                    >
                                        {erro}
                                    </p>
                                )}
                            </section>

                            {/* Ações */}
                            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <button
                                    type="button"
                                    disabled={salvando}
                                    onClick={() => {
                                        setErro("");

                                        if (etapa === 1) {
                                            navigate("/principal-adm");
                                        } else {
                                            setEtapa((atual) => atual - 1);
                                        }
                                    }}
                                    className={`${classeBotao} border border-[#4776ad] bg-[#adc2df] text-[#06458f] hover:bg-[#9bb6d9]`}
                                >
                                    <Icone tipo="voltar" />
                                    Voltar
                                </button>

                                <div className="flex flex-col gap-3 sm:ml-auto sm:flex-row">
                                    <button
                                        type="submit"
                                        disabled={salvando}
                                        className={`${classeBotao} bg-[#06458f] text-white hover:bg-[#03336c]`}
                                    >
                                        {salvando
                                            ? "Cadastrando..."
                                            : etapa === 3
                                                ? "Finalizar Cadastro"
                                                : "Continuar"}

                                        <Icone
                                            tipo={etapa === 3 ? "verificar" : "avancar"}
                                        />
                                    </button>

                                    <button
                                        type="button"
                                        disabled={salvando}
                                        onClick={() => navigate("/principal-adm")}
                                        className={`${classeBotao} bg-[#88a8d0] text-[#06458f] hover:bg-[#779bc9]`}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </main>
            </div>
        </div>
    );
}