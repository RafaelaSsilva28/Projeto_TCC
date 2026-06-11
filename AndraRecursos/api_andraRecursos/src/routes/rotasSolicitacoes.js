import { Router } from "express";
import { BD } from "../../db.js";
import bcrypt from "bcrypt";
import { autenticarToken } from "../middlewares/autenticacao.js";
import jwt from "jsonwebtoken";

const router = Router();

//Rota para listar Solicitações
router.get('/solicitacoes', async (req, res) => {
    try {
        const comando = `
                SELECT 
                    s.id_solicitacoes,
                    s.titulo,
                    s.descricao,
                    s.prioridade,
                    s.setor,
                    s.status,
                    TO_CHAR(s.data_pedido, 'DD/MM/YYYY HH24:MI') AS data_pedido,
                    i.nome AS nome_instituicao
                FROM solicitacoes s
                LEFT JOIN instituicoes i 
                ON s.id_instituicao = i.id_instituicao`;

        //Cria uma variável para receber o retorno do SQL
        const resultado = await BD.query(comando)

        //Retorno para a pagina, o json com os dados buscados do SQL
        res.status(200).json(resultado.rows);

        console.log("BATEU NA ROTA DE SOLICITAÇÕES");
    }
    catch (error) {
        console.error('Erro ao listar Solicitações', error.message);
        res.status(500).json({ error: 'Erro ao listar Solicitações' + error.message })
    }
});

//Rota para listar Solicitações com base na sua Prioridade (alta, média ou baixa)
router.get(`/solicitacoes/prioridade/:prioridade`, async (req, res) => {
    const { prioridade } = req.params; //filtrar por prioridade
    try {
        const comando = `
                SELECT *
                FROM solicitacoes
                WHERE prioridade = $1`;

        const resultado = await BD.query(comando, [prioridade]);
        console.log(resultado.rows);

        return res.status(200).json(resultado.rows) //se tiver um valor ele retorna um, caso não, retorna 0
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
});

//Rota para listar Solicitações com base no Setor (TI, Almoxarifado)
router.get(`/solicitacoes/setor/:setor`, async (req, res) => {
    const { setor } = req.params; //filtrar com base em seu setor
    try {
        const comando = `
                SELECT *
                FROM solicitacoes
                WHERE setor = $1`;

        const resultado = await BD.query(comando, [setor]);
        console.log(resultado.rows);

        return res.status(200).json(resultado.rows) //se tiver um valor ele retorna um, caso não, retorna 0
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
}); // - - - - TALVEZ ESSA ROTA NAO PRECISE - ANALISAR DEPOIS!

//Rota para listar Solicitações com base no Status (Pendente, Em Andamento, Atendido)
router.get(`/solicitacoes/status/:status`, async (req, res) => {
    const { status } = req.params; //filtrar com base em seu status
    try {
        const comando = `
                SELECT *
                FROM solicitacoes
                WHERE status = $1`;

        const resultado = await BD.query(comando, [status]);
        console.log(resultado.rows);

        return res.status(200).json(resultado.rows) //se tiver um valor ele retorna um, caso não, retorna 0
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
});

//Rota para cadastrar nova Solicitação
router.post('/solicitacoes', async (req, res) => {

    const { titulo, descricao, prioridade, setor, status, data_pedido, id_instituicao } = req.body;

    try {

        const comando = `INSERT INTO solicitacoes(titulo, descricao, prioridade, setor, status, data_pedido, id_instituicao) 
            VALUES($1, $2, $3, $4, $5, $6, $7)`;
        const valores = [ titulo, descricao, prioridade, setor, status, data_pedido, id_instituicao];

        await BD.query(comando, valores);
        console.log(comando, valores);

        return res.status(201).json('Solicitação Cadastrada!');
    } catch (error) {
        console.error('Erro ao cadastrar Solicitação', error.message);
        return res.status(500).json({ error: 'Erro ao cadastrar Solicitação' });
    }
});

//Atualizar apenas o Status da Solicitação - indicando se foi atendido ou não
router.patch('/solicitacoes/:id_solicitacoes/status', async (req, res) => {

    //Id recebido via parametro 
    const { id_solicitacoes } = req.params;
    //Dados da Solicitação via corpo da pagina
    const { status } = req.body

    try {

        //Verificar se a Solicitação existe
        const verificarSolicitacao = await BD.query(
            `SELECT * FROM solicitacoes WHERE id_solicitacoes = $1
            `, [id_solicitacoes]);
        
            if (verificarSolicitacao.rows.length === 0) {
            return res.status(404).json({ message: 'Solicitação não encontrada!' })
        }

        //Atualiza parcialmente os campos da tabela de Solicitações!
        const comando = `UPDATE solicitacoes SET status = $1 
        WHERE id_solicitacoes = $2;`;

        const valores = [ status, id_solicitacoes ];
        await BD.query(comando, valores);

        return res.status(200).json('Solicitação atualizada com sucesso!')
    }
    catch (error) {
        console.error('Erro ao atualizar Solicitação!', error.message);
        return res.status(500).json({ error: `Erro ao atualizar Solicitação ${error.message}` });
    }
});

//Deletar Solicitações
router.delete('/solicitacoes/:id_solicitacoes', async (req, res) => {

    //Id recebido via parametro 
    const { id_solicitacoes } = req.params;

    try {
        const comando = `DELETE FROM solicitacoes WHERE id_solicitacoes = $1`
        await BD.query(comando, [id_solicitacoes]);
        return res.status(200).json({ message: 'Solicitação foi removida com sucesso!' });

    } catch (error) {
        console.error('Erro ao deletar Solicitação!', error.message);
        return res.status(500).json({ message: 'Erro interno no servidor' + error.message });
    }
});

export default router;
