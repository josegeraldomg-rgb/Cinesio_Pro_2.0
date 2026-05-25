'use client'

import { useState } from 'react'
import { X, ListOrdered, Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react'
import type { SequenciaBiblioteca, ExercicioSequenciaItem, ExercicioBiblioteca } from '@/app/(dashboard)/biblioteca-exercicios/actions'
import { salvarSequenciaBibliotecaAction } from '@/app/(dashboard)/biblioteca-exercicios/actions'

interface Props {
  sequencia?: SequenciaBiblioteca
  exercicios: ExercicioBiblioteca[]
  onClose: () => void
  onSalvo: () => void
}

export function SequenciaFormModal({ sequencia, exercicios, onClose, onSalvo }: Props) {
  const [nome, setNome] = useState(sequencia?.nome ?? '')
  const [descricao, setDescricao] = useState(sequencia?.descricao ?? '')
  const [itens, setItens] = useState<ExercicioSequenciaItem[]>(
    sequencia?.exercicios ?? []
  )
  const [exercicioSelecionado, setExercicioSelecionado] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function adicionarExercicio() {
    const ex = exercicios.find(e => e.id === exercicioSelecionado)
    if (!ex) return
    setItens(prev => [...prev, {
      exercicio_id: ex.id,
      nome_exercicio: ex.nome,
      series: ex.series_padrao ?? null,
      repeticoes: ex.repeticoes_padrao ?? null,
      carga: null,
      obs: null,
    }])
    setExercicioSelecionado('')
  }

  function removerItem(idx: number) {
    setItens(prev => prev.filter((_, i) => i !== idx))
  }

  function moverItem(idx: number, dir: -1 | 1) {
    const novo = [...itens]
    const troca = idx + dir
    if (troca < 0 || troca >= novo.length) return
    ;[novo[idx], novo[troca]] = [novo[troca], novo[idx]]
    setItens(novo)
  }

  function updateItem(idx: number, campo: keyof ExercicioSequenciaItem, valor: string) {
    setItens(prev => prev.map((it, i) =>
      i === idx ? { ...it, [campo]: campo === 'series' ? (valor ? Number(valor) : null) : (valor || null) } : it
    ))
  }

  async function salvar() {
    if (!nome.trim()) { setErr('Informe o nome da sequência.'); return }
    setSaving(true); setErr('')
    try {
      const r = await salvarSequenciaBibliotecaAction({
        id: sequencia?.id,
        nome,
        descricao: descricao || null,
        exercicios: itens,
      })
      if ('error' in r) { setErr(r.error); return }
      onSalvo()
    } finally { setSaving(false) }
  }

  // Exercícios já adicionados (para desabilitar no selector)
  const adicionados = new Set(itens.map(i => i.exercicio_id))

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">

        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F0F0F0] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#4A3AE8] flex items-center justify-center">
              <ListOrdered size={16} className="text-white" />
            </div>
            <p className="font-bold text-[#2C3E50] text-sm">{sequencia ? 'Editar Sequência' : 'Nova Sequência'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7F8C8D] hover:bg-[#F8F9FA] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="label-xs">Nome da Sequência *</label>
              <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Pilates Solo Iniciante" className="input-base w-full" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label-xs">Descrição</label>
              <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Objetivo da sequência…" className="input-base w-full" />
            </div>
          </div>

          {/* Adicionar exercício */}
          <div>
            <label className="label-xs">Adicionar Exercício</label>
            <div className="flex gap-2">
              <select
                value={exercicioSelecionado}
                onChange={e => setExercicioSelecionado(e.target.value)}
                className="input-base flex-1"
              >
                <option value="">Selecionar exercício…</option>
                {exercicios
                  .filter(e => !adicionados.has(e.id))
                  .map(e => (
                    <option key={e.id} value={e.id}>{e.nome}{e.grupo_muscular ? ` — ${e.grupo_muscular}` : ''}</option>
                  ))}
              </select>
              <button
                onClick={adicionarExercicio}
                disabled={!exercicioSelecionado}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#4A3AE8] text-white rounded-lg text-sm font-medium hover:bg-[#3829c7] disabled:opacity-50 transition-colors"
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>
          </div>

          {/* Lista de itens */}
          {itens.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#7F8C8D] uppercase tracking-wide">{itens.length} exercício{itens.length !== 1 ? 's' : ''} na sequência</p>
              {itens.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-[#F8F9FA] border border-[#E8E8E8] rounded-xl p-3">
                  {/* Número + drag handle */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <span className="w-5 h-5 rounded-full bg-[#4A3AE8]/10 text-[#4A3AE8] text-[10px] font-bold flex items-center justify-center">{idx + 1}</span>
                    <button onClick={() => moverItem(idx, -1)} disabled={idx === 0} className="text-[#BDC3C7] hover:text-[#7F8C8D] disabled:opacity-30 transition-colors">
                      <ChevronUp size={13} />
                    </button>
                    <button onClick={() => moverItem(idx, 1)} disabled={idx === itens.length - 1} className="text-[#BDC3C7] hover:text-[#7F8C8D] disabled:opacity-30 transition-colors">
                      <ChevronDown size={13} />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#2C3E50] mb-2">{item.nome_exercicio}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-[#7F8C8D] font-medium">Séries</label>
                        <input
                          type="number" min={1}
                          value={item.series ?? ''}
                          onChange={e => updateItem(idx, 'series', e.target.value)}
                          placeholder="—"
                          className="w-full border border-[#E8E8E8] rounded-lg px-2 py-1 text-xs text-[#2C3E50] focus:outline-none focus:ring-1 focus:ring-[#4A3AE8]/40 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#7F8C8D] font-medium">Repetições</label>
                        <input
                          value={item.repeticoes ?? ''}
                          onChange={e => updateItem(idx, 'repeticoes', e.target.value)}
                          placeholder="12 ou 30s"
                          className="w-full border border-[#E8E8E8] rounded-lg px-2 py-1 text-xs text-[#2C3E50] focus:outline-none focus:ring-1 focus:ring-[#4A3AE8]/40 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#7F8C8D] font-medium">Carga</label>
                        <input
                          value={item.carga ?? ''}
                          onChange={e => updateItem(idx, 'carga', e.target.value)}
                          placeholder="Ex: 5kg"
                          className="w-full border border-[#E8E8E8] rounded-lg px-2 py-1 text-xs text-[#2C3E50] focus:outline-none focus:ring-1 focus:ring-[#4A3AE8]/40 bg-white"
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="text-[10px] text-[#7F8C8D] font-medium">Observação</label>
                      <input
                        value={item.obs ?? ''}
                        onChange={e => updateItem(idx, 'obs', e.target.value)}
                        placeholder="Instrução específica…"
                        className="w-full border border-[#E8E8E8] rounded-lg px-2 py-1 text-xs text-[#2C3E50] focus:outline-none focus:ring-1 focus:ring-[#4A3AE8]/40 bg-white"
                      />
                    </div>
                  </div>

                  <button onClick={() => removerItem(idx)} className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0 mt-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {itens.length === 0 && (
            <div className="text-center py-8 text-[#7F8C8D]">
              <GripVertical size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum exercício na sequência.</p>
              <p className="text-xs mt-1">Use o seletor acima para adicionar.</p>
            </div>
          )}

          {err && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <span className="text-red-400">⚠</span>
              <p className="text-xs text-red-600">{err}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#F0F0F0] flex gap-3 flex-shrink-0 bg-[#FAFAFA] rounded-b-2xl">
          <button onClick={onClose} className="h-11 px-5 rounded-xl border-2 border-[#E8E8E8] text-sm font-semibold text-[#7F8C8D] hover:border-[#D0D0D0] transition-colors">
            Cancelar
          </button>
          <button onClick={salvar} disabled={saving} className="flex-1 h-11 rounded-xl bg-[#4A3AE8] text-white font-semibold text-sm hover:bg-[#3D2ED6] disabled:opacity-50 shadow-sm transition-colors">
            {saving ? 'Salvando…' : sequencia ? 'Salvar Alterações' : 'Criar Sequência'}
          </button>
        </div>
      </div>
    </div>
  )
}
