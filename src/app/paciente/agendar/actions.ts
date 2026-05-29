'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { gerarSlots } from '@/lib/scheduling/gerar-slots'
import { enviarMensagem } from '@/lib/whatsapp'

// ─── Helper de contexto do paciente ──────────────────────────────────────────
async function getPatientContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()

  const [{ data: usuario }, { data: paciente }] = await Promise.all([
    admin.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle(),
    admin.from('pacientes')
      .select('id, nome, telefone, ddi, email')
      .eq('usuario_id', user.id)
      .maybeSingle(),
  ])

  if (!usuario?.empresa_id) return { error: 'Empresa não identificada.' }
  if (!paciente) return { error: 'Paciente não encontrado.' }

  return { admin, empresa_id: usuario.empresa_id, paciente, paciente_id: paciente.id }
}

// ─── Tipos exportados ─────────────────────────────────────────────────────────
export interface ProfissionalPortal {
  id: string
  nome: string
  especialidade: string | null
  avatar_url: string | null
  cor_agenda: string
  servicos: ServicoPortal[]
}

export interface ServicoPortal {
  id: string
  nome: string
  duracao_minutos: number
  valor: number
  tipo: string
}

export interface TurmaPortal {
  id: string
  nome: string
  nivel: string
  profissional_nome: string | null
  profissional_id: string | null
  slots: { dia_semana: number; hora_inicio: string; hora_fim: string }[]
  matriculado: boolean
}

export interface ConsultaPortal {
  id: string
  data_hora: string
  status: string
  tipo: string
  profissional_nome: string | null
  profissional_avatar: string | null
  servico_nome: string | null
  pode_cancelar: boolean
  pode_reagendar: boolean
}

// ════════════════════════════════════════════════════════════════
//  BUSCAR DADOS INICIAIS (page.tsx chama direto com admin client)
// ════════════════════════════════════════════════════════════════
export async function buscarDadosAgendarAction(): Promise<{
  profissionais: ProfissionalPortal[]
  turmas: TurmaPortal[]
  consultas: ConsultaPortal[]
  antecedencia_horas: number
  clinica_whatsapp: string | null
  error?: string
}> {
  const ctx = await getPatientContext()
  if ('error' in ctx) return { profissionais: [], turmas: [], consultas: [], antecedencia_horas: 24, clinica_whatsapp: null, error: ctx.error }
  const { admin, empresa_id, paciente_id } = ctx

  const [
    { data: profRaw },
    { data: turmasRaw },
    { data: consultasRaw },
    { data: empresa },
  ] = await Promise.all([
    // Profissionais ativos + seus serviços
    admin
      .from('profissionais')
      .select(`
        id, nome, especialidade, avatar_url, cor_agenda,
        servico_profissional (
          servicos ( id, nome, duracao_minutos, valor, tipo, ativo, modalidade )
        )
      `)
      .eq('empresa_id', empresa_id)
      .eq('ativo', true)
      .order('nome'),

    // Turmas ativas + slots + matrícula do paciente
    admin
      .from('turmas')
      .select(`
        id, nome, nivel, profissional_id,
        profissionais ( nome ),
        turma_slots ( dia_semana, hora_inicio, hora_fim, ativo ),
        turma_matriculas ( id, status, paciente_id )
      `)
      .eq('empresa_id', empresa_id)
      .eq('ativo', true)
      .order('nome'),

    // Consultas: futuras + últimas 30 dias
    admin
      .from('agendamentos')
      .select(`
        id, data_hora, status, tipo,
        profissionais ( nome, avatar_url ),
        servicos ( nome )
      `)
      .eq('paciente_id', paciente_id)
      .gte('data_hora', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())
      .not('status', 'in', '(cancelado,faltou)')
      .order('data_hora', { ascending: false })
      .limit(30),

    // Config da empresa (política de cancelamento + WhatsApp)
    admin.from('empresas').select('telefone, configuracoes').eq('id', empresa_id).single(),
  ])

  // Monta profissionais com serviços ativos
  const profissionais: ProfissionalPortal[] = (profRaw ?? []).map((p) => {
    const servicos: ServicoPortal[] = ((p.servico_profissional as any[]) ?? [])
      .map((sp: any) => sp.servicos)
      .filter((s: any) => s?.ativo && s?.modalidade !== 'turma')
      .map((s: any) => ({
        id: s.id,
        nome: s.nome,
        duracao_minutos: s.duracao_minutos,
        valor: Number(s.valor ?? 0),
        tipo: s.tipo,
      }))
    return {
      id: p.id,
      nome: p.nome,
      especialidade: p.especialidade,
      avatar_url: p.avatar_url,
      cor_agenda: p.cor_agenda ?? '#4A3AE8',
      servicos,
    }
  }).filter(p => p.servicos.length > 0)

  // Monta turmas
  const turmas: TurmaPortal[] = (turmasRaw ?? []).map((t) => {
    const profNome = (t.profissionais as any)?.nome ?? null
    const slots = ((t.turma_slots as any[]) ?? [])
      .filter((s: any) => s.ativo)
      .map((s: any) => ({ dia_semana: s.dia_semana, hora_inicio: s.hora_inicio, hora_fim: s.hora_fim }))
    const matriculado = ((t.turma_matriculas as any[]) ?? [])
      .some((m: any) => m.paciente_id === paciente_id && m.status === 'ativo')
    return {
      id: t.id,
      nome: t.nome,
      nivel: t.nivel,
      profissional_nome: profNome,
      profissional_id: t.profissional_id,
      slots,
      matriculado,
    }
  })

  // Monta consultas com regras de cancelamento
  const config = (empresa?.configuracoes as any) ?? {}
  const antecedencia_horas: number = Number(config.antecedencia_cancelamento_horas ?? 24)

  const agora = Date.now()
  const consultas: ConsultaPortal[] = (consultasRaw ?? []).map((c) => {
    const profissional = (c.profissionais as any) ?? null
    const servico = (c.servicos as any) ?? null
    const dataConsulta = new Date(c.data_hora).getTime()
    const horasRestantes = (dataConsulta - agora) / (1000 * 3600)
    const futura = dataConsulta > agora
    const pode_cancelar = futura && horasRestantes >= antecedencia_horas &&
      ['agendado', 'confirmado'].includes(c.status)
    const pode_reagendar = futura && horasRestantes >= antecedencia_horas &&
      ['agendado', 'confirmado'].includes(c.status)
    return {
      id: c.id,
      data_hora: c.data_hora,
      status: c.status,
      tipo: c.tipo,
      profissional_nome: profissional?.nome ?? null,
      profissional_avatar: profissional?.avatar_url ?? null,
      servico_nome: servico?.nome ?? null,
      pode_cancelar,
      pode_reagendar,
    }
  })

  return {
    profissionais,
    turmas,
    consultas,
    antecedencia_horas,
    clinica_whatsapp: empresa?.telefone ?? null,
  }
}

// ════════════════════════════════════════════════════════════════
//  BUSCAR SLOTS DISPONÍVEIS
// ════════════════════════════════════════════════════════════════
export async function buscarSlotsPortalAction(
  profissional_id: string,
  servico_id: string,
  data: string,        // 'YYYY-MM-DD'
): Promise<{ slots: string[]; sem_turnos?: boolean; bloqueado?: boolean; erro?: string }> {
  const ctx = await getPatientContext()
  if ('error' in ctx) return { slots: [], erro: ctx.error }
  const { admin, empresa_id } = ctx

  // Duração do serviço
  const { data: servico } = await admin
    .from('servicos')
    .select('duracao_minutos')
    .eq('id', servico_id)
    .single()
  if (!servico) return { slots: [], erro: 'Serviço não encontrado.' }

  const dia_semana = new Date(`${data}T12:00:00`).getDay()
  const dataMes = data.slice(5, 7)
  const dataDia = data.slice(8, 10)

  const [{ data: turnos }, { data: agendamentos }, { data: ausencias }, { data: feriados }] =
    await Promise.all([
      admin.from('disponibilidade_profissional')
        .select('hora_inicio, hora_fim, intervalo_minutos, ativo')
        .eq('empresa_id', empresa_id)
        .eq('profissional_id', profissional_id)
        .eq('dia_semana', dia_semana)
        .eq('ativo', true),
      admin.from('agendamentos')
        .select('data_hora, duracao_minutos, status')
        .eq('empresa_id', empresa_id)
        .eq('profissional_id', profissional_id)
        .gte('data_hora', `${data}T00:00:00`)
        .lt('data_hora', `${data}T23:59:59`),
      admin.from('folgas_ferias')
        .select('data_inicio, data_fim, tipo')
        .eq('empresa_id', empresa_id)
        .eq('profissional_id', profissional_id)
        .in('tipo', ['folga', 'ferias', 'outro'])
        .lte('data_inicio', data)
        .gte('data_fim', data),
      admin.from('feriados')
        .select('data, recorrente')
        .eq('empresa_id', empresa_id),
    ])

  const ehFeriado = (feriados ?? []).some((f) =>
    f.recorrente
      ? f.data.slice(5, 7) === dataMes && f.data.slice(8, 10) === dataDia
      : f.data === data
  )
  if (ehFeriado) return { slots: [], bloqueado: true }

  const temAusenciaInteira = (ausencias ?? []).some((a) => !('hora_inicio' in a) || !a.hora_inicio)
  if (temAusenciaInteira && ausencias && ausencias.length > 0) return { slots: [], bloqueado: true }

  if (!turnos || turnos.length === 0) return { slots: [], sem_turnos: true }

  const allSlots = gerarSlots({
    data,
    duracaoMinutos: servico.duracao_minutos,
    turnos: turnos.map((t) => ({
      hora_inicio: t.hora_inicio,
      hora_fim: t.hora_fim,
      intervalo_minutos: t.intervalo_minutos ?? 0,
      ativo: t.ativo ?? true,
    })),
    agendamentos: (agendamentos ?? []).map((a) => ({
      data_hora: a.data_hora,
      duracao_minutos: a.duracao_minutos,
      status: a.status ?? undefined,
    })),
  })

  // Paciente só vê slots disponíveis e futuros
  const agora = new Date().toISOString()
  const disponiveis = allSlots
    .filter((s) => s.status === 'disponivel' && s.inicio > agora)
    .map((s) => s.hhmm)

  return { slots: disponiveis }
}

// ════════════════════════════════════════════════════════════════
//  CRIAR AGENDAMENTO (paciente → própria conta)
// ════════════════════════════════════════════════════════════════
export async function agendarPortalAction(payload: {
  profissional_id: string
  servico_id: string
  data_hora: string      // ISO completo
  observacoes?: string
}): Promise<{ success: true; id: string } | { error: string }> {
  const ctx = await getPatientContext()
  if ('error' in ctx) return { error: ctx.error ?? 'Erro desconhecido.' }
  const { admin, empresa_id, paciente_id, paciente } = ctx

  // Serviço
  const { data: servico } = await admin.from('servicos')
    .select('nome, duracao_minutos, valor')
    .eq('id', payload.servico_id)
    .single()
  if (!servico) return { error: 'Serviço não encontrado.' }

  // Profissional
  const { data: prof } = await admin.from('profissionais')
    .select('nome')
    .eq('id', payload.profissional_id)
    .single()
  if (!prof) return { error: 'Profissional não encontrado.' }

  // Conflito: mesmo profissional no mesmo horário
  const dataFim = new Date(
    new Date(payload.data_hora).getTime() + servico.duracao_minutos * 60_000
  ).toISOString()

  const { data: conflitos } = await admin.from('agendamentos')
    .select('id')
    .eq('empresa_id', empresa_id)
    .eq('profissional_id', payload.profissional_id)
    .not('status', 'in', '(cancelado,faltou)')
    .lt('data_hora', dataFim)
    .gte('data_hora', payload.data_hora)

  if (conflitos && conflitos.length > 0) {
    return { error: 'Esse horário não está mais disponível. Por favor, escolha outro.' }
  }

  // Conflito: paciente já tem agendamento no mesmo horário
  const { data: meuConflito } = await admin.from('agendamentos')
    .select('id')
    .eq('empresa_id', empresa_id)
    .eq('paciente_id', paciente_id)
    .not('status', 'in', '(cancelado,faltou)')
    .eq('data_hora', payload.data_hora)

  if (meuConflito && meuConflito.length > 0) {
    return { error: 'Você já tem um agendamento nesse horário.' }
  }

  // Cria o agendamento
  const { data: novo, error: errInsert } = await admin.from('agendamentos').insert({
    empresa_id,
    paciente_id,
    profissional_id: payload.profissional_id,
    servico_id: payload.servico_id,
    data_hora: payload.data_hora,
    duracao_minutos: servico.duracao_minutos,
    observacoes: payload.observacoes?.trim() || null,
    tipo: 'presencial',
    status: 'agendado',
    canal: 'paciente_app',
    valor: servico.valor ?? null,
  }).select('id').single()

  if (errInsert) return { error: errInsert.message }

  // Confirmação por WhatsApp (fire-and-forget)
  if (paciente.telefone) {
    const dataFormatada = new Date(payload.data_hora).toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long',
    })
    const horaFormatada = new Date(payload.data_hora).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit',
    })
    enviarMensagem({
      ddi: paciente.ddi ?? '55',
      telefone: paciente.telefone,
      mensagem:
        `✅ *Agendamento confirmado!*\n\n` +
        `📋 *Serviço:* ${servico.nome}\n` +
        `👨‍⚕️ *Profissional:* ${prof.nome}\n` +
        `📅 *Data:* ${dataFormatada}\n` +
        `🕐 *Horário:* ${horaFormatada}\n\n` +
        `Qualquer dúvida, estamos à disposição! 😊`,
    }).catch(() => {/* silencioso */})
  }

  revalidatePath('/paciente/home')
  revalidatePath('/paciente/agendar')
  return { success: true, id: novo.id }
}

// ════════════════════════════════════════════════════════════════
//  CANCELAR AGENDAMENTO
// ════════════════════════════════════════════════════════════════
export async function cancelarConsultaPortalAction(
  agendamento_id: string,
): Promise<{ success: true } | { error: string; politica?: string }> {
  const ctx = await getPatientContext()
  if ('error' in ctx) return { error: ctx.error ?? 'Erro desconhecido.' }
  const { admin, empresa_id, paciente_id } = ctx

  // Valida titularidade
  const { data: agendamento } = await admin.from('agendamentos')
    .select('id, data_hora, status')
    .eq('id', agendamento_id)
    .eq('paciente_id', paciente_id)
    .eq('empresa_id', empresa_id)
    .maybeSingle()

  if (!agendamento) return { error: 'Agendamento não encontrado.' }
  if (!['agendado', 'confirmado'].includes(agendamento.status)) {
    return { error: 'Esse agendamento não pode ser cancelado.' }
  }

  // Política de cancelamento
  const { data: empresa } = await admin.from('empresas')
    .select('configuracoes').eq('id', empresa_id).single()
  const config = (empresa?.configuracoes as any) ?? {}
  const antecedencia = Number(config.antecedencia_cancelamento_horas ?? 24)
  const horasRestantes =
    (new Date(agendamento.data_hora).getTime() - Date.now()) / (1000 * 3600)

  if (horasRestantes < antecedencia) {
    return {
      error: `Cancelamentos devem ser feitos com pelo menos ${antecedencia}h de antecedência.`,
      politica: `A consulta está em menos de ${antecedencia}h. Entre em contato com a clínica.`,
    }
  }

  const { error } = await admin.from('agendamentos')
    .update({ status: 'cancelado', updated_at: new Date().toISOString() })
    .eq('id', agendamento_id)

  if (error) return { error: error.message }

  revalidatePath('/paciente/home')
  revalidatePath('/paciente/agendar')
  return { success: true }
}
