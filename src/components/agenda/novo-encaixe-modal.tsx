'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  X, Zap, ChevronRight, ChevronLeft, User, Stethoscope,
  Calendar, Clock, AlertTriangle, CheckCircle2, Search,
} from 'lucide-react'
import { criarAgendamentoAction } from '@/app/(dashboard)/agenda/actions'
import type { Paciente, Profissional, Servico, Vinculo, Turno } from '@/app/(dashboard)/agenda/agenda-page-client'

// ─────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────
interface Props {
  pacientes:      Paciente[]
  profissionais:  Profissional[]
  servicos:       Servico[]
  vinculos:       Vinculo[]
  agendamentos:   any[]       // agendamentos já carregados na janela
  turnos:         Turno[]
  inicial?: { profissionalId?: string; data?: string; hora?: string }
  onClose: () => void
}

type Passo = 1 | 2 | 3 | 4

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
function minFromHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}
function hhmmFromMin(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}
function fmtDataExtenso(d: string): string {
  const [a, m, dia] = d.split('-').map(Number)
  return new Date(a, m - 1, dia).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
}
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

const PASSOS = [
  { n: 1 as Passo, label: 'Paciente' },
  { n: 2 as Passo, label: 'Profissional' },
  { n: 3 as Passo, label: 'Data' },
  { n: 4 as Passo, label: 'Grade' },
]

// ─────────────────────────────────────────────────────────────────
// Picker inline de Paciente (sem dropdown flutuante — funciona dentro
// de contêineres com overflow-y-auto sem ser clipado)
// ─────────────────────────────────────────────────────────────────
function PacientePicker({ pacientes, value, onChange }: {
  pacientes: Paciente[]; value: string; onChange: (id: string) => void
}) {
  const [filtro, setFiltro] = useState('')
  const selecionado = pacientes.find(p => p.id === value)

  const lista = useMemo(() => {
    const q = filtro.toLowerCase()
    if (!q) return pacientes
    return pacientes.filter(p =>
      p.nome.toLowerCase().includes(q) ||
      (p.telefone ?? '').includes(q) ||
      (p.cpf ?? '').includes(q)
    )
  }, [pacientes, filtro])

  // Quando há selecionado e sem filtro ativo: mostra card do selecionado
  if (selecionado && !filtro) {
    return (
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <User size={15} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#2C3E50]">{selecionado.nome}</p>
          <p className="text-xs text-[#7F8C8D]">{selecionado.telefone ?? 'Sem telefone'}</p>
        </div>
        <button
          type="button"
          onClick={() => { onChange('') }}
          className="text-[#BDC3C7] hover:text-[#E74C3C] p-1 rounded-lg"
          title="Trocar paciente"
        >
          <X size={15} />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Campo de busca */}
      <div className="flex items-center gap-2 border border-[#E8E8E8] rounded-xl px-3 h-11 bg-[#F8F9FA] focus-within:border-amber-400 focus-within:bg-white transition-colors">
        <Search size={15} className="text-[#BDC3C7] flex-shrink-0" />
        <input
          autoFocus
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          placeholder="Nome, telefone ou CPF…"
          className="flex-1 text-sm outline-none bg-transparent text-[#2C3E50] placeholder:text-[#BDC3C7]"
        />
        {filtro && (
          <button type="button" onClick={() => setFiltro('')}>
            <X size={13} className="text-[#BDC3C7] hover:text-[#7F8C8D]" />
          </button>
        )}
      </div>

      {/* Lista de resultados inline */}
      <ul className="border border-[#E8E8E8] rounded-xl overflow-hidden bg-white max-h-[280px] overflow-y-auto divide-y divide-[#F4F4F4]">
        {lista.length === 0 ? (
          <li className="px-4 py-6 text-xs text-[#7F8C8D] text-center">Nenhum paciente encontrado</li>
        ) : lista.map(p => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => { onChange(p.id); setFiltro('') }}
              className={`w-full text-left px-4 py-3 hover:bg-[#FFF8F0] transition-colors flex items-center gap-3 ${
                p.id === value ? 'bg-amber-50' : ''
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-[#F0F0F0] flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-[#7F8C8D]">
                {p.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#2C3E50] truncate">{p.nome}</p>
                {p.telefone && <p className="text-[11px] text-[#7F8C8D]">{p.telefone}</p>}
              </div>
              {p.id === value && <CheckCircle2 size={14} className="text-amber-500 flex-shrink-0" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Timeline visual do Step 4
// ─────────────────────────────────────────────────────────────────
const PX_PER_MIN = 1.4   // 60min → 84px, 10h → 840px

function Timeline({ agendamentos, turnos, profId, data, hora, duracao }: {
  agendamentos: any[]; turnos: Turno[]
  profId: string; data: string; hora: string; duracao: number
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const diaSemana = data ? new Date(`${data}T00:00:00`).getDay() : -1
  const turnosDoDia = useMemo(() =>
    turnos.filter(t => t.profissional_id === profId && t.dia_semana === diaSemana && t.ativo),
    [turnos, profId, diaSemana]
  )

  const workStart = turnosDoDia.length
    ? Math.min(...turnosDoDia.map(t => minFromHHMM(t.hora_inicio)))
    : 8 * 60
  const workEnd = turnosDoDia.length
    ? Math.max(...turnosDoDia.map(t => minFromHHMM(t.hora_fim)))
    : 18 * 60
  const totalMin    = workEnd - workStart
  const totalHeight = totalMin * PX_PER_MIN

  const ags = useMemo(() =>
    agendamentos.filter(a => {
      const id = a.profissional_id ?? a.profissionais?.id
      return id === profId && a.data_hora?.startsWith(data) && a.status !== 'cancelado'
    }),
    [agendamentos, profId, data]
  )

  const encaixeStart = hora ? minFromHHMM(hora) : null
  const encaixeEnd   = encaixeStart !== null ? encaixeStart + duracao : null

  const conflitos = useMemo(() => {
    if (encaixeStart === null) return []
    return ags.filter(a => {
      const agStart = minFromHHMM(a.data_hora.slice(11, 16))
      const agEnd   = agStart + a.duracao_minutos
      return encaixeStart < agEnd && encaixeEnd! > agStart
    })
  }, [ags, encaixeStart, encaixeEnd])

  const temConflito = conflitos.length > 0

  // Marcadores de hora
  const horaMarkers: number[] = []
  for (let m = workStart; m <= workEnd; m += 60) horaMarkers.push(m)

  // Scroll automático para mostrar o encaixe
  useEffect(() => {
    if (!scrollRef.current || encaixeStart === null) return
    const top = (encaixeStart - workStart) * PX_PER_MIN
    scrollRef.current.scrollTo({ top: Math.max(0, top - 80), behavior: 'smooth' })
  }, [hora, encaixeStart, workStart])

  if (turnosDoDia.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-[#7F8C8D]">
        Profissional não tem turno cadastrado neste dia da semana.
      </div>
    )
  }

  return (
    <div>
      {/* Aviso de conflito */}
      {temConflito && (
        <div className="mb-3 flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">Conflito detectado</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Este horário colide com{' '}
              {conflitos.map(c => c.pacientes?.nome ?? 'um paciente').join(', ')}.{' '}
              O encaixe será criado mesmo assim (sobreposição intencional).
            </p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div ref={scrollRef} className="relative overflow-y-auto rounded-xl border border-[#E8E8E8] bg-[#FAFAFA]"
        style={{ maxHeight: '320px' }}>
        <div className="relative" style={{ height: `${totalHeight}px`, minHeight: '200px' }}>
          {/* Marcadores de hora */}
          {horaMarkers.map(m => (
            <div key={m} className="absolute left-0 right-0 flex items-center"
              style={{ top: `${(m - workStart) * PX_PER_MIN}px` }}>
              <span className="w-12 text-[10px] font-semibold text-[#BDC3C7] pl-2 flex-shrink-0">
                {hhmmFromMin(m)}
              </span>
              <div className="flex-1 border-t border-dashed border-[#E8E8E8]" />
            </div>
          ))}

          {/* Marcadores de meia hora */}
          {horaMarkers.slice(0, -1).map(m => (
            <div key={`${m}-30`} className="absolute left-12 right-0 border-t border-[#F4F4F4]"
              style={{ top: `${(m + 30 - workStart) * PX_PER_MIN}px` }} />
          ))}

          {/* Blocos de agendamentos existentes */}
          {ags.map(ag => {
            const agStart  = minFromHHMM(ag.data_hora.slice(11, 16))
            const agEnd    = agStart + ag.duracao_minutos
            const top      = (agStart - workStart) * PX_PER_MIN
            const height   = (agEnd - agStart) * PX_PER_MIN
            const isConflito = conflitos.includes(ag)

            return (
              <div key={ag.id}
                className={`absolute left-12 right-2 rounded-lg px-2.5 py-1 ${
                  isConflito
                    ? 'bg-amber-100 border border-amber-400'
                    : 'bg-[#3498DB]/12 border border-[#3498DB]/30'
                }`}
                style={{ top: `${top}px`, height: `${Math.max(height, 24)}px`, zIndex: 10 }}>
                <p className={`text-[11px] font-bold truncate leading-tight ${isConflito ? 'text-amber-700' : 'text-[#1c6391]'}`}>
                  {isConflito && '⚠ '}{ag.pacientes?.nome ?? '—'}
                </p>
                {height >= 28 && (
                  <p className={`text-[10px] truncate ${isConflito ? 'text-amber-600' : 'text-[#3498DB]'}`}>
                    {ag.servicos?.nome} · {ag.data_hora.slice(11, 16)}–{hhmmFromMin(agEnd)}
                  </p>
                )}
              </div>
            )
          })}

          {/* Bloco "SEU ENCAIXE" */}
          {encaixeStart !== null && encaixeEnd !== null && (
            <div
              className={`absolute left-12 right-2 rounded-lg px-2.5 py-1 border-2 border-dashed ${
                temConflito
                  ? 'bg-amber-50 border-amber-500'
                  : 'bg-[#E67E22]/10 border-[#E67E22]'
              }`}
              style={{
                top:    `${(encaixeStart - workStart) * PX_PER_MIN}px`,
                height: `${Math.max(duracao * PX_PER_MIN, 28)}px`,
                zIndex: 20,
              }}>
              <p className={`text-[11px] font-bold ${temConflito ? 'text-amber-700' : 'text-[#E67E22]'}`}>
                ⚡ SEU ENCAIXE
              </p>
              <p className={`text-[10px] ${temConflito ? 'text-amber-600' : 'text-[#E67E22]/80'}`}>
                {hora} – {hhmmFromMin(encaixeEnd)}
              </p>
            </div>
          )}
        </div>
      </div>

      {ags.length === 0 && !temConflito && hora && (
        <p className="mt-2 text-center text-xs text-[#27AE60] font-semibold">
          ✓ Nenhum agendamento no dia — sem conflitos.
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Modal principal — 4 passos
// ─────────────────────────────────────────────────────────────────
export function NovoEncaixeModal({
  pacientes, profissionais, servicos, vinculos, agendamentos, turnos, inicial, onClose,
}: Props) {
  const hoje = new Date().toISOString().slice(0, 10)

  const [passo,       setPasso]      = useState<Passo>(inicial?.profissionalId ? 3 : 1)
  const [pacienteId,  setPacienteId] = useState('')
  const [profId,      setProfId]     = useState(inicial?.profissionalId ?? '')
  const [servicoId,   setServicoId]  = useState('')
  const [data,        setData]       = useState(inicial?.data ?? hoje)
  const [hora,        setHora]       = useState(inicial?.hora ?? '')
  const [duracao,     setDuracao]    = useState(30)
  const [loading,     setLoading]    = useState(false)
  const [err,         setErr]        = useState<string | null>(null)
  const [ok,          setOk]         = useState(false)

  // Serviços do profissional selecionado
  const servicosDoProfissional = useMemo(() => {
    if (!profId) return servicos
    const ids = vinculos.filter(v => v.profissional_id === profId).map(v => v.servico_id)
    return servicos.filter(s => ids.includes(s.id))
  }, [profId, servicos, vinculos])

  // Ao selecionar serviço, ajusta duração padrão
  function handleServicoChange(id: string) {
    setServicoId(id)
    const s = servicos.find(x => x.id === id)
    if (s?.duracao_minutos) setDuracao(s.duracao_minutos)
  }

  // Conflitos (para o Step 4)
  const encaixeStart = hora ? minFromHHMM(hora) : null
  const encaixeEnd   = encaixeStart !== null ? encaixeStart + duracao : null
  const agsDoSlot = agendamentos.filter(a => {
    const id = a.profissional_id ?? a.profissionais?.id
    return id === profId && a.data_hora?.startsWith(data) && a.status !== 'cancelado'
  })
  const temConflito = useMemo(() => {
    if (encaixeStart === null) return false
    return agsDoSlot.some(a => {
      const agStart = minFromHHMM(a.data_hora.slice(11, 16))
      const agEnd   = agStart + a.duracao_minutos
      return encaixeStart < agEnd && encaixeEnd! > agStart
    })
  }, [agsDoSlot, encaixeStart, encaixeEnd])

  // ── Avançar / Voltar ──────────────────────────────────────────
  function avancar() {
    setErr(null)
    if (passo === 1 && !pacienteId) { setErr('Selecione um paciente.'); return }
    if (passo === 2 && !profId)     { setErr('Selecione um profissional.'); return }
    if (passo === 2 && !servicoId)  { setErr('Selecione um serviço.'); return }
    if (passo === 3 && !data)       { setErr('Selecione uma data.'); return }
    setPasso(p => (p < 4 ? (p + 1) as Passo : p))
  }
  function voltar() { setPasso(p => (p > 1 ? (p - 1) as Passo : p)) }

  // ── Confirmar encaixe ─────────────────────────────────────────
  async function confirmar() {
    if (!hora) { setErr('Defina o horário do encaixe.'); return }
    setLoading(true); setErr(null)

    const data_hora = `${data}T${hora}:00`
    const r = await criarAgendamentoAction({
      paciente_id:      pacienteId,
      profissional_id:  profId,
      servico_id:       servicoId,
      data_hora,
      duracao_minutos:  duracao,
      forcar_overbooking: true,
    })

    setLoading(false)
    if ('error' in r) { setErr(r.error ?? 'Erro desconhecido.'); return }
    setOk(true)
    setTimeout(() => { onClose(); window.location.reload() }, 1800)
  }

  // ── Nomes selecionados (para resumo) ──────────────────────────
  const pacNome  = pacientes.find(p => p.id === pacienteId)?.nome ?? '—'
  const profNome = profissionais.find(p => p.id === profId)?.nome ?? '—'
  const servNome = servicos.find(s => s.id === servicoId)?.nome ?? '—'

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Zap size={18} className="text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-[#2C3E50] text-base leading-tight">Encaixe Rápido</h2>
              <p className="text-[11px] text-[#7F8C8D]">Sobreposição intencional de horário</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#F8F9FA] text-[#7F8C8D]">
            <X size={18} />
          </button>
        </div>

        {/* ── Stepper ── */}
        <div className="flex items-center gap-0 px-6 py-3 border-b border-[#F0F0F0] flex-shrink-0">
          {PASSOS.map((p, i) => (
            <div key={p.n} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  passo === p.n
                    ? 'bg-amber-500 text-white shadow-md'
                    : passo > p.n
                      ? 'bg-[#27AE60] text-white'
                      : 'bg-[#F0F0F0] text-[#BDC3C7]'
                }`}>
                  {passo > p.n ? <CheckCircle2 size={14} /> : p.n}
                </div>
                <span className={`text-[10px] mt-1 font-semibold ${passo === p.n ? 'text-amber-600' : passo > p.n ? 'text-[#27AE60]' : 'text-[#BDC3C7]'}`}>
                  {p.label}
                </span>
              </div>
              {i < PASSOS.length - 1 && (
                <div className={`h-px flex-1 mx-1 mb-4 ${passo > p.n ? 'bg-[#27AE60]' : 'bg-[#E8E8E8]'}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Corpo ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-[380px]">

          {ok ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-full bg-[#27AE60]/15 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-[#27AE60]" />
              </div>
              <p className="font-bold text-[#2C3E50] text-lg">Encaixe criado!</p>
              <p className="text-sm text-[#7F8C8D] mt-1">
                {pacNome} · {hora} · {data.split('-').reverse().join('/')}
              </p>
            </div>
          ) : (
            <>
              {/* ── PASSO 1: Paciente ── */}
              {passo === 1 && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-[#7F8C8D] mb-1 uppercase tracking-wider">Passo 1 — Paciente</p>
                    <h3 className="text-base font-bold text-[#2C3E50] mb-4">Quem vai ser atendido?</h3>
                  </div>
                  <PacientePicker pacientes={pacientes} value={pacienteId} onChange={setPacienteId} />
                </div>
              )}

              {/* ── PASSO 2: Profissional + Serviço ── */}
              {passo === 2 && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-[#7F8C8D] mb-1 uppercase tracking-wider">Passo 2 — Profissional</p>
                    <h3 className="text-base font-bold text-[#2C3E50] mb-4">Quem vai realizar o atendimento?</h3>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#7F8C8D] mb-1.5 block">Profissional *</label>
                    <div className="grid grid-cols-1 gap-2">
                      {profissionais.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setProfId(p.id); setServicoId('') }}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                            profId === p.id
                              ? 'border-amber-400 bg-amber-50'
                              : 'border-[#E8E8E8] hover:border-amber-200 hover:bg-[#FAFAFA]'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ background: p.cor_agenda ?? '#4A3AE8' }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#2C3E50]">{p.nome}</p>
                            {p.especialidade && <p className="text-[11px] text-[#7F8C8D]">{p.especialidade}</p>}
                          </div>
                          {profId === p.id && <CheckCircle2 size={16} className="text-amber-500 flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {profId && (
                    <div>
                      <label className="text-xs font-semibold text-[#7F8C8D] mb-1.5 block">
                        Serviço *{' '}
                        {servicosDoProfissional.length < servicos.length && (
                          <span className="font-normal text-amber-600">· exibindo serviços deste profissional</span>
                        )}
                      </label>
                      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                        {servicosDoProfissional.length === 0 ? (
                          <p className="text-xs text-[#7F8C8D] italic p-2">
                            Nenhum serviço vinculado a este profissional.
                          </p>
                        ) : servicosDoProfissional.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleServicoChange(s.id)}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all ${
                              servicoId === s.id
                                ? 'border-amber-400 bg-amber-50'
                                : 'border-[#E8E8E8] hover:border-amber-200'
                            }`}
                          >
                            <Stethoscope size={14} className={servicoId === s.id ? 'text-amber-500' : 'text-[#7F8C8D]'} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-[#2C3E50]">{s.nome}</p>
                              {s.duracao_minutos && (
                                <p className="text-[11px] text-[#7F8C8D]">{s.duracao_minutos} min</p>
                              )}
                            </div>
                            {servicoId === s.id && <CheckCircle2 size={16} className="text-amber-500 flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── PASSO 3: Data ── */}
              {passo === 3 && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-[#7F8C8D] mb-1 uppercase tracking-wider">Passo 3 — Data</p>
                    <h3 className="text-base font-bold text-[#2C3E50] mb-4">Quando será o encaixe?</h3>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#7F8C8D] mb-1.5 block">Data *</label>
                    <input
                      type="date"
                      value={data}
                      min={hoje}
                      onChange={e => setData(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-[#E8E8E8] text-sm outline-none focus:border-amber-400 bg-[#F8F9FA]"
                    />
                  </div>
                  {data && (
                    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      <Calendar size={16} className="text-amber-600 flex-shrink-0" />
                      <p className="text-sm font-semibold text-[#2C3E50]">
                        {capitalize(fmtDataExtenso(data))}
                      </p>
                    </div>
                  )}
                  {/* Resumo do que foi selecionado */}
                  <div className="bg-[#F8F9FA] rounded-xl px-4 py-3 space-y-1 text-xs text-[#7F8C8D]">
                    <div className="flex items-center gap-2"><User size={12} /><span className="font-semibold text-[#2C3E50]">{pacNome}</span></div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: profissionais.find(p=>p.id===profId)?.cor_agenda ?? '#4A3AE8' }} /><span>{profNome}</span></div>
                    <div className="flex items-center gap-2"><Stethoscope size={12} /><span>{servNome}</span></div>
                  </div>
                </div>
              )}

              {/* ── PASSO 4: Grade ── */}
              {passo === 4 && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-[#7F8C8D] mb-1 uppercase tracking-wider">Passo 4 — Grade</p>
                    <h3 className="text-base font-bold text-[#2C3E50] mb-1">Selecione o horário</h3>
                    <p className="text-xs text-[#7F8C8D] mb-4">
                      {profNome} · {data.split('-').reverse().join('/')}
                    </p>
                  </div>

                  {/* Horário + Duração */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Horário *</label>
                      <input
                        type="time"
                        value={hora}
                        onChange={e => setHora(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-[#E8E8E8] text-sm outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Duração (min)</label>
                      <input
                        type="number"
                        value={duracao}
                        min={5}
                        max={480}
                        step={5}
                        onChange={e => setDuracao(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-xl border border-[#E8E8E8] text-sm outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  {/* Timeline visual */}
                  <Timeline
                    agendamentos={agendamentos}
                    turnos={turnos}
                    profId={profId}
                    data={data}
                    hora={hora}
                    duracao={duracao}
                  />

                  {/* Botão confirmar */}
                  {hora && (
                    <button
                      type="button"
                      onClick={confirmar}
                      disabled={loading}
                      className={`w-full py-3 rounded-xl font-bold text-sm text-white shadow-md transition-all disabled:opacity-50 ${
                        temConflito
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-[#E67E22] hover:bg-[#ca6f1e]'
                      }`}
                    >
                      {loading
                        ? 'Criando encaixe…'
                        : temConflito
                          ? '⚡ Confirmar Encaixe (com sobreposição)'
                          : '⚡ Confirmar Encaixe'
                      }
                    </button>
                  )}
                </div>
              )}

              {/* Erro */}
              {err && (
                <div className="mt-3 text-xs text-[#E74C3C] bg-[#E74C3C]/10 border border-[#E74C3C]/30 rounded-xl px-3 py-2">
                  {err}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {!ok && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#E8E8E8] flex-shrink-0">
            <button
              type="button"
              onClick={passo === 1 ? onClose : voltar}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-[#7F8C8D] hover:bg-[#F8F9FA]"
            >
              <ChevronLeft size={15} />
              {passo === 1 ? 'Cancelar' : 'Voltar'}
            </button>

            {passo < 4 && (
              <button
                type="button"
                onClick={avancar}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-md"
              >
                Avançar
                <ChevronRight size={15} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
