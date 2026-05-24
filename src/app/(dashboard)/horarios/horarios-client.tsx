'use client'

import { useState, useMemo } from 'react'
import { Plus, UserPlus } from 'lucide-react'
import { GradeSemanal } from '@/components/horarios/grade-semanal'
import { TurnoForm } from '@/components/horarios/turno-form'
import { ProfissionalSelector } from '@/components/horarios/profissional-selector'
import { ProfissionalForm } from '@/components/horarios/profissional-form'

export interface Profissional {
  id: string
  nome: string
  especialidade: string | null
  cor_agenda: string | null
  avatar_url: string | null
  usuario_id: string | null
  ativo: boolean
}

export interface Turno {
  id: string
  profissional_id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  intervalo_minutos: number | null
  ativo: boolean
}

// Mantido para compat com componentes (AusenciasLista/AusenciaForm) ainda usados pela /agenda
export interface Ausencia {
  id: string
  profissional_id: string | null
  data_inicio: string
  data_fim: string
  hora_inicio?: string | null   // "HH:MM" — null = dia inteiro
  hora_fim?: string | null      // "HH:MM" — null = dia inteiro
  motivo: string | null
  tipo: 'folga' | 'ferias' | 'feriado' | 'outro'
}

interface Props {
  profissionais: Profissional[]
  turnos: Turno[]
  ausencias: Ausencia[]
  podeEditar: boolean
}

export function HorariosClient({ profissionais, turnos, podeEditar }: Props) {
  const [profId, setProfId] = useState<string>(profissionais[0]?.id ?? '')

  // Modais
  const [editingTurno, setEditingTurno] = useState<Turno | null>(null)
  const [novoTurno, setNovoTurno]       = useState<{ dia_semana: number } | null>(null)
  const [novoProf, setNovoProf]         = useState(false)
  const [editingProf, setEditingProf]   = useState<Profissional | null>(null)

  const profissionalSelecionado = profissionais.find(p => p.id === profId)
  const turnosDoProf = useMemo(
    () => turnos.filter(t => t.profissional_id === profId).sort((a, b) =>
      a.dia_semana - b.dia_semana || a.hora_inicio.localeCompare(b.hora_inicio)
    ),
    [turnos, profId]
  )

  // Estado vazio
  if (profissionais.length === 0) {
    return (
      <>
        <div className="bg-white rounded-3xl border border-[#E8E8E8] p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#4A3AE8]/10 text-[#4A3AE8] flex items-center justify-center">
            <UserPlus size={28} />
          </div>
          <h3 className="font-bold text-[#2C3E50] text-lg mb-1">Nenhum profissional cadastrado</h3>
          <p className="text-sm text-[#7F8C8D] mb-6 max-w-md mx-auto">
            Para gerenciar horários, primeiro cadastre os profissionais da clínica.
          </p>
          <button
            onClick={() => setNovoProf(true)}
            className="inline-flex items-center gap-2 bg-[#4A3AE8] text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-[#3829c7] shadow-md"
          >
            <Plus size={16} />
            Cadastrar primeiro profissional
          </button>
        </div>

        {novoProf && (
          <ProfissionalForm profissional={null} onClose={() => setNovoProf(false)} />
        )}
      </>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header: seletor de profissional + botões */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-[#7F8C8D]">
          {turnosDoProf.length} {turnosDoProf.length === 1 ? 'turno cadastrado' : 'turnos cadastrados'}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <ProfissionalSelector
            profissionais={profissionais}
            selecionado={profId}
            onChange={setProfId}
          />

          <button
            onClick={() => setNovoProf(true)}
            className="flex items-center gap-2 bg-white border border-[#E8E8E8] text-[#2C3E50] px-4 py-2.5 rounded-full text-sm font-semibold hover:border-[#4A3AE8] hover:text-[#4A3AE8] shadow-sm"
            title="Cadastrar novo profissional"
          >
            <UserPlus size={15} />
            Profissional
          </button>

          <button
            onClick={() => setNovoTurno({ dia_semana: 1 })}
            className="flex items-center gap-2 bg-[#4A3AE8] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#3829c7] shadow-md"
          >
            <Plus size={16} />
            Novo Turno
          </button>
        </div>
      </div>

      {/* Grade semanal */}
      {profissionalSelecionado && (
        <GradeSemanal
          profissional={profissionalSelecionado}
          turnos={turnosDoProf}
          podeEditar={podeEditar}
          onAddTurno={(dia_semana) => setNovoTurno({ dia_semana })}
          onEditTurno={setEditingTurno}
        />
      )}

      <p className="text-xs text-[#7F8C8D] text-center pt-2">
        💡 Folgas, férias e feriados foram movidos para a <strong>Agenda</strong>.
      </p>

      {/* Modais */}
      {(editingTurno || novoTurno) && (
        <TurnoForm
          turno={editingTurno}
          diaSemanaPadrao={editingTurno?.dia_semana ?? novoTurno?.dia_semana ?? 1}
          profissionais={profissionais}
          profissionalIdPadrao={editingTurno?.profissional_id ?? profId}
          onClose={() => {
            setEditingTurno(null)
            setNovoTurno(null)
          }}
        />
      )}

      {(novoProf || editingProf) && (
        <ProfissionalForm
          profissional={editingProf}
          onClose={() => {
            setNovoProf(false)
            setEditingProf(null)
          }}
        />
      )}
    </div>
  )
}
