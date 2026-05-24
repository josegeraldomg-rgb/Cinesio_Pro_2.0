'use client'

import { Check, ChevronDown, X } from 'lucide-react'
import type { Profissional } from '@/app/(dashboard)/agenda/agenda-page-client'

interface Props {
  profissionais: Profissional[]
  selecionado: Profissional | null
  onSelect: (p: Profissional | null) => void
}

export function PassoProfissional({ profissionais, selecionado, onSelect }: Props) {
  if (selecionado) {
    return (
      <div className="bg-[#27AE60]/5 border border-[#27AE60]/30 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#27AE60] text-white flex items-center justify-center flex-shrink-0">
          <Check size={18} strokeWidth={3} />
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full text-white font-bold text-sm flex items-center justify-center flex-shrink-0"
            style={{ background: selecionado.cor_agenda ?? '#4A3AE8' }}
          >
            {selecionado.nome.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#27AE60] uppercase tracking-wider">Profissional</p>
            <p className="text-sm font-bold text-[#2C3E50] truncate">
              {selecionado.nome}
              {selecionado.especialidade && (
                <span className="font-normal text-[#7F8C8D] ml-1">· {selecionado.especialidade}</span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => onSelect(null)}
          className="text-xs font-semibold text-[#7F8C8D] hover:text-[#E74C3C] flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white"
        >
          <X size={12} />
          Trocar
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-[#4A3AE8] text-white text-xs font-bold flex items-center justify-center">2</span>
        <h3 className="font-bold text-[#2C3E50] text-sm">Escolha o profissional</h3>
      </div>

      {profissionais.length === 0 ? (
        <p className="text-sm text-[#7F8C8D] text-center py-4">
          Nenhum profissional cadastrado. Cadastre em <strong>/horarios</strong>.
        </p>
      ) : (
        <div className="relative">
          <select
            value=""
            onChange={(e) => {
              const p = profissionais.find(pp => pp.id === e.target.value)
              if (p) onSelect(p)
            }}
            className="w-full h-12 px-4 pr-10 rounded-xl border border-[#E8E8E8] text-sm bg-white outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10 appearance-none cursor-pointer font-medium text-[#2C3E50]"
          >
            <option value="" disabled>Selecione um profissional…</option>
            {profissionais.map(p => (
              <option key={p.id} value={p.id}>
                {p.nome} {p.especialidade ? `· ${p.especialidade}` : ''}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7F8C8D] pointer-events-none" />
        </div>
      )}
    </div>
  )
}
