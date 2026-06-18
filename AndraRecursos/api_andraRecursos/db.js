import {Pool} from 'pg';

const BD = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'andrarecursos',
    port: 5432,
    password: 'admin'
});

// const BD = new Pool({
//     connectionString: 'postgres://postgres.abxjvaazhhlqprkwznbb:6ExKDA6thg62l0gG@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
//     ssl:{rejectUnauthorized: false}
// });

const testarConexao = async () => {
    try{
        const cliente = await BD.connect();
        console.log(' ✅ CONEXÃO REALIZADA COM SUCESSO ✅ ');
        cliente.release();
    }
    catch(error){
        console.error(' ❌ ERRO AO CONECTAR AO BANCO DE DADOS ❌ ', error.message);
        
    }
};

export {BD, testarConexao}