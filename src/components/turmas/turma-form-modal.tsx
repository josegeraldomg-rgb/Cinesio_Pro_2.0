'use client'

import { useState } from 'react'
import { X, Plus, Trash2, ChevronRight, ChevronLeft, BookOpen, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { criarTurmaAction } from '@/app/(dashboard)/turmas/actions'

interface Profissional { id: string; nome: string }
interface Sala { id: string; nome: string }
interface Servico { id: string; nome: string }

interface Props {
  profissionais: Profissional[]
  salas: Sala[]
  servicos: Servico[]
  onClose: () => void
  onCriado: (id: string, sessoes: number) => void
}

const DIAS_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const NIVEL_OPTS = [
  { value: 'livre',         label: 'Livre',         cor: '#4A3AE8' },
  { value: 'iniciante',     label: 'Iniciante',     cor: '#27AE60' },
  { value: 'intermediario', label: 'Intermediário', cor: '#E67E22' },
  { value: 'avancado',      label: 'Avançado',      cor: '#E74C3C' },
]

const PASSOS = [
  { n: 1, label: 'Informações' },
  { n: 2, label: 'Horários'    },
  { n: 3, label: 'Planos'      },
  { n: 4, label: 'Revisão'     },
]

interface PlanoForm { nome: string; frequencia_semanal: number; valor_mensal: string }
interface DiaOverride { sala_id: string; profissional_id: string; expandido: boolean }

function calcDuracao(h1: string, h2: string): number {
  const [ah, am] = h1.split(':').map(Number)
  const [bh, bm] = h2.split(':').map(Number)
  return Math.max(0, (bh * 60 + bm) - (ah * 60 + am))
}

export function TurmaFormModal({ profissionais, salas, servicos, onClose, onCriado }: Props) {
  const [passo, setPasso] = useState(1)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // Passo 1
  const [nome, setNome]             = useState('')
  const [descricao, setDescricao]   = useState('')
  const [profId, setProfId]         = useState('')
  const [salaId, setSalaId]         = useState('')
  const [servicoId, setServicoId]   = useState('')
  const [nivel, setNivel]           = useState('livre')
  const [capacidade, setCapacidade] = useState('10')
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10))
  const [dataFim, setDataFim]       = useState('')

  // Passo 2
  const [diasSel, setDiasSel]       = useState<number[]>([1])
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFim, setHoraFim]       = useState('09:00')
  const [overrides, setOverrides]   = useState<Record<number, DiaOverride>>({})

  function toggleDia(dia: number) {
    setDiasSel(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia].sort())
  }
  function updateOverride(dia: number, patch: Partial<DiaOverride>) {
    setOverrides(prev => ({ ...prev, [dia]: { sala_id: '', profissional_id: '', expandido: false, ...prev[dia], ...patch } }))
  }
  const duracao = calcDuracao(horaInicio, horaFim)

  // Passo 3
  const [planos, setPlanos] = useState<PlanoForm[]>([{ nome: '1x por semana', frequencia_semanal: 1, valor_mensal: '' }])
  function addPlano() { setPlanos(prev => [...prev, { nome: '', frequencia_semanal: 1, valor_mensal: '' }]) }
  function removePlano(i: number) { setPlanos(prev => prev.filter((_, idx) => idx !== i)) }
  function updatePlano(i: number, patch: Partial<PlanoForm>) { setPlanos(prev => prev.map((p, idx) => idx === i ? { ...p, ...patch } : p)) }

  function validarPasso(): string {
    if (passo === 1) {
      if (!nome.trim()) return 'Informe o nome da turma.'
      if (!dataInicio)  return 'Informe a data de início.'
    }
    if (passo === 2) {
      if (diasSel.length === 0) return 'Selecione pelo menos 1 dia da semana.'
      if (!horaInicio || !horaFim) return 'Preencha o horário.'
      if (duracao <= 0) return 'O horário de fim deve ser após o início.'
    }
    if (passo === 3) {
      if (planos.length === 0) return 'Adicione pelo menos 1 plano.'
      for (const p of planos) {
        if (!p.nome.trim()) return 'Preencha o nome de todos os planos.'
        if (!p.valor_mensal || isNaN(Number(p.valor_mensal))) return 'Informe o valor de todos os planos.'
      }
    }
    return ''
  }

  function avancar() {
    const v = validarPasso()
    if (v) { setErr(v); return }
    setErr('')
    setPasso(p => p + 1)
  }

  function buildSlots() {
    return diasSel.map(dia => ({
      dia_semana: dia, hora_inicio: horaInicio, hora_fim: horaFim, duracao_minutos: duracao,
      sala_id: overrides[dia]?.sala_id || null,
      profissional_id: overrides[dia]?.profissional_id || null,
    }))
  }

  async function salvar() {
    const v = validarPasso()
    if (v) { setErr(v); return }
    setSaving(true); setErr('')
    try {
      const r = await criarTurmaAction({
        nome, descricao: descricao || null,
        profissional_id: profId || null, sala_id: salaId || null, servico_id: servicoId || null,
        nivel, capacidade_slot: Number(capacidade),
        data_inicio: dataInicio, data_fim: dataFim || null,
        slots: buildSlots(),
        planos: planos.map(p => ({ nome: p.nome, frequencia_semanal: p.frequencia_semanal, valor_mensal: Number(p.valor_mensal) })),
      })
      if ('error' in r) { setErr(r.error); return }
      onCriado(r.id, r.sessoes_criadas)
    } finally { setSaving(false) }
  }

  const nivelSel = NIVEL_OPTS.find(o => o.value === nivel)

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[#F0F0F0] flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4A3AE8] to-[#7B6FF0] flex items-center justify-center shadow-sm">
                <BookOpen size={18} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-[#2C3E50] text-sm leading-tight">Nova Turma</p>
                <p className="text-[11px] text-[#7F8C8D] mt-0.5">{PASSOS[passo - 1].label}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7F8C8D] hover:bg-[#F8F9FA] hover:text-[#2C3E50] transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-0">
            {PASSOS.map((p, i) => {
              const done   = passo > p.n
              const active = passo === p.n
              return (
                <div key={p.n} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      done   ? 'bg-[#4A3AE8] text-white' :
                      active ? 'bg-[#4A3AE8] text-white ring-4 ring-[#4A3AE8]/20' :
                               'bg-[#F0F0F0] text-[#B0B0B0]'
                    }`}>
                      {done ? <Check size={12} /> : p.n}
                    </div>
                    <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${active ? 'text-[#4A3AE8]' : done ? 'text-[#7F8C8D]' : 'text-[#C0C0C0]'}`}>
                      {p.label}
                    </span>
                  </div>
                  {i < PASSOS.length - 1 && (
                    <div className={`flex-1 h-px mx-2 mb-4 transition-colors ${passo > p.n ? 'bg-[#4A3AE8]' : 'bg-[#E8E8E8]'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* ── Passo 1: Informações ── */}
          {passo === 1 && <>
            <div className="space-y-4">
              <div>
                <label className="label-xs">Nome da Turma *</label>
                <input value={nome} onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Pilates Iniciante — Manhã"
                  className="input-base w-full" />
              </div>
              <div>
                <label className="label-xs">Descrição</label>
                <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
                  rows={2} placeholder="Informações adicionais sobre a turma (opcional)"
                  className="input-base w-full resize-none" />
              </div>
            </div>

            <div className="border-t border-[#F0F0F0] pt-4 space-y-3">
              <p className="text-[10px] font-bold text-[#7F8C8D] uppercase tracking-widest">Responsáveis e Local</p>
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
            </div>

            <div className="border-t border-[#F0F0F0] pt-4 space-y-3">
              <p className="text-[10px] font-bold text-[#7F8C8D] uppercase tracking-widest">Configurações</p>
              <div>
                <label className="label-xs">Nível</label>
                <div className="grid grid-cols-4 gap-2">
                  {NIVEL_OPTS.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setNivel(opt.value)}
                      className={`h-9 rounded-xl text-xs font-semibold border-2 transition-all ${
                        nivel === opt.value ? 'text-white border-transparent shadow-sm' : 'border-[#E8E8E8] bg-white hover:border-current'
                      }`}
                      style={nivel === opt.value ? { background: opt.cor, borderColor: opt.cor } : { color: opt.cor }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-44">
                <label className="label-xs">Capacidade por Slot</label>
                <div className="relative">
                  <input type="number" min={1} value={capacidade} onChange={e => setCapacidade(e.target.value)}
                    className="input-base w-full pr-14" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7F8C8D] pointer-events-none">alunos</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[#F0F0F0] pt-4 space-y-3">
              <p className="text-[10px] font-bold text-[#7F8C8D] uppercase tracking-widest">Período</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-xs">Data de Início *</label>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="input-base w-full" />
                </div>
                <div>
                  <label className="label-xs">Data de Encerramento</label>
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="input-base w-full" />
                  {!dataFim && <p className="text-[10px] text-[#7F8C8D] mt-1">Sem prazo definido</p>}
                </div>
              </div>
            </div>
          </>}

          {/* ── Passo 2: Horários ── */}
          {passo === 2 && <>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#7F8C8D] uppercase tracking-widest">Dias da Semana *</p>
              <p className="text-xs text-[#7F8C8D]">Um slot será criado para cada dia marcado, com o mesmo horário.</p>
              <div className="flex gap-2 pt-1">
                {DIAS_LABEL.map((label, idx) => (
                  <button key={idx} type="button" onClick={() => toggleDia(idx)}
                    className={`flex-1 h-11 rounded-xl text-xs font-bold transition-all ${
                      diasSel.includes(idx)
                        ? 'bg-[#4A3AE8] text-white shadow-sm'
                        : 'bg-[#F4F4F6] text-[#9096A0] hover:bg-[#EAEAF0]'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-[#F0F0F0] pt-4 space-y-2">
              <p className="text-[10px] font-bold text-[#7F8C8D] uppercase tracking-widest">Horário</p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="label-xs">Início</label>
                  <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="input-base w-full" />
                </div>
                <div className="flex-1">
                  <label className="label-xs">Fim</label>
                  <input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} className="input-base w-full" />
                </div>
                <div className="pb-1">
                  {duracao > 0
                    ? <span className="inline-flex items-center h-10 px-3 rounded-xl bg-[#4A3AE8]/8 text-[#4A3AE8] text-xs font-bold">{duracao} min</span>
                    : <span className="inline-flex items-center h-10 px-3 rounded-xl bg-red-50 text-red-400 text-xs font-medium">Inválido</span>
                  }
                </div>
              </div>
            </div>

            {diasSel.length > 0 && (
              <div className="border-t border-[#F0F0F0] pt-4 space-y-2">
                <p className="text-[10px] font-bold text-[#7F8C8D] uppercase tracking-widest">
                  {diasSel.length} Slot{diasSel.length > 1 ? 's' : ''} gerado{diasSel.length > 1 ? 's' : ''}
                  <span className="normal-case font-normal ml-1">— clique para personalizar sala ou instrutor por dia</span>
                </p>
                <div className="space-y-1.5">
                  {diasSel.map(dia => {
                    const ov = overrides[dia]
                    const temOv = ov?.sala_id || ov?.profissional_id
                    return (
                      <div key={dia} className={`rounded-xl border transition-colors ${ov?.expandido ? 'border-[#4A3AE8]/30 bg-[#4A3AE8]/3' : 'border-[#EBEBEB] bg-[#FAFAFA]'}`}>
                        <button type="button" onClick={() => updateOverride(dia, { expandido: !ov?.expandido })}
                          className="w-full flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${diasSel.includes(dia) ? 'bg-[#4A3AE8] text-white' : 'bg-[#F0F0F0] text-[#7F8C8D]'}`}>
                              {DIAS_LABEL[dia]}
                            </span>
                            <span className="text-sm text-[#2C3E50]">{horaInicio} – {horaFim}</span>
                            {temOv && <span className="text-[10px] bg-[#4A3AE8]/10 text-[#4A3AE8] px-2 py-0.5 rounded-full font-medium">personalizado</span>}
                          </div>
                          {ov?.expandido ? <ChevronUp size={14} className="text-[#7F8C8D]" /> : <ChevronDown size={14} className="text-[#7F8C8D]" />}
                        </button>
                        {ov?.expandido && (
                          <div className="px-4 pb-3 grid grid-cols-2 gap-3 border-t border-[#EBEBEB] pt-3">
                            <div>
                              <label className="label-xs">Sala (sobrescrever)</label>
                              <select value={ov.sala_id} onChange={e => updateOverride(dia, { sala_id: e.target.value })} className="input-base w-full">
                                <option value="">Sala da turma</option>
                                {salas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="label-xs">Instrutor (sobrescrever)</label>
                              <select value={ov.profissional_id} onChange={e => updateOverride(dia, { profissional_id: e.target.value })} className="input-base w-full">
                                <option value="">Instrutor da turma</option>
                                {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>}

          {/* ── Passo 3: Planos ── */}
          {passo === 3 && <>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#7F8C8D] uppercase tracking-widest">Planos de Frequência</p>
              <p className="text-xs text-[#7F8C8D]">Defina os pacotes mensais por quantidade de dias por semana.</p>
            </div>
            <div className="space-y-3">
              {planos.map((p, i) => (
                <div key={i} className="bg-[#F8F9FA] border border-[#EBEBEB] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#4A3AE8]">Plano {i + 1}</span>
                    {planos.length > 1 && (
                      <button onClick={() => removePlano(i)} className="w-6 h-6 rounded-lg flex items-center justify-center text-[#7F8C8D] hover:bg-red-50 hover:text-[#E74C3C] transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="label-xs">Dias/Sem.</label>
                      <select value={p.frequencia_semanal}
                        onChange={e => updatePlano(i, { frequencia_semanal: Number(e.target.value), nome: `${e.target.value}x por semana` })}
                        className="input-base w-full">
                        {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}x</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="label-xs">Nome do Plano</label>
                      <input value={p.nome} onChange={e => updatePlano(i, { nome: e.target.value })}
                        placeholder="Ex: 2x por semana"
                        className="input-base w-full" />
                    </div>
                  </div>
                  <div>
                    <label className="label-xs">Valor Mensal (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#7F8C8D] font-medium pointer-events-none">R$</span>
                      <input type="number" min={0} step={0.01} value={p.valor_mensal}
                        onChange={e => updatePlano(i, { valor_mensal: e.target.value })}
                        placeholder="0,00" className="input-base w-full pl-9" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addPlano}
              className="w-full flex items-center justify-center gap-1.5 h-10 rounded-xl border-2 border-dashed border-[#4A3AE8]/25 text-[#4A3AE8] text-sm font-medium hover:border-[#4A3AE8]/50 hover:bg-[#4A3AE8]/3 transition-all">
              <Plus size={14} /> Adicionar Plano
            </button>
          </>}

          {/* ── Passo 4: Revisão ── */}
          {passo === 4 && <>
            {/* Card da turma */}
            <div className="bg-gradient-to-br from-[#4A3AE8]/5 to-[#7B6FF0]/10 border border-[#4A3AE8]/15 rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-[#2C3E50] text-base">{nome}</p>
                  {descricao && <p className="text-xs text-[#7F8C8D] mt-0.5">{descricao}</p>}
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={{ color: NIVEL_OPTS.find(o => o.value === nivel)?.cor, background: (NIVEL_OPTS.find(o => o.value === nivel)?.cor ?? '#4A3AE8') + '15' }}>
                  {NIVEL_OPTS.find(o => o.value === nivel)?.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                {profId && profissionais.find(p => p.id === profId) && (
                  <><span className="text-[#7F8C8D]">Profissional</span><span className="font-medium text-[#2C3E50]">{profissionais.find(p => p.id === profId)?.nome}</span></>
                )}
                {salaId && salas.find(s => s.id === salaId) && (
                  <><span className="text-[#7F8C8D]">Sala</span><span className="font-medium text-[#2C3E50]">{salas.find(s => s.id === salaId)?.nome}</span></>
                )}
                <span className="text-[#7F8C8D]">Capacidade</span><span className="font-medium text-[#2C3E50]">{capacidade} alunos/slot</span>
                <span className="text-[#7F8C8D]">Início</span><span className="font-medium text-[#2C3E50]">{new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                {dataFim && <><span className="text-[#7F8C8D]">Fim</span><span className="font-medium text-[#2C3E50]">{new Date(dataFim + 'T12:00:00').toLocaleDateString('pt-BR')}</span></>}
              </div>
            </div>

            {/* Slots */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#7F8C8D] uppercase tracking-widest">{diasSel.length} Slot{diasSel.length !== 1 ? 's' : ''}</p>
              <div className="grid grid-cols-2 gap-2">
                {diasSel.map(dia => {
                  const ov = overrides[dia]
                  const temOv = ov?.sala_id || ov?.profissional_id
                  return (
                    <div key={dia} className="flex items-center gap-2.5 bg-[#F8F9FA] border border-[#EBEBEB] rounded-xl px-3 py-2">
                      <span className="w-8 h-8 rounded-lg bg-[#4A3AE8] text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                        {DIAS_LABEL[dia]}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#2C3E50]">{horaInicio}–{horaFim}</p>
                        <p className="text-[10px] text-[#7F8C8D]">{duracao} min{temOv ? ' · personalizado' : ''}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Planos */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#7F8C8D] uppercase tracking-widest">{planos.length} Plano{planos.length !== 1 ? 's' : ''}</p>
              <div className="divide-y divide-[#F0F0F0] border border-[#EBEBEB] rounded-xl overflow-hidden">
                {planos.map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-white">
                    <div>
                      <span className="text-sm font-medium text-[#2C3E50]">{p.nome}</span>
                      <span className="text-xs text-[#7F8C8D] ml-2">{p.frequencia_semanal}x/sem.</span>
                    </div>
                    <span className="font-bold text-[#27AE60] text-sm">R$ {Number(p.valor_mensal).toFixed(2)}<span className="font-normal text-xs text-[#7F8C8D]">/mês</span></span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2.5 bg-[#4A3AE8]/5 border border-[#4A3AE8]/15 rounded-xl p-3">
              <BookOpen size={14} className="text-[#4A3AE8] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#4A3AE8] leading-relaxed">
                O sistema gerará automaticamente as sessões dos próximos 90 dias para cada slot.
              </p>
            </div>
          </>}

          {err && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <span className="text-red-400 mt-0.5 flex-shrink-0">⚠</span>
              <p className="text-xs text-red-600">{err}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F0F0F0] flex gap-3 flex-shrink-0 bg-[#FAFAFA] rounded-b-2xl">
          {passo > 1 ? (
            <button onClick={() => { setErr(''); setPasso(p => p - 1) }}
              className="flex items-center gap-1 h-11 px-4 rounded-xl border-2 border-[#E8E8E8] text-sm font-semibold text-[#7F8C8D] hover:border-[#D0D0D0] hover:text-[#2C3E50] transition-colors">
              <ChevronLeft size={15} /> Voltar
            </button>
          ) : (
            <button onClick={onClose}
              className="h-11 px-4 rounded-xl border-2 border-[#E8E8E8] text-sm font-semibold text-[#7F8C8D] hover:border-[#D0D0D0] hover:text-[#2C3E50] transition-colors">
              Cancelar
            </button>
          )}
          {passo < 4 ? (
            <button onClick={avancar}
              className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl bg-[#4A3AE8] text-white text-sm font-semibold hover:bg-[#3D2ED6] shadow-sm transition-colors">
              Próximo <ChevronRight size={15} />
            </button>
          ) : (
            <button onClick={salvar} disabled={saving}
              className="flex-1 h-11 rounded-xl bg-[#27AE60] text-white text-sm font-semibold hover:bg-[#219653] disabled:opacity-50 shadow-sm transition-colors">
              {saving ? 'Criando turma…' : '✓ Criar Turma'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
