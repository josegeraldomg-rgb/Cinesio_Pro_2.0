'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getEmpresaId } from '@/lib/get-empresa-id'
import type { ContratoConfig, DadosAluno, DadosPlano } from '@/lib/contrato-pdf'
import { DEFAULT_CONFIG } from '@/lib/contrato-pdf'

// Re-lança erros especiais do Next.js (redirect, not-found) que não devem ser engolidos
function isNextInternalError(e: unknown): boolean {
  return !!(e && typeof e === 'object' && 'digest' in e)
}

// ─── Carregar configurações ────────────────────────────────────────────────────

export async function buscarConfigContratoAction(): Promise<
  | { error: string }
  | { config: ContratoConfig }
> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()

    const [{ data: empresa }, { data: primeiroProfissional }] = await Promise.all([
      admin.from('empresas')
        .select('nome, cnpj, telefone, email, configuracoes')
        .eq('id', empresaId)
        .maybeSingle(),
      admin.from('profissionais')
        .select('nome, crefito')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome')
        .limit(1)
        .maybeSingle(),
    ])

    const saved = ((empresa?.configuracoes as Record<string, unknown>)?.contrato_config ?? {}) as Partial<ContratoConfig>

    // Pré-preenche com dados da empresa, mas salvo tem prioridade
    const config: ContratoConfig = {
      ...DEFAULT_CONFIG,
      razao_social:          empresa?.nome        ?? '',
      cnpj:                  empresa?.cnpj        ?? '',
      telefone_empresa:      empresa?.telefone    ?? '',
      email_empresa:         empresa?.email       ?? '',
      email_dpo:             empresa?.email       ?? '',
      responsavel_tecnico:   primeiroProfissional?.nome    ?? '',
      registro_profissional: primeiroProfissional?.crefito ?? '',
      // Sobrescreve com configurações salvas pelo usuário
      ...saved,
    }

    return { config }
  } catch (e) {
    if (isNextInternalError(e)) throw e
    return { error: 'Erro ao carregar configurações do contrato.' }
  }
}

// ─── Salvar configurações ──────────────────────────────────────────────────────

export async function salvarConfigContratoAction(
  config: ContratoConfig,
): Promise<{ success: true } | { error: string }> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()

    const { data: empresa } = await admin
      .from('empresas')
      .select('configuracoes')
      .eq('id', empresaId)
      .maybeSingle()

    const existing = (empresa?.configuracoes ?? {}) as Record<string, unknown>

    const { error } = await admin
      .from('empresas')
      .update({ configuracoes: { ...existing, contrato_config: config } })
      .eq('id', empresaId)

    if (error) return { error: error.message }
    return { success: true }
  } catch (e) {
    if (isNextInternalError(e)) throw e
    return { error: 'Erro ao salvar configurações do contrato.' }
  }
}

// ─── Gerar dados de contrato para um aluno específico ─────────────────────────

const DIAS_NOME = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']

export async function gerarContratoAlunoAction(matriculaId: string): Promise<
  | { error: string }
  | { config: ContratoConfig; aluno: DadosAluno; plano: DadosPlano }
> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()

    // 1. Busca config + dados básicos da matrícula em paralelo
    const [configResult, { data: mat }] = await Promise.all([
      buscarConfigContratoAction(),
      admin.from('matriculas')
        .select('id, paciente_id, plano_id, data_matricula, data_saida')
        .eq('id', matriculaId)
        .eq('empresa_id', empresaId)
        .maybeSingle(),
    ])

    if ('error' in configResult) return { error: configResult.error }
    if (!mat) return { error: 'Matrícula não encontrada.' }

    const config = configResult.config

    // 2. Busca dados complementares em paralelo
    const [
      { data: paciente },
      { data: planoServico },
      { data: matSlots },
    ] = await Promise.all([
      admin.from('pacientes')
        .select('nome, cpf, data_nascimento, telefone, email, endereco')
        .eq('id', mat.paciente_id)
        .eq('empresa_id', empresaId)
        .maybeSingle(),
      mat.plano_id
        ? admin.from('planos_servico')
            .select('id, nome, dias_semana, valor_mensal, servico_id')
            .eq('id', mat.plano_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      admin.from('matricula_slots')
        .select('slot_id, ativo')
        .eq('matricula_id', matriculaId)
        .eq('ativo', true),
    ])

    // 3. Busca nome do serviço e slots da turma (se houver plano/slots)
    const slotIds = (matSlots ?? []).map((s: any) => s.slot_id).filter(Boolean)

    const [{ data: servico }, { data: turmaSlots }] = await Promise.all([
      planoServico?.servico_id
        ? admin.from('servicos').select('nome').eq('id', planoServico.servico_id).maybeSingle()
        : Promise.resolve({ data: null }),
      slotIds.length > 0
        ? admin.from('turma_slots')
            .select('id, dia_semana, hora_inicio, hora_fim, duracao_minutos, capacidade_maxima, profissional_id, turmas(capacidade_slot)')
            .in('id', slotIds)
        : Promise.resolve({ data: [] }),
    ])

    // 4. Busca nome do profissional do primeiro slot (se tiver)
    const primeiroSlot = (turmaSlots as any[])?.[0]
    const profId = primeiroSlot?.profissional_id
    let instrNome: string | null = null
    if (profId) {
      const { data: prof } = await admin
        .from('profissionais').select('nome').eq('id', profId).maybeSingle()
      instrNome = prof?.nome ?? null
    }

    // ── Monta DadosAluno ──
    const end = (paciente?.endereco as any) as {
      rua?: string; numero?: string; bairro?: string; cidade?: string; estado?: string
    } | null | undefined

    const endParts = [
      end?.rua && end?.numero ? `${end.rua}, ${end.numero}` : end?.rua,
      end?.bairro,
    ].filter(Boolean)

    const aluno: DadosAluno = {
      nome:            paciente?.nome            ?? '___________',
      cpf:             (paciente as any)?.cpf    ?? null,
      data_nascimento: (paciente as any)?.data_nascimento ?? null,
      rg:              null,
      telefone:        paciente?.telefone        ?? null,
      email:           (paciente as any)?.email  ?? null,
      endereco:        endParts.length > 0 ? endParts.join(' — ') : null,
      cidade:          end?.cidade               ?? null,
      estado:          end?.estado               ?? null,
    }

    // ── Monta DadosPlano ──
    const diasNums = [...new Set((turmaSlots as any[] ?? []).map((s: any) => s.dia_semana))].sort() as number[]
    const diasStr  = diasNums.length > 0
      ? diasNums.map(d => DIAS_NOME[d]).join(', ')
      : `${planoServico?.dias_semana ?? 1}x/semana`

    const horarioStr = primeiroSlot
      ? `${diasStr} — ${String(primeiroSlot.hora_inicio).slice(0, 5)}`
      : diasStr

    const plano: DadosPlano = {
      nome_servico:       servico?.nome ?? planoServico?.nome ?? 'Serviço',
      modalidade:         planoServico?.nome ?? '___________',
      frequencia_semanal: planoServico?.dias_semana ?? 1,
      valor_mensal:       planoServico?.valor_mensal ?? 0,
      dias_semana_str:    diasStr,
      horario_str:        horarioStr,
      duracao_minutos:    primeiroSlot?.duracao_minutos  ?? null,
      max_alunos:         primeiroSlot?.capacidade_maxima
                          ?? (primeiroSlot?.turmas as any)?.capacidade_slot
                          ?? null,
      nome_instrutor:     instrNome,
      data_inicio:        mat.data_matricula,
      data_fim:           mat.data_saida ?? null,
    }

    return { config, aluno, plano }
  } catch (e) {
    if (isNextInternalError(e)) throw e
    return { error: 'Erro ao gerar dados do contrato.' }
  }
}
