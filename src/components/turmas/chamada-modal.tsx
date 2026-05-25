'use client'

import { useState } from 'react'
import { X, CheckCircle2, XCircle, AlertCircle, Users } from 'lucide-react'
import { registrarChamadaAction } from '@/app/(dashboard)/turmas/actions'

interface Aluno {
  paciente_id: string
  nome: string
}

interface Props {
  sessaoId: string
  dataHora: string
  turmaNome: string
  slotLabel: string
  alunos: Aluno[]
  onClose: () => void
  onConfirmado: () => void
}

type StatusPresenca = 'presente' | 'falta' | 'falta_justificada'

const STATUS_CFG: Record<StatusPresenca, { label: string; icon: typeof CheckCircle2; cor: string; bg: string }> = {
  presente:          { label: 'Presente',         icon: CheckCircle2, cor: '#27AE60', bg: '#27AE6015' },
  falta:             { label: 'Falta',             icon: XCircle,      cor: '#E74C3C', bg: '#E74C3C15' },
  falta_justificada: { label: 'F. Justificada',   icon: AlertCircle,  cor: '#E67E22', bg: '#E67E2215' },
}

export function ChamadaModal({ sessaoId, dataHora, turmaNome, slotLabel, alunos, onClose, onConfirmado }: Props) {
  const [presencas, setPresencas] = useState<Record<string, StatusPresenca>>(
    Object.fromEntries(alunos.map(a => [a.paciente_id, 'presente']))
  )
  const [obsGeral, setObsGeral] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function toggleStatus(id: string) {
    setPresencas(prev => {
      const cur = prev[id]
      const next: StatusPresenca = cur === 'presente' ? 'falta' : cur === 'falta' ? 'falta_justificada' : 'presente'
      return { ...prev, [id]: next }
    })
  }

  const presentes = Object.values(presencas).filter(s => s === 'presente').length
  const faltas    = Object.values(presencas).filter(s => s === 'falta').length

  async function confirmar() {
    setSaving(true); setErr('')
    try {
      const r = await registrarChamadaAction({
        sessao_id: sessaoId,
        presencas: alunos.map(a => ({ paciente_id: a.paciente_id, status: presencas[a.paciente_id] ?? 'falta' })),
        observacoes_sessao: obsGeral || null,
      })
      if ('error' in r) { setErr(r.error); return }
      onConfirmado()
    } finally {
      setSaving(false)
    }
  }

  const dataFmt = new Date(dataHora).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
  const horaFmt = new Date(dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#4A3AE8]/10 flex items-center justify-center">
              <Users size={18} className="text-[#4A3AE8]" />
            </div>
            <div>
              <p className="font-bold text-[#2C3E50] text-sm">Chamada — {turmaNome}</p>
              <p className="text-[11px] text-[#7F8C8D] capitalize">{dataFmt} · {horaFmt} · {slotLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#7F8C8D] hover:text-[#2C3E50]"><X size={18} /></button>
        </div>

        {/* Resumo */}
        <div className="flex gap-3 px-6 py-3 bg-[#F8F9FA] flex-shrink-0">
          <div className="flex-1 text-center">
            <p className="text-xs text-[#7F8C8D]">Total</p>
            <p className="font-bold text-[#2C3E50]">{alunos.length}</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-xs text-[#27AE60]">Presentes</p>
            <p className="font-bold text-[#27AE60]">{presentes}</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-xs text-[#E74C3C]">Faltas</p>
            <p className="font-bold text-[#E74C3C]">{faltas}</p>
          </div>
        </div>

        {/* Lista de alunos */}
        <div className="overflow-y-auto flex-1 divide-y divide-[#F0F0F0]">
          {alunos.length === 0 ? (
            <div className="text-center py-12 text-[#7F8C8D] text-sm">
              <Users size={28} className="mx-auto mb-2 opacity-20" />
              Nenhum aluno matriculado neste slot
            </div>
          ) : alunos.map(a => {
            const st = presencas[a.paciente_id] ?? 'presente'
            const cfg = STATUS_CFG[st]
            const Icon = cfg.icon
            return (
              <div key={a.paciente_id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-[#2C3E50]">{a.nome}</p>
                </div>
                <button
                  onClick={() => toggleStatus(a.paciente_id)}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition-all border"
                  style={{ color: cfg.cor, background: cfg.bg, borderColor: cfg.cor + '30' }}
                >
                  <Icon size={13} />
                  {cfg.label}
                </button>
              </div>
            )
          })}
        </div>

        {/* Observação geral */}
        <div className="px-6 py-3 border-t border-[#E8E8E8] flex-shrink-0">
          <textarea
            value={obsGeral}
            onChange={e => setObsGeral(e.target.value)}
            placeholder="Observação geral da aula (opcional)"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-[#E8E8E8] rounded-xl outline-none focus:border-[#4A3AE8] resize-none"
          />
        </div>

        {err && <p className="px-6 pb-2 text-xs text-red-500">{err}</p>}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E8E8E8] flex-shrink-0">
          <button
            onClick={confirmar}
            disabled={saving || alunos.length === 0}
            className="w-full h-11 rounded-xl bg-[#4A3AE8] text-white font-semibold text-sm hover:bg-[#3D2ED6] disabled:opacity-50 shadow-sm"
          >
            {saving ? 'Salvando…' : `Confirmar Chamada (${presentes} presentes)`}
          </button>
        </div>
      </div>
    </div>
  )
}
