'use client'

import { useState } from 'react'
import { X, AlertCircle, Clock, DollarSign } from 'lucide-react'
import { setVinculosProfissionaisAction } from '@/app/(dashboard)/servicos/actions'
import { formatCurrency } from '@/lib/utils'
import type { Servico, Profissional, Vinculo } from '@/app/(dashboard)/servicos/servicos-client'

interface Props {
  servico: Servico
  profissionais: Profissional[]
  vinculosAtuais: Vinculo[]
  onClose: () => void
}

interface VinculoState {
  ativo: boolean
  valor_override: string  // string para evitar problemas de input number controlado
  duracao_override: string
}

export function VinculoProfissionais({ servico, profissionais, vinculosAtuais, onClose }: Props) {
  // Estado: map profissional_id → { ativo, valor_override, duracao_override }
  const [estado, setEstado] = useState<Record<string, VinculoState>>(() => {
    const m: Record<string, VinculoState> = {}
    for (const p of profissionais) {
      const v = vinculosAtuais.find(vv => vv.profissional_id === p.id)
      m[p.id] = {
        ativo: !!v,
        valor_override:   v?.valor_override   != null ? String(v.valor_override)   : '',
        duracao_override: v?.duracao_override != null ? String(v.duracao_override) : '',
      }
    }
    return m
  })

  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function toggle(id: string) {
    setEstado(s => ({ ...s, [id]: { ...s[id], ativo: !s[id].ativo } }))
  }

  function setField(id: string, field: 'valor_override' | 'duracao_override', v: string) {
    setEstado(s => ({ ...s, [id]: { ...s[id], [field]: v } }))
  }

  async function handleSubmit() {
    setLoading(true)
    setErr(null)

    const vinculos = Object.entries(estado)
      .filter(([, v]) => v.ativo)
      .map(([profissional_id, v]) => ({
        profissional_id,
        valor_override:   v.valor_override.trim()   ? Number(v.valor_override.replace(',', '.')) : null,
        duracao_override: v.duracao_override.trim() ? parseInt(v.duracao_override, 10)           : null,
      }))

    // Validação simples
    for (const v of vinculos) {
      if (v.valor_override   != null && (Number.isNaN(v.valor_override)   || v.valor_override < 0)) {
        setErr('Preço customizado inválido.'); setLoading(false); return
      }
      if (v.duracao_override != null && (Number.isNaN(v.duracao_override) || v.duracao_override < 1)) {
        setErr('Duração customizada inválida.'); setLoading(false); return
      }
    }

    const r = await setVinculosProfissionaisAction(servico.id, vinculos)
    setLoading(false)
    if (r?.error) setErr(r.error)
    else { onClose(); window.location.reload() }
  }

  const ativos = Object.values(estado).filter(v => v.ativo).length

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8]">
          <div>
            <h2 className="font-bold text-[#2C3E50] text-lg">Profissionais que executam</h2>
            <p className="text-xs text-[#7F8C8D] mt-0.5">
              <span className="font-semibold text-[#2C3E50]">{servico.nome}</span> · padrão: {servico.duracao_minutos}min · {formatCurrency(servico.valor)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#F8F9FA] text-[#7F8C8D]">
            <X size={18} />
          </button>
        </div>

        {/* Lista de profissionais */}
        <div className="p-6 space-y-2 max-h-[60vh] overflow-y-auto">
          {profissionais.length === 0 ? (
            <p className="text-center py-8 text-sm text-[#7F8C8D]">
              Nenhum profissional cadastrado. Cadastre profissionais primeiro em Configurações.
            </p>
          ) : (
            profissionais.map(p => {
              const v = estado[p.id]
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    v.ativo ? 'border-[#4A3AE8]/40 bg-[#4A3AE8]/5' : 'border-[#E8E8E8] bg-white'
                  }`}
                >
                  {/* Toggle */}
                  <button
                    onClick={() => toggle(p.id)}
                    aria-label={v.ativo ? 'Desvincular' : 'Vincular'}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                      v.ativo ? 'bg-[#4A3AE8]' : 'bg-[#E8E8E8]'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        v.ativo ? 'translate-x-[22px]' : 'translate-x-0.5'
                      }`}
                    />
                  </button>

                  {/* Avatar + nome */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: p.cor_agenda ?? '#4A3AE8' }}
                    >
                      {p.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#2C3E50] truncate">{p.nome}</p>
                      {p.especialidade && (
                        <p className="text-xs text-[#7F8C8D] truncate">{p.especialidade}</p>
                      )}
                    </div>
                  </div>

                  {/* Overrides */}
                  {v.ativo && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="relative">
                        <Clock size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
                        <input
                          type="number"
                          min={1}
                          value={v.duracao_override}
                          onChange={(e) => setField(p.id, 'duracao_override', e.target.value)}
                          placeholder={`${servico.duracao_minutos}`}
                          className="w-20 h-9 pl-7 pr-2 rounded-lg border border-[#E8E8E8] text-xs text-center outline-none focus:border-[#4A3AE8]"
                          title="Duração customizada (min) — em branco usa o padrão"
                        />
                      </div>
                      <div className="relative">
                        <DollarSign size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={v.valor_override}
                          onChange={(e) => setField(p.id, 'valor_override', e.target.value)}
                          placeholder={`${servico.valor}`}
                          className="w-24 h-9 pl-7 pr-2 rounded-lg border border-[#E8E8E8] text-xs text-center outline-none focus:border-[#4A3AE8]"
                          title="Preço customizado — em branco usa o padrão"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {err && (
          <div className="mx-6 mb-3 flex items-start gap-2 text-xs text-[#E74C3C] bg-[#E74C3C]/10 border border-[#E74C3C]/30 rounded-lg px-3 py-2">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <span>{err}</span>
          </div>
        )}

        {/* Rodapé */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E8E8E8] bg-[#F8F9FA]/50 rounded-b-3xl">
          <p className="text-xs text-[#7F8C8D]">
            <span className="font-semibold text-[#2C3E50]">{ativos}</span> profissional{ativos === 1 ? '' : 'is'} executará{ativos === 1 ? '' : 'ão'} este serviço
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full text-sm font-medium text-[#7F8C8D] hover:bg-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-[#4A3AE8] text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#3829c7] disabled:opacity-50 shadow-md"
            >
              {loading ? 'Salvando…' : 'Salvar vínculos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
