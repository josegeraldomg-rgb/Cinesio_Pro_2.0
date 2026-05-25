import { createAdminClient } from '@/lib/supabase/admin'
import { getEmpresaId } from '@/lib/get-empresa-id'
import { TurmasClient } from './turmas-client'

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
  ] = await Promise.all([
    admin.from('turmas')
      .select('id, nome, descricao, profissional_id, sala_id, servico_id, nivel, capacidade_slot, data_inicio, data_fim, ativo, observacoes, profissionais(nome), salas(nome)')
      .eq('empresa_id', empresaId).eq('ativo', true).order('nome'),

    admin.from('turma_slots')
      .select('id, turma_id, dia_semana, hora_inicio, hora_fim, duracao_minutos, sala_id, profissional_id, capacidade_maxima, ativo')
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
  ])

  // Montar slots_ids por matrícula
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

  // Enriquecer matrículas com slots_ids
  const matriculas = (matriculasRaw ?? []).map((m: any) => ({
    ...m,
    slots_ids: slotsByMatricula[m.id] ?? [],
  }))

  return (
    <TurmasClient
      turmas={turmas as any}
      matriculas={matriculas as any}
      sessoes={(sessoesRaw ?? []) as any}
      profissionais={profissionais ?? []}
      salas={salas ?? []}
      servicos={servicos ?? []}
      pacientes={pacientes ?? []}
    />
  )
}
