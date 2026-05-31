'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getEmpresaId } from '@/lib/get-empresa-id'
import type { ContratoConfig, DadosAluno, DadosPlano } from '@/lib/contrato-pdf'
import { DEFAULT_CONFIG } from '@/lib/contrato-pdf'

export type { ContratoConfig, DadosAluno, DadosPlano }

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
  } catch {
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
  } catch {
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

    // Busca em paralelo: config + matrícula
    const [configResult, { data: mat }] = await Promise.all([
      buscarConfigContratoAction(),
      admin.from('matriculas')
        .select(`
          id, data_matricula, data_saida,
          pacientes(nome, cpf, data_nascimento, telefone, email, endereco),
          planos_servico(nome, dias_semana, valor_mensal, servicos(nome)),
          matricula_slots(ativo, slot_id,
            turma_slots(dia_semana, hora_inicio, hora_fim, duracao_minutos, capacidade_maxima, profissional_id,
              turmas(capacidade_slot, nome)
            )
          )
        `)
        .eq('id', matriculaId)
        .eq('empresa_id', empresaId)
        .maybeSingle(),
    ])

    if ('error' in configResult) return { error: configResult.error }
    if (!mat)                    return { error: 'Matrícula não encontrada.' }

    const config = configResult.config

    // Paciente
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pac = (mat.pacientes as any) as {
      nome: string; cpf?: string; data_nascimento?: string;
      telefone?: string; email?: string;
      endereco?: { rua?: string; numero?: string; bairro?: string; cidade?: string; estado?: string } | null
    } | null

    const end = pac?.endereco
    const endParts = [
      end?.rua && end?.numero ? `${end.rua}, ${end.numero}` : end?.rua,
      end?.bairro,
    ].filter(Boolean)

    const aluno: DadosAluno = {
      nome:            pac?.nome             ?? '___________',
      cpf:             pac?.cpf              ?? null,
      data_nascimento: pac?.data_nascimento  ?? null,
      rg:              null,
      telefone:        pac?.telefone         ?? null,
      email:           pac?.email            ?? null,
      endereco:        endParts.length > 0 ? endParts.join(' — ') : null,
      cidade:          end?.cidade           ?? null,
      estado:          end?.estado           ?? null,
    }

    // Plano
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pl = (mat.planos_servico as any) as {
      nome: string; dias_semana: number; valor_mensal: number;
      servicos?: { nome: string } | null
    } | null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slots = ((mat.matricula_slots as any) as {
      ativo: boolean;
      turma_slots?: {
        dia_semana: number; hora_inicio: string; hora_fim: string;
        duracao_minutos: number; capacidade_maxima?: number;
        profissional_id?: string;
        turmas?: { capacidade_slot?: number; nome?: string } | null
      } | null
    }[] | null) ?? []

    const slotsAtivos = slots.filter(s => s.ativo && s.turma_slots)

    // Busca profissional do primeiro slot, se tiver profissional_id
    const profId = slotsAtivos[0]?.turma_slots?.profissional_id
    let instrNome: string | null = null
    if (profId) {
      const { data: prof } = await admin
        .from('profissionais')
        .select('nome')
        .eq('id', profId)
        .maybeSingle()
      instrNome = prof?.nome ?? null
    }

    const diasNums = [...new Set(slotsAtivos.map(s => s.turma_slots!.dia_semana))].sort()
    const diasStr  = diasNums.length > 0
      ? diasNums.map(d => DIAS_NOME[d]).join(', ')
      : `${pl?.dias_semana ?? 1}x/semana`

    const primeiroSlot = slotsAtivos[0]?.turma_slots
    const horarioStr   = primeiroSlot
      ? `${diasStr} — ${primeiroSlot.hora_inicio.slice(0, 5)}`
      : diasStr

    const plano: DadosPlano = {
      nome_servico:       pl?.servicos?.nome ?? pl?.nome ?? 'Serviço',
      modalidade:         pl?.nome           ?? '___________',
      frequencia_semanal: pl?.dias_semana    ?? 1,
      valor_mensal:       pl?.valor_mensal   ?? 0,
      dias_semana_str:    diasStr,
      horario_str:        horarioStr,
      duracao_minutos:    primeiroSlot?.duracao_minutos  ?? null,
      max_alunos:         primeiroSlot?.capacidade_maxima
                          ?? primeiroSlot?.turmas?.capacidade_slot
                          ?? null,
      nome_instrutor:     instrNome,
      data_inicio:        mat.data_matricula,
      data_fim:           mat.data_saida ?? null,
    }

    return { config, aluno, plano }
  } catch (e) {
    return { error: 'Erro ao gerar dados do contrato.' }
  }
}
