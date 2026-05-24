'use client'

import type React from 'react'
import { Pencil, Trash2, Calendar, Plane, Flag, HelpCircle } from 'lucide-react'
import { excluirAusenciaAction } from '@/app/(dashboard)/horarios/actions'
import type { Ausencia, Profissional } from '@/app/(dashboard)/horarios/horarios-client'

interface Props {
  ausencias: Ausencia[]
  profissionais: Profissional[]
  podeEditar: boolean
  onEdit: (a: Ausencia) => void
}

const TIPO_META: Record<string, { label: string; cor: string; Icon: React.ElementType }> = {
  folga:   { label: 'Folga',   cor: '#E67E22', Icon: Calendar    },
  ferias:  { label: 'Férias',  cor: '#3498DB', Icon: Plane       },
  feriado: { label: 'Feriado', cor: '#E74C3C', Icon: Flag        },
  outro:   { label: 'Outro',   cor: '#8B5CF6', Icon: HelpCircle  },
}

function fmtData(s: string) {
  return new Date(`${s}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function diasEntre(a: string, b: string) {
  const d1 = new Date(`${a}T00:00:00`)
  const d2 = new Date(`${b}T00:00:00`)
  return Math.round((d2.getTime() - d1.getTime()) / 86_400_000) + 1
}

export function AusenciasLista({ ausencias, profissionais, podeEditar, onEdit }: Props) {
  async function excluir(a: Ausencia) {
    if (!confirm('Excluir esta ausência?')) return
    await excluirAusenciaAction(a.id)
    window.location.reload()
  }

  function nomeProf(id: string | null) {
    if (!id) return 'Toda a clínica'
    return profissionais.find(p => p.id === id)?.nome ?? 'Profissional removido'
  }

  if (ausencias.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-12 text-center">
        <p className="text-sm text-[#7F8C8D]">
          Nenhuma ausência ou feriado registrado para o futuro.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
      <ul className="divide-y divide-[#F0F0F0]">
        {ausencias.map(a => {
              const meta = TIPO_META[a.tipo]
              const Icon = meta.Icon
              const dias = diasEntre(a.data_inicio, a.data_fim)
          return (
            <li key={a.id} className="flex items-center gap-4 px-5 py-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${meta.cor}15`, color: meta.cor }}
              >
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ color: meta.cor, background: `${meta.cor}15` }}
                  >
                    {meta.label}
                  </span>
                  <p className="text-sm font-semibold text-[#2C3E50] truncate">
                    {nomeProf(a.profissional_id)}
                  </p>
                </div>
                <p className="text-xs text-[#7F8C8D]">
                  {a.data_inicio === a.data_fim
                    ? fmtData(a.data_inicio)
                    : <>{fmtData(a.data_inicio)} → {fmtData(a.data_fim)}</>
                  }{' '}
                  <span className="text-[#BDC3C7]">·</span>{' '}
                  {a.hora_inicio && a.hora_fim
                    ? <span className="font-medium text-[#4A3AE8]">{a.hora_inicio} – {a.hora_fim}</span>
                    : <>{dias} {dias === 1 ? 'dia' : 'dias'}</>
                  }
                  {a.motivo && (
                    <>
                      {' '}<span className="text-[#BDC3C7]">·</span>{' '}
                      <span className="italic">{a.motivo}</span>
                    </>
                  )}
                </p>
              </div>
              {podeEditar && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(a)}
                    className="p-1.5 rounded-lg text-[#4A3AE8] hover:bg-[#4A3AE8]/10"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => excluir(a)}
                    className="p-1.5 rounded-lg text-[#E74C3C] hover:bg-[#E74C3C]/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
