import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AgendaPageClient } from './agenda-page-client'

export default async function AgendaPage() {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios').select('empresa_id').eq('id', user.id).single()
  const empresaId = usuario?.empresa_id ?? ''

  const hoje = new Date()
  const inicioSemana = new Date(hoje)
  inicioSemana.setDate(hoje.getDate() - hoje.getDay() + 1)
  const fimSemana = new Date(inicioSemana)
  fimSemana.setDate(inicioSemana.getDate() + 6)

  const hojeStr = hoje.toISOString().split('T')[0]

  // Janela de agendamentos: 1 semana atrás → 16 semanas adiante (~4 meses).
  // Cobre navegação livre e séries recorrentes longas sem novo fetch.
  const janelaInicio = new Date(hoje); janelaInicio.setDate(hoje.getDate() - 7)
  const janelaFim    = new Date(hoje); janelaFim.setDate(hoje.getDate() + 112)

  const [
    { data: agendamentosJanela },
    { data: historico },
    { data: profissionais },
    { data: salas },
    { data: servicos },
    { data: ausencias },
    { data: feriados },
    { data: pacientes },
    { data: vinculos },
    { data: turnos },
    { data: listaEsperaRaw },
  ] = await Promise.all([
    supabase.from('agendamentos')
      .select('*, pacientes(nome, foto_url), profissionais(id, nome, cor_agenda), servicos(nome, tipo, valor), salas(nome), criado_por:criado_por_id(id, nome, perfil), recorrencias:recorrencia_id(frequencia, tipo_fim, total_sessoes)')
      .eq('empresa_id', empresaId)
      .gte('data_hora', janelaInicio.toISOString())
      .lte('data_hora', janelaFim.toISOString())
      .order('data_hora'),

    supabase.from('agendamentos')
      .select('id, data_hora, duracao_minutos, status, observacoes, pacientes(id, nome), profissionais(id, nome, cor_agenda), servicos(id, nome, tipo), salas(nome)')
      .eq('empresa_id', empresaId)
      .order('data_hora', { ascending: false })
      .limit(500)
      .returns<any[]>(),

    supabase.from('profissionais').select('id, nome, cor_agenda, especialidade').eq('empresa_id', empresaId).eq('ativo', true).order('nome'),
    supabase.from('salas').select('id, nome, status').eq('empresa_id', empresaId),
    supabase.from('servicos').select('id, nome, tipo, duracao_minutos, valor, cor, icone, categoria_id').eq('empresa_id', empresaId).eq('ativo', true).order('nome'),

    // Ausências: apenas folga/ferias/outro (feriados agora têm tabela própria)
    supabase.from('folgas_ferias')
      .select('id, profissional_id, data_inicio, data_fim, hora_inicio, hora_fim, motivo, tipo')
      .eq('empresa_id', empresaId)
      .in('tipo', ['folga', 'ferias', 'outro'])
      .gte('data_fim', hojeStr)
      .order('data_inicio'),

    // Feriados: usa admin client para garantir leitura sem bloqueio de RLS
    admin.from('feriados')
      .select('id, nome, data, recorrente')
      .eq('empresa_id', empresaId)
      .order('data'),

    // Para o picker do wizard de novo agendamento
    supabase.from('pacientes')
      .select('id, nome, telefone, ddi, cpf, status')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo')
      .order('nome'),

    supabase.from('servico_profissional')
      .select('servico_id, profissional_id, valor_override, duracao_override'),

    supabase.from('disponibilidade_profissional')
      .select('profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_minutos, ativo')
      .eq('empresa_id', empresaId)
      .eq('ativo', true),

    // Lista de espera com joins
    admin.from('lista_espera_clinica')
      .select(`
        id, paciente_id, servico_id, profissional_id,
        data_inicio, data_fim, hora_inicio, hora_fim,
        status, observacoes, notificado_em, notificar_automaticamente, created_at,
        pacientes(nome, telefone, ddi),
        servicos(nome),
        profissionais(nome)
      `)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false }),
  ])

  // Normaliza as entradas da lista de espera para o formato flat esperado pelo client
  const listaEspera = (listaEsperaRaw ?? []).map((row: any) => ({
    id:                       row.id,
    paciente_id:              row.paciente_id,
    paciente_nome:            row.pacientes?.nome ?? 'Paciente',
    paciente_telefone:        row.pacientes?.telefone ?? null,
    paciente_ddi:             row.pacientes?.ddi ?? null,
    servico_id:               row.servico_id ?? null,
    servico_nome:             row.servicos?.nome ?? null,
    profissional_id:          row.profissional_id ?? null,
    profissional_nome:        row.profissionais?.nome ?? null,
    data_inicio:              row.data_inicio,
    data_fim:                 row.data_fim,
    hora_inicio:              row.hora_inicio ?? null,
    hora_fim:                 row.hora_fim ?? null,
    status:                   row.status,
    observacoes:              row.observacoes ?? null,
    notificado_em:            row.notificado_em ?? null,
    notificar_automaticamente: row.notificar_automaticamente,
    created_at:               row.created_at,
  }))

  return (
    <AgendaPageClient
      agendamentosSemana={agendamentosJanela ?? []}
      historico={(historico ?? []) as any}
      profissionais={profissionais ?? []}
      salas={salas ?? []}
      servicos={servicos ?? []}
      ausencias={ausencias ?? []}
      feriados={feriados ?? []}
      pacientes={pacientes ?? []}
      vinculos={vinculos ?? []}
      turnos={turnos ?? []}
      inicioSemana={inicioSemana.toISOString()}
      listaEspera={listaEspera}
    />
  )
}
