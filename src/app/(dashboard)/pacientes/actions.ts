'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { enviarMensagem, msgConviteCompletarCadastro } from '@/lib/whatsapp'

// ────────────────────────────────────────────
// Helper: contexto autenticado + empresa
// ────────────────────────────────────────────
async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' as const }

  const admin = createAdminClient()
  let { data: me } = await admin
    .from('usuarios')
    .select('empresa_id, perfil, id, email')
    .eq('id', user.id)
    .maybeSingle()

  if (!me && user.email) {
    const r = await admin
      .from('usuarios')
      .select('empresa_id, perfil, id, email')
      .eq('email', user.email)
      .maybeSingle()
    me = r.data ?? null
  }

  if (!me) return { error: 'Empresa do usuário não identificada.' as const }

  // Busca o nome da empresa para mensagens
  const { data: emp } = await admin
    .from('empresas')
    .select('nome')
    .eq('id', me.empresa_id)
    .single()

  return { admin, empresa_id: me.empresa_id, perfil: me.perfil, empresaNome: emp?.nome ?? 'a clínica' }
}

// ════════════════════════════════════════════
//             CADASTRO COMPLETO
// ════════════════════════════════════════════
export async function salvarPacienteAction(formData: FormData) {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const id                  = String(formData.get('id') ?? '') || null
  const nome                = String(formData.get('nome') ?? '').trim()
  const cpf                 = String(formData.get('cpf') ?? '').replace(/\D/g, '') || null
  const email               = String(formData.get('email') ?? '').trim().toLowerCase() || null
  const data_nascimento     = String(formData.get('data_nascimento') ?? '') || null
  const sexo_biologico      = String(formData.get('sexo_biologico') ?? '') || null
  const isDependente        = formData.get('dependente') === 'on'
  const responsavel_id      = isDependente ? (String(formData.get('responsavel_id') ?? '') || null) : null
  const contato_emergencia  = String(formData.get('contato_emergencia') ?? '').trim() || null
  const observacoes         = String(formData.get('observacoes') ?? '').trim() || null

  // Telefone/DDI: para dependentes, sempre herda do responsável (campos vêm disabled
  // do form e não chegam aqui). Para titulares, lê o que o usuário digitou.
  let ddi      = String(formData.get('ddi') ?? '55')
  let telefone = String(formData.get('telefone') ?? '').replace(/\D/g, '')

  if (isDependente && responsavel_id) {
    const { data: resp } = await admin
      .from('pacientes')
      .select('ddi, telefone')
      .eq('id', responsavel_id)
      .single()
    if (resp) {
      ddi      = resp.ddi ?? '55'
      telefone = resp.telefone ?? ''
    }
  }

  // endereço
  const cep      = String(formData.get('cep') ?? '').replace(/\D/g, '') || null
  const rua      = String(formData.get('rua') ?? '').trim() || null
  const numero   = String(formData.get('numero') ?? '').trim() || null
  const bairro   = String(formData.get('bairro') ?? '').trim() || null
  const cidade   = String(formData.get('cidade') ?? '').trim() || null
  const estado   = String(formData.get('estado') ?? '').trim().toUpperCase() || null
  const endereco = cep || rua || numero || bairro || cidade || estado
    ? { cep, rua, numero, bairro, cidade, estado }
    : {}

  if (!nome) return { error: 'Informe o nome do paciente.' }
  if (isDependente && !responsavel_id) {
    return { error: 'Selecione o responsável para este dependente.' }
  }
  // Telefone é obrigatório apenas para titulares — dependentes herdam o do responsável.
  if (!isDependente && !telefone) {
    return { error: 'Telefone é obrigatório.' }
  }

  const payload: any = {
    empresa_id,
    nome,
    cpf,
    email,
    data_nascimento,
    sexo_biologico,
    responsavel_id,
    ddi,
    telefone,
    contato_emergencia,
    observacoes,
    endereco,
    status: 'ativo',
  }

  let res
  if (id) {
    res = await admin.from('pacientes').update(payload).eq('id', id).select('id').single()
  } else {
    res = await admin.from('pacientes').insert(payload).select('id').single()
  }
  if (res.error) return { error: res.error.message }

  // Cria conta de usuário se tiver email real
  if (!id && email) {
    await criarUsuarioPaciente({ admin, empresa_id, nome, email, pacienteId: res.data!.id })
  }

  revalidatePath('/pacientes')
  return { success: true, id: res.data?.id }
}

// ════════════════════════════════════════════
//          CADASTRO RÁPIDO (NOME + TEL)
// ════════════════════════════════════════════
export async function criarPacienteRapidoAction(formData: FormData) {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id, empresaNome } = ctx

  const nome     = String(formData.get('nome') ?? '').trim()
  const ddi      = String(formData.get('ddi') ?? '55')
  const telefone = String(formData.get('telefone') ?? '').replace(/\D/g, '')
  const enviar   = formData.get('enviar_completar') === 'on'

  if (!nome) return { error: 'Informe o nome do paciente.' }
  if (!telefone) return { error: 'Telefone é obrigatório.' }

  // Gera token único para auto-completar (válido 7 dias)
  const token = randomUUID()
  const expires = new Date()
  expires.setDate(expires.getDate() + 7)

  const { data: paciente, error } = await admin.from('pacientes').insert({
    empresa_id,
    nome,
    ddi,
    telefone,
    status: 'ativo',
    token_completar: token,
    token_expires_at: expires.toISOString(),
  }).select('id').single()

  if (error) return { error: error.message }

  // Gera link público de auto-completar
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL
    ?? process.env.NEXT_PUBLIC_SITE_URL
    ?? 'http://localhost:3000'
  const link = `${baseUrl}/app/completar/${token}`

  let waResult: { link: string; enviado: boolean; erro?: string } | null = null

  if (enviar) {
    const mensagem = msgConviteCompletarCadastro({
      nomePaciente: nome.split(' ')[0],
      nomeClinica: empresaNome,
      link,
    })
    waResult = await enviarMensagem({ ddi, telefone, mensagem })
  }

  revalidatePath('/pacientes')
  return {
    success: true,
    id: paciente?.id,
    link,
    whatsapp: waResult,
  }
}

// ════════════════════════════════════════════
//         AUTO-COMPLETAR (PÚBLICO)
// ════════════════════════════════════════════
//
// Chamado da página /app/completar/[token] — sem auth.
// Valida token, atualiza dados, cria conta de usuário com convite.
// ────────────────────────────────────────────
export async function completarCadastroViaTokenAction(formData: FormData) {
  const admin = createAdminClient()
  const token = String(formData.get('token') ?? '')
  if (!token) return { error: 'Token ausente.' }

  // Valida o token
  const { data: paciente } = await admin
    .from('pacientes')
    .select('id, empresa_id, nome, ddi, telefone, token_expires_at')
    .eq('token_completar', token)
    .maybeSingle()

  if (!paciente) return { error: 'Link inválido ou já utilizado.' }
  if (paciente.token_expires_at && new Date(paciente.token_expires_at) < new Date()) {
    return { error: 'Esse link expirou. Solicite um novo à clínica.' }
  }

  const email           = String(formData.get('email') ?? '').trim().toLowerCase()
  const cpf             = String(formData.get('cpf') ?? '').replace(/\D/g, '') || null
  const data_nascimento = String(formData.get('data_nascimento') ?? '') || null
  const sexo_biologico  = String(formData.get('sexo_biologico') ?? '') || null

  const cep      = String(formData.get('cep') ?? '').replace(/\D/g, '') || null
  const rua      = String(formData.get('rua') ?? '').trim() || null
  const numero   = String(formData.get('numero') ?? '').trim() || null
  const bairro   = String(formData.get('bairro') ?? '').trim() || null
  const cidade   = String(formData.get('cidade') ?? '').trim() || null
  const estado   = String(formData.get('estado') ?? '').trim().toUpperCase() || null

  if (!email) return { error: 'Email é obrigatório.' }

  const { error: updErr } = await admin.from('pacientes').update({
    email, cpf, data_nascimento, sexo_biologico,
    endereco: { cep, rua, numero, bairro, cidade, estado },
    token_completar: null,
    token_expires_at: null,
    lgpd_consentimento: true,
    lgpd_data: new Date().toISOString(),
  }).eq('id', paciente.id)

  if (updErr) return { error: updErr.message }

  // Cria conta de usuário com convite por email (perfil paciente)
  await criarUsuarioPaciente({
    admin,
    empresa_id: paciente.empresa_id,
    nome: paciente.nome,
    email,
    pacienteId: paciente.id,
  })

  return { success: true }
}

// ════════════════════════════════════════════
//                EXCLUIR
// ════════════════════════════════════════════
export async function excluirPacienteAction(id: string) {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin } = ctx

  const { error } = await admin.from('pacientes').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/pacientes')
  return { success: true }
}

// ════════════════════════════════════════════
//   Helper interno: cria/vincula usuario paciente
// ════════════════════════════════════════════
async function criarUsuarioPaciente(opts: {
  admin: ReturnType<typeof createAdminClient>
  empresa_id: string
  nome: string
  email: string
  pacienteId: string
}) {
  const { admin, empresa_id, nome, email, pacienteId } = opts

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // 1) Já existe um usuario com esse email?
  const { data: existing } = await admin
    .from('usuarios')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  let usuario_id: string | null = existing?.id ?? null

  if (!usuario_id) {
    // 2) Tenta convite (magic link p/ definir senha)
    const inviteRes = await fetch(`${SUPABASE_URL}/auth/v1/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE}`,
        'apikey': SERVICE_ROLE,
      },
      body: JSON.stringify({ email, data: { nome, perfil_inicial: 'paciente' } }),
    })
    const inviteData = await inviteRes.json()

    if (inviteRes.ok) {
      usuario_id = inviteData.id
    } else {
      // 3) Fallback: cria diretamente com senha temp
      const senhaTemp = Math.random().toString(36).slice(-12) + 'A1!'
      const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE}`,
          'apikey': SERVICE_ROLE,
        },
        body: JSON.stringify({
          email,
          password: senhaTemp,
          email_confirm: true,
          user_metadata: { nome, precisa_definir_senha: true },
        }),
      })
      const createData = await createRes.json()
      if (createRes.ok) usuario_id = createData.id
    }

    if (usuario_id) {
      const { error: insErr } = await admin.from('usuarios').insert({
        id: usuario_id,
        empresa_id,
        nome,
        email,
        perfil: 'paciente',
      })
      if (insErr && !insErr.message.includes('duplicate')) {
        return { error: insErr.message }
      }
    }
  }

  // 4) Vincula no paciente
  if (usuario_id) {
    await admin.from('pacientes').update({ usuario_id }).eq('id', pacienteId)
  }
  return { usuario_id }
}
