import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HorariosClient } from './horarios-client'

export default async function HorariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('usuarios')
    .select('empresa_id, perfil, id')
    .eq('id', user.id)
    .single()

  const empresaId = me?.empresa_id ?? ''

  // Se for profissional, mostra só os próprios horários
  let profissionalQuery = supabase
    .from('profissionais')
    .select('id, nome, especialidade, cor_agenda, avatar_url, usuario_id, ativo')
    .eq('empresa_id', empresaId)
    .order('nome')

  if (me?.perfil === 'profissional') {
    profissionalQuery = profissionalQuery.eq('usuario_id', me.id)
  } else {
    profissionalQuery = profissionalQuery.eq('ativo', true)
  }

  const [
    { data: profissionais },
    { data: turnos },
    { data: ausencias },
  ] = await Promise.all([
    profissionalQuery,
    supabase
      .from('disponibilidade_profissional')
      .select('id, profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_minutos, ativo')
      .eq('empresa_id', empresaId),
    supabase
      .from('folgas_ferias')
      .select('id, profissional_id, data_inicio, data_fim, motivo, tipo')
      .eq('empresa_id', empresaId)
      .gte('data_fim', new Date().toISOString().split('T')[0])
      .order('data_inicio'),
  ])

  return (
    <HorariosClient
      profissionais={profissionais ?? []}
      turnos={turnos ?? []}
      ausencias={ausencias ?? []}
      podeEditar={['admin', 'dev', 'profissional'].includes(me?.perfil ?? '')}
    />
  )
}
