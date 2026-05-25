'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { gerarSessoesTurma } from '@/lib/scheduling/gerar-sessoes-turma'

// ─── Tipos exportados ────────────────────────────────────────────────────────

export interface TurmaSlot {
  id: string
  turma_id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  duracao_minutos: number
  sala_id: string | null
  profissional_id: string | null
  capacidade_maxima: number | null
  ativo: boolean
}

export interface TurmaPlano {
  id: string
  turma_id: string
  nome: string
  frequencia_semanal: number
  valor_mensal: number
}

export interface Turma {
  id: string
  nome: string
  descricao: string | null
  profissional_id: string | null
  sala_id: string | null
  servico_id: string | null
  nivel: string
  capacidade_slot: number
  data_inicio: string
  data_fim: string | null
  ativo: boolean
  observacoes: string | null
  slots: TurmaSlot[]
  planos: TurmaPlano[]
  profissionais?: { nome: string } | null
  salas?: { nome: string } | null
}

export interface Matricula {
  id: string
  turma_id: string
  paciente_id: string
  plano_id: string | null
  data_matricula: string
  data_saida: string | null
  status: string
  observacoes: string | null
  pacientes?: { nome: string; telefone: string | null } | null
  turmas?: { nome: string } | null
  turma_planos?: { nome: string; frequencia_semanal: number; valor_mensal: number } | null
  slots_ids?: string[]
}

export interface TurmaSessao {
  id: string
  slot_id: string
  turma_id: string
  data_hora: string
  duracao_minutos: number
  status: string
  observacoes: string | null
  turma_slots?: { dia_semana: number; hora_inicio: string; salas?: { nome: string } | null } | null
  turmas?: { nome: string } | null
}

// ─── Contexto ────────────────────────────────────────────────────────────────

type Ctx = { error: string } | { admin: ReturnType<typeof createAdminClient>; empresa_id: string }

async function getContext(): Promise<Ctx> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }
  const admin = createAdminClient()
  const { data: me } = await admin.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
  if (!me?.empresa_id) return { error: 'Empresa não encontrada.' }
  return { admin, empresa_id: String(me.empresa_id) }
}

function revalidate() {
  revalidatePath('/turmas')
  revalidatePath('/agenda')
}

// ─── Turmas ──────────────────────────────────────────────────────────────────

export async function criarTurmaAction(payload: {
  nome: string
  descricao?: string | null
  profissional_id?: string | null
  sala_id?: string | null
  servico_id?: string | null
  nivel: string
  capacidade_slot: number
  data_inicio: string
  data_fim?: string | null
  observacoes?: string | null
  slots: { dia_semana: number; hora_inicio: string; hora_fim: string; duracao_minutos: number; sala_id?: string | null; profissional_id?: string | null; capacidade_maxima?: number | null }[]
  planos: { nome: string; frequencia_semanal: number; valor_mensal: number }[]
}): Promise<{ success: true; id: string; sessoes_criadas: number } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  // 1. Cria turma
  const { data: turma, error: e1 } = await admin
    .from('turmas')
    .insert({ ...payload, slots: undefined, planos: undefined, empresa_id })
    .select('id')
    .single()
  if (e1 || !turma) return { error: e1?.message ?? 'Erro ao criar turma.' }

  // 2. Cria slots
  const slotsInsert = payload.slots.map(s => ({ ...s, turma_id: turma.id, empresa_id }))
  const { data: slotsData, error: e2 } = await admin.from('turma_slots').insert(slotsInsert).select('id, dia_semana, hora_inicio, duracao_minutos')
  if (e2) return { error: e2.message }

  // 3. Cria planos
  const planosInsert = payload.planos.map(p => ({ ...p, turma_id: turma.id, empresa_id }))
  const { error: e3 } = await admin.from('turma_planos').insert(planosInsert)
  if (e3) return { error: e3.message }

  // 4. Gera sessões automaticamente (90 dias)
  const sessoes = gerarSessoesTurma(
    (slotsData ?? []).map(s => ({ id: s.id, dia_semana: s.dia_semana, hora_inicio: s.hora_inicio, duracao_minutos: s.duracao_minutos })),
    new Date(payload.data_inicio + 'T12:00:00'),
    90,
    payload.data_fim ? new Date(payload.data_fim + 'T12:00:00') : undefined,
  )

  if (sessoes.length > 0) {
    const sessoesInsert = sessoes.map(s => ({
      slot_id: s.slot_id,
      turma_id: turma.id,
      empresa_id,
      data_hora: s.dataHora.toISOString(),
      duracao_minutos: (slotsData ?? []).find(sl => sl.id === s.slot_id)?.duracao_minutos ?? 60,
      status: 'agendada',
    }))
    const { error: e4 } = await admin.from('turma_sessoes').insert(sessoesInsert)
    if (e4) return { error: e4.message }
  }

  revalidate()
  return { success: true, id: turma.id, sessoes_criadas: sessoes.length }
}

export async function editarTurmaAction(payload: {
  id: string
  nome: string
  descricao?: string | null
  profissional_id?: string | null
  sala_id?: string | null
  servico_id?: string | null
  nivel: string
  capacidade_slot: number
  data_inicio: string
  data_fim?: string | null
  observacoes?: string | null
  ativo: boolean
}): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { id, ...rest } = payload
  const { error } = await admin.from('turmas').update(rest).eq('id', id).eq('empresa_id', empresa_id)
  if (error) return { error: error.message }
  revalidate()
  return { success: true }
}

export async function inativarTurmaAction(id: string): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { error } = await admin.from('turmas').update({ ativo: false }).eq('id', id).eq('empresa_id', empresa_id)
  if (error) return { error: error.message }
  revalidate()
  return { success: true }
}

// ─── Slots ───────────────────────────────────────────────────────────────────

export async function adicionarSlotAction(payload: {
  turma_id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  duracao_minutos: number
  sala_id?: string | null
  profissional_id?: string | null
  capacidade_maxima?: number | null
}): Promise<{ success: true; sessoes_criadas: number } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { data: slot, error: e1 } = await admin
    .from('turma_slots')
    .insert({ ...payload, empresa_id })
    .select('id, dia_semana, hora_inicio, duracao_minutos')
    .single()
  if (e1 || !slot) return { error: e1?.message ?? 'Erro ao criar slot.' }

  // Gera sessões futuras para o novo slot
  const { data: turma } = await admin.from('turmas').select('data_inicio, data_fim').eq('id', payload.turma_id).single()
  const inicio = new Date()
  inicio.setHours(0, 0, 0, 0)
  const sessoes = gerarSessoesTurma([{ id: slot.id, dia_semana: slot.dia_semana, hora_inicio: slot.hora_inicio, duracao_minutos: slot.duracao_minutos }], inicio, 90, turma?.data_fim ? new Date(turma.data_fim + 'T12:00:00') : undefined)

  if (sessoes.length > 0) {
    const { error: e2 } = await admin.from('turma_sessoes').insert(sessoes.map(s => ({ slot_id: s.slot_id, turma_id: payload.turma_id, empresa_id, data_hora: s.dataHora.toISOString(), duracao_minutos: slot.duracao_minutos, status: 'agendada' })))
    if (e2) return { error: e2.message }
  }

  revalidate()
  return { success: true, sessoes_criadas: sessoes.length }
}

export async function removerSlotAction(id: string): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { error } = await admin.from('turma_slots').delete().eq('id', id).eq('empresa_id', empresa_id)
  if (error) return { error: error.message }
  revalidate()
  return { success: true }
}

// ─── Planos ──────────────────────────────────────────────────────────────────

export async function salvarPlanoAction(payload: {
  id?: string
  turma_id: string
  nome: string
  frequencia_semanal: number
  valor_mensal: number
}): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { id, ...rest } = payload
  let error
  if (id) {
    ;({ error } = await admin.from('turma_planos').update(rest).eq('id', id).eq('empresa_id', empresa_id))
  } else {
    ;({ error } = await admin.from('turma_planos').insert({ ...rest, empresa_id }))
  }
  if (error) return { error: error.message }
  revalidate()
  return { success: true }
}

export async function excluirPlanoAction(id: string): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { error } = await admin.from('turma_planos').delete().eq('id', id).eq('empresa_id', empresa_id)
  if (error) return { error: error.message }
  revalidate()
  return { success: true }
}

// ─── Matrículas ──────────────────────────────────────────────────────────────

export async function matricularAlunoAction(payload: {
  turma_id: string
  paciente_id: string
  plano_id: string | null
  slot_ids: string[]
  data_matricula: string
  observacoes?: string | null
}): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  // Verifica capacidade de cada slot
  for (const slot_id of payload.slot_ids) {
    const { data: slot } = await admin.from('turma_slots').select('capacidade_maxima, turmas(capacidade_slot)').eq('id', slot_id).single()
    const cap = slot?.capacidade_maxima ?? (slot?.turmas as any)?.capacidade_slot ?? 10
    const { count } = await admin.from('turma_matricula_slots')
      .select('id', { count: 'exact', head: true })
      .eq('slot_id', slot_id)
    if ((count ?? 0) >= cap) return { error: `Slot sem vagas disponíveis.` }
  }

  // Upsert da matrícula (pode reativar uma encerrada)
  const { data: mat, error: e1 } = await admin
    .from('turma_matriculas')
    .upsert({ turma_id: payload.turma_id, paciente_id: payload.paciente_id, plano_id: payload.plano_id, empresa_id, data_matricula: payload.data_matricula, data_saida: null, status: 'ativo', observacoes: payload.observacoes ?? null }, { onConflict: 'turma_id,paciente_id' })
    .select('id')
    .single()
  if (e1 || !mat) return { error: e1?.message ?? 'Erro ao matricular.' }

  // Remove slots anteriores e insere os novos
  await admin.from('turma_matricula_slots').delete().eq('matricula_id', mat.id)
  if (payload.slot_ids.length > 0) {
    const { error: e2 } = await admin.from('turma_matricula_slots').insert(payload.slot_ids.map(sid => ({ matricula_id: mat.id, slot_id: sid, empresa_id })))
    if (e2) return { error: e2.message }
  }

  revalidate()
  return { success: true }
}

export async function atualizarStatusMatriculaAction(
  id: string,
  status: 'ativo' | 'pausado' | 'encerrado',
): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const update: Record<string, unknown> = { status }
  if (status === 'encerrado') update.data_saida = new Date().toISOString().slice(0, 10)

  const { error } = await admin.from('turma_matriculas').update(update).eq('id', id).eq('empresa_id', empresa_id)
  if (error) return { error: error.message }
  revalidate()
  return { success: true }
}

// ─── Sessões ─────────────────────────────────────────────────────────────────

export async function cancelarSessaoAction(id: string): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { error } = await admin.from('turma_sessoes').update({ status: 'cancelada' }).eq('id', id).eq('empresa_id', empresa_id)
  if (error) return { error: error.message }
  revalidate()
  return { success: true }
}

// ─── Chamada (presença) ──────────────────────────────────────────────────────

export async function registrarChamadaAction(payload: {
  sessao_id: string
  presencas: { paciente_id: string; status: 'presente' | 'falta' | 'falta_justificada'; observacoes?: string | null }[]
  observacoes_sessao?: string | null
}): Promise<{ success: true; presentes: number } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  // Verifica que a sessão existe e não está cancelada
  const { data: sessao } = await admin.from('turma_sessoes').select('status, data_hora').eq('id', payload.sessao_id).eq('empresa_id', empresa_id).single()
  if (!sessao) return { error: 'Sessão não encontrada.' }
  if (sessao.status === 'cancelada') return { error: 'Sessão cancelada não pode ter chamada.' }
  if (new Date(sessao.data_hora) > new Date()) return { error: 'Não é possível registrar chamada de sessão futura.' }

  // Upsert de presenças
  const rows = payload.presencas.map(p => ({ sessao_id: payload.sessao_id, paciente_id: p.paciente_id, empresa_id, status: p.status, observacoes: p.observacoes ?? null, registrado_em: new Date().toISOString() }))
  const { error: e1 } = await admin.from('turma_presencas').upsert(rows, { onConflict: 'sessao_id,paciente_id' })
  if (e1) return { error: e1.message }

  // Atualiza status da sessão
  const update: Record<string, unknown> = { status: 'realizada' }
  if (payload.observacoes_sessao) update.observacoes = payload.observacoes_sessao
  const { error: e2 } = await admin.from('turma_sessoes').update(update).eq('id', payload.sessao_id).eq('empresa_id', empresa_id)
  if (e2) return { error: e2.message }

  revalidate()
  const presentes = payload.presencas.filter(p => p.status === 'presente').length
  return { success: true, presentes }
}

// ─── Cobrança mensal ─────────────────────────────────────────────────────────

export async function gerarCobrancasMensaisAction(mesAno: string): Promise<
  { success: true; criadas: number; ignoradas: number } | { error: string }
> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const [ano, mes] = mesAno.split('-').map(Number)
  const dataComp = `${mesAno}-01`
  const descMes = new Date(ano, mes - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  // Busca todas as matrículas ativas com plano
  const { data: matriculas } = await admin
    .from('turma_matriculas')
    .select('id, paciente_id, plano_id, turma_id, turma_planos(valor_mensal, nome), turmas(nome)')
    .eq('empresa_id', empresa_id)
    .eq('status', 'ativo')
    .not('plano_id', 'is', null)

  let criadas = 0
  let ignoradas = 0

  for (const mat of (matriculas ?? [])) {
    const plano = mat.turma_planos as any
    const turma = mat.turmas as any
    if (!plano?.valor_mensal) { ignoradas++; continue }

    // Verifica duplicata
    const { count } = await admin.from('financeiro_receitas')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresa_id)
      .eq('paciente_id', mat.paciente_id)
      .eq('data_competencia', dataComp)
      .ilike('descricao', `%${turma?.nome ?? ''}%`)
    if ((count ?? 0) > 0) { ignoradas++; continue }

    await admin.from('financeiro_receitas').insert({
      empresa_id,
      paciente_id: mat.paciente_id,
      valor_bruto: plano.valor_mensal,
      desconto: 0,
      taxa_operadora: 0,
      valor_liquido: plano.valor_mensal,
      percentual_comissao: 0,
      valor_comissao: 0,
      status: 'pendente',
      data_competencia: dataComp,
      descricao: `Mensalidade ${turma?.nome ?? 'Turma'} — ${descMes}`,
    })
    criadas++
  }

  revalidatePath('/financeiro')
  revalidatePath('/turmas')
  return { success: true, criadas, ignoradas }
}
