'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Activity, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-mail ou senha incorretos. Verifique suas credenciais.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#4A3AE8] shadow-lg mb-4">
            <Activity size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#2C3E50]">CinesioPro</h1>
          <p className="text-[#7F8C8D] text-sm mt-1">Sistema de Gestão Clínica</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-8">
          <h2 className="text-xl font-semibold text-[#2C3E50] mb-1">Bem-vindo de volta</h2>
          <p className="text-[#7F8C8D] text-sm mb-6">Entre com suas credenciais para acessar</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#2C3E50]">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-10 w-full rounded-lg border border-[#E8E8E8] bg-white px-3 pr-10 py-2 text-sm text-[#2C3E50] placeholder:text-[#7F8C8D] outline-none transition-colors focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7F8C8D] hover:text-[#2C3E50]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" loading={loading} size="lg">
              Entrar
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#E8E8E8]">
            <p className="text-xs text-[#7F8C8D] text-center">
              Ao entrar, você concorda com nossa{' '}
              <span className="text-[#4A3AE8] cursor-pointer hover:underline">Política de Privacidade</span>
              {' '}e{' '}
              <span className="text-[#4A3AE8] cursor-pointer hover:underline">Termos de Uso</span>
            </p>
          </div>
        </div>

        {/* COFFITO */}
        <p className="text-center text-xs text-[#7F8C8D] mt-6">
          Conforme COFFITO 424/2013 e COFFITO 619/2025 · LGPD
        </p>
      </div>
    </div>
  )
}
