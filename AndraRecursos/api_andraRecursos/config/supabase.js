
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
        "Configure SUPABASE_URL e SUPABASE_SECRET_KEY no arquivo .env ou nas variáveis de ambiente da Vercel."
    );
}

export const supabase = createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    }
);


export async function testarConexaoSupabase() {
  const baseUrl = process.env.SUPABASE_URL?.trim();

  try {
    const url = new URL(baseUrl);
    const endpoint = `${url.origin}/storage/v1/bucket`;

    console.log("[TESTE SUPABASE] Iniciando:", {
      protocolo: url.protocol,
      hostname: url.hostname,
      endpoint: `${url.origin}/storage/v1/bucket`,
    });

    const resposta = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: process.env.SUPABASE_SECRET_KEY,
      },
      signal: AbortSignal.timeout(10000),
    });

    console.log("[TESTE SUPABASE] Resultado:", {
      status: resposta.status,
      ok: resposta.ok,
    });

    return {
      status: resposta.status,
      ok: resposta.ok,
    };
  } catch (error) {
    console.error("[TESTE SUPABASE] Falha:", {
      message: error.message,
      cause: error.cause?.message,
      code: error.cause?.code,
      name: error.cause?.name,
    });

    return {
      erro: error.message,
      causa: error.cause?.message,
      codigo: error.cause?.code,
    };
  }
}


export const bucketDocumentos =
    process.env.SUPABASE_BUCKET || "documentos";
