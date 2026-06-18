import { Router } from "express";
import { BD } from "../../db.js";
import jwt from "jsonwebtoken";
import { autenticarToken } from "../middlewares/autenticacao.js";

const router = Router();

// 1. LISTAR NOTIFICAÇÕES (Corrigido e alinhado)
router.get('/notificacoes', autenticarToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                id_notificacao,
                mensagem,
                tipo_informacao,
                id_administrador
            FROM notificacoes
            ORDER BY id_notificacao
        `;
        const resultado = await BD.query(query);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Erro ao listar notificacoes:', error.message);
        res.status(500).json({ error: 'Erro ao listar notificacoes' + error.message });
    }
});

// 2. CRIAR NOTIFICAÇÃO (POST)
router.post('/notificacoes', autenticarToken, async (req, res) => {
    const { mensagem, tipo_informacao, id_administrador } = req.body;

    // Validação básica (id_notificacao removido por ser SERIAL)
    if (!mensagem || !tipo_informacao || !id_administrador) {
        return res.status(400).json({ message: 'Mensagem, tipo_informacao e id_administrador são obrigatórios' });
    }

    try {
        const comando = `
            INSERT INTO notificacoes (mensagem, tipo_informacao, id_administrador)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const valores = [mensagem, tipo_informacao, id_administrador];
        const resultado = await BD.query(comando, valores);

        return res.status(201).json({
            message: 'Notificacao criada com sucesso!',
            notificacao: resultado.rows[0]
        });
    } catch (error) {
        console.error('Erro ao criar notificacao:', error.message);
        return res.status(500).json({ error: 'Erro ao criar notificacao' + error.message });
    }
});

// 4. ATUALIZAÇÃO PARCIAL (PATCH)
router.patch('/notificacoes/:id_notificacao', autenticarToken, async (req, res) => {
    const { id_notificacao } = req.params;
    const { mensagem, tipo_informacao, id_administrador } = req.body;

    try {
        const verificar = await BD.query(
            `SELECT * FROM notificacoes WHERE id_notificacao = $1`,
            [id_notificacao]
        );

        if (verificar.rows.length === 0) {
            return res.status(404).json({ message: 'Notificacao não encontrada' + error.message });
        }

        const campos = [];
        const valores = [];
        let contador = 1;

        if (mensagem) {
            campos.push(`mensagem = $${contador}`);
            valores.push(mensagem);
            contador++;
        }

        if (tipo_informacao) {
            campos.push(`tipo_informacao = $${contador}`);
            valores.push(tipo_informacao);
            contador++;
        }

        if (id_administrador) {
            campos.push(`id_administrador = $${contador}`);
            valores.push(id_administrador);
            contador++;
        }

        if (campos.length === 0) {
            return res.status(400).json({ message: "Nenhum campo enviado para atualizar" + error.message });
        }

        valores.push(id_notificacao);

        const comando = `
            UPDATE notificacoes
            SET ${campos.join(', ')}
            WHERE id_notificacao = $${contador}
        `;

        await BD.query(comando, valores);
        return res.status(200).json('Notificacao atualizada parcialmente');
    } catch (error) {
        console.error('Erro no PATCH:', error.message);
        return res.status(500).json({ message: "Erro interno: " + error.message });
    }
});

// 5. DELETAR (FÍSICO - Corrigido para remover o registro do banco definitivamente)
router.delete('/notificacoes/:id_notificacao', autenticarToken, async (req, res) => {
    const { id_notificacao } = req.params;
    try {
        const comando = `DELETE FROM notificacoes WHERE id_notificacao = $1`;
        await BD.query(comando, [id_notificacao]);
        return res.status(200).json({ message: "Notificação deletada com sucesso" });
    } catch (error) {
        console.error('Erro ao deletar snotificação', error.message);
        return res.status(500).json({ message: "Erro interno ao deletar" + error.message });
    }
});

export default router;
