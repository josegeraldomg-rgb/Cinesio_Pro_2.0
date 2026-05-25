'use client'

import { useState, useTransition } from 'react'
import { X, Plus, Trash2, ChevronUp, ChevronDown, Pencil, Dumbbell, List } from 'lucide-react'
import type { Sequencia, Exercicio, ExercicioSequencia } from '@/app/(dashboard)/turmas/[id]/presenca/actions'
import {
  listarExerciciosAction, salvarExercicioAction, excluirExercicioAction,
  salvarSequenciaAction, excluirSequenciaAction,
} from '@/app/(dashboard)/turmas/[id]/presenca/actions'

type Aba = 'sequencias' | 'exercicios'

interface Props {
  sequenciasIniciais: Sequencia[]
  onClose: () => void
  onUpdate: (seqs: Sequencia[]) => void
}

export function SequenciasModal({ sequenciasIniciais, onClose, onUpdate }: Props) {
  const [aba, setAba] = useState<Aba>('sequencias')
  const [sequencias, setSequencias] = useState<Sequencia[]>(sequenciasIniciais)
  const [exercicios, setExercicios] = useState<Exercicio[]>([])
  const [exerciciosCarregados, setExerciciosCarregados] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [erro, setErro] = useState('')

  // ── Editor de sequência ──
  const [editandoSeq, setEditandoSeq] = useState<Partial<Sequencia> | null>(null)

  // ── Editor de exercício ──
  const [editandoEx, setEditandoEx] = useState<Partial<Exercicio> | null>(null)

  async function carregarExercicios() {
    if (exerciciosCarregados) return
    const res = await listarExerciciosAction()
    if ('exercicios' in res) {
      setExercicios(res.exercicios)
      setExerciciosCarregados(true)
    }
  }

  function abrirAba(a: Aba) {
    setAba(a)
    if (a === 'exercicios') carregarExercicios()
  }

  // ── Sequências ──

  function novaSequencia() {
    setEditandoSeq({ nome: '', descricao: '', exercicios: [] })
  }

  function editarSequencia(s: Sequencia) {
    setEditandoSeq({ ...s, exercicios: [...s.exercicios] })
  }

  async function salvarSequencia() {
    if (!editandoSeq?.nome?.trim()) { setErro('Nome obrigatório.'); return }
    setErro('')
    startTransition(async () => {
      const res = await salvarSequenciaAction({
        id: editandoSeq.id,
        nome: editandoSeq.nome!,
        descricao: editandoSeq.descricao ?? null,
        exercicios: editandoSeq.exercicios ?? [],
      })
      if ('error' in res) { setErro(res.error); return }
      // Atualiza lista local
      const seqAtualizada: Sequencia = {
        id: res.id,
        nome: editandoSeq.nome!,
        descricao: editandoSeq.descricao ?? null,
        exercicios: editandoSeq.exercicios ?? [],
        criado_em: editandoSeq.criado_em ?? new Date().toISOString(),
      }
      const novaLista = editandoSeq.id
        ? sequencias.map(s => s.id === editandoSeq.id ? seqAtualizada : s)
        : [...sequencias, seqAtualizada]
      setSequencias(novaLista)
      onUpdate(novaLista)
      setEditandoSeq(null)
    })
  }

  async function excluirSequencia(id: string) {
    if (!confirm('Excluir esta sequência?')) return
    startTransition(async () => {
      const res = await excluirSequenciaAction(id)
      if ('error' in res) { setErro(res.error); return }
      const novaLista = sequencias.filter(s => s.id !== id)
      setSequencias(novaLista)
      onUpdate(novaLista)
    })
  }

  // Exercícios dentro da sequência em edição
  function addExercicioNaSeq(ex: Exercicio) {
    setEditandoSeq(prev => ({
      ...prev,
      exercicios: [
        ...(prev?.exercicios ?? []),
        { exercicio_id: ex.id, nome_exercicio: ex.nome, series: null, repeticoes: null, carga: null, obs: null },
      ],
    }))
  }

  function updateExSeq(idx: number, campo: Partial<ExercicioSequencia>) {
    setEditandoSeq(prev => {
      const arr = [...(prev?.exercicios ?? [])]
      arr[idx] = { ...arr[idx], ...campo }
      return { ...prev, exercicios: arr }
    })
  }

  function moverEx(idx: number, dir: -1 | 1) {
    setEditandoSeq(prev => {
      const arr = [...(prev?.exercicios ?? [])]
      const tgt = idx + dir
      if (tgt < 0 || tgt >= arr.length) return prev
      ;[arr[idx], arr[tgt]] = [arr[tgt], arr[idx]]
      return { ...prev, exercicios: arr }
    })
  }

  function removeExSeq(idx: number) {
    setEditandoSeq(prev => {
      const arr = [...(prev?.exercicios ?? [])]
      arr.splice(idx, 1)
      return { ...prev, exercicios: arr }
    })
  }

  // ── Exercícios da biblioteca ──

  async function salvarExercicio() {
    if (!editandoEx?.nome?.trim()) { setErro('Nome obrigatório.'); return }
    setErro('')
    startTransition(async () => {
      const res = await salvarExercicioAction({
        id: editandoEx.id,
        nome: editandoEx.nome!,
        descricao: editandoEx.descricao ?? null,
        grupo_muscular: editandoEx.grupo_muscular ?? null,
        nivel: editandoEx.nivel ?? null,
        instrucoes: editandoEx.instrucoes ?? null,
      })
      if ('error' in res) { setErro(res.error); return }
      const novo: Exercicio = { id: res.id, nome: editandoEx.nome!, descricao: editandoEx.descricao ?? null, grupo_muscular: editandoEx.grupo_muscular ?? null, nivel: editandoEx.nivel ?? null, instrucoes: editandoEx.instrucoes ?? null }
      setExercicios(prev => editandoEx.id ? prev.map(e => e.id === editandoEx.id ? novo : e) : [...prev, novo])
      setEditandoEx(null)
    })
  }

  async function excluirExercicio(id: string) {
    if (!confirm('Excluir este exercício?')) return
    startTransition(async () => {
      const res = await excluirExercicioAction(id)
      if ('error' in res) { setErro(res.error); return }
      setExercicios(prev => prev.filter(e => e.id !== id))
    })
  }

  const NIVEIS = [
    { val: 'leve', label: 'Leve' },
    { val: 'moderado', label: 'Moderado' },
    { val: 'intenso', label: 'Intenso' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#F0F0F0]">
          <h2 className="font-bold text-[#2C3E50] text-base">Sequências e Exercícios</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#F0F0F0] transition-colors">
            <X size={18} className="text-[#7F8C8D]" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-[#F0F0F0] px-5">
          {([
            { id: 'sequencias' as Aba, label: 'Sequências', icon: <List size={14} /> },
            { id: 'exercicios' as Aba, label: 'Exercícios', icon: <Dumbbell size={14} /> },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => abrirAba(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                aba === t.id ? 'border-[#4A3AE8] text-[#4A3AE8]' : 'border-transparent text-[#7F8C8D] hover:text-[#2C3E50]'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Erro global */}
        {erro && (
          <div className="mx-5 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {erro}
          </div>
        )}

        {/* Conteúdo */}
        <div className="flex-1 overflow-auto p-5">

          {/* ── Aba Sequências ── */}
          {aba === 'sequencias' && !editandoSeq && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={novaSequencia}
                  className="flex items-center gap-2 bg-[#4A3AE8] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#3829c7] transition-colors"
                >
                  <Plus size={14} /> Nova Sequência
                </button>
              </div>
              {sequencias.length === 0 && (
                <p className="text-sm text-[#7F8C8D] text-center py-8">Nenhuma sequência cadastrada.</p>
              )}
              {sequencias.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-[#F8F9FA] rounded-xl border border-[#E8E8E8]">
                  <div className="flex-1">
                    <p className="font-medium text-[#2C3E50] text-sm">{s.nome}</p>
                    <p className="text-xs text-[#7F8C8D]">{s.exercicios.length} exercício{s.exercicios.length !== 1 ? 's' : ''}</p>
                  </div>
                  <button onClick={() => editarSequencia(s)} className="p-1.5 rounded-lg hover:bg-[#E8E8E8] transition-colors">
                    <Pencil size={14} className="text-[#7F8C8D]" />
                  </button>
                  <button onClick={() => excluirSequencia(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Editor de sequência ── */}
          {aba === 'sequencias' && editandoSeq && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setEditandoSeq(null)} className="text-sm text-[#7F8C8D] hover:text-[#2C3E50]">
                  ← Voltar
                </button>
                <h3 className="font-semibold text-[#2C3E50] text-sm">
                  {editandoSeq.id ? 'Editar Sequência' : 'Nova Sequência'}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#7F8C8D] mb-1 block">Nome *</label>
                  <input
                    className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A3AE8]/30"
                    value={editandoSeq.nome ?? ''}
                    onChange={e => setEditandoSeq(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Ex: Pilates Iniciantes"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#7F8C8D] mb-1 block">Descrição</label>
                  <input
                    className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A3AE8]/30"
                    value={editandoSeq.descricao ?? ''}
                    onChange={e => setEditandoSeq(p => ({ ...p, descricao: e.target.value }))}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              {/* Lista de exercícios da sequência */}
              <div>
                <p className="text-xs font-medium text-[#7F8C8D] uppercase tracking-wide mb-2">Exercícios na Sequência</p>
                {(editandoSeq.exercicios ?? []).length === 0 && (
                  <p className="text-sm text-[#7F8C8D] py-4 text-center">Adicione exercícios da biblioteca abaixo.</p>
                )}
                <div className="space-y-2">
                  {(editandoSeq.exercicios ?? []).map((ex, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-[#F8F9FA] rounded-lg border border-[#E8E8E8]">
                      <div className="flex flex-col gap-0.5 pt-1">
                        <button onClick={() => moverEx(idx, -1)} disabled={idx === 0} className="p-0.5 hover:bg-[#E8E8E8] rounded disabled:opacity-30">
                          <ChevronUp size={12} className="text-[#7F8C8D]" />
                        </button>
                        <button onClick={() => moverEx(idx, 1)} disabled={idx === (editandoSeq.exercicios ?? []).length - 1} className="p-0.5 hover:bg-[#E8E8E8] rounded disabled:opacity-30">
                          <ChevronDown size={12} className="text-[#7F8C8D]" />
                        </button>
                      </div>
                      <div className="flex-1 grid grid-cols-4 gap-2">
                        <div className="col-span-2">
                          <p className="text-xs font-medium text-[#2C3E50]">{ex.nome_exercicio}</p>
                        </div>
                        <input
                          type="number"
                          min={1}
                          value={ex.series ?? ''}
                          onChange={e => updateExSeq(idx, { series: e.target.value ? Number(e.target.value) : null })}
                          placeholder="Séries"
                          className="border border-[#E8E8E8] rounded px-2 py-1 text-xs focus:outline-none"
                        />
                        <input
                          value={ex.repeticoes ?? ''}
                          onChange={e => updateExSeq(idx, { repeticoes: e.target.value || null })}
                          placeholder="Rep / Tempo"
                          className="border border-[#E8E8E8] rounded px-2 py-1 text-xs focus:outline-none"
                        />
                        <input
                          value={ex.carga ?? ''}
                          onChange={e => updateExSeq(idx, { carga: e.target.value || null })}
                          placeholder="Carga"
                          className="col-span-2 border border-[#E8E8E8] rounded px-2 py-1 text-xs focus:outline-none"
                        />
                        <input
                          value={ex.obs ?? ''}
                          onChange={e => updateExSeq(idx, { obs: e.target.value || null })}
                          placeholder="Obs"
                          className="col-span-2 border border-[#E8E8E8] rounded px-2 py-1 text-xs focus:outline-none"
                        />
                      </div>
                      <button onClick={() => removeExSeq(idx)} className="p-1 hover:bg-red-50 rounded transition-colors">
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adicionar da biblioteca */}
              <div>
                <p className="text-xs font-medium text-[#7F8C8D] uppercase tracking-wide mb-2">Adicionar da Biblioteca</p>
                <div
                  className="space-y-1 max-h-40 overflow-auto"
                  onMouseEnter={carregarExercicios}
                >
                  {!exerciciosCarregados && <p className="text-xs text-[#7F8C8D]">Passe o mouse para carregar...</p>}
                  {exerciciosCarregados && exercicios.length === 0 && (
                    <p className="text-xs text-[#7F8C8D]">Nenhum exercício na biblioteca. Crie na aba "Exercícios".</p>
                  )}
                  {exercicios.map(ex => {
                    const jaAdicionado = (editandoSeq.exercicios ?? []).some(e => e.exercicio_id === ex.id)
                    return (
                      <button
                        key={ex.id}
                        onClick={() => !jaAdicionado && addExercicioNaSeq(ex)}
                        disabled={jaAdicionado}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors text-left ${
                          jaAdicionado
                            ? 'opacity-40 cursor-not-allowed bg-[#F8F9FA]'
                            : 'hover:bg-[#4A3AE8]/5 cursor-pointer'
                        }`}
                      >
                        <span className="text-[#2C3E50] font-medium">{ex.nome}</span>
                        <span className="text-xs text-[#7F8C8D]">{ex.grupo_muscular ?? ''}{ex.nivel ? ` · ${ex.nivel}` : ''}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setEditandoSeq(null)} className="px-4 py-2 rounded-lg border border-[#E8E8E8] text-sm text-[#7F8C8D] hover:bg-[#F8F9FA]">
                  Cancelar
                </button>
                <button
                  onClick={salvarSequencia}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-[#4A3AE8] text-white text-sm font-semibold hover:bg-[#3829c7] disabled:opacity-60"
                >
                  {isPending ? 'Salvando…' : 'Salvar Sequência'}
                </button>
              </div>
            </div>
          )}

          {/* ── Aba Exercícios ── */}
          {aba === 'exercicios' && !editandoEx && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={() => setEditandoEx({ nome: '', descricao: null, grupo_muscular: null, nivel: null, instrucoes: null })}
                  className="flex items-center gap-2 bg-[#4A3AE8] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#3829c7] transition-colors"
                >
                  <Plus size={14} /> Novo Exercício
                </button>
              </div>
              {exercicios.length === 0 && (
                <p className="text-sm text-[#7F8C8D] text-center py-8">Nenhum exercício cadastrado.</p>
              )}
              {exercicios.map(ex => (
                <div key={ex.id} className="flex items-center gap-3 p-3 bg-[#F8F9FA] rounded-xl border border-[#E8E8E8]">
                  <div className="flex-1">
                    <p className="font-medium text-[#2C3E50] text-sm">{ex.nome}</p>
                    <p className="text-xs text-[#7F8C8D]">
                      {[ex.grupo_muscular, ex.nivel].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <button onClick={() => setEditandoEx(ex)} className="p-1.5 rounded-lg hover:bg-[#E8E8E8] transition-colors">
                    <Pencil size={14} className="text-[#7F8C8D]" />
                  </button>
                  <button onClick={() => excluirExercicio(ex.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Editor de exercício ── */}
          {aba === 'exercicios' && editandoEx && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setEditandoEx(null)} className="text-sm text-[#7F8C8D] hover:text-[#2C3E50]">
                  ← Voltar
                </button>
                <h3 className="font-semibold text-[#2C3E50] text-sm">
                  {editandoEx.id ? 'Editar Exercício' : 'Novo Exercício'}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-[#7F8C8D] mb-1 block">Nome *</label>
                  <input
                    className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A3AE8]/30"
                    value={editandoEx.nome ?? ''}
                    onChange={e => setEditandoEx(p => ({ ...p, nome: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-[#7F8C8D] mb-1 block">Grupo Muscular</label>
                  <input
                    className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A3AE8]/30"
                    value={editandoEx.grupo_muscular ?? ''}
                    onChange={e => setEditandoEx(p => ({ ...p, grupo_muscular: e.target.value || null }))}
                    placeholder="Ex: Core, MMII"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#7F8C8D] mb-1 block">Nível</label>
                  <select
                    className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A3AE8]/30"
                    value={editandoEx.nivel ?? ''}
                    onChange={e => setEditandoEx(p => ({ ...p, nivel: (e.target.value || null) as any }))}
                  >
                    <option value="">—</option>
                    <option value="leve">Leve</option>
                    <option value="moderado">Moderado</option>
                    <option value="intenso">Intenso</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-[#7F8C8D] mb-1 block">Descrição</label>
                  <textarea
                    rows={2}
                    className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A3AE8]/30 resize-none"
                    value={editandoEx.descricao ?? ''}
                    onChange={e => setEditandoEx(p => ({ ...p, descricao: e.target.value || null }))}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-[#7F8C8D] mb-1 block">Instruções</label>
                  <textarea
                    rows={3}
                    className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A3AE8]/30 resize-none"
                    value={editandoEx.instrucoes ?? ''}
                    onChange={e => setEditandoEx(p => ({ ...p, instrucoes: e.target.value || null }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setEditandoEx(null)} className="px-4 py-2 rounded-lg border border-[#E8E8E8] text-sm text-[#7F8C8D] hover:bg-[#F8F9FA]">
                  Cancelar
                </button>
                <button
                  onClick={salvarExercicio}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-[#4A3AE8] text-white text-sm font-semibold hover:bg-[#3829c7] disabled:opacity-60"
                >
                  {isPending ? 'Salvando…' : 'Salvar Exercício'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
