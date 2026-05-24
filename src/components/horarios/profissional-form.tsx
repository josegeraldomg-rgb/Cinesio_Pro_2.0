'use client'

import { useState } from 'react'
import { X, AlertCircle, Mail, CheckCircle2 } from 'lucide-react'
import { salvarProfissionalAction } from '@/app/(dashboard)/horarios/actions'
import type { Profissional } from '@/app/(dashboard)/horarios/horarios-client'

const CORES = [
  '#4A3AE8', '#27AE60', '#F39C12', '#E91E63', '#3498DB',
  '#8E44AD', '#E67E22', '#E74C3C', '#16A085', '#34495E',
]

interface Props {
  profissional: Profissional | null
  onClose: () => void
}

export function ProfissionalForm({ profissional, onClose }: Props) {
  const [cor, setCor] = useState<string>(profissional?.cor_agenda ?? '#4A3AE8')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    setSucesso(null)
    const fd = new FormData(e.currentTarget)
    fd.set('cor_agenda', cor)
    const r = await salvarProfissionalAction(fd)
    setLoading(false)
    if (r?.error) {
      setErr(r.error)
    } else {
      // Mostra a mensagem de sucesso por um instante e recarrega
      setSucesso(r?.mensagem ?? 'Profissional salvo!')
      setTimeout(() => { onClose(); window.location.reload() }, 1800)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8]">
          <h2 className="font-bold text-[#2C3E50] text-lg">
            {profissional ? 'Editar Profissional' : 'Novo Profissional'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#F8F9FA] text-[#7F8C8D]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {profissional && <input type="hidden" name="id" value={profissional.id} />}

          {/* Nome + Especialidade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Nome completo *</label>
              <input
                name="nome"
                required
                defaultValue={profissional?.nome ?? ''}
                placeholder="Ex: Dra. Maria Silva"
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Especialidade</label>
              <input
                name="especialidade"
                defaultValue={profissional?.especialidade ?? ''}
                placeholder="Ex: Fisioterapia Ortopédica"
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              />
            </div>
          </div>

          {/* Email + Telefone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Email</label>
              <input
                name="email"
                type="email"
                placeholder="email@exemplo.com"
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Telefone</label>
              <input
                name="telefone"
                placeholder="(00) 00000-0000"
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              />
            </div>
          </div>

          {!profissional && (
            <div className="flex items-start gap-2 bg-[#4A3AE8]/5 border border-[#4A3AE8]/15 rounded-xl px-3 py-2.5 text-xs text-[#2C3E50]">
              <Mail size={14} className="mt-0.5 flex-shrink-0 text-[#4A3AE8]" />
              <p>
                Se você informar um email, o sistema cria automaticamente a conta de acesso
                com perfil <strong>Profissional</strong> e envia um convite para o profissional
                definir sua senha no primeiro acesso.
              </p>
            </div>
          )}

          {/* CREFITO + UF + Comissão */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">CREFITO / Registro</label>
              <input
                name="crefito"
                defaultValue={profissional ? '' : ''}
                placeholder="Ex: 12345-F"
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">UF</label>
              <input
                name="uf"
                maxLength={2}
                placeholder="MG"
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm uppercase outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">% Comissão padrão</label>
            <div className="relative">
              <input
                name="percentual_comissao"
                type="number"
                step="0.1"
                min={0}
                max={100}
                defaultValue={0}
                className="w-full h-10 pl-3 pr-8 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#7F8C8D]">%</span>
            </div>
            <p className="text-[11px] text-[#7F8C8D] mt-1">
              Padrão aplicado quando não há regra específica por serviço no Financeiro.
            </p>
          </div>

          {/* Cor */}
          <div>
            <label className="text-xs font-semibold text-[#7F8C8D] mb-1.5 block">Cor na agenda</label>
            <div className="flex flex-wrap gap-2">
              {CORES.map(c => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${cor === c ? 'ring-2 ring-offset-2 ring-[#2C3E50] scale-110' : ''}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Ativo */}
          <label className="flex items-center gap-3 cursor-pointer pt-2">
            <input
              type="checkbox"
              name="ativo"
              defaultChecked={profissional?.ativo ?? true}
              className="peer sr-only"
            />
            <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-[#E8E8E8] peer-checked:bg-[#27AE60] transition-colors">
              <span className="inline-block h-5 w-5 transform rounded-full bg-white shadow translate-x-0.5 peer-checked:translate-x-[22px] transition-transform" />
            </span>
            <div>
              <span className="text-sm font-semibold text-[#2C3E50]">Profissional ativo</span>
              <p className="text-xs text-[#7F8C8D]">Aparece na agenda, em horários e pode receber agendamentos</p>
            </div>
          </label>

          {err && (
            <div className="flex items-start gap-2 text-xs text-[#E74C3C] bg-[#E74C3C]/10 border border-[#E74C3C]/30 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{err}</span>
            </div>
          )}

          {sucesso && (
            <div className="flex items-start gap-2 text-xs text-[#27AE60] bg-[#27AE60]/10 border border-[#27AE60]/30 rounded-lg px-3 py-2.5">
              <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
              <span>{sucesso}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E8E8E8]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-sm font-medium text-[#7F8C8D] hover:bg-[#F8F9FA]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#4A3AE8] text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#3829c7] disabled:opacity-50 shadow-md"
            >
              {loading ? 'Salvando…' : profissional ? 'Salvar alterações' : 'Criar profissional'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
