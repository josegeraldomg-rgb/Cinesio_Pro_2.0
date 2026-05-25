'use client'

import { useState, useMemo } from 'react'
import { X, Search, UserPlus, Check } from 'lucide-react'
import { matricularAlunoAction } from '@/app/(dashboard)/turmas/actions'
import type { TurmaSlot, TurmaPlano } from '@/app/(dashboard)/turmas/actions'

interface Paciente { id: string; nome: string; telefone: string | null }

interface Props {
  turmaId: string
  turmaNome: string
  slots: TurmaSlot[]
  planos: TurmaPlano[]
  pacientes: Paciente[]
  onClose: () => void
  onConfirmado: () => void
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function MatriculaModal({ turmaId, turmaNome, slots, planos, pacientes, onClose, onConfirmado }: Props) {
  const [busca, setBusca]         = useState('')
  const [pacienteId, setPaciente] = useState('')
  const [planoId, setPlano]       = useState(planos[0]?.id ?? '')
  const [slotIds, setSlotIds]     = useState<string[]>([])
  const [dataMatricula, setData]  = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState('')

  const planoSel = useMemo(() => planos.find(p => p.id === planoId), [planoId, planos])
  const slotsAtivos = slots.filter(s => s.ativo)

  const pacientesFiltrados = useMemo(() => {
    const q = busca.toLowerCase()
    return pacientes.filter(p => p.nome.toLowerCase().includes(q)).slice(0, 30)
  }, [busca, pacientes])

  function toggleSlot(id: string) {
    setSlotIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const slotValido = planoSel ? slotIds.length === planoSel.frequencia_semanal : slotIds.length > 0

  async function salvar() {
    if (!pacienteId) { setErr('Selecione um paciente.'); return }
    if (!planoSel) { setErr('Selecione um plano.'); return }
    if (!slotValido) { setErr(`Selecione exatamente ${planoSel?.frequencia_semanal} slot(s) para este plano.`); return }
    setSaving(true); setErr('')
    try {
      const r = await matricularAlunoAction({ turma_id: turmaId, paciente_id: pacienteId, plano_id: planoId || null, slot_ids: slotIds, data_matricula: dataMatricula })
      if ('error' in r) { setErr(r.error); return }
      onConfirmado()
    } finally { setSaving(false) }
  }

  const pacSel = pacientes.find(p => p.id === pacienteId)

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#4A3AE8]/10 flex items-center justify-center">
              <UserPlus size={18} className="text-[#4A3AE8]" />
            </div>
            <div>
              <p className="font-bold text-[#2C3E50] text-sm">Matricular Aluno</p>
              <p className="text-[11px] text-[#7F8C8D]">{turmaNome}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#7F8C8D] hover:text-[#2C3E50]"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

          {/* Busca de paciente */}
          <div>
            <label className="block text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-2">Paciente</label>
            {pacSel ? (
              <div className="flex items-center justify-between p-3 bg-[#4A3AE8]/5 border border-[#4A3AE8]/20 rounded-xl">
                <span className="font-semibold text-sm text-[#2C3E50]">{pacSel.nome}</span>
                <button onClick={() => { setPaciente(''); setBusca('') }} className="text-xs text-[#7F8C8D] hover:text-red-500">Trocar</button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
                  <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar paciente…"
                    className="w-full h-10 pl-9 pr-4 border border-[#E8E8E8] rounded-xl text-sm outline-none focus:border-[#4A3AE8]" />
                </div>
                {busca.length > 1 && (
                  <div className="border border-[#E8E8E8] rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                    {pacientesFiltrados.map(p => (
                      <button key={p.id} onClick={() => { setPaciente(p.id); setBusca('') }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#F8F9FA] border-b border-[#F0F0F0] last:border-0">
                        {p.nome}
                      </button>
                    ))}
                    {pacientesFiltrados.length === 0 && <p className="px-4 py-3 text-xs text-[#7F8C8D]">Nenhum paciente encontrado</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Plano */}
          <div>
            <label className="block text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-2">Plano</label>
            <div className="grid grid-cols-2 gap-2">
              {planos.map(p => (
                <button key={p.id} onClick={() => { setPlano(p.id); setSlotIds([]) }}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${planoId === p.id ? 'border-[#4A3AE8] bg-[#4A3AE8]/5' : 'border-[#E8E8E8] hover:border-[#4A3AE8]/30'}`}>
                  <p className="font-semibold text-sm text-[#2C3E50]">{p.nome}</p>
                  <p className="text-xs text-[#7F8C8D]">{p.frequencia_semanal}x/semana · R$ {p.valor_mensal.toFixed(2)}/mês</p>
                </button>
              ))}
            </div>
          </div>

          {/* Seleção de slots */}
          <div>
            <label className="block text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-1">
              Dias / Horários
              {planoSel && <span className="ml-2 text-[#4A3AE8]">— escolha {planoSel.frequencia_semanal} slot(s)</span>}
            </label>
            <div className="space-y-2">
              {slotsAtivos.map(s => {
                const sel = slotIds.includes(s.id)
                return (
                  <button key={s.id} onClick={() => toggleSlot(s.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${sel ? 'border-[#4A3AE8] bg-[#4A3AE8]/5' : 'border-[#E8E8E8] hover:border-[#4A3AE8]/30'}`}>
                    <span className="text-sm font-medium text-[#2C3E50]">{DIAS[s.dia_semana]} · {s.hora_inicio}–{s.hora_fim}</span>
                    {sel && <Check size={16} className="text-[#4A3AE8]" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Data de início */}
          <div>
            <label className="block text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-2">Data de Início</label>
            <input type="date" value={dataMatricula} onChange={e => setData(e.target.value)}
              className="h-10 px-3 border border-[#E8E8E8] rounded-xl text-sm outline-none focus:border-[#4A3AE8] w-full" />
          </div>

          {err && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E8E8E8] flex-shrink-0">
          <button onClick={salvar} disabled={saving || !pacienteId || !slotValido}
            className="w-full h-11 rounded-xl bg-[#4A3AE8] text-white font-semibold text-sm hover:bg-[#3D2ED6] disabled:opacity-50 shadow-sm">
            {saving ? 'Salvando…' : 'Confirmar Matrícula'}
          </button>
        </div>
      </div>
    </div>
  )
}
