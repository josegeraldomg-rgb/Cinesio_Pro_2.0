import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buscarDadosDocumentosAction } from './actions'
import DocumentosClient from './documentos-client'

export default async function PortalDocumentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/paciente/login')

  const dados = await buscarDadosDocumentosAction()

  return (
    <DocumentosClient
      formulariosPendentes={dados.formulariosPendentes}
      formulariosRespondidos={dados.formulariosRespondidos}
      exames={dados.exames}
      sessoes={dados.sessoes}
      paciente={dados.paciente}
      clinicaNome={dados.clinicaNome}
      clinicaEndereco={dados.clinicaEndereco}
      clinicaCnpj={dados.clinicaCnpj}
    />
  )
}
