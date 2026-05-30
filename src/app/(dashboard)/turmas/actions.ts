'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { gerarSessoesTurma } from '@/lib/scheduling/gerar-sessoes-turma'

// ─── Tipos exportados ────────────────────────────────────────────────────────

// ── Novos tipos (modelo reestruturado) ───────────────────────────────────────

export interface PlanoServico {
  id: string
  servico_id: string
  nome: string
  dias_semana: number
  valor_mensal: number
  ativo: boolean
  servicos?: { nome: string } | null
}

export interface NovaMatricula {
  id: string
  paciente_id: string
  plano_id: string
  data_matricula: string
  data_saida: string | null
  status: string
  observacoes: string | null
  pacientes?: { nome: string; telefone: string | null } | null
  planos_servico?: { nome: string; dias_semana: number; valor_mensal: number; servicos?: { nome: string } | null } | null
  slots?: MatriculaSlotDetalhe[]
}

export interface MatriculaSlotDetalhe {
  id: string
  slot_id: string
  ativo: boolean
  turma_slots?: {
    id: string
    dia_semana: number
    hora_inicio: string
    vagas_total: number | null
    turmas?: { id: string; nome: string; servico_id: string | null } | null
  } | null
}

export interface TurmaSlotComVagas {
  id: string
  turma_id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  duracao_minutos: number
  capacidade_maxima: number | null
  vagas_total: number | null
  vagas_livres: number
  ativo: boolean
  turmas?: { id: string; nome: string; servico_id: string | null } | null
}

// ── Tipos originais ──────────────────────────────────────────────────────────

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

  // Usa RPC para contornar schema cache do PostgREST
  const { data, error } = await admin.rpc('criar_turma_completa', {
    dados: {
      empresa_id,
      nome: payload.nome,
      descricao: payload.descricao ?? '',
      profissional_id: payload.profissional_id ?? '',
      sala_id: payload.sala_id ?? '',
      servico_id: payload.servico_id ?? '',
      nivel: payload.nivel,
      capacidade_slot: payload.capacidade_slot,
      data_inicio: payload.data_inicio,
      data_fim: payload.data_fim ?? '',
      observacoes: payload.observacoes ?? '',
      slots: payload.slots,
      planos: payload.planos,
    },
  })

  if (error) return { error: error.message }
  const resultado = data as { turma_id: string; sessoes_criadas: number }
  revalidate()
  return { success: true, id: resultado.turma_id, sessoes_criadas: resultado.sessoes_criadas }
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

  // Usa RPC para contornar schema cache do PostgREST (capacidade_slot)
  const { error } = await admin.rpc('editar_turma_fn', {
    p_id: payload.id,
    p_empresa_id: empresa_id,
    p_nome: payload.nome,
    p_descricao: payload.descricao ?? null,
    p_profissional_id: payload.profissional_id ?? null,
    p_sala_id: payload.sala_id ?? null,
    p_servico_id: payload.servico_id ?? null,
    p_nivel: payload.nivel,
    p_capacidade_slot: payload.capacidade_slot,
    p_data_inicio: payload.data_inicio,
    p_data_fim: payload.data_fim ?? null,
    p_observacoes: payload.observacoes ?? null,
    p_ativo: payload.ativo,
  })
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

// ─── Busca turma completa (para PDF) ─────────────────────────────────────────

export async function buscarTurmaComMatriculasAction(turmaId: string): Promise<
  { turma: Turma; matriculas: Matricula[] } | { error: string }
> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { data: turmaRaw, error: e1 } = await admin
    .from('turmas')
    .select('id, nome, descricao, profissional_id, sala_id, servico_id, nivel, capacidade_slot, data_inicio, data_fim, ativo, observacoes, profissionais(nome), salas(nome)')
    .eq('id', turmaId)
    .eq('empresa_id', empresa_id)
    .single()

  if (e1 || !turmaRaw) return { error: e1?.message ?? 'Turma não encontrada.' }

  const [{ data: slots }, { data: planos }, { data: matriculasRaw }] = await Promise.all([
    admin.from('turma_slots').select('id, turma_id, dia_semana, hora_inicio, hora_fim, duracao_minutos, sala_id, profissional_id, capacidade_maxima, ativo').eq('turma_id', turmaId).eq('empresa_id', empresa_id).order('dia_semana'),
    admin.from('turma_planos').select('id, turma_id, nome, frequencia_semanal, valor_mensal').eq('turma_id', turmaId).eq('empresa_id', empresa_id).order('frequencia_semanal'),
    admin.from('turma_matriculas').select('id, turma_id, paciente_id, plano_id, data_matricula, data_saida, status, observacoes, pacientes(nome, telefone), turmas(nome), turma_planos(nome, frequencia_semanal, valor_mensal)').eq('turma_id', turmaId).eq('empresa_id', empresa_id),
  ])

  // Busca os slot_ids de cada matrícula
  const matriculasIds = (matriculasRaw ?? []).map(m => m.id)
  const { data: matSlots } = matriculasIds.length > 0
    ? await admin.from('turma_matricula_slots').select('matricula_id, slot_id').in('matricula_id', matriculasIds)
    : { data: [] }

  const slotsPorMat: Record<string, string[]> = {}
  for (const ms of (matSlots ?? [])) {
    if (!slotsPorMat[ms.matricula_id]) slotsPorMat[ms.matricula_id] = []
    slotsPorMat[ms.matricula_id].push(ms.slot_id)
  }

  const turma: Turma = {
    ...(turmaRaw as any),
    slots: (slots ?? []) as TurmaSlot[],
    planos: (planos ?? []) as TurmaPlano[],
  }

  const matriculas: Matricula[] = (matriculasRaw ?? []).map((m: any) => ({
    ...m,
    slots_ids: slotsPorMat[m.id] ?? [],
  }))

  return { turma, matriculas }
}

// ─── Novo modelo: Planos de Serviço ──────────────────────────────────────────

export interface SlotComVagas {
  id: string
  turma_id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  duracao_minutos: number
  vagas_total: number
  vagas_livres: number
  ativo: boolean
  turmas?: { id: string; nome: string; servico_id: string | null; nivel: string } | null
}

export interface MatriculaSlotInfo {
  id: string
  slot_id: string
  ativo: boolean
  turma_slots?: {
    id: string
    dia_semana: number
    hora_inicio: string
    vagas_total: number | null
    turmas?: { id: string; nome: string; servico_id: string | null } | null
  } | null
}

export async function salvarPlanoServicoAction(payload: {
  id?: string
  servico_id: string
  nome: string
  dias_semana: number
  valor_mensal: number
  ativo?: boolean
}): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { id, ...rest } = payload
  let error
  if (id) {
    ;({ error } = await admin.from('planos_servico').update(rest).eq('id', id).eq('empresa_id', empresa_id))
  } else {
    ;({ error } = await admin.from('planos_servico').insert({ ...rest, empresa_id }))
  }
  if (error) {
    console.error('[salvarPlanoServicoAction] erro:', error.message)
    if (error.message.toLowerCase().includes('relation') || error.message.toLowerCase().includes('does not exist')) {
      return { error: 'TABELA_NAO_EXISTE: Execute o SQL de migração no Supabase Dashboard (SQL Editor) para criar a tabela planos_servico.' }
    }
    return { error: error.message }
  }
  revalidatePath('/turmas')
  return { success: true }
}

export async function excluirPlanoServicoAction(id: string): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { error } = await admin.from('planos_servico').delete().eq('id', id).eq('empresa_id', empresa_id)
  if (error) return { error: error.message }
  revalidatePath('/turmas')
  return { success: true }
}

export async function novaMatriculaAction(payload: {
  paciente_id: string
  plano_id: string
  slot_ids: string[]
  data_matricula: string
  observacoes?: string | null
}): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  // 1. Verifica paciente ativo
  const { data: paciente } = await admin.from('pacientes').select('status').eq('id', payload.paciente_id).eq('empresa_id', empresa_id).maybeSingle()
  if (!paciente) return { error: 'Paciente não encontrado.' }
  if (paciente.status !== 'ativo') return { error: 'Paciente inativo. Reative o cadastro para matricular.' }

  // 2. Verifica plano ativo
  const { data: plano } = await admin.from('planos_servico').select('id, servico_id, dias_semana, ativo').eq('id', payload.plano_id).eq('empresa_id', empresa_id).maybeSingle()
  if (!plano) return { error: 'Plano não encontrado.' }
  if (!plano.ativo) return { error: 'Plano inativo.' }

  // 3. Verifica quantidade de slots
  if (payload.slot_ids.length !== plano.dias_semana) {
    return { error: `Este plano requer exatamente ${plano.dias_semana} slot(s) semanal(is). Você selecionou ${payload.slot_ids.length}.` }
  }

  // 4 & 5. Valida cada slot
  for (const slot_id of payload.slot_ids) {
    const { data: slot } = await admin
      .from('turma_slots')
      .select('id, vagas_total, turmas(servico_id)')
      .eq('id', slot_id)
      .maybeSingle()

    if (!slot) return { error: `Slot ${slot_id} não encontrado.` }
    const turmaServico = (slot.turmas as any)?.servico_id
    if (turmaServico !== plano.servico_id) {
      return { error: 'Um dos slots selecionados pertence a uma turma de serviço diferente do plano.' }
    }

    const vagasTotal = slot.vagas_total ?? 10
    const { count } = await admin
      .from('matricula_slots')
      .select('id', { count: 'exact', head: true })
      .eq('slot_id', slot_id)
      .eq('ativo', true)
    if ((count ?? 0) >= vagasTotal) {
      return { error: `Slot sem vagas disponíveis. Escolha outro horário.` }
    }
  }

  // 6. Insere matrícula
  const { data: mat, error: e1 } = await admin
    .from('matriculas')
    .insert({
      empresa_id,
      paciente_id: payload.paciente_id,
      plano_id: payload.plano_id,
      data_matricula: payload.data_matricula,
      status: 'ativo',
      observacoes: payload.observacoes ?? null,
    })
    .select('id')
    .single()
  if (e1 || !mat) return { error: e1?.message ?? 'Erro ao criar matrícula.' }

  // 7. Insere slots
  const { error: e2 } = await admin.from('matricula_slots').insert(
    payload.slot_ids.map(sid => ({ empresa_id, matricula_id: mat.id, slot_id: sid }))
  )
  if (e2) return { error: e2.message }

  revalidatePath('/turmas')
  return { success: true }
}

export async function encerrarMatriculaAction(id: string): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { data: mat } = await admin.from('matriculas').select('status').eq('id', id).eq('empresa_id', empresa_id).maybeSingle()
  if (!mat) return { error: 'Matrícula não encontrada.' }
  if (mat.status === 'encerrado') return { error: 'MATRICULA_JA_ENCERRADA' }

  const hoje = new Date().toISOString().slice(0, 10)
  const { error: e1 } = await admin.from('matriculas').update({ status: 'encerrado', data_saida: hoje }).eq('id', id).eq('empresa_id', empresa_id)
  if (e1) return { error: e1.message }

  await admin.from('matricula_slots').update({ ativo: false }).eq('matricula_id', id).eq('empresa_id', empresa_id)

  revalidatePath('/turmas')
  return { success: true }
}

export async function pausarReativarMatriculaAction(
  id: string,
  status: 'ativo' | 'pausado',
): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { error } = await admin.from('matriculas').update({ status }).eq('id', id).eq('empresa_id', empresa_id)
  if (error) return { error: error.message }

  revalidatePath('/turmas')
  return { success: true }
}

export async function remanejamentoSlotAction(payload: {
  matricula_id: string
  slot_antigo_id: string
  slot_novo_id: string
}): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  // 1. Busca matrícula + plano
  const { data: mat } = await admin
    .from('matriculas')
    .select('status, plano_id, planos_servico(servico_id)')
    .eq('id', payload.matricula_id)
    .eq('empresa_id', empresa_id)
    .maybeSingle()
  if (!mat) return { error: 'Matrícula não encontrada.' }
  if (mat.status !== 'ativo') return { error: 'Somente matrículas ativas podem ter slots remanejados.' }

  const servicoId = (mat.planos_servico as any)?.servico_id

  // 2. Valida novo slot
  const { data: novoSlot } = await admin
    .from('turma_slots')
    .select('id, vagas_total, turmas(servico_id)')
    .eq('id', payload.slot_novo_id)
    .maybeSingle()
  if (!novoSlot) return { error: 'Slot de destino não encontrado.' }

  const novoServico = (novoSlot.turmas as any)?.servico_id
  if (novoServico !== servicoId) return { error: 'O novo slot pertence a um serviço diferente do plano.' }

  // 3. Verifica vagas
  const vagasTotal = novoSlot.vagas_total ?? 10
  const { count } = await admin
    .from('matricula_slots')
    .select('id', { count: 'exact', head: true })
    .eq('slot_id', payload.slot_novo_id)
    .eq('ativo', true)
  if ((count ?? 0) >= vagasTotal) return { error: 'Slot de destino sem vagas disponíveis.' }

  // Desativa slot antigo
  await admin.from('matricula_slots').update({ ativo: false }).eq('matricula_id', payload.matricula_id).eq('slot_id', payload.slot_antigo_id).eq('empresa_id', empresa_id)

  // Insere ou reativa slot novo
  const { data: existing } = await admin.from('matricula_slots')
    .select('id, ativo')
    .eq('matricula_id', payload.matricula_id)
    .eq('slot_id', payload.slot_novo_id)
    .maybeSingle()

  if (existing) {
    await admin.from('matricula_slots').update({ ativo: true }).eq('id', existing.id)
  } else {
    const { error: eIns } = await admin.from('matricula_slots').insert({
      empresa_id,
      matricula_id: payload.matricula_id,
      slot_id: payload.slot_novo_id,
    })
    if (eIns) return { error: eIns.message }
  }

  revalidatePath('/turmas')
  return { success: true }
}

export async function criarRealocacaoAction(payload: {
  matricula_id: string
  paciente_id: string
  sessao_origem_id?: string | null
  slot_destino_id: string
  observacoes?: string | null
}): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  // 1. Busca matrícula + plano
  const { data: mat } = await admin
    .from('matriculas')
    .select('status, plano_id, planos_servico(servico_id)')
    .eq('id', payload.matricula_id)
    .eq('empresa_id', empresa_id)
    .maybeSingle()
  if (!mat) return { error: 'Matrícula não encontrada.' }

  const servicoId = (mat.planos_servico as any)?.servico_id

  // 2. Valida slot destino
  const { data: slotDestino } = await admin
    .from('turma_slots')
    .select('id, vagas_total, turmas(servico_id)')
    .eq('id', payload.slot_destino_id)
    .maybeSingle()
  if (!slotDestino) return { error: 'Slot de destino não encontrado.' }

  const destinoServico = (slotDestino.turmas as any)?.servico_id
  if (destinoServico !== servicoId) return { error: 'O slot de destino pertence a um serviço diferente do plano.' }

  // 3. Verifica vagas
  const vagasTotal = slotDestino.vagas_total ?? 10
  const { count } = await admin
    .from('matricula_slots')
    .select('id', { count: 'exact', head: true })
    .eq('slot_id', payload.slot_destino_id)
    .eq('ativo', true)
  if ((count ?? 0) >= vagasTotal) return { error: 'Slot de destino sem vagas disponíveis.' }

  const { error } = await admin.from('realocacoes_aula').insert({
    empresa_id,
    matricula_id: payload.matricula_id,
    paciente_id: payload.paciente_id,
    sessao_origem_id: payload.sessao_origem_id ?? null,
    slot_destino_id: payload.slot_destino_id,
    status: 'pendente',
    observacoes: payload.observacoes ?? null,
  })
  if (error) return { error: error.message }

  revalidatePath('/turmas')
  return { success: true }
}

export async function cancelarRealocacaoAction(id: string): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { error } = await admin.from('realocacoes_aula').update({ status: 'cancelada' }).eq('id', id).eq('empresa_id', empresa_id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function listarSlotsComVagasAction(servico_id?: string): Promise<SlotComVagas[]> {
  const ctx = await getContext()
  if ('error' in ctx) return []
  const { admin, empresa_id } = ctx

  let query = admin
    .from('turma_slots')
    .select('id, turma_id, dia_semana, hora_inicio, hora_fim, duracao_minutos, vagas_total, ativo, turmas(id, nome, servico_id, nivel)')
    .eq('empresa_id', empresa_id)
    .eq('ativo', true)

  if (servico_id) {
    // filter by turmas.servico_id via join — fetch all then filter client side
  }

  const { data: slots } = await query

  const result: SlotComVagas[] = []
  for (const s of (slots ?? []) as any[]) {
    if (servico_id && (s.turmas as any)?.servico_id !== servico_id) continue
    const { count } = await admin
      .from('matricula_slots')
      .select('id', { count: 'exact', head: true })
      .eq('slot_id', s.id)
      .eq('ativo', true)
    const vagasTotal = s.vagas_total ?? 10
    result.push({
      id: s.id,
      turma_id: s.turma_id,
      dia_semana: s.dia_semana,
      hora_inicio: s.hora_inicio,
      hora_fim: s.hora_fim,
      duracao_minutos: s.duracao_minutos,
      vagas_total: vagasTotal,
      vagas_livres: Math.max(0, vagasTotal - (count ?? 0)),
      ativo: s.ativo,
      turmas: s.turmas,
    })
  }

  return result
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
