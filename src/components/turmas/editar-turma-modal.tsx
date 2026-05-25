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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-[#7F8C8D] uppercase tracking-widest">{title}</p>
      {children}
    </div>
  )
}

const NIVEL_OPTS = [
  { value: 'livre',         label: 'Livre',         cor: '#4A3AE8' },
  { value: 'iniciante',     label: 'Iniciante',     cor: '#27AE60' },
  { value: 'intermediario', label: 'Intermediário', cor: '#E67E22' },
  { value: 'avancado',      label: 'Avançado',      cor: '#E74C3C' },
]

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
    if (!dataInicio)  { setErr('Informe a data de início.'); return }
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F0F0F0] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4A3AE8] to-[#7B6FF0] flex items-center justify-center shadow-sm">
              <BookOpen size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-[#2C3E50] text-sm leading-tight">Editar Turma</p>
              <p className="text-[11px] text-[#7F8C8D] mt-0.5 truncate max-w-[260px]">{turma.nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7F8C8D] hover:bg-[#F8F9FA] hover:text-[#2C3E50] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          <Section title="Identificação">
            <div>
              <label className="label-xs">Nome da Turma *</label>
              <input value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Ex: Pilates Iniciante T1"
                className="input-base w-full" />
            </div>
            <div>
              <label className="label-xs">Descrição</label>
              <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
                rows={2} placeholder="Descrição opcional…"
                className="input-base w-full resize-none" />
            </div>
          </Section>

          <div className="border-t border-[#F0F0F0]" />

          <Section title="Responsáveis e Local">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-xs">Profissional</label>
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
          </Section>

          <div className="border-t border-[#F0F0F0]" />

          <Section title="Configurações">
            <div>
              <label className="label-xs">Nível</label>
              <div className="grid grid-cols-4 gap-2">
                {NIVEL_OPTS.map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setNivel(opt.value)}
                    className={`h-9 rounded-xl text-xs font-semibold border-2 transition-all ${
                      nivel === opt.value
                        ? 'text-white border-transparent shadow-sm'
                        : 'border-[#E8E8E8] text-[#7F8C8D] hover:border-current bg-white'
                    }`}
                    style={nivel === opt.value ? { background: opt.cor, borderColor: opt.cor } : { color: opt.cor }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-40">
              <label className="label-xs">Capacidade por Slot</label>
              <div className="relative">
                <input type="number" min={1} value={capacidade} onChange={e => setCapacidade(e.target.value)}
                  className="input-base w-full pr-12" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7F8C8D] pointer-events-none">alunos</span>
              </div>
            </div>
          </Section>

          <div className="border-t border-[#F0F0F0]" />

          <Section title="Período">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-xs">Data de Início *</label>
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="input-base w-full" />
              </div>
              <div>
                <label className="label-xs">Data de Encerramento</label>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="input-base w-full" />
                {!dataFim && <p className="text-[10px] text-[#7F8C8D] mt-1">Opcional — turma sem prazo definido</p>}
              </div>
            </div>
          </Section>

          <div className="border-t border-[#F0F0F0]" />

          <Section title="Observações">
            <textarea value={observacoes} onChange={e => setObs(e.target.value)}
              rows={2} placeholder="Notas internas sobre a turma…"
              className="input-base w-full resize-none" />
          </Section>

          {err && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <span className="text-red-400 mt-0.5 flex-shrink-0">⚠</span>
              <p className="text-xs text-red-600">{err}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F0F0F0] flex gap-3 flex-shrink-0 bg-[#FAFAFA] rounded-b-2xl">
          <button onClick={onClose}
            className="h-11 px-5 rounded-xl border-2 border-[#E8E8E8] text-sm font-semibold text-[#7F8C8D] hover:border-[#D0D0D0] hover:text-[#2C3E50] transition-colors">
            Cancelar
          </button>
          <button onClick={salvar} disabled={saving}
            className="flex-1 h-11 rounded-xl bg-[#4A3AE8] text-white font-semibold text-sm hover:bg-[#3D2ED6] disabled:opacity-50 shadow-sm transition-colors">
            {saving ? 'Salvando…' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}
