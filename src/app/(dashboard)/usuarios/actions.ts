'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ────────────────────────────────────────────────────────────────────
// Payload do cadastro de usuário.
// Quando perfil = 'profissional', os campos `extra` devem vir preenchidos
// para que o registro de profissional + horários + serviços sejam criados
// em uma única operação (sai 100% pronto para a agenda).
// ────────────────────────────────────────────────────────────────────
export interface NovoUsuarioPayload {
  nome: string
  email: string
  senha: string
  perfil: string
  extra?: NovoProfissionalExtra
}

export interface NovoProfissionalExtra {
  ddi: string
  telefone: string
  intervalo_minutos: number
  cor_agenda?: string
  turnos: TurnoNovo[]
  servicos: VinculoServicoNovo[]
}

export interface TurnoNovo {
  dias_semana: number[]   // [1,2,3,4,5] para dias úteis
  hora_inicio: string     // "HH:MM"
  hora_fim: string
}

export interface VinculoServicoNovo {
  servico_id: string
  valor_override: number | null
  duracao_override: number | null
}

const CORES_AGENDA = ['#4A3AE8', '#27AE60', '#F39C12', '#E91E63', '#3498DB', '#8E44AD', '#E67E22', '#16A085']

// ────────────────────────────────────────────────────────────────────
// Cria usuário no Supabase Auth + usuarios. Se perfil = 'profissional',
// cria também: profissionais + disponibilidade_profissional + servico_profissional.
// ────────────────────────────────────────────────────────────────────
export async function criarUsuarioAction(payload: NovoUsuarioPayload) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return { error: 'Variáveis de ambiente do Supabase ausentes.' }
  }

  // Autenticação + autorização
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()

  let { data: me } = await admin
    .from('usuarios')
    .select('perfil, empresa_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!me && user.email) {
    const r = await admin
      .from('usuarios')
      .select('perfil, empresa_id')
      .eq('email', user.email)
      .maybeSingle()
    me = r.data ?? null
  }

  if (!me) return { error: 'Usuário atual não encontrado.' }
  if (!['admin', 'dev'].includes(me.perfil)) {
    return { error: 'Apenas administradores podem criar usuários.' }
  }

  // Validações de payload
  const { nome, email, senha, perfil, extra } = payload
  if (!email || !senha || !nome || !perfil) {
    return { error: 'Preencha todos os campos básicos (nome, email, senha, perfil).' }
  }
  if (senha.length < 6) return { error: 'A senha deve ter ao menos 6 caracteres.' }

  if (perfil === 'profissional') {
    if (!extra) return { error: 'Dados de profissional faltando.' }
    if (!extra.telefone) return { error: 'Telefone do profissional é obrigatório.' }
    if (extra.intervalo_minutos < 0) return { error: 'Intervalo dos slots inválido.' }
    for (const t of extra.turnos) {
      if (!t.dias_semana?.length) return { error: 'Todo turno precisa ao menos um dia da semana.' }
      if (!t.hora_inicio || !t.hora_fim) return { error: 'Turno sem hora de início ou fim.' }
      if (t.hora_inicio >= t.hora_fim) return { error: `Turno inválido: ${t.hora_inicio}–${t.hora_fim}.` }
    }
  }

  // ── 1) Cria no Auth ──
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'apikey': SERVICE_ROLE,
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password: senha,
      email_confirm: true,
      user_metadata: { nome },
    }),
  })

  const authData = await authRes.json()
  if (!authRes.ok) {
    return { error: authData.message || authData.msg || 'Falha ao criar usuário no Auth.' }
  }
  const newId: string = authData.id

  // ── 2) Insere em usuarios ──
  const { error: insertErr } = await admin.from('usuarios').insert({
    id: newId,
    empresa_id: me.empresa_id,
    nome,
    email: email.trim().toLowerCase(),
    perfil,
  })

  if (insertErr && !insertErr.message.includes('duplicate')) {
    return { error: `Auth criado mas falha ao inserir em usuarios: ${insertErr.message}` }
  }

  // ── 3) Se profissional, cria profissional + horários + serviços ──
  let resumo = { profissional_id: null as string | null, turnos: 0, servicos: 0 }

  if (perfil === 'profissional' && extra) {
    // 3a) Cor da agenda em rodízio se não informada
    let cor = extra.cor_agenda
    if (!cor) {
      const { count } = await admin
        .from('profissionais')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', me.empresa_id)
      cor = CORES_AGENDA[(count ?? 0) % CORES_AGENDA.length]
    }

    // 3b) Cria profissional
    const { data: prof, error: profErr } = await admin.from('profissionais').insert({
      empresa_id: me.empresa_id,
      usuario_id: newId,
      nome,
      email: email.trim().toLowerCase(),
      telefone: extra.telefone.replace(/\D/g, ''),
      cor_agenda: cor,
      ativo: true,
    }).select('id').single()

    if (profErr) {
      return { error: `Usuário criado, mas falha em profissionais: ${profErr.message}` }
    }
    resumo.profissional_id = prof.id

    // 3c) Expande turnos por dia da semana e insere em disponibilidade_profissional
    const turnosRows = extra.turnos.flatMap(t =>
      t.dias_semana.map(dia_semana => ({
        empresa_id: me!.empresa_id,
        profissional_id: prof.id,
        dia_semana,
        hora_inicio: t.hora_inicio,
        hora_fim: t.hora_fim,
        intervalo_minutos: extra.intervalo_minutos,
        ativo: true,
      }))
    )

    if (turnosRows.length > 0) {
      const { error: turErr } = await admin.from('disponibilidade_profissional').insert(turnosRows)
      if (turErr) {
        return { error: `Profissional criado, mas falha nos horários: ${turErr.message}` }
      }
      resumo.turnos = turnosRows.length
    }

    // 3d) Vincula serviços (com overrides opcionais)
    if (extra.servicos.length > 0) {
      const { error: svcErr } = await admin.from('servico_profissional').insert(
        extra.servicos.map(s => ({
          servico_id: s.servico_id,
          profissional_id: prof.id,
          valor_override: s.valor_override,
          duracao_override: s.duracao_override,
        }))
      )
      if (svcErr) {
        return { error: `Profissional/horários criados, mas falha nos serviços: ${svcErr.message}` }
      }
      resumo.servicos = extra.servicos.length
    }
  }

  revalidatePath('/usuarios')
  revalidatePath('/horarios')
  revalidatePath('/agenda')

  const mensagem = perfil === 'profissional'
    ? `Profissional criado e pronto para a agenda! ${resumo.turnos} turno(s) e ${resumo.servicos} serviço(s) vinculados.`
    : 'Usuário criado com sucesso.'

  return { success: true, mensagem, ...resumo }
}
