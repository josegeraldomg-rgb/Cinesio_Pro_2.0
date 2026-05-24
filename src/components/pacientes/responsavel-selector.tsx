'use client'

import { useState, useMemo } from 'react'
import { Search, User } from 'lucide-react'
import { getDDI } from '@/lib/ddis'

export interface PacienteResumo {
  id: string
  nome: string
  ddi: string | null
  telefone: string | null
  responsavel_id?: string | null
}

interface Props {
  pacientes: PacienteResumo[]
  responsavelId: string
  onChange: (id: string, telefone: string, ddi: string) => void
  excluirId?: string  // exclui o próprio paciente sendo editado
}

export function ResponsavelSelector({ pacientes, responsavelId, onChange, excluirId }: Props) {
  const [busca, setBusca] = useState('')

  // Só pacientes que NÃO são dependentes podem ser responsáveis
  const disponiveis = useMemo(() => {
    return pacientes.filter(p => !p.responsavel_id && p.id !== excluirId)
  }, [pacientes, excluirId])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return disponiveis
    return disponiveis.filter(p => p.nome.toLowerCase().includes(q) || (p.telefone ?? '').includes(q))
  }, [disponiveis, busca])

  const selecionado = pacientes.find(p => p.id === responsavelId)

  return (
    <div className="space-y-2">
      <input type="hidden" name="responsavel_id" value={responsavelId} />

      {selecionado ? (
        <div className="flex items-center gap-3 bg-[#4A3AE8]/5 border border-[#4A3AE8]/20 rounded-xl px-3 py-2.5">
          <div className="w-9 h-9 rounded-full bg-[#4A3AE8]/15 text-[#4A3AE8] flex items-center justify-center font-bold text-sm">
            {selecionado.nome.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#2C3E50] truncate">{selecionado.nome}</p>
            <p className="text-xs text-[#7F8C8D]">
              {getDDI(selecionado.ddi ?? '55').flag} +{selecionado.ddi ?? '55'} {selecionado.telefone}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange('', '', '55')}
            className="text-xs text-[#E74C3C] font-semibold hover:underline"
          >
            Trocar
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar responsável por nome ou telefone…"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
            />
          </div>

          <div className="max-h-48 overflow-y-auto border border-[#E8E8E8] rounded-xl bg-white">
            {filtrados.length === 0 ? (
              <p className="text-xs text-[#7F8C8D] text-center py-6">
                {busca
                  ? 'Nenhum paciente encontrado'
                  : disponiveis.length === 0
                    ? 'Cadastre primeiro o paciente responsável (titular do telefone)'
                    : 'Comece a digitar para buscar'}
              </p>
            ) : (
              <ul className="divide-y divide-[#F0F0F0]">
                {filtrados.slice(0, 8).map(p => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onChange(p.id, p.telefone ?? '', p.ddi ?? '55')}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#F8F9FA] text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#F0F0F0] text-[#7F8C8D] flex items-center justify-center">
                        <User size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#2C3E50] truncate">{p.nome}</p>
                        {p.telefone && (
                          <p className="text-xs text-[#7F8C8D]">
                            {getDDI(p.ddi ?? '55').flag} +{p.ddi ?? '55'} {p.telefone}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
