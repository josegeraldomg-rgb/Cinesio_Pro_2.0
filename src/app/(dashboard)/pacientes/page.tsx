import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEmpresaId } from '@/lib/get-empresa-id'
import { redirect } from 'next/navigation'
import { PacientesClient } from './pacientes-client'
import { listarSlotsComVagasAction } from '@/app/(dashboard)/turmas/actions'

export const dynamic = 'force-dynamic'

export default async function PacientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { empresaId } = await getEmpresaId()
  const admin = createAdminClient()

  const [
    { data: pacientes },
    { data: planosServicoRaw },
    slotsComVagasResult,
    servicosResult,
    { data: evolucoes },
    { data: planosTrat },
    { data: matriculasAtivasRaw },
    { data: turmaMatriculasRaw },
  ] = await Promise.all([
    admin
      .from('pacientes')
      .select(`
        id, nome, cpf, email, data_nascimento, sexo_biologico,
        ddi, telefone, responsavel_id, contato_emergencia, observacoes,
        endereco, status, foto_url, token_completar, token_expires_at,
        agendamentos(data_hora, status, servicos(tipo))
      `)
      .eq('empresa_id', empresaId)
      .order('nome'),

    admin
      .from('planos_servico')
      .select('id, servico_id, nome, dias_semana, valor_mensal, ativo')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome'),

    listarSlotsComVagasAction(),

    // Tenta filtrar por modalidade='turma'; fallback sem filtro
    (async () => {
      const r = await admin.from('servicos').select('id, nome').eq('empresa_id', empresaId).eq('ativo', true).eq('modalidade', 'turma').order('nome')
      if (r.error?.message?.includes('modalidade')) {
        return admin.from('servicos').select('id, nome').eq('empresa_id', empresaId).eq('ativo', true).order('nome')
      }
      return r
    })(),

    // Contagem de registros de prontuário — evoluções clínicas
    admin.from('evolucoes_clinicas').select('paciente_id').eq('empresa_id', empresaId),

    // Contagem de registros de prontuário — planos de tratamento
    admin.from('planos_tratamento').select('paciente_id').eq('empresa_id', empresaId),

    // Matrículas ativas (modelo novo) — para contar aulas/semana
    admin.from('matriculas').select('id, paciente_id').eq('empresa_id', empresaId).eq('status', 'ativo'),

    // Matrículas ativas (modelo antigo) — para contar aulas/semana via turma_planos
    admin.from('turma_matriculas').select('paciente_id, plano_id').eq('empresa_id', empresaId).eq('status', 'ativo'),
  ])

  const servicos = (servicosResult as any).data ?? []

  // Enriquecer planos com nome do serviço
  const servicosMap = Object.fromEntries(servicos.map((s: any) => [s.id, s]))
  const planosServico = (planosServicoRaw ?? []).map((p: any) => ({
    ...p,
    servicos: servicosMap[p.servico_id] ? { nome: servicosMap[p.servico_id].nome } : null,
  }))

  // Montar mapa pacienteId → total de registros de prontuário
  const prontuarioCount: Record<string, number> = {}
  for (const row of [...(evolucoes ?? []), ...(planosTrat ?? [])]) {
    const pid = (row as any).paciente_id
    prontuarioCount[pid] = (prontuarioCount[pid] ?? 0) + 1
  }

  // ── Contar aulas/semana por paciente ────────────────────────────────────────
  const aulasSemanaisPorPaciente: Record<string, number> = {}

  // Modelo novo: matricula_slots por matricula_id
  const matriculaIds = (matriculasAtivasRaw ?? []).map((m: any) => m.id)
  if (matriculaIds.length > 0) {
    const { data: slotsAtivosRaw } = await admin
      .from('matricula_slots')
      .select('matricula_id')
      .in('matricula_id', matriculaIds)
      .neq('ativo', false)

    const matriculaParaPaciente = Object.fromEntries(
      (matriculasAtivasRaw ?? []).map((m: any) => [m.id, m.paciente_id])
    )
    for (const slot of (slotsAtivosRaw ?? [])) {
      const pid = matriculaParaPaciente[(slot as any).matricula_id]
      if (pid) aulasSemanaisPorPaciente[pid] = (aulasSemanaisPorPaciente[pid] ?? 0) + 1
    }
  }

  // Modelo antigo: turma_planos.dias_semana por plano_id
  const planoIdsAntigos = [...new Set((turmaMatriculasRaw ?? []).map((m: any) => m.plano_id).filter(Boolean))]
  if (planoIdsAntigos.length > 0) {
    const { data: turmaPlanos } = await admin
      .from('turma_planos')
      .select('id, dias_semana')
      .in('id', planoIdsAntigos)

    const turmaPlanoMap = Object.fromEntries((turmaPlanos ?? []).map((p: any) => [p.id, p.dias_semana ?? []]))
    for (const mat of (turmaMatriculasRaw ?? [])) {
      const pid = (mat as any).paciente_id
      const dias: string[] = turmaPlanoMap[(mat as any).plano_id] ?? []
      if (pid && dias.length > 0) {
        aulasSemanaisPorPaciente[pid] = (aulasSemanaisPorPaciente[pid] ?? 0) + dias.length
      }
    }
  }

  return (
    <Suspense>
      <PacientesClient
        pacientes={(pacientes ?? []) as any}
        servicos={servicos}
        planosServico={planosServico}
        slotsComVagas={slotsComVagasResult as any}
        prontuarioCount={prontuarioCount}
        aulasSemanaisPorPaciente={aulasSemanaisPorPaciente}
      />
    </Suspense>
  )
}
