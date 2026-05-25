'use client'

import { useState, useMemo } from 'react'
import { X, CheckCircle2, Clock, CreditCard, DollarSign, Percent, TrendingDown, User, Briefcase } from 'lucide-react'
import { criarReceitaAction } from '@/app/(dashboard)/financeiro/actions'
import type { FormaPagamento } from '@/app/(dashboard)/financeiro/actions'
import { calcularComissao } from '@/lib/financeiro/calcular-comissao'
import type { ComissaoConfig } from '@/lib/financeiro/calcular-comissao'
import { atualizarStatusAgendamentoAction } from '@/app/(dashboard)/agenda/actions'

export interface DadosCheckout {
  agendamento_id: string
  paciente_id: string | null
  paciente_nome: string
  profissional_id: string | null
  profissional_nome: string
  servico_id: string | null
  servico_nome: string
  valor_base: number          // valor do serviço/agendamento
  data_competencia: string    // "YYYY-MM-DD"
}

interface Props {
  dados: DadosCheckout
  formasPagamento: FormaPagamento[]
  comissoes: ComissaoConfig[]
  onClose: () => void
  onConfirmado: () => void   // callback após salvar com sucesso
}

const TIPO_ICON: Record<string, string> = {
  dinheiro: '💵', pix: '⚡', credito: '💳', debito: '💳',
  transferencia: '🏦', convenio: '🏥', outro: '💰',
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function CheckoutFinanceiroModal({ dados, formasPagamento, comissoes, onClose, onConfirmado }: Props) {
  const [formaId, setFormaId]     = useState(formasPagamento.find(f => f.ativo)?.id ?? '')
  const [desconto, setDesconto]   = useState(0)
  const [descontoRaw, setDescontoRaw] = useState('0')
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState('')

  const forma = useMemo(() => formasPagamento.find(f => f.id === formaId), [formaId, formasPagamento])

  const calc = useMemo(() => {
    const bruto       = dados.valor_base
    const desc        = Math.min(desconto, bruto)
    const baseCalc    = bruto - desc
    const taxaPerc    = forma ? (baseCalc * forma.taxa_percentual) / 100 : 0
    const taxaFixa    = forma?.taxa_fixa ?? 0
    const taxa        = parseFloat((taxaPerc + taxaFixa).toFixed(2))
    const liquido     = parseFloat(Math.max(0, baseCalc - taxa).toFixed(2))
    const { percentual: percComissao, valor: valComissao } = calcularComissao(
      comissoes, dados.profissional_id, dados.servico_id, liquido
    )
    const liquidez    = forma?.prazo_liquidez_dias ?? 0
    const dataLiquidez = liquidez > 0
      ? (() => {
          const d = new Date(dados.data_competencia + 'T12:00:00')
          d.setDate(d.getDate() + liquidez)
          return d.toISOString().slice(0, 10)
        })()
      : dados.data_competencia
    return { bruto, desc, taxa, liquido, percComissao, valComissao, dataLiquidez, liquidez }
  }, [dados, forma, desconto, comissoes])

  async function salvar(status: 'pago' | 'pendente') {
    if (!formaId) { setErr('Selecione a forma de pagamento.'); return }
    setSaving(true); setErr('')
    try {
      const [r1, r2] = await Promise.all([
        criarReceitaAction({
          agendamento_id:     dados.agendamento_id,
          paciente_id:        dados.paciente_id,
          profissional_id:    dados.profissional_id,
          servico_id:         dados.servico_id,
          forma_pagamento_id: formaId,
          valor_bruto:        calc.bruto,
          desconto:           calc.desc,
          taxa_operadora:     calc.taxa,
          valor_liquido:      calc.liquido,
          percentual_comissao: calc.percComissao,
          valor_comissao:     calc.valComissao,
          status,
          data_competencia:   dados.data_competencia,
          data_liquidez:      calc.dataLiquidez,
          descricao:          `${dados.servico_nome} — ${dados.paciente_nome}`,
        }),
        atualizarStatusAgendamentoAction(dados.agendamento_id, 'realizado'),
      ])
      if ('error' in r1) { setErr(r1.error); return }
      if ('error' in r2) { setErr((r2 as any).error); return }
      onConfirmado()
    } finally {
      setSaving(false)
    }
  }

  const formasAtivas = formasPagamento.filter(f => f.ativo)

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#27AE60]/10 flex items-center justify-center">
              <DollarSign size={18} className="text-[#27AE60]" />
            </div>
            <div>
              <p className="font-bold text-[#2C3E50] text-sm">Checkout Financeiro</p>
              <p className="text-[11px] text-[#7F8C8D]">Registrar atendimento realizado</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#7F8C8D] hover:text-[#2C3E50] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

          {/* Resumo do atendimento */}
          <div className="bg-[#F8F9FA] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User size={13} className="text-[#7F8C8D]" />
              <span className="text-[#7F8C8D]">Paciente:</span>
              <span className="font-semibold text-[#2C3E50]">{dados.paciente_nome}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Briefcase size={13} className="text-[#7F8C8D]" />
              <span className="text-[#7F8C8D]">Profissional:</span>
              <span className="font-semibold text-[#2C3E50]">{dados.profissional_nome}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CreditCard size={13} className="text-[#7F8C8D]" />
              <span className="text-[#7F8C8D]">Serviço:</span>
              <span className="font-semibold text-[#2C3E50]">{dados.servico_nome}</span>
            </div>
          </div>

          {/* Forma de pagamento */}
          <div>
            <label className="block text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-2">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 gap-2">
              {formasAtivas.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFormaId(f.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    formaId === f.id
                      ? 'border-[#4A3AE8] bg-[#4A3AE8]/5 text-[#4A3AE8]'
                      : 'border-[#E8E8E8] text-[#7F8C8D] hover:border-[#4A3AE8]/30'
                  }`}
                >
                  <span>{TIPO_ICON[f.tipo] ?? '💰'}</span>
                  <span className="truncate">{f.nome}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Desconto */}
          <div>
            <label className="block text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-2">
              Desconto (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#7F8C8D]">R$</span>
              <input
                type="number"
                min={0}
                max={dados.valor_base}
                step={0.01}
                value={descontoRaw}
                onChange={e => {
                  setDescontoRaw(e.target.value)
                  setDesconto(Math.max(0, parseFloat(e.target.value) || 0))
                }}
                className="w-full pl-10 pr-4 h-10 border border-[#E8E8E8] rounded-xl text-sm outline-none focus:border-[#4A3AE8] bg-white"
              />
            </div>
          </div>

          {/* Cálculo em tempo real */}
          <div className="bg-[#F8F9FA] rounded-xl p-4 space-y-2.5">
            <p className="text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-3">Cálculo</p>

            <div className="flex items-center justify-between text-sm">
              <span className="text-[#7F8C8D]">Valor Bruto</span>
              <span className="font-semibold text-[#2C3E50]">{fmt(calc.bruto)}</span>
            </div>

            {calc.desc > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-[#E67E22]"><TrendingDown size={12} /> Desconto</span>
                <span className="text-[#E67E22]">- {fmt(calc.desc)}</span>
              </div>
            )}

            {calc.taxa > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#E74C3C]">
                  Taxa {forma?.nome} ({forma?.taxa_percentual}%{forma?.taxa_fixa ? ` + R$${forma.taxa_fixa}` : ''})
                </span>
                <span className="text-[#E74C3C]">- {fmt(calc.taxa)}</span>
              </div>
            )}

            <div className="border-t border-[#E8E8E8] pt-2 flex items-center justify-between">
              <span className="font-semibold text-[#2C3E50]">Valor Líquido</span>
              <span className="font-bold text-lg text-[#27AE60]">{fmt(calc.liquido)}</span>
            </div>

            {calc.percComissao > 0 && (
              <div className="flex items-center justify-between text-sm bg-[#8E44AD]/5 px-3 py-2 rounded-lg">
                <span className="flex items-center gap-1 text-[#8E44AD]">
                  <Percent size={12} /> Comissão {dados.profissional_nome} ({calc.percComissao}%)
                </span>
                <span className="font-semibold text-[#8E44AD]">{fmt(calc.valComissao)}</span>
              </div>
            )}

            {calc.liquidez > 0 && (
              <div className="flex items-center justify-between text-xs text-[#7F8C8D] pt-1">
                <span className="flex items-center gap-1"><Clock size={11} /> Liquidez D+{calc.liquidez}</span>
                <span>{new Date(calc.dataLiquidez + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
              </div>
            )}
          </div>

          {err && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{err}</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E8E8E8] flex gap-3 flex-shrink-0">
          <button
            onClick={() => salvar('pendente')}
            disabled={saving || !formaId}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-[#E67E22] text-[#E67E22] text-sm font-semibold hover:bg-[#E67E22]/5 disabled:opacity-50"
          >
            <Clock size={14} />
            {saving ? 'Salvando…' : 'Registrar Pendente'}
          </button>
          <button
            onClick={() => salvar('pago')}
            disabled={saving || !formaId}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-[#27AE60] text-white text-sm font-semibold hover:bg-[#219653] disabled:opacity-50 shadow-sm"
          >
            <CheckCircle2 size={14} />
            {saving ? 'Salvando…' : 'Confirmar Pagamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
