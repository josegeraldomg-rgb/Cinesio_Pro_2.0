import { notFound } from 'next/navigation'
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

  // Busca todas as sessões da turma para o seletor (sem limit)
  const sessoesResult = await buscarSessoesDisponiveisAction(turmaId)
  if ('error' in sessoesResult) notFound()
  const { sessoes } = sessoesResult

  if (sessoes.length === 0) {
    return (
      <div className="p-8 text-center text-[#7F8C8D]">
        <p>Esta turma ainda não tem sessões geradas.</p>
        <p className="text-sm mt-1">Acesse a tela de Turmas e gere as sessões primeiro.</p>
      </div>
    )
  }

  // Se sessaoIdParam foi fornecido e existe na lista, usa ele.
  // Caso contrário, escolhe a sessão mais próxima do momento atual.
  let sessaoId: string
  if (sessaoIdParam && sessoes.find(s => s.id === sessaoIdParam)) {
    sessaoId = sessaoIdParam
  } else {
    const agora = new Date().toISOString()
    // Prefere a última sessão passada (mais recente antes de agora)
    const passadas = sessoes.filter(s => s.data_hora <= agora)
    sessaoId = passadas.length > 0
      ? passadas[passadas.length - 1].id   // última passada (lista está em ASC)
      : sessoes[0].id                       // se nenhuma passada, pega a primeira futura
  }

  // Carrega dados da sessão (presencas, alunos, trava)
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
      sessaoIdInicial={sessaoId}
    />
  )
}
