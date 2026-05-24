// CinesioPro · aplica a migration 001 (servicos / categorias)
// Uso:
//   $env:SUPABASE_ACCESS_TOKEN="sbp_..."
//   node scripts/apply-migration-servicos.mjs

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PROJECT_REF  = 'lktkxnwnrdqhxsitowpf'
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

if (!ACCESS_TOKEN) {
  console.error('\n❌ Defina SUPABASE_ACCESS_TOKEN no ambiente.\n')
  process.exit(1)
}

const sql = readFileSync(
  join(__dirname, '..', 'supabase', 'migrations', '001_servicos_categorias.sql'),
  'utf8'
)

async function runQuery(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query }),
    }
  )
  const body = await res.text()
  if (!res.ok) throw new Error(`${res.status}: ${body.slice(0, 300)}`)
  return body
}

console.log('\n🚀 Aplicando migration 001 — Serviços & Categorias\n')

try {
  await runQuery(sql)
  console.log('✅ Migration aplicada com sucesso!\n')
  console.log('   - Tabela categorias_servicos criada')
  console.log('   - Colunas categoria_id, permite_agendamento_online e icone adicionadas em servicos')
  console.log('   - 6 categorias padrão inseridas')
  console.log('   - RLS habilitada\n')
} catch (err) {
  console.error('❌ Erro:', err.message)
  process.exit(1)
}
