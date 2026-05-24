'use client'

import { useState } from 'react'
import { X, AlertCircle, Trash2, Calendar, Plane, HelpCircle, Users } from 'lucide-react'
import { salvarAusenciaAction, excluirAusenciaAction } from '@/app/(dashboard)/horarios/actions'
import type { Ausencia, Profissional } from '@/app/(dashboard)/horarios/horarios-client'

interface Props {
  ausencia: Ausencia | null
  profissionais: Profissional[]
  profissionalIdPadrao: string
  onClose: () => void
}

const TIPOS = [
  { id: 'folga',  label: 'Folga',  cor: '#E67E22', Icon: Calendar,    desc: 'Dia(s) de folga do profissional'           },
  { id: 'ferias', label: 'Férias', cor: '#3498DB', Icon: Plane,        desc: 'Período de afastamento prolongado'         },
  { id: 'outro',  label: 'Outro',  cor: '#8B5CF6', Icon: HelpCircle,   desc: 'Atestado, licença ou outro motivo'         },
] as const

export function AusenciaForm({ ausencia, profissionais, profissionalIdPadrao, onClose }: Props) {
  const tipo0 = (
    !ausencia || ausencia.tipo === 'feriado'
      ? 'folga'
      : ausencia.tipo
  ) as 'folga' | 'ferias' | 'outro'

  const [tipo, setTipo]       = useState<'folga' | 'ferias' | 'outro'>(tipo0)
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState<string | null>(null)

  // Multi-profissional (apenas na criação; na edição fica fixo)
  const modoEdicao = !!ausencia
  const [profIds, setProfIds] = useState<string[]>(
    ausencia?.profissional_id
      ? [ausencia.profissional_id]
      : profissionalIdPadrao ? [profissionalIdPadrao] : []
  )

  // Datas e horários controlados
  const [dataIni, setDataIni] = useState(ausencia?.data_inicio ?? '')
  const [horaIni, setHoraIni] = useState(ausencia?.hora_inicio ?? '')
  const [dataFim, setDataFim] = useState(ausencia?.data_fim ?? '')
  const [horaFim, setHoraFim] = useState(ausencia?.hora_fim ?? '')

  function toggleProf(id: string) {
    if (modoEdicao) return
    setProfIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  function toggleTodos() {
    setProfIds(prev =>
      prev.length === profissionais.length ? [] : profissionais.map(p => p.id)
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (profIds.length === 0) {
      setErr('Selecione ao menos um profissional.')
      return
    }
    setLoading(true)
    setErr(null)
    const fd = new FormData(e.currentTarget)
    fd.set('tipo', tipo)
    const r = await salvarAusenciaAction(fd)
    setLoading(false)
    if (r?.error) setErr(r.error)
    else { onClose(); window.location.reload() }
  }

  async function handleDelete() {
    if (!ausencia) return
    if (!confirm('Excluir esta ausência?')) return
    setLoading(true)
    const r = await excluirAusenciaAction(ausencia.id)
    setLoading(false)
    if (r?.error) setErr(r.error)
    else { onClose(); window.location.reload() }
  }

  const tipoAtivo = TIPOS.find(t => t.id === tipo)!

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg my-8">

        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8]">
          <h2 className="font-bold text-[#2C3E50] text-lg">
            {ausencia ? 'Editar Ausência' : 'Nova Ausência'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#F8F9FA] text-[#7F8C8D]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {ausencia && <input type="hidden" name="id" value={ausencia.id} />}

          {/* Campos ocultos com valores controlados */}
          <input type="hidden" name="data_inicio" value={dataIni} />
          <input type="hidden" name="data_fim"    value={dataFim} />
          <input type="hidden" name="hora_inicio" value={horaIni} />
          <input type="hidden" name="hora_fim"    value={horaFim} />
          {profIds.map(id => (
            <input key={id} type="hidden" name="profissional_id" value={id} />
          ))}

          {/* ── Tipo ── */}
          <div>
            <label className="text-xs font-semibold text-[#7F8C8D] mb-2 block">Tipo *</label>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS.map(t => {
                const Icon = t.Icon
                const ativo = tipo === t.id
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setTipo(t.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      ativo ? 'text-white shadow-md' : 'border-[#E8E8E8] bg-white text-[#7F8C8D] hover:border-[#BDC3C7]'
                    }`}
                    style={ativo ? { background: t.cor, borderColor: t.cor } : undefined}
                  >
                    <Icon size={18} />
                    <span className="text-xs font-semibold">{t.label}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-[#7F8C8D] mt-1.5">{tipoAtivo.desc}</p>
          </div>

          {/* ── Profissionais ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#7F8C8D] flex items-center gap-1.5">
                <Users size={13} />
                {modoEdicao ? 'Profissional' : 'Profissional(is) *'}
              </label>
              {!modoEdicao && profissionais.length > 1 && (
                <button
                  type="button"
                  onClick={toggleTodos}
                  className="text-[10px] font-semibold text-[#4A3AE8] hover:underline"
                >
                  {profIds.length === profissionais.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {profissionais.map(p => {
                const sel = profIds.includes(p.id)
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => toggleProf(p.id)}
                    disabled={modoEdicao}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      sel
                        ? 'text-white border-transparent shadow-sm'
                        : 'bg-white text-[#7F8C8D] border-[#E8E8E8] hover:border-[#4A3AE8] hover:text-[#4A3AE8]'
                    } ${modoEdicao ? 'cursor-default' : 'cursor-pointer'}`}
                    style={sel ? { background: tipoAtivo.cor, borderColor: tipoAtivo.cor } : undefined}
                  >
                    {p.nome}
                  </button>
                )
              })}
            </div>
            {!modoEdicao && profIds.length > 1 && (
              <p className="text-[11px] text-[#4A3AE8] mt-1.5 font-medium">
                {profIds.length} profissionais selecionados — serão criadas {profIds.length} ausências.
              </p>
            )}
          </div>

          {/* ── Início: data + hora ── */}
          <div>
            <label className="text-xs font-semibold text-[#7F8C8D] mb-1.5 block">Início *</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                required
                value={dataIni}
                onChange={e => {
                  setDataIni(e.target.value)
                  // Se data fim ainda não foi definida ou ficou antes, avança
                  if (!dataFim || e.target.value > dataFim) setDataFim(e.target.value)
                }}
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              />
              <input
                type="time"
                value={horaIni}
                onChange={e => setHoraIni(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10 text-[#2C3E50]"
              />
            </div>
          </div>

          {/* ── Fim: data + hora ── */}
          <div>
            <label className="text-xs font-semibold text-[#7F8C8D] mb-1.5 block">Fim *</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                required
                value={dataFim}
                min={dataIni || undefined}
                onChange={e => setDataFim(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              />
              <input
                type="time"
                value={horaFim}
                onChange={e => setHoraFim(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10 text-[#2C3E50]"
              />
            </div>
            <p className="text-[11px] text-[#7F8C8D] mt-1">
              Hora opcional — vazio bloqueia o dia inteiro
            </p>
          </div>

          {/* Preview do bloqueio */}
          {(dataIni || horaIni || horaFim) && (
            <div
              className="rounded-xl px-4 py-3 text-xs font-medium"
              style={{ background: `${tipoAtivo.cor}12`, color: tipoAtivo.cor, border: `1px solid ${tipoAtivo.cor}30` }}
            >
              {dataIni && dataFim && dataIni === dataFim
                ? <>📅 {new Date(`${dataIni}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</>
                : dataIni && dataFim
                  ? <>📅 {new Date(`${dataIni}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} → {new Date(`${dataFim}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</>
                  : null
              }
              {horaIni && horaFim && <span className="ml-2">⏱ {horaIni} – {horaFim}</span>}
              {horaIni && !horaFim && <span className="ml-2">⏱ a partir das {horaIni}</span>}
              {!horaIni && horaFim && <span className="ml-2">⏱ até {horaFim}</span>}
              {!horaIni && !horaFim && <span className="ml-2">· dia inteiro</span>}
            </div>
          )}

          {/* ── Motivo ── */}
          <div>
            <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Motivo / descrição</label>
            <input
              name="motivo"
              defaultValue={ausencia?.motivo ?? ''}
              placeholder="Ex: Compromisso pessoal, atestado médico…"
              className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
            />
          </div>

          {err && (
            <div className="flex items-start gap-2 text-xs text-[#E74C3C] bg-[#E74C3C]/10 border border-[#E74C3C]/30 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{err}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-[#E8E8E8]">
            {ausencia ? (
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
                disabled={loading || profIds.length === 0}
                className="text-white px-6 py-2 rounded-full text-sm font-semibold disabled:opacity-50 shadow-md transition-colors"
                style={{ background: tipoAtivo.cor }}
              >
                {loading
                  ? 'Salvando…'
                  : modoEdicao
                    ? 'Salvar'
                    : profIds.length > 1
                      ? `Criar ${profIds.length} ausências`
                      : 'Criar ausência'
                }
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
