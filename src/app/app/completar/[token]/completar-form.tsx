'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Heart } from 'lucide-react'
import { completarCadastroViaTokenAction } from '@/app/(dashboard)/pacientes/actions'

interface Props {
  token: string
  nomePaciente: string
  nomeClinica: string
}

export function CompletarForm({ token, nomePaciente, nomeClinica }: Props) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk]   = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setErr(null)
    const r = await completarCadastroViaTokenAction(new FormData(e.currentTarget))
    setLoading(false)
    if (r?.error) setErr(r.error)
    else setOk(true)
  }

  if (ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#edeff3] to-white p-6">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#27AE60]/10 text-[#27AE60] flex items-center justify-center">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-xl font-bold text-[#2C3E50] mb-2">Cadastro concluído!</h1>
          <p className="text-sm text-[#7F8C8D] mb-3">
            Obrigado, {nomePaciente.split(' ')[0]}! Seus dados foram salvos com sucesso.
          </p>
          <p className="text-xs text-[#7F8C8D]">
            Verifique seu email — enviamos um link para você definir uma senha e acessar
            o Portal do Paciente do <strong>{nomeClinica}</strong>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#edeff3] to-white">
      <div className="max-w-2xl mx-auto p-6 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#4A3AE8] text-white flex items-center justify-center shadow-lg">
            <Heart size={26} fill="white" />
          </div>
          <h1 className="text-2xl font-bold text-[#2C3E50]">Bem-vindo(a) ao {nomeClinica}</h1>
          <p className="text-sm text-[#7F8C8D] mt-1">
            Olá, <strong>{nomePaciente}</strong>! Complete seu cadastro abaixo.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="token" value={token} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Email *</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="seu@email.com"
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">CPF</label>
                <input
                  name="cpf"
                  placeholder="000.000.000-00"
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Data de nascimento</label>
                <input
                  name="data_nascimento"
                  type="date"
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Sexo biológico</label>
                <select
                  name="sexo_biologico"
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm bg-white outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
                >
                  <option value="">Selecione…</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="intersexo">Intersexo</option>
                </select>
              </div>
            </div>

            {/* Endereço */}
            <div className="pt-3 border-t border-[#E8E8E8]">
              <h3 className="text-sm font-bold text-[#2C3E50] mb-3">Endereço</h3>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">CEP</label>
                  <input name="cep" placeholder="00000-000" className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8]" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Rua</label>
                  <input name="rua" placeholder="Rua / Avenida" className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8]" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Número</label>
                  <input name="numero" placeholder="123" className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8]" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Bairro</label>
                  <input name="bairro" className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8]" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Cidade</label>
                  <input name="cidade" className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">UF</label>
                  <input name="estado" placeholder="SP" maxLength={2} className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm uppercase outline-none focus:border-[#4A3AE8]" />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#7F8C8D] pt-2">
              Ao concluir, você concorda com o tratamento de seus dados conforme a LGPD
              para fins de atendimento clínico no {nomeClinica}.
            </p>

            {err && (
              <div className="flex items-start gap-2 text-xs text-[#E74C3C] bg-[#E74C3C]/10 border border-[#E74C3C]/30 rounded-lg px-3 py-2">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{err}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4A3AE8] text-white h-12 rounded-full text-sm font-semibold hover:bg-[#3829c7] disabled:opacity-50 shadow-md"
            >
              {loading ? 'Salvando…' : 'Concluir cadastro'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
