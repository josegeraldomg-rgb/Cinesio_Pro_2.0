import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { WhatsappClient } from './whatsapp-client'

export default async function WhatsAppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: me } = await admin
    .from('usuarios')
    .select('perfil')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <Suspense>
      <WhatsappClient isDev={me?.perfil === 'dev'} />
    </Suspense>
  )
}
