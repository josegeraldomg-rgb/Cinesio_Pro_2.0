import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UsuariosClient } from './usuarios-client'

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('usuarios')
    .select('empresa_id, perfil, id')
    .eq('id', user.id)
    .single()

  const empresaId = me?.empresa_id ?? ''

  const [
    { data: usuarios },
    { data: servicos },
  ] = await Promise.all([
    supabase
      .from('usuarios')
      .select('id, nome, email, perfil, ativo, created_at')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false }),
    supabase
      .from('servicos')
      .select('id, nome, duracao_minutos, valor, cor, icone, categoria_id, ativo')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome'),
  ])

  return (
    <UsuariosClient
      usuarios={usuarios ?? []}
      servicos={servicos ?? []}
      perfilAtual={me?.perfil ?? ''}
    />
  )
}
