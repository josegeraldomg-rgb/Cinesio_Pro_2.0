import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ServicosClient } from './servicos-client'

export default async function ServicosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('usuarios')
    .select('empresa_id, perfil')
    .eq('id', user.id)
    .single()

  const empresaId = me?.empresa_id ?? ''

  const [
    { data: servicos },
    { data: categorias },
    { data: profissionais },
    { data: vinculos },
  ] = await Promise.all([
    supabase
      .from('servicos')
      .select('id, nome, descricao, categoria_id, tipo, duracao_minutos, valor, cor, icone, ativo, permite_agendamento_online')
      .eq('empresa_id', empresaId)
      .order('nome'),
    supabase
      .from('categorias_servicos')
      .select('id, nome, descricao, cor, icone, ordem, ativo')
      .eq('empresa_id', empresaId)
      .order('ordem'),
    supabase
      .from('profissionais')
      .select('id, nome, especialidade, cor_agenda, avatar_url')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome'),
    supabase
      .from('servico_profissional')
      .select('servico_id, profissional_id, valor_override, duracao_override'),
  ])

  return (
    <ServicosClient
      servicos={servicos ?? []}
      categorias={categorias ?? []}
      profissionais={profissionais ?? []}
      vinculos={vinculos ?? []}
      podeEditar={['admin', 'dev'].includes(me?.perfil ?? '')}
    />
  )
}
