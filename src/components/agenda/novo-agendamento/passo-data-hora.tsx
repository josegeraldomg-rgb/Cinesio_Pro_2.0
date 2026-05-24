'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Clock, AlertTriangle, Zap, Check, X, CalendarDays } from 'lucide-react'
import { buscarSlotsAction, type SlotsResult } from '@/app/(dashboard)/agenda/actions'
import type { Ausencia } from '@/app/(dashboard)/agenda/agenda-page-client'

interface Props {
  profissionalId: string
  ausencias: Ausencia[]
  duracaoMinutos: number
  data: string
  hora: string
  forcar: boolean
  onChangeData: (d: string) => void
  onChangeHora: (h: string) => void
  onChangeForcar: (b: boolean) => void
}

const DIAS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

// Formata "2026-05-30" → "Sábado, 30 de maio de 2026"
function fmtDataExtenso(yyyymmdd: string): string {
  const d = new Date(`${yyyymmdd}T00:00:00`)
  const txt = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

function diasDoMes(ano: number, mes: number) {
  // Retorna matriz semanal (5-6 linhas × 7 dias). Preenche com nulls fora do mês.
  const primeiro = new Date(ano, mes, 1)
  const ultimo   = new Date(ano, mes + 1, 0)
  const diasNoMes = ultimo.getDate()
  const startDay  = primeiro.getDay()

  const grade: (Date | null)[][] = []
  let semana: (Date | null)[] = Array(startDay).fill(null)

  for (let d = 1; d <= diasNoMes; d++) {
    semana.push(new Date(ano, mes, d))
    if (semana.length === 7) {
      grade.push(semana)
      semana = []
    }
  }
  if (semana.length > 0) {
    while (semana.length < 7) semana.push(null)
    grade.push(semana)
  }
  return grade
}

export function PassoDataHora({
  profissionalId, ausencias, duracaoMinutos, data, hora, forcar,
  onChangeData, onChangeHora, onChangeForcar,
}: Props) {
  const hoje      = new Date(); hoje.setHours(0,0,0,0)
  const [base, setBase] = useState(() => {
    const d = data ? new Date(`${data}T00:00:00`) : new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  // Pré-computa datas bloqueadas (ausências do profissional + feriados globais)
  const datasBloqueadas = useMemo(() => {
    const set = new Set<string>()
    for (const a of ausencias) {
      // feriado (sem profissional) ou ausência desse profissional
      if (a.profissional_id !== null && a.profissional_id !== profissionalId) continue
      const ini = new Date(`${a.data_inicio}T00:00:00`)
      const fim = new Date(`${a.data_fim}T00:00:00`)
      const cursor = new Date(ini)
      while (cursor <= fim) {
        set.add(toDateStr(cursor))
        cursor.setDate(cursor.getDate() + 1)
      }
    }
    return set
  }, [ausencias, profissionalId])

  function diaBloqueado(d: Date) {
    if (d < hoje) return true
    return datasBloqueadas.has(toDateStr(d))
  }

  function mesAnterior() {
    setBase(new Date(base.getFullYear(), base.getMonth() - 1, 1))
  }
  function proximoMes() {
    setBase(new Date(base.getFullYear(), base.getMonth() + 1, 1))
  }

  // ── Modo COLAPSADO: data já escolhida ──
  if (data) {
    return (
      <div className="space-y-4">
        <div className="bg-[#27AE60]/5 border border-[#27AE60]/30 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#27AE60] text-white flex items-center justify-center flex-shrink-0">
            <Check size={18} strokeWidth={3} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#27AE60] uppercase tracking-wider">Data</p>
            <p className="text-sm font-bold text-[#2C3E50] flex items-center gap-2">
              <CalendarDays size={14} className="text-[#7F8C8D]" />
              {fmtDataExtenso(data)}
            </p>
          </div>
          <button
            onClick={() => { onChangeData(''); onChangeHora('') }}
            className="text-xs font-semibold text-[#7F8C8D] hover:text-[#E74C3C] flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white"
          >
            <X size={12} />
            Trocar data
          </button>
        </div>

        {/* Slots logo abaixo do card colapsado */}
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-4">
          <SlotsView
            profissionalId={profissionalId}
            data={data}
            duracaoMinutos={duracaoMinutos}
            hora={hora}
            forcar={forcar}
            onChangeHora={onChangeHora}
            onChangeForcar={onChangeForcar}
          />
        </div>
      </div>
    )
  }

  // ── Modo EXPANDIDO: escolhendo a data ──
  return (
    <div className="bg-white border border-[#E8E8E8] rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-[#4A3AE8] text-white text-xs font-bold flex items-center justify-center">4</span>
        <h3 className="font-bold text-[#2C3E50] text-sm">Escolha a data</h3>
      </div>

      {/* Calendário */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <button onClick={mesAnterior} className="p-1.5 rounded-full hover:bg-[#F8F9FA] text-[#7F8C8D]">
            <ChevronLeft size={16} />
          </button>
          <p className="text-sm font-bold text-[#2C3E50]">
            {MESES[base.getMonth()]} {base.getFullYear()}
          </p>
          <button onClick={proximoMes} className="p-1.5 rounded-full hover:bg-[#F8F9FA] text-[#7F8C8D]">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {DIAS_SHORT.map((d, i) => (
            <div key={i} className="text-[10px] font-bold text-[#7F8C8D] text-center uppercase">{d}</div>
          ))}
        </div>

        <div className="space-y-1">
          {diasDoMes(base.getFullYear(), base.getMonth()).map((semana, si) => (
            <div key={si} className="grid grid-cols-7 gap-1">
              {semana.map((d, di) => {
                if (!d) return <div key={di} />
                const str = toDateStr(d)
                const bloq = diaBloqueado(d)
                const today = d.getTime() === hoje.getTime()
                return (
                  <button
                    key={di}
                    onClick={() => !bloq && onChangeData(str)}
                    disabled={bloq}
                    className={`h-9 rounded-lg text-sm font-semibold transition-colors ${
                      bloq
                        ? 'text-[#BDC3C7] bg-[#F8F9FA] cursor-not-allowed'
                        : today
                          ? 'text-[#4A3AE8] bg-[#4A3AE8]/10 hover:bg-[#4A3AE8]/20'
                          : 'text-[#2C3E50] hover:bg-[#F8F9FA]'
                    }`}
                  >
                    {d.getDate()}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Legenda */}
        <div className="flex items-center gap-3 mt-3 text-[10px] text-[#7F8C8D]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#4A3AE8]" /> Hoje</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#BDC3C7]" /> Bloqueado (passado, feriado ou ausência)</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// Sub-componente: busca slots e renderiza
// ─────────────────────────────────────────
function SlotsView({
  profissionalId, data, duracaoMinutos, hora, forcar,
  onChangeHora, onChangeForcar,
}: {
  profissionalId: string; data: string; duracaoMinutos: number; hora: string; forcar: boolean
  onChangeHora: (h: string) => void; onChangeForcar: (b: boolean) => void
}) {
  const [loading, setLoading]     = useState(false)
  const [resultado, setResultado] = useState<SlotsResult | null>(null)

  useEffect(() => {
    let cancel = false
    setLoading(true)
    setResultado(null)
    buscarSlotsAction(profissionalId, data, duracaoMinutos).then(r => {
      if (!cancel) {
        setResultado(r)
        setLoading(false)
      }
    })
    return () => { cancel = true }
  }, [profissionalId, data, duracaoMinutos])

  const totalDisponiveis = resultado?.slots.filter(s => s.status === 'disponivel').length ?? 0
  const totalOcupados    = resultado?.slots.filter(s => s.status === 'ocupado').length ?? 0
  const motivoBloqueio = resultado?.motivo_bloqueio
  const labelBloqueio = motivoBloqueio === 'feriado' ? 'feriado da clínica'
                     : motivoBloqueio === 'ferias'   ? 'férias'
                     : motivoBloqueio === 'folga'    ? 'folga'
                     : 'ausência'

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-[#7F8C8D]" />
          <h4 className="text-sm font-bold text-[#2C3E50]">Escolha o horário</h4>
          {!loading && resultado && resultado.slots.length > 0 && (
            <span className="text-[10px] text-[#7F8C8D] font-medium">
              · <span className="text-[#27AE60] font-bold">{totalDisponiveis} livre{totalDisponiveis === 1 ? '' : 's'}</span>
              {totalOcupados > 0 && (
                <> · <span className="text-[#E74C3C] font-bold">{totalOcupados} ocupado{totalOcupados === 1 ? '' : 's'}</span></>
              )}
            </span>
          )}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={forcar}
            onChange={(e) => onChangeForcar(e.target.checked)}
            className="peer sr-only"
          />
          <span className="relative inline-flex h-4 w-7 items-center rounded-full bg-[#E8E8E8] peer-checked:bg-[#F39C12] transition-colors">
            <span className="inline-block h-3 w-3 transform rounded-full bg-white shadow translate-x-0.5 peer-checked:translate-x-[14px] transition-transform" />
          </span>
          <span className="text-[11px] font-semibold text-[#7F8C8D] flex items-center gap-1">
            <Zap size={11} />
            Forçar encaixe
          </span>
        </label>
      </div>

      {loading && (
        <p className="text-xs text-[#7F8C8D] text-center py-4">Calculando horários…</p>
      )}

      {!loading && resultado?.bloqueado_por_ausencia && (
        <div className="flex items-start gap-2 text-xs text-[#E74C3C] bg-[#E74C3C]/10 border border-[#E74C3C]/30 rounded-lg px-3 py-2">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>Bloqueado por <strong>{labelBloqueio}</strong>. Escolha outra data ou ajuste a ausência.</span>
        </div>
      )}

      {!loading && resultado?.sem_turnos && (
        <div className="flex items-start gap-2 text-xs text-[#E67E22] bg-[#E67E22]/10 border border-[#E67E22]/30 rounded-lg px-3 py-2">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>Profissional não tem turnos cadastrados para esse dia da semana.</span>
        </div>
      )}

      {!loading && resultado && resultado.slots.length > 0 && (
        <>
          <div className="grid grid-cols-5 gap-1.5">
            {resultado.slots.map(s => {
              const selecionado = hora === s.hhmm
              const ocupado     = s.status === 'ocupado'
              const liberado    = !ocupado || forcar

              const baseClass = 'h-9 rounded-lg text-xs font-bold transition-colors flex items-center justify-center'

              if (selecionado) {
                return (
                  <button
                    key={s.hhmm}
                    onClick={() => onChangeHora('')}
                    className={`${baseClass} ${ocupado ? 'bg-[#F39C12] text-white shadow-md' : 'bg-[#4A3AE8] text-white shadow-md'}`}
                    title="Clique para desmarcar"
                  >
                    {s.hhmm}
                  </button>
                )
              }

              if (ocupado && !forcar) {
                return (
                  <button
                    key={s.hhmm}
                    disabled
                    title="Horário já ocupado. Ative 'Forçar encaixe' para criar overbooking."
                    className={`${baseClass} bg-[#E74C3C]/8 text-[#E74C3C]/60 line-through cursor-not-allowed`}
                  >
                    {s.hhmm}
                  </button>
                )
              }

              if (ocupado && forcar) {
                return (
                  <button
                    key={s.hhmm}
                    onClick={() => {
                      if (confirm(`Criar encaixe às ${s.hhmm}? Esse horário já tem outro agendamento.`)) {
                        onChangeHora(s.hhmm)
                      }
                    }}
                    className={`${baseClass} bg-white text-[#F39C12] border-2 border-dashed border-[#F39C12]/60 hover:bg-[#F39C12]/10`}
                    title="Encaixe (overbooking)"
                  >
                    {s.hhmm}
                  </button>
                )
              }

              return (
                <button
                  key={s.hhmm}
                  onClick={() => onChangeHora(s.hhmm)}
                  className={`${baseClass} bg-[#F8F9FA] text-[#2C3E50] hover:bg-[#4A3AE8]/10 hover:text-[#4A3AE8]`}
                >
                  {s.hhmm}
                </button>
              )
            })}
          </div>

          {/* Legenda */}
          <div className="flex items-center gap-3 mt-3 text-[10px] text-[#7F8C8D] flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded bg-[#F8F9FA] border border-[#E8E8E8]" />
              Disponível
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded bg-[#E74C3C]/15" />
              <span className="line-through">Ocupado</span>
            </span>
            {forcar && (
              <span className="flex items-center gap-1.5 text-[#F39C12] font-semibold">
                <span className="inline-block w-3 h-3 rounded border-2 border-dashed border-[#F39C12]" />
                Encaixe possível
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded bg-[#4A3AE8]" />
              Selecionado
            </span>
          </div>
        </>
      )}
    </div>
  )
}
