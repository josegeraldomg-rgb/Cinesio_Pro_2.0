'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' as const }

  // Usa admin client (bypassa RLS) para buscar o registro de usuarios.
  // RLS na tabela usuarios pode esconder a própria linha em alguns cenários.
  const admin = createAdminClient()

  let { data: me } = await admin
    .from('usuarios')
    .select('empresa_id, perfil, id, email')
    .eq('id', user.id)
    .maybeSingle()

  // Fallback: tenta por email (caso o id no auth tenha sido recriado em algum momento)
  if (!me && user.email) {
    const r = await admin
      .from('usuarios')
      .select('empresa_id, perfil, id, email')
      .eq('email', user.email)
      .maybeSingle()
    me = r.data ?? null
  }

  // Se ainda não existir, cria uma linha mínima vinculada à empresa padrão
  // (cenário: auth user existe mas usuarios não — recupera autonomamente).
  if (!me && user.email) {
    const { data: empresa } = await admin
      .from('empresas')
      .select('id')
      .limit(1)
      .single()

    if (empresa) {
      const { data: created } = await admin
        .from('usuarios')
        .insert({
          id: user.id,
          empresa_id: empresa.id,
          email: user.email,
          nome: user.user_metadata?.nome ?? user.email.split('@')[0],
          perfil: 'admin',
        })
        .select('empresa_id, perfil, id, email')
        .single()
      me = created ?? null
    }
  }

  if (!me) return { error: 'Não foi possível identificar a empresa do usuário.' as const }
  return { supabase, admin, empresa_id: me.empresa_id, perfil: me.perfil, userId: me.id }
}

// ════════════════════════════════════════
//             TURNOS (HORÁRIOS)
// ════════════════════════════════════════
export async function salvarTurnoAction(formData: FormData) {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { supabase, empresa_id } = ctx

  const id                = String(formData.get('id') ?? '') || null
  const profissional_id   = String(formData.get('profissional_id') ?? '')
  const dia_semana        = parseInt(String(formData.get('dia_semana') ?? '-1'), 10)
  const hora_inicio       = String(formData.get('hora_inicio') ?? '')
  const hora_fim          = String(formData.get('hora_fim') ?? '')
  const intervalo_minutos = parseInt(String(formData.get('intervalo_minutos') ?? '0'), 10) || 0
  const ativo             = formData.get('ativo') !== 'off'

  if (!profissional_id) return { error: 'Selecione um profissional.' }
  if (dia_semana < 0 || dia_semana > 6) return { error: 'Dia da semana inválido.' }
  if (!hora_inicio || !hora_fim) return { error: 'Informe os horários de início e fim.' }
  if (hora_inicio >= hora_fim) return { error: 'A hora de início deve ser anterior à hora de fim.' }
  if (intervalo_minutos < 0) return { error: 'Intervalo inválido.' }

  const payload = {
    empresa_id,
    profissional_id,
    dia_semana,
    hora_inicio,
    hora_fim,
    intervalo_minutos,
    ativo,
  }

  let res
  if (id) {
    res = await supabase.from('disponibilidade_profissional').update(payload).eq('id', id).select('id').single()
  } else {
    res = await supabase.from('disponibilidade_profissional').insert(payload).select('id').single()
  }

  if (res.error) return { error: res.error.message }

  revalidatePath('/horarios')
  return { success: true, id: res.data?.id }
}

// Cria o mesmo turno (hora_inicio/hora_fim/intervalo) em N dias da semana de uma vez.
// Útil para "todo dia útil das 8 às 12" — evita criar 5 registros separados.
export async function criarTurnosEmMultiplosDiasAction(payload: {
  profissional_id: string
  dias_semana: number[]
  hora_inicio: string
  hora_fim: string
  intervalo_minutos: number
  ativo: boolean
}) {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { supabase, empresa_id } = ctx

  const { profissional_id, dias_semana, hora_inicio, hora_fim, intervalo_minutos, ativo } = payload

  if (!profissional_id) return { error: 'Selecione um profissional.' }
  if (!dias_semana?.length) return { error: 'Selecione ao menos um dia da semana.' }
  if (dias_semana.some(d => d < 0 || d > 6)) return { error: 'Dia inválido.' }
  if (!hora_inicio || !hora_fim) return { error: 'Informe os horários.' }
  if (hora_inicio >= hora_fim) return { error: 'A hora de início deve ser anterior à hora de fim.' }
  if (intervalo_minutos < 0) return { error: 'Intervalo inválido.' }

  const rows = dias_semana.map(dia_semana => ({
    empresa_id,
    profissional_id,
    dia_semana,
    hora_inicio,
    hora_fim,
    intervalo_minutos,
    ativo,
  }))

  const { error } = await supabase.from('disponibilidade_profissional').insert(rows)
  if (error) return { error: error.message }

  revalidatePath('/horarios')
  return { success: true, count: rows.length }
}

export async function excluirTurnoAction(id: string) {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { supabase } = ctx

  const { error } = await supabase.from('disponibilidade_profissional').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/horarios')
  return { success: true }
}

// Duplica todos os turnos de um dia para outros dias
export async function duplicarDiaAction(
  profissional_id: string,
  diaOrigem: number,
  diasDestino: number[]
) {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { supabase, empresa_id } = ctx

  const { data: origem, error: e1 } = await supabase
    .from('disponibilidade_profissional')
    .select('hora_inicio, hora_fim, intervalo_minutos, ativo')
    .eq('profissional_id', profissional_id)
    .eq('dia_semana', diaOrigem)

  if (e1) return { error: e1.message }
  if (!origem || origem.length === 0) return { error: 'Dia de origem sem turnos.' }

  // Apaga turnos existentes nos dias destino antes de inserir os novos
  const { error: delErr } = await supabase
    .from('disponibilidade_profissional')
    .delete()
    .eq('profissional_id', profissional_id)
    .in('dia_semana', diasDestino)
  if (delErr) return { error: delErr.message }

  const rows = diasDestino.flatMap(dia =>
    origem.map(t => ({
      empresa_id,
      profissional_id,
      dia_semana: dia,
      hora_inicio: t.hora_inicio,
      hora_fim: t.hora_fim,
      intervalo_minutos: t.intervalo_minutos ?? 0,
      ativo: t.ativo,
    }))
  )

  if (rows.length > 0) {
    const { error } = await supabase.from('disponibilidade_profissional').insert(rows)
    if (error) return { error: error.message }
  }

  revalidatePath('/horarios')
  return { success: true, count: rows.length }
}

// ════════════════════════════════════════
//                 PROFISSIONAIS
// ════════════════════════════════════════
export async function salvarProfissionalAction(formData: FormData) {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const id                   = String(formData.get('id') ?? '') || null
  const nome                 = String(formData.get('nome') ?? '').trim()
  const email                = String(formData.get('email') ?? '').trim().toLowerCase() || null
  const telefone             = String(formData.get('telefone') ?? '').trim() || null
  const especialidade        = String(formData.get('especialidade') ?? '').trim() || null
  const crefito              = String(formData.get('crefito') ?? '').trim() || null
  const uf                   = String(formData.get('uf') ?? '').trim().toUpperCase() || null
  const cor_agenda           = String(formData.get('cor_agenda') ?? '#4A3AE8')
  const percentual_comissao  = parseFloat(String(formData.get('percentual_comissao') ?? '0').replace(',', '.')) || 0
  const ativo                = formData.get('ativo') !== 'off'

  if (!nome) return { error: 'Informe o nome do profissional.' }
  if (percentual_comissao < 0 || percentual_comissao > 100) {
    return { error: 'Comissão deve estar entre 0 e 100.' }
  }

  // ── Auto-vínculo com conta de usuário (perfil = profissional) ──
  // Quando há email, tenta encontrar usuário existente. Se não existe,
  // cria conta de usuário automaticamente e envia convite para definir senha.
  let usuario_id: string | null = null
  let convite_enviado = false

  if (email) {
    // 1. Já existe um `usuarios` com esse email?
    const { data: existing } = await admin
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      usuario_id = existing.id
    } else {
      // 2. Cria via Supabase Auth Admin API com convite (magic link)
      //    O profissional recebe email para DEFINIR sua própria senha.
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!

      const inviteRes = await fetch(`${SUPABASE_URL}/auth/v1/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE}`,
          'apikey': SERVICE_ROLE,
        },
        body: JSON.stringify({
          email,
          data: { nome, perfil_inicial: 'profissional' },
        }),
      })

      const inviteData = await inviteRes.json()

      if (!inviteRes.ok) {
        // Fallback: cria usuário sem convite (senha temporária aleatória)
        // — para casos em que o servidor SMTP do Supabase não está configurado.
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
        if (!createRes.ok) {
          return { error: `Falha ao criar usuário: ${createData.message || createData.msg || 'erro desconhecido'}` }
        }
        usuario_id = createData.id
      } else {
        usuario_id = inviteData.id
        convite_enviado = true
      }

      // 3. Insere o registro em usuarios vinculando à empresa
      if (usuario_id) {
        const { error: insErr } = await admin.from('usuarios').insert({
          id: usuario_id,
          empresa_id,
          nome,
          email,
          perfil: 'profissional',
        })
        if (insErr && !insErr.message.includes('duplicate')) {
          return { error: `Auth criado mas falha em usuarios: ${insErr.message}` }
        }
      }
    }
  }

  const payload = {
    empresa_id,
    nome,
    email,
    telefone,
    especialidade,
    crefito,
    uf,
    cor_agenda,
    percentual_comissao,
    ativo,
    usuario_id,
  }

  let res
  if (id) {
    res = await admin.from('profissionais').update(payload).eq('id', id).select('id').single()
  } else {
    res = await admin.from('profissionais').insert(payload).select('id').single()
  }

  if (res.error) return { error: res.error.message }

  revalidatePath('/horarios')
  return {
    success: true,
    id: res.data?.id,
    convite_enviado,
    mensagem: convite_enviado
      ? `Profissional criado! Um convite foi enviado para ${email} definir a senha de acesso.`
      : usuario_id
        ? 'Profissional criado e vinculado a uma conta de usuário.'
        : 'Profissional criado.',
  }
}

// ════════════════════════════════════════
//          AUSÊNCIAS (FOLGAS/FÉRIAS/FERIADOS)
// ════════════════════════════════════════
export async function salvarAusenciaAction(formData: FormData) {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { supabase, empresa_id } = ctx

  const id              = String(formData.get('id') ?? '') || null
  // Multi-professional: formData pode ter múltiplos valores 'profissional_id'
  const profissionalIds = (formData.getAll('profissional_id') as string[]).map(String).filter(Boolean)
  const profissional_id = profissionalIds[0] ?? null   // para edição (single)

  const data_inicio     = String(formData.get('data_inicio') ?? '')
  const data_fim        = String(formData.get('data_fim') ?? '')
  const tipo            = String(formData.get('tipo') ?? 'folga')
  const motivo          = String(formData.get('motivo') ?? '').trim() || null
  const hora_inicio     = String(formData.get('hora_inicio') ?? '').trim() || null
  const hora_fim        = String(formData.get('hora_fim') ?? '').trim() || null

  if (!data_inicio || !data_fim) return { error: 'Informe as datas de início e fim.' }
  if (data_inicio > data_fim) return { error: 'A data de início deve ser anterior ou igual à data de fim.' }
  if (!['folga', 'ferias', 'feriado', 'outro'].includes(tipo)) return { error: 'Tipo inválido.' }

  // Feriado pode ser global; folga/ferias/outro exigem ao menos um profissional
  if (tipo !== 'feriado' && profissionalIds.length === 0) {
    return { error: 'Selecione ao menos um profissional.' }
  }

  // Validação de horário parcial (mesmo dia)
  if (hora_inicio && hora_fim && data_inicio === data_fim && hora_inicio >= hora_fim) {
    return { error: 'A hora de início deve ser anterior à hora de fim.' }
  }

  const basePayload = {
    empresa_id,
    data_inicio,
    data_fim,
    tipo,
    motivo,
    hora_inicio: tipo === 'feriado' ? null : hora_inicio,
    hora_fim:    tipo === 'feriado' ? null : hora_fim,
  }

  if (id) {
    // Edição: atualiza o registro existente (profissional único)
    const payload = { ...basePayload, profissional_id: tipo === 'feriado' ? null : profissional_id }
    const { error } = await supabase.from('folgas_ferias').update(payload).eq('id', id)
    if (error) return { error: error.message }
  } else {
    // Criação: um registro por profissional (ou um global para feriado)
    const records = tipo === 'feriado'
      ? [{ ...basePayload, profissional_id: null }]
      : profissionalIds.map(pid => ({ ...basePayload, profissional_id: pid }))
    const { error } = await supabase.from('folgas_ferias').insert(records as any[])
    if (error) return { error: error.message }
  }

  revalidatePath('/horarios')
  revalidatePath('/agenda')
  return { success: true }
}

export async function excluirAusenciaAction(id: string) {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { supabase } = ctx

  const { error } = await supabase.from('folgas_ferias').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/horarios')
  return { success: true }
}
