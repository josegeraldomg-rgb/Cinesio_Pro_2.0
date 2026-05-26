'use server'

import { getEmpresaId } from '@/lib/get-empresa-id'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AlertaCritico {
  tipo:      'alergia' | 'cirurgia' | 'patologia'
  descricao: string
}

export interface Medicamento {
  nome:        string
  dosagem:     string
  posologia:   string
  quantidade?: string
  observacao?: string
}

export interface PacienteResumo {
  id:              string
  nome:            string
  cpf:             string | null
  telefone:        string | null
  email:           string | null
  status:          string
  usuario_id:      string | null
  total_registros: number
}

export interface ProntuarioDetalhe {
  paciente: {
    id:              string
    nome:            string
    data_nascimento: string | null
    cpf:             string | null
    telefone:        string | null
    email:           string | null
    convenio:        string | null
    numero_convenio: string | null
    foto_url:        string | null
    status:          string
  }
  prontuario: {
    id:               string
    alergias:         string | null
    antecedentes:     string | null
    medicamentos:     string | null
    alertas_criticos: AlertaCritico[]
    acesso_restrito:  boolean
  }
}

export type TipoRegistro = 'evolucao' | 'prescricao' | 'laudo' | 'atestado' | 'anexo'

export interface RegistroTimeline {
  id:                string
  tipo:              TipoRegistro
  criado_em:         string
  profissional_nome: string | null
  resumo:            string
  dados:             Record<string, unknown>
}

// ─── Listar pacientes com contagem de registros ───────────────────────────────
export async function listarPacientesAction(): Promise<
  { data: PacienteResumo[] } | { error: string }
> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()

    const { data: pacientes, error } = await admin
      .from('pacientes')
      .select('id, nome, cpf, telefone, email, status, usuario_id')
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true })

    if (error) return { error: error.message }

    // Conta registros de cada tipo por paciente em paralelo
    const ids = (pacientes ?? []).map((p: { id: string }) => p.id)

    if (ids.length === 0) return { data: [] }

    const [evols, presc, laud, ates, anex] = await Promise.all([
      admin.from('evolucoes_clinicas').select('paciente_id').eq('empresa_id', empresaId).in('paciente_id', ids),
      admin.from('prescricoes').select('paciente_id').eq('empresa_id', empresaId).in('paciente_id', ids),
      admin.from('laudos').select('paciente_id').eq('empresa_id', empresaId).in('paciente_id', ids),
      admin.from('atestados').select('paciente_id').eq('empresa_id', empresaId).in('paciente_id', ids),
      admin.from('prontuario_anexos').select('paciente_id').eq('empresa_id', empresaId).in('paciente_id', ids),
    ])

    const countMap: Record<string, number> = {}
    for (const id of ids) countMap[id] = 0

    const allRows = [
      ...(evols.data ?? []),
      ...(presc.data ?? []),
      ...(laud.data ?? []),
      ...(ates.data ?? []),
      ...(anex.data ?? []),
    ]
    for (const row of allRows) {
      const pid = (row as { paciente_id: string }).paciente_id
      if (pid in countMap) countMap[pid]++
    }

    const lista: PacienteResumo[] = (pacientes ?? []).map((p: {
      id: string; nome: string; cpf: string | null; telefone: string | null;
      email: string | null; status: string; usuario_id: string | null
    }) => ({
      id:              p.id,
      nome:            p.nome,
      cpf:             p.cpf,
      telefone:        p.telefone,
      email:           p.email,
      status:          p.status,
      usuario_id:      p.usuario_id,
      total_registros: countMap[p.id] ?? 0,
    }))

    return { data: lista }
  } catch (e: unknown) {
    return { error: (e as Error).message ?? 'Erro ao listar pacientes' }
  }
}

// ─── Buscar / criar prontuário de um paciente ─────────────────────────────────
export async function buscarProntuarioAction(pacienteId: string): Promise<
  { data: ProntuarioDetalhe } | { error: string }
> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()

    // Busca paciente
    const { data: pac, error: pacErr } = await admin
      .from('pacientes')
      .select('id, nome, data_nascimento, cpf, telefone, email, convenio, numero_convenio, foto_url, status')
      .eq('id', pacienteId)
      .eq('empresa_id', empresaId)
      .maybeSingle()

    if (pacErr) return { error: pacErr.message }
    if (!pac)   return { error: 'Paciente não encontrado.' }

    // Busca ou cria prontuário
    let { data: pron, error: pronErr } = await admin
      .from('prontuarios')
      .select('id, alergias, antecedentes, medicamentos, alertas_criticos, acesso_restrito')
      .eq('empresa_id', empresaId)
      .eq('paciente_id', pacienteId)
      .maybeSingle()

    if (pronErr) return { error: pronErr.message }

    if (!pron) {
      const { data: novo, error: novoErr } = await admin
        .from('prontuarios')
        .insert({ empresa_id: empresaId, paciente_id: pacienteId })
        .select('id, alergias, antecedentes, medicamentos, alertas_criticos, acesso_restrito')
        .single()
      if (novoErr) return { error: novoErr.message }
      pron = novo
    }

    return {
      data: {
        paciente: {
          id:              pac.id,
          nome:            pac.nome,
          data_nascimento: pac.data_nascimento,
          cpf:             pac.cpf,
          telefone:        pac.telefone,
          email:           pac.email,
          convenio:        pac.convenio,
          numero_convenio: pac.numero_convenio,
          foto_url:        pac.foto_url,
          status:          pac.status,
        },
        prontuario: {
          id:               pron.id,
          alergias:         pron.alergias,
          antecedentes:     pron.antecedentes,
          medicamentos:     pron.medicamentos,
          alertas_criticos: (pron.alertas_criticos as AlertaCritico[]) ?? [],
          acesso_restrito:  pron.acesso_restrito ?? false,
        },
      },
    }
  } catch (e: unknown) {
    return { error: (e as Error).message ?? 'Erro ao buscar prontuário' }
  }
}

// ─── Timeline unificada ───────────────────────────────────────────────────────
export async function listarTimelineAction(
  pacienteId: string,
  filtro: TipoRegistro | 'todos' = 'todos',
): Promise<{ data: RegistroTimeline[] } | { error: string }> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()

    const base = { empresa_id: empresaId, paciente_id: pacienteId }

    // Busca paralela de todos os tipos
    const [evols, prescs, laud, ates, anex] = await Promise.all([
      filtro === 'todos' || filtro === 'evolucao'
        ? admin.from('evolucoes_clinicas')
            .select('id, conteudo, data_atendimento, criado_em, profissionais(nome)')
            .match(base).order('data_atendimento', { ascending: false }).limit(100)
        : Promise.resolve({ data: [] }),

      filtro === 'todos' || filtro === 'prescricao'
        ? admin.from('prescricoes')
            .select('id, tipo, medicamentos, observacoes, data_emissao, criado_em, profissionais(nome)')
            .match(base).order('data_emissao', { ascending: false }).limit(100)
        : Promise.resolve({ data: [] }),

      filtro === 'todos' || filtro === 'laudo'
        ? admin.from('laudos')
            .select('id, titulo, conteudo, cid10, data_emissao, criado_em, profissionais(nome)')
            .match(base).order('data_emissao', { ascending: false }).limit(100)
        : Promise.resolve({ data: [] }),

      filtro === 'todos' || filtro === 'atestado'
        ? admin.from('atestados')
            .select('id, tipo, dias, cid10, observacoes, data_emissao, criado_em, profissionais(nome)')
            .match(base).order('data_emissao', { ascending: false }).limit(100)
        : Promise.resolve({ data: [] }),

      filtro === 'todos' || filtro === 'anexo'
        ? admin.from('prontuario_anexos')
            .select('id, nome, tipo_mime, url, tamanho_bytes, criado_em, profissionais(nome)')
            .match(base).order('criado_em', { ascending: false }).limit(100)
        : Promise.resolve({ data: [] }),
    ])

    const registros: RegistroTimeline[] = []

    for (const row of (evols.data ?? []) as Record<string, unknown>[]) {
      const prof = (row.profissionais as { nome?: string } | null)?.nome ?? null
      registros.push({
        id:                row.id as string,
        tipo:              'evolucao',
        criado_em:         (row.data_atendimento ?? row.criado_em) as string,
        profissional_nome: prof,
        resumo:            String(row.conteudo ?? '').slice(0, 120),
        dados:             row,
      })
    }

    for (const row of (prescs.data ?? []) as Record<string, unknown>[]) {
      const prof = (row.profissionais as { nome?: string } | null)?.nome ?? null
      const meds = (row.medicamentos as Medicamento[]) ?? []
      const resumo = meds.length > 0
        ? meds.map(m => m.nome).join(', ').slice(0, 100)
        : `Prescrição ${row.tipo}`
      registros.push({
        id: row.id as string, tipo: 'prescricao',
        criado_em: (row.data_emissao ?? row.criado_em) as string,
        profissional_nome: prof, resumo, dados: row,
      })
    }

    for (const row of (laud.data ?? []) as Record<string, unknown>[]) {
      const prof = (row.profissionais as { nome?: string } | null)?.nome ?? null
      registros.push({
        id: row.id as string, tipo: 'laudo',
        criado_em: (row.data_emissao ?? row.criado_em) as string,
        profissional_nome: prof,
        resumo: String(row.titulo ?? 'Laudo Técnico'),
        dados: row,
      })
    }

    for (const row of (ates.data ?? []) as Record<string, unknown>[]) {
      const prof = (row.profissionais as { nome?: string } | null)?.nome ?? null
      const tipoLabel: Record<string, string> = { afastamento: 'Afastamento', comparecimento: 'Comparecimento', acompanhamento: 'Acompanhamento' }
      const resumo = `${tipoLabel[row.tipo as string] ?? row.tipo}${row.dias ? ` — ${row.dias} dia(s)` : ''}`
      registros.push({
        id: row.id as string, tipo: 'atestado',
        criado_em: (row.data_emissao ?? row.criado_em) as string,
        profissional_nome: prof, resumo, dados: row,
      })
    }

    for (const row of (anex.data ?? []) as Record<string, unknown>[]) {
      const prof = (row.profissionais as { nome?: string } | null)?.nome ?? null
      registros.push({
        id: row.id as string, tipo: 'anexo',
        criado_em: row.criado_em as string,
        profissional_nome: prof,
        resumo: String(row.nome ?? 'Anexo'),
        dados: row,
      })
    }

    // Ordena por data DESC
    registros.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())

    return { data: registros }
  } catch (e: unknown) {
    return { error: (e as Error).message ?? 'Erro ao carregar timeline' }
  }
}

// ─── Alertas críticos ─────────────────────────────────────────────────────────
export async function salvarAlertasAction(
  prontuarioId: string,
  alertas: AlertaCritico[],
): Promise<{ success: true } | { error: string }> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()
    const { error } = await admin
      .from('prontuarios')
      .update({ alertas_criticos: alertas })
      .eq('id', prontuarioId)
      .eq('empresa_id', empresaId)
    if (error) return { error: error.message }
    return { success: true }
  } catch (e: unknown) {
    return { error: (e as Error).message ?? 'Erro ao salvar alertas' }
  }
}

// ─── Toggle acesso restrito ───────────────────────────────────────────────────
export async function toggleAcessoRestritoAction(
  prontuarioId: string,
  restrito: boolean,
): Promise<{ success: true } | { error: string }> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()
    const { error } = await admin
      .from('prontuarios')
      .update({ acesso_restrito: restrito })
      .eq('id', prontuarioId)
      .eq('empresa_id', empresaId)
    if (error) return { error: error.message }
    return { success: true }
  } catch (e: unknown) {
    return { error: (e as Error).message ?? 'Erro ao atualizar acesso' }
  }
}

// ─── Evolução clínica ─────────────────────────────────────────────────────────
export async function salvarEvolucaoAction(
  pacienteId: string,
  payload: { conteudo: string; profissional_id?: string | null },
): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('evolucoes_clinicas')
      .insert({
        empresa_id:      empresaId,
        paciente_id:     pacienteId,
        profissional_id: payload.profissional_id ?? null,
        conteudo:        payload.conteudo,
        data_atendimento: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (error) return { error: error.message }
    return { success: true, id: data.id }
  } catch (e: unknown) {
    return { error: (e as Error).message ?? 'Erro ao salvar evolução' }
  }
}

// ─── Prescrição ───────────────────────────────────────────────────────────────
export async function salvarPrescricaoAction(
  pacienteId: string,
  payload: {
    tipo:            'simples' | 'especial' | 'antibiotico'
    medicamentos:    Medicamento[]
    observacoes?:    string | null
    cid10?:          string | null
    profissional_id?: string | null
  },
): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('prescricoes')
      .insert({
        empresa_id:      empresaId,
        paciente_id:     pacienteId,
        profissional_id: payload.profissional_id ?? null,
        tipo:            payload.tipo,
        medicamentos:    payload.medicamentos,
        observacoes:     payload.observacoes ?? null,
        cid10:           payload.cid10 ?? null,
      })
      .select('id')
      .single()
    if (error) return { error: error.message }
    return { success: true, id: data.id }
  } catch (e: unknown) {
    return { error: (e as Error).message ?? 'Erro ao salvar prescrição' }
  }
}

// ─── Laudo técnico ────────────────────────────────────────────────────────────
export async function salvarLaudoAction(
  pacienteId: string,
  payload: {
    titulo:          string
    conteudo:        string
    cid10?:          string | null
    profissional_id?: string | null
  },
): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('laudos')
      .insert({
        empresa_id:      empresaId,
        paciente_id:     pacienteId,
        profissional_id: payload.profissional_id ?? null,
        titulo:          payload.titulo,
        conteudo:        payload.conteudo,
        cid10:           payload.cid10 ?? null,
      })
      .select('id')
      .single()
    if (error) return { error: error.message }
    return { success: true, id: data.id }
  } catch (e: unknown) {
    return { error: (e as Error).message ?? 'Erro ao salvar laudo' }
  }
}

// ─── Atestado médico ──────────────────────────────────────────────────────────
export async function salvarAtestadoAction(
  pacienteId: string,
  payload: {
    tipo:            'afastamento' | 'comparecimento' | 'acompanhamento'
    dias?:           number | null
    cid10?:          string | null
    observacoes?:    string | null
    profissional_id?: string | null
  },
): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('atestados')
      .insert({
        empresa_id:      empresaId,
        paciente_id:     pacienteId,
        profissional_id: payload.profissional_id ?? null,
        tipo:            payload.tipo,
        dias:            payload.dias ?? null,
        cid10:           payload.cid10 ?? null,
        observacoes:     payload.observacoes ?? null,
      })
      .select('id')
      .single()
    if (error) return { error: error.message }
    return { success: true, id: data.id }
  } catch (e: unknown) {
    return { error: (e as Error).message ?? 'Erro ao salvar atestado' }
  }
}
