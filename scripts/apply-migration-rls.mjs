// CinesioPro · aplica migration 003 (fix RLS recursivo)
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
  join(__dirname, '..', 'supabase', 'migrations', '003_fix_rls_usuarios.sql'),
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
  if (!res.ok) throw new Error(`${res.status}: ${body.slice(0, 500)}`)
  return body
}

console.log('\n🚀 Aplicando migration 003 — Fix RLS recursivo em usuarios\n')

try {
  await runQuery(sql)
  console.log('✅ Migration aplicada com sucesso!\n')
  console.log('   - Function public.current_empresa_id() criada (SECURITY DEFINER)')
  console.log('   - Policies de usuarios reescritas (sem recursão)')
  console.log('   - Policies dependentes atualizadas para usar a function')
  console.log('   - profissionais, pacientes, agendamentos, prontuarios, servicos, salas')
  console.log('   - categorias_servicos, disponibilidade_profissional, folgas_ferias')
  console.log('   - servico_profissional (RLS via JOIN com servicos)\n')
} catch (err) {
  console.error('❌ Erro:', err.message)
  process.exit(1)
}
