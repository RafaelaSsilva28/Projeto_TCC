
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

export const bucketDocumentos =
    process.env.SUPABASE_BUCKET || "documentos";
