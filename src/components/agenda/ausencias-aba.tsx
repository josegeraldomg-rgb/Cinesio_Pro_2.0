'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { AusenciasLista } from '@/components/horarios/ausencias-lista'
import { AusenciaForm } from '@/components/horarios/ausencia-form'
import type { Ausencia as AusenciaTipo, Profissional as ProfTipo } from '@/app/(dashboard)/horarios/horarios-client'
import type { Ausencia, Profissional } from '@/app/(dashboard)/agenda/agenda-page-client'

interface Props {
  ausencias: Ausencia[]
  profissionais: Profissional[]
}

type TipoFiltro = 'todos' | 'folga' | 'ferias' | 'outro'

export function AusenciasAba({ ausencias, profissionais }: Props) {
  const [busca, setBusca]             = useState('')
  const [filtroProf, setFiltroProf]   = useState('')
  const [filtroTipo, setFiltroTipo]   = useState<TipoFiltro>('todos')
  const [editando, setEditando]       = useState<AusenciaTipo | null>(null)
  const [novo, setNovo]               = useState(false)

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return ausencias.filter(a => {
      if (filtroTipo !== 'todos' && a.tipo !== filtroTipo) return false
      if (filtroProf && a.profissional_id !== filtroProf) return false
      if (q && !(a.motivo ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [ausencias, busca, filtroProf, filtroTipo])

  const filtrosAtivos = !!(busca || filtroProf || filtroTipo !== 'todos')
  function limpar() {
    setBusca('')
    setFiltroProf('')
    setFiltroTipo('todos')
  }

  // Profissionais para o form (precisa de campos compatíveis)
  const profParaForm: ProfTipo[] = profissionais.map(p => ({
    id: p.id,
    nome: p.nome,
    especialidade: null,
    cor_agenda: p.cor_agenda ?? null,
    avatar_url: null,
    usuario_id: null,
    ativo: true,
  }))

  return (
    <div className="space-y-4">
      {/* Header: filtros + Novo */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-3 flex items-center gap-2 flex-wrap shadow-sm flex-1 min-w-[300px]">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por motivo…"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#F8F9FA] border border-transparent text-sm outline-none focus:bg-white focus:border-[#4A3AE8]"
            />
          </div>

          <select
            value={filtroProf}
            onChange={(e) => setFiltroProf(e.target.value)}
            className="h-9 px-3 rounded-lg bg-[#F8F9FA] border border-transparent text-sm outline-none focus:bg-white focus:border-[#4A3AE8] cursor-pointer"
          >
            <option value="">Todos os profissionais</option>
            {profissionais.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>

          <div className="inline-flex bg-[#F8F9FA] rounded-lg p-0.5">
            {([
              { id: 'todos',  label: 'Todos'  },
              { id: 'folga',  label: 'Folga'  },
              { id: 'ferias', label: 'Férias' },
              { id: 'outro',  label: 'Outro'  },
            ] as { id: TipoFiltro; label: string }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setFiltroTipo(t.id)}
                className={`px-3 h-8 text-xs font-semibold rounded-md transition-colors ${
                  filtroTipo === t.id ? 'bg-white text-[#2C3E50] shadow-sm' : 'text-[#7F8C8D] hover:text-[#2C3E50]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {filtrosAtivos && (
            <button
              onClick={limpar}
              className="flex items-center gap-1 h-9 px-3 rounded-lg text-xs font-semibold text-[#E74C3C] hover:bg-[#E74C3C]/10"
            >
              <X size={12} />
              Limpar
            </button>
          )}
        </div>

        <button
          onClick={() => setNovo(true)}
          className="flex items-center gap-2 bg-[#4A3AE8] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#3829c7] shadow-md flex-shrink-0"
        >
          <Plus size={16} />
          Nova Ausência
        </button>
      </div>

      {filtrados.length === 0 && ausencias.length > 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-12 text-center">
          <p className="text-sm text-[#7F8C8D] mb-3">Nenhuma ausência encontrada com esses filtros.</p>
          <button onClick={limpar} className="text-sm font-semibold text-[#4A3AE8] hover:underline">
            Limpar filtros
          </button>
        </div>
      ) : (
        <AusenciasLista
          ausencias={filtrados as any}
          profissionais={profParaForm}
          podeEditar
          onEdit={setEditando}
        />
      )}

      {(novo || editando) && (
        <AusenciaForm
          ausencia={editando}
          profissionais={profParaForm}
          profissionalIdPadrao={profissionais[0]?.id ?? ''}
          onClose={() => { setNovo(false); setEditando(null) }}
        />
      )}
    </div>
  )
}
