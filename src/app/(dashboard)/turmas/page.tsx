import { createAdminClient } from '@/lib/supabase/admin'
import { getEmpresaId } from '@/lib/get-empresa-id'
import { TurmasClient } from './turmas-client'
import { listarSlotsComVagasAction } from './actions'

export const dynamic = 'force-dynamic'

const SELECT_SESSAO = `
  id, slot_id, turma_id, data_hora, duracao_minutos, status, observacoes,
  turma_slots(dia_semana, hora_inicio, salas(nome)),
  turmas(nome)
`.trim()

const SELECT_MATRICULA = `
  id, turma_id, paciente_id, plano_id, data_matricula, data_saida, status, observacoes,
  pacientes(nome, telefone),
  turmas(nome),
  turma_planos(nome, frequencia_semanal, valor_mensal)
`.trim()

export default async function TurmasPage() {
  const { empresaId } = await getEmpresaId()
  const admin = createAdminClient()

  const hoje = new Date()
  const janelaInicio = new Date(hoje); janelaInicio.setDate(hoje.getDate() - 7)
  const janelaFim    = new Date(hoje); janelaFim.setDate(hoje.getDate() + 90)

  const [
    { data: turmasRaw },
    { data: slotsRaw },
    { data: planosRaw },
    { data: matriculasRaw },
    { data: matriculaSlots },
    { data: sessoesRaw },
    { data: profissionais },
    { data: salas },
    { data: servicos },
    { data: pacientes },
    { data: sequencias },
    { data: planosServicoRaw },
    { data: novasMatriculasRaw },
  ] = await Promise.all([
    admin.from('turmas')
      .select('id, nome, descricao, profissional_id, sala_id, servico_id, nivel, capacidade_slot, data_inicio, data_fim, ativo, observacoes, profissionais(nome), salas(nome)')
      .eq('empresa_id', empresaId).eq('ativo', true).order('nome'),

    admin.from('turma_slots')
      .select('id, turma_id, dia_semana, hora_inicio, hora_fim, duracao_minutos, sala_id, profissional_id, capacidade_maxima, ativo, sequencia_padrao_id')
      .eq('empresa_id', empresaId),

    admin.from('turma_planos')
      .select('id, turma_id, nome, frequencia_semanal, valor_mensal')
      .eq('empresa_id', empresaId),

    admin.from('turma_matriculas')
      .select(SELECT_MATRICULA)
      .eq('empresa_id', empresaId)
      .order('data_matricula', { ascending: false }),

    admin.from('turma_matricula_slots')
      .select('matricula_id, slot_id')
      .eq('empresa_id', empresaId),

    admin.from('turma_sessoes')
      .select(SELECT_SESSAO)
      .eq('empresa_id', empresaId)
      .gte('data_hora', janelaInicio.toISOString())
      .lte('data_hora', janelaFim.toISOString())
      .order('data_hora'),

    admin.from('profissionais').select('id, nome').eq('empresa_id', empresaId).eq('ativo', true).order('nome'),
    admin.from('salas').select('id, nome').eq('empresa_id', empresaId),
    admin.from('servicos').select('id, nome').eq('empresa_id', empresaId).eq('ativo', true).order('nome'),
    admin.from('pacientes').select('id, nome, telefone').eq('empresa_id', empresaId).eq('status', 'ativo').order('nome'),
    admin.from('sequencias_aula').select('id, nome').eq('empresa_id', empresaId).order('nome'),

    // Novo modelo
    admin.from('planos_servico')
      .select('id, servico_id, nome, dias_semana, valor_mensal, ativo, servicos(nome)')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome'),

    admin.from('matriculas')
      .select('id, paciente_id, plano_id, data_matricula, data_saida, status, observacoes, pacientes(nome, telefone), planos_servico(nome, dias_semana, valor_mensal, servicos(nome))')
      .eq('empresa_id', empresaId)
      .order('criado_em', { ascending: false }),
  ])

  // Debug temporário
  console.log('[turmas/page] empresaId:', empresaId, '| servicos:', servicos?.length ?? 'null', servicos?.map((s:any) => s.nome))

  // Montar slots_ids por matrícula (modelo antigo)
  const slotsByMatricula: Record<string, string[]> = {}
  for (const ms of (matriculaSlots ?? [])) {
    if (!slotsByMatricula[ms.matricula_id]) slotsByMatricula[ms.matricula_id] = []
    slotsByMatricula[ms.matricula_id].push(ms.slot_id)
  }

  // Enriquecer turmas com seus slots e planos
  const turmas = (turmasRaw ?? []).map((t: any) => ({
    ...t,
    slots: (slotsRaw ?? []).filter((s: any) => s.turma_id === t.id),
    planos: (planosRaw ?? []).filter((p: any) => p.turma_id === t.id),
  }))

  // Enriquecer matrículas (modelo antigo) com slots_ids
  const matriculas = (matriculasRaw ?? []).map((m: any) => ({
    ...m,
    slots_ids: slotsByMatricula[m.id] ?? [],
  }))

  // Enriquecer novas matrículas com slots
  const novasMatriculasIds = (novasMatriculasRaw ?? []).map((m: any) => m.id)
  let matriculaSlotsPorId: Record<string, any[]> = {}

  if (novasMatriculasIds.length > 0) {
    const { data: mSlots } = await admin
      .from('matricula_slots')
      .select('id, matricula_id, slot_id, ativo, turma_slots(id, dia_semana, hora_inicio, vagas_total, turmas(id, nome, servico_id))')
      .in('matricula_id', novasMatriculasIds)
      .eq('empresa_id', empresaId)
      .eq('ativo', true)

    for (const ms of (mSlots ?? []) as any[]) {
      if (!matriculaSlotsPorId[ms.matricula_id]) matriculaSlotsPorId[ms.matricula_id] = []
      matriculaSlotsPorId[ms.matricula_id].push(ms)
    }
  }

  const novasMatriculas = (novasMatriculasRaw ?? []).map((m: any) => ({
    ...m,
    slots: matriculaSlotsPorId[m.id] ?? [],
  }))

  // Slots com vagas (novo modelo)
  const slotsComVagas = await listarSlotsComVagasAction()

  return (
    <TurmasClient
      turmas={turmas as any}
      matriculas={matriculas as any}
      sessoes={(sessoesRaw ?? []) as any}
      profissionais={profissionais ?? []}
      salas={salas ?? []}
      servicos={servicos ?? []}
      pacientes={pacientes ?? []}
      sequencias={(sequencias ?? []) as any}
      planosServico={(planosServicoRaw ?? []) as any}
      novasMatriculas={novasMatriculas as any}
      slotsComVagas={slotsComVagas}
    />
  )
}
