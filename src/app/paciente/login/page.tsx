'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Activity, Mail, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'

type Etapa = 'email' | 'enviado' | 'erro'

export default function PortalLoginPage() {
  const [etapa, setEtapa] = useState<Etapa>('email')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [mensagemErro, setMensagemErro] = useState('')

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMensagemErro('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        // Após clicar no link, passa pelo callback que decide para onde redirecionar
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: false, // Só permite login de quem já tem conta
      },
    })

    setLoading(false)

    if (error) {
      // Supabase retorna erro genérico para email não cadastrado (shouldCreateUser: false)
      setMensagemErro(
        'Não encontramos uma conta com esse e-mail. Verifique o endereço ou entre em contato com sua clínica.'
      )
      setEtapa('erro')
      return
    }

    setEtapa('enviado')
  }

  // ── Tela: link enviado ──────────────────────────────────────────────────────
  if (etapa === 'enviado') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#4A3AE8]/5 to-white flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#27AE60]/10 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-[#27AE60]" />
          </div>
          <h1 className="text-xl font-bold text-[#2C3E50] mb-2">Verifique seu e-mail</h1>
          <p className="text-sm text-[#7F8C8D] leading-relaxed">
            Enviamos um link de acesso para{' '}
            <strong className="text-[#2C3E50]">{email}</strong>.
            <br />
            Clique no link para entrar — ele expira em 1 hora.
          </p>
          <p className="text-xs text-[#7F8C8D] mt-5 bg-[#F8F9FA] rounded-xl p-3">
            💡 Não recebeu? Verifique a pasta de spam ou{' '}
            <button
              className="text-[#4A3AE8] font-semibold hover:underline"
              onClick={() => { setEtapa('email'); setMensagemErro('') }}
            >
              tente novamente
            </button>
            .
          </p>
        </div>
      </div>
    )
  }

  // ── Tela principal: input de e-mail ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4A3AE8]/5 to-white flex items-center justify-center p-5">
      <div className="w-full max-w-sm space-y-6">

        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#4A3AE8] shadow-lg mb-4">
            <Activity size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#2C3E50]">Portal do Paciente</h1>
          <p className="text-sm text-[#7F8C8D] mt-1">CinesioPro</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-7">
          <h2 className="text-lg font-semibold text-[#2C3E50] mb-1">Acessar minha conta</h2>
          <p className="text-sm text-[#7F8C8D] mb-6">
            Digite seu e-mail e enviaremos um link de acesso instantâneo — sem precisar de senha.
          </p>

          <form onSubmit={handleEnviar} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#7F8C8D] mb-1.5">
                Seu e-mail
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@email.com"
                  required
                  autoComplete="email"
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-[#E8E8E8] text-sm text-[#2C3E50] placeholder:text-[#7F8C8D] outline-none transition focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/15"
                />
              </div>
            </div>

            {etapa === 'erro' && mensagemErro && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">
                {mensagemErro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full h-12 bg-[#4A3AE8] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#3829c7] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Enviar link de acesso
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#7F8C8D]">
          COFFITO 424/2013 · LGPD · Dados protegidos
        </p>
      </div>
    </div>
  )
}
