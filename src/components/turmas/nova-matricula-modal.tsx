'use client'

import { useState, useMemo } from 'react'
import { X, Search, UserPlus, Check, Users, ChevronRight } from 'lucide-react'
import { novaMatriculaAction } from '@/app/(dashboard)/turmas/actions'
import type { PlanoServico, SlotComVagas } from '@/app/(dashboard)/turmas/actions'

interface Paciente { id: string; nome: string; telefone: string | null }

interface Props {
  pacientes: Paciente[]
  planosServico: PlanoServico[]
  slotsComVagas: SlotComVagas[]
  onClose: () => void
  onConfirmado: () => void
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

type Step = 1 | 2 | 3

export function NovaMatriculaModal({ pacientes, planosServico, slotsComVagas, onClose, onConfirmado }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [busca, setBusca] = useState('')
  const [pacienteId, setPacienteId] = useState('')
  const [planoId, setPlanoId] = useState('')
  const [slotIds, setSlotIds] = useState<string[]>([])
  const [dataMatricula, setDataMatricula] = useState(new Date().toISOString().slice(0, 10))
  const [observacoes, setObservacoes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const pacienteSel = pacientes.find(p => p.id === pacienteId)
  const planoSel = planosServico.find(p => p.id === planoId)

  const pacientesFiltrados = useMemo(() => {
    const q = busca.toLowerCase()
    if (!q) return pacientes.slice(0, 30)
    return pacientes.filter(p => p.nome.toLowerCase().includes(q)).slice(0, 30)
  }, [busca, pacientes])

  const slotsDoPlano = useMemo(() => {
    if (!planoSel) return []
    return slotsComVagas.filter(s => s.turmas?.servico_id === planoSel.servico_id)
  }, [planoSel, slotsComVagas])

  function toggleSlot(slotPickerIndex: number, slotId: string) {
    setSlotIds(prev => {
      const next = [...prev]
      next[slotPickerIndex] = slotId
      return next
    })
  }

  const allSlotsChosen = planoSel ? slotIds.filter(Boolean).length === planoSel.dias_semana : false
  const canSubmit = !!(pacienteId && planoId && allSlotsChosen)

  async function salvar() {
    if (!canSubmit) return
    setSaving(true)
    setErr('')
    const r = await novaMatriculaAction({
      paciente_id: pacienteId,
      plano_id: planoId,
      slot_ids: slotIds.filter(Boolean),
      data_matricula: dataMatricula,
      observacoes: observacoes || null,
    })
    setSaving(false)
    if ('error' in r) { setErr(r.error); return }
    onConfirmado()
  }

  const stepLabel: Record<Step, string> = { 1: 'Paciente', 2: 'Plano', 3: 'Horários' }

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
              <p className="font-bold text-[#2C3E50] text-sm">Nova Matrícula</p>
              <p className="text-[11px] text-[#7F8C8D]">Modelo por plano de serviço</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#7F8C8D] hover:text-[#2C3E50]"><X size={18} /></button>
        </div>

        {/* Steps indicator */}
        <div className="px-6 pt-4 pb-2 flex items-center gap-2 flex-shrink-0">
          {([1, 2, 3] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <ChevronRight size={12} className="text-[#E8E8E8]" />}
              <button
                onClick={() => { if (s < step || (s === 2 && pacienteId) || (s === 3 && planoId)) setStep(s) }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  step === s ? 'bg-[#4A3AE8] text-white' : s < step ? 'bg-[#27AE60]/15 text-[#27AE60]' : 'bg-[#F8F9FA] text-[#7F8C8D]'
                }`}
              >
                {s < step && <Check size={11} />}
                {s}. {stepLabel[s]}
              </button>
            </div>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

          {/* Step 1: Select paciente */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-2">
                  Buscar Paciente
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
                  <input
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    placeholder="Digite o nome do paciente…"
                    className="w-full h-10 pl-9 pr-4 border border-[#E8E8E8] rounded-xl text-sm outline-none focus:border-[#4A3AE8]"
                    autoFocus
                  />
                </div>
              </div>
              <div className="border border-[#E8E8E8] rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                {pacientesFiltrados.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setPacienteId(p.id); setBusca(''); setStep(2) }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-[#F8F9FA] border-b border-[#F0F0F0] last:border-0 flex items-center gap-3 transition-colors ${pacienteId === p.id ? 'bg-[#4A3AE8]/5' : ''}`}
                  >
                    <div className="w-7 h-7 rounded-full bg-[#4A3AE8]/10 flex items-center justify-center flex-shrink-0">
                      <Users size={13} className="text-[#4A3AE8]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#2C3E50]">{p.nome}</p>
                      {p.telefone && <p className="text-[11px] text-[#7F8C8D]">{p.telefone}</p>}
                    </div>
                    {pacienteId === p.id && <Check size={15} className="text-[#4A3AE8] ml-auto" />}
                  </button>
                ))}
                {pacientesFiltrados.length === 0 && (
                  <p className="px-4 py-4 text-sm text-[#7F8C8D] text-center">Nenhum paciente ativo encontrado</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Select plano */}
          {step === 2 && (
            <div className="space-y-3">
              {pacienteSel && (
                <div className="bg-[#F8F9FA] rounded-xl px-4 py-2.5 flex items-center gap-2 mb-2">
                  <Users size={14} className="text-[#4A3AE8]" />
                  <span className="text-sm font-medium text-[#2C3E50]">{pacienteSel.nome}</span>
                  <button onClick={() => setStep(1)} className="ml-auto text-xs text-[#4A3AE8] hover:underline">Trocar</button>
                </div>
              )}
              <label className="block text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-2">
                Selecionar Plano
              </label>
              {planosServico.length === 0 ? (
                <p className="text-sm text-[#7F8C8D] text-center py-8">Nenhum plano de serviço cadastrado.</p>
              ) : (
                planosServico.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setPlanoId(p.id); setSlotIds([]); setStep(3) }}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                      planoId === p.id ? 'border-[#4A3AE8] bg-[#4A3AE8]/5' : 'border-[#E8E8E8] hover:border-[#4A3AE8]/30'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-sm text-[#2C3E50]">{p.nome}</p>
                      <p className="text-xs text-[#7F8C8D] mt-0.5">
                        {p.servicos?.nome ?? 'Serviço'} · {p.dias_semana}x/semana
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="font-bold text-[#27AE60] text-sm">R$ {p.valor_mensal.toFixed(2)}</p>
                      <p className="text-[11px] text-[#7F8C8D]">/mês</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Step 3: Slot pickers */}
          {step === 3 && planoSel && (
            <div className="space-y-5">
              {pacienteSel && (
                <div className="bg-[#F8F9FA] rounded-xl px-4 py-2.5 flex items-center gap-3 text-sm">
                  <Users size={14} className="text-[#4A3AE8]" />
                  <span className="font-medium text-[#2C3E50]">{pacienteSel.nome}</span>
                  <span className="text-[#7F8C8D]">·</span>
                  <span className="text-[#7F8C8D]">{planoSel.nome}</span>
                </div>
              )}

              <p className="text-xs text-[#7F8C8D]">
                Selecione <strong className="text-[#2C3E50]">{planoSel.dias_semana} horário(s)</strong> para o serviço <strong className="text-[#2C3E50]">{planoSel.servicos?.nome}</strong>:
              </p>

              {Array.from({ length: planoSel.dias_semana }, (_, i) => {
                const chosenInOthers = slotIds.filter((_, idx) => idx !== i).filter(Boolean)
                const availableSlots = slotsDoPlano.filter(s => !chosenInOthers.includes(s.id))

                return (
                  <div key={i}>
                    <label className="block text-xs font-semibold text-[#7F8C8D] mb-2">
                      Horário {i + 1}
                      {slotIds[i] && (
                        <span className="ml-2 text-[#27AE60]">
                          ✓ {(() => {
                            const s = slotsComVagas.find(sl => sl.id === slotIds[i])
                            return s ? `${s.turmas?.nome} — ${DIAS[s.dia_semana]} ${s.hora_inicio}` : ''
                          })()}
                        </span>
                      )}
                    </label>
                    <div className="space-y-2 max-h-52 overflow-y-auto border border-[#E8E8E8] rounded-xl">
                      {availableSlots.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-[#7F8C8D]">Nenhum slot disponível para este serviço</p>
                      ) : (
                        availableSlots.map(s => {
                          const semVagas = s.vagas_livres === 0
                          const sel = slotIds[i] === s.id
                          return (
                            <button
                              key={s.id}
                              disabled={semVagas}
                              onClick={() => toggleSlot(i, s.id)}
                              className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-all border-b border-[#F0F0F0] last:border-0 ${
                                semVagas
                                  ? 'opacity-40 cursor-not-allowed bg-[#F8F9FA]'
                                  : sel
                                    ? 'bg-[#4A3AE8]/5'
                                    : 'hover:bg-[#F8F9FA]'
                              }`}
                            >
                              <div>
                                <p className="text-sm font-medium text-[#2C3E50]">
                                  {s.turmas?.nome} — {DIAS[s.dia_semana]} {s.hora_inicio}
                                </p>
                                <p className="text-[11px] text-[#7F8C8D]">
                                  {semVagas ? '(sem vagas)' : `${s.vagas_livres} vaga(s) livre(s)`}
                                </p>
                              </div>
                              {sel && <Check size={15} className="text-[#4A3AE8] flex-shrink-0" />}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Data matrícula */}
              <div>
                <label className="block text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-2">Data de Início</label>
                <input
                  type="date"
                  value={dataMatricula}
                  onChange={e => setDataMatricula(e.target.value)}
                  className="h-10 px-3 border border-[#E8E8E8] rounded-xl text-sm outline-none focus:border-[#4A3AE8] w-full"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-2">Observações (opcional)</label>
                <textarea
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  rows={2}
                  placeholder="Alguma observação sobre a matrícula…"
                  className="w-full px-3 py-2 border border-[#E8E8E8] rounded-xl text-sm outline-none focus:border-[#4A3AE8] resize-none"
                />
              </div>
            </div>
          )}

          {err && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E8E8E8] flex-shrink-0 flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(s => (s - 1) as Step)}
              className="h-11 px-5 rounded-xl border border-[#E8E8E8] text-[#7F8C8D] font-medium text-sm hover:border-[#4A3AE8]/30 hover:text-[#4A3AE8]"
            >
              Voltar
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep(s => (s + 1) as Step)}
              disabled={step === 1 ? !pacienteId : !planoId}
              className="flex-1 h-11 rounded-xl bg-[#4A3AE8] text-white font-semibold text-sm hover:bg-[#3D2ED6] disabled:opacity-50"
            >
              Próximo
            </button>
          ) : (
            <button
              onClick={salvar}
              disabled={saving || !canSubmit}
              className="flex-1 h-11 rounded-xl bg-[#4A3AE8] text-white font-semibold text-sm hover:bg-[#3D2ED6] disabled:opacity-50 shadow-sm"
            >
              {saving ? 'Matriculando…' : 'Confirmar Matrícula'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
