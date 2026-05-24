import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────
// Admin client (service role) — server-only, ignora RLS.
//
// Use APENAS em Server Actions ou rotas server-side onde a operação
// requer permissões elevadas (criar usuário no Auth, ler metadados
// de outros usuários, etc.). NUNCA importe em código de cliente.
// ─────────────────────────────────────────────────────────────────────
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.')
  }

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
