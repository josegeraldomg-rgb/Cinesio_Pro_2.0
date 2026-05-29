'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { gerarLinkWaMe } from '@/lib/whatsapp'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ExercicioSequencia {
  exercicio_id: string
  nome_exercicio: string
  series: number | null
  repeticoes: string | null   // "12-15" ou "30s" etc.
  carga: string | null
  obs: string | null
}

export interface Sequencia {
  id: string
  nome: string
  descricao: string | null
  exercicios: ExercicioSequencia[]
  criado_em: string
}

export interface Exercicio {
  id: string
  nome: string
  descricao: string | null
  grupo_muscular: string | null
  nivel: 'leve' | 'moderado' | 'intenso' | null
}

export interface PresencaAluno {
  matricula_id: string
  paciente_id: string
  paciente_nome: string
  paciente_telefone: string | null
  paciente_ddi: string | null
  status: 'presente' | 'faltou' | 'justificado' | ''
  evolucao_individual: string
}

export interface SessaoPresenca {
  id: string
  turma_id: string
  turma_nome: string
  profissional_id: string | null
  data_hora: string
  duracao_minutos: number
  status: string
  sequencia_id: string | null
  sequencias_ids: string[]
  evolucao_padrao: string | null
}

export interface ConfigPresenca {
  trava_horas: number
  validade_credito_dias: number
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

type Ctx = { error: string } | { admin: ReturnType<typeof createAdminClient>; empresa_id: string }

async function getCtx(): Promise<Ctx> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }
  const admin = createAdminClient()
  const { data: me } = await admin.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
  if (!me?.empresa_id) return { error: 'Empresa não encontrada.' }
  return { admin, empresa_id: String(me.empresa_id) }
}

// ─── buscarSessaoPresencaAction ───────────────────────────────────────────────

export async function buscarSessaoPresencaAction(sessaoId: string): Promise<
  | {
      sessao: SessaoPresenca
      alunos: PresencaAluno[]
      presencasExistentes: Record<string, { status: string; evolucao_individual: string | null }>
      travada: boolean
      config: ConfigPresenca
    }
  | { error: string }
> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  // Busca configuração (DB29 / DB35)
  const { data: empresa } = await admin
    .from('empresas')
    .select('configuracoes')
    .eq('id', empresa_id)
    .maybeSingle()

  const cfg = (empresa?.configuracoes ?? {}) as Record<string, unknown>
  const config: ConfigPresenca = {
    trava_horas: typeof cfg.presenca_trava_horas === 'number' ? cfg.presenca_trava_horas : 48,
    validade_credito_dias: typeof cfg.reposicao_validade_dias === 'number' ? cfg.reposicao_validade_dias : 30,
  }

  // Busca sessão — tenta com sequencias_ids; se a coluna não existir ainda, recai sem ela
  let sessaoRaw: Record<string, unknown> | null = null
  let errSessao: { message: string } | null = null

  const r1 = await admin
    .from('turma_sessoes')
    .select('id, turma_id, slot_id, data_hora, duracao_minutos, status, sequencia_id, sequencias_ids, evolucao_padrao, turmas(nome, profissional_id)')
    .eq('id', sessaoId)
    .eq('empresa_id', empresa_id)
    .maybeSingle()

  if (r1.error && r1.error.message.includes('sequencias_ids')) {
    // Coluna ainda não existe no banco — faz fallback sem ela
    const r2 = await admin
      .from('turma_sessoes')
      .select('id, turma_id, slot_id, data_hora, duracao_minutos, status, sequencia_id, evolucao_padrao, turmas(nome, profissional_id)')
      .eq('id', sessaoId)
      .eq('empresa_id', empresa_id)
      .maybeSingle()
    sessaoRaw = (r2.data as Record<string, unknown> | null)
    errSessao = r2.error
  } else {
    sessaoRaw = (r1.data as Record<string, unknown> | null)
    errSessao = r1.error
  }

  if (errSessao || !sessaoRaw) return { error: errSessao?.message ?? 'Sessão não encontrada.' }

  // Auto-preenchimento: usa sequencia_padrao_id do slot quando a sessão ainda não tem sequência definida
  let sequenciaEfetiva: string | null = (sessaoRaw as any).sequencia_id ?? null
  if (!sequenciaEfetiva && (sessaoRaw as any).slot_id) {
    const { data: slotRaw } = await admin
      .from('turma_slots')
      .select('sequencia_padrao_id')
      .eq('id', (sessaoRaw as any).slot_id)
      .maybeSingle()
    sequenciaEfetiva = (slotRaw as any)?.sequencia_padrao_id ?? null
  }

  // sequencias_ids: usa o novo campo se existir; senão inicializa com o sequencia_id herdado
  const rawSeqIds: string[] = Array.isArray((sessaoRaw as any).sequencias_ids)
    ? (sessaoRaw as any).sequencias_ids
    : []
  const sequenciasIdsEfetivas: string[] = rawSeqIds.length > 0
    ? rawSeqIds
    : (sequenciaEfetiva ? [sequenciaEfetiva] : [])

  const sr = sessaoRaw as any
  const sessao: SessaoPresenca = {
    id: sr.id as string,
    turma_id: sr.turma_id as string,
    turma_nome: sr.turmas?.nome ?? 'Turma',
    profissional_id: sr.turmas?.profissional_id ?? null,
    data_hora: sr.data_hora as string,
    duracao_minutos: sr.duracao_minutos as number,
    status: sr.status as string,
    sequencia_id: sequenciaEfetiva,
    sequencias_ids: sequenciasIdsEfetivas,
    evolucao_padrao: sr.evolucao_padrao ?? null,
  }

  // Verifica trava temporal (RN8)
  const horasDesde = (Date.now() - new Date(sessao.data_hora).getTime()) / 3_600_000
  const travada = horasDesde > config.trava_horas

  // Busca alunos — union do modelo antigo + novo modelo

  // Modelo antigo: turma_matriculas WHERE turma_id AND status='ativo'
  const { data: matriculasAntigas } = await admin
    .from('turma_matriculas')
    .select('id, paciente_id, pacientes(nome, telefone, ddi)')
    .eq('turma_id', sessao.turma_id)
    .eq('empresa_id', empresa_id)
    .eq('status', 'ativo')

  // Modelo novo: matricula_slots WHERE slot_id=sessao.slot_id AND ativo=true
  //             → matriculas WHERE status='ativo' → pacientes
  let matriculasNovas: any[] = []
  if ((sessaoRaw as any).slot_id) {
    const { data: mSlots } = await admin
      .from('matricula_slots')
      .select('matricula_id, matriculas(id, paciente_id, status, pacientes(nome, telefone, ddi))')
      .eq('slot_id', (sessaoRaw as any).slot_id)
      .eq('empresa_id', empresa_id)
      .eq('ativo', true)

    matriculasNovas = ((mSlots ?? []) as any[])
      .filter(ms => (ms.matriculas as any)?.status === 'ativo')
      .map(ms => ({
        id: (ms.matriculas as any)?.id,
        paciente_id: (ms.matriculas as any)?.paciente_id,
        pacientes: (ms.matriculas as any)?.pacientes,
        _fromNovoModelo: true,
      }))
  }

  // Merge e deduplica por paciente_id
  const vistos = new Set<string>()
  const todosAlunos: any[] = []
  for (const m of [...(matriculasAntigas ?? []), ...matriculasNovas]) {
    if (!vistos.has(m.paciente_id)) {
      vistos.add(m.paciente_id)
      todosAlunos.push(m)
    }
  }

  const alunos: PresencaAluno[] = todosAlunos
    .sort((a, b) => (a.pacientes?.nome ?? '').localeCompare(b.pacientes?.nome ?? '', 'pt-BR'))
    .map((m: any) => ({
      matricula_id: m.id,
      paciente_id: m.paciente_id,
      paciente_nome: m.pacientes?.nome ?? 'Paciente',
      paciente_telefone: m.pacientes?.telefone ?? null,
      paciente_ddi: m.pacientes?.ddi ?? null,
      status: '',
      evolucao_individual: '',
    }))

  // Busca presenças já registradas para esta sessão
  const { data: presencasRaw } = await admin
    .from('turma_presencas')
    .select('paciente_id, status, evolucao_individual')
    .eq('sessao_id', sessaoId)
    .eq('empresa_id', empresa_id)

  const presencasExistentes: Record<string, { status: string; evolucao_individual: string | null }> = {}
  for (const p of presencasRaw ?? []) {
    presencasExistentes[p.paciente_id] = {
      status: p.status,
      evolucao_individual: p.evolucao_individual ?? null,
    }
  }

  return { sessao, alunos, presencasExistentes, travada, config }
}

// ─── buscarSessoesDisponiveis ─────────────────────────────────────────────────

export async function buscarSessoesDisponiveisAction(turmaId: string): Promise<
  | { sessoes: { id: string; data_hora: string; status: string }[] }
  | { error: string }
> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { data, error } = await admin
    .from('turma_sessoes')
    .select('id, data_hora, status')
    .eq('turma_id', turmaId)
    .eq('empresa_id', empresa_id)
    .neq('status', 'cancelada')
    .order('data_hora', { ascending: true })   // ASC para o dropdown ficar em ordem cronológica

  if (error) return { error: error.message }
  return { sessoes: data ?? [] }
}

// ─── salvarPresencaEvolucaoAction ─────────────────────────────────────────────

export async function salvarPresencaEvolucaoAction(payload: {
  sessao_id: string
  turma_id: string
  profissional_id: string | null
  evolucao_padrao: string
  sequencia_id: string | null
  sequencias_ids: string[]
  presencas: { paciente_id: string; status: string; evolucao_individual: string }[]
}): Promise<{ success: true } | { error: string }> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  // Verifica trava
  const { data: sessaoCheck } = await admin
    .from('turma_sessoes')
    .select('data_hora')
    .eq('id', payload.sessao_id)
    .eq('empresa_id', empresa_id)
    .maybeSingle()

  if (!sessaoCheck) return { error: 'Sessão não encontrada.' }

  const { data: empresa } = await admin
    .from('empresas')
    .select('configuracoes')
    .eq('id', empresa_id)
    .maybeSingle()

  const cfg = (empresa?.configuracoes ?? {}) as Record<string, unknown>
  const travasHoras = typeof cfg.presenca_trava_horas === 'number' ? cfg.presenca_trava_horas : 48
  const horasDesde = (Date.now() - new Date(sessaoCheck.data_hora).getTime()) / 3_600_000
  if (horasDesde > travasHoras) return { error: 'Sessão travada para edição.' }

  // Upsert turma_presencas (sem turma_id — coluna não existe na tabela)
  const presencasInsert = payload.presencas
    .filter(p => p.status !== '')
    .map(p => ({
      empresa_id,
      sessao_id: payload.sessao_id,
      paciente_id: p.paciente_id,
      status: p.status,
      evolucao_individual: p.evolucao_individual || null,
    }))

  if (presencasInsert.length > 0) {
    const { error: errPresenca } = await admin
      .from('turma_presencas')
      .upsert(presencasInsert, { onConflict: 'sessao_id,paciente_id' })

    if (errPresenca) return { error: errPresenca.message }
  }

  // Atualiza turma_sessoes — tenta com sequencias_ids; se coluna não existir, salva sem ela
  const updatePayloadComColuna = {
    sequencia_id: payload.sequencias_ids[0] ?? payload.sequencia_id,
    sequencias_ids: payload.sequencias_ids,
    evolucao_padrao: payload.evolucao_padrao || null,
    status: 'realizada',
  }
  const updatePayloadSemColuna = {
    sequencia_id: payload.sequencias_ids[0] ?? payload.sequencia_id,
    evolucao_padrao: payload.evolucao_padrao || null,
    status: 'realizada',
  }

  let errSessao: { message: string } | null = null
  const upd1 = await admin
    .from('turma_sessoes')
    .update(updatePayloadComColuna)
    .eq('id', payload.sessao_id)
    .eq('empresa_id', empresa_id)

  if (upd1.error && upd1.error.message.includes('sequencias_ids')) {
    // Coluna ainda não existe — salva sem ela
    const upd2 = await admin
      .from('turma_sessoes')
      .update(updatePayloadSemColuna)
      .eq('id', payload.sessao_id)
      .eq('empresa_id', empresa_id)
    errSessao = upd2.error
  } else {
    errSessao = upd1.error
  }

  if (errSessao) return { error: errSessao.message }

  // RN9: insere evolucoes_clinicas para cada aluno presente
  const presentes = payload.presencas.filter(p => p.status === 'presente')
  if (presentes.length > 0 && payload.profissional_id) {
    const evolucoes = presentes.map(p => {
      const partes = [payload.evolucao_padrao, p.evolucao_individual].filter(Boolean)
      return {
        empresa_id,
        paciente_id: p.paciente_id,
        profissional_id: payload.profissional_id!,
        data_atendimento: sessaoCheck.data_hora,
        conteudo: partes.join('\n\n') || 'Presença registrada.',
      }
    })

    // Insert sem upsert — cada chamada cria novo registro no prontuário
    await admin.from('evolucoes_clinicas').insert(evolucoes)
  }

  revalidatePath(`/turmas`)
  return { success: true }
}

// ─── criarCreditoReposicaoAction ──────────────────────────────────────────────

export async function criarCreditoReposicaoAction(payload: {
  paciente_id: string
  turma_id: string
  sessao_id: string
  motivo: string | null
  telefone: string | null
  ddi: string | null
}): Promise<{ success: true; link_whatsapp: string | null } | { error: string }> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  // Busca validade configurada
  const { data: empresa } = await admin
    .from('empresas')
    .select('configuracoes, nome')
    .eq('id', empresa_id)
    .maybeSingle()

  const cfg = (empresa?.configuracoes ?? {}) as Record<string, unknown>
  const validadeDias = typeof cfg.reposicao_validade_dias === 'number' ? cfg.reposicao_validade_dias : 30

  const dataExpiracao = new Date()
  dataExpiracao.setDate(dataExpiracao.getDate() + validadeDias)

  const { error } = await admin
    .from('creditos_reposicao')
    .insert({
      empresa_id,
      paciente_id: payload.paciente_id,
      turma_id: payload.turma_id,
      sessao_id: payload.sessao_id,
      motivo: payload.motivo,
      data_expiracao: dataExpiracao.toISOString().split('T')[0],
      utilizado: false,
    })

  if (error) return { error: error.message }

  // Gera link WhatsApp se tiver telefone
  let link_whatsapp: string | null = null
  if (payload.telefone && payload.ddi) {
    const dataExp = dataExpiracao.toLocaleDateString('pt-BR')
    const nomeClinica = empresa?.nome ?? 'Clínica'
    const mensagem = `Olá! A *${nomeClinica}* gerou um crédito de reposição de aula para você. Válido até ${dataExp}. Entre em contato para agendar sua reposição. 😊`
    link_whatsapp = gerarLinkWaMe({ ddi: payload.ddi, telefone: payload.telefone, mensagem })
  }

  return { success: true, link_whatsapp }
}

// ─── Sequências ───────────────────────────────────────────────────────────────

export async function listarSequenciasAction(): Promise<
  | { sequencias: Sequencia[] }
  | { error: string }
> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  // Inclui sequências do sistema (empresa_id IS NULL) + da empresa
  const { data, error } = await admin
    .from('sequencias_aula')
    .select('id, nome, descricao, exercicios, criado_em')
    .or(`empresa_id.eq.${empresa_id},is_sistema.eq.true`)
    .order('nome')

  if (error) return { error: error.message }
  return { sequencias: (data ?? []) as Sequencia[] }
}

export async function salvarSequenciaAction(payload: {
  id?: string
  nome: string
  descricao?: string | null
  exercicios: ExercicioSequencia[]
}): Promise<{ success: true; id: string } | { error: string }> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  if (payload.id) {
    const { error } = await admin
      .from('sequencias_aula')
      .update({ nome: payload.nome, descricao: payload.descricao ?? null, exercicios: payload.exercicios })
      .eq('id', payload.id)
      .eq('empresa_id', empresa_id)
    if (error) return { error: error.message }
    return { success: true, id: payload.id }
  }

  const { data, error } = await admin
    .from('sequencias_aula')
    .insert({ empresa_id, nome: payload.nome, descricao: payload.descricao ?? null, exercicios: payload.exercicios })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Erro ao criar sequência.' }
  return { success: true, id: data.id }
}

export async function excluirSequenciaAction(id: string): Promise<{ success: true } | { error: string }> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { error } = await admin
    .from('sequencias_aula')
    .delete()
    .eq('id', id)
    .eq('empresa_id', empresa_id)

  if (error) return { error: error.message }
  return { success: true }
}

// ─── Exercícios ───────────────────────────────────────────────────────────────

export async function listarExerciciosAction(): Promise<
  | { exercicios: Exercicio[] }
  | { error: string }
> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { data, error } = await admin
    .from('biblioteca_exercicios')
    .select('id, nome, descricao, grupo_muscular, nivel')
    .eq('empresa_id', empresa_id)
    .order('nome')

  if (error) return { error: error.message }
  return { exercicios: (data ?? []) as Exercicio[] }
}

export async function salvarExercicioAction(payload: {
  id?: string
  nome: string
  descricao?: string | null
  grupo_muscular?: string | null
  nivel?: 'leve' | 'moderado' | 'intenso' | null
}): Promise<{ success: true; id: string } | { error: string }> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  if (payload.id) {
    const { error } = await admin
      .from('biblioteca_exercicios')
      .update({
        nome: payload.nome,
        descricao: payload.descricao ?? null,
        grupo_muscular: payload.grupo_muscular ?? null,
        nivel: payload.nivel ?? null,
      })
      .eq('id', payload.id)
      .eq('empresa_id', empresa_id)
    if (error) return { error: error.message }
    return { success: true, id: payload.id }
  }

  const { data, error } = await admin
    .from('biblioteca_exercicios')
    .insert({
      empresa_id,
      nome: payload.nome,
      descricao: payload.descricao ?? null,
      grupo_muscular: payload.grupo_muscular ?? null,
      nivel: payload.nivel ?? null,
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Erro ao criar exercício.' }
  return { success: true, id: data.id }
}

export async function excluirExercicioAction(id: string): Promise<{ success: true } | { error: string }> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { error } = await admin
    .from('biblioteca_exercicios')
    .delete()
    .eq('id', id)
    .eq('empresa_id', empresa_id)

  if (error) return { error: error.message }
  return { success: true }
}

// ─── Config DB29 / DB35 ───────────────────────────────────────────────────────

export async function buscarConfigPresencaAction(): Promise<
  | { config: ConfigPresenca }
  | { error: string }
> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { data } = await admin
    .from('empresas')
    .select('configuracoes')
    .eq('id', empresa_id)
    .maybeSingle()

  const cfg = (data?.configuracoes ?? {}) as Record<string, unknown>
  return {
    config: {
      trava_horas: typeof cfg.presenca_trava_horas === 'number' ? cfg.presenca_trava_horas : 48,
      validade_credito_dias: typeof cfg.reposicao_validade_dias === 'number' ? cfg.reposicao_validade_dias : 30,
    },
  }
}

export async function salvarConfigPresencaAction(payload: ConfigPresenca): Promise<{ success: true } | { error: string }> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  // Merge no jsonb existente
  const { data: atual } = await admin
    .from('empresas')
    .select('configuracoes')
    .eq('id', empresa_id)
    .maybeSingle()

  const novaConfig = {
    ...(atual?.configuracoes ?? {}),
    presenca_trava_horas: payload.trava_horas,
    reposicao_validade_dias: payload.validade_credito_dias,
  }

  const { error } = await admin
    .from('empresas')
    .update({ configuracoes: novaConfig })
    .eq('id', empresa_id)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return { success: true }
}
