import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PortalNav from './portal-nav'

/**
 * Layout raiz do Portal do Paciente.
 * Garante que só usuários com perfil 'paciente' acessem /paciente/*.
 * Renderiza bottom navigation e header mobile.
 */
export default async function PortalPacienteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/paciente/login')

  const admin = createAdminClient()
  const { data: usuario } = await admin
    .from('usuarios')
    .select('perfil, nome')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuario || usuario.perfil !== 'paciente') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Área de conteúdo — padding bottom para não sobrepor bottom nav */}
      <main className="flex-1 pb-20 overflow-y-auto">
        <div className="max-w-lg mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <PortalNav />
    </div>
  )
}
