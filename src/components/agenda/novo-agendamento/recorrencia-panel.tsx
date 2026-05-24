'use client'

import { useMemo } from 'react'
import { X } from 'lucide-react'
import {
  type RecorrenciaConfig,
  gerarDatasOcorrencias,
  toDateStr,
  labelFrequencia,
} from '@/lib/scheduling/gerar-ocorrencias'

interface Props {
  config: RecorrenciaConfig
  /** Data da primeira sessão, já escolhida no passo Data/Hora ("YYYY-MM-DD") */
  dataBase: string
  onChange: (c: RecorrenciaConfig) => void
  onRemover: () => void
}

const FREQUENCIAS: { id: RecorrenciaConfig['frequencia']; label: string }[] = [
  { id: 'semanal',      label: 'Semanal'      },
  { id: 'quinzenal',    label: 'Quinzenal'    },
  { id: 'mensal',       label: 'Mensal'       },
  { id: 'personalizado', label: 'Personalizado' },
]

const SUGESTOES_SESSOES = [4, 8, 12, 16, 24]

export function RecorrenciaPanel({ config, dataBase, onChange, onRemover }: Props) {
  // Preview: gera as datas com a config atual para mostrar resumo
  const preview = useMemo(() => {
    if (!dataBase) return null
    try {
      const datas = gerarDatasOcorrencias(new Date(dataBase + 'T00:00:00'), config)
      if (datas.length === 0) return null
      const primeira = datas[0]
      const ultima   = datas[datas.length - 1]
      return {
        total: datas.length,
        dataInicio: primeira.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        dataFim:    ultima.toLocaleDateString('pt-BR',   { day: '2-digit', month: '2-digit', year: 'numeric' }),
        dataFimStr: toDateStr(ultima),
      }
    } catch {
      return null
    }
  }, [dataBase, config])

  function set(patch: Partial<RecorrenciaConfig>) {
    onChange({ ...config, ...patch })
  }

  return (
    <div className="bg-[#4A3AE8]/5 border border-[#4A3AE8]/25 rounded-2xl p-4 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-[#4A3AE8]">Configurar recorrência</p>
        <button
          onClick={onRemover}
          className="flex items-center gap-1 text-xs text-[#7F8C8D] hover:text-[#E74C3C] px-2 py-1 rounded-lg hover:bg-white transition-colors"
        >
          <X size={12} />
          Remover
        </button>
      </div>

      {/* Frequência */}
      <div>
        <label className="text-xs font-semibold text-[#7F8C8D] mb-2 block">Frequência</label>
        <div className="grid grid-cols-4 gap-1.5">
          {FREQUENCIAS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => set({ frequencia: f.id, intervalo_dias: f.id === 'personalizado' ? (config.intervalo_dias ?? 7) : undefined })}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                config.frequencia === f.id
                  ? 'bg-[#4A3AE8] text-white border-[#4A3AE8]'
                  : 'bg-white text-[#7F8C8D] border-[#E8E8E8] hover:border-[#4A3AE8]/40'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {config.frequencia === 'personalizado' && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-[#7F8C8D]">A cada</span>
            <input
              type="number"
              min={1}
              max={365}
              value={config.intervalo_dias ?? 7}
              onChange={e => set({ intervalo_dias: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-16 h-8 px-2 rounded-lg border border-[#E8E8E8] text-xs text-center outline-none focus:border-[#4A3AE8]"
            />
            <span className="text-xs text-[#7F8C8D]">dias</span>
          </div>
        )}
      </div>

      {/* Condição de término */}
      <div>
        <label className="text-xs font-semibold text-[#7F8C8D] mb-2 block">Término</label>
        <div className="space-y-2">

          {/* Por sessões */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="tipo_fim"
              checked={config.tipo_fim === 'sessoes'}
              onChange={() => set({ tipo_fim: 'sessoes', total_sessoes: config.total_sessoes ?? 8, data_fim: undefined })}
              className="mt-0.5 accent-[#4A3AE8]"
            />
            <div className="flex-1">
              <span className="text-xs font-semibold text-[#2C3E50]">Por número de sessões</span>
              {config.tipo_fim === 'sessoes' && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={2}
                      max={104}
                      value={config.total_sessoes ?? 8}
                      onChange={e => set({ total_sessoes: Math.max(2, parseInt(e.target.value) || 2) })}
                      className="w-16 h-8 px-2 rounded-lg border border-[#E8E8E8] text-xs text-center outline-none focus:border-[#4A3AE8]"
                    />
                    <span className="text-xs text-[#7F8C8D]">sessões</span>
                  </div>
                  {/* Sugestões rápidas */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {SUGESTOES_SESSOES.map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => set({ total_sessoes: n })}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                          config.total_sessoes === n
                            ? 'bg-[#4A3AE8] text-white border-[#4A3AE8]'
                            : 'bg-white text-[#7F8C8D] border-[#E8E8E8] hover:border-[#4A3AE8]/40'
                        }`}
                      >
                        {n}x
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </label>

          {/* Por data */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="tipo_fim"
              checked={config.tipo_fim === 'data'}
              onChange={() => set({ tipo_fim: 'data', total_sessoes: undefined })}
              className="mt-0.5 accent-[#4A3AE8]"
            />
            <div className="flex-1">
              <span className="text-xs font-semibold text-[#2C3E50]">Por data de término</span>
              {config.tipo_fim === 'data' && (
                <input
                  type="date"
                  min={dataBase}
                  value={config.data_fim ?? ''}
                  onChange={e => set({ data_fim: e.target.value })}
                  className="mt-2 w-full h-8 px-2 rounded-lg border border-[#E8E8E8] text-xs outline-none focus:border-[#4A3AE8]"
                />
              )}
            </div>
          </label>

        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="bg-white rounded-xl border border-[#4A3AE8]/20 px-4 py-3">
          <p className="text-xs text-[#7F8C8D] mb-0.5">Resumo da série</p>
          <p className="text-sm font-bold text-[#2C3E50]">
            {preview.total} sessão{preview.total !== 1 ? 'ões' : ''}
            {' · '}
            <span className="text-[#4A3AE8]">{labelFrequencia(config.frequencia, config.intervalo_dias)}</span>
          </p>
          <p className="text-xs text-[#7F8C8D] mt-0.5">
            De <strong className="text-[#2C3E50]">{preview.dataInicio}</strong> até{' '}
            <strong className="text-[#2C3E50]">{preview.dataFim}</strong>
          </p>
        </div>
      )}
    </div>
  )
}
