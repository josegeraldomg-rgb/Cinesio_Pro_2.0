'use client'

import { useState, useTransition } from 'react'
import { X, ArrowRight, Check, AlertCircle } from 'lucide-react'
import { remanejamentoSlotAction } from '@/app/(dashboard)/turmas/actions'
import type { NovaMatricula, SlotComVagas, MatriculaSlotInfo } from '@/app/(dashboard)/turmas/actions'

interface Props {
  matricula: NovaMatricula
  slotsDisponiveis: SlotComVagas[]
  onClose: () => void
  onSalvar: () => void
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function RemanejamentoModal({ matricula, slotsDisponiveis, onClose, onSalvar }: Props) {
  const [slotAntigoId, setSlotAntigoId] = useState<string | null>(null)
  const [slotNovoId, setSlotNovoId] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [, startT] = useTransition()

  const slotsAtivos = (matricula.slots ?? []).filter(s => s.ativo)

  const slotAntigoInfo = slotsAtivos.find(s => s.slot_id === slotAntigoId)

  const servicoId = (matricula.planos_servico as any)?.servicos
    ? undefined
    : undefined // We filter from available slots only by service match

  // Slots that are available for replacement: same service, has vagas, not already in matricula
  const slotIdsEmUso = slotsAtivos.map(s => s.slot_id)
  const slotsParaEscolha = slotsDisponiveis.filter(s => {
    if (slotIdsEmUso.includes(s.id) && s.id !== slotAntigoId) return false // already enrolled (unless it's the one being replaced)
    if (s.vagas_livres === 0) return false
    return true
  })

  function confirmar() {
    if (!slotAntigoId || !slotNovoId) { setErr('Selecione o slot atual e o novo slot.'); return }
    if (slotAntigoId === slotNovoId) { setErr('O slot de destino deve ser diferente do slot atual.'); return }
    setErr('')
    startT(async () => {
      const r = await remanejamentoSlotAction({
        matricula_id: matricula.id,
        slot_antigo_id: slotAntigoId,
        slot_novo_id: slotNovoId,
      })
      if ('error' in r) { setErr(r.error); return }
      onSalvar()
    })
  }

  function slotLabel(s: SlotComVagas | undefined) {
    if (!s) return '—'
    return `${s.turmas?.nome ?? 'Turma'} — ${DIAS[s.dia_semana]} ${s.hora_inicio}`
  }

  function slotLabelFromInfo(info: MatriculaSlotInfo) {
    const ts = info.turma_slots
    if (!ts) return info.slot_id
    return `${ts.turmas?.nome ?? 'Turma'} — ${DIAS[ts.dia_semana]} ${ts.hora_inicio}`
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8] flex-shrink-0">
          <div>
            <p className="font-bold text-[#2C3E50] text-sm">Remanejamento de Slot</p>
            <p className="text-[11px] text-[#7F8C8D]">{matricula.pacientes?.nome}</p>
          </div>
          <button onClick={onClose} className="text-[#7F8C8D] hover:text-[#2C3E50]"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Step 1: Select current slot */}
          <div>
            <label className="block text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-2">
              1. Slot atual a ser substituído
            </label>
            {slotsAtivos.length === 0 ? (
              <p className="text-sm text-[#7F8C8D] bg-[#F8F9FA] rounded-xl px-4 py-3">Nenhum slot ativo nesta matrícula.</p>
            ) : (
              <div className="space-y-2">
                {slotsAtivos.map(s => (
                  <button
                    key={s.slot_id}
                    onClick={() => { setSlotAntigoId(s.slot_id); setSlotNovoId(null) }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all ${
                      slotAntigoId === s.slot_id ? 'border-[#E74C3C] bg-[#E74C3C]/5' : 'border-[#E8E8E8] hover:border-[#E74C3C]/30'
                    }`}
                  >
                    <span className="text-sm font-medium text-[#2C3E50]">{slotLabelFromInfo(s)}</span>
                    {slotAntigoId === s.slot_id && <Check size={15} className="text-[#E74C3C] flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Arrow */}
          {slotAntigoId && (
            <div className="flex items-center justify-center gap-3 py-1">
              <div className="flex-1 h-px bg-[#E8E8E8]" />
              <ArrowRight size={16} className="text-[#4A3AE8]" />
              <div className="flex-1 h-px bg-[#E8E8E8]" />
            </div>
          )}

          {/* Step 2: Select new slot */}
          {slotAntigoId && (
            <div>
              <label className="block text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-2">
                2. Novo slot de destino
              </label>
              {slotsParaEscolha.length === 0 ? (
                <p className="text-sm text-[#7F8C8D] bg-[#F8F9FA] rounded-xl px-4 py-3">Nenhum slot disponível com vagas.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {slotsParaEscolha.map(s => {
                    const jaEstaMatriculado = slotIdsEmUso.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSlotNovoId(s.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all ${
                          slotNovoId === s.id ? 'border-[#27AE60] bg-[#27AE60]/5' : 'border-[#E8E8E8] hover:border-[#27AE60]/30'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium text-[#2C3E50]">{slotLabel(s)}</p>
                          <p className="text-[11px] text-[#7F8C8D]">{s.vagas_livres} vaga(s) livre(s)</p>
                          {jaEstaMatriculado && s.id === slotAntigoId && <p className="text-[11px] text-[#E74C3C]">(slot atual)</p>}
                        </div>
                        {slotNovoId === s.id && <Check size={15} className="text-[#27AE60] flex-shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {slotAntigoId && slotNovoId && (
            <div className="bg-[#F8F9FA] rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-[#7F8C8D]">Resumo do remanejamento:</p>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-[#E74C3C] font-medium line-through">
                  {slotLabel(slotsDisponiveis.find(s => s.id === slotAntigoId)) ||
                    slotLabelFromInfo(slotsAtivos.find(s => s.slot_id === slotAntigoId)!)}
                </span>
                <ArrowRight size={14} className="text-[#7F8C8D] flex-shrink-0" />
                <span className="text-[#27AE60] font-medium">
                  {slotLabel(slotsDisponiveis.find(s => s.id === slotNovoId))}
                </span>
              </div>
            </div>
          )}

          {err && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2.5 rounded-lg">
              <AlertCircle size={14} className="flex-shrink-0" />
              {err}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#E8E8E8] flex-shrink-0 flex gap-3">
          <button onClick={onClose} className="h-11 px-5 rounded-xl border border-[#E8E8E8] text-[#7F8C8D] font-medium text-sm hover:text-[#2C3E50]">
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={!slotAntigoId || !slotNovoId}
            className="flex-1 h-11 rounded-xl bg-[#4A3AE8] text-white font-semibold text-sm hover:bg-[#3D2ED6] disabled:opacity-50 shadow-sm"
          >
            Confirmar Remanejamento
          </button>
        </div>
      </div>
    </div>
  )
}
