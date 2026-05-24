// CinesioPro — Aplicar schema via Supabase Management API
// Requer: SUPABASE_ACCESS_TOKEN (Personal Access Token)
//
// Para gerar o token:
//   1. Acesse: https://supabase.com/dashboard/account/tokens
//   2. Clique em "Generate new token"
//   3. Copie o token (começa com sbp_...)
//   4. Execute: $env:SUPABASE_ACCESS_TOKEN="sbp_..." ; node scripts/apply-schema.mjs

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PROJECT_REF = 'lktkxnwnrdqhxsitowpf'
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

if (!ACCESS_TOKEN) {
  console.error('\n❌ Variável SUPABASE_ACCESS_TOKEN não definida.')
  console.error('\nGere o token em: https://supabase.com/dashboard/account/tokens')
  console.error('\nDepois execute:')
  console.error('  $env:SUPABASE_ACCESS_TOKEN="sbp_seu_token_aqui"')
  console.error('  node scripts/apply-schema.mjs\n')
  process.exit(1)
}

const sqlPath = join(__dirname, '..', 'supabase', 'schema.sql')
const fullSql = readFileSync(sqlPath, 'utf8')

// Quebra o SQL em statements, respeitando dollar-quoting ($$)
function splitStatements(sql) {
  const statements = []
  let current = ''
  let inDollarQuote = false

  for (const line of sql.split('\n')) {
    const trimmed = line.trim()
    if (!current.trim() && (trimmed.startsWith('--') || trimmed === '')) continue

    current += line + '\n'

    // Dollar-quoting toggle
    const matches = line.match(/\$\$|\$\w+\$/g) || []
    for (const m of matches) {
      inDollarQuote = !inDollarQuote
    }

    if (!inDollarQuote && trimmed.endsWith(';')) {
      const stmt = current.trim()
      if (stmt && stmt !== ';') statements.push(stmt)
      current = ''
    }
  }
  if (current.trim()) statements.push(current.trim())
  return statements
}

async function runQuery(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  )

  const body = await res.text()
  if (!res.ok) throw new Error(`${res.status}: ${body.slice(0, 200)}`)
  return body
}

// Alguns erros são aceitáveis (tabela já existe, etc.)
function isIgnorable(msg) {
  return (
    msg.includes('already exists') ||
    msg.includes('duplicate key') ||
    msg.includes('does not exist') ||
    msg.includes('permission denied to create extension')
  )
}

async function main() {
  console.log('\n🚀 CinesioPro — Aplicando schema no Supabase...')
  console.log(`📡 Projeto: ${PROJECT_REF}\n`)

  const statements = splitStatements(fullSql)
  console.log(`📋 ${statements.length} statements encontrados\n`)

  let ok = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    const preview = stmt.replace(/[\n\s]+/g, ' ').slice(0, 65)

    try {
      await runQuery(stmt)
      console.log(`✅ [${i + 1}/${statements.length}] ${preview}`)
      ok++
    } catch (err) {
      const msg = String(err.message)
      if (isIgnorable(msg)) {
        console.log(`⏭️  [${i + 1}/${statements.length}] Já existe, pulando`)
        skipped++
      } else {
        console.error(`❌ [${i + 1}/${statements.length}] ERRO: ${msg.slice(0, 120)}`)
        errors++
      }
    }
  }

  console.log('\n══════════════════════════════════════════')
  console.log(`✅ OK: ${ok} | ⏭️  Pulados: ${skipped} | ❌ Erros: ${errors}`)

  if (errors === 0) {
    console.log('\n🎉 Schema aplicado com sucesso!')
    console.log('👉 Próximo passo: pnpm dev\n')
  } else {
    console.log('\n⚠️  Verifique os erros acima.\n')
  }
}

main().catch(console.error)
