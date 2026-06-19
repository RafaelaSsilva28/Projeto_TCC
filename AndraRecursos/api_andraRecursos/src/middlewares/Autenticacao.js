import jwt from 'jsonwebtoken';

//Assinatura do Servidor - só o servidor tem essa chave
const SECRET_KEY = 'minha_chave_secreta'

export function autenticarToken(req, res, next){
    const cabecalho = req.headers['authorization']

    //extrair o token, que por padrão vem no formato BEARER
    //bearer ihsifokijsdosjido
    //token = ihsifokijsdosjido
    const token = cabecalho && cabecalho.split(' ')[1]

    //validação se o token está autorizado - Irá exibir essa mensagem
    if(!token){
        return res.status(401).json({message: `Token não fornecido!`})
    }

    //caso o token seja valido e se a assinatura for igual a secret_key
    //ele permite o acesso
    jwt.verify(token, SECRET_KEY, (error, usuario) =>{
        //token é válido ou se expirou 
        if(error){
            return res.status(403).json({message: `Token inválido ou expirado`})
        }

        req.usuario = usuario
        
        //Passa para a próxima função ou rota
        next()
    })
}