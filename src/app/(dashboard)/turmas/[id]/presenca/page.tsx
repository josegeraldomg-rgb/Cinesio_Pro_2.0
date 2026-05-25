import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEmpresaId } from '@/lib/get-empresa-id'
import { PresencaClient } from './presenca-client'
import { buscarSessaoPresencaAction, buscarSessoesDisponiveisAction, listarSequenciasAction } from './actions'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ sessao?: string }>
}

export default async function PresencaPage({ params, searchParams }: Props) {
  const { id: turmaId } = await params
  const { sessao: sessaoIdParam } = await searchParams
  const { empresaId } = await getEmpresaId()
  const admin = createAdminClient()

  // Verifica que a turma existe e pertence à empresa
  const { data: turma } = await admin
    .from('turmas')
    .select('id, nome')
    .eq('id', turmaId)
    .eq('empresa_id', empresaId)
    .maybeSingle()

  if (!turma) notFound()

  // Busca lista de sessões disponíveis para o seletor
  const sessoesResult = await buscarSessoesDisponiveisAction(turmaId)
  if ('error' in sessoesResult) notFound()
  const { sessoes } = sessoesResult

  // Sessão padrão: a do search param, ou a mais recente não-futura
  let sessaoId = sessaoIdParam
  if (!sessaoId || !sessoes.find(s => s.id === sessaoId)) {
    const agora = new Date().toISOString()
    const passadas = sessoes.filter(s => s.data_hora <= agora)
    sessaoId = passadas[0]?.id ?? sessoes[0]?.id
  }

  if (!sessaoId) {
    // Turma sem sessões geradas ainda
    return (
      <div className="p-8 text-center text-[#7F8C8D]">
        <p>Esta turma ainda não tem sessões geradas.</p>
        <p className="text-sm mt-1">Acesse a tela de Turmas e gere as sessões primeiro.</p>
      </div>
    )
  }

  // Redireciona para incluir sessaoId na URL se não estava presente
  if (!sessaoIdParam || sessaoIdParam !== sessaoId) {
    redirect(`/turmas/${turmaId}/presenca?sessao=${sessaoId}`)
  }

  // Carrega dados da sessão selecionada
  const presencaResult = await buscarSessaoPresencaAction(sessaoId)
  if ('error' in presencaResult) notFound()

  // Carrega sequências disponíveis
  const seqResult = await listarSequenciasAction()
  const sequencias = 'sequencias' in seqResult ? seqResult.sequencias : []

  return (
    <PresencaClient
      turmaId={turmaId}
      turmaNome={turma.nome}
      sessoes={sessoes}
      sessaoAtual={presencaResult.sessao}
      alunosIniciais={presencaResult.alunos}
      presencasExistentes={presencaResult.presencasExistentes}
      travada={presencaResult.travada}
      config={presencaResult.config}
      sequencias={sequencias}
    />
  )
}
