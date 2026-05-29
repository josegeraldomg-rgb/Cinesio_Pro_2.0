'use client'

import { useState, useTransition } from 'react'
import { X, Check, AlertCircle, Calendar } from 'lucide-react'
import { criarRealocacaoAction } from '@/app/(dashboard)/turmas/actions'
import type { NovaMatricula, SlotComVagas } from '@/app/(dashboard)/turmas/actions'

interface SessaoFutura {
  id: string
  data_hora: string
  slot_id: string
}

interface Props {
  matricula: NovaMatricula
  slotsDisponiveis: SlotComVagas[]
  sessoesFuturas: SessaoFutura[]
  onClose: () => void
  onSalvar: () => void
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function fmtDataHora(s: string) {
  const d = new Date(s)
  return `${DIAS[d.getDay()]} ${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

export function RealocacaoModal({ matricula, slotsDisponiveis, sessoesFuturas, onClose, onSalvar }: Props) {
  const [sessaoOrigemId, setSessaoOrigemId] = useState<string | null>(null)
  const [slotDestinoId, setSlotDestinoId] = useState<string | null>(null)
  const [observacoes, setObservacoes] = useState('')
  const [err, setErr] = useState('')
  const [, startT] = useTransition()

  // Slots ativos do aluno
  const slotIdsAluno = (matricula.slots ?? []).filter(s => s.ativo).map(s => s.slot_id)

  // Sessões futuras que pertencem aos slots do aluno
  const sessoesDoAluno = sessoesFuturas.filter(s => slotIdsAluno.includes(s.slot_id))

  // Slots de destino: mesmo serviço, com vagas, não já usados pelo aluno
  const servicoId = (matricula.planos_servico as any)?.servico_id ??
    (matricula.slots?.[0]?.turma_slots?.turmas?.servico_id)

  const slotsDestino = slotsDisponiveis.filter(s => {
    if (slotIdsAluno.includes(s.id)) return false // já matriculado neste slot
    if (s.vagas_livres === 0) return false
    if (servicoId && s.turmas?.servico_id !== servicoId) return false
    return true
  })

  function confirmar() {
    if (!slotDestinoId) { setErr('Selecione o slot de destino.'); return }
    setErr('')
    startT(async () => {
      const r = await criarRealocacaoAction({
        matricula_id: matricula.id,
        paciente_id: matricula.paciente_id,
        sessao_origem_id: sessaoOrigemId ?? undefined,
        slot_destino_id: slotDestinoId,
        observacoes: observacoes || null,
      })
      if ('error' in r) { setErr(r.error); return }
      onSalvar()
    })
  }

  function slotLabel(s: SlotComVagas) {
    return `${s.turmas?.nome ?? 'Turma'} — ${DIAS[s.dia_semana]} ${s.hora_inicio}`
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8] flex-shrink-0">
          <div>
            <p className="font-bold text-[#2C3E50] text-sm">Realocação de Aula</p>
            <p className="text-[11px] text-[#7F8C8D]">{matricula.pacientes?.nome}</p>
          </div>
          <button onClick={onClose} className="text-[#7F8C8D] hover:text-[#2C3E50]"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Step 1: Sessão a pular (opcional) */}
          <div>
            <label className="block text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-2">
              1. Sessão a ser pulada (opcional)
            </label>
            <p className="text-xs text-[#7F8C8D] mb-3">
              Selecione qual sessão futura o aluno não poderá comparecer:
            </p>
            {sessoesDoAluno.length === 0 ? (
              <p className="text-sm text-[#7F8C8D] bg-[#F8F9FA] rounded-xl px-4 py-3">
                Nenhuma sessão futura encontrada para os slots deste aluno.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto border border-[#E8E8E8] rounded-xl">
                <button
                  onClick={() => setSessaoOrigemId(null)}
                  className={`w-full text-left px-4 py-2.5 text-sm border-b border-[#F0F0F0] transition-colors ${
                    sessaoOrigemId === null ? 'bg-[#4A3AE8]/5 text-[#4A3AE8] font-medium' : 'hover:bg-[#F8F9FA] text-[#7F8C8D]'
                  }`}
                >
                  Não especificar sessão
                </button>
                {sessoesDoAluno.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSessaoOrigemId(s.id)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors border-b border-[#F0F0F0] last:border-0 ${
                      sessaoOrigemId === s.id ? 'bg-[#4A3AE8]/5' : 'hover:bg-[#F8F9FA]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar size={13} className="text-[#7F8C8D] flex-shrink-0" />
                      <span className="font-medium text-[#2C3E50]">{fmtDataHora(s.data_hora)}</span>
                    </div>
                    {sessaoOrigemId === s.id && <Check size={14} className="text-[#4A3AE8] flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Slot de destino */}
          <div>
            <label className="block text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-2">
              2. Slot de destino *
            </label>
            {slotsDestino.length === 0 ? (
              <p className="text-sm text-[#7F8C8D] bg-[#F8F9FA] rounded-xl px-4 py-3">
                Nenhum slot disponível com vagas para o mesmo serviço.
              </p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto border border-[#E8E8E8] rounded-xl">
                {slotsDestino.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSlotDestinoId(s.id)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors border-b border-[#F0F0F0] last:border-0 ${
                      slotDestinoId === s.id ? 'bg-[#27AE60]/5' : 'hover:bg-[#F8F9FA]'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-[#2C3E50]">{slotLabel(s)}</p>
                      <p className="text-[11px] text-[#7F8C8D]">{s.vagas_livres} vaga(s) disponível(is)</p>
                    </div>
                    {slotDestinoId === s.id && <Check size={14} className="text-[#27AE60] flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-2">
              Observações (opcional)
            </label>
            <textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              rows={2}
              placeholder="Motivo da realocação, informações adicionais…"
              className="w-full px-3 py-2 border border-[#E8E8E8] rounded-xl text-sm outline-none focus:border-[#4A3AE8] resize-none"
            />
          </div>

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
            disabled={!slotDestinoId}
            className="flex-1 h-11 rounded-xl bg-[#4A3AE8] text-white font-semibold text-sm hover:bg-[#3D2ED6] disabled:opacity-50 shadow-sm"
          >
            Registrar Realocação
          </button>
        </div>
      </div>
    </div>
  )
}
