'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { gerarSlots, type Slot } from '@/lib/scheduling/gerar-slots'
import {
  gerarDatasOcorrencias,
  toDateStr,
  type RecorrenciaConfig,
} from '@/lib/scheduling/gerar-ocorrencias'
import { dispararOrientacaoAction } from '@/app/(dashboard)/servicos/orientacoes-actions'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' as const }

  const admin = createAdminClient()
  let { data: me } = await admin
    .from('usuarios')
    .select('empresa_id, perfil, id')
    .eq('id', user.id)
    .maybeSingle()

  if (!me && user.email) {
    const r = await admin
      .from('usuarios')
      .select('empresa_id, perfil, id')
      .eq('email', user.email)
      .maybeSingle()
    me = r.data ?? null
  }

  if (!me) return { error: 'Empresa do usuário não identificada.' as const }
  return { admin, empresa_id: me.empresa_id, perfil: me.perfil, userId: me.id }
}

// ════════════════════════════════════════════════════════════════
//                  BUSCAR SLOTS
//   Chamado pelo wizard quando o usuário escolhe uma data.
//   Retorna todos os slots do dia, cada um com status: 'disponivel'
//   ou 'ocupado' — a UI decide como renderizar.
// ════════════════════════════════════════════════════════════════
export interface SlotsResult {
  slots: Slot[]
  bloqueado_por_ausencia?: boolean
  motivo_bloqueio?: 'folga' | 'ferias' | 'feriado' | null
  sem_turnos?: boolean
  erro?: string
}

export async function buscarSlotsAction(
  profissional_id: string,
  data: string,                  // 'YYYY-MM-DD'
  duracaoMinutos: number,
): Promise<SlotsResult> {
  const ctx = await getContext()
  if ('error' in ctx) return { slots: [], erro: ctx.error }
  const { admin, empresa_id } = ctx

  if (!profissional_id || !data || duracaoMinutos < 1) {
    return { slots: [], erro: 'Parâmetros incompletos.' }
  }

  // Dia da semana 0..6
  const dia_semana = new Date(`${data}T00:00:00`).getDay()

  const [dataMes, dataDia] = [data.slice(5, 7), data.slice(8, 10)]

  const [
    { data: turnos },
    { data: agendamentos },
    { data: ausencias },
    { data: feriados },
  ] = await Promise.all([
    admin
      .from('disponibilidade_profissional')
      .select('hora_inicio, hora_fim, intervalo_minutos, ativo')
      .eq('empresa_id', empresa_id)
      .eq('profissional_id', profissional_id)
      .eq('dia_semana', dia_semana)
      .eq('ativo', true),

    admin
      .from('agendamentos')
      .select('data_hora, duracao_minutos, status')
      .eq('empresa_id', empresa_id)
      .eq('profissional_id', profissional_id)
      .gte('data_hora', `${data}T00:00:00`)
      .lt('data_hora', `${data}T23:59:59`),

    admin
      .from('folgas_ferias')
      .select('data_inicio, data_fim, hora_inicio, hora_fim, profissional_id, tipo')
      .eq('empresa_id', empresa_id)
      .eq('profissional_id', profissional_id)   // apenas ausências deste profissional
      .in('tipo', ['folga', 'ferias', 'outro'])
      .lte('data_inicio', data)
      .gte('data_fim', data),

    // Feriados: tabela dedicada — bloqueia qualquer dia para toda a clínica
    admin
      .from('feriados')
      .select('data, recorrente')
      .eq('empresa_id', empresa_id),
  ])

  // Verifica se o dia é um feriado (data exata ou recorrente por MM-DD)
  const ehFeriado = (feriados ?? []).some(f =>
    f.recorrente
      ? f.data.slice(5, 7) === dataMes && f.data.slice(8, 10) === dataDia
      : f.data === data
  )
  if (ehFeriado) {
    return { slots: [], bloqueado_por_ausencia: true, motivo_bloqueio: 'feriado' }
  }

  if (ausencias && ausencias.length > 0) {
    // Separa ausências: dia-inteiro vs. horário parcial
    const diaInteiro = ausencias.find(a => !a.hora_inicio && !a.hora_fim)
    if (diaInteiro) {
      return {
        slots: [],
        bloqueado_por_ausencia: true,
        motivo_bloqueio: (diaInteiro.tipo as any) ?? null,
      }
    }
    // Ausência parcial: gera slots normalmente depois e filtra
  }

  if (!turnos || turnos.length === 0) {
    return { slots: [], sem_turnos: true }
  }

  let slots = gerarSlots({
    data,
    duracaoMinutos,
    turnos: turnos.map(t => ({
      hora_inicio: t.hora_inicio,
      hora_fim: t.hora_fim,
      intervalo_minutos: t.intervalo_minutos ?? 0,
      ativo: t.ativo,
    })),
    agendamentos: (agendamentos ?? []).map(a => ({
      data_hora: a.data_hora,
      duracao_minutos: a.duracao_minutos,
      status: a.status,
    })),
    ausencias: [],
  })

  // Ausência parcial: marca como 'ocupado' slots que colide com o intervalo bloqueado
  const ausenciaParcial = (ausencias ?? []).find(a => a.hora_inicio || a.hora_fim)
  if (ausenciaParcial) {
    const hhmmToMin = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number)
      return h * 60 + (m || 0)
    }
    // Determina o intervalo bloqueado para este dia específico
    let bloqIni: number
    let bloqFim: number
    if (data === ausenciaParcial.data_inicio && data === ausenciaParcial.data_fim) {
      bloqIni = ausenciaParcial.hora_inicio ? hhmmToMin(ausenciaParcial.hora_inicio) : 0
      bloqFim = ausenciaParcial.hora_fim    ? hhmmToMin(ausenciaParcial.hora_fim)    : 24 * 60
    } else if (data === ausenciaParcial.data_inicio) {
      bloqIni = ausenciaParcial.hora_inicio ? hhmmToMin(ausenciaParcial.hora_inicio) : 0
      bloqFim = 24 * 60
    } else {
      bloqIni = 0
      bloqFim = ausenciaParcial.hora_fim ? hhmmToMin(ausenciaParcial.hora_fim) : 24 * 60
    }
    slots = slots.map(s => {
      const sIni = hhmmToMin(s.hhmm)
      const sFim = sIni + duracaoMinutos
      if (sIni < bloqFim && sFim > bloqIni) return { ...s, status: 'ocupado' as const }
      return s
    })
  }

  return { slots }
}

// ════════════════════════════════════════════════════════════════
//                  CRIAR AGENDAMENTO
// ════════════════════════════════════════════════════════════════
export interface NovoAgendamentoPayload {
  paciente_id: string
  profissional_id: string
  servico_id: string
  data_hora: string                  // ISO completo, ex: 2026-05-30T14:30:00
  duracao_minutos: number
  observacoes?: string | null
  desconto_percentual?: number       // 0..100
  valor_final?: number               // já com desconto aplicado
  telemedicina?: boolean
  com_cobranca?: boolean             // true = aguardando pagamento online
  forcar_overbooking?: boolean
}

export async function criarAgendamentoAction(payload: NovoAgendamentoPayload) {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const {
    paciente_id, profissional_id, servico_id, data_hora, duracao_minutos,
    observacoes, telemedicina, forcar_overbooking,
  } = payload

  if (!paciente_id || !profissional_id || !servico_id || !data_hora || duracao_minutos < 1) {
    return { error: 'Dados incompletos para criar o agendamento.' }
  }

  // Checagem de overbooking — só faz se NÃO foi forçado
  if (!forcar_overbooking) {
    const dataInicio = new Date(data_hora)
    const dataFim    = new Date(dataInicio.getTime() + duracao_minutos * 60_000)

    const { data: conflitos } = await admin
      .from('agendamentos')
      .select('id, data_hora, duracao_minutos, status')
      .eq('empresa_id', empresa_id)
      .eq('profissional_id', profissional_id)
      .not('status', 'in', '(cancelado,faltou)')

    const colide = (conflitos ?? []).some(c => {
      const cIni = new Date(c.data_hora)
      const cFim = new Date(cIni.getTime() + (c.duracao_minutos ?? 0) * 60_000)
      return dataInicio < cFim && dataFim > cIni
    })

    if (colide) {
      return { error: 'Esse horário já está ocupado. Use o modo "Forçar agendamento" para criar um encaixe.' }
    }
  }

  const { data: novo, error } = await admin
    .from('agendamentos')
    .insert({
      empresa_id,
      paciente_id,
      profissional_id,
      servico_id,
      data_hora,
      duracao_minutos,
      observacoes: observacoes ?? null,
      tipo: telemedicina ? 'teleconsulta' : 'presencial',
      status: 'agendado',
      canal: 'sistema',
      criado_por_id: ctx.userId,
      valor: payload.valor_final ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Dispara orientação automática (fire-and-forget — não bloqueia a resposta)
  if (novo?.id) {
    dispararOrientacaoAction({
      empresa_id:      empresa_id,
      servico_id:      servico_id,
      profissional_id: profissional_id,
      paciente_id:     paciente_id,
      data_hora,
    }).catch(() => { /* silencioso — log interno apenas */ })
  }

  revalidatePath('/agenda')
  return { success: true, id: novo?.id }
}

// ════════════════════════════════════════════════════════════════
//              ATUALIZAR STATUS DO AGENDAMENTO
// ════════════════════════════════════════════════════════════════
export async function atualizarStatusAgendamentoAction(
  id: string,
  status: 'confirmado' | 'realizado' | 'cancelado' | 'faltou',
) {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { error } = await admin
    .from('agendamentos')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('empresa_id', empresa_id)

  if (error) return { error: error.message }
  revalidatePath('/agenda')
  return { success: true }
}

// ════════════════════════════════════════════════════════════════
//               CRIAR AGENDAMENTO RECORRENTE
//   Gera todas as datas da série, verifica conflitos individualmente
//   e insere em batch. Datas com conflito são puladas e retornadas.
// ════════════════════════════════════════════════════════════════
export interface NovoAgendamentoRecorrentePayload {
  paciente_id: string
  profissional_id: string
  servico_id: string
  /** "HH:MM" — hora da sessão */
  hora: string
  duracao_minutos: number
  observacoes?: string | null
  telemedicina?: boolean
  forcar_overbooking?: boolean
  recorrencia: RecorrenciaConfig & { data_inicio: string }
}

export async function criarAgendamentoRecorrenteAction(
  payload: NovoAgendamentoRecorrentePayload,
): Promise<{ success: true; criados: number; pulados: string[] } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error ?? 'Não autenticado.' }
  const { admin, empresa_id } = ctx

  const {
    paciente_id, profissional_id, servico_id,
    hora, duracao_minutos, observacoes, telemedicina,
    recorrencia,
  } = payload

  if (!paciente_id || !profissional_id || !servico_id || !hora || duracao_minutos < 1) {
    return { error: 'Dados incompletos para criar a série recorrente.' }
  }

  // 1. Gerar todas as datas da série
  const dataInicio = new Date(recorrencia.data_inicio + 'T00:00:00')
  const datas = gerarDatasOcorrencias(dataInicio, recorrencia)

  if (datas.length === 0) {
    return { error: 'Nenhuma data gerada com as configurações de recorrência informadas.' }
  }

  // 2. Buscar todos os agendamentos existentes do profissional no período
  //    (1 query só, para evitar N queries)
  const dataFimPeriodo = new Date(datas[datas.length - 1])
  dataFimPeriodo.setHours(23, 59, 59, 999)

  const { data: existentes, error: errExist } = await admin
    .from('agendamentos')
    .select('data_hora, duracao_minutos, status')
    .eq('profissional_id', profissional_id)
    .eq('empresa_id', empresa_id)
    .not('status', 'in', '(cancelado,faltou)')
    .gte('data_hora', dataInicio.toISOString())
    .lte('data_hora', dataFimPeriodo.toISOString())

  if (errExist) return { error: errExist.message }

  // 3. Para cada data, verificar conflito e separar em "inserir" vs "pular"
  const [horaH, horaM] = hora.split(':').map(Number)

  const paraInserir: {
    empresa_id: string; paciente_id: string; profissional_id: string
    servico_id: string; data_hora: string; duracao_minutos: number
    observacoes: string | null; tipo: string; status: string
  }[] = []
  const pulados: string[] = []

  for (const d of datas) {
    // Montar data_hora exata desta ocorrência — mesmo formato do agendamento avulso
    // ("YYYY-MM-DDThh:mm:00", sem timezone) para que o Supabase trate como UTC
    // e o slice(11,16) da agenda-client leia a hora corretamente.
    const dataStr    = toDateStr(d)
    const dataHoraStr = `${dataStr}T${hora}:00`

    // Valores para checagem de conflito como Date (UTC)
    const dt    = new Date(`${dataStr}T${hora}:00Z`)
    const dtFim = new Date(dt.getTime() + duracao_minutos * 60_000)

    // Verificar colisão com agendamentos existentes
    const colide = (existentes ?? []).some(ex => {
      const exIni = new Date(ex.data_hora)
      const exFim = new Date(exIni.getTime() + (ex.duracao_minutos ?? 0) * 60_000)
      return dt < exFim && dtFim > exIni
    })

    if (colide) {
      pulados.push(dataStr)
      continue
    }

    paraInserir.push({
      empresa_id,
      paciente_id,
      profissional_id,
      servico_id,
      data_hora: dataHoraStr,
      duracao_minutos,
      observacoes: observacoes ?? null,
      tipo: telemedicina ? 'teleconsulta' : 'presencial',
      status: 'agendado',
    })
  }

  if (paraInserir.length === 0) {
    return { error: 'Todas as datas da série têm conflito de horário. Nenhum agendamento foi criado.' }
  }

  // 4. Inserir o registro da regra de recorrência
  const { data: regra, error: errRegra } = await admin
    .from('recorrencias')
    .insert({
      empresa_id,
      paciente_id,
      profissional_id,
      servico_id,
      frequencia:      recorrencia.frequencia,
      intervalo_dias:  recorrencia.intervalo_dias ?? null,
      hora,
      duracao_minutos,
      tipo_fim:        recorrencia.tipo_fim,
      total_sessoes:   recorrencia.total_sessoes ?? null,
      data_fim:        recorrencia.data_fim ?? null,
      data_inicio:     recorrencia.data_inicio,
      observacoes:     observacoes ?? null,
    })
    .select('id')
    .single()

  if (errRegra || !regra) return { error: errRegra?.message ?? 'Erro ao salvar regra de recorrência.' }

  // 5. Bulk insert dos agendamentos com recorrencia_id
  const agendamentosComId = paraInserir.map(a => ({
    ...a,
    recorrencia_id: regra.id,
    canal: 'sistema',
    criado_por_id: ctx.userId,
  }))
  const { error: errInsert } = await admin.from('agendamentos').insert(agendamentosComId)

  if (errInsert) return { error: errInsert.message }

  revalidatePath('/agenda')
  return { success: true, criados: paraInserir.length, pulados }
}
