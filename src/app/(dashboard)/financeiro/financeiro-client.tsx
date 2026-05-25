'use client'

import { useState, useMemo, useTransition } from 'react'
import {
  DollarSign, TrendingUp, Clock, CheckCircle2, XCircle, Search, X,
  Download, ChevronDown, ChevronUp, Trash2, Plus, Save, Percent, Calendar,
} from 'lucide-react'
import type { ReceitaFinanceira, FormaPagamento } from './actions'
import {
  atualizarStatusReceitaAction, salvarFormaPagamentoAction, excluirFormaPagamentoAction,
  salvarComissaoAction, excluirComissaoAction,
} from './actions'
import { calcularComissao } from '@/lib/financeiro/calcular-comissao'
import type { ComissaoConfig } from '@/lib/financeiro/calcular-comissao'
import * as XLSX from 'xlsx'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(s: string) {
  return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR')
}

const STATUS_META: Record<string, { label: string; cor: string; bg: string }> = {
  pago:      { label: 'Pago',      cor: '#27AE60', bg: '#27AE6015' },
  pendente:  { label: 'Pendente',  cor: '#E67E22', bg: '#E67E2215' },
  cancelado: { label: 'Cancelado', cor: '#E74C3C', bg: '#E74C3C15' },
  estornado: { label: 'Estornado', cor: '#7F8C8D', bg: '#7F8C8D15' },
}

const TIPO_ICON: Record<string, string> = {
  dinheiro: '💵', pix: '⚡', credito: '💳', debito: '💳',
  transferencia: '🏦', convenio: '🏥', outro: '💰',
}

// ─── KPI Cards ───────────────────────────────────────────────────────────────

interface KPIs {
  receita_bruta: number
  receita_liquida: number
  comissoes: number
  pendentes: number
  count_pago: number
  count_pendente: number
}

function KpiCards({ kpis }: { kpis: KPIs }) {
  const cards = [
    { label: 'Receita Bruta', value: fmt(kpis.receita_bruta), sub: `${kpis.count_pago + kpis.count_pendente} lançamentos`, cor: '#4A3AE8', bg: '#4A3AE815', Icon: TrendingUp },
    { label: 'Receita Líquida', value: fmt(kpis.receita_liquida), sub: 'pagamentos recebidos', cor: '#27AE60', bg: '#27AE6015', Icon: CheckCircle2 },
    { label: 'A Receber', value: fmt(kpis.pendentes), sub: `${kpis.count_pendente} pendentes`, cor: '#E67E22', bg: '#E67E2215', Icon: Clock },
    { label: 'Comissões', value: fmt(kpis.comissoes), sub: 'repasse total', cor: '#8E44AD', bg: '#8E44AD15', Icon: Percent },
  ]
  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map(c => (
        <div key={c.label} className="bg-white rounded-2xl border border-[#E8E8E8] p-5 flex items-start justify-between shadow-sm">
          <div>
            <p className="text-xs text-[#7F8C8D] font-medium mb-1">{c.label}</p>
            <p className="text-2xl font-bold" style={{ color: c.cor }}>{c.value}</p>
            <p className="text-xs text-[#7F8C8D] mt-1">{c.sub}</p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.bg }}>
            <c.Icon size={18} style={{ color: c.cor }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Aba Lançamentos ──────────────────────────────────────────────────────────

interface LancamentosAbaProps {
  receitas: ReceitaFinanceira[]
  onAtualizar: () => void
}

function LancamentosAba({ receitas, onAtualizar }: LancamentosAbaProps) {
  const [busca, setBusca]           = useState('')
  const [filtroStatus, setFiltro]   = useState('todos')
  const [di, setDi]                 = useState('')
  const [df, setDf]                 = useState('')
  const [pending, startT]           = useTransition()

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase()
    return receitas.filter(r => {
      if (filtroStatus !== 'todos' && r.status !== filtroStatus) return false
      if (di && r.data_competencia < di) return false
      if (df && r.data_competencia > df) return false
      if (q) {
        const hay = `${r.pacientes?.nome ?? ''} ${r.servicos?.nome ?? ''} ${r.profissionais?.nome ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [receitas, busca, filtroStatus, di, df])

  function exportar() {
    const rows = filtradas.map(r => ({
      'Data':          fmtData(r.data_competencia),
      'Paciente':      r.pacientes?.nome ?? '',
      'Profissional':  r.profissionais?.nome ?? '',
      'Serviço':       r.servicos?.nome ?? '',
      'Forma Pgto':    r.config_formas_pagamento?.nome ?? '',
      'Valor Bruto':   r.valor_bruto,
      'Desconto':      r.desconto,
      'Taxa':          r.taxa_operadora,
      'Valor Líquido': r.valor_liquido,
      'Comissão':      r.valor_comissao,
      'Status':        STATUS_META[r.status]?.label ?? r.status,
      'Liquidez':      r.data_liquidez ? fmtData(r.data_liquidez) : '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Lançamentos')
    XLSX.writeFile(wb, `lancamentos_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  async function marcarPago(id: string) {
    startT(async () => {
      await atualizarStatusReceitaAction(id, 'pago')
      onAtualizar()
    })
  }
  async function cancelar(id: string) {
    startT(async () => {
      await atualizarStatusReceitaAction(id, 'cancelado')
      onAtualizar()
    })
  }

  const totLiquido = filtradas.filter(r => r.status === 'pago').reduce((s, r) => s + r.valor_liquido, 0)

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white border border-[#E8E8E8] rounded-2xl p-3 shadow-sm space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar paciente, profissional, serviço…"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#F8F9FA] text-sm outline-none focus:bg-white focus:ring-1 focus:ring-[#4A3AE8]" />
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-[#7F8C8D]" />
            <input type="date" value={di} onChange={e => setDi(e.target.value)}
              className="h-9 px-2 rounded-lg bg-[#F8F9FA] text-sm outline-none" />
            <span className="text-xs text-[#7F8C8D]">até</span>
            <input type="date" value={df} onChange={e => setDf(e.target.value)}
              className="h-9 px-2 rounded-lg bg-[#F8F9FA] text-sm outline-none" />
          </div>
          <div className="inline-flex bg-[#F8F9FA] rounded-lg p-0.5">
            {(['todos', 'pago', 'pendente', 'cancelado'] as const).map(s => (
              <button key={s} onClick={() => setFiltro(s)}
                className={`px-3 h-8 text-[11px] font-semibold rounded-md transition-colors ${filtroStatus === s ? 'bg-white text-[#2C3E50] shadow-sm' : 'text-[#7F8C8D]'}`}>
                {s === 'todos' ? 'Todos' : STATUS_META[s]?.label}
              </button>
            ))}
          </div>
          {filtradas.length > 0 && (
            <button onClick={exportar}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#27AE60] text-white text-xs font-semibold hover:bg-[#219653]">
              <Download size={13} /> Excel
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-[#7F8C8D]">
          <span><strong className="text-[#2C3E50]">{filtradas.length}</strong> lançamentos</span>
          <span>Líquido recebido: <strong className="text-[#27AE60]">{fmt(totLiquido)}</strong></span>
        </div>
      </div>

      {/* Tabela */}
      {filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-12 text-center">
          <DollarSign size={32} className="mx-auto mb-2 text-[#E8E8E8]" />
          <p className="text-sm text-[#7F8C8D]">Nenhum lançamento encontrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F9FA] border-b border-[#E8E8E8]">
                <tr>
                  {['Data', 'Paciente', 'Profissional', 'Serviço', 'Forma Pgto', 'Bruto', 'Taxa', 'Líquido', 'Comissão', 'Status', ''].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold text-[#7F8C8D] uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map(r => {
                  const st = STATUS_META[r.status]
                  return (
                    <tr key={r.id} className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#F8F9FA]/50">
                      <td className="px-4 py-3 text-[#2C3E50] whitespace-nowrap">
                        <p className="font-medium">{fmtData(r.data_competencia)}</p>
                        {r.data_liquidez && r.data_liquidez !== r.data_competencia && (
                          <p className="text-[10px] text-[#7F8C8D]">Liq: {fmtData(r.data_liquidez)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#2C3E50]">{r.pacientes?.nome ?? '—'}</td>
                      <td className="px-4 py-3 text-[#7F8C8D]">{r.profissionais?.nome ?? '—'}</td>
                      <td className="px-4 py-3 text-[#7F8C8D]">{r.servicos?.nome ?? '—'}</td>
                      <td className="px-4 py-3 text-[#7F8C8D] whitespace-nowrap">
                        {TIPO_ICON[r.config_formas_pagamento?.tipo ?? ''] ?? '💰'} {r.config_formas_pagamento?.nome ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#2C3E50]">{fmt(r.valor_bruto)}</td>
                      <td className="px-4 py-3 text-[#E74C3C] text-xs">{r.taxa_operadora > 0 ? `- ${fmt(r.taxa_operadora)}` : '—'}</td>
                      <td className="px-4 py-3 font-bold text-[#27AE60]">{fmt(r.valor_liquido)}</td>
                      <td className="px-4 py-3 text-[#8E44AD] text-xs">
                        {r.valor_comissao > 0 ? <>{fmt(r.valor_comissao)} <span className="opacity-60">({r.percentual_comissao}%)</span></> : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ color: st?.cor, background: st?.bg }}>
                          {st?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {r.status === 'pendente' && (
                            <button onClick={() => marcarPago(r.id)} disabled={pending}
                              className="text-[10px] font-semibold text-[#27AE60] hover:underline whitespace-nowrap">
                              Marcar pago
                            </button>
                          )}
                          {r.status === 'pago' && (
                            <button onClick={() => cancelar(r.id)} disabled={pending}
                              className="text-[10px] text-[#E74C3C] hover:underline">Estornar</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Aba Comissões ────────────────────────────────────────────────────────────

function ComissoesAba({ receitas, profissionais }: { receitas: ReceitaFinanceira[]; profissionais: { id: string; nome: string }[] }) {
  const [periodo, setPeriodo] = useState<'mes' | 'semana' | 'custom'>('mes')
  const [di, setDi] = useState('')
  const [df, setDf] = useState('')

  const { inicio, fim } = useMemo(() => {
    const hoje = new Date()
    if (periodo === 'mes') {
      return {
        inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10),
        fim:    new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10),
      }
    }
    if (periodo === 'semana') {
      const d = new Date(hoje); d.setDate(hoje.getDate() - hoje.getDay() + 1)
      const f = new Date(d); f.setDate(d.getDate() + 6)
      return { inicio: d.toISOString().slice(0, 10), fim: f.toISOString().slice(0, 10) }
    }
    return { inicio: di, fim: df }
  }, [periodo, di, df])

  const relatorio = useMemo(() => {
    const filtradas = receitas.filter(r =>
      r.status !== 'cancelado' && r.status !== 'estornado' &&
      (!inicio || r.data_competencia >= inicio) &&
      (!fim    || r.data_competencia <= fim)
    )

    const byProf: Record<string, {
      nome: string; count: number;
      bruto: number; taxas: number; descontos: number; base: number; comissao: number;
    }> = {}

    for (const r of filtradas) {
      const pid  = r.profissional_id ?? '__sem__'
      const nome = r.profissionais?.nome ?? '(sem profissional)'
      if (!byProf[pid]) byProf[pid] = { nome, count: 0, bruto: 0, taxas: 0, descontos: 0, base: 0, comissao: 0 }
      byProf[pid].count   += 1
      byProf[pid].bruto   += r.valor_bruto
      byProf[pid].taxas   += r.taxa_operadora
      byProf[pid].descontos += r.desconto
      byProf[pid].base    += r.valor_liquido
      byProf[pid].comissao += r.valor_comissao
    }
    return Object.values(byProf).sort((a, b) => b.comissao - a.comissao)
  }, [receitas, inicio, fim])

  return (
    <div className="space-y-4">
      {/* Período */}
      <div className="bg-white border border-[#E8E8E8] rounded-2xl p-4 shadow-sm flex items-center gap-4 flex-wrap">
        <div className="inline-flex bg-[#F8F9FA] rounded-lg p-0.5">
          {(['semana', 'mes', 'custom'] as const).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={`px-4 h-8 text-xs font-semibold rounded-md ${periodo === p ? 'bg-white shadow-sm text-[#2C3E50]' : 'text-[#7F8C8D]'}`}>
              {p === 'semana' ? 'Esta semana' : p === 'mes' ? 'Este mês' : 'Personalizado'}
            </button>
          ))}
        </div>
        {periodo === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={di} onChange={e => setDi(e.target.value)}
              className="h-9 px-2 rounded-lg bg-[#F8F9FA] text-sm outline-none" />
            <span className="text-xs text-[#7F8C8D]">até</span>
            <input type="date" value={df} onChange={e => setDf(e.target.value)}
              className="h-9 px-2 rounded-lg bg-[#F8F9FA] text-sm outline-none" />
          </div>
        )}
      </div>

      {relatorio.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-12 text-center">
          <p className="text-sm text-[#7F8C8D]">Nenhuma comissão no período.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F8F9FA] border-b border-[#E8E8E8]">
              <tr>
                {['Profissional', 'Atendimentos', 'Receita Bruta', 'Descontos', 'Taxas', 'Base Comissão', 'Comissão (líq.)'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {relatorio.map(r => (
                <tr key={r.nome} className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#F8F9FA]/50">
                  <td className="px-5 py-3 font-semibold text-[#2C3E50]">{r.nome}</td>
                  <td className="px-5 py-3 text-[#7F8C8D]">{r.count}</td>
                  <td className="px-5 py-3 font-medium text-[#2C3E50]">{fmt(r.bruto)}</td>
                  <td className="px-5 py-3 text-[#E67E22]">{r.descontos > 0 ? `- ${fmt(r.descontos)}` : '—'}</td>
                  <td className="px-5 py-3 text-[#E74C3C]">{r.taxas > 0 ? `- ${fmt(r.taxas)}` : '—'}</td>
                  <td className="px-5 py-3 font-medium text-[#2C3E50]">{fmt(r.base)}</td>
                  <td className="px-5 py-3">
                    <span className="font-bold text-[#8E44AD]">{fmt(r.comissao)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[#F8F9FA] border-t-2 border-[#E8E8E8]">
              <tr>
                <td className="px-5 py-3 font-bold text-[#2C3E50]">Total</td>
                <td className="px-5 py-3 text-[#7F8C8D]">{relatorio.reduce((s, r) => s + r.count, 0)}</td>
                <td className="px-5 py-3 font-bold text-[#2C3E50]">{fmt(relatorio.reduce((s, r) => s + r.bruto, 0))}</td>
                <td className="px-5 py-3 text-[#E67E22]">- {fmt(relatorio.reduce((s, r) => s + r.descontos, 0))}</td>
                <td className="px-5 py-3 text-[#E74C3C]">- {fmt(relatorio.reduce((s, r) => s + r.taxas, 0))}</td>
                <td className="px-5 py-3 font-bold">{fmt(relatorio.reduce((s, r) => s + r.base, 0))}</td>
                <td className="px-5 py-3 font-bold text-[#8E44AD]">{fmt(relatorio.reduce((s, r) => s + r.comissao, 0))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Aba Configurações ────────────────────────────────────────────────────────

interface ConfigAbaProps {
  formas: FormaPagamento[]
  comissoes: ComissaoConfig[]
  profissionais: { id: string; nome: string }[]
  servicos: { id: string; nome: string }[]
  onAtualizar: () => void
}

function ConfigAba({ formas, comissoes, profissionais, servicos, onAtualizar }: ConfigAbaProps) {
  const [secao, setSecao] = useState<'formas' | 'comissoes'>('formas')
  const [editandoForma, setEditandoForma] = useState<Partial<FormaPagamento> | null>(null)
  const [editandoCom, setEditandoCom] = useState<Partial<ComissaoConfig> | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function salvarForma() {
    if (!editandoForma?.nome || !editandoForma?.tipo) { setErr('Nome e tipo são obrigatórios.'); return }
    setSaving(true); setErr('')
    const r = await salvarFormaPagamentoAction({
      id:                 editandoForma.id,
      nome:               editandoForma.nome!,
      tipo:               editandoForma.tipo!,
      taxa_percentual:    editandoForma.taxa_percentual ?? 0,
      taxa_fixa:          editandoForma.taxa_fixa ?? 0,
      prazo_liquidez_dias: editandoForma.prazo_liquidez_dias ?? 0,
      ativo:              editandoForma.ativo ?? true,
    })
    setSaving(false)
    if ('error' in r) { setErr(r.error); return }
    setEditandoForma(null)
    onAtualizar()
  }

  async function excluirForma(id: string) {
    if (!confirm('Excluir esta forma de pagamento?')) return
    await excluirFormaPagamentoAction(id)
    onAtualizar()
  }

  async function salvarComissao() {
    if (editandoCom?.percentual == null) { setErr('Informe o percentual.'); return }
    setSaving(true); setErr('')
    const r = await salvarComissaoAction({
      id:               editandoCom.id,
      profissional_id:  editandoCom.profissional_id ?? null,
      servico_id:       editandoCom.servico_id ?? null,
      percentual:       editandoCom.percentual,
      ativo:            editandoCom.ativo ?? true,
    })
    setSaving(false)
    if ('error' in r) { setErr(r.error); return }
    setEditandoCom(null)
    onAtualizar()
  }

  async function excluirComissao(id: string) {
    if (!confirm('Excluir esta regra de comissão?')) return
    await excluirComissaoAction(id)
    onAtualizar()
  }

  const TIPOS = ['dinheiro', 'pix', 'credito', 'debito', 'transferencia', 'convenio', 'outro']

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="inline-flex bg-white border border-[#E8E8E8] rounded-xl p-1">
        <button onClick={() => setSecao('formas')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${secao === 'formas' ? 'bg-[#4A3AE8] text-white' : 'text-[#7F8C8D] hover:text-[#2C3E50]'}`}>
          Formas de Pagamento
        </button>
        <button onClick={() => setSecao('comissoes')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${secao === 'comissoes' ? 'bg-[#4A3AE8] text-white' : 'text-[#7F8C8D] hover:text-[#2C3E50]'}`}>
          Comissões
        </button>
      </div>

      {err && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{err}</div>}

      {/* Formas de pagamento */}
      {secao === 'formas' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-[#7F8C8D]">Configure taxas e prazos de liquidez por método.</p>
            <button onClick={() => setEditandoForma({ ativo: true, taxa_percentual: 0, taxa_fixa: 0, prazo_liquidez_dias: 0 })}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#4A3AE8] text-white text-sm font-semibold hover:bg-[#3829c7]">
              <Plus size={14} /> Nova Forma
            </button>
          </div>

          {editandoForma && (
            <div className="bg-[#F8F9FA] border border-[#E8E8E8] rounded-2xl p-5 space-y-3">
              <p className="font-semibold text-[#2C3E50]">{editandoForma.id ? 'Editar' : 'Nova'} Forma de Pagamento</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#7F8C8D] mb-1">Nome</label>
                  <input value={editandoForma.nome ?? ''} onChange={e => setEditandoForma(p => ({ ...p!, nome: e.target.value }))}
                    className="w-full h-9 px-3 border border-[#E8E8E8] rounded-lg text-sm outline-none focus:border-[#4A3AE8]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#7F8C8D] mb-1">Tipo</label>
                  <select value={editandoForma.tipo ?? ''} onChange={e => setEditandoForma(p => ({ ...p!, tipo: e.target.value }))}
                    className="w-full h-9 px-3 border border-[#E8E8E8] rounded-lg text-sm outline-none focus:border-[#4A3AE8] bg-white">
                    <option value="">Selecione…</option>
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#7F8C8D] mb-1">Taxa % (operadora)</label>
                  <input type="number" step={0.01} value={editandoForma.taxa_percentual ?? 0}
                    onChange={e => setEditandoForma(p => ({ ...p!, taxa_percentual: parseFloat(e.target.value) || 0 }))}
                    className="w-full h-9 px-3 border border-[#E8E8E8] rounded-lg text-sm outline-none focus:border-[#4A3AE8]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#7F8C8D] mb-1">Taxa Fixa (R$)</label>
                  <input type="number" step={0.01} value={editandoForma.taxa_fixa ?? 0}
                    onChange={e => setEditandoForma(p => ({ ...p!, taxa_fixa: parseFloat(e.target.value) || 0 }))}
                    className="w-full h-9 px-3 border border-[#E8E8E8] rounded-lg text-sm outline-none focus:border-[#4A3AE8]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#7F8C8D] mb-1">Prazo Liquidez (D+)</label>
                  <input type="number" step={1} value={editandoForma.prazo_liquidez_dias ?? 0}
                    onChange={e => setEditandoForma(p => ({ ...p!, prazo_liquidez_dias: parseInt(e.target.value) || 0 }))}
                    className="w-full h-9 px-3 border border-[#E8E8E8] rounded-lg text-sm outline-none focus:border-[#4A3AE8]" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={salvarForma} disabled={saving}
                  className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#27AE60] text-white text-sm font-semibold hover:bg-[#219653] disabled:opacity-50">
                  <Save size={13} /> {saving ? 'Salvando…' : 'Salvar'}
                </button>
                <button onClick={() => { setEditandoForma(null); setErr('') }}
                  className="h-9 px-4 rounded-xl border border-[#E8E8E8] text-sm text-[#7F8C8D] hover:bg-[#F8F9FA]">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F9FA] border-b border-[#E8E8E8]">
                <tr>
                  {['Nome', 'Tipo', 'Taxa %', 'Taxa Fixa', 'D+N', 'Ativo', ''].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {formas.map(f => (
                  <tr key={f.id} className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#F8F9FA]/50">
                    <td className="px-5 py-3 font-medium text-[#2C3E50]">{TIPO_ICON[f.tipo]} {f.nome}</td>
                    <td className="px-5 py-3 text-[#7F8C8D] capitalize">{f.tipo}</td>
                    <td className="px-5 py-3 text-[#2C3E50]">{f.taxa_percentual}%</td>
                    <td className="px-5 py-3 text-[#2C3E50]">{f.taxa_fixa > 0 ? fmt(f.taxa_fixa) : '—'}</td>
                    <td className="px-5 py-3 text-[#2C3E50]">D+{f.prazo_liquidez_dias}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${f.ativo ? 'bg-[#27AE60]/10 text-[#27AE60]' : 'bg-[#E8E8E8] text-[#7F8C8D]'}`}>
                        {f.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditandoForma(f)}
                          className="text-xs text-[#4A3AE8] hover:underline">Editar</button>
                        <button onClick={() => excluirForma(f.id)}
                          className="text-[#E74C3C] hover:opacity-70"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comissões */}
      {secao === 'comissoes' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-[#7F8C8D]">
              Hierarquia: Profissional+Serviço → Profissional → Global clínica
            </p>
            <button onClick={() => setEditandoCom({ ativo: true, profissional_id: null, servico_id: null, percentual: 0 })}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#4A3AE8] text-white text-sm font-semibold hover:bg-[#3829c7]">
              <Plus size={14} /> Nova Regra
            </button>
          </div>

          {editandoCom && (
            <div className="bg-[#F8F9FA] border border-[#E8E8E8] rounded-2xl p-5 space-y-3">
              <p className="font-semibold text-[#2C3E50]">{editandoCom.id ? 'Editar' : 'Nova'} Regra de Comissão</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#7F8C8D] mb-1">Profissional (vazio = global)</label>
                  <select value={editandoCom.profissional_id ?? ''}
                    onChange={e => setEditandoCom(p => ({ ...p!, profissional_id: e.target.value || null }))}
                    className="w-full h-9 px-3 border border-[#E8E8E8] rounded-lg text-sm outline-none focus:border-[#4A3AE8] bg-white">
                    <option value="">Todos (global)</option>
                    {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#7F8C8D] mb-1">Serviço (vazio = todos)</label>
                  <select value={editandoCom.servico_id ?? ''}
                    onChange={e => setEditandoCom(p => ({ ...p!, servico_id: e.target.value || null }))}
                    className="w-full h-9 px-3 border border-[#E8E8E8] rounded-lg text-sm outline-none focus:border-[#4A3AE8] bg-white">
                    <option value="">Todos</option>
                    {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#7F8C8D] mb-1">Percentual %</label>
                  <input type="number" step={0.5} min={0} max={100} value={editandoCom.percentual ?? 0}
                    onChange={e => setEditandoCom(p => ({ ...p!, percentual: parseFloat(e.target.value) || 0 }))}
                    className="w-full h-9 px-3 border border-[#E8E8E8] rounded-lg text-sm outline-none focus:border-[#4A3AE8]" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={salvarComissao} disabled={saving}
                  className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#27AE60] text-white text-sm font-semibold hover:bg-[#219653] disabled:opacity-50">
                  <Save size={13} /> {saving ? 'Salvando…' : 'Salvar'}
                </button>
                <button onClick={() => { setEditandoCom(null); setErr('') }}
                  className="h-9 px-4 rounded-xl border border-[#E8E8E8] text-sm text-[#7F8C8D] hover:bg-[#F8F9FA]">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F9FA] border-b border-[#E8E8E8]">
                <tr>
                  {['Profissional', 'Serviço', '%', 'Escopo', ''].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comissoes.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-[#7F8C8D]">Nenhuma regra configurada.</td></tr>
                ) : comissoes.map(c => {
                  const profNome = profissionais.find(p => p.id === c.profissional_id)?.nome
                  const servNome = servicos.find(s => s.id === c.servico_id)?.nome
                  const escopo   = !c.profissional_id ? 'Global da clínica' : !c.servico_id ? 'Geral do profissional' : 'Específico'
                  return (
                    <tr key={c.id} className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#F8F9FA]/50">
                      <td className="px-5 py-3 font-medium text-[#2C3E50]">{profNome ?? '(todos)'}</td>
                      <td className="px-5 py-3 text-[#7F8C8D]">{servNome ?? '(todos)'}</td>
                      <td className="px-5 py-3 font-bold text-[#8E44AD]">{c.percentual}%</td>
                      <td className="px-5 py-3">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#4A3AE8]/10 text-[#4A3AE8]">{escopo}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditandoCom(c)} className="text-xs text-[#4A3AE8] hover:underline">Editar</button>
                          <button onClick={() => excluirComissao(c.id)} className="text-[#E74C3C] hover:opacity-70"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Componente raiz ──────────────────────────────────────────────────────────

type Tab = 'lancamentos' | 'comissoes' | 'config'

interface Props {
  kpis: KPIs
  todasReceitas: ReceitaFinanceira[]
  formas: FormaPagamento[]
  comissoes: ComissaoConfig[]
  profissionais: { id: string; nome: string }[]
  servicos: { id: string; nome: string }[]
  periodoLabel?: string
}

export function FinanceiroClient({ kpis, todasReceitas, formas, comissoes, profissionais, servicos }: Props) {
  const [tab, setTab] = useState<Tab>('lancamentos')
  const [refreshKey, setRefreshKey] = useState(0)

  function atualizar() {
    setRefreshKey(k => k + 1)
    // forçar reload dos dados server-side
    window.location.reload()
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'lancamentos', label: 'Lançamentos' },
    { id: 'comissoes',   label: 'Comissões' },
    { id: 'config',      label: 'Configurações' },
  ]

  return (
    <div className="space-y-5">
      <KpiCards kpis={kpis} />

      <div className="inline-flex p-1 bg-white rounded-full border border-[#E8E8E8] shadow-sm">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              tab === t.id ? 'bg-[#F8F9FA] text-[#2C3E50] shadow-sm' : 'text-[#7F8C8D] hover:text-[#2C3E50]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'lancamentos' && (
        <LancamentosAba receitas={todasReceitas} onAtualizar={atualizar} />
      )}
      {tab === 'comissoes' && (
        <ComissoesAba receitas={todasReceitas} profissionais={profissionais} />
      )}
      {tab === 'config' && (
        <ConfigAba formas={formas} comissoes={comissoes}
          profissionais={profissionais} servicos={servicos} onAtualizar={atualizar} />
      )}
    </div>
  )
}
