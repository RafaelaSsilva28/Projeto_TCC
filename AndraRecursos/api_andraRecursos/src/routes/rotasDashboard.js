import { Router } from 'express';
import { BD } from '../../db.js';
import jwt from 'jsonwebtoken';
import { autenticarToken } from '../middlewares/Autenticacao.js'

const router = Router();
const SECRET_KEY = "minha_chave_secreta";

//Transações por Categoria
router.get(`/dashboard`, async (req, res) => {
    try { 

        //Solicitações Recentes
        const selecaoSolicitacoes = 

        //Notificações e Alertas
        const selecaoNotificações = 
        

        //Solicitações em Ativa 
        const selecaoSolicitacoesAtivas =

    

        const resSolicitacoes = await BD.query(selecaoSolicitacoes)
        const resNotificacoes = await BD.query(selecaoNotificações)
        const resSolicitacoesAtivas = await BD.query(selecaoSolicitacoesAtivas)
        

        //Objeto com todos os Dados
        const dadosDashboard = {
            resumoSolicitacoes: resSolicitacoes.rows,
            resumoNotificacoes: resNotificacoes.rows,
            resumoSolicitacoesAtivas: resSolicitacoesAtivas.rows
        }

        return res.status(200).json(dadosDashboard)
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }

});

export default router;

