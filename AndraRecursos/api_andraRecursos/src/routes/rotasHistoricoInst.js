// import { Router } from "express";
// import { BD } from "../../db.js";
// import {
//   autenticarToken,
//   autenticarInstituicao,
// } from "../middlewares/Autenticacao.js";

// const router = Router();

// // GET - Listar histórico de solicitações da instituição logada
// router.get(
//   "/historico-instituicao",
//   autenticarToken,
//   autenticarInstituicao,
//   async (req, res) => {
//     try {
//       const id_instituicao = req.instituicao.id_instituicao;

//       const comando = `
//         SELECT
//           h.id_historico,
//           h.id_solicitacao,
//           h.descricao,
//           h.status,
//           h.prioridade,
//           TO_CHAR(h.data_alteracao, 'DD/MM/YYYY') AS data_alteracao,
//           s.titulo AS titulo_solicitacao
//         FROM historico_solicitacoes h
//         INNER JOIN solicitacoes s
//           ON h.id_solicitacao = s.id_solicitacoes
//         WHERE s.id_instituicao = $1
//         ORDER BY h.data_alteracao DESC
//       `;

//       const historico = await BD.query(comando, [id_instituicao]);

//       return res.status(200).json(historico.rows);
//     } catch (error) {
//       console.error("Erro ao listar histórico da instituição:", error.message);

//       return res.status(500).json({
//         error: "Erro ao listar histórico da instituição.",
//       });
//     }
//   },
// );

// export default router;

import { Router } from "express";
import { BD } from "../../db.js";
import {
  autenticarToken,
  autenticarInstituicao,
} from "../middlewares/Autenticacao.js";

const router = Router();

import { Router } from "express";
import { BD } from "../../db.js";

import {
  autenticarToken,
  autenticarInstituicao,
} from "../middlewares/Autenticacao.js";

const router = Router();

router.get(
  "/historico-instituicao",
  autenticarToken,
  autenticarInstituicao,
  async (req, res) => {
    try {
      const idInstituicao = req.instituicao.id_instituicao;

      const comando = `
        SELECT
          h.id_historico,
          h.id_solicitacao,
          h.descricao,
          h.status,
          h.prioridade,
          TO_CHAR(h.data_alteracao, 'DD/MM/YYYY') AS data_alteracao,
          s.titulo AS titulo_solicitacao
        FROM historico_solicitacoes h
        INNER JOIN solicitacoes s
          ON h.id_solicitacao = s.id_solicitacoes
        WHERE s.id_instituicao = $1
        ORDER BY h.data_alteracao DESC NULLS LAST,
                 h.id_historico DESC
      `;

      const resultado = await BD.query(comando, [idInstituicao]);

      return res.status(200).json(resultado.rows);
    } catch (error) {
      console.error(
        "Erro ao buscar todo o histórico da instituição:",
        error
      );

      return res.status(500).json({
        error: "Erro ao buscar o histórico da instituição.",
      });
    }
  }
);
export default router;
// GET - Listar histórico de solicitações da instituição logada
// router.get(
//   "/historico-instituicao",
//   autenticarToken,
//   autenticarInstituicao,
//   async (req, res) => {
//     try {
//       const id_instituicao = req.instituicao.id_instituicao;

//       const comando = `
//         SELECT
//           h.id_historico,
//           h.id_solicitacao,
//           h.descricao,
//           h.status,
//           h.prioridade,
//           TO_CHAR(h.data_alteracao, 'DD/MM/YYYY') AS data_alteracao,
//           s.titulo AS titulo_solicitacao
//         FROM historico_solicitacoes h
//         INNER JOIN solicitacoes s
//           ON h.id_solicitacao = s.id_solicitacoes
//         WHERE s.id_instituicao = $1
//         ORDER BY h.data_alteracao DESC
//       `;

//       const historico = await BD.query(comando, [id_instituicao]);

//       return res.status(200).json(historico.rows);
//     } catch (error) {
//       console.error(
//         "Erro ao listar histórico da instituição:",
//         error.message
//       );

//       return res.status(500).json({
//         error: "Erro ao listar histórico da instituição.",
//       });
//     }
//   }
// );


