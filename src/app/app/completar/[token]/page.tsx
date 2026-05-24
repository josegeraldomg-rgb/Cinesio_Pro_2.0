import { createAdminClient } from '@/lib/supabase/admin'
import { CompletarForm } from './completar-form'

interface Props {
  params: Promise<{ token: string }>
}

export default async function CompletarPage({ params }: Props) {
  const { token } = await params
  const admin = createAdminClient()

  // Valida o token e busca dados básicos do paciente
  const { data: paciente } = await admin
    .from('pacientes')
    .select('id, nome, ddi, telefone, token_expires_at, empresa_id')
    .eq('token_completar', token)
    .maybeSingle()

  // Token inválido (não existe ou já foi consumido)
  if (!paciente) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#edeff3] to-white p-6">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#E74C3C]/10 text-[#E74C3C] flex items-center justify-center text-3xl">
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-[#2C3E50] mb-2">Link inválido</h1>
          <p className="text-sm text-[#7F8C8D]">
            Esse link de auto-cadastro não existe ou já foi utilizado. Solicite um novo à clínica.
          </p>
        </div>
      </div>
    )
  }

  // Token expirado
  if (paciente.token_expires_at && new Date(paciente.token_expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#edeff3] to-white p-6">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#F39C12]/10 text-[#F39C12] flex items-center justify-center text-3xl">
            ⏰
          </div>
          <h1 className="text-xl font-bold text-[#2C3E50] mb-2">Link expirado</h1>
          <p className="text-sm text-[#7F8C8D]">
            Esse link de auto-cadastro venceu. Entre em contato com a clínica para receber um novo.
          </p>
        </div>
      </div>
    )
  }

  // Busca nome da clínica para exibir
  const { data: empresa } = await admin
    .from('empresas')
    .select('nome')
    .eq('id', paciente.empresa_id)
    .single()

  return (
    <CompletarForm
      token={token}
      nomePaciente={paciente.nome}
      nomeClinica={empresa?.nome ?? 'CinesioPro'}
    />
  )
}
