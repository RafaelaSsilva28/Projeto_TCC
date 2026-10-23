
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// ============================================
// CONFIGURAÇÕES DO SUPABASE
// ============================================

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    "Configure SUPABASE_URL e SUPABASE_SECRET_KEY no arquivo .env ou nas variáveis de ambiente da Vercel."
  );
}

// Validar a URL sem exibir informações secretas.
try {
  const url = new URL(supabaseUrl);

  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("A URL do Supabase deve utilizar HTTPS.");
  }
} catch (error) {
  throw new Error(
    `SUPABASE_URL inválida: ${error.message}`
  );
}

// ============================================
// CLIENTE SUPABASE
// ============================================

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

// ============================================
// BUCKET DE DOCUMENTOS
// ============================================

export const bucketDocumentos =
  process.env.SUPABASE_BUCKET?.trim() || "documentos";

// ============================================
// TESTAR CONEXÃO COM O STORAGE
// ============================================


export async function testarConexaoSupabase() {
  const endpoint = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/bucket`;

  console.log("[TESTE SUPABASE] Iniciando:", {
    hostname: new URL(supabaseUrl).hostname,
    bucket: bucketDocumentos,
  });

  try {
    const resposta = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: supabaseSecretKey,
        Authorization: `Bearer ${supabaseSecretKey}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    console.log("[TESTE SUPABASE] Resultado:", {
      status: resposta.status,
      ok: resposta.ok,
      texto: (await resposta.text()).slice(0, 300),
    });
  } catch (error) {
    console.error("[TESTE SUPABASE] Falha de rede:", {
      message: error?.message,
      name: error?.name,
      cause: error?.cause
        ? {
            message: error.cause.message,
            code: error.cause.code,
            name: error.cause.name,
            hostname: error.cause.hostname,
            syscall: error.cause.syscall,
          }
        : null,
    });
  }
}
