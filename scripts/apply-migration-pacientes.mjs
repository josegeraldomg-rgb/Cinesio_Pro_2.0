import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_REF  = 'lktkxnwnrdqhxsitowpf'
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!ACCESS_TOKEN) { console.error('Defina SUPABASE_ACCESS_TOKEN'); process.exit(1) }

const sql = readFileSync(
  join(__dirname, '..', 'supabase', 'migrations', '004_pacientes_dependentes.sql'),
  'utf8'
)

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ACCESS_TOKEN}` }, body: JSON.stringify({ query: sql }) }
)
const body = await res.text()
console.log(res.ok ? '✅ Migration 004 aplicada\n' : '❌ Erro:\n' + body)
