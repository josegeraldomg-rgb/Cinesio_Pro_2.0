'use client'

import { useState } from 'react'
import { Plus, Pencil, Coffee, Copy } from 'lucide-react'
import { duplicarDiaAction } from '@/app/(dashboard)/horarios/actions'
import { DIAS_SEMANA } from '@/lib/scheduling/gerar-slots'
import type { Profissional, Turno } from '@/app/(dashboard)/horarios/horarios-client'

interface Props {
  profissional: Profissional
  turnos: Turno[]
  podeEditar: boolean
  onAddTurno: (dia_semana: number) => void
  onEditTurno: (t: Turno) => void
}

// Remove os segundos (HH:MM:SS → HH:MM)
function hhmm(s: string) {
  return s.length > 5 ? s.slice(0, 5) : s
}

export function GradeSemanal({ profissional, turnos, podeEditar, onAddTurno, onEditTurno }: Props) {
  const [duplicandoDia, setDuplicandoDia] = useState<number | null>(null)
  const [diasDestino, setDiasDestino] = useState<Set<number>>(new Set())

  function turnosDoDia(dia: number) {
    return turnos.filter(t => t.dia_semana === dia)
  }

  async function aplicarDuplicacao() {
    if (duplicandoDia == null || diasDestino.size === 0) return
    const r = await duplicarDiaAction(profissional.id, duplicandoDia, [...diasDestino])
    if (r?.error) alert(r.error)
    else {
      setDuplicandoDia(null)
      setDiasDestino(new Set())
      window.location.reload()
    }
  }

  function toggleDestino(dia: number) {
    setDiasDestino(s => {
      const ns = new Set(s)
      if (ns.has(dia)) ns.delete(dia); else ns.add(dia)
      return ns
    })
  }

  return (
    <div className="space-y-3">
      {/* Cabeçalho do profissional */}
      <div className="flex items-center gap-3 bg-white rounded-2xl border border-[#E8E8E8] p-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
          style={{ background: profissional.cor_agenda ?? '#4A3AE8' }}
        >
          {profissional.nome.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="font-bold text-[#2C3E50]">{profissional.nome}</p>
          <p className="text-xs text-[#7F8C8D]">{profissional.especialidade ?? 'Profissional'}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-[#2C3E50] leading-none">{turnos.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-[#7F8C8D] font-semibold">Turnos</p>
        </div>
      </div>

      {/* Grade semanal */}
      <div className="grid grid-cols-7 gap-3">
        {DIAS_SEMANA.map(d => {
          const lista = turnosDoDia(d.id)
          const isDuplicando = duplicandoDia === d.id
          const isDestino = duplicandoDia != null && duplicandoDia !== d.id && diasDestino.has(d.id)

          return (
            <div
              key={d.id}
              className={`bg-white rounded-2xl border p-3 flex flex-col min-h-[260px] transition-all ${
                isDuplicando
                  ? 'border-[#4A3AE8] ring-2 ring-[#4A3AE8]/20'
                  : isDestino
                    ? 'border-[#27AE60] ring-2 ring-[#27AE60]/20'
                    : 'border-[#E8E8E8]'
              }`}
            >
              {/* Header do dia */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-[#7F8C8D] tracking-wider">{d.sigla}</p>
                  <p className="text-xs text-[#2C3E50] font-semibold">{d.nome.split('-')[0]}</p>
                </div>
                {podeEditar && lista.length > 0 && !duplicandoDia && (
                  <button
                    onClick={() => setDuplicandoDia(d.id)}
                    title="Duplicar horários deste dia"
                    className="p-1 rounded-md text-[#7F8C8D] hover:bg-[#F8F9FA] hover:text-[#4A3AE8]"
                  >
                    <Copy size={13} />
                  </button>
                )}
              </div>

              {/* Modo duplicação: checkbox para selecionar destino */}
              {duplicandoDia != null && duplicandoDia !== d.id && (
                <button
                  onClick={() => toggleDestino(d.id)}
                  className={`mb-2 flex items-center justify-center gap-1 text-xs font-semibold py-2 rounded-lg transition-colors ${
                    isDestino
                      ? 'bg-[#27AE60] text-white'
                      : 'bg-[#F8F9FA] text-[#7F8C8D] hover:bg-[#27AE60]/10'
                  }`}
                >
                  {isDestino ? '✓ Selecionado' : 'Aplicar aqui'}
                </button>
              )}

              {/* Lista de turnos */}
              <div className="space-y-2 flex-1">
                {lista.length === 0 ? (
                  <p className="text-[10px] text-[#BDC3C7] text-center py-4">Sem turnos</p>
                ) : (
                  lista.map(t => (
                    <button
                      key={t.id}
                      onClick={() => podeEditar && onEditTurno(t)}
                      disabled={!podeEditar}
                      className={`w-full text-left bg-[#4A3AE8]/8 hover:bg-[#4A3AE8]/15 border border-[#4A3AE8]/20 rounded-lg p-2 transition-colors group ${
                        !podeEditar ? 'cursor-default' : 'cursor-pointer'
                      } ${!t.ativo ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-[#4A3AE8]">
                          {hhmm(t.hora_inicio)} – {hhmm(t.hora_fim)}
                        </p>
                        {podeEditar && (
                          <Pencil size={10} className="text-[#4A3AE8] opacity-0 group-hover:opacity-100" />
                        )}
                      </div>
                      {(t.intervalo_minutos ?? 0) > 0 && (
                        <p className="text-[10px] text-[#7F8C8D] mt-0.5 flex items-center gap-1">
                          <Coffee size={9} />
                          intervalo {t.intervalo_minutos}min
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Botão adicionar (sempre visível — Server Action valida permissão) */}
              {!duplicandoDia && (
                <button
                  onClick={() => onAddTurno(d.id)}
                  className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-[#4A3AE8] bg-[#4A3AE8]/5 hover:bg-[#4A3AE8]/10 rounded-lg py-2 transition-colors"
                >
                  <Plus size={12} />
                  Adicionar
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Barra de ações para duplicação */}
      {duplicandoDia != null && (
        <div className="sticky bottom-4 z-10 bg-white rounded-2xl border border-[#4A3AE8] shadow-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Copy size={16} className="text-[#4A3AE8]" />
            <span>
              Copiando <strong className="text-[#4A3AE8]">{DIAS_SEMANA[duplicandoDia].nome}</strong> para{' '}
              <strong className="text-[#27AE60]">{diasDestino.size}</strong> dia(s).
              <span className="text-[#7F8C8D] ml-2 text-xs">Horários existentes nos dias destino serão substituídos.</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setDuplicandoDia(null); setDiasDestino(new Set()) }}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-[#7F8C8D] hover:bg-[#F8F9FA]"
            >
              Cancelar
            </button>
            <button
              onClick={aplicarDuplicacao}
              disabled={diasDestino.size === 0}
              className="bg-[#4A3AE8] text-white px-4 py-1.5 rounded-full text-xs font-semibold hover:bg-[#3829c7] disabled:opacity-50"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
