import { createAdminClient } from '@/lib/supabase/admin'
import { getEmpresaId } from '@/lib/get-empresa-id'
import { unstable_cache } from 'next/cache'
import { AgendaPageClient } from './agenda-page-client'
import { createClient } from '@/lib/supabase/server'

// ─── Dados estáticos — cacheados 2 minutos por empresa ──────────────────────
// Profissionais, salas, serviços, turnos, vínculos e feriados mudam raramente.
// Usar admin client dentro de unstable_cache é seguro (não usa cookies/headers).
function getCatalogData(empresaId: string) {
  return unstable_cache(
    async () => {
      const admin = createAdminClient()
      const hojeStr = new Date().toISOString().split('T')[0]
      const [
        { data: profissionais },
        { data: salas },
        { data: servicos },
        { data: vinculos },
        { data: turnos },
        { data: ausencias },
        { data: feriados },
        { data: pacientes },
      ] = await Promise.all([
        admin.from('profissionais')
          .select('id, nome, cor_agenda, especialidade')
          .eq('empresa_id', empresaId).eq('ativo', true).order('nome'),
        admin.from('salas')
          .select('id, nome, status')
          .eq('empresa_id', empresaId),
        admin.from('servicos')
          .select('id, nome, tipo, duracao_minutos, valor, cor, icone, categoria_id')
          .eq('empresa_id', empresaId).eq('ativo', true).order('nome'),
        admin.from('servico_profissional')
          .select('servico_id, profissional_id, valor_override, duracao_override')
          .eq('empresa_id', empresaId),
        admin.from('disponibilidade_profissional')
          .select('profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_minutos, ativo')
          .eq('empresa_id', empresaId).eq('ativo', true),
        admin.from('folgas_ferias')
          .select('id, profissional_id, data_inicio, data_fim, hora_inicio, hora_fim, motivo, tipo')
          .eq('empresa_id', empresaId)
          .in('tipo', ['folga', 'ferias', 'outro'])
          .gte('data_fim', hojeStr).order('data_inicio'),
        admin.from('feriados')
          .select('id, nome, data, recorrente')
          .eq('empresa_id', empresaId).order('data'),
        admin.from('pacientes')
          .select('id, nome, telefone, ddi, cpf, status')
          .eq('empresa_id', empresaId).eq('status', 'ativo').order('nome'),
      ])
      return { profissionais, salas, servicos, vinculos, turnos, ausencias, feriados, pacientes }
    },
    [`agenda-catalog-${empresaId}`],
    { revalidate: 120 }   // 2 minutos
  )()
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default async function AgendaPage() {
  const { empresaId } = await getEmpresaId()
  const admin = createAdminClient()

  const hoje = new Date()
  const inicioSemana = new Date(hoje)
  inicioSemana.setDate(hoje.getDate() - hoje.getDay() + 1)
  const hojeStr = hoje.toISOString().split('T')[0]

  const janelaInicio = new Date(hoje); janelaInicio.setDate(hoje.getDate() - 7)
  const janelaFim    = new Date(hoje); janelaFim.setDate(hoje.getDate() + 112)
  const seisMesesAtras = new Date(hoje); seisMesesAtras.setMonth(hoje.getMonth() - 6)

  // Dados dinâmicos (agendamentos + lista de espera) — sempre frescos
  const [
    { data: agendamentosJanela },
    { data: historico },
    { data: formasPagamento },
    { data: comissoesRaw },
    { data: listaEsperaRaw },
    catalog,
  ] = await Promise.all([
    admin.from('agendamentos')
      .select('*, pacientes(nome, foto_url), profissionais(id, nome, cor_agenda), servicos(nome, tipo, valor), salas(nome), criado_por:criado_por_id(id, nome, perfil), recorrencias:recorrencia_id(frequencia, tipo_fim, total_sessoes)')
      .eq('empresa_id', empresaId)
      .gte('data_hora', janelaInicio.toISOString())
      .lte('data_hora', janelaFim.toISOString())
      .order('data_hora'),

    admin.from('agendamentos')
      .select('id, data_hora, duracao_minutos, status, observacoes, pacientes(id, nome), profissionais(id, nome, cor_agenda), servicos(id, nome, tipo), salas(nome)')
      .eq('empresa_id', empresaId)
      .gte('data_hora', seisMesesAtras.toISOString())
      .order('data_hora', { ascending: false })
      .limit(500)
      .returns<any[]>(),

    // Formas de pagamento e comissoes para o checkout financeiro
    admin.from('config_formas_pagamento')
      .select('id, nome, tipo, taxa_percentual, taxa_fixa, prazo_liquidez_dias, ativo')
      .eq('empresa_id', empresaId).eq('ativo', true).order('nome'),
    admin.from('comissoes_config')
      .select('id, profissional_id, servico_id, percentual, ativo')
      .eq('empresa_id', empresaId).eq('ativo', true),

    admin.from('lista_espera_clinica')
      .select(`id, paciente_id, servico_id, profissional_id,
        data_inicio, data_fim, hora_inicio, hora_fim,
        status, observacoes, notificado_em, notificar_automaticamente, created_at,
        pacientes(nome, telefone, ddi), servicos(nome), profissionais(nome)`)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false }),

    getCatalogData(empresaId),
  ])

  const listaEspera = (listaEsperaRaw ?? []).map((row: any) => ({
    id: row.id,
    paciente_id: row.paciente_id,
    paciente_nome: row.pacientes?.nome ?? 'Paciente',
    paciente_telefone: row.pacientes?.telefone ?? null,
    paciente_ddi: row.pacientes?.ddi ?? null,
    servico_id: row.servico_id ?? null,
    servico_nome: row.servicos?.nome ?? null,
    profissional_id: row.profissional_id ?? null,
    profissional_nome: row.profissionais?.nome ?? null,
    data_inicio: row.data_inicio,
    data_fim: row.data_fim,
    hora_inicio: row.hora_inicio ?? null,
    hora_fim: row.hora_fim ?? null,
    status: row.status,
    observacoes: row.observacoes ?? null,
    notificado_em: row.notificado_em ?? null,
    notificar_automaticamente: row.notificar_automaticamente,
    created_at: row.created_at,
  }))

  return (
    <AgendaPageClient
      agendamentosSemana={agendamentosJanela ?? []}
      historico={(historico ?? []) as any}
      profissionais={catalog.profissionais ?? []}
      salas={catalog.salas ?? []}
      servicos={catalog.servicos ?? []}
      ausencias={catalog.ausencias ?? []}
      feriados={catalog.feriados ?? []}
      pacientes={catalog.pacientes ?? []}
      vinculos={catalog.vinculos ?? []}
      turnos={catalog.turnos ?? []}
      inicioSemana={inicioSemana.toISOString()}
      listaEspera={listaEspera}
      formasPagamento={formasPagamento ?? []}
      comissoes={comissoesRaw ?? []}
    />
  )
}
