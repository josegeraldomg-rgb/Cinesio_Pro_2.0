import type { Metadata } from 'next'
import { buscarProntuarioAction, listarTimelineAction } from '../actions'
import { ProntuarioClient } from './prontuario-client'
import Link from 'next/link'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: 'Prontuário | CinesioPro' }
}

export default async function ProntuarioPage({ params }: Props) {
  const [pronRes, timelineRes] = await Promise.all([
    buscarProntuarioAction(params.id),
    listarTimelineAction(params.id, 'todos'),
  ])

  if ('error' in pronRes) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#EDEFF3' }}>
        <div className="text-center">
          <p className="text-red-500 font-medium mb-4">{pronRes.error}</p>
          <Link href="/prontuarios" className="text-sm text-blue-600 underline">Voltar para prontuários</Link>
        </div>
      </div>
    )
  }

  return (
    <ProntuarioClient
      detalhe={pronRes.data}
      timelineInicial={'data' in timelineRes ? timelineRes.data : []}
    />
  )
}
