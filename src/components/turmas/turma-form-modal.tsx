'use client'

import { useState } from 'react'
import { X, Plus, Trash2, ChevronRight, ChevronLeft, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
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
const DIAS_FULL  = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

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

  // Passo 1 — Info básica
  const [nome, setNome]           = useState('')
  const [descricao, setDescricao] = useState('')
  const [profId, setProfId]       = useState('')
  const [salaId, setSalaId]       = useState('')
  const [servicoId, setServicoId] = useState('')
  const [nivel, setNivel]         = useState('livre')
  const [capacidade, setCapacidade] = useState('10')
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10))
  const [dataFim, setDataFim]     = useState('')

  // Passo 2 — Horários
  const [diasSel, setDiasSel]     = useState<number[]>([1]) // Segunda por padrão
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFim, setHoraFim]     = useState('09:00')
  const [overrides, setOverrides] = useState<Record<number, DiaOverride>>({})

  function toggleDia(dia: number) {
    setDiasSel(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia].sort()
    )
  }

  function updateOverride(dia: number, patch: Partial<DiaOverride>) {
    setOverrides(prev => ({ ...prev, [dia]: { sala_id: '', profissional_id: '', expandido: false, ...prev[dia], ...patch } }))
  }

  const duracao = calcDuracao(horaInicio, horaFim)

  // Passo 3 — Planos
  const [planos, setPlanos] = useState<PlanoForm[]>([
    { nome: '1x por semana', frequencia_semanal: 1, valor_mensal: '' },
  ])
  function addPlano() { setPlanos(prev => [...prev, { nome: '', frequencia_semanal: 1, valor_mensal: '' }]) }
  function removePlano(i: number) { setPlanos(prev => prev.filter((_, idx) => idx !== i)) }
  function updatePlano(i: number, patch: Partial<PlanoForm>) { setPlanos(prev => prev.map((p, idx) => idx === i ? { ...p, ...patch } : p)) }

  function validarPasso(): string {
    if (passo === 1) {
      if (!nome.trim()) return 'Informe o nome da turma.'
      if (!dataInicio) return 'Informe a data de início.'
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
      dia_semana: dia,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      duracao_minutos: duracao,
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
        profissional_id: profId || null,
        sala_id: salaId || null,
        servico_id: servicoId || null,
        nivel, capacidade_slot: Number(capacidade),
        data_inicio: dataInicio, data_fim: dataFim || null,
        slots: buildSlots(),
        planos: planos.map(p => ({ nome: p.nome, frequencia_semanal: p.frequencia_semanal, valor_mensal: Number(p.valor_mensal) })),
      })
      if ('error' in r) { setErr(r.error); return }
      onCriado(r.id, r.sessoes_criadas)
    } finally { setSaving(false) }
  }

  const passos = ['Informações', 'Horários', 'Planos', 'Revisão']

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#4A3AE8]/10 flex items-center justify-center">
              <BookOpen size={18} className="text-[#4A3AE8]" />
            </div>
            <div>
              <p className="font-bold text-[#2C3E50] text-sm">Nova Turma</p>
              <p className="text-[11px] text-[#7F8C8D]">Passo {passo} de 4 — {passos[passo - 1]}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#7F8C8D] hover:text-[#2C3E50]"><X size={18} /></button>
        </div>

        {/* Progresso */}
        <div className="flex px-6 py-2 gap-1 flex-shrink-0">
          {passos.map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i < passo ? 'bg-[#4A3AE8]' : 'bg-[#E8E8E8]'}`} />
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

          {/* Passo 1 */}
          {passo === 1 && <>
            <div>
              <label className="label-xs">Nome da Turma *</label>
              <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Pilates Iniciante T1"
                className="input-base w-full" />
            </div>
            <div>
              <label className="label-xs">Descrição</label>
              <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2} placeholder="Descrição opcional da turma"
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
          </>}

          {/* Passo 2 */}
          {passo === 2 && <>
            <p className="text-xs text-[#7F8C8D]">
              Selecione os dias e defina o horário. Um slot será criado para cada dia marcado.
            </p>

            {/* Seleção de dias */}
            <div>
              <label className="label-xs mb-2 block">Dias da semana *</label>
              <div className="flex gap-1.5 flex-wrap">
                {DIAS_LABEL.map((label, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDia(idx)}
                    className={`w-10 h-10 rounded-xl text-xs font-semibold transition-all ${
                      diasSel.includes(idx)
                        ? 'bg-[#4A3AE8] text-white shadow-sm'
                        : 'bg-[#F0F0F0] text-[#7F8C8D] hover:bg-[#E8E8E8]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Horário compartilhado */}
            <div className="grid grid-cols-3 gap-3 items-end">
              <div>
                <label className="label-xs">Início</label>
                <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="input-base w-full" />
              </div>
              <div>
                <label className="label-xs">Fim</label>
                <input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} className="input-base w-full" />
              </div>
              <div className="pb-[3px]">
                {duracao > 0
                  ? <p className="text-xs text-[#4A3AE8] font-medium">{duracao} min</p>
                  : <p className="text-xs text-red-400">Horário inválido</p>
                }
              </div>
            </div>

            {/* Overrides por dia */}
            {diasSel.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] text-[#7F8C8D] uppercase tracking-wider font-semibold">
                  {diasSel.length} slot{diasSel.length > 1 ? 's' : ''} gerado{diasSel.length > 1 ? 's' : ''}
                  {(profId || salaId) && ' · herdam sala e instrutor da turma'}
                </p>
                {diasSel.map(dia => {
                  const ov = overrides[dia]
                  const temOverride = ov?.sala_id || ov?.profissional_id
                  return (
                    <div key={dia} className="bg-[#F8F9FA] rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateOverride(dia, { expandido: !ov?.expandido })}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-8 text-xs font-bold text-[#4A3AE8]">{DIAS_LABEL[dia]}</span>
                          <span className="text-xs text-[#2C3E50]">{horaInicio}–{horaFim}</span>
                          {temOverride && <span className="text-[10px] bg-[#4A3AE8]/10 text-[#4A3AE8] px-1.5 py-0.5 rounded-full">personalizado</span>}
                        </div>
                        {ov?.expandido ? <ChevronUp size={13} className="text-[#7F8C8D]" /> : <ChevronDown size={13} className="text-[#7F8C8D]" />}
                      </button>
                      {ov?.expandido && (
                        <div className="px-3 pb-3 grid grid-cols-2 gap-2 border-t border-[#EBEBEB] pt-2">
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
            )}
          </>}

          {/* Passo 3 */}
          {passo === 3 && <>
            <p className="text-xs text-[#7F8C8D]">Defina os pacotes de preço por frequência semanal. O aluno escolherá um plano na hora da matrícula.</p>
            {planos.map((p, i) => (
              <div key={i} className="bg-[#F8F9FA] rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#4A3AE8]">Plano {i + 1}</span>
                  {planos.length > 1 && (
                    <button onClick={() => removePlano(i)} className="text-[#E74C3C] hover:opacity-70"><Trash2 size={14} /></button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="label-xs">Dias/Semana</label>
                    <select value={p.frequencia_semanal} onChange={e => updatePlano(i, { frequencia_semanal: Number(e.target.value), nome: `${e.target.value}x por semana` })} className="input-base w-full">
                      {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}x</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label-xs">Nome do Plano</label>
                    <input value={p.nome} onChange={e => updatePlano(i, { nome: e.target.value })} placeholder="Ex: 2x por semana" className="input-base w-full" />
                  </div>
                </div>
                <div>
                  <label className="label-xs">Valor Mensal (R$)</label>
                  <input type="number" min={0} step={0.01} value={p.valor_mensal} onChange={e => updatePlano(i, { valor_mensal: e.target.value })} placeholder="0,00" className="input-base w-full" />
                </div>
              </div>
            ))}
            <button onClick={addPlano} className="w-full flex items-center justify-center gap-1.5 h-10 rounded-xl border-2 border-dashed border-[#4A3AE8]/30 text-[#4A3AE8] text-sm font-medium hover:border-[#4A3AE8] transition-colors">
              <Plus size={15} /> Adicionar Plano
            </button>
          </>}

          {/* Passo 4 — Revisão */}
          {passo === 4 && <>
            <div className="bg-[#F8F9FA] rounded-xl p-4 space-y-2">
              <p className="font-bold text-[#2C3E50]">{nome}</p>
              {descricao && <p className="text-xs text-[#7F8C8D]">{descricao}</p>}
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span className="text-[#7F8C8D]">Nível:</span><span className="font-medium capitalize">{nivel}</span>
                <span className="text-[#7F8C8D]">Capacidade/slot:</span><span className="font-medium">{capacidade} alunos</span>
                <span className="text-[#7F8C8D]">Início:</span><span className="font-medium">{new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                {dataFim && <><span className="text-[#7F8C8D]">Fim:</span><span className="font-medium">{new Date(dataFim + 'T12:00:00').toLocaleDateString('pt-BR')}</span></>}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-2">Slots ({diasSel.length})</p>
              {diasSel.map(dia => {
                const ov = overrides[dia]
                return (
                  <div key={dia} className="flex items-center gap-2 text-sm py-1.5 border-b border-[#F0F0F0]">
                    <span className="w-8 text-[#4A3AE8] font-bold">{DIAS_LABEL[dia]}</span>
                    <span>{horaInicio}–{horaFim}</span>
                    <span className="text-[#7F8C8D] text-xs">({duracao}min)</span>
                    {(ov?.sala_id || ov?.profissional_id) && (
                      <span className="text-[10px] text-[#4A3AE8] ml-auto">personalizado</span>
                    )}
                  </div>
                )
              })}
            </div>
            <div>
              <p className="text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-2">Planos ({planos.length})</p>
              {planos.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-[#F0F0F0]">
                  <span>{p.nome}</span>
                  <span className="font-semibold text-[#27AE60]">R$ {Number(p.valor_mensal).toFixed(2)}/mês</span>
                </div>
              ))}
            </div>
            <div className="bg-[#4A3AE8]/5 rounded-xl p-3 text-xs text-[#4A3AE8]">
              Ao confirmar, o sistema gerará automaticamente as sessões dos próximos 90 dias para cada slot.
            </div>
          </>}

          {err && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E8E8E8] flex gap-3 flex-shrink-0">
          {passo > 1 && (
            <button onClick={() => { setErr(''); setPasso(p => p - 1) }} className="flex items-center gap-1 h-11 px-4 rounded-xl border-2 border-[#E8E8E8] text-sm font-medium text-[#7F8C8D] hover:border-[#4A3AE8]/30">
              <ChevronLeft size={16} /> Voltar
            </button>
          )}
          {passo < 4 ? (
            <button onClick={avancar} className="flex-1 flex items-center justify-center gap-1 h-11 rounded-xl bg-[#4A3AE8] text-white text-sm font-semibold hover:bg-[#3D2ED6]">
              Próximo <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={salvar} disabled={saving} className="flex-1 h-11 rounded-xl bg-[#27AE60] text-white text-sm font-semibold hover:bg-[#219653] disabled:opacity-50 shadow-sm">
              {saving ? 'Criando turma…' : 'Criar Turma'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
