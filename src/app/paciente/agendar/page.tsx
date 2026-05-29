import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buscarDadosAgendarAction } from './actions'
import AgendarClient from './agendar-client'

export default async function PortalAgendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/paciente/login')

  const dados = await buscarDadosAgendarAction()

  if (dados.error) redirect('/paciente/home')

  return (
    <AgendarClient
      profissionais={dados.profissionais}
      turmas={dados.turmas}
      consultas={dados.consultas}
      antecedencia_horas={dados.antecedencia_horas}
      clinica_whatsapp={dados.clinica_whatsapp}
    />
  )
}
