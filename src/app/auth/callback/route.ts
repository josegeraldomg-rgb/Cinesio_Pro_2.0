import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Rota de callback OAuth/magic-link do Supabase.
 * Após verificar o código, redireciona conforme o perfil:
 *   paciente  → /paciente/home
 *   qualquer outro → /dashboard
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: usuario } = await supabase
          .from('usuarios')
          .select('perfil')
          .eq('id', user.id)
          .maybeSingle()

        if (usuario?.perfil === 'paciente') {
          return NextResponse.redirect(`${origin}/paciente/home`)
        }

        return NextResponse.redirect(`${origin}/dashboard`)
      }
    }
  }

  // Fallback de erro
  return NextResponse.redirect(`${origin}/login?erro=auth`)
}
