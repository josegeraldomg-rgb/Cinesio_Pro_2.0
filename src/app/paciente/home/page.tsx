import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import HomeClient from './home-client'

/**
 * Página inicial do Portal do Paciente.
 * Busca todos os dados necessários no servidor e passa para o componente cliente.
 */
export default async function PortalHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/paciente/login')

  const admin = createAdminClient()

  // 1. Dados do paciente + empresa (clínica)
  const { data: paciente } = await admin
    .from('pacientes')
    .select(`
      id, nome, foto_url, email, telefone, data_nascimento,
      empresas ( nome, logo_url )
    `)
    .eq('usuario_id', user.id)
    .maybeSingle()

  if (!paciente) {
    // Conta autenticada mas sem registro de paciente — estado de inconsistência
    redirect('/paciente/login?erro=sem-cadastro')
  }

  // 2. Próxima consulta agendada
  const { data: proximaConsulta } = await admin
    .from('agendamentos')
    .select(`
      id, data_hora, status, tipo,
      profissionais ( nome, avatar_url ),
      servicos ( nome )
    `)
    .eq('paciente_id', paciente.id)
    .gt('data_hora', new Date().toISOString())
    .in('status', ['agendado', 'confirmado'])
    .order('data_hora', { ascending: true })
    .limit(1)
    .maybeSingle()

  // 3. Pacote de sessões ativo
  const { data: pacoteAtivo } = await admin
    .from('pacotes_paciente')
    .select('sessoes_total, sessoes_utilizadas, data_expiracao, status')
    .eq('paciente_id', paciente.id)
    .eq('status', 'ativo')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 4. Plano de tratamento ativo
  const { data: planoAtivo } = await admin
    .from('planos_tratamento')
    .select('sessoes_previstas, sessoes_realizadas, status, data_inicio, data_previsao_alta, diagnostico_clinico')
    .eq('paciente_id', paciente.id)
    .eq('status', 'ativo')
    .maybeSingle()

  // 5. Escalas para gráfico de progresso (última 8 medições)
  const { data: escalas } = await admin
    .from('escalas_aplicadas')
    .select('tipo_escala, score, created_at, tipo_aplicacao')
    .eq('paciente_id', paciente.id)
    .not('score', 'is', null)
    .order('created_at', { ascending: true })
    .limit(10)

  // 6. Última evolução clínica (resumo da sessão)
  const { data: ultimaEvolucao } = await admin
    .from('evolucoes_clinicas')
    .select(`
      conteudo, data_atendimento,
      profissionais ( nome )
    `)
    .eq('paciente_id', paciente.id)
    .order('data_atendimento', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Serializa para passar ao cliente
  const empresa = paciente.empresas as unknown as { nome: string; logo_url: string | null } | null
  const profissional = proximaConsulta?.profissionais as unknown as { nome: string; avatar_url: string | null } | null
  const servico = proximaConsulta?.servicos as unknown as { nome: string } | null
  const profEvol = ultimaEvolucao?.profissionais as unknown as { nome: string } | null

  return (
    <HomeClient
      paciente={{
        id: paciente.id,
        nome: paciente.nome,
        foto_url: paciente.foto_url,
      }}
      clinicaNome={empresa?.nome ?? 'CinesioPro'}
      proximaConsulta={proximaConsulta ? {
        id: proximaConsulta.id,
        data_hora: proximaConsulta.data_hora,
        status: proximaConsulta.status,
        tipo: proximaConsulta.tipo,
        profissional_nome: profissional?.nome ?? null,
        profissional_avatar: profissional?.avatar_url ?? null,
        servico_nome: servico?.nome ?? null,
      } : null}
      pacoteAtivo={pacoteAtivo ? {
        sessoes_total: pacoteAtivo.sessoes_total,
        sessoes_utilizadas: pacoteAtivo.sessoes_utilizadas,
        data_expiracao: pacoteAtivo.data_expiracao,
      } : null}
      planoAtivo={planoAtivo ? {
        sessoes_previstas: planoAtivo.sessoes_previstas,
        sessoes_realizadas: planoAtivo.sessoes_realizadas,
        diagnostico: planoAtivo.diagnostico_clinico,
        data_previsao_alta: planoAtivo.data_previsao_alta,
      } : null}
      escalas={(escalas ?? []).map((e) => ({
        tipo: e.tipo_escala,
        score: Number(e.score),
        data: e.created_at,
        aplicacao: e.tipo_aplicacao,
      }))}
      ultimaEvolucao={ultimaEvolucao ? {
        conteudo: ultimaEvolucao.conteudo,
        data: ultimaEvolucao.data_atendimento,
        profissional_nome: profEvol?.nome ?? null,
      } : null}
    />
  )
}
