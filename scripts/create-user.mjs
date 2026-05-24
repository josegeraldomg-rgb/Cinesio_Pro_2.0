// Cria o primeiro usuário admin no Supabase
// Execute: node scripts/create-user.mjs

const PROJECT_REF = 'lktkxnwnrdqhxsitowpf'
const SUPABASE_URL = 'https://lktkxnwnrdqhxsitowpf.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrdGt4bnducmRxaHhzaXRvd3BmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQ3Njc2MiwiZXhwIjoyMDk1MDUyNzYyfQ.ctsKsxbs5vVNAI4b3jGWXEGz2IkrxEBpQsbtqJVqjuQ'
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

const EMPRESA_ID = '00000000-0000-0000-0000-000000000001'

const USER_EMAIL = 'josegeraldo.mg@gmail.com'
const USER_PASSWORD = 'Cinesio@2026'
const USER_NOME = 'José Geraldo'

async function createAuthUser() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      email: USER_EMAIL,
      password: USER_PASSWORD,
      email_confirm: true,
      user_metadata: { nome: USER_NOME },
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    if (data.message?.includes('already been registered') || data.code === 'email_exists') {
      console.log('⚠️  Usuário já existe no Auth — buscando ID...')
      return null
    }
    throw new Error(`Auth error: ${JSON.stringify(data)}`)
  }
  return data.id
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
  if (!res.ok) throw new Error(`${res.status}: ${body}`)
  return JSON.parse(body)
}

async function main() {
  console.log('\n👤 Criando usuário admin do CinesioPro...\n')

  // 1. Criar no Supabase Auth
  let userId = await createAuthUser()

  // 2. Se já existe, buscar o ID
  if (!userId) {
    const rows = await runQuery(
      `SELECT id FROM auth.users WHERE email = '${USER_EMAIL}' LIMIT 1`
    )
    userId = rows?.[0]?.id
    if (!userId) throw new Error('Usuário não encontrado no Auth.')
    console.log(`✅ Usuário encontrado: ${userId}`)
  } else {
    console.log(`✅ Usuário criado no Auth: ${userId}`)
  }

  // 3. Inserir na tabela usuarios
  await runQuery(`
    INSERT INTO usuarios (id, empresa_id, nome, email, perfil)
    VALUES (
      '${userId}',
      '${EMPRESA_ID}',
      '${USER_NOME}',
      '${USER_EMAIL}',
      'admin'
    )
    ON CONFLICT (id) DO UPDATE SET
      empresa_id = EXCLUDED.empresa_id,
      nome = EXCLUDED.nome,
      perfil = EXCLUDED.perfil;
  `)

  console.log('✅ Usuário inserido na tabela usuarios')
  console.log('\n══════════════════════════════════════════')
  console.log('🎉 Setup completo!')
  console.log(`\n📧 Email: ${USER_EMAIL}`)
  console.log(`🔑 Senha: ${USER_PASSWORD}`)
  console.log('\n👉 Agora rode: pnpm dev')
  console.log('   Acesse:    http://localhost:3000\n')
}

main().catch(console.error)
