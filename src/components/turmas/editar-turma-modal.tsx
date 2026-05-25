'use client'

import { useState } from 'react'
import { X, BookOpen } from 'lucide-react'
import { editarTurmaAction } from '@/app/(dashboard)/turmas/actions'
import type { Turma } from '@/app/(dashboard)/turmas/actions'

interface Profissional { id: string; nome: string }
interface Sala { id: string; nome: string }
interface Servico { id: string; nome: string }

interface Props {
  turma: Turma
  profissionais: Profissional[]
  salas: Sala[]
  servicos: Servico[]
  onClose: () => void
  onSalvo: () => void
}

export function EditarTurmaModal({ turma, profissionais, salas, servicos, onClose, onSalvo }: Props) {
  const [nome, setNome]           = useState(turma.nome)
  const [descricao, setDescricao] = useState(turma.descricao ?? '')
  const [profId, setProfId]       = useState(turma.profissional_id ?? '')
  const [salaId, setSalaId]       = useState(turma.sala_id ?? '')
  const [servicoId, setServicoId] = useState(turma.servico_id ?? '')
  const [nivel, setNivel]         = useState(turma.nivel)
  const [capacidade, setCapacidade] = useState(String(turma.capacidade_slot))
  const [dataInicio, setDataInicio] = useState(turma.data_inicio)
  const [dataFim, setDataFim]     = useState(turma.data_fim ?? '')
  const [observacoes, setObs]     = useState(turma.observacoes ?? '')
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState('')

  async function salvar() {
    if (!nome.trim()) { setErr('Informe o nome da turma.'); return }
    if (!dataInicio) { setErr('Informe a data de início.'); return }
    setSaving(true); setErr('')
    try {
      const r = await editarTurmaAction({
        id: turma.id,
        nome, descricao: descricao || null,
        profissional_id: profId || null,
        sala_id: salaId || null,
        servico_id: servicoId || null,
        nivel, capacidade_slot: Number(capacidade),
        data_inicio: dataInicio, data_fim: dataFim || null,
        observacoes: observacoes || null,
        ativo: turma.ativo,
      })
      if ('error' in r) { setErr(r.error); return }
      onSalvo()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[92vh] overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#4A3AE8]/10 flex items-center justify-center">
              <BookOpen size={18} className="text-[#4A3AE8]" />
            </div>
            <div>
              <p className="font-bold text-[#2C3E50] text-sm">Editar Turma</p>
              <p className="text-[11px] text-[#7F8C8D]">{turma.nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#7F8C8D] hover:text-[#2C3E50]"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          <div>
            <label className="label-xs">Nome da Turma *</label>
            <input value={nome} onChange={e => setNome(e.target.value)} className="input-base w-full" />
          </div>
          <div>
            <label className="label-xs">Descrição</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2}
              className="input-base w-full resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-xs">Profissional Responsável</label>
              <select value={profId} onChange={e => setProfId(e.target.value)} className="input-base w-full">
                <option value="">Selecionar…</option>
                {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label-xs">Sala Padrão</label>
              <select value={salaId} onChange={e => setSalaId(e.target.value)} className="input-base w-full">
                <option value="">Selecionar…</option>
                {salas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-xs">Nível</label>
              <select value={nivel} onChange={e => setNivel(e.target.value)} className="input-base w-full">
                <option value="livre">Livre</option>
                <option value="iniciante">Iniciante</option>
                <option value="intermediario">Intermediário</option>
                <option value="avancado">Avançado</option>
              </select>
            </div>
            <div>
              <label className="label-xs">Capacidade por Slot</label>
              <input type="number" min={1} value={capacidade} onChange={e => setCapacidade(e.target.value)} className="input-base w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-xs">Data de Início *</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="input-base w-full" />
            </div>
            <div>
              <label className="label-xs">Data de Encerramento</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="input-base w-full" />
            </div>
          </div>
          <div>
            <label className="label-xs">Observações</label>
            <textarea value={observacoes} onChange={e => setObs(e.target.value)} rows={2}
              className="input-base w-full resize-none" />
          </div>

          {err && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
        </div>

        <div className="px-6 py-4 border-t border-[#E8E8E8] flex-shrink-0">
          <button onClick={salvar} disabled={saving}
            className="w-full h-11 rounded-xl bg-[#4A3AE8] text-white font-semibold text-sm hover:bg-[#3D2ED6] disabled:opacity-50 shadow-sm">
            {saving ? 'Salvando…' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}
