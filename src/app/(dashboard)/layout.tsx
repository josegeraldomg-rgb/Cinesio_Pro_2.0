import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

// Busca nome do usuário + nome da empresa uma única vez, depois serve da memória
// por até 5 minutos. O admin client não usa cookies, então é seguro dentro de
// unstable_cache (que não pode acessar cookies/headers).
const getLayoutData = unstable_cache(
  async (userId: string) => {
    const admin = createAdminClient()
    const { data } = await admin
      .from('usuarios')
      .select('nome, empresa_id, empresas(nome)')
      .eq('id', userId)
      .maybeSingle()
    return {
      nome:        data?.nome ?? '',
      empresaNome: (data?.empresas as any)?.nome ?? 'CinesioPro',
      email:       '',   // email vem da sessão, não do banco
    }
  },
  ['dashboard-layout'],
  { revalidate: 300 }   // 5 minutos — nome e empresa raramente mudam
)

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // getSession lê o cookie localmente — sem round-trip HTTP ao servidor de Auth.
  // É suficiente aqui porque o layout só precisa do userId para buscar o nome.
  // Páginas individuais usam getUser() (com verificação no servidor) para auth real.
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) redirect('/login')

  // Dados cacheados — na segunda navegação em diante isso é <1ms
  const { nome, empresaNome } = await getLayoutData(session.user.id)

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-surface)' }}>
      <Sidebar
        userName={nome || session.user.email || 'Usuário'}
        userEmail={session.user.email || ''}
        empresaNome={empresaNome}
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
