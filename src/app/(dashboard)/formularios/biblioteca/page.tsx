import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BibliotecaClient } from './biblioteca-client'

export const metadata = { title: 'Biblioteca de Formulários — CinesioPro' }

export default async function BibliotecaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <BibliotecaClient />
}
