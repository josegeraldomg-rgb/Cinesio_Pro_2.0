'use client'

import { useState } from 'react'
import { X, FileText, Search, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import type { PlanoExercicio, ExercicioBiblioteca, ExercicioSequenciaItem } from '@/app/(dashboard)/biblioteca-exercicios/actions'
import { salvarPlanoExercicioAction } from '@/app/(dashboard)/biblioteca-exercicios/actions'

interface Props {
  plano?: PlanoExercicio
  exercicios: ExercicioBiblioteca[]
  pacientes: { id: string; nome: string }[]
  profissionais: { id: string; nome: string }[]
  onClose: () => void
  onSalvo: () => void
}

export function PrescricaoModal({ plano, exercicios, pacientes, profissionais, onClose, onSalvo }: Props) {
  const isEdit = !!plano?.id
  const hoje = new Date().toISOString().split('T')[0]

  const [pacienteId, setPacienteId] = useState(plano?.paciente_id ?? '')
  const [profId, setProfId] = useState(plano?.profissional_id ?? '')
  const [nome, setNome] = useState(plano?.nome ?? '')
  const [descricao, setDescricao] = useState(plano?.descricao ?? '')
  const [frequencia, setFrequencia] = useState(plano?.frequencia ?? '')
  const [dataInicio, setDataInicio] = useState(plano?.data_inicio ?? hoje)
  const [dataFim, setDataFim] = useState(plano?.data_fim ?? '')
  const [ativo, setAtivo] = useState(plano?.ativo ?? true)
  const [itens, setItens] = useState<ExercicioSequenciaItem[]>(plano?.exercicios ?? [])

  const [busca, setBusca] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const exerciciosFiltrados = exercicios.filter(e => {
    if (!busca) return true
    const t = busca.toLowerCase()
    return e.nome.toLowerCase().includes(t) || (e.grupo_muscular ?? '').toLowerCase().includes(t)
  })

  function adicionarExercicio(ex: ExercicioBiblioteca) {
    setItens(prev => [...prev, {
      exercicio_id: ex.id,
      nome_exercicio: ex.nome,
      series: ex.series_padrao ?? null,
      repeticoes: ex.repeticoes_padrao ?? null,
      carga: null,
      obs: null,
    }])
  }

  function removerItem(idx: number) {
    setItens(prev => prev.filter((_, i) => i !== idx))
  }

  function moverItem(idx: number, dir: -1 | 1) {
    setItens(prev => {
      const arr = [...prev]
      const target = idx + dir
      if (target < 0 || target >= arr.length) return arr
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr
    })
  }

  function atualizarItem(idx: number, campo: keyof ExercicioSequenciaItem, valor: string | number | null) {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, [campo]: valor } : it))
  }

  async function salvar() {
    if (!pacienteId) { setErr('Selecione o paciente.'); return }
    if (!nome.trim()) { setErr('Informe o nome do plano.'); return }
    if (!dataInicio) { setErr('Informe a data de início.'); return }
    setSaving(true); setErr('')
    try {
      const r = await salvarPlanoExercicioAction({
        id: isEdit ? plano?.id : undefined,
        paciente_id: pacienteId,
        profissional_id: profId || null,
        nome,
        descricao: descricao || null,
        exercicios: itens,
        frequencia: frequencia || null,
        data_inicio: dataInicio,
        data_fim: dataFim || null,
        ativo,
      })
      if ('error' in r) { setErr(r.error); return }
      onSalvo()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F0F0F0] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
              <FileText size={16} className="text-white" />
            </div>
            <p className="font-bold text-[#2C3E50] text-sm">{isEdit ? 'Editar Plano de Tratamento' : 'Nova Prescrição de Exercícios'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7F8C8D] hover:bg-[#F8F9FA] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Coluna esquerda — Exercícios disponíveis */}
          <div className="w-56 border-r border-[#F0F0F0] flex flex-col flex-shrink-0">
            <div className="p-3 border-b border-[#F0F0F0]">
              <p className="text-[10px] font-bold text-[#7F8C8D] uppercase tracking-wider mb-2">Exercícios</p>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
                <input
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar…"
                  className="w-full pl-7 pr-2 py-1.5 border border-[#E8E8E8] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {exerciciosFiltrados.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => adicionarExercicio(ex)}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-emerald-50 transition-colors group flex items-start gap-1.5"
                >
                  <Plus size={12} className="text-emerald-600 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#2C3E50] leading-tight truncate">{ex.nome}</p>
                    {ex.grupo_muscular && <p className="text-[10px] text-[#7F8C8D] truncate">{ex.grupo_muscular}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Coluna direita */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Paciente e Profissional */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-xs">Paciente *</label>
                  <select value={pacienteId} onChange={e => setPacienteId(e.target.value)} className="input-base w-full">
                    <option value="">Selecionar…</option>
                    {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-xs">Profissional</label>
                  <select value={profId} onChange={e => setProfId(e.target.value)} className="input-base w-full">
                    <option value="">Selecionar…</option>
                    {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              </div>

              {/* Nome do plano */}
              <div>
                <label className="label-xs">Nome do Plano *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Reabilitação de Joelho" className="input-base w-full" />
              </div>

              <div>
                <label className="label-xs">Descrição / Observações</label>
                <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2} placeholder="Notas clínicas…" className="input-base w-full resize-none" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label-xs">Frequência</label>
                  <input value={frequencia} onChange={e => setFrequencia(e.target.value)} placeholder="Ex: 3x/semana" className="input-base w-full" />
                </div>
                <div>
                  <label className="label-xs">Início *</label>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="input-base w-full" />
                </div>
                <div>
                  <label className="label-xs">Término</label>
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="input-base w-full" />
                </div>
              </div>

              {isEdit && (
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)} className="w-4 h-4 rounded accent-emerald-600" />
                  <span className="text-sm text-[#2C3E50]">Plano ativo</span>
                </label>
              )}

              {/* Exercícios prescritos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-[#7F8C8D] uppercase tracking-wider">
                    Exercícios prescritos ({itens.length})
                  </p>
                  {itens.length === 0 && <span className="text-[10px] text-[#7F8C8D] italic">← adicione exercícios</span>}
                </div>

                {itens.length === 0 ? (
                  <div className="border-2 border-dashed border-[#E8E8E8] rounded-xl py-6 text-center text-xs text-[#7F8C8D]">
                    Selecione exercícios na lista ao lado
                  </div>
                ) : (
                  <div className="space-y-2">
                    {itens.map((item, idx) => (
                      <div key={idx} className="bg-[#F8F9FA] rounded-xl p-3 border border-[#EEEEEE] space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">{idx + 1}</span>
                          <span className="flex-1 text-xs font-semibold text-[#2C3E50] truncate">{item.nome_exercicio}</span>
                          <button onClick={() => moverItem(idx, -1)} disabled={idx === 0} className="w-6 h-6 flex items-center justify-center rounded text-[#7F8C8D] hover:bg-white disabled:opacity-30">
                            <ChevronUp size={12} />
                          </button>
                          <button onClick={() => moverItem(idx, 1)} disabled={idx === itens.length - 1} className="w-6 h-6 flex items-center justify-center rounded text-[#7F8C8D] hover:bg-white disabled:opacity-30">
                            <ChevronDown size={12} />
                          </button>
                          <button onClick={() => removerItem(idx)} className="w-6 h-6 flex items-center justify-center rounded text-red-400 hover:bg-red-50">
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 ml-7">
                          <div>
                            <label className="text-[9px] font-bold text-[#7F8C8D] uppercase tracking-wider block mb-0.5">Séries</label>
                            <input type="number" min={1} value={item.series ?? ''} onChange={e => atualizarItem(idx, 'series', e.target.value ? Number(e.target.value) : null)} placeholder="3" className="w-full border border-[#E8E8E8] rounded-lg px-2 py-1 text-xs focus:outline-none bg-white" />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-[#7F8C8D] uppercase tracking-wider block mb-0.5">Repetições</label>
                            <input value={item.repeticoes ?? ''} onChange={e => atualizarItem(idx, 'repeticoes', e.target.value || null)} placeholder="12 ou 30s" className="w-full border border-[#E8E8E8] rounded-lg px-2 py-1 text-xs focus:outline-none bg-white" />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-[#7F8C8D] uppercase tracking-wider block mb-0.5">Carga</label>
                            <input value={item.carga ?? ''} onChange={e => atualizarItem(idx, 'carga', e.target.value || null)} placeholder="5kg" className="w-full border border-[#E8E8E8] rounded-lg px-2 py-1 text-xs focus:outline-none bg-white" />
                          </div>
                        </div>
                        <div className="ml-7">
                          <label className="text-[9px] font-bold text-[#7F8C8D] uppercase tracking-wider block mb-0.5">Instrução</label>
                          <input value={item.obs ?? ''} onChange={e => atualizarItem(idx, 'obs', e.target.value || null)} placeholder="Instrução específica…" className="w-full border border-[#E8E8E8] rounded-lg px-2 py-1 text-xs focus:outline-none bg-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {err && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  <span className="text-red-400 mt-0.5">⚠</span>
                  <p className="text-xs text-red-600">{err}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F0F0F0] flex gap-3 flex-shrink-0 bg-[#FAFAFA] rounded-b-2xl">
          <button onClick={onClose} className="h-11 px-5 rounded-xl border-2 border-[#E8E8E8] text-sm font-semibold text-[#7F8C8D] hover:border-[#D0D0D0] transition-colors">
            Cancelar
          </button>
          <button onClick={salvar} disabled={saving} className="flex-1 h-11 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 shadow-sm transition-colors">
            {saving ? 'Salvando…' : isEdit ? 'Salvar Plano' : 'Criar Plano'}
          </button>
        </div>
      </div>
    </div>
  )
}
