'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { DDIS, getDDI } from '@/lib/ddis'

interface Props {
  ddi: string
  telefone: string
  onDDIChange: (codigo: string) => void
  onTelefoneChange: (telefone: string) => void
  disabled?: boolean
  required?: boolean
  placeholder?: string
  name?: string  // se passado, usa como input name="ddi" e name="{name}" para o telefone
}

export function DDISelector({ ddi, telefone, onDDIChange, onTelefoneChange, disabled, required, placeholder, name = 'telefone' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const ddiAtual = getDDI(ddi)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="flex w-full">
      <input type="hidden" name="ddi" value={ddi} />

      {/* Seletor de bandeira/DDI */}
      <div ref={ref} className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => !disabled && setOpen(o => !o)}
          disabled={disabled}
          className="h-10 px-2.5 rounded-l-lg border border-r-0 border-[#E8E8E8] bg-[#F8F9FA] hover:bg-[#E8E8E8] flex items-center gap-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed"
        >
          <span className="text-base leading-none">{ddiAtual.flag}</span>
          <span className="text-[#2C3E50]">+{ddiAtual.codigo}</span>
          <ChevronDown size={12} className="text-[#7F8C8D]" />
        </button>

        {open && (
          <div className="absolute z-50 left-0 top-full mt-1 w-64 max-h-80 overflow-y-auto bg-white border border-[#E8E8E8] rounded-xl shadow-xl">
            {DDIS.map(d => (
              <button
                type="button"
                key={d.codigo}
                onClick={() => { onDDIChange(d.codigo); setOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[#F8F9FA] transition-colors ${
                  ddi === d.codigo ? 'bg-[#4A3AE8]/5 text-[#4A3AE8] font-semibold' : 'text-[#2C3E50]'
                }`}
              >
                <span className="text-lg leading-none">{d.flag}</span>
                <span className="flex-1 text-left">{d.pais}</span>
                <span className="text-[#7F8C8D] text-xs">+{d.codigo}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input do telefone */}
      <input
        name={name}
        type="tel"
        required={required}
        disabled={disabled}
        value={telefone}
        onChange={(e) => onTelefoneChange(e.target.value)}
        placeholder={placeholder ?? ddiAtual.formato}
        className="flex-1 h-10 px-3 rounded-r-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10 disabled:bg-[#F8F9FA] disabled:cursor-not-allowed"
      />
    </div>
  )
}
