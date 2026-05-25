import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EquipeClient } from './equipe-client'

export default async function EquipePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('usuarios')
    .select('empresa_id, perfil, id')
    .eq('id', user.id)
    .single()

  const empresaId = me?.empresa_id ?? ''
  const perfil    = me?.perfil ?? ''

  // Profissionais: query mais completa (superset de ServicosClient + HorariosClient)
  let profissionalQuery = supabase
    .from('profissionais')
    .select('id, nome, especialidade, cor_agenda, avatar_url, usuario_id, ativo')
    .eq('empresa_id', empresaId)
    .order('nome')

  if (perfil === 'profissional') {
    profissionalQuery = profissionalQuery.eq('usuario_id', me!.id)
  } else {
    profissionalQuery = profissionalQuery.eq('ativo', true)
  }

  const [
    { data: usuarios },
    { data: servicos },
    { data: categorias },
    { data: profissionais },
    { data: vinculos },
    { data: turnos },
  ] = await Promise.all([
    supabase
      .from('usuarios')
      .select('id, nome, email, perfil, ativo, created_at')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false }),
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
    profissionalQuery,
    supabase
      .from('servico_profissional')
      .select('servico_id, profissional_id, valor_override, duracao_override'),
    supabase
      .from('disponibilidade_profissional')
      .select('id, profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_minutos, ativo')
      .eq('empresa_id', empresaId),
  ])

  return (
    <EquipeClient
      usuarios={usuarios ?? []}
      servicos={servicos ?? []}
      categorias={categorias ?? []}
      profissionais={profissionais ?? []}
      vinculos={vinculos ?? []}
      turnos={turnos ?? []}
      perfilAtual={perfil}
      podeEditar={['admin', 'dev'].includes(perfil)}
      podeEditarHorarios={['admin', 'dev', 'profissional'].includes(perfil)}
    />
  )
}
