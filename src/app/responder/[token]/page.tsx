import { createAdminClient } from '@/lib/supabase/admin'
import { ResponderForm } from './responder-form'
import type { CampoFormulario } from '@/lib/formularios/tipos'

interface Props {
  params: Promise<{ token: string }>
}

// ─── Telas de estado ──────────────────────────────────────────────────────────
function TelaErro({ emoji, titulo, msg }: { emoji: string; titulo: string; msg: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#edeff3] to-white p-6">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl">
          {emoji}
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">{titulo}</h1>
        <p className="text-sm text-gray-500 leading-relaxed">{msg}</p>
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default async function ResponderPage({ params }: Props) {
  const { token } = await params
  const admin = createAdminClient()

  // Busca o envio pelo token único
  const { data: envio } = await admin
    .from('formularios_envios')
    .select(`
      id, status, expira_em, empresa_id, paciente_id, formulario_id,
      formularios ( nome, descricao, categoria, campos_json ),
      pacientes   ( nome )
    `)
    .eq('token_unico', token)
    .maybeSingle()

  // Token não existe
  if (!envio) {
    return (
      <TelaErro
        emoji="⚠️"
        titulo="Link inválido"
        msg="Este link de formulário não existe ou foi removido. Peça à clínica que envie um novo link."
      />
    )
  }

  // Já respondido
  if (envio.status === 'respondido') {
    return (
      <TelaErro
        emoji="✅"
        titulo="Formulário já respondido"
        msg="Você já preencheu este formulário. Não é possível responder novamente."
      />
    )
  }

  // Expirado
  if (envio.expira_em && new Date(envio.expira_em) < new Date()) {
    return (
      <TelaErro
        emoji="⏰"
        titulo="Link expirado"
        msg="Este link de formulário venceu. Entre em contato com a clínica para receber um novo link."
      />
    )
  }

  // Busca nome da empresa para exibir no rodapé
  const { data: empresa } = await admin
    .from('empresas')
    .select('nome')
    .eq('id', envio.empresa_id)
    .single()

  const formulario = envio.formularios as unknown as {
    nome: string
    descricao: string | null
    categoria: string
    campos_json: CampoFormulario[]
  }

  const paciente = envio.pacientes as unknown as { nome: string }

  return (
    <ResponderForm
      token={token}
      nomeFormulario={formulario.nome}
      descricaoFormulario={formulario.descricao ?? null}
      categoriaFormulario={formulario.categoria}
      campos={(formulario.campos_json as CampoFormulario[]) ?? []}
      nomePaciente={paciente.nome}
      nomeClinica={empresa?.nome ?? 'CinesioPro'}
    />
  )
}
