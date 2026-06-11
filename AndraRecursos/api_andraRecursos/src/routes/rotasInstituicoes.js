import { Router } from "express";
import { BD } from "../../db.js";
import bcrypt from 'bcrypt';
import { autenticarToken } from "../middlewares/autenticacao.js";
import jwt from 'jsonwebtoken';

const router = Router();

const SECRET_KEY = 'minha_chave_secreta';

//Rota para listar Instituições
router.get('/instituicoes', autenticarToken, async (req, res) => {
    try {
        const query = `SELECT id_instituicao, nome, email_institucional, senha, cep, telefone, horario_funcionamento, status_instituicao, gestor, secretaria_vinculada, numero, logradouro, bairro FROM instituicoes ORDER BY id_instituicao`;
        const instituicoes = await BD.query(query);
        res.status(200).json(instituicoes.rows);
    } catch (error) {
        console.error('Erro ao listar Instituicoes', error.message);
        res.status(500).json({ error: 'Erro ao listar Instituicoes' });
    }
});

//Rota para cadastrar nova Instituição
router.post('/instituicoes', async (req, res) => {

    const { nome, email_institucional, senha, cep, telefone, horario_funcionamento, status_instituicao, gestor, secretaria_vinculada, numero, logradouro, bairro } = req.body;

    try {
        //definir a força da criptografia
        const saltRounds = 10;
        //gerando a rash da senha
        const senhaCriptografada = await bcrypt.hash(senha, saltRounds);

        const comando = `INSERT INTO instituicoes(nome, email_institucional, senha, cep, telefone, horario_funcionamento, status_instituicao, gestor, secretaria_vinculada, numero, logradouro, bairro) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;
        const valores = [nome, email_institucional, senhaCriptografada, cep, telefone, horario_funcionamento, status_instituicao, gestor, secretaria_vinculada, numero, logradouro, bairro];

        await BD.query(comando, valores);
        console.log(comando, valores);

        return res.status(201).json('Instituição Cadastrada!');
    } catch (error) {
        console.error('Erro ao cadastrar Instituição', error.message);
        return res.status(500).json({ error: 'Erro ao cadastrar Instituição' });
    }
});

//Rota para atualizar uma única Instituição
router.put('/instituicoes/:id_instituicao', async (req, res) => {

    //Id recebido via parametro 
    const { id_instituicao } = req.params;
    //Dados do Usuario via corpo da pagina
    const { nome, email_institucional, senha, cep, telefone, horario_funcionamento, status_instituicao, gestor, secretaria_vinculada, numero, logradouro, bairro } = req.body

    try {

        //Verificar se o usuario existe
        const verificarInstituicao = await BD.query(`SELECT * FROM instituicoes WHERE id_instituicao = $1`, [id_instituicao]);
        if (verificarInstituicao.rows.length === 0) {
            return res.status(404).json({ message: 'Instituição não encontrada' })
        }

        //definir a força da criptografia
        const saltRounds = 10;
        //gerando a rash da senha
        const senhaCriptografada = await bcrypt.hash(senha, saltRounds);

        //Atualiza todos os campos da tabela(PUT substituição completa)
        const comando = `UPDATE instituicoes SET nome = $1, email_institucional = $2, senha = $3, cep = $4, telefone = $5, horario_funcionamento = $6, status_instituicao = $7, gestor = $8, secretaria_vinculada = $9, numero = $10, logradouro = $11, bairro = $12 WHERE id_instituicao = $13`;
        const valores = [ nome, email_institucional, senhaCriptografada, cep, telefone, horario_funcionamento, status_instituicao, gestor, secretaria_vinculada, numero, logradouro, bairro, id_instituicao ];
        await BD.query(comando, valores);

        return res.status(200).json('Instituição atualizada com sucesso!')
    }
    catch (error) {
        console.error('Erro ao atualizar Instituição');
        return res.status(500).json({ error: `Erro ao atualizar Instituição ${error.message}` });
    }
});

//Rota para DELETE -> porém só desativa as Instituições (ARRUMAR)
router.delete('/instituicoes/:id_instituicao', async (req, res) => {

    //Id recebido via parametro 
    const { id_instituicao } = req.params;

    try {
        const comando = `DELETE FROM instituicoes WHERE id_instituicao = $1`;
        await BD.query(comando, [id_instituicao]);
        return res.status(200).json({ message: 'Instituição desativada com sucesso!' });

    } catch (error) {
        console.error('Erro ao desativar Instiuição!', error.message);
        return res.status(500).json({ message: 'Erro interno no servidor' + error.message });
    }
});

//Rota para realização de Login Instituicional
router.post('/login', async (req, res) => {

    const { email_institucional, senha } = req.body;

    //Validação de Entrada
    if (!email_institucional || !senha) {
        return res.status(400).json({ message: 'Campo email e senha são obrigatórios!' });
    }
    try {
        //Buscar Instituição pelo Email institucional
        const comando = `SELECT id_instituicao, nome, email_institucional, senha FROM instituicoes WHERE email_institucional =$1`;
        const resultado = await BD.query(comando, [email_institucional]);

        if (resultado.rows.length === 0) {
            return res.status(401).json({ message: 'Email não encontrado!' });
        };

        const instituicao = resultado.rows[0];
        const senhaCorreta = await bcrypt.compare(senha, instituicao.senha)

        //Verificar Senha se são iguais
        if (!senhaCorreta) {
            return res.status(401).json({ message: 'Senha inválida!' });
        }

        //Gerando token para retornar o ser usado
        const token = jwt.sign(
            { id_instituicao: instituicao.id_instituicao, email_institucional: instituicao.email_institucional, nome: instituicao.nome },
            SECRET_KEY,
            // {expiresIn: '15m'} //Tempo para expirar o token 
        );

        return res.status(200).json({
            message: 'Login realizado com sucesso',
            token: token,
            instituicao: {
                id: instituicao.id_instituicao,
                nome: instituicao.nome,
                email_institucional: instituicao.email_institucional
            }
        });

    } catch (error) {
        console.error('Erro ao realizar Login!', error.message);
        return res.status(500).json({ message: 'Erro interno no servidor' + error.message });
    }
});



export default router;