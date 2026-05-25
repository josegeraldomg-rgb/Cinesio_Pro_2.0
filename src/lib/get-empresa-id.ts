import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'

// unstable_cache não pode usar cookies() internamente.
// Por isso usamos o admin client (service role key, sem cookies).
// userId é passado como argumento → vira parte automática da cache key.
const _fetchEmpresaIdCached = unstable_cache(
  async (userId: string) => {
    const admin = createAdminClient()
    const { data } = await admin
      .from('usuarios')
      .select('empresa_id, nome')
      .eq('id', userId)
      .maybeSingle()
    return {
      empresaId: (data?.empresa_id ?? '') as string,
      usuario:   data,
    }
  },
  ['empresa-id'],
  { revalidate: 300 }  // 5 minutos
)

// React.cache deduplica dentro do mesmo request (layout + page não duplicam).
export const getEmpresaId = cache(async () => {
  const supabase = await createClient()

  // getUser() valida o JWT com o servidor de Auth — seguro para páginas que
  // tomam decisões de acesso. É chamado FORA do unstable_cache, então cookies() é OK.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { empresaId, usuario } = await _fetchEmpresaIdCached(user.id)

  return { user, usuario, empresaId }
})
