import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*, empresas(nome)')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-surface)' }}>
      <Sidebar
        userName={usuario?.nome || user.email || 'Usuário'}
        userEmail={user.email || ''}
        empresaNome={usuario?.empresas?.nome || 'CinesioPro'}
      />
      <div className="ml-[280px]">
        <Header />
        <main className="pt-20 min-h-screen">
          <div className="p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
