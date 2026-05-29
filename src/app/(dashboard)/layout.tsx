export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import { SidebarProvider } from '@/components/layout/sidebar-provider'

// Busca nome do usuário + nome da empresa uma única vez, depois serve da memória
// por até 60 segundos. O admin client não usa cookies, então é seguro dentro de
// unstable_cache (que não pode acessar cookies/headers).
const getLayoutData = unstable_cache(
  async (userId: string) => {
    const admin = createAdminClient()
    const [{ data }, { data: prof }] = await Promise.all([
      admin
        .from('usuarios')
        .select('nome, empresa_id, avatar_url, empresas(nome)')
        .eq('id', userId)
        .maybeSingle(),
      admin
        .from('profissionais')
        .select('avatar_url')
        .eq('usuario_id', userId)
        .maybeSingle(),
    ])
    return {
      nome:        data?.nome ?? '',
      empresaNome: (data?.empresas as any)?.nome ?? 'CinesioPro',
      email:       '',   // email vem da sessão, não do banco
      // Prefere avatar do profissional; cai para o do usuário
      fotoUrl:     (prof?.avatar_url ?? (data as any)?.avatar_url ?? null) as string | null,
    }
  },
  ['dashboard-layout'],
  { revalidate: 60 }   // 1 minuto — foto pode mudar
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

  // Pacientes não pertencem ao dashboard — redireciona ao portal
  const { data: perfil } = await createAdminClient()
    .from('usuarios')
    .select('perfil')
    .eq('id', session.user.id)
    .maybeSingle()

  if (perfil?.perfil === 'paciente') redirect('/paciente/home')

  // Dados cacheados — na segunda navegação em diante isso é <1ms
  const { nome, empresaNome, fotoUrl } = await getLayoutData(session.user.id)

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-surface)' }}>
      <SidebarProvider
        userName={nome || session.user.email || 'Usuário'}
        userEmail={session.user.email || ''}
        empresaNome={empresaNome}
        userFoto={fotoUrl}
      >
        {children}
      </SidebarProvider>
    </div>
  )
}
