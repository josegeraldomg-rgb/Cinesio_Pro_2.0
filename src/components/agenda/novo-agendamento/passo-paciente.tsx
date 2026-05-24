'use client'

import { useState, useMemo } from 'react'
import { Search, UserPlus, Check, ChevronLeft, ChevronRight, Phone, X } from 'lucide-react'
import { getDDI } from '@/lib/ddis'
import { PacienteRapidoForm } from '@/components/pacientes/paciente-rapido-form'
import type { Paciente } from '@/app/(dashboard)/agenda/agenda-page-client'

export interface PacienteSelecionado {
  id: string
  nome: string
  telefone: string | null
  ddi: string | null
}

interface Props {
  pacientes: Paciente[]
  selecionado: PacienteSelecionado | null
  onSelect: (p: PacienteSelecionado | null) => void
}

export function PassoPaciente({ pacientes, selecionado, onSelect }: Props) {
  const [busca, setBusca]   = useState('')
  const [letra, setLetra]   = useState<string>('Todos')
  const [novoOpen, setNovo] = useState(false)

  // Letras que TÊM pacientes (espec.: só aparecem letras que iniciam algum nome)
  const letrasDisponiveis = useMemo(() => {
    const set = new Set<string>()
    for (const p of pacientes) {
      const c = p.nome.trim().charAt(0).toUpperCase()
      if (c && /[A-Z]/.test(c)) set.add(c)
    }
    return [...set].sort()
  }, [pacientes])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return pacientes.filter(p => {
      // Filtro alfabético
      if (letra !== 'Todos') {
        const c = p.nome.trim().charAt(0).toUpperCase()
        if (c !== letra) return false
      }
      if (q) {
        const hay = `${p.nome} ${p.telefone ?? ''} ${p.cpf ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [pacientes, busca, letra])

  // ── Modo colapsado quando paciente já selecionado ──
  if (selecionado) {
    return (
      <div className="bg-[#27AE60]/5 border border-[#27AE60]/30 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#27AE60] text-white flex items-center justify-center flex-shrink-0">
          <Check size={18} strokeWidth={3} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#27AE60] uppercase tracking-wider">Paciente</p>
          <p className="text-sm font-bold text-[#2C3E50] truncate">{selecionado.nome}</p>
          {selecionado.telefone && (
            <p className="text-xs text-[#7F8C8D] truncate flex items-center gap-1">
              <Phone size={10} />
              {getDDI(selecionado.ddi ?? '55').flag} +{selecionado.ddi ?? '55'} {selecionado.telefone}
            </p>
          )}
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
        <div className="flex items-center gap-2 flex-1">
          <span className="w-7 h-7 rounded-full bg-[#4A3AE8] text-white text-xs font-bold flex items-center justify-center">1</span>
          <h3 className="font-bold text-[#2C3E50] text-sm">Escolha o paciente</h3>
        </div>
        <button
          onClick={() => setNovo(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#4A3AE8] bg-[#4A3AE8]/10 hover:bg-[#4A3AE8]/20 px-3 py-1.5 rounded-full"
        >
          <UserPlus size={13} />
          Novo
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar por nome, telefone ou CPF…"
          className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#F8F9FA] border border-transparent text-sm outline-none focus:bg-white focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
        />
      </div>

      {/* Alfabeto — só letras existentes */}
      <AlfabetoFiltro
        letras={letrasDisponiveis}
        atual={letra}
        onChange={setLetra}
      />

      {/* Lista */}
      <div className="max-h-72 overflow-y-auto border border-[#E8E8E8] rounded-xl">
        {filtrados.length === 0 ? (
          <p className="text-center py-8 text-sm text-[#7F8C8D]">
            {pacientes.length === 0
              ? 'Nenhum paciente cadastrado. Clique em "Novo" para criar o primeiro.'
              : 'Nenhum paciente encontrado com esse filtro.'}
          </p>
        ) : (
          <ul className="divide-y divide-[#F0F0F0]">
            {filtrados.slice(0, 50).map(p => (
              <li key={p.id}>
                <button
                  onClick={() => onSelect({ id: p.id, nome: p.nome, telefone: p.telefone, ddi: p.ddi })}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F8F9FA] transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#2C3E50] truncate">{p.nome}</p>
                    <p className="text-xs text-[#7F8C8D] flex items-center gap-2 mt-0.5">
                      {p.telefone ? (
                        <span>{getDDI(p.ddi ?? '55').flag} +{p.ddi ?? '55'} {p.telefone}</span>
                      ) : <span>Sem telefone</span>}
                      {p.cpf && <span>· CPF {p.cpf}</span>}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#4A3AE8] flex-shrink-0">Selecionar</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {filtrados.length > 50 && (
        <p className="text-[11px] text-[#7F8C8D] text-center">
          Mostrando 50 de {filtrados.length} pacientes. Refine a busca para ver mais.
        </p>
      )}

      {novoOpen && (
        <PacienteRapidoForm onClose={() => setNovo(false)} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// Componente: Alfabeto horizontal com scroll
// ─────────────────────────────────────────
function AlfabetoFiltro({ letras, atual, onChange }: { letras: string[]; atual: string; onChange: (l: string) => void }) {
  // Janela visível (5-7 letras de cada vez + setas)
  const [offset, setOffset] = useState(0)
  const tamanho = 7
  const podeVoltar = offset > 0
  const podeAvancar = offset + tamanho < letras.length

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setOffset(Math.max(0, offset - tamanho))}
        disabled={!podeVoltar}
        className="p-1 rounded-full hover:bg-[#F8F9FA] text-[#7F8C8D] disabled:opacity-30 flex-shrink-0"
      >
        <ChevronLeft size={14} />
      </button>

      <div className="flex items-center gap-1 flex-1 overflow-hidden">
        <button
          onClick={() => onChange('Todos')}
          className={`px-3 h-7 rounded-full text-[11px] font-bold transition-colors flex-shrink-0 ${
            atual === 'Todos' ? 'bg-[#4A3AE8] text-white' : 'bg-[#F8F9FA] text-[#7F8C8D] hover:bg-[#E8E8E8]'
          }`}
        >
          Todos
        </button>
        {letras.slice(offset, offset + tamanho).map(l => (
          <button
            key={l}
            onClick={() => onChange(l)}
            className={`w-7 h-7 rounded-full text-[11px] font-bold transition-colors flex-shrink-0 ${
              atual === l ? 'bg-[#4A3AE8] text-white' : 'bg-[#F8F9FA] text-[#7F8C8D] hover:bg-[#E8E8E8]'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <button
        onClick={() => setOffset(Math.min(letras.length - tamanho, offset + tamanho))}
        disabled={!podeAvancar}
        className="p-1 rounded-full hover:bg-[#F8F9FA] text-[#7F8C8D] disabled:opacity-30 flex-shrink-0"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  )
}
