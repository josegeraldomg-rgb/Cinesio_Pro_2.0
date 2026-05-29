import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PerfilClient from './perfil-client'

export default async function PortalPerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/paciente/login')

  const admin = createAdminClient()

  const { data: paciente } = await admin
    .from('pacientes')
    .select(`
      id, nome, email, telefone, ddi,
      data_nascimento, cpf, foto_url,
      endereco, observacoes,
      empresas ( nome )
    `)
    .eq('usuario_id', user.id)
    .maybeSingle()

  if (!paciente) redirect('/paciente/login?erro=sem-cadastro')

  const empresa = paciente.empresas as unknown as { nome: string } | null
  const endereco = (paciente.endereco ?? {}) as Record<string, string>

  return (
    <PerfilClient
      pacienteId={paciente.id}
      dados={{
        nome: paciente.nome,
        email: paciente.email ?? '',
        telefone: paciente.telefone ?? '',
        ddi: paciente.ddi ?? '55',
        data_nascimento: paciente.data_nascimento ?? '',
        cpf: paciente.cpf ?? '',
        foto_url: paciente.foto_url ?? null,
        cep: endereco.cep ?? '',
        rua: endereco.rua ?? '',
        numero: endereco.numero ?? '',
        bairro: endereco.bairro ?? '',
        cidade: endereco.cidade ?? '',
        estado: endereco.estado ?? '',
      }}
      clinicaNome={empresa?.nome ?? 'CinesioPro'}
    />
  )
}
