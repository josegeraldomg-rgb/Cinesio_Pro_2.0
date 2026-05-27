import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ConstrutorClient } from '../../criar/construtor-client'
import type { CampoFormulario } from '@/lib/formularios/tipos'

export const metadata = { title: 'Editar Formulário — CinesioPro' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarFormularioPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Busca empresa_id do usuário
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user.id)
    .single()

  if (!usuario) redirect('/login')

  // Busca o formulário garantindo que pertence à empresa
  const { data: formulario, error } = await supabase
    .from('formularios')
    .select('id, nome, descricao, categoria, campos_json, status')
    .eq('id', id)
    .eq('empresa_id', usuario.empresa_id)
    .neq('status', 'arquivado')
    .single()

  if (error || !formulario) notFound()

  return (
    <ConstrutorClient
      formularioInicial={{
        id:          formulario.id,
        nome:        formulario.nome,
        descricao:   formulario.descricao ?? '',
        categoria:   formulario.categoria,
        campos_json: (formulario.campos_json as CampoFormulario[]) ?? [],
        status:      formulario.status,
      }}
    />
  )
}
