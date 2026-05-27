import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FormulariosClient } from './formularios-client'

export const metadata = { title: 'Formulários — CinesioPro' }

export default async function FormulariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user.id)
    .single()

  // Busca formulários da empresa (criados/duplicados pela clínica)
  const { data: formularios } = await supabase
    .from('formularios')
    .select('id, nome, descricao, categoria, status, campos_json, created_at, updated_at')
    .eq('empresa_id', usuario?.empresa_id ?? '')
    .neq('status', 'arquivado')
    .order('updated_at', { ascending: false })

  // Busca envios recentes
  const { data: envios } = await supabase
    .from('formularios_envios')
    .select(`
      id, status, enviado_via, expira_em, respondido_em, created_at,
      formularios(id, nome, categoria),
      pacientes(id, nome)
    `)
    .eq('empresa_id', usuario?.empresa_id ?? '')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <FormulariosClient
      formularios={(formularios ?? []) as any}
      envios={(envios ?? []) as any}
    />
  )
}
