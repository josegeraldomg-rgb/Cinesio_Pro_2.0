'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ExercicioBiblioteca {
  id: string
  empresa_id: string | null
  is_sistema: boolean
  nome: string
  descricao: string | null
  grupo_muscular: string | null
  nivel: 'leve' | 'moderado' | 'intenso' | null
  objetivo: string | null
  regiao_corporal: string | null
  aparelho: string | null
  duracao_segundos: number | null
  series_padrao: number | null
  repeticoes_padrao: string | null
  imagem_url: string | null
  video_url: string | null
}

export interface ExercicioSequenciaItem {
  exercicio_id: string
  nome_exercicio: string
  series: number | null
  repeticoes: string | null
  carga: string | null
  obs: string | null
}

export interface SequenciaBiblioteca {
  id: string
  empresa_id: string | null
  is_sistema: boolean
  nome: string
  descricao: string | null
  exercicios: ExercicioSequenciaItem[]
  criado_em: string
}

export interface PlanoExercicio {
  id: string
  empresa_id: string
  paciente_id: string
  paciente_nome?: string
  profissional_id: string | null
  nome: string
  descricao: string | null
  exercicios: ExercicioSequenciaItem[]
  frequencia: string | null
  data_inicio: string
  data_fim: string | null
  ativo: boolean
  criado_em: string
}

export interface FiltrosExercicio {
  busca?: string
  nivel?: string
  grupo_muscular?: string
  regiao_corporal?: string
  aparelho?: string
  objetivo?: string
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

// ─── Exercícios ───────────────────────────────────────────────────────────────

export async function listarExerciciosBibliotecaAction(filtros?: FiltrosExercicio): Promise<
  | { exercicios: ExercicioBiblioteca[] }
  | { error: string }
> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const COLS = 'id, empresa_id, is_sistema, nome, descricao, grupo_muscular, nivel, objetivo, regiao_corporal, aparelho, duracao_segundos, series_padrao, repeticoes_padrao, imagem_url, video_url'

  // Busca em duas consultas separadas para evitar edge-cases do .or() com is_sistema
  const [resEmpresa, resSistema] = await Promise.all([
    admin.from('biblioteca_exercicios').select(COLS).eq('empresa_id', empresa_id).order('nome'),
    admin.from('biblioteca_exercicios').select(COLS).eq('is_sistema', true).order('nome'),
  ])

  if (resEmpresa.error) return { error: resEmpresa.error.message }
  if (resSistema.error) return { error: resSistema.error.message }

  // Merge: sistema primeiro, depois próprios; sem duplicatas
  const idsEmpresa = new Set((resEmpresa.data ?? []).map((e: any) => e.id))
  const merged = [
    ...(resSistema.data ?? []),
    ...(resEmpresa.data ?? []).filter((e: any) => !idsEmpresa.has(e.id) || true), // próprios sempre incluídos
  ]
  // Remove duplicatas que vieram dos dois lados (exercício do sistema duplicado para empresa)
  const seen = new Set<string>()
  const data = merged.filter((e: any) => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })

  let exercicios = (data ?? []) as ExercicioBiblioteca[]

  // Filtros client-side (simpler than complex OR queries)
  if (filtros?.busca) {
    const term = filtros.busca.toLowerCase()
    exercicios = exercicios.filter(e =>
      e.nome.toLowerCase().includes(term) ||
      (e.grupo_muscular ?? '').toLowerCase().includes(term) ||
      (e.objetivo ?? '').toLowerCase().includes(term)
    )
  }
  if (filtros?.nivel) exercicios = exercicios.filter(e => e.nivel === filtros.nivel)
  if (filtros?.grupo_muscular) exercicios = exercicios.filter(e => e.grupo_muscular?.toLowerCase().includes(filtros.grupo_muscular!.toLowerCase()))
  if (filtros?.regiao_corporal) exercicios = exercicios.filter(e => e.regiao_corporal === filtros.regiao_corporal)
  if (filtros?.aparelho) exercicios = exercicios.filter(e => e.aparelho === filtros.aparelho)
  if (filtros?.objetivo) exercicios = exercicios.filter(e => (e.objetivo ?? '').toLowerCase().includes(filtros.objetivo!.toLowerCase()))

  return { exercicios }
}

export async function salvarExercicioBibliotecaAction(payload: {
  id?: string
  nome: string
  descricao?: string | null
  grupo_muscular?: string | null
  nivel?: 'leve' | 'moderado' | 'intenso' | null
  objetivo?: string | null
  regiao_corporal?: string | null
  aparelho?: string | null
  duracao_segundos?: number | null
  series_padrao?: number | null
  repeticoes_padrao?: string | null
  imagem_url?: string | null
  video_url?: string | null
}): Promise<{ success: true; id: string } | { error: string }> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const fields = {
    nome: payload.nome,
    descricao: payload.descricao ?? null,
    grupo_muscular: payload.grupo_muscular ?? null,
    nivel: payload.nivel ?? null,
    objetivo: payload.objetivo ?? null,
    regiao_corporal: payload.regiao_corporal ?? null,
    aparelho: payload.aparelho ?? null,
    duracao_segundos: payload.duracao_segundos ?? null,
    series_padrao: payload.series_padrao ?? null,
    repeticoes_padrao: payload.repeticoes_padrao ?? null,
    imagem_url: payload.imagem_url ?? null,
    video_url: payload.video_url ?? null,
  }

  if (payload.id) {
    // Só pode editar se for da própria empresa (não sistema)
    const { error } = await admin
      .from('biblioteca_exercicios')
      .update(fields)
      .eq('id', payload.id)
      .eq('empresa_id', empresa_id)
    if (error) return { error: error.message }
    revalidatePath('/biblioteca-exercicios')
    return { success: true, id: payload.id }
  }

  const { data, error } = await admin
    .from('biblioteca_exercicios')
    .insert({ ...fields, empresa_id, is_sistema: false })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Erro ao criar exercício.' }
  revalidatePath('/biblioteca-exercicios')
  return { success: true, id: data.id }
}

export async function excluirExercicioBibliotecaAction(id: string): Promise<{ success: true } | { error: string }> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  // Garante que não seja do sistema
  const { data: ex } = await admin
    .from('biblioteca_exercicios')
    .select('is_sistema, empresa_id')
    .eq('id', id)
    .maybeSingle()

  if (!ex) return { error: 'Exercício não encontrado.' }
  if (ex.is_sistema) return { error: 'Exercícios do sistema não podem ser excluídos.' }
  if (ex.empresa_id !== empresa_id) return { error: 'Sem permissão.' }

  const { error } = await admin.from('biblioteca_exercicios').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/biblioteca-exercicios')
  return { success: true }
}

export async function duplicarExercicioSistemaAction(id: string): Promise<{ success: true; id: string } | { error: string }> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { data: original } = await admin
    .from('biblioteca_exercicios')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!original) return { error: 'Exercício não encontrado.' }

  const { id: _id, criado_em: _criado, empresa_id: _emp, is_sistema: _sis, ...campos } = original as any

  const { data, error } = await admin
    .from('biblioteca_exercicios')
    .insert({ ...campos, empresa_id, is_sistema: false })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Erro ao duplicar.' }
  revalidatePath('/biblioteca-exercicios')
  return { success: true, id: data.id }
}

export async function salvarUrlMidiaAction(
  exercicioId: string,
  campo: 'imagem_url' | 'video_url',
  url: string,
): Promise<{ success: true } | { error: string }> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { error } = await admin
    .from('biblioteca_exercicios')
    .update({ [campo]: url })
    .eq('id', exercicioId)
    .eq('empresa_id', empresa_id)

  if (error) return { error: error.message }
  revalidatePath('/biblioteca-exercicios')
  return { success: true }
}

// ─── Sequências ───────────────────────────────────────────────────────────────

export async function listarSequenciasBibliotecaAction(): Promise<
  | { sequencias: SequenciaBiblioteca[] }
  | { error: string }
> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  // Busca em duas consultas separadas para evitar edge-cases do .or() com is_sistema
  const COLS = 'id, empresa_id, is_sistema, nome, descricao, exercicios, criado_em'
  const [resEmpresa, resSistema] = await Promise.all([
    admin.from('sequencias_aula').select(COLS).eq('empresa_id', empresa_id).order('nome'),
    admin.from('sequencias_aula').select(COLS).eq('is_sistema', true).order('nome'),
  ])

  if (resEmpresa.error) return { error: resEmpresa.error.message }
  if (resSistema.error) return { error: resSistema.error.message }

  // Merge sem duplicatas, sistema primeiro
  const seen = new Set<string>()
  const rawData = [...(resSistema.data ?? []), ...(resEmpresa.data ?? [])].filter((s: any) => {
    if (seen.has(s.id)) return false
    seen.add(s.id)
    return true
  })

  // Sistema primeiro, depois próprias
  const sequencias = (rawData as SequenciaBiblioteca[]).sort((a, b) => {
    if (a.is_sistema && !b.is_sistema) return -1
    if (!a.is_sistema && b.is_sistema) return 1
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })

  return { sequencias }
}

export async function salvarSequenciaBibliotecaAction(payload: {
  id?: string
  nome: string
  descricao?: string | null
  exercicios: ExercicioSequenciaItem[]
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
    revalidatePath('/biblioteca-exercicios')
    return { success: true, id: payload.id }
  }

  const { data, error } = await admin
    .from('sequencias_aula')
    .insert({ empresa_id, nome: payload.nome, descricao: payload.descricao ?? null, exercicios: payload.exercicios })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Erro ao criar sequência.' }
  revalidatePath('/biblioteca-exercicios')
  return { success: true, id: data.id }
}

export async function excluirSequenciaBibliotecaAction(id: string): Promise<{ success: true } | { error: string }> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  // Bloqueia exclusão de sequências do sistema
  const { data: seq } = await admin.from('sequencias_aula').select('is_sistema, empresa_id').eq('id', id).maybeSingle()
  if (seq?.is_sistema) return { error: 'Sequências do sistema não podem ser excluídas.' }
  if (seq?.empresa_id !== empresa_id) return { error: 'Sem permissão.' }

  const { error } = await admin
    .from('sequencias_aula')
    .delete()
    .eq('id', id)
    .eq('empresa_id', empresa_id)

  if (error) return { error: error.message }
  revalidatePath('/biblioteca-exercicios')
  return { success: true }
}

export async function duplicarSequenciaSistemaAction(id: string): Promise<{ success: true; id: string } | { error: string }> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { data: original } = await admin
    .from('sequencias_aula')
    .select('nome, descricao, exercicios')
    .eq('id', id)
    .maybeSingle()

  if (!original) return { error: 'Sequência não encontrada.' }

  const { data, error } = await admin
    .from('sequencias_aula')
    .insert({
      empresa_id,
      is_sistema: false,
      nome: `${original.nome} (cópia)`,
      descricao: original.descricao,
      exercicios: original.exercicios,
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Erro ao duplicar.' }
  revalidatePath('/biblioteca-exercicios')
  return { success: true, id: data.id }
}

// ─── Planos de Tratamento ─────────────────────────────────────────────────────

export async function listarPlanosExerciciosAction(): Promise<
  | { planos: PlanoExercicio[] }
  | { error: string }
> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { data, error } = await admin
    .from('planos_exercicios')
    .select('id, empresa_id, paciente_id, profissional_id, nome, descricao, exercicios, frequencia, data_inicio, data_fim, ativo, criado_em, pacientes(nome)')
    .eq('empresa_id', empresa_id)
    .order('criado_em', { ascending: false })

  if (error) return { error: error.message }

  const planos: PlanoExercicio[] = ((data ?? []) as any[]).map(p => ({
    ...p,
    paciente_nome: p.pacientes?.nome ?? 'Paciente',
    pacientes: undefined,
  }))

  return { planos }
}

export async function salvarPlanoExercicioAction(payload: {
  id?: string
  paciente_id: string
  profissional_id?: string | null
  nome: string
  descricao?: string | null
  exercicios: ExercicioSequenciaItem[]
  frequencia?: string | null
  data_inicio: string
  data_fim?: string | null
  ativo?: boolean
}): Promise<{ success: true; id: string } | { error: string }> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const fields = {
    paciente_id: payload.paciente_id,
    profissional_id: payload.profissional_id ?? null,
    nome: payload.nome,
    descricao: payload.descricao ?? null,
    exercicios: payload.exercicios,
    frequencia: payload.frequencia ?? null,
    data_inicio: payload.data_inicio,
    data_fim: payload.data_fim ?? null,
    ativo: payload.ativo ?? true,
  }

  if (payload.id) {
    const { error } = await admin
      .from('planos_exercicios')
      .update(fields)
      .eq('id', payload.id)
      .eq('empresa_id', empresa_id)
    if (error) return { error: error.message }
    revalidatePath('/biblioteca-exercicios')
    return { success: true, id: payload.id }
  }

  const { data, error } = await admin
    .from('planos_exercicios')
    .insert({ ...fields, empresa_id })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Erro ao criar plano.' }
  revalidatePath('/biblioteca-exercicios')
  return { success: true, id: data.id }
}

export async function excluirPlanoExercicioAction(id: string): Promise<{ success: true } | { error: string }> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { error } = await admin
    .from('planos_exercicios')
    .delete()
    .eq('id', id)
    .eq('empresa_id', empresa_id)

  if (error) return { error: error.message }
  revalidatePath('/biblioteca-exercicios')
  return { success: true }
}

// ─── Planejamento semanal por slot ────────────────────────────────────────────

export async function salvarSequenciaSlotAction(payload: {
  slot_id: string
  sequencia_padrao_id: string | null
}): Promise<{ success: true } | { error: string }> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { error } = await admin
    .from('turma_slots')
    .update({ sequencia_padrao_id: payload.sequencia_padrao_id })
    .eq('id', payload.slot_id)
    .eq('empresa_id', empresa_id)

  if (error) return { error: error.message }
  revalidatePath('/turmas')
  return { success: true }
}

// ─── Listas auxiliares (para filtros e autocomplete) ──────────────────────────

export async function listarPacientesAction(): Promise<
  | { pacientes: { id: string; nome: string }[] }
  | { error: string }
> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { data, error } = await admin
    .from('pacientes')
    .select('id, nome')
    .eq('empresa_id', empresa_id)
    .eq('ativo', true)
    .order('nome')

  if (error) return { error: error.message }
  return { pacientes: data ?? [] }
}

export async function listarProfissionaisAction(): Promise<
  | { profissionais: { id: string; nome: string }[] }
  | { error: string }
> {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { data, error } = await admin
    .from('profissionais')
    .select('id, nome')
    .eq('empresa_id', empresa_id)
    .eq('ativo', true)
    .order('nome')

  if (error) return { error: error.message }
  return { profissionais: data ?? [] }
}
