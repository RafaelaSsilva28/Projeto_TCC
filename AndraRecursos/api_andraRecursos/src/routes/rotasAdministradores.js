import { Router } from "express";
import { BD } from "../../db.js";
import bcrypt from 'bcrypt';
import { autenticarToken } from "../middlewares/Autenticacao.js";
import jwt from 'jsonwebtoken';

const router = Router();

const SECRET_KEY = 'minha_chave_secreta';

// 1. LISTAR USUÁRIOS (Apenas ativos), autenticando o token chamando a function      
router.get('/administradores', autenticarToken, async (req, res) => {
    try {
        const query = `SELECT id_administrador, nome, email FROM administradores ORDER BY id_administrador`;
        const administradores = await BD.query(query);
        res.status(200).json(administradores.rows);
    } catch (error) {
        console.error('Erro ao listar administradores', error.message); //com virgula
        res.status(500).json({ error: 'Erro ao listar administradores' + error.message }); //com +
    }
});

// 2. CADASTRAR USUÁRIO (POST)
router.post('/administradores', autenticarToken, async (req, res) => {
    const { nome, email, senha } = req.body;

    // Validação de campos obrigatórios
    if (!nome || !email || !senha) {
        return res.status(400).json({ mensagem: "Nome, email e senha são obrigatórios!" });
    }

    try {
        // 1. CORREÇÃO AQUI: Alinhado para buscar 'id_usuario' em vez de 'id'
        const verifEmail = 'SELECT id_administrador FROM administradores WHERE email = $1';
        const id_administradorExistente = await BD.query(verifEmail,[email]);
        
        if (id_administradorExistente.rows.length > 0) {
            return res.status(400).json({ mensagem: "Este e-mail já está em uso." });
        }

        // 2. Criptografa a senha
        const saltRounds = 10;
        const senhaCriptografada = await bcrypt.hash(senha, saltRounds);
        
        // 3. Insere o novo usuário
        const comando = `INSERT INTO administradores (nome, email, senha) VALUES ($1, $2, $3)`;
        const valores = [nome, email, senhaCriptografada];

        await BD.query(comando, valores);
        
        return res.status(201).json({ mensagem: "Administrador cadastrado com sucesso." });

    } catch (error) {
        // Exibe o erro real no terminal do VS Code/Node para monitoramento
        console.error('Erro ao cadastrar administrador:', error.message);
        return res.status(500).json({ mensagem: 'Erro interno ao cadastrar administrador.' + error.message });
    }
});

// 4. ATUALIZAR PARCIAL (PATCH)
router.patch('/administradores/:id_administrador', autenticarToken, async (req, res) => {
    const { id_administrador } = req.params;
    const { nome, email, senha } = req.body;

    try {
        const verificarAdministrador = await BD.query(`SELECT * FROM administradores WHERE id_administrador = $1`, [id_administrador]);
        if (verificarAdministrador.rows.length === 0) {
            return res.status(404).json({ message: 'Administrador não encontrado' });
        }

        const campos = [];
        const valores = [];
        let contador = 1;

        if (nome) {
            campos.push(`nome = $${contador}`);
            valores.push(nome);
            contador++;
        }
        if (email) {
            campos.push(`email = $${contador}`);
            valores.push(email);
            contador++;
        }
        if (senha) {
            const senhaHash = await bcrypt.hash(senha, 10);
            campos.push(`senha = $${contador}`);
            valores.push(senhaHash);
            contador++;
        }

        if (campos.length === 0) {
            return res.status(400).json({ message: "Nenhum campo enviado para atualizar" });
        }

        valores.push(id_administrador);
        const comando = `UPDATE administradores SET ${campos.join(', ')} WHERE id_administrador = $${contador}`;
        await BD.query(comando, valores);

        return res.status(200).json('Usuario atualizado parcialmente');
    } catch (error) {
        console.error('Erro no PATCH', error.message);
        return res.status(500).json({ message: "Erro interno: " + error.message });
    }
});

// 5. DELETAR (FÍSICO - Corrigido para remover o registro do banco definitivamente)
router.delete('/administradores/:id_administrador', autenticarToken, async (req, res) => {
    const { id_administrador } = req.params;
    try {

        // Verificar se a Solicitação existe antes de tentar deletar
        const verificarAdministrador = await BD.query(
            `SELECT * FROM administradores WHERE id_administrador = $1`,
            [id_administrador]
        );

        if (verificarAdministrador.rows.length === 0) {
            return res.status(404).json({ message: "Administrador não encontrado!" });
        }

        const comando = `DELETE FROM administradores WHERE id_administrador = $1`;
        await BD.query(comando, [id_administrador]);
        return res.status(200).json({ message: "Administrador deletado com sucesso" });
    } catch (error) {
        console.error('Erro ao deletar administrador', error.message);
        return res.status(500).json({ message: "Erro interno ao deletar" + error.message });
    }
});

// // 6. LOGIN (Versão Corrigida)
// router.post('/login', async (req, res) => {
//     const { email, senha } = req.body;

//     if (!email || !senha) {
//         return res.status(400).json({ message: 'Email e senha são obrigatórios' });
//     }

//     try {
//         const comando = 'SELECT * FROM administradores WHERE email = $1';
//         const resultado = await BD.query(comando, [email]);


//         if (resultado.rows.length === 0) {
//             return res.status(401).json({ message: 'Administrador não encontrado' });
//         }

//         // CORREÇÃO: Pegando o primeiro item do array rows [0]
//         const administrador = resultado.rows[0]; 
        
//         // Agora administrador.senha terá a hash '$2b$10$...' válida
//         const senhaCorreta = await bcrypt.compare(senha, administrador.senha);

//         if (!senhaCorreta) {
//             return res.status(401).json({ message: 'Senha inválida' });
//         }

//         // GERANDO TOKEN
//         const token = jwt.sign(
//             { id_administrador: administrador.id_administrador, email: administrador.email },
//             SECRET_KEY
//         );

//         return res.status(200).json({
//             message: 'Login realizado com sucesso',
//             token: token,
//             usuario: { id: administrador.id_administrador, nome: administrador.nome, email: administrador.email }
//         });
//     } catch (error) {
//         // Exibe o log técnico detalhado no terminal para sabermos exatamente o motivo caso falhe
//         console.error('Erro detalhado no Login:', error);
//         return res.status(500).json({ message: 'Erro interno no servidor', erro: error.message });
//     }
// });

// LOGIN - verificando Admin OU Instituição
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    try {
        // Primeiro tenta achar como Administrador
        let comando = 'SELECT * FROM administradores WHERE email = $1';
        let resultado = await BD.query(comando, [email]);

        let usuario = null;
        let tipo = null;

        if (resultado.rows.length > 0) {
        usuario = resultado.rows[0];
        tipo = 'Administrador';
        } else {
        // Se não achou, tenta como Instituição
        comando = 'SELECT * FROM instituicoes WHERE email_institucional = $1';
        resultado = await BD.query(comando, [email]);

        if (resultado.rows.length > 0) {
            usuario = resultado.rows[0];
            tipo = 'Instituicao';
        }
        }

        if (!usuario) {
        return res.status(401).json({ message: 'Usuário não encontrado!' });
        }

        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
        if (!senhaCorreta) {
        return res.status(401).json({ message: 'Senha inválida' });
        }

        // Gera token
        const token = jwt.sign(
        { id: usuario.id_administrador || usuario.id_instituicao, tipo },
        SECRET_KEY
        );

        return res.status(200).json({
        message: 'Login realizado com sucesso',
        token,
        usuario: {
            id: usuario.id_administrador || usuario.id_instituicao,
            nome: usuario.nome,
            email: usuario.email || usuario.email_institucional,
            tipo
        }
        });
    } catch (error) {
        console.error('Erro detalhado no Login:', error);
        return res.status(500).json({ message: 'Erro interno no servidor', erro: error.message });
    }
});



export default router;