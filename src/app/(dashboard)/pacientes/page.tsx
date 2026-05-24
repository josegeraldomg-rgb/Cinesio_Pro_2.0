import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PacientesClient } from './pacientes-client'

export default async function PacientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user.id)
    .single()

  const { data: pacientes } = await supabase
    .from('pacientes')
    .select(`
      id, nome, cpf, email, data_nascimento, sexo_biologico,
      ddi, telefone, responsavel_id, contato_emergencia, observacoes,
      endereco, status, foto_url, token_completar, token_expires_at,
      agendamentos(data_hora, status, servicos(tipo))
    `)
    .eq('empresa_id', usuario?.empresa_id ?? '')
    .order('nome')

  return <PacientesClient pacientes={(pacientes ?? []) as any} />
}
