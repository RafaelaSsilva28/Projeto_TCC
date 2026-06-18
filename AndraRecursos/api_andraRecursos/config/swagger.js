const documentacao = {
  openapi: "3.0.3",
  info: {
    title: "API AndraRecursos",
    description: "Documentação da API de gerenciamento de recursos municipais",
    version: "1.0.0",
  },
  servers: [
    {
      url: "http://localhost:3001",
      description: "Servidor Localhost",
    },
    //Vercel
    { 
      url: 'api-andra-recursos.vercel.app', 
      description: 'Vercel'
    }
  ],
  tags: [
    { name: "Autenticação", description: "Login do Administrador" },
    {
      name: "Administradores",
      description: "Operações relacionadas aos administradores",
    },
    {
      name: "Instituições",
      description: "Operações relacionadas as instituições",
    },
    {
      name: "Solicitações",
      description: "Operações relacionadas as solicitações",
    },
    {
      name: "Notificações",
      description: "Operações relacionadas as notificações",
    },
    {
      name: "Respostas ADM",
      description: "Operações relacionadas as respostas dos administradores",
    },
    {
      name: "Notificações",
      description: "Operações relacionadas as notificações",
    },
    {
      name: "Documentos",
      description: "Operações relacionadas aos documentos",
    },
    {
      name: "Historico",
      description: "Operações relacionadas ao histórico das solicitações",
    },
  ],

  paths: {
    //Login
    "/login": {
      post: {
        tags: ["Autenticação"],
        summary: "Realizar Login",
        description: "Autentica um usuário e retorna o token de acesso",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Login_Administrador",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login realizado com sucesso!",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Resposta_Login",
                },
              },
            },
          },
          400: { description: "Email e senha são obrigatórios" },
          401: { description: "Credenciais inválidas" },
          500: { description: "Erro interno no servidor" },
        },
      },
    },

    //Administradores
    "/administradores": {
      get: {
        tags: ["Administradores"],
        summary: "Listar todos os Administradores",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Dados obtidos com sucesso!",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/Listar_Administradores",
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Administradores"],
        summary: "Realiza o Cadastro de Administradores",
        description: "Cadastra um Administrador para ter acesso",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Cadastro_Administrador",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Administrador cadastrado com sucesso.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Resposta_Administrador",
                },
              },
            },
          },
          400: {
            description:
              "Nome, email e senha são obrigatórios ou e-mail já em uso",
          },
          500: { description: "Erro interno no servidor" },
        },
      },
    }, // <-- CORREÇÃO 1: Adicionada a vírgula obrigatória aqui
    "/administradores/{id_administrador}": {
      // <-- CORREÇÃO 1: Adicionado o "r" no final
      patch: {
        tags: ["Administradores"],
        summary: "Atualiza parcialmente um Administrador", // <-- Ajustado o texto
        description:
          "Atualiza nome, email ou senha de um administrador pelo ID",
        parameters: [
          {
            name: "id_administrador", // <-- Agora bate exatamente com o nome na URL acima
            in: "path",
            required: true,
            description: "ID do Administrador a ser atualizado",
            schema: {
              type: "integer",
              example: 1,
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Atualizacao_Administradores",
              },
            },
          },
        },
        responses: {
          200: {
            // <-- Mudado para 200 porque atualizações retornam status 200 em vez de 201
            description: "Usuario atualizado parcialmente",
            content: {
              "application/json": {
                schema: {
                  type: "string",
                  example: "Usuario atualizado parcialmente",
                },
              },
            },
          },
          400: { description: "Nenhum campo enviado para atualizar" },
          404: { description: "Administrador não encontrado" },
          500: { description: "Erro interno no servidor" },
        },
      },

      delete: {
        tags: ["Administradores"],
        summary: "Remove Administrador",
        description: "Remove administrador existente pelo ID",
        security: [
          {
            bearerAuth: [], // <-- ISSO AQUI adiciona o campo de Token (cadeado) na rota do Swagger
          },
        ],
        parameters: [
          {
            name: "id_administrador",
            in: "path",
            required: true,
            description: "ID do administrador a ser removido",
            schema: {
              type: "integer",
              example: 1,
            },
          },
        ],
        responses: {
          200: {
            description: "Administrador removido com sucesso!",
          },
          404: {
            description: "Administrador não encontrado",
            content: {
              "application/json": {
                example: { message: "Administrador não encontrado" },
              },
            },
          },
          500: {
            description: "Erro interno no servidor",
          },
        },
      },
    },

    //Instituições
    "/instituicoes": {
      get: {
        tags: ["Instituições"],
        security: [
          {
            bearerAuth: [],
          },
        ],
        summary: "Listar todas as Instituições",
        responses: {
          200: {
            description: "Dados obtidos com sucesso!",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Listar_Instituições" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Instituições"],
        summary: "Cadastrar nova Instituição",
        description:
          "Recebe nome, email_institucional, senha, cep, telefone, horario_funcionamento, status_instituicao, gestor, secretaria_vinculada, numero, logradouro e bairro para cadastrar nova instituição",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Cadastro_Instituição",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Instituição cadastrada com sucesso!",
          },
          400: {
            description: "Erro na requisição (preencha todos os campos)",
          },
          500: {
            description: "Erro interno so Servidor",
          },
        },
      },
    },
    "/instituicoes/{id_instituicao}": {
      put: {
        tags: ["Instituições"],
        summary: "Realiza a atualização de Instituições",
        description:
          "Atualização de Instituições, inserindo: nome, email_institucional, senha, cep, telefone, horario_funcionamento, status_instituicao, gestor, secretaria_vinculada, numero, logradouro e bairro ",
        parameters: [
          {
            name: "id_instituicao",
            in: "path",
            required: true,
            description: "ID da Instituição a ser atualizada",
            schema: {
              type: "integer",
              example: 1,
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Atualizacao_Instituicao",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Administrador cadastrado com sucesso.",
          },
          400: {
            description:
              "Campos obrigatórios ausentes ou inseridos incorretamente!",
          },
          500: { description: "Erro interno no servidor" },
        },
      },
      delete: {
        tags: ["Instituições"],
        summary: "Excluir a Instituição",
        description: "Método para exclusão da Instituição",
        parameters: [
          {
            name: "id_instituicao",
            in: "path",
            required: true,
            description: "Id da solicitação a ser excluída",
            schema: { type: "integer" },
            example: 1,
          },
        ],

        responses: {
          200: {
            description: "Instituição excluída com sucesso",
            content: {
              "application/json": { example: "Instituição não encontrada" },
            },
          },
          500: {
            description: "Erro interno no Servidor",
          },
        },
      },
    },

    //Notificações
    "/notificacoes": {
      get: {
        tags: ["Notificações"],
        summary: "Listar todas as notificações",
        description:
          "Retorna uma lista contendo todas as notificações salvas no banco de dados.",
        responses: {
          200: {
            description: "Dados obtidos com sucesso!",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id_notificacao: { type: "integer", example: 1 },
                    mensagem: {
                      type: "string",
                      example: "Texto da mensagem atualizado.",
                    },
                    tipo_informacao: {
                      type: "string",
                      example: "Alerta Crítico",
                    },
                    id_administrador: { type: "integer", example: 1 },
                  },
                },
              },
            },
          },
          500: { description: "Erro interno ao buscar notificações." },
        },
      },
      post: {
        tags: ["Notificações"],
        summary: "Realiza o Cadastro de Notificações",
        description: "Cadastra uma Notificação para ser enviada",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  mensagem: {
                    type: "string",
                    example: "Texto da mensagem atualizado.",
                  },
                  tipo_informacao: {
                    type: "string",
                    example: "Alerta Crítico",
                  },
                  id_administrador: { type: "integer", example: 1 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Notificação cadastrada com sucesso.", // <-- CORREÇÃO: Gênero da palavra ajustado
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Resposta_Notificacao",
                },
              },
            },
          },
          400: {
            description:
              "Mensagem, tipo_informacao e id_administrador são obrigatórios.",
          },
          500: { description: "Erro interno no servidor" },
        },
      },
    },
    "/notificacoes/{id_notificacao}": {
      patch: {
        tags: ["Notificações"],
        summary: "Realiza a atualização de Notificações",
        description:
          "Atualização de Notificações, inserindo: mensagem, tipo_informacao, id_administrador",
        parameters: [
          {
            name: "id_notificacao",
            in: "path",
            required: true,
            description: "ID da Notificação a ser atualizada",
            schema: {
              type: "integer",
              example: 1,
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  mensagem: {
                    type: "string",
                    example: "Texto da mensagem atualizado.",
                  },
                  tipo_informacao: {
                    type: "string",
                    example: "Alerta Crítico",
                  },
                  id_administrador: { type: "integer", example: 1 },
                },
              },
            },
          },
        }, // <-- CORREÇÃO 1: Chaves do requestBody fechadas corretamente
        responses: {
          200: {
            // <-- CORREÇÃO 2: Alterado de 201 para 200 para bater com o seu Express
            description: "Notificação atualizada parcialmente com sucesso.",
            content: {
              "application/json": {
                schema: {
                  type: "string",
                  example: "Notificacao atualizada parcialmente",
                },
              },
            },
          },
          400: {
            description:
              "Campos obrigatórios ausentes ou inseridos incorretamente!",
          },
          404: {
            description: "Notificação não encontrada",
          },
          500: { description: "Erro interno no servidor" },
        },
      },

      delete: {
        tags: ["Notificações"],
        summary: "Excluir a Notificação",
        description: "Método para exclusão da Notificação",
        parameters: [
          {
            name: "id_notificacao",
            in: "path",
            required: true,
            description: "Id da notificacao a ser excluída",
            schema: { type: "integer" },
            example: 1,
          },
        ],

        responses: {
          200: {
            description: "Notificação excluída com sucesso",
            content: {
              "application/json": { example: "Notificação não encontrada" },
            },
          },
          500: {
            description: "Erro interno no Servidor",
          },
        },
      },
    },

    //Respostas ADM
    "/respostas-adm": {
      get: {
        tags: ["Respostas ADM"],
        summary: "Listar respostas do ADM",
        responses: {
          200: {
            description: "Dados obtidos com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Lista_Resposta_ADM" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Respostas ADM"],
        summary: "Cadastrar nova resposta",
        description:
          "Recebe mensagem, data_resposta, id_solicitacao, id_administrador para cadastrar nova resposta",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Cadastro_Resposta_ADM",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Resposta cadastrada com sucesso",
          },
          400: {
            description: "Erro na requisição(preencha todos os campos)",
          },
          500: {
            description: "Erro interno so Servidor",
          },
        },
      },
    },
    "/respostas-adm/{id_resposta}": {
      put: {
        tags: ["Respostas ADM"],
        summary: "Atualizar resposta completa",
        description: "Atualiza todos os campos de uma resposta existente",
        parameters: [
          {
            name: "id_resposta",
            in: "path",
            required: true,
            description: "Id da resposta a ser atualizada",
            schema: { type: "integer" },
            example: 1,
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Atualizacao_Resposta_ADM" },
            },
          },
        },
        responses: {
          200: {
            description: "Resposta do ADM atualizada com sucesso",
            content: {
              "application/json": {
                example: "Resposta do ADM atualizada com sucesso",
              },
            },
          },
          404: {
            description: "Resposta do ADM não encontrada",
            content: {
              "application/json": { example: "Resposta do ADM não encontrada" },
            },
          },
          500: {
            description: "Erro no Servidor",
          },
        },
      },
      delete: {
        tags: ["Respostas ADM"],
        summary: "Ecluir a resposta do ADM",
        description: "Exclui a resposta do ADM",
        parameters: [
          {
            name: "id_resposta",
            in: "path",
            required: true,
            description: "Id da resposta do ADM a ser desativada",
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "resposta do ADM excluída com sucesso",
            content: {
              "application/json": { example: "resposta do ADM não encontrada" },
            },
          },
          500: {
            description: "Erro no Servidor",
          },
        },
      },
    },

    //Documentos
    "/documentos": {
      get: {
        tags: ["Documentos"],
        security: [
          {
            bearerAuth: [],
          },
        ],
        summary: "Listar todas os Documentos",
        responses: {
          200: {
            description: "Dados obtidos com sucesso!",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Listar_Documentos" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Documentos"],
        summary: "Cadastrar novo Documento",
        description:
          "Inserir: nome_arquivo, caminho, tipo, id_solicitacao para cadastrar novo documento",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Cadastro_Documentos",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Documento cadastrado com sucesso!",
          },
          400: {
            description: "Erro na requisição (preencha todos os campos)",
          },
          500: {
            description: "Erro interno so Servidor",
          },
        },
      },
    },
    "/documentos/tipo": {
      get: {
        tags: ["Documentos"],
        summary: "Listar Documentos pelo seu tipo",
        description: "Retorna todos os documentos referentes e um tipo.",
        parameters: [
          {
            name: "tipo",
            in: "query",
            required: true,
            description: "Tipo do documento",
            schema: {
              type: "string",
              example: "application/pdf",
            },
          },
        ],
        responses: {
          200: {
            description: "Dados obtidos com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Listar_Documentos" },
                },
              },
            },
          },
          500: {
            description: "Erro interno do Servidor",
          },
        },
      },
    },
    "/documentos/solicitacao/{id_solicitacao}": {
      get: {
        tags: ["Documentos"],
        summary: "Listar Documentos pelo tipo de Solicitação",
        description: "Retorna todos os documentos uma solicitação realizada.",
        parameters: [
          {
            name: "id_solicitacao",
            in: "path",
            required: true,
            description: "ID da Solicitação",
            schema: {
              type: "integer",
              example: 2,
            },
          },
        ],
        responses: {
          200: {
            description: "Dados obtidos com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Lista_Solicitacoes" },
                },
              },
            },
          },
          500: {
            description: "Erro interno do Servidor",
          },
        },
      },
    },
    "/documentos/{id_documento}": {
      delete: {
        tags: ["Documentos"],
        summary: "Excluir o Documento",
        description: "Método para exclusão do Documento",
        parameters: [
          {
            name: "id_documento",
            in: "path",
            required: true,
            description: "Documento a ser excluído",
            schema: { type: "integer" },
            example: 1,
          },
        ],

        responses: {
          200: {
            description: "Documento excluído com sucesso",
            content: {
              "application/json": { example: "Documento não encontrado" },
            },
          },
          500: {
            description: "Erro interno no Servidor",
          },
        },
      },
    },

    //Solicitacoes
    "/solicitacoes": {
      get: {
        tags: ["Solicitações"],
        summary: "Listar Solicitações",
        responses: {
          200: {
            description: "Dados obtidos com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties:{
                  total: {
                    type: "integer",
                    example: 2
                  },
                  },
                  items: { $ref: "#/components/schemas/Lista_Solicitacoes" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Solicitações"],
        summary: "Cadastrar nova solicitação ",
        description:
          "Recebe titulo, descricao, prioridade, setor, status, data_pedido, id_instituicao para cadastrar nova solicitação",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Cadastro_Solicitacoes",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Transação cadastrada com sucesso",
          },
          400: {
            description: "Erro na requisição(preencha todos os campos)",
          },
          500: {
            description: "Erro interno so Servidor",
          },
        },
      },
    },
    "/solicitacoes/prioridade/{prioridade}": {
      get: {
        tags: ["Solicitações"],
        summary: "Listar Solicitações por Prioridade",
        description:
          "Retorna todas as solicitações de acordo com a prioridade informada.",
        parameters: [
          {
            name: "prioridade",
            in: "path",
            required: true,
            description: "Prioridade da solicitação",
            schema: {
              type: "string",
              example: "alta",
            },
          },
        ],
        responses: {
          200: {
            description: "Dados obtidos com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Lista_Solicitacoes" },
                },
              },
            },
          },
          500: {
            description: "Erro interno do Servidor",
          },
        },
      },
    },
    "/solicitacoes/setor/{setor}": {
      get: {
        tags: ["Solicitações"],
        summary: "Listar Solicitações por Setor",
        description:
          "Retorna todas as solicitações de acordo com o setor informado.",
        parameters: [
          {
            name: "setor",
            in: "path",
            required: true,
            description: "Setor da solicitação",
            schema: {
              type: "string",
              example: "TI",
            },
          },
        ],
        responses: {
          200: {
            description: "Dados obtidos com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Lista_Solicitacoes" },
                },
              },
            },
          },
          500: {
            description: "Erro interno do Servidor",
          },
        },
      },
    },
    "/solicitacoes/status/{status}": {
      get: {
        tags: ["Solicitações"],
        summary: "Listar Solicitações por Status",
        description:
          "Retorna todas as solicitações de acordo com o status informado.",
        parameters: [
          {
            name: "status",
            in: "path",
            required: true,
            description: "Status da solicitação",
            schema: {
              type: "string",
              example: "em andamento",
            },
          },
        ],
        responses: {
          200: {
            description: "Dados obtidos com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Lista_Solicitacoes" },
                },
              },
            },
          },
          500: {
            description: "Erro interno do Servidor",
          },
        },
      },
    },
    "/solicitacoes/{id_solicitacoes}/status": {
      patch: {
        tags: ["Solicitações"],
        summary: "Atualizar solicitação por parte",
        description: "Atualiza todos os campos de uma solicitação existente",
        parameters: [
          {
            name: "id_solicitacoes",
            in: "path",
            required: true,
            description: "Id da solicitação a ser atualizada",
            schema: { type: "integer" },
            example: 1,
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Atualizacao_Solicitacoes" },
            },
          },
        },
        responses: {
          200: {
            description: "Solicitação atualizada com sucesso",
            content: {
              "application/json": {
                example: "Solicitação atualizada com sucesso",
              },
            },
          },
          404: {
            description: "Solicitação não encontrada",
            content: {
              "application/json": { example: "Solicitação não encontrada" },
            },
          },
          500: {
            description: "Erro no Servidor",
          },
        },
      },
    },
    "/solicitacoes/{id_solicitacoes}": {
      put: {
        tags: ["Solicitações"],
        summary: "Realiza a atualização de Solicitações",
        description:
          "Atualização de Solicitações, inserindo: titulo, descricao, prioridade, setor, status, data_pedido e id_instituicao ",
        parameters: [
          {
            name: "id_solicitacoes",
            in: "path",
            required: true,
            description: "ID da Solicitação a ser atualizada",
            schema: {
              type: "integer",
              example: 1,
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Atualizacao_Solicitacoes_Geral",
              },
            },
          },
        },
        responses: {
          201: {
            description: "SOlicitações atualizada com sucesso!",
          },
          400: {
            description:
              "Campos obrigatórios ausentes ou inseridos incorretamente!",
          },
          500: { description: "Erro interno no servidor" },
        },
      },

      delete: {
        tags: ["Solicitações"],
        summary: "Excluir a solicitação",
        description: "Exclui a solicitação",
        parameters: [
          {
            name: "id_solicitacoes",
            in: "path",
            required: true,
            description: "Id da solicitação a ser excluída",
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "Solicitação excluída com sucesso",
            content: {
              "application/json": { example: "Solicitação não encontrada" },
            },
          },
          500: {
            description: "Erro no Servidor",
          },
        },
      },
    },

    //Histórico de Solicitações
    "/historico-solicitacoes": {
      get: {
        tags: ["Historico"],
        summary: "Listar Historico de Solicitações",
        responses: {
          200: {
            description: "Dados obtidos com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Listar_Historico" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Historico"],
        summary: "Cadastrar novo Historico ",
        description:
          "Recebe dados com relação ao já mencionado em Solicitações",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Cadastro_Historico",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Historico cadastrado com sucesso",
          },
          400: {
            description: "Erro na requisição(preencha todos os campos)",
          },
          500: {
            description: "Erro interno so Servidor",
          },
        },
      },
    },
    "/historico-solicitacoes/solicitacao/{id_solicitacao}": {
      get: {
        tags: ["Historico"],
        summary: "Listar Historico por Solicitações",
        description:
          "Retorna tudo o que tem no Historico de acordo com a Solicitação.",
        parameters: [
          {
            name: "id_solicitacao",
            in: "path",
            required: true,
            description: "ID da solicitação",
            schema: {
              type: "integer",
              example: 2,
            },
          },
        ],
        responses: {
          200: {
            description: "Dados obtidos com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Listar_Historico" },
                },
              },
            },
          },
          500: {
            description: "Erro interno do Servidor",
          },
        },
      },
    },
    "/historico-solicitacoes/{id_historico}": {
      put: {
        tags: ["Historico"],
        summary: "Realiza a atualização do Historico",
        description: "",
        parameters: [
          {
            name: "id_historico",
            in: "path",
            required: true,
            description: "ID do Historico a ser atualizado",
            schema: {
              type: "integer",
              example: 1,
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Atualizar_Historico",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Historico atualizado com sucesso.",
          },
          400: {
            description:
              "Campos obrigatórios ausentes ou inseridos incorretamente!",
          },
          500: { description: "Erro interno no servidor" },
        },
      },
      delete: {
        tags: ["Historico"],
        summary: "Excluir um Historico",
        description: "Método para exclusão do Historico",
        parameters: [
          {
            name: "id_historico",
            in: "path",
            required: true,
            description: "Id do historico a ser excluído",
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          201: {
            description: "Historico deletado com sucesso!",
          },

          500: { description: "Erro interno no servidor" },
        },
      },
    },

    //Dashboard
    "/dashboard/total/solicitacoes":{
      get: {
        tags: ["Dashboard"],
        summary: "Listar Total de Solicitações",
        responses: {
          200: {
            description: "Total obtido com sucesso!",
            content: {
              "application/json": {
                schema: {
                  type: "number",
                  example: 2
                },
              },
            },
          },
        },
      },

    },
    "/dashboard/solicitacoes/pendentes":{
      get: {
        tags: ["Dashboard"],
        summary: "Listar Solicitações ainda Pendentes",
        responses: {
          200: {
            description: "Solicitações pendentes obtidas com sucesso!",
            content: {
              "application/json": {
                schema: {
                  type: "number",
                  example: 2
                },
              },
            },
          },
        },
      },

    },
    "/dashboard/solicitacoes/aprovadas":{
      get: {
        tags: ["Dashboard"],
        summary: "Listar Solicitações Aprovadas",
        responses: {
          200: {
            description: "Solicitações aprovadas obtidas com sucesso!",
            content: {
              "application/json": {
                schema: {
                  type: "number",
                  example: 2
                },
              },
            },
          },
        },
      },

    },
    "/dashboard/solicitacoes/recentes":{
      get: {
        tags: ["Dashboard"],
        summary: "Listar Solicitações Recentes",
        responses: {
          200: {
            description: "Solicitações recentes obtidas com sucesso!",
            content: {
              "application/json": {
                schema: {
                  type: "number",
                  example: 2
                },
              },
            },
          },
        },
      },

    },
    "/dashboard/solicitacoes/recusadas":{
      get: {
        tags: ["Dashboard"],
        summary: "Listar Solicitações Recusadas",
        responses: {
          200: {
            description: "Solicitações recusadas obtidas com sucesso!",
            content: {
              "application/json": {
                schema: {
                  type: "number",
                  example: 2
                },
              },
            },
          },
        },
      },

    },
  
  },
  components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Insira o Token obtido no login",
        },
      },
      schemas: {
        //Login e Cadastro
        Login_Administrador: {
          type: "object",
          required: ["email", "senha"],
          properties: {
            email: { type: "string", example: "gustavopequeno@email.com" },
            senha: { type: "string", example: "senha123" },
          },
        },
        Resposta_Login: {
          type: "object",
          properties: {
            message: { type: "string", example: "Login realizado com sucesso" },
            token: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
            usuario: {
              type: "object",
              properties: {
                id: { type: "integer", example: 1 },
                nome: { type: "string", example: "Administrador Central" },
                email: { type: "string", example: "admin@email.com" },
              },
            },
          },
        },

        //Administradores
        Cadastro_Administrador: {
          // <-- CORREÇÃO 2: Estrutura do objeto limpa e simplificada
          type: "object",
          properties: {
            nome: { type: "string", example: "Administrador " },
            email: { type: "string", example: "gustavopequeno@email.com" },
            senha: { type: "string", example: "senha123" },
          },
        },
        Resposta_Administrador: {
          type: "object",
          properties: {
            mensagem: {
              type: "string",
              example: "Administrador cadastrado com sucesso.",
            },
          },
        },
        Listar_Administradores: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            nome: { type: "string", example: "Ricardo" },
            email: { type: "string", example: "ricardo@email.com" },
          },
        },
        Atualizacao_Administradores: {
          type: "object",
          properties: {
            nome: { type: "string", example: "Ricardo" },
            email: { type: "string", example: "ricardo@email.com" },
            senha: { type: "string", example: "senha123" },
          },
        },

        //Respostas do ADM
        Lista_Resposta_ADM: {
          type: "object",
          properties: {
            id_resposta: { type: "integer", example: 1 },
            mensagem: { type: "string", example: "Solicitação aprovada." },
            data_resposta: { type: "string", example: "15/06/2026 14:30" },
            id_solicitacao: { type: "integer", example: 1 },
            id_administrador: { type: "integer", example: 1 },
          },
        },
        Cadastro_Resposta_ADM: {
          type: "object",
          properties: {
            mensagem: { type: "string", example: "Solicitação aprovada." },
            data_resposta: { type: "string", example: "15/06/2026 14:30" },
            id_solicitacao: { type: "integer", example: 1 },
            id_administrador: { type: "integer", example: 1 },
          },
        },
        Atualizacao_Resposta_ADM: {
          type: "object",
          required: [
            "mensagem",
            "data_resposta",
            "id_solicitacao",
            "id_administrador",
          ],
          properties: {
            mensagem: { type: "string", example: "Solicitação atualizada." },
            data_resposta: { type: "string", example: "15/06/2026 15:00" },
            id_solicitacao: { type: "integer", example: 1 },
            id_administrador: { type: "integer", example: 1 },
          },
        },

        //Notificações
        Listar_Notificacoes: {
          type: "object",
          properties: {
            id_notificacao: { type: "integer", example: 3 },
            mensagem: {
              type: "string",
              example: "Nova solicitação registrada no sistema.",
            },
            tipo_informacao: { type: "string", example: "Alerta" },
            id_administrador: { type: "integer", example: 1 },
          },
        },
        Cadastro_Notificacao: {
          type: "object",
          required: ["mensagem", "tipo_informacao", "id_administrador"],
          properties: {
            mensagem: {
              type: "string",
              example: "Nova solicitação registrada no sistema.",
            },
            tipo_informacao: { type: "string", example: "Alerta" },
            id_administrador: { type: "integer", example: 1 },
          },
        },
        Resposta_Notificacao: {
          type: "object",
          properties: {
            mensagem: {
              type: "string",
              example: "Notificação cadastrada com sucesso.",
            },
          },
        },

        //Instituições
        Listar_Instituições: {
          type: "object",
          properties: {
            nome: { type: "string", example: "Escola Central" },
            email_institucional: { type: "string", example: "123456" },
            senha: { type: "string", example: "senha123" },
            cep: { type: "string", example: "18650-000" },
            telefone: { type: "string", example: "(18)44452-0000" },
            horario_funcionamento: {
              type: "string",
              example: "Segunda a Sexta, das 8h às 17h",
            },
            status_instituicao: { type: "string", example: "Ativa" },
            gestor: { type: "string", example: "Maria Silva" },
            secretaria_vinculada: {
              type: "string",
              example: "Secretaria de Educação",
            },
            numero: { type: "string", example: "2002" },
            logradouro: { type: "string", example: "Rua das Flores" },
            bairro: { type: "string", example: "Centro" },
          },
        },
        Cadastro_Instituição: {
          type: "object",
          properties: {
            nome: { type: "string", example: "Escola Central" },
            email_institucional: { type: "string", example: "123456" },
            senha: { type: "string", example: "senha123" },
            cep: { type: "string", example: "18650-000" },
            telefone: { type: "string", example: "(18)44452-0000" },
            horario_funcionamento: {
              type: "string",
              example: "Segunda a Sexta, das 8h às 17h",
            },
            status_instituicao: { type: "string", example: "Ativa" },
            gestor: { type: "string", example: "Maria Silva" },
            secretaria_vinculada: {
              type: "string",
              example: "Secretaria de Educação",
            },
            numero: { type: "string", example: "2002" },
            logradouro: { type: "string", example: "Rua das Flores" },
            bairro: { type: "string", example: "Centro" },
          },
        },
        Atualizacao_Instituicao: {
          type: "object",
          properties: {
            nome: { type: "string", example: "Escola Central" },
            email_institucional: {
              type: "string",
              example: "contato@escola.com",
            },
            senha: { type: "string", example: "senha123" },
            cep: { type: "string", example: "18650-000" },
            telefone: { type: "string", example: "(18)44452-0000" },
            horario_funcionamento: {
              type: "string",
              example: "Segunda a Sexta, das 8h às 17h",
            },
            status_instituicao: { type: "string", example: "Ativa" },
            gestor: { type: "string", example: "Maria Silva" },
            secretaria_vinculada: {
              type: "string",
              example: "Secretaria de Educação",
            },
            numero: { type: "string", example: "2002" },
            logradouro: { type: "string", example: "Rua das Flores" },
            bairro: { type: "string", example: "Centro" },
          },
        },

        //Solicitações
        Lista_Solicitacoes: {
          type: "object",
          properties: {
            id_solicitacoes: { type: "integer", example: 1 },
            titulo: { type: "string", example: "Computador não liga" },
            descricao: {
              type: "string",
              example: "O computador não está ligando.",
            },
            prioridade: { type: "string", example: "alta" },
            setor: { type: "string", example: "TI" },
            status: { type: "string", example: "pendente" },
            data_pedido: { type: "string", example: "11/06/2026 14:30" },
            nome_instituicao: {
              type: "string",
              example: "Escola Municipal ABC",
            },
          },
        },
        Cadastro_Solicitacoes: {
          type: "object",
          properties: {
            titulo: { type: "string", example: "Computador não liga" },
            descricao: {
              type: "string",
              example: "O computador não está ligando.",
            },
            prioridade: { type: "string", example: "alta" },
            setor: { type: "string", example: "TI" },
            status: { type: "string", example: "pendente" },
            data_pedido: { type: "string", example: "11/06/2026 14:30" },
            id_instituicao: { type: "integer", example: 1 },
          },
        },
        Atualizacao_Solicitacoes: {
          type: "object",
          properties: {
            status: { type: "string", example: "atendido" },
          },
        },
        Atualizacao_Solicitacoes_Geral:{
          type: "object",
          properties:{
            titulo: { type: "string", example: "Computador não liga" },
            descricao: { type: "string", example: "O computador não está ligando."},
            prioridade: { type: "string", example: "alta" },
            setor: { type: "string", example: "TI" },
            status: { type: "string", example: "pendente" },
            data_pedido: { type: "string", example: "11/06/2026 14:30" },
            id_instituicao: { type: "integer", example: 3},
          },
        },

        //Documentos
        Listar_Documentos: {
          type: "object",
          properties: {
            id_documento: { type: "integer", example: 1 },
            nome_arquivo: { type: "string", example: "Pedido de Reforma.pdf" },
            caminho: { type: "string", example: "/uploads/pedido_reforma.pdf" },
            tipo: { type: "string", example: "application/pdf" },
            id_solicitacao: { type: "integer", example: 2 },
          },
        },
        Cadastro_Documentos: {
          type: "object",
          properties: {
            id_documento: { type: "integer", example: 1 },
            nome_arquivo: { type: "string", example: "Pedido de Reforma.pdf" },
            caminho: { type: "string", example: "/uploads/pedido_reforma.pdf" },
            tipo: { type: "string", example: "application/pdf" },
            id_solicitacao: { type: "integer", example: 2 },
          },
        },

        //Historico Solicitações
        Listar_Historico: {
          type: "object",
          properties: {
            id_historico: { type: "integer", example: 1 },
            id_solicitacao: { type: "integer", example: 1 },
            descricao: { type: "string", example: "Solicitação Criada" },
            status: { type: "string", example: "Pendente" },
            prioridade: { type: "string", example: "Alta" },
            data_alteracao: { type: "string", example: "11/06/2026 14:30" },
          },
        },
        Cadastro_Historico: {
          type: "object",
          properties: {
            id_historico: { type: "integer", example: 1 },
            id_solicitacao: { type: "integer", example: 1 },
            descricao: { type: "string", example: "Solicitação Criada" },
            status: { type: "string", example: "Pendente" },
            prioridade: { type: "string", example: "Alta" },
            data_alteracao: { type: "string", example: "11/06/2026 14:30" },
          },
        },
        Atualizar_Historico: {
          type: "object",
          properties: {
            id_historico: { type: "integer", example: 1 },
            id_solicitacao: { type: "integer", example: 1 },
            descricao: { type: "string", example: "Solicitação Criada" },
            status: { type: "string", example: "Pendente" },
            prioridade: { type: "string", example: "Alta" },
            data_alteracao: { type: "string", example: "11/06/2026 14:30" },
          },
        },
      },
  },
};

export default documentacao;
