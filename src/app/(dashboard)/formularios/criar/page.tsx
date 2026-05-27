import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConstrutorClient } from './construtor-client'

export const metadata = { title: 'Novo Formulário — CinesioPro' }

export default async function CriarFormularioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <ConstrutorClient />
}
