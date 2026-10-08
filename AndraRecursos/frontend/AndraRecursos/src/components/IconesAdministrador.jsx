export default function IconeAdministrador({ tipo, className = "h-5 w-5" }) {

    const desenhos = {

        dashboard: (

            <>

                <rect x="3" y="3" width="7" height="7" rx="1" />

                <rect x="14" y="3" width="7" height="7" rx="1" />

                <rect x="3" y="14" width="7" height="7" rx="1" />

                <rect x="14" y="14" width="7" height="7" rx="1" />

            </>

        ),

        instituicao: (

            <>

                <rect x="4" y="3" width="16" height="18" rx="2" />

                <path d="M9 21v-4h6v4M8 7h1m6 0h1M8 11h1m6 0h1" />

            </>

        ),

        historico: (

            <>

                <path d="M3 11a9 9 0 1 1 2.5 7" />

                <path d="M3 3v8h8M12 7v5l3 2" />

            </>

        ),

        sino: (

            <>

                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />

                <path d="M10 21h4" />

            </>

        ),

        adicionar: <path d="M12 5v14M5 12h14" />,

        configuracoes: (

            <>

                <path d="m9 3-.6 2.4-2 .9-2.3-.7-2 3.4 1.7 1.7v2.6L2.1 15l2 3.4 2.3-.7 2 .9L9 21h6l.6-2.4 2-.9 2.3.7 2-3.4-1.7-1.7v-2.6l1.7-1.7-2-3.4-2.3.7-2-.9L15 3Z" />

                <circle cx="12" cy="12" r="3" />

            </>

        ),

        suporte: (

            <>

                <circle cx="12" cy="12" r="9" />

                <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4" />

                <path d="M12 17h.01" />

            </>

        ),

        busca: (

            <>

                <circle cx="10.5" cy="10.5" r="6.5" />

                <path d="m16 16 5 5" />

            </>

        ),

        usuario: (

            <>

                <circle cx="12" cy="8" r="4" />

                <path d="M4 21v-2a8 8 0 0 1 16 0v2" />

            </>

        ),

        sair: (

            <>

                <path d="M9 21H4V3h5M9 12h12m-4-4 4 4-4 4" />

            </>

        ),

        arquivo: (

            <>

                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />

                <path d="M14 2v6h6M8 13h8M8 17h6" />

            </>

        ),

        menu: <path d="M4 6h16M4 12h16M4 18h16" />,

        fechar: <path d="m6 6 12 12M18 6 6 18" />,

    };


    return (

        <svg

            className={className}

            viewBox="0 0 24 24"

            fill="none"

            stroke="currentColor"

            strokeWidth="2"

            strokeLinecap="round"

            strokeLinejoin="round"

            aria-hidden="true"

        >

            {desenhos[tipo]}

        </svg>

    );

}
