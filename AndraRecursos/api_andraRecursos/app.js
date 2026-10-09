
import "dotenv/config";

import express from "express";
import cors from "cors";

import { testarConexao } from "./db.js";

import rotasAdministradores from "./src/routes/rotasAdministradores.js";
import rotasInstituicoes from "./src/routes/rotasInstituicoes.js";
import rotasSolicitacoes from "./src/routes/rotasSolicitacoes.js";
import rotasDocumentos from "./src/routes/rotasDocumentos.js";
import rotasNotificacoes from "./src/routes/rotasNotificacoes.js";
import rotasHistoricoSolicitacoes from "./src/routes/rotasHistoricoSolicitacoes.js";
import rotasRespostasADM from "./src/routes/rotasRespostasADM.js";
import rotasDashboard from "./src/routes/rotasDashboard.js";
import rotasHistoricoInst from "./src/routes/rotasHistoricoInst.js"; 
import rotasConfiguracoesAdmin from "./src/routes/rotasConfiguracoesAdmin.js";

import documentacao from "./config/swagger.js";

const app = express();

// ======================================
// MIDDLEWARES
// ======================================

app.use(cors());
app.use(express.json());

// ======================================
// ROTA PRINCIPAL
// ======================================

app.get("/", (req, res) => {
  res.status(200).json({
    mensagem: "API AndraRecursos funcionando!",
    status: "online",
  });
});

// ======================================
// DOCUMENTAÇÃO SWAGGER
// ======================================

app.get("/swagger", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>API AndraRecursos</title>

        <link
          rel="stylesheet"
          href="https://unpkg.com/swagger-ui-dist/swagger-ui.css"
        />
      </head>

      <body>
        <div id="swagger-ui"></div>

        <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>

        <script>
          SwaggerUIBundle({
            spec: ${JSON.stringify(documentacao)},
            dom_id: "#swagger-ui"
          });
        </script>
      </body>
    </html>
  `);
});

// ======================================
// ROTAS DA API
// ======================================

// Administradores
app.use(rotasAdministradores);

// Instituições
app.use(rotasInstituicoes);

// Solicitações
app.use(rotasSolicitacoes);

// Documentos
app.use(rotasDocumentos);

// Notificações
app.use(rotasNotificacoes);

// Histórico
app.use(rotasHistoricoSolicitacoes);

// Respostas administrativas
app.use(rotasRespostasADM);

// Dashboard
app.use(rotasDashboard);

//Historico instituição
app.use(rotasHistoricoInst);

//configurações 
app.use(rotasConfiguracoesAdmin);
// ======================================
// ROTA NÃO ENCONTRADA
// ======================================

app.use((req, res) => {
  res.status(404).json({
    message: "Rota não encontrada.",
    caminho: req.originalUrl,
  });
});

// ======================================
// TRATAMENTO DE ERROS
// ======================================

app.use((error, req, res, next) => {
  console.error("Erro na API:", error);

  res.status(500).json({
    message: "Erro interno no servidor.",
  });
});

// ======================================
// EXECUÇÃO LOCAL
// ======================================

if (!process.env.VERCEL) {
  const porta = Number(process.env.PORT || 3001);

  app.listen(porta, async () => {
    console.log(
      `API AndraRecursos: http://localhost:${porta}`
    );

    try {
      await testarConexao();
    } catch (error) {
      console.error(
        "Erro ao conectar ao Neon:",
        error.message
      );
    }
  });
}

// ======================================
// EXPORTAÇÃO PARA VERCEL
// ======================================

export default app;
