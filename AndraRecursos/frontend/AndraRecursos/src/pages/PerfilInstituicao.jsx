import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiUser, FiMail, FiHome, FiMapPin, FiPhone, FiClock, FiShield,
  FiEdit3, FiSave, FiX, FiRefreshCw, FiCheckCircle, FiAlertCircle,
  FiHash, FiBriefcase, FiArrowLeft, FiChevronRight, FiLock, FiInfo,
  FiArrowRight, FiSettings,
} from "react-icons/fi";
import { enderecoServidor } from "../utils";

const API = String(enderecoServidor).replace(/\/$/, "");
const CAMPOS_EDITAVEIS = [
  "gestor", "secretaria_vinculada", "logradouro", "cep", "numero",
  "bairro", "telefone", "horario_funcionamento",
];
const FORMULARIO_VAZIO = {
  gestor: "", secretaria_vinculada: "", logradouro: "", cep: "",
  numero: "", bairro: "", telefone: "", horario_funcionamento: "",
};

function obterToken() {
  return localStorage.getItem("@AndraRecursos:token");
}
function formatarCEP(valor) {
  const n = String(valor ?? "").replace(/\D/g, "").slice(0, 8);
  return n.length > 5 ? `${n.slice(0, 5)}-${n.slice(5)}` : n;
}
function formatarTelefone(valor) {
  const n = String(valor ?? "").replace(/\D/g, "").slice(0, 11);
  if (!n) return "";
  if (n.length <= 2) return `(${n}`;
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}
function normalizarFormulario(d = {}) {
  return {
    gestor: d.gestor ?? "",
    secretaria_vinculada: d.secretaria_vinculada ?? "",
    logradouro: d.logradouro ?? "",
    cep: formatarCEP(d.cep ?? ""),
    numero: d.numero ?? "",
    bairro: d.bairro ?? "",
    telefone: formatarTelefone(d.telefone ?? ""),
    horario_funcionamento: d.horario_funcionamento ?? "",
  };
}

const botaoBase = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50";
const botoes = {
  primario: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/10 hover:from-blue-700 hover:to-indigo-700",
  sucesso: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-700/10 hover:from-emerald-700 hover:to-teal-700",
  secundario: "border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700",
  perigo: "border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100",
};
function Botao({ children, onClick, type = "button", variante = "primario", disabled = false, className = "" }) {
  return <button type={type} onClick={onClick} disabled={disabled} className={`${botaoBase} ${botoes[variante]} ${className}`}>{children}</button>;
}
function Campo({ label, icon: Icon, value, onChange, editando, placeholder, required = false, maxLength, dica }) {
  return <div className="min-w-0">
    <label className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-slate-600">
      <span className="flex items-center gap-2">{Icon && <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Icon size={15} /></span>}{label}</span>
      {editando && required && <span className="text-xs font-semibold text-rose-400">Obrigatório</span>}
    </label>
    <input type="text" value={value ?? ""} onChange={onChange} disabled={!editando} required={editando && required} maxLength={maxLength} placeholder={placeholder || label}
      className={`min-h-12 w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all placeholder:text-slate-400 disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-500 ${editando ? "border-blue-200 bg-white text-slate-700 focus:border-blue-400 focus:ring-4 focus:ring-blue-50" : "border-slate-200 bg-slate-50 text-slate-500"}`} />
    {dica && <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{dica}</p>}
  </div>;
}
function CampoSomenteLeitura({ label, icon: Icon, value, descricao }) {
  return <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div className="flex items-start gap-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Icon size={19} /></div>
    <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-semibold text-slate-600">{value || "Não informado"}</p>{descricao && <p className="mt-1 text-xs leading-relaxed text-slate-500">{descricao}</p>}</div>
    <FiLock className="mt-1 shrink-0 text-slate-400" size={15} />
  </div></div>;
}
function Secao({ numero, titulo, descricao, icon: Icon, cor = "blue", children }) {
  const cores = { blue: "bg-blue-50 text-blue-600", violet: "bg-violet-50 text-violet-600", cyan: "bg-cyan-50 text-cyan-600", emerald: "bg-emerald-50 text-emerald-600" };
  return <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
    <div className="flex items-start gap-4 border-b border-slate-100 px-5 py-5 sm:px-6"><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${cores[cor]}`}><Icon size={22} /></div>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-slate-400">{numero}</span><h2 className="text-base font-extrabold text-slate-700 sm:text-lg">{titulo}</h2></div><p className="mt-1 text-sm leading-relaxed text-slate-500">{descricao}</p></div>
    </div><div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">{children}</div>
  </section>;
}
function Resumo({ icon: Icon, titulo, valor, cor }) {
  const cores = { blue: "bg-blue-50 text-blue-600", violet: "bg-violet-50 text-violet-600", emerald: "bg-emerald-50 text-emerald-600" };
  return <div className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:p-5"><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${cores[cor]}`}><Icon size={22} /></div><div className="min-w-0"><p className="text-xs font-semibold text-slate-500">{titulo}</p><p className="mt-1 break-words text-sm font-bold text-slate-600">{valor}</p></div></div>;
}

export default function PerfilInstituicao() {
  const navigate = useNavigate();
  const [instituicao, setInstituicao] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO);
  const [original, setOriginal] = useState(FORMULARIO_VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState("");

  const buscarPerfil = useCallback(async (mostrarToast = false) => {
    setCarregando(true); setErro("");
    try {
      const token = obterToken();
      if (!token) throw new Error("Sua sessão expirou. Entre novamente no sistema.");
      const resposta = await fetch(`${API}/instituicoes/me`, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
      const resultado = await resposta.json().catch(() => null);
      if (!resposta.ok) throw new Error(resultado?.error || resultado?.message || `Não foi possível carregar o perfil (erro ${resposta.status}).`);
      const dados = resultado?.instituicao ?? resultado?.perfil ?? resultado;
      if (!dados || typeof dados !== "object") throw new Error("Os dados recebidos do servidor são inválidos.");
      const inicial = normalizarFormulario(dados);
      setInstituicao(dados); setFormulario(inicial); setOriginal(inicial);
      if (mostrarToast) toast.success("Dados atualizados com sucesso!");
    } catch (e) {
      setErro(e.message || "Erro ao carregar o perfil.");
      if (mostrarToast) toast.error(e.message || "Não foi possível atualizar os dados.");
    } finally { setCarregando(false); }
  }, []);
  useEffect(() => { buscarPerfil(); }, [buscarPerfil]);

  function alterarCampo(campo, valor) { setFormulario((anterior) => ({ ...anterior, [campo]: valor })); }
  function iniciarEdicao() { setOriginal({ ...formulario }); setEditando(true); setErro(""); toast("Modo de edição ativado.", { icon: "✏️" }); }
  function cancelarEdicao() { setFormulario({ ...original }); setEditando(false); setErro(""); toast("As alterações não salvas foram descartadas.", { icon: "↩️" }); }

  async function salvarAlteracoes(event) {
    event.preventDefault(); if (salvando) return;
    const token = obterToken();
    if (!token) { toast.error("Sua sessão expirou. Entre novamente no sistema."); return; }
    for (const campo of CAMPOS_EDITAVEIS) if (!String(formulario[campo] ?? "").trim()) { toast.error("Preencha todos os campos obrigatórios."); return; }
    const cep = String(formulario.cep).replace(/\D/g, "");
    const telefone = String(formulario.telefone).replace(/\D/g, "");
    if (cep.length !== 8) { toast.error("O CEP precisa ter 8 números."); return; }
    if (![10, 11].includes(telefone.length)) { toast.error("Informe um telefone válido com DDD."); return; }
    if (String(formulario.numero).trim().length > 10) { toast.error("O número do endereço deve ter até 10 caracteres."); return; }
    setSalvando(true); setErro("");
    try {
      const corpo = { gestor: formulario.gestor.trim(), secretaria_vinculada: formulario.secretaria_vinculada.trim(), logradouro: formulario.logradouro.trim(), cep, numero: String(formulario.numero).trim(), bairro: formulario.bairro.trim(), telefone, horario_funcionamento: formulario.horario_funcionamento.trim() };
      const resposta = await fetch(`${API}/instituicoes/me`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(corpo) });
      const resultado = await resposta.json().catch(() => null);
      if (!resposta.ok) throw new Error(resultado?.error || resultado?.message || `Não foi possível salvar (erro ${resposta.status}).`);
      toast.success(resultado?.message || "Perfil atualizado com sucesso!"); setEditando(false);
      const dados = resultado?.instituicao ?? resultado?.perfil ?? null;
      if (dados) { const novo = normalizarFormulario(dados); setInstituicao(dados); setFormulario(novo); setOriginal(novo); }
      else await buscarPerfil();
    } catch (e) { setErro(e.message || "Não foi possível salvar as alterações."); toast.error(e.message || "Erro ao salvar o perfil."); }
    finally { setSalvando(false); }
  }

  const nomeInstituicao = instituicao?.nome || "Sua instituição";
  const email = instituicao?.email_institucional || "Não informado";
  const status = instituicao?.status_instituicao || "Não informado";
  const cadastroCompleto = Boolean(instituicao?.cadastro_completo);
  const endereco = [formulario.logradouro, formulario.numero, formulario.bairro].filter(Boolean).join(", ");

  return <div className="min-w-0 space-y-6 pb-8 text-slate-600">
    <div className="flex flex-wrap items-center gap-2 text-sm"><button type="button" onClick={() => navigate("/principal-inst")} className="font-medium text-slate-500 transition hover:text-blue-600">Painel</button><FiChevronRight className="text-slate-400" size={15} /><span className="font-bold text-blue-700">Meu perfil</span></div>

    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#164875] via-blue-700 to-indigo-700 p-6 text-white shadow-xl shadow-blue-900/10 sm:p-8">
      <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full border-[28px] border-white/5" /><div className="pointer-events-none absolute -bottom-20 right-32 h-48 w-48 rounded-full bg-cyan-300/10 blur-2xl" />
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 items-start gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 sm:h-20 sm:w-20"><FiHome size={34} /></div><div className="min-w-0"><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-blue-50"><FiShield size={13} /> ÁREA INSTITUCIONAL</div><h1 className="break-words text-2xl font-black tracking-tight sm:text-3xl">Meu perfil</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-100 sm:text-base">Gerencie as informações da sua instituição em um só lugar. Mantenha seus dados atualizados para facilitar a comunicação.</p></div></div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row"><Botao variante="secundario" onClick={() => buscarPerfil(true)} disabled={carregando || salvando} className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"><FiRefreshCw size={16} className={carregando ? "animate-spin" : ""} />Atualizar dados</Botao>{!editando ? <Botao onClick={iniciarEdicao} disabled={carregando || !instituicao} className="border border-white/20 bg-white text-blue-700 shadow-none hover:bg-blue-50"><FiEdit3 size={16} />Editar perfil</Botao> : <Botao variante="secundario" onClick={cancelarEdicao} disabled={salvando} className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"><FiX size={16} />Cancelar edição</Botao>}</div>
      </div><div className="relative z-10 mt-7 flex flex-wrap items-center gap-3 border-t border-white/15 pt-5"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white"><span className="h-2 w-2 rounded-full bg-emerald-300" />{status}</span><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white"><FiMail size={14} /><span className="max-w-[230px] break-all">{email}</span></span><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white">{cadastroCompleto ? <FiCheckCircle size={14} /> : <FiAlertCircle size={14} />}{cadastroCompleto ? "Cadastro completo" : "Cadastro pendente"}</span></div>
    </section>

    {erro && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100"><FiAlertCircle size={20} /></div><div className="min-w-0 flex-1"><p className="font-extrabold">Não foi possível concluir</p><p className="mt-1 break-words text-sm">{erro}</p></div><button type="button" onClick={() => buscarPerfil(true)} className="rounded-lg px-3 py-2 text-xs font-bold hover:bg-rose-100">Tentar novamente</button></div>}

    <div><div className="mb-4 flex items-center gap-2"><div className="h-6 w-1.5 rounded-full bg-blue-500" /><h2 className="text-lg font-extrabold text-slate-700">Resumo institucional</h2></div><section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"><Resumo icon={FiHome} titulo="Instituição" valor={carregando ? "Carregando..." : nomeInstituicao} cor="blue" /><Resumo icon={FiUser} titulo="Gestor responsável" valor={formulario.gestor || "Não informado"} cor="violet" /><Resumo icon={FiCheckCircle} titulo="Situação do cadastro" valor={cadastroCompleto ? "Completo" : "Pendente"} cor="emerald" /></section></div>

    {carregando && !instituicao ? <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><FiRefreshCw size={25} className="animate-spin" /></div><p className="mt-4 font-bold text-slate-600">Carregando seu perfil...</p><p className="mt-1 text-sm text-slate-500">Estamos buscando os dados da instituição.</p></div> : instituicao ? <form onSubmit={salvarAlteracoes} className="space-y-6">
      {editando && <div className="flex flex-col gap-4 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:flex-row sm:items-center"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white"><FiSettings size={23} /></div><div className="min-w-0 flex-1"><h2 className="font-extrabold text-blue-800">Você está editando seu perfil</h2><p className="mt-1 text-sm leading-relaxed text-blue-700">Altere os campos disponíveis e clique em “Salvar alterações” para enviar os dados ao servidor.</p></div><span className="inline-flex items-center gap-2 self-start rounded-full border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 sm:self-center"><FiEdit3 size={14} />Modo de edição</span></div>}
      <Secao numero="01" titulo="Identificação da instituição" descricao="Informações cadastrais e identificação da conta institucional." icon={FiHome} cor="blue"><CampoSomenteLeitura label="Nome da instituição" icon={FiHome} value={instituicao.nome} descricao="Para alterar este dado, é necessário um fluxo de atualização cadastral no sistema." /><CampoSomenteLeitura label="E-mail institucional" icon={FiMail} value={instituicao.email_institucional} descricao="O e-mail não é alterado por este formulário." /><CampoSomenteLeitura label="Tipo de acesso" icon={FiShield} value={instituicao.tipo_acesso || "Usuário Institucional"} /><CampoSomenteLeitura label="Status da instituição" icon={FiCheckCircle} value={status} /></Secao>
      <Secao numero="02" titulo="Gestão e responsabilidade" descricao="Atualize o gestor responsável e a secretaria vinculada." icon={FiBriefcase} cor="violet"><Campo label="Gestor responsável" icon={FiUser} value={formulario.gestor} editando={editando} required placeholder="Nome completo do gestor" onChange={(e) => alterarCampo("gestor", e.target.value)} /><Campo label="Secretaria vinculada" icon={FiBriefcase} value={formulario.secretaria_vinculada} editando={editando} required placeholder="Nome da secretaria" onChange={(e) => alterarCampo("secretaria_vinculada", e.target.value)} /></Secao>
      <Secao numero="03" titulo="Localização e endereço" descricao="Mantenha o endereço físico da instituição atualizado." icon={FiMapPin} cor="cyan"><div className="sm:col-span-2"><Campo label="Logradouro" icon={FiMapPin} value={formulario.logradouro} editando={editando} required placeholder="Rua, avenida ou logradouro" onChange={(e) => alterarCampo("logradouro", e.target.value)} /></div><Campo label="Número" icon={FiHash} value={formulario.numero} editando={editando} required maxLength={10} placeholder="Número ou identificação" onChange={(e) => alterarCampo("numero", e.target.value)} /><Campo label="Bairro" icon={FiMapPin} value={formulario.bairro} editando={editando} required placeholder="Nome do bairro" onChange={(e) => alterarCampo("bairro", e.target.value)} /><Campo label="CEP" icon={FiMapPin} value={formulario.cep} editando={editando} required maxLength={9} placeholder="00000-000" dica="Digite os oito números do CEP." onChange={(e) => alterarCampo("cep", formatarCEP(e.target.value))} /><CampoSomenteLeitura label="Endereço resumido" icon={FiHome} value={endereco} descricao="Resumo dos campos de endereço acima." /></Secao>
      <Secao numero="04" titulo="Contato e funcionamento" descricao="Informações usadas para contato e organização do atendimento." icon={FiPhone} cor="emerald"><Campo label="Telefone institucional" icon={FiPhone} value={formulario.telefone} editando={editando} required maxLength={15} placeholder="(00) 00000-0000" dica="Informe o DDD e o número de telefone." onChange={(e) => alterarCampo("telefone", formatarTelefone(e.target.value))} /><Campo label="Horário de funcionamento" icon={FiClock} value={formulario.horario_funcionamento} editando={editando} required placeholder="Ex.: Segunda a sexta, das 8h às 17h" onChange={(e) => alterarCampo("horario_funcionamento", e.target.value)} /></Secao>
      {editando ? <section className="sticky bottom-3 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-md sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><FiCheckCircle size={21} /></div><div><p className="font-extrabold text-slate-700">Pronto para atualizar?</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Suas alterações serão enviadas para a API ao salvar.</p></div></div><div className="grid grid-cols-1 gap-2 sm:flex"><Botao variante="perigo" onClick={cancelarEdicao} disabled={salvando}><FiX size={17} />Descartar alterações</Botao><Botao type="submit" variante="sucesso" disabled={salvando} className="sm:min-w-48">{salvando ? <><FiRefreshCw size={17} className="animate-spin" />Salvando dados...</> : <><FiSave size={17} />Salvar alterações<FiArrowRight size={16} /></>}</Botao></div></div></section> : <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><FiInfo size={21} /></div><div><p className="font-extrabold text-slate-700">Seus dados estão organizados</p><p className="mt-1 text-sm leading-relaxed text-slate-500">Precisa corrigir alguma informação? Entre no modo de edição para atualizar os campos disponíveis.</p></div></div><div className="flex flex-col gap-2 sm:flex-row"><Botao variante="secundario" onClick={() => navigate("/principal-inst")}><FiArrowLeft size={16} />Voltar ao painel</Botao><Botao onClick={iniciarEdicao}><FiEdit3 size={16} />Editar informações</Botao></div></section>}
    </form> : <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><FiHome size={26} /></div><h2 className="mt-4 text-lg font-extrabold text-slate-700">Perfil indisponível</h2><p className="mt-2 text-sm text-slate-500">Não foi possível carregar os dados da instituição.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><Botao onClick={() => buscarPerfil(true)} disabled={carregando}><FiRefreshCw size={16} className={carregando ? "animate-spin" : ""} />Tentar novamente</Botao><Botao variante="secundario" onClick={() => navigate("/principal-inst")}><FiArrowLeft size={16} />Voltar</Botao></div></div>}
  </div>;
}
