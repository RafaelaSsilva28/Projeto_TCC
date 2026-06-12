import express from "express";
import { testarConexao } from "./db.js";
import rotasAdministradores from "./src/routes/rotasAdministradores.js";
import rotasInstituicoes from "./src/routes/rotasInstituicoes.js";
import rotasSolicitacoes from "./src/routes/rotasSolicitacoes.js"
import rotasDocumentos from "./src/routes/rotasDocumentos.js";
import rotasNotificacoes from "./src/routes/rotasNotificacoes.js";
import rotasHistoricoSolicitacoes from "./src/routes/rotasHistoricoSolicitacoes.js";
import rotasRespostasADM from "./src/routes/rotasRespostasADM.js"
import rotasDashboard from "./src/routes/rotasDashboard.js";

// Usando swagger
import swaggerUi from "swagger-ui-express";
import documentacao from "./config/swagger.js";
import cors from "cors";

const app = express();
app.use(cors());

app.use(express.json());
app.use("/swagger", swaggerUi.serve, swaggerUi.setup(documentacao));

app.get("/", async (req, res) => {
  await testarConexao();
  res.redirect("/swagger"); // Descomente esta linha para redirecionar automaticamente
});

// Utilizando rotas
app.use(rotasAdministradores);
app.use(rotasInstituicoes); 
app.use(rotasSolicitacoes); 
app.use(rotasDocumentos); 
app.use(rotasNotificacoes); 
app.use(rotasHistoricoSolicitacoes);
app.use(rotasRespostasADM);
app.use(rotasDashboard);

const porta = 3001;
app.listen(porta, () => {
  console.log(`http://localhost:${porta}`);
});
