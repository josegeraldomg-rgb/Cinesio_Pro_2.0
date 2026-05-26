'use server'

import { getEmpresaId } from '@/lib/get-empresa-id'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Tipos ────────────────────────────────────────────────────────────────────

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

export interface ProfissionalItem {
  id:           string
  nome:         string
  crefito:      string | null
  especialidade:string | null
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
    id:           string
    alergias:     string | null
    antecedentes: string | null
    medicamentos: string | null
    anamnese:     string | null   // usado internamente para controle de restrição de acesso
  }
  empresa: {
    nome:     string
    telefone: string | null
    email:    string | null
    cnpj:     string | null
  }
  profissionais: ProfissionalItem[]
}

// Tipos de registro na timeline — todos persistidos em evolucoes_clinicas
// com prefixo no campo `conteudo`: "PRESCRICAO:{...json}", "LAUDO:{...json}", etc.
export type TipoRegistro = 'evolucao' | 'plano' | 'prescricao' | 'laudo' | 'atestado' | 'anexo' | 'copiloto'

export interface RegistroTimeline {
  id:                string
  tipo:              TipoRegistro
  criado_em:         string
  profissional_nome: string | null
  resumo:            string
  dados:             Record<string, unknown>
}

// ─── Parser interno de conteúdo ───────────────────────────────────────────────

const DOC_PREFIXES: TipoRegistro[] = ['prescricao', 'laudo', 'atestado', 'anexo', 'copiloto']

function parseConteudo(conteudo: string): { tipo: TipoRegistro; dados: Record<string, unknown>; resumo: string } {
  for (const tipo of DOC_PREFIXES) {
    const prefix = tipo.toUpperCase() + ':'
    if (conteudo.startsWith(prefix)) {
      try {
        const dados = JSON.parse(conteudo.slice(prefix.length)) as Record<string, unknown>
        let resumo = ''
        if (tipo === 'prescricao') resumo = String(dados.medicamentos ?? '').slice(0, 100)
        if (tipo === 'laudo')      resumo = String(dados.titulo ?? 'Laudo Técnico')
        if (tipo === 'atestado')   resumo = `Atestado${dados.dias ? ` — ${dados.dias} dia(s)` : ''}`
        if (tipo === 'anexo')      resumo = String(dados.nome ?? 'Arquivo anexado')
        if (tipo === 'copiloto')   resumo = String(dados.queixa ?? 'Registro por IA').slice(0, 100)
        return { tipo, dados, resumo }
      } catch {
        return { tipo: 'evolucao', dados: { conteudo }, resumo: conteudo.slice(0, 120) }
      }
    }
  }
  return { tipo: 'evolucao', dados: { conteudo }, resumo: conteudo.slice(0, 120) }
}

// ─── Listar pacientes ─────────────────────────────────────────────────────────
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

    const ids = (pacientes ?? []).map((p: { id: string }) => p.id)
    if (ids.length === 0) return { data: [] }

    const [evols, planos] = await Promise.all([
      admin.from('evolucoes_clinicas').select('paciente_id').eq('empresa_id', empresaId).in('paciente_id', ids),
      admin.from('planos_tratamento').select('paciente_id').eq('empresa_id', empresaId).in('paciente_id', ids),
    ])

    const countMap: Record<string, number> = {}
    for (const id of ids) countMap[id] = 0
    for (const row of [...(evols.data ?? []), ...(planos.data ?? [])]) {
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

// ─── Buscar / criar prontuário ────────────────────────────────────────────────
export async function buscarProntuarioAction(pacienteId: string): Promise<
  { data: ProntuarioDetalhe } | { error: string }
> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()

    const { data: pac, error: pacErr } = await admin
      .from('pacientes')
      .select('id, nome, data_nascimento, cpf, telefone, email, convenio, numero_convenio, foto_url, status')
      .eq('id', pacienteId)
      .eq('empresa_id', empresaId)
      .maybeSingle()

    if (pacErr) return { error: pacErr.message }
    if (!pac)   return { error: 'Paciente não encontrado.' }

    let { data: pron, error: pronErr } = await admin
      .from('prontuarios')
      .select('id, alergias, antecedentes, medicamentos, anamnese')
      .eq('empresa_id', empresaId)
      .eq('paciente_id', pacienteId)
      .maybeSingle()

    if (pronErr) return { error: pronErr.message }

    if (!pron) {
      const { data: novo, error: novoErr } = await admin
        .from('prontuarios')
        .insert({ empresa_id: empresaId, paciente_id: pacienteId })
        .select('id, alergias, antecedentes, medicamentos, anamnese')
        .single()
      if (novoErr) return { error: novoErr.message }
      pron = novo
    }

    // Busca empresa e profissionais em paralelo
    const [empRes, profRes] = await Promise.all([
      admin.from('empresas').select('nome, telefone, email, cnpj').eq('id', empresaId).maybeSingle(),
      admin.from('profissionais').select('id, nome, crefito, especialidade').eq('empresa_id', empresaId).eq('ativo', true).order('nome'),
    ])

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
          id:           pron.id,
          alergias:     pron.alergias,
          antecedentes: pron.antecedentes,
          medicamentos: pron.medicamentos,
          anamnese:     pron.anamnese,
        },
        empresa: {
          nome:     empRes.data?.nome     ?? 'Clínica',
          telefone: empRes.data?.telefone ?? null,
          email:    empRes.data?.email    ?? null,
          cnpj:     empRes.data?.cnpj     ?? null,
        },
        profissionais: ((profRes.data ?? []) as { id:string; nome:string; crefito:string|null; especialidade:string|null }[]).map(p => ({
          id:           p.id,
          nome:         p.nome,
          crefito:      p.crefito,
          especialidade:p.especialidade,
        })),
      },
    }
  } catch (e: unknown) {
    return { error: (e as Error).message ?? 'Erro ao buscar prontuário' }
  }
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
export async function listarTimelineAction(
  pacienteId: string,
  filtro: TipoRegistro | 'todos' = 'todos',
): Promise<{ data: RegistroTimeline[] } | { error: string }> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()

    const base = { empresa_id: empresaId, paciente_id: pacienteId }

    // Registros que vêm de evolucoes_clinicas (todos os tipos de documento)
    const docTypes: TipoRegistro[] = ['evolucao', 'prescricao', 'laudo', 'atestado', 'anexo', 'copiloto']
    const incluirEvols = filtro === 'todos' || docTypes.includes(filtro as TipoRegistro)
    const incluirPlano = filtro === 'todos' || filtro === 'plano'

    const [evols, planos] = await Promise.all([
      incluirEvols
        ? admin.from('evolucoes_clinicas')
            .select('id, conteudo, data_atendimento, criado_em:created_at, profissionais(nome)')
            .match(base).order('data_atendimento', { ascending: false }).limit(200)
        : Promise.resolve({ data: [] }),

      incluirPlano
        ? admin.from('planos_tratamento')
            .select('id, diagnostico_clinico, cid10, status, data_inicio, sessoes_previstas, sessoes_realizadas, criado_em:created_at, profissionais(nome)')
            .match(base).order('created_at', { ascending: false }).limit(100)
        : Promise.resolve({ data: [] }),
    ])

    const registros: RegistroTimeline[] = []

    for (const row of (evols.data ?? []) as Record<string, unknown>[]) {
      const conteudo = String(row.conteudo ?? '')
      const { tipo, dados, resumo } = parseConteudo(conteudo)

      // Se filtrando por tipo específico, pular os que não batem
      if (filtro !== 'todos' && filtro !== tipo) continue

      const prof = (row.profissionais as { nome?: string } | null)?.nome ?? null
      registros.push({
        id:                row.id as string,
        tipo,
        criado_em:         ((row.data_atendimento ?? row.criado_em) as string),
        profissional_nome: prof,
        resumo,
        dados,
      })
    }

    for (const row of (planos.data ?? []) as Record<string, unknown>[]) {
      const prof = (row.profissionais as { nome?: string } | null)?.nome ?? null
      registros.push({
        id:                row.id as string,
        tipo:              'plano',
        criado_em:         row.criado_em as string,
        profissional_nome: prof,
        resumo:            String(row.diagnostico_clinico ?? 'Plano de Tratamento').slice(0, 120),
        dados:             row,
      })
    }

    registros.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    return { data: registros }
  } catch (e: unknown) {
    return { error: (e as Error).message ?? 'Erro ao carregar timeline' }
  }
}

// ─── Salvar prontuário base ───────────────────────────────────────────────────
export async function salvarProntuarioAction(
  prontuarioId: string,
  payload: { alergias?: string; antecedentes?: string; medicamentos?: string },
): Promise<{ success: true } | { error: string }> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()
    const { error } = await admin
      .from('prontuarios')
      .update(payload)
      .eq('id', prontuarioId)
      .eq('empresa_id', empresaId)
    if (error) return { error: error.message }
    return { success: true }
  } catch (e: unknown) {
    return { error: (e as Error).message ?? 'Erro ao salvar prontuário' }
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
        empresa_id:       empresaId,
        paciente_id:      pacienteId,
        profissional_id:  payload.profissional_id ?? null,
        conteudo:         payload.conteudo,
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

// ─── Documento genérico (Prescrição / Laudo / Atestado / Anexo / Copiloto) ────
// Salvo como evolucoes_clinicas com prefixo: "TIPO:{json}"
export async function salvarDocumentoAction(
  pacienteId: string,
  tipo: 'prescricao' | 'laudo' | 'atestado' | 'anexo' | 'copiloto',
  dados: Record<string, unknown>,
  profissional_id?: string | null,
): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()
    const conteudo = tipo.toUpperCase() + ':' + JSON.stringify(dados)
    const { data, error } = await admin
      .from('evolucoes_clinicas')
      .insert({
        empresa_id:       empresaId,
        paciente_id:      pacienteId,
        profissional_id:  profissional_id ?? null,
        conteudo,
        data_atendimento: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (error) return { error: error.message }
    return { success: true, id: data.id }
  } catch (e: unknown) {
    return { error: (e as Error).message ?? 'Erro ao salvar documento' }
  }
}

// ─── Restrição de acesso ──────────────────────────────────────────────────────
// Armazena hash da senha em prontuarios.anamnese como JSON controlado
export async function restringirAcessoAction(
  prontuarioId: string,
  dados: { hash: string; profissional_id: string | null },
): Promise<{ success: true } | { error: string }> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()
    const lock = JSON.stringify({
      _locked:      true,
      hash:         dados.hash,
      locked_by:    dados.profissional_id,
      locked_at:    new Date().toISOString(),
    })
    const { error } = await admin
      .from('prontuarios')
      .update({ anamnese: lock })
      .eq('id', prontuarioId)
      .eq('empresa_id', empresaId)
    if (error) return { error: error.message }
    return { success: true }
  } catch (e: unknown) {
    return { error: (e as Error).message ?? 'Erro ao restringir acesso' }
  }
}

export async function removerRestricaoAction(
  prontuarioId: string,
): Promise<{ success: true } | { error: string }> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()
    const { error } = await admin
      .from('prontuarios')
      .update({ anamnese: null })
      .eq('id', prontuarioId)
      .eq('empresa_id', empresaId)
    if (error) return { error: error.message }
    return { success: true }
  } catch (e: unknown) {
    return { error: (e as Error).message ?? 'Erro ao remover restrição' }
  }
}

// ─── Plano de tratamento ──────────────────────────────────────────────────────
export async function salvarPlanoAction(
  pacienteId: string,
  payload: {
    diagnostico_clinico: string
    cid10?:              string | null
    sessoes_previstas?:  number | null
    data_inicio?:        string | null
    observacoes?:        string | null
    profissional_id?:    string | null
  },
): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('planos_tratamento')
      .insert({
        empresa_id:          empresaId,
        paciente_id:         pacienteId,
        profissional_id:     payload.profissional_id ?? null,
        diagnostico_clinico: payload.diagnostico_clinico,
        cid10:               payload.cid10 ?? null,
        sessoes_previstas:   payload.sessoes_previstas ?? null,
        data_inicio:         payload.data_inicio ?? new Date().toISOString().slice(0, 10),
        observacoes:         payload.observacoes ?? null,
        status:              'ativo',
      })
      .select('id')
      .single()
    if (error) return { error: error.message }
    return { success: true, id: data.id }
  } catch (e: unknown) {
    return { error: (e as Error).message ?? 'Erro ao salvar plano' }
  }
}
