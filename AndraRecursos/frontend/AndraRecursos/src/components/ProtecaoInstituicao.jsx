
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { enderecoServidor } from "../utils";

export default function ProtecaoInstituicao({
    exigirCadastro = true,
}) {
    const [estado, setEstado] = useState({
        carregando: true,
        autorizado: false,
        cadastroCompleto: false,
    });

    useEffect(() => {
        let ativo = true;

        async function verificarAcesso() {
            const token = localStorage.getItem(
                "@AndraRecursos:token"
            );

            if (!token) {
                if (ativo) {
                    setEstado({
                        carregando: false,
                        autorizado: false,
                        cadastroCompleto: false,
                    });
                }
                return;
            }

            try {
                const resposta = await fetch(
                    `${enderecoServidor}/instituicoes/me`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (!resposta.ok) {
                    throw new Error("Acesso inválido.");
                }

                const dados = await resposta.json();

                if (ativo) {
                    setEstado({
                        carregando: false,
                        autorizado: true,
                        cadastroCompleto:
                            dados.cadastro_completo === true,
                    });
                }

            } catch {
                if (ativo) {
                    setEstado({
                        carregando: false,
                        autorizado: false,
                        cadastroCompleto: false,
                    });
                }
            }
        }

        verificarAcesso();

        return () => {
            ativo = false;
        };
    }, []);

    if (estado.carregando) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f4f6f9]">
                <p className="text-sm font-medium text-[#082d56]">
                    Verificando acesso institucional...
                </p>
            </div>
        );
    }

    if (!estado.autorizado) {
        return <Navigate to="/" replace />;
    }

    if (exigirCadastro && !estado.cadastroCompleto) {
        return <Navigate to="/obrigatorio-inst" replace />;
    }

    if (!exigirCadastro && estado.cadastroCompleto) {
        return <Navigate to="/principal-inst" replace />;
    }

    return <Outlet />;
}
