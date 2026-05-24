'use client'

import { useState } from 'react'
import { Video, Repeat, Paperclip, Percent, MessageSquare } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { RecorrenciaPanel } from './recorrencia-panel'
import type { RecorrenciaConfig } from '@/lib/scheduling/gerar-ocorrencias'

interface Props {
  observacoes: string
  onObservacoes: (s: string) => void
  descontoPct: number
  onDescontoPct: (n: number) => void
  telemedicina: boolean
  onTelemedicina: (b: boolean) => void
  valorBase: number
  valorFinal: number
  // Recorrência
  recorrenciaConfig: RecorrenciaConfig | null
  onRecorrencia: (c: RecorrenciaConfig | null) => void
  /** Data da primeira sessão "YYYY-MM-DD", usada como âncora do painel */
  dataBase: string
}

const CONFIG_PADRAO: RecorrenciaConfig = {
  frequencia: 'semanal',
  tipo_fim: 'sessoes',
  total_sessoes: 8,
}

export function PassoFinalizar(props: Props) {
  const {
    observacoes, onObservacoes, descontoPct, onDescontoPct,
    telemedicina, onTelemedicina, valorBase, valorFinal,
    recorrenciaConfig, onRecorrencia, dataBase,
  } = props

  const isPago         = valorBase > 0
  const temRecorrencia = recorrenciaConfig !== null

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-[#4A3AE8] text-white text-xs font-bold flex items-center justify-center">5</span>
        <h3 className="font-bold text-[#2C3E50] text-sm">Personalizações finais</h3>
      </div>

      {/* Observações */}
      <div>
        <label className="text-xs font-semibold text-[#7F8C8D] mb-1 flex items-center gap-1">
          <MessageSquare size={11} />
          Notas / observações
        </label>
        <textarea
          value={observacoes}
          onChange={(e) => onObservacoes(e.target.value)}
          rows={2}
          placeholder="Queixas do paciente, lembretes para o profissional…"
          className="w-full px-3 py-2 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10 resize-none"
        />
      </div>

      {/* Toggles em linha */}
      <div className="grid grid-cols-3 gap-2">
        {/* Telemedicina */}
        <label className="flex items-center gap-2 cursor-pointer p-2.5 border border-[#E8E8E8] rounded-xl hover:border-[#4A3AE8]/40">
          <input
            type="checkbox"
            checked={telemedicina}
            onChange={(e) => onTelemedicina(e.target.checked)}
            className="peer sr-only"
          />
          <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-[#E8E8E8] peer-checked:bg-[#3498DB] transition-colors flex-shrink-0">
            <span className="inline-block h-4 w-4 transform rounded-full bg-white shadow translate-x-0.5 peer-checked:translate-x-[18px] transition-transform" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#2C3E50] flex items-center gap-1"><Video size={11} /> Telemedicina</p>
            <p className="text-[10px] text-[#7F8C8D]">Sala virtual</p>
          </div>
        </label>

        {/* Recorrência — agora habilitado */}
        <button
          type="button"
          onClick={() => {
            if (temRecorrencia) {
              onRecorrencia(null)
            } else {
              onRecorrencia(CONFIG_PADRAO)
            }
          }}
          className={`flex items-center gap-2 p-2.5 border rounded-xl text-left transition-colors ${
            temRecorrencia
              ? 'border-[#4A3AE8] bg-[#4A3AE8]/5 text-[#4A3AE8]'
              : 'border-[#E8E8E8] hover:border-[#4A3AE8]/40 text-[#7F8C8D]'
          }`}
        >
          <Repeat size={14} className={temRecorrencia ? 'text-[#4A3AE8]' : 'text-[#7F8C8D]'} />
          <div>
            <p className={`text-xs font-semibold ${temRecorrencia ? 'text-[#4A3AE8]' : 'text-[#2C3E50]'}`}>
              Recorrência
            </p>
            <p className="text-[10px]">
              {temRecorrencia ? 'Configurada ✓' : 'Repetir sessão'}
            </p>
          </div>
        </button>

        {/* Anexos — ainda Em breve */}
        <button
          disabled
          title="Em breve"
          className="flex items-center gap-2 p-2.5 border border-[#E8E8E8] rounded-xl text-left opacity-50 cursor-not-allowed"
        >
          <Paperclip size={14} className="text-[#7F8C8D]" />
          <div>
            <p className="text-xs font-semibold text-[#2C3E50]">Anexos</p>
            <p className="text-[10px] text-[#7F8C8D]">Em breve</p>
          </div>
        </button>
      </div>

      {/* Painel de recorrência */}
      {temRecorrencia && recorrenciaConfig && (
        <RecorrenciaPanel
          config={recorrenciaConfig}
          dataBase={dataBase}
          onChange={onRecorrencia}
          onRemover={() => onRecorrencia(null)}
        />
      )}

      {/* Desconto */}
      {isPago && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-[#7F8C8D] flex items-center gap-1">
              <Percent size={11} />
              Desconto
            </label>
            <span className="text-sm font-bold text-[#E67E22]">{descontoPct}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={descontoPct}
            onChange={(e) => onDescontoPct(parseInt(e.target.value))}
            className="w-full accent-[#E67E22]"
          />
          <div className="flex items-center justify-between mt-1 text-[10px] text-[#7F8C8D]">
            <span>0%</span>
            {descontoPct > 0 && (
              <span>
                {formatCurrency(valorBase)} → <strong className="text-[#27AE60]">{formatCurrency(valorFinal)}</strong>
              </span>
            )}
            <span>100%</span>
          </div>
        </div>
      )}
    </div>
  )
}
