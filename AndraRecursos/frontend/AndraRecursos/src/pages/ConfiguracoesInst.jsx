import { useEffect, useState } from "react";
import LayoutInstituicao from "../components/LayoutInstituicao";
import {
  FiBell,
  FiLock,
  FiEye,
  FiEyeOff,
  FiSave,
  FiShield,
  FiUser,
  FiMail,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
  FiMonitor,
  FiRefreshCw,
} from "react-icons/fi";

export default function ConfiguracoesInst() {
  const API_URL = "https://api-andra-recursos.vercel.app";

  async function requisicaoAPI(caminho, metodo = "GET", dados = null) {
    const token = localStorage.getItem("@AndraRecursos:token");

    if (!token) {
      throw new Error("Sua sessão expirou. Entre novamente na sua conta.");
    }

    const opcoes = {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    };

    if (dados !== null) {
      opcoes.headers["Content-Type"] = "application/json";
      opcoes.body = JSON.stringify(dados);
    }

    let resposta;
    try {
      resposta = await fetch(`${API_URL}${caminho}`, opcoes);
    } catch (erro) {
      throw new Error("Não foi possível conectar ao servidor. Verifique sua conexão.");
    }

    const texto = await resposta.text();
    let resultado = {};

    if (texto) {
      try {
        resultado = JSON.parse(texto);
      } catch {
        resultado = { message: texto };
      }
    }

    if (!resposta.ok) {
      throw new Error(
        resultado.message || resultado.mensagem || `Erro na solicitação (${resposta.status}).`
      );
    }

    return resultado;
  }
  const [configuracoes, setConfiguracoes] = useState({
    nome: "",
    email_institucional: "",
    notificar_atualizacoes_solicitacoes: true,
    notificar_respostas_administrador: true,
    reduzir_animacoes: false,
  });

  const [senhas, setSenhas] = useState({
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: "",
  });

  const [mostrarSenhas, setMostrarSenhas] = useState({
    senhaAtual: false,
    novaSenha: false,
    confirmarSenha: false,
  });

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [alterandoSenha, setAlterandoSenha] = useState(false);

  const [mensagem, setMensagem] = useState({
    tipo: "",
    texto: "",
  });

  function obterToken() {
    return localStorage.getItem("@AndraRecursos:token");
  }

  