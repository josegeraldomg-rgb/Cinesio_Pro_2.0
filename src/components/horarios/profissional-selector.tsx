'use client'

import { ChevronDown } from 'lucide-react'
import type { Profissional } from '@/app/(dashboard)/horarios/horarios-client'

interface Props {
  profissionais: Profissional[]
  selecionado: string
  onChange: (id: string) => void
}

export function ProfissionalSelector({ profissionais, selecionado, onChange }: Props) {
  const sel = profissionais.find(p => p.id === selecionado)

  return (
    <div className="relative">
      <select
        value={selecionado}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white border border-[#E8E8E8] rounded-full pl-12 pr-10 h-10 text-sm font-semibold text-[#2C3E50] outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10 cursor-pointer min-w-[240px] shadow-sm"
      >
        {profissionais.map(p => (
          <option key={p.id} value={p.id}>
            {p.nome} {p.especialidade ? `· ${p.especialidade}` : ''}
          </option>
        ))}
      </select>

      {sel && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full overflow-hidden flex items-center justify-center pointer-events-none">
          {sel.avatar_url ? (
            <img src={sel.avatar_url} alt={sel.nome} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-white font-bold text-xs"
              style={{ background: sel.cor_agenda ?? '#4A3AE8' }}
            >
              {sel.nome.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}

      <ChevronDown
        size={14}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7F8C8D] pointer-events-none"
      />
    </div>
  )
}
