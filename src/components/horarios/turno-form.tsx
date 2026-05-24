'use client'

import { useState } from 'react'
import { X, AlertCircle, Trash2, Coffee } from 'lucide-react'
import {
  salvarTurnoAction,
  excluirTurnoAction,
  criarTurnosEmMultiplosDiasAction,
} from '@/app/(dashboard)/horarios/actions'
import { DIAS_SEMANA } from '@/lib/scheduling/gerar-slots'
import type { Turno, Profissional } from '@/app/(dashboard)/horarios/horarios-client'

interface Props {
  turno: Turno | null              // null = criando; preenchido = editando
  diaSemanaPadrao: number          // pré-seleciona um dia ao criar
  profissionais: Profissional[]
  profissionalIdPadrao: string     // pré-seleciona o profissional ao criar
  onClose: () => void
}

function hhmm(s?: string | null) {
  if (!s) return ''
  return s.length > 5 ? s.slice(0, 5) : s
}

export function TurnoForm({
  turno,
  diaSemanaPadrao,
  profissionais,
  profissionalIdPadrao,
  onClose,
}: Props) {
  const isEdit = !!turno

  const [profId, setProfId] = useState<string>(turno?.profissional_id ?? profissionalIdPadrao)
  const [diasSelecionados, setDiasSelecionados] = useState<Set<number>>(
    () => new Set<number>(turno ? [turno.dia_semana] : [diaSemanaPadrao])
  )
  const [horaInicio, setHoraInicio]         = useState(hhmm(turno?.hora_inicio) || '08:00')
  const [horaFim, setHoraFim]               = useState(hhmm(turno?.hora_fim)    || '12:00')
  const [intervalo, setIntervalo]           = useState<number>(turno?.intervalo_minutos ?? 0)
  const [ativo, setAtivo]                   = useState<boolean>(turno?.ativo ?? true)

  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function toggleDia(dia: number) {
    if (isEdit) return  // ao editar, dia é fixo
    setDiasSelecionados(s => {
      const ns = new Set(s)
      if (ns.has(dia)) ns.delete(dia); else ns.add(dia)
      return ns
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErr(null)

    let r: { error?: string; success?: boolean; count?: number } | undefined

    if (isEdit && turno) {
      // Update tradicional: 1 registro só
      const fd = new FormData()
      fd.set('id', turno.id)
      fd.set('profissional_id', profId)
      fd.set('dia_semana', String(turno.dia_semana))
      fd.set('hora_inicio', horaInicio)
      fd.set('hora_fim', horaFim)
      fd.set('intervalo_minutos', String(intervalo))
      fd.set('ativo', ativo ? 'on' : 'off')
      r = await salvarTurnoAction(fd)
    } else {
      if (diasSelecionados.size === 0) {
        setErr('Selecione ao menos um dia da semana.')
        setLoading(false)
        return
      }
      r = await criarTurnosEmMultiplosDiasAction({
        profissional_id: profId,
        dias_semana: [...diasSelecionados],
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        intervalo_minutos: intervalo,
        ativo,
      })
    }

    setLoading(false)
    if (r?.error) setErr(r.error)
    else { onClose(); window.location.reload() }
  }

  async function handleDelete() {
    if (!turno) return
    if (!confirm('Excluir este turno?')) return
    setLoading(true)
    const r = await excluirTurnoAction(turno.id)
    setLoading(false)
    if (r?.error) setErr(r.error)
    else { onClose(); window.location.reload() }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8]">
          <div>
            <h2 className="font-bold text-[#2C3E50] text-lg">
              {isEdit ? 'Editar Turno' : 'Novo Turno'}
            </h2>
            <p className="text-xs text-[#7F8C8D] mt-0.5">
              {isEdit
                ? `Alterando o turno existente (${DIAS_SEMANA[turno!.dia_semana].nome})`
                : 'Crie em um ou vários dias de uma vez'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#F8F9FA] text-[#7F8C8D]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Profissional */}
          <div>
            <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Profissional *</label>
            <select
              required
              value={profId}
              onChange={(e) => setProfId(e.target.value)}
              disabled={isEdit}
              className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm bg-white outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10 disabled:bg-[#F8F9FA] disabled:cursor-not-allowed"
            >
              {profissionais.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nome} {p.especialidade ? `· ${p.especialidade}` : ''}
                </option>
              ))}
            </select>
            {isEdit && (
              <p className="text-[11px] text-[#7F8C8D] mt-1">
                Para mover o turno para outro profissional, exclua e crie um novo.
              </p>
            )}
          </div>

          {/* Dias da semana (chips) */}
          <div>
            <label className="text-xs font-semibold text-[#7F8C8D] mb-1.5 block">
              Dia(s) da semana *
              {!isEdit && (
                <span className="ml-2 font-normal text-[#BDC3C7]">
                  ({diasSelecionados.size} selecionado{diasSelecionados.size === 1 ? '' : 's'})
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DIAS_SEMANA.map(d => {
                const ativo = diasSelecionados.has(d.id)
                return (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => toggleDia(d.id)}
                    disabled={isEdit}
                    className={`flex-1 min-w-[60px] py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                      ativo
                        ? 'bg-[#4A3AE8] text-white shadow-md'
                        : 'bg-[#F8F9FA] text-[#7F8C8D] hover:bg-[#E8E8E8]'
                    } ${isEdit ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                  >
                    {d.sigla}
                  </button>
                )
              })}
            </div>
            {!isEdit && (
              <div className="flex gap-2 mt-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setDiasSelecionados(new Set([1, 2, 3, 4, 5]))}
                  className="text-[#4A3AE8] font-semibold hover:underline"
                >
                  Dias úteis
                </button>
                <span className="text-[#BDC3C7]">·</span>
                <button
                  type="button"
                  onClick={() => setDiasSelecionados(new Set([0, 6]))}
                  className="text-[#4A3AE8] font-semibold hover:underline"
                >
                  Fim de semana
                </button>
                <span className="text-[#BDC3C7]">·</span>
                <button
                  type="button"
                  onClick={() => setDiasSelecionados(new Set([0, 1, 2, 3, 4, 5, 6]))}
                  className="text-[#4A3AE8] font-semibold hover:underline"
                >
                  Todos os dias
                </button>
                <span className="text-[#BDC3C7]">·</span>
                <button
                  type="button"
                  onClick={() => setDiasSelecionados(new Set())}
                  className="text-[#E74C3C] font-semibold hover:underline"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>

          {/* Horas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Hora de início *</label>
              <input
                type="time"
                required
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Hora de fim *</label>
              <input
                type="time"
                required
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              />
            </div>
          </div>

          {/* Granularidade dos slots */}
          <div>
            <label className="text-xs font-semibold text-[#7F8C8D] mb-1 flex items-center gap-1">
              <Coffee size={12} />
              Intervalo entre slots (minutos)
            </label>
            <input
              type="number"
              min={0}
              value={intervalo}
              onChange={(e) => setIntervalo(parseInt(e.target.value) || 0)}
              placeholder="Ex: 15, 30 ou 60"
              className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
            />
            <p className="text-[11px] text-[#7F8C8D] mt-1">
              <strong>De quantos em quantos minutos um novo horário é oferecido</strong> dentro deste turno.
              Ex: com intervalo 30min, o sistema mostra slots às 08:00, 08:30, 09:00…
              Se ficar em 0, o sistema usa a duração do serviço como passo.
            </p>
          </div>

          {/* Ativo */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="peer sr-only"
            />
            <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-[#E8E8E8] peer-checked:bg-[#27AE60] transition-colors">
              <span className="inline-block h-5 w-5 transform rounded-full bg-white shadow translate-x-0.5 peer-checked:translate-x-[22px] transition-transform" />
            </span>
            <div>
              <span className="text-sm font-semibold text-[#2C3E50]">Turno ativo</span>
              <p className="text-xs text-[#7F8C8D]">Gera slots na agenda</p>
            </div>
          </label>

          {err && (
            <div className="flex items-start gap-2 text-xs text-[#E74C3C] bg-[#E74C3C]/10 border border-[#E74C3C]/30 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{err}</span>
            </div>
          )}

          {/* Rodapé */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E8E8E8]">
            {isEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center gap-1.5 text-sm text-[#E74C3C] hover:bg-[#E74C3C]/10 px-3 py-2 rounded-full font-semibold disabled:opacity-50"
              >
                <Trash2 size={14} />
                Excluir
              </button>
            ) : <div />}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-sm font-medium text-[#7F8C8D] hover:bg-[#F8F9FA]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || (!isEdit && diasSelecionados.size === 0)}
                className="bg-[#4A3AE8] text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#3829c7] disabled:opacity-50 shadow-md"
              >
                {loading
                  ? 'Salvando…'
                  : isEdit
                    ? 'Salvar alterações'
                    : `Criar ${diasSelecionados.size > 1 ? `${diasSelecionados.size} turnos` : 'turno'}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
