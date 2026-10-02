import "dotenv/config";
import { Pool } from "pg";

const BD = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const testarConexao = async () => {
    try {
        const cliente = await BD.connect();

        console.log("✅ CONEXÃO REALIZADA COM SUCESSO");

        cliente.release();
    } catch (error) {
        console.error(
            "❌ ERRO AO CONECTAR AO BANCO DE DADOS:",
            error.message
        );
    }
};

export { BD, testarConexao };