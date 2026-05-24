'use client'

import { useMemo, useState } from 'react'
import { Check, Clock, Pencil, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Profissional, Servico, Vinculo } from '@/app/(dashboard)/agenda/agenda-page-client'

export interface ServicoEscolhido {
  id: string
  nome: string
  duracaoBase: number
  duracaoFinal: number
  valor: number
}

interface Props {
  profissional: Profissional
  servicos: Servico[]
  vinculos: Vinculo[]
  selecionado: ServicoEscolhido | null
  onSelect: (s: ServicoEscolhido | null) => void
}

export function PassoServicos({ profissional, servicos, vinculos, selecionado, onSelect }: Props) {
  const [editandoId, setEditando]     = useState<string | null>(null)
  const [durOverride, setDurOver]     = useState<number>(0)
  const [editandoDur, setEditandoDur] = useState(false)
  const [durEdit, setDurEdit]         = useState<number>(0)

  // Serviços vinculados ao profissional (com overrides aplicados)
  const disponiveis = useMemo(() => {
    const vincDoProf = vinculos.filter(v => v.profissional_id === profissional.id)
    return vincDoProf
      .map(v => {
        const s = servicos.find(sv => sv.id === v.servico_id)
        if (!s) return null
        return {
          id: s.id,
          nome: s.nome,
          tipo: s.tipo,
          cor: s.cor,
          icone: s.icone,
          duracaoBase: v.duracao_override ?? s.duracao_minutos ?? 50,
          valor: v.valor_override ?? s.valor ?? 0,
        }
      })
      .filter(Boolean) as Array<{
        id: string; nome: string; tipo: string; cor: string | null; icone: string | null;
        duracaoBase: number; valor: number
      }>
  }, [profissional, servicos, vinculos])

  if (selecionado) {
    return (
      <div className="bg-[#27AE60]/5 border border-[#27AE60]/30 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#27AE60] text-white flex items-center justify-center flex-shrink-0">
            <Check size={18} strokeWidth={3} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#27AE60] uppercase tracking-wider">Serviço</p>
            <p className="text-sm font-bold text-[#2C3E50]">{selecionado.nome}</p>

            {editandoDur ? (
              <div className="flex items-center gap-2 mt-1">
                <Clock size={11} className="text-[#7F8C8D]" />
                <input
                  type="number"
                  min={1}
                  max={480}
                  value={durEdit}
                  onChange={e => setDurEdit(parseInt(e.target.value) || 1)}
                  className="w-16 h-6 px-1.5 rounded border border-[#4A3AE8] text-xs text-center outline-none focus:ring-2 focus:ring-[#4A3AE8]/20"
                  autoFocus
                />
                <span className="text-xs text-[#7F8C8D]">min</span>
                <button
                  onClick={() => {
                    const dur = Math.max(1, durEdit)
                    onSelect({ ...selecionado, duracaoFinal: dur })
                    setEditandoDur(false)
                  }}
                  className="text-xs font-semibold bg-[#4A3AE8] text-white px-2.5 py-1 rounded-full hover:bg-[#3829c7]"
                >
                  OK
                </button>
                <button
                  onClick={() => setEditandoDur(false)}
                  className="text-xs text-[#7F8C8D] hover:text-[#2C3E50]"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <p className="text-xs text-[#7F8C8D] flex items-center gap-2 mt-0.5">
                <Clock size={11} />
                <button
                  onClick={() => { setDurEdit(selecionado.duracaoFinal); setEditandoDur(true) }}
                  className="flex items-center gap-1 hover:text-[#F39C12] transition-colors group"
                  title="Editar duração deste agendamento"
                >
                  <span className="font-semibold">{selecionado.duracaoFinal}min</span>
                  <Pencil size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#F39C12]" />
                </button>
                {selecionado.duracaoFinal !== selecionado.duracaoBase && (
                  <span className="text-[#F39C12] font-semibold">
                    (padrão {selecionado.duracaoBase}min)
                  </span>
                )}
                <span className="text-[#BDC3C7]">·</span>
                <span className="font-semibold text-[#27AE60]">{formatCurrency(selecionado.valor)}</span>
              </p>
            )}
          </div>

          {!editandoDur && (
            <button
              onClick={() => onSelect(null)}
              className="text-xs font-semibold text-[#7F8C8D] hover:text-[#E74C3C] flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white flex-shrink-0"
            >
              <X size={12} />
              Trocar
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-[#4A3AE8] text-white text-xs font-bold flex items-center justify-center">3</span>
        <h3 className="font-bold text-[#2C3E50] text-sm">Escolha o serviço</h3>
      </div>

      {disponiveis.length === 0 ? (
        <div className="text-sm text-[#E67E22] bg-[#E67E22]/10 border border-[#E67E22]/30 rounded-xl p-3">
          <p className="font-semibold">{profissional.nome} ainda não está vinculado a nenhum serviço.</p>
          <p className="text-xs mt-1">
            Vincule serviços a esse profissional em <strong>/servicos → Profissionais</strong> antes de agendar.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {disponiveis.map(s => {
            const editando = editandoId === s.id
            return (
              <div
                key={s.id}
                className="flex items-center gap-3 p-3 border border-[#E8E8E8] rounded-xl hover:border-[#4A3AE8]/40 transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${s.cor ?? '#4A3AE8'}15`, color: s.cor ?? '#4A3AE8' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{s.icone || 'medical_services'}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#2C3E50] truncate">{s.nome}</p>
                  <p className="text-xs text-[#7F8C8D] flex items-center gap-1">
                    <Clock size={11} />
                    {editando ? (
                      <>
                        <input
                          type="number"
                          min={1}
                          value={durOverride}
                          onChange={(e) => setDurOver(parseInt(e.target.value) || 0)}
                          className="w-14 h-6 px-1 rounded border border-[#4A3AE8] text-xs text-center outline-none"
                          autoFocus
                        />
                        <span>min</span>
                      </>
                    ) : (
                      <span>{s.duracaoBase}min</span>
                    )}
                    <span className="text-[#BDC3C7]">·</span>
                    <span className="font-semibold text-[#27AE60]">{formatCurrency(s.valor)}</span>
                  </p>
                </div>

                {editando ? (
                  <>
                    <button
                      onClick={() => {
                        onSelect({
                          id: s.id, nome: s.nome, duracaoBase: s.duracaoBase,
                          duracaoFinal: durOverride > 0 ? durOverride : s.duracaoBase,
                          valor: s.valor,
                        })
                        setEditando(null)
                      }}
                      className="bg-[#4A3AE8] text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-[#3829c7]"
                    >
                      Aplicar
                    </button>
                    <button
                      onClick={() => setEditando(null)}
                      className="text-xs text-[#7F8C8D] hover:text-[#2C3E50] px-2"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setEditando(s.id); setDurOver(s.duracaoBase) }}
                      title="Forçar duração diferente para este agendamento"
                      className="p-1.5 rounded-lg text-[#F39C12] hover:bg-[#F39C12]/10"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => onSelect({
                        id: s.id, nome: s.nome, duracaoBase: s.duracaoBase,
                        duracaoFinal: s.duracaoBase, valor: s.valor,
                      })}
                      className="bg-[#4A3AE8]/10 hover:bg-[#4A3AE8] hover:text-white text-[#4A3AE8] text-xs font-semibold px-4 py-1.5 rounded-full transition-colors"
                    >
                      Escolher
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
