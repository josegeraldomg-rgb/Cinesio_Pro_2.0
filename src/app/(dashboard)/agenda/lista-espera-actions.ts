'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Tipos compartilhados ─────────────────────────────────────────
export interface EntradaListaEspera {
  id: string
  paciente_id: string
  paciente_nome: string
  paciente_telefone: string | null
  paciente_ddi: string | null
  servico_id: string | null
  servico_nome: string | null
  profissional_id: string | null
  profissional_nome: string | null
  data_inicio: string
  data_fim: string
  hora_inicio: string | null
  hora_fim: string | null
  status: 'aguardando' | 'notificado' | 'agendado' | 'cancelado'
  observacoes: string | null
  notificado_em: string | null
  notificar_automaticamente: boolean
  created_at: string
}

type Ctx = { error: string } | { admin: ReturnType<typeof createAdminClient>; empresa_id: string }

async function getContext(): Promise<Ctx> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()
  const { data: me } = await admin
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!me?.empresa_id) return { error: 'Empresa não encontrada.' }
  return { admin, empresa_id: String(me.empresa_id) }
}

// Helper: normaliza resultado do join para EntradaListaEspera
function normalizar(row: any): EntradaListaEspera {
  return {
    id:                       row.id,
    paciente_id:              row.paciente_id,
    paciente_nome:            row.pacientes?.nome ?? 'Paciente',
    paciente_telefone:        row.pacientes?.telefone ?? null,
    paciente_ddi:             row.pacientes?.ddi ?? null,
    servico_id:               row.servico_id ?? null,
    servico_nome:             row.servicos?.nome ?? null,
    profissional_id:          row.profissional_id ?? null,
    profissional_nome:        row.profissionais?.nome ?? null,
    data_inicio:              row.data_inicio,
    data_fim:                 row.data_fim,
    hora_inicio:              row.hora_inicio ?? null,
    hora_fim:                 row.hora_fim ?? null,
    status:                   row.status,
    observacoes:              row.observacoes ?? null,
    notificado_em:            row.notificado_em ?? null,
    notificar_automaticamente: row.notificar_automaticamente,
    created_at:               row.created_at,
  }
}

const SELECT_COMPLETO = `
  id, paciente_id, servico_id, profissional_id,
  data_inicio, data_fim, hora_inicio, hora_fim,
  status, observacoes, notificado_em, notificar_automaticamente, created_at,
  pacientes(nome, telefone, ddi),
  servicos(nome),
  profissionais(nome)
`.trim()

// ── Listar entradas da lista de espera ─────────────────────────
export async function listarListaEsperaAction(): Promise<
  | { entries: EntradaListaEspera[] }
  | { error: string }
> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { data, error } = await admin
    .from('lista_espera_clinica')
    .select(SELECT_COMPLETO)
    .eq('empresa_id', empresa_id)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { entries: (data ?? []).map(normalizar) }
}

// ── Criar entrada ───────────────────────────────────────────────
export async function criarEntradaListaEsperaAction(payload: {
  paciente_id: string
  servico_id?: string | null
  profissional_id?: string | null
  data_inicio: string
  data_fim: string
  hora_inicio?: string | null
  hora_fim?: string | null
  observacoes?: string | null
  notificar_automaticamente: boolean
}): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { paciente_id, servico_id, profissional_id, data_inicio, data_fim,
          hora_inicio, hora_fim, observacoes, notificar_automaticamente } = payload

  if (!paciente_id)  return { error: 'Selecione o paciente.' }
  if (!data_inicio || !data_fim) return { error: 'Informe o período de interesse.' }
  if (data_inicio > data_fim)    return { error: 'A data de início deve ser ≤ data de fim.' }

  const { error } = await admin.from('lista_espera_clinica').insert({
    empresa_id,
    paciente_id,
    servico_id:   servico_id || null,
    profissional_id: profissional_id || null,
    data_inicio,
    data_fim,
    hora_inicio:  hora_inicio || null,
    hora_fim:     hora_fim || null,
    observacoes:  observacoes || null,
    notificar_automaticamente,
    status: 'aguardando',
  })

  if (error) return { error: error.message }
  revalidatePath('/agenda')
  return { success: true }
}

// ── Editar entrada ──────────────────────────────────────────────
export async function editarEntradaListaEsperaAction(
  id: string,
  payload: {
    servico_id?: string | null
    profissional_id?: string | null
    data_inicio: string
    data_fim: string
    hora_inicio?: string | null
    hora_fim?: string | null
    observacoes?: string | null
    notificar_automaticamente: boolean
  }
): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin } = ctx

  const { data_inicio, data_fim, hora_inicio, hora_fim,
          servico_id, profissional_id, observacoes, notificar_automaticamente } = payload

  if (data_inicio > data_fim) return { error: 'A data de início deve ser ≤ data de fim.' }

  const { error } = await admin
    .from('lista_espera_clinica')
    .update({
      servico_id:   servico_id || null,
      profissional_id: profissional_id || null,
      data_inicio,
      data_fim,
      hora_inicio:  hora_inicio || null,
      hora_fim:     hora_fim || null,
      observacoes:  observacoes || null,
      notificar_automaticamente,
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/agenda')
  return { success: true }
}

// ── Mudar status (cancelar, marcar notificado, etc.) ────────────
export async function mudarStatusListaEsperaAction(
  id: string,
  status: 'aguardando' | 'notificado' | 'agendado' | 'cancelado',
): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin } = ctx

  const update: Record<string, unknown> = { status }
  if (status === 'notificado') update.notificado_em = new Date().toISOString()

  const { error } = await admin
    .from('lista_espera_clinica')
    .update(update)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/agenda')
  return { success: true }
}

// ── Excluir entrada ─────────────────────────────────────────────
export async function excluirEntradaListaEsperaAction(
  id: string,
): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin } = ctx

  const { error } = await admin
    .from('lista_espera_clinica')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/agenda')
  return { success: true }
}

// ── Motor de Match: busca entradas compatíveis com um slot vago ─
// Chamado quando um agendamento é cancelado (slot fica livre).
export async function buscarCompativeisListaEsperaAction(
  profissional_id: string | null,
  data: string,   // "YYYY-MM-DD"
  hora: string,   // "HH:MM"
): Promise<{ entries: EntradaListaEspera[] } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  // Busca todos os "aguardando" da empresa cujo período cobre esta data
  const { data: rows, error } = await admin
    .from('lista_espera_clinica')
    .select(SELECT_COMPLETO)
    .eq('empresa_id', empresa_id)
    .eq('status', 'aguardando')
    .lte('data_inicio', data)
    .gte('data_fim', data)

  if (error) return { error: error.message }

  const compatíveis = ((rows ?? []) as any[]).filter((row: any) => {
    // 1) Profissional: se especificado, deve ser exato
    if (row.profissional_id && profissional_id && row.profissional_id !== profissional_id) {
      return false
    }

    // 2) Faixa de horário: se especificada, o slot deve estar dentro
    if (row.hora_inicio && hora < row.hora_inicio) return false
    if (row.hora_fim    && hora > row.hora_fim)    return false

    return true
  })

  return { entries: compatíveis.map(normalizar) }
}
