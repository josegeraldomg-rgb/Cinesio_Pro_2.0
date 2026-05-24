// CinesioPro · aplica a migration 002 (horários de funcionamento)
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
  join(__dirname, '..', 'supabase', 'migrations', '002_horarios_funcionamento.sql'),
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

console.log('\n🚀 Aplicando migration 002 — Horários de Funcionamento\n')

try {
  await runQuery(sql)
  console.log('✅ Migration aplicada com sucesso!\n')
  console.log('   - disponibilidade_profissional: + empresa_id, intervalo_minutos')
  console.log('   - Backfill de empresa_id concluído')
  console.log('   - RLS habilitada em disponibilidade_profissional e folgas_ferias')
  console.log('   - Índices criados\n')
} catch (err) {
  console.error('❌ Erro:', err.message)
  process.exit(1)
}
