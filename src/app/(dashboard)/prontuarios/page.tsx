import type { Metadata } from 'next'
import { listarPacientesAction } from './actions'
import { ProntuariosClient } from './prontuarios-client'

export const metadata: Metadata = {
  title: 'Prontuários Clínicos | CinesioPro',
}

export default async function ProntuariosPage() {
  const res = await listarPacientesAction()
  const pacientes = 'data' in res ? res.data : []

  return <ProntuariosClient pacientes={pacientes} />
}
