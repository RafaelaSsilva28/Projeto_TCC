import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { enderecoServidor } from "../utils";

const VAZIO = {
    nome: "", email_institucional: "", senha: "", cep: "", telefone: "",
    horario_funcionamento: "", status_instituicao: "ativa", gestor: "",
    secretaria_vinculada: "", numero: "", logradouro: "", bairro: "",
};

const camposInstituicao = [
    { name: "nome", label: "Instituição", full: true },
    { name: "email_institucional", label: "E-mail de Login", type: "email", full: true, placeholder: "instituicao@email.com" },
];

const etapas = ["Identificação", "Acesso", "Confirmação"];
const cssInput = "mt-1 block h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-[#082d56] outline-none transition focus:border-[#06458f] focus:ring-2 focus:ring-blue-100";
const cssBotao = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

const validoEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const preenchido = (valor) => String(valor ?? "").trim().length > 0;

function validarIdentificacao(dados) {
    const faltando = camposInstituicao.filter((campo) => !preenchido(dados[campo.name]));
    if (faltando.length) return `Preencha os campos obrigatórios: ${faltando.map((c) => c.label).join(", ")}.`;
    if (!validoEmail(dados.email_institucional)) return "Informe um e-mail de login válido.";
    return "";
}

function validarAcesso(dados, permissao) {
    if (!preenchido(dados.senha)) return "Digite a senha inicial da instituição.";
    if (dados.senha.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
    if (!preenchido(permissao)) return "Selecione a permissão de acesso.";
    return "";
}

function Campo({ label, name, full = false, type = "text", ...rest }) {
    return (
        <div className={full ? "sm:col-span-2" : ""}>
            <label htmlFor={name} className="block text-sm font-semibold text-[#082d56]">
                {label} <span className="text-red-600">*</span>
            </label>
            <input id={name} name={name} type={type} required className={cssInput} {...rest} />
        </div>
    );
}

export default function CadastrarInstADM() {
    const navigate = useNavigate();
    const [dados, setDados] = useState({ ...VAZIO });
    const [permissao, setPermissao] = useState("");
    const [etapa, setEtapa] = useState(1);
    const [erro, setErro] = useState("");
    const [salvando, setSalvando] = useState(false);
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);
    const [sucesso, setSucesso] = useState(false);
    const [nomeCadastrado, setNomeCadastrado] = useState("");

    const identificacaoCompleta = !validarIdentificacao(dados);
    const acessoCompleto = identificacaoCompleta && !validarAcesso(dados, permissao);
    // O polo azul indica campos completos; é possível voltar e editar antes do envio.
    const polosConcluidos = [identificacaoCompleta, acessoCompleto, acessoCompleto && etapa === 3];

    function irParaEtapa(numero) {
        if (salvando) return;
        if (numero === 1 || (numero === 2 && identificacaoCompleta) || (numero === 3 && acessoCompleto)) {
            setErro("");
            setEtapa(numero);
        }
    }

    function alterarCampo(evento) {
        const { name, value } = evento.target;
        setDados((anterior) => ({ ...anterior, [name]: value }));
        setErro("");
    }

    function limparCadastro() {
        setDados({ ...VAZIO });
        setPermissao("");
        setEtapa(1);
        setErro("");
        setSucesso(false);
        setNomeCadastrado("");
        setMostrarSenha(false);
        setConfirmarCancelamento(false);
    }

    function cancelarConfirmado() {
        limparCadastro();
        // Permanece nesta página com os campos limpos para um novo cadastro.
    }

    function voltar() {
        setErro("");
        if (etapa === 1) setConfirmarCancelamento(true);
        else setEtapa((anterior) => anterior - 1);
    }

    async function avancarOuCadastrar(evento) {
        evento.preventDefault();
        if (salvando) return;

        const erroIdentificacao = validarIdentificacao(dados);
        if (erroIdentificacao) {
            setErro(erroIdentificacao);
            setEtapa(1);
            return;
        }
        if (etapa === 1) {
            setErro("");
            setEtapa(2);
            return;
        }

        const erroAcesso = validarAcesso(dados, permissao);
        if (erroAcesso) {
            setErro(erroAcesso);
            setEtapa(2);
            return;
        }
        if (etapa === 2) {
            setErro("");
            setEtapa(3);
            return;
        }

        const token = localStorage.getItem("@AndraRecursos:token");
        if (!token) {
            setErro("Sua sessão não foi encontrada. Faça login novamente.");
            return;
        }

        setSalvando(true);
        setErro("");
        try {
            // Preserva o contrato original da API: permissao é uma escolha visual
            // e não é enviada, pois o endpoint original não tinha esse campo.
            const corpo = Object.fromEntries(
                Object.entries(dados).map(([campo, valor]) => [
                    campo, campo === "senha" ? valor : valor.trim(),
                ])
            );
            const resposta = await fetch(`${enderecoServidor}/instituicoes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(corpo),
            });
            const texto = await resposta.text();
            let retorno;
            try { retorno = texto ? JSON.parse(texto) : null; } catch { retorno = null; }
            if (!resposta.ok) {
                const mensagem = resposta.status === 401
                    ? "Sua sessão expirou. Entre novamente."
                    : resposta.status === 403
                        ? "Você não tem permissão para cadastrar instituições."
                        : (typeof retorno === "string" ? retorno : retorno?.message || retorno?.error)
                        || `Não foi possível cadastrar (erro ${resposta.status}).`;
                throw new Error(mensagem);
            }
            setNomeCadastrado(dados.nome.trim());
            setDados((anterior) => ({ ...anterior, senha: "" }));
            setSucesso(true);
        } catch (falha) {
            setErro(falha instanceof TypeError
                ? "Não foi possível conectar à API. Verifique sua conexão."
                : falha.message || "Não foi possível cadastrar a instituição.");
        } finally {
            setSalvando(false);
        }
    }

    const resumo = [
        ["Instituição", dados.nome],
        ["E-mail de Login", dados.email_institucional],
        ["Permissão", permissao],
        ["Status", dados.status_instituicao],
    ];

    return (
        <div className="mx-auto w-full max-w-6xl text-[#082d56]">
            <div className="mb-5">
                <h1 className="text-2xl font-bold sm:text-3xl">Cadastrar Nova Instituição</h1>
                <p className="mt-1 text-sm text-gray-500">Informe a instituição e o e-mail, configure a senha e confirme o cadastro.</p>
            </div>

            {sucesso ? (
                <section role="status" className="rounded-xl border border-green-200 bg-white p-6 text-center shadow-sm sm:p-10">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl font-bold text-green-700">✓</div>
                    <h2 className="mt-4 text-2xl font-bold text-[#06458f]">Cadastro realizado com sucesso!</h2>
                    <p className="mt-3 text-lg font-semibold">{nomeCadastrado}</p>
                    <p className="mt-1 font-semibold text-green-700">Acesso liberado</p>
                    <p className="mt-2 text-xs text-gray-500">Cadastro confirmado pela API. O acesso efetivo depende do status da instituição e das permissões configuradas no backend.</p>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        <button type="button" onClick={limparCadastro} className={`${cssBotao} bg-[#06458f] text-white hover:bg-[#03336c]`}>Cadastrar Outra Instituição</button>
                        <Link to="/principal-adm" className={`${cssBotao} border border-gray-300 bg-white text-[#06458f] hover:bg-gray-50`}>Voltar ao Dashboard</Link>
                    </div>
                </section>
            ) : (
                <form onSubmit={avancarOuCadastrar} noValidate aria-busy={salvando}>
                    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                        <ol aria-label="Etapas de cadastro" className="mb-7 grid grid-cols-3 gap-2">
                            {etapas.map((titulo, indice) => {
                                const numero = indice + 1;
                                const completo = polosConcluidos[indice];
                                const ativo = etapa === numero;
                                return (
                                    <li key={titulo} aria-current={ativo ? "step" : undefined} className="relative flex flex-col items-center text-center">
                                        {indice < 2 && (
                                            <div aria-hidden="true" className={`absolute left-1/2 top-5 h-1 w-full ${polosConcluidos[indice] ? "bg-[#06458f]" : "bg-gray-300"}`} />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => irParaEtapa(numero)}
                                            disabled={salvando || (numero === 2 && !identificacaoCompleta) || (numero === 3 && !acessoCompleto)}
                                            aria-label={`Ir para etapa ${numero}: ${titulo}`}
                                            className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-xl text-xl font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed ${completo ? "bg-[#06458f] text-white" : ativo ? "border-2 border-[#06458f] bg-white text-[#06458f]" : "bg-gray-200 text-gray-600"}`}
                                        >
                                            {numero}
                                        </button>
                                        <span className={`mt-2 text-xs font-semibold ${ativo ? "text-[#06458f]" : "text-gray-500"}`}>{titulo}</span>
                                    </li>
                                );
                            })}
                        </ol>

                        <h2 className="mb-5 text-xl font-bold text-[#06458f]">
                            {etapa === 1 ? "Identificação da Instituição" : etapa === 2 ? "Acesso e Permissões" : "Confirmação do Cadastro"}
                        </h2>

                        {etapa === 1 && (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {camposInstituicao.map(({ full, ...campo }) => (
                                    <Campo key={campo.name} {...campo} full={full}
                                        value={dados[campo.name]} onChange={alterarCampo}
                                    />
                                ))}
                            </div>
                        )}

                        {etapa === 2 && (
                            <div className="space-y-5">
                                <Campo label="Instituição" name="instituicao_visualizacao" value={dados.nome} readOnly />
                                <Campo label="E-mail de Login" name="email_institucional" type="email" value={dados.email_institucional} onChange={alterarCampo} />
                                <div>
                                    <label htmlFor="senha" className="block text-sm font-semibold">Senha Inicial <span className="text-red-600">*</span></label>
                                    <div className="relative mt-1">
                                        <input id="senha" name="senha" type={mostrarSenha ? "text" : "password"}
                                            value={dados.senha} onChange={alterarCampo} minLength={8} required autoComplete="new-password"
                                            className={`${cssInput} mt-0 pr-24`} placeholder="Mínimo de 8 caracteres" />
                                        <button type="button" onClick={() => setMostrarSenha((v) => !v)}
                                            className="absolute inset-y-0 right-2 px-3 text-xs font-medium text-[#06458f]"
                                            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}>
                                            {mostrarSenha ? "Ocultar" : "Mostrar"}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="permissao" className="block text-sm font-semibold">Permissões <span className="text-red-600">*</span></label>
                                    <select id="permissao" value={permissao} onChange={(e) => { setPermissao(e.target.value); setErro(""); }} required className={cssInput}>
                                        <option value="">Selecione a permissão</option>
                                        <option value="Institucional">Institucional (acesso a solicitações)</option>
                                    </select>
                                </div>

                            </div>
                        )}

                        {etapa === 3 && (
                            <div>
                                <p className="mb-4 text-sm text-gray-500">Confira todos os dados antes de confirmar o cadastro.</p>
                                <dl className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
                                    {resumo.map(([rotulo, valor]) => (
                                        <div key={rotulo}>
                                            <dt className="text-xs font-semibold text-gray-500">{rotulo}</dt>
                                            <dd className="mt-1 break-words text-sm font-medium">{valor || "Não informado"}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        )}

                        {erro && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
                    </section>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <button type="button" onClick={voltar} disabled={salvando} className={`${cssBotao} border border-[#7299ca] bg-[#b5c9e3] text-[#06458f] hover:bg-[#a4bcdb]`}>
                            ← Voltar
                        </button>
                        <div className="flex flex-wrap gap-3">
                            <button type="submit" disabled={salvando || (etapa === 3 && !acessoCompleto)} className={`${cssBotao} bg-[#06458f] text-white hover:bg-[#03336c]`}>
                                {salvando ? "Cadastrando..." : etapa === 3 ? "Finalizar Cadastro" : "Continuar →"}
                            </button>
                            <button type="button" disabled={salvando} onClick={() => setConfirmarCancelamento(true)} className={`${cssBotao} bg-[#9bb7db] text-[#06458f] hover:bg-[#89a9d0]`}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {confirmarCancelamento && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div role="alertdialog" aria-modal="true" aria-labelledby="titulo-cancelamento" aria-describedby="descricao-cancelamento" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <h2 id="titulo-cancelamento" className="text-lg font-bold text-[#082d56]">Cancelar cadastro?</h2>
                        <p id="descricao-cancelamento" className="mt-3 text-sm text-gray-600">
                            Tem certeza que deseja cancelar o acesso da instituição? Se escolher Sim, todos os dados preenchidos neste cadastro serão apagados.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setConfirmarCancelamento(false)} className={`${cssBotao} border border-gray-300 bg-white text-[#082d56]`}>Não, manter dados</button>
                            <button type="button" onClick={cancelarConfirmado} className={`${cssBotao} bg-red-600 text-white hover:bg-red-700`}>Sim, apagar dados</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
