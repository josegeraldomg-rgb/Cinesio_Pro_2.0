'use client'

import { useState, useMemo, useTransition } from 'react'
import {
  DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle2, Percent,
  Search, Download, Plus, Save, Trash2, Calendar, ChevronRight,
  BarChart2, Repeat, Settings, Users, CreditCard, BookOpen, X,
  ArrowUpCircle, ArrowDownCircle, Wallet, Info, ChevronDown, ChevronUp,
  FileText, AlertCircle,
} from 'lucide-react'
import type { ReceitaFinanceira, FormaPagamento } from './actions'
import {
  atualizarStatusReceitaAction, salvarFormaPagamentoAction, excluirFormaPagamentoAction,
  salvarComissaoAction, excluirComissaoAction,
} from './actions'
import type { ComissaoConfig } from '@/lib/financeiro/calcular-comissao'
import * as XLSX from 'xlsx'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtData(s: string) {
  return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR')
}
function fmtMes(s: string) {
  return new Date(s + '-15').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
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

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface KPIs {
  receita_bruta: number
  receita_liquida: number
  comissoes: number
  pendentes: number
  count_pago: number
  count_pendente: number
}

type Pilar = 'analise' | 'operacoes' | 'configuracoes'
type TabAnalise = 'visao-geral' | 'movimentacao' | 'extrato-pacientes'
type TabOperacoes = 'gestao-profissionais' | 'regras-fixas'
type TabConfig = 'contas-taxas' | 'config-comissoes'
type AbaAtiva = TabAnalise | TabOperacoes | TabConfig

// ─── Guia Inteligente ─────────────────────────────────────────────────────────

const GUIA: Record<AbaAtiva, { titulo: string; items: { emoji: string; titulo: string; texto: string }[] }> = {
  'visao-geral': {
    titulo: 'Visão Geral — Painel Executivo',
    items: [
      { emoji: '💰', titulo: 'Faturamento Bruto', texto: 'Soma de tudo que foi cobrado no mês, independente de taxas e descontos. É o número "antes de qualquer desconto".' },
      { emoji: '✅', titulo: 'Lucro Real da Clínica', texto: 'Receita já descontada as taxas das maquininhas e os descontos concedidos — o dinheiro que realmente entra no caixa.' },
      { emoji: '📈', titulo: 'Evolução Mensal', texto: 'O gráfico compara receita líquida e comissões nos últimos 6 meses. Use-o para identificar sazonalidade e tendências de crescimento.' },
    ],
  },
  'movimentacao': {
    titulo: 'Movimentação — Fluxo de Caixa',
    items: [
      { emoji: '🔍', titulo: 'Filtros avançados', texto: 'Filtre por data, status (pago, pendente, cancelado) ou busque pelo nome do paciente, profissional ou serviço.' },
      { emoji: '✔️', titulo: 'Marcar como Pago', texto: 'Lançamentos pendentes podem ser confirmados aqui. Isso atualiza o Lucro Real no painel e o saldo de comissões dos profissionais.' },
      { emoji: '📥', titulo: 'Exportar Excel', texto: 'Gera planilha com todos os campos: data, valor bruto, taxa, líquido e comissão — útil para envio ao contador.' },
    ],
  },
  'extrato-pacientes': {
    titulo: 'Extrato de Pacientes',
    items: [
      { emoji: '🔎', titulo: 'Selecione o paciente', texto: 'Clique no nome do paciente à esquerda para carregar todos os lançamentos vinculados a ele no período.' },
      { emoji: '📋', titulo: 'Prestação de contas', texto: 'Ideal para pacientes em pacotes ou mensalidades que solicitam comprovante de sessões e valores pagos.' },
      { emoji: '📤', titulo: 'Exportar extrato', texto: 'Gera o extrato individual em Excel. Você pode usar como base para criar um PDF personalizado para o paciente.' },
    ],
  },
  'gestao-profissionais': {
    titulo: 'Gestão de Profissionais',
    items: [
      { emoji: '🧮', titulo: 'Comissão Líquida', texto: 'Fórmula: (Valor Bruto − Descontos − Taxa Operadora) × % Comissão. O sistema já subtrai as taxas de maquininha antes de calcular.' },
      { emoji: '📅', titulo: 'Selecione o período', texto: 'Escolha "Este mês", "Mês anterior" ou um intervalo personalizado para gerar o fechamento de qualquer competência.' },
      { emoji: '💸', titulo: 'Saldo a repassar', texto: 'O banner roxo mostra o total consolidado de comissões do período. Use o botão de exportação para gerar o extrato antes de realizar o pagamento.' },
    ],
  },
  'regras-fixas': {
    titulo: 'Regras Fixas — Recorrências',
    items: [
      { emoji: '🔁', titulo: 'Como funciona', texto: 'Cada regra gera automaticamente um lançamento no fluxo de caixa no dia do mês configurado. Você não precisa lançar manualmente todo mês.' },
      { emoji: '↓ ↑', titulo: 'Despesas e Receitas', texto: 'Cadastre despesas (aluguel, internet, salários) e também receitas fixas (mensalidades de convênio, por exemplo).' },
      { emoji: '⏸️', titulo: 'Pausar sem excluir', texto: 'Marque uma regra como "Pausado" para interromper temporariamente sem perder a configuração — útil para despesas sazonais.' },
    ],
  },
  'contas-taxas': {
    titulo: 'Contas e Taxas',
    items: [
      { emoji: '🏦', titulo: 'Contas Bancárias', texto: 'Cadastre cada conta (Caixa, Banco, Conta Digital) com seu saldo inicial. Elas serão usadas como "destino" nas taxas de operador.' },
      { emoji: '💳', titulo: 'Taxas por Operador', texto: 'Configure o percentual cobrado por cada maquininha ou método (ex: Crédito 2,5%). Isso permite calcular o Lucro Real automaticamente.' },
      { emoji: '📆', titulo: 'Prazo D+N', texto: 'Informe o prazo de liquidez de cada método (ex: Débito D+1, Crédito D+30). O sistema projeta a data exata que o dinheiro cairá na conta.' },
    ],
  },
  'config-comissoes': {
    titulo: 'Config. Comissões',
    items: [
      { emoji: '⚖️', titulo: 'Hierarquia de regras', texto: 'A regra mais específica sempre vence: Profissional+Serviço > Profissional > Global. Deixe campos em branco para aplicar a todos.' },
      { emoji: '🎯', titulo: 'Regra específica', texto: 'Exemplo: defina 50% apenas para o serviço "Botox" com o Dr. João — os demais atendimentos dele seguem a regra geral.' },
      { emoji: '🏢', titulo: 'Divisão Clínica/Prof.', texto: 'A tabela mostra automaticamente o percentual da clínica (100% − % profissional), facilitando a visualização da divisão de receita.' },
    ],
  },
}

function GuiaInteligente({ aba }: { aba: AbaAtiva }) {
  const [aberto, setAberto] = useState(false)
  const g = GUIA[aba]
  return (
    <div className="bg-gradient-to-b from-[#F0F4FF] to-[#F8FAFC] border border-[#C7D2FE] rounded-2xl overflow-hidden">
      <button
        onClick={() => setAberto(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer hover:bg-[#E8EDFF] transition-colors rounded-t-2xl"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#4A3AE8] flex items-center justify-center">
            <Info size={12} className="text-white" />
          </div>
          <span className="text-xs font-bold text-[#4A3AE8] uppercase tracking-wide">Guia Educativo</span>
        </div>
        {aberto ? <ChevronUp size={14} className="text-[#4A3AE8]" /> : <ChevronDown size={14} className="text-[#4A3AE8]" />}
      </button>
      {aberto && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs font-semibold text-[#3730A3] mb-3">{g.titulo}</p>
          {g.items.map(item => (
            <div key={item.titulo} className="bg-white rounded-xl p-3 border border-[#E0E7FF]">
              <p className="text-xs font-bold text-[#1E293B] mb-1">{item.emoji} {item.titulo}</p>
              <p className="text-[11px] text-[#64748B] leading-relaxed">{item.texto}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Visão Geral ──────────────────────────────────────────────────────────────

function VisaoGeralAba({ kpis, receitas }: { kpis: KPIs; receitas: ReceitaFinanceira[] }) {
  // Agrupa por mês (últimos 6)
  const porMes = useMemo(() => {
    const map: Record<string, { receita: number; comissao: number }> = {}
    for (const r of receitas) {
      if (r.status === 'cancelado' || r.status === 'estornado') continue
      const mes = r.data_competencia.slice(0, 7)
      if (!map[mes]) map[mes] = { receita: 0, comissao: 0 }
      map[mes].receita   += r.valor_liquido
      map[mes].comissao  += r.valor_comissao
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-6)
  }, [receitas])

  // Por forma de pagamento
  const porForma = useMemo(() => {
    const map: Record<string, { nome: string; tipo: string; total: number }> = {}
    for (const r of receitas) {
      if (r.status !== 'pago') continue
      const key = r.config_formas_pagamento?.nome ?? 'Outro'
      if (!map[key]) map[key] = { nome: key, tipo: r.config_formas_pagamento?.tipo ?? 'outro', total: 0 }
      map[key].total += r.valor_bruto
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 6)
  }, [receitas])

  const maxBar = Math.max(...porMes.map(([, v]) => v.receita), 1)
  const totalForma = porForma.reduce((s, f) => s + f.total, 0)

  const recentes = useMemo(() =>
    receitas.filter(r => r.status !== 'cancelado').slice(0, 8)
  , [receitas])

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Faturamento Bruto',  value: fmt(kpis.receita_bruta),   sub: `${kpis.count_pago + kpis.count_pendente} lançamentos`, cor: '#4A3AE8', bg: '#EEF2FF', Icon: TrendingUp },
          { label: 'Lucro Real',         value: fmt(kpis.receita_liquida), sub: 'após taxas e descontos',     cor: '#16A34A', bg: '#DCFCE7', Icon: CheckCircle2 },
          { label: 'Comissões Totais',   value: fmt(kpis.comissoes),       sub: 'saldo a repassar',           cor: '#7C3AED', bg: '#F3E8FF', Icon: Percent },
          { label: 'A Receber',          value: fmt(kpis.pendentes),       sub: `${kpis.count_pendente} pendentes`, cor: '#D97706', bg: '#FEF3C7', Icon: Clock },
        ].map(c => (
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

      {/* Gráficos */}
      <div className="grid grid-cols-3 gap-4">
        {/* Evolução mensal */}
        <div className="col-span-2 bg-white rounded-2xl border border-[#E8E8E8] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold text-[#1E293B] text-sm">Evolução Mensal</p>
              <p className="text-xs text-[#94A3B8]">Receita líquida vs. Comissões</p>
            </div>
            <BarChart2 size={16} className="text-[#CBD5E1]" />
          </div>
          {porMes.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-xs text-[#94A3B8]">Sem dados no período</div>
          ) : (
            <div className="flex items-end gap-3 h-36">
              {porMes.map(([mes, v]) => (
                <div key={mes} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-0.5 items-end" style={{ height: 96 }}>
                    <div className="flex-1 rounded-t-md bg-[#4A3AE8] transition-all"
                      style={{ height: `${Math.round((v.receita / maxBar) * 96)}px`, minHeight: 2 }} />
                    <div className="flex-1 rounded-t-md bg-[#7C3AED]/40 transition-all"
                      style={{ height: `${Math.round((v.comissao / maxBar) * 96)}px`, minHeight: 2 }} />
                  </div>
                  <span className="text-[9px] text-[#94A3B8] uppercase">{fmtMes(mes)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#4A3AE8]" /><span className="text-[10px] text-[#64748B]">Receita líquida</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#7C3AED]/40" /><span className="text-[10px] text-[#64748B]">Comissões</span></div>
          </div>
        </div>

        {/* Por forma de pagamento */}
        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-[#1E293B] text-sm">Meio de Pagamento</p>
            <CreditCard size={14} className="text-[#CBD5E1]" />
          </div>
          {porForma.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-xs text-[#94A3B8]">Sem dados</div>
          ) : (
            <div className="space-y-2.5">
              {porForma.map(f => {
                const pct = totalForma > 0 ? Math.round((f.total / totalForma) * 100) : 0
                return (
                  <div key={f.nome}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#334155]">{TIPO_ICON[f.tipo]} {f.nome}</span>
                      <span className="text-[10px] font-bold text-[#4A3AE8]">{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div className="h-full bg-[#4A3AE8] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Movimentações recentes */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#F1F5F9]">
          <p className="font-bold text-[#1E293B] text-sm">Movimentações Recentes</p>
          <span className="text-[10px] text-[#94A3B8]">{recentes.length} registros</span>
        </div>
        <div className="divide-y divide-[#F8FAFC]">
          {recentes.length === 0 ? (
            <p className="text-center text-sm text-[#94A3B8] py-8">Nenhuma movimentação.</p>
          ) : recentes.map(r => {
            const st = STATUS_META[r.status]
            return (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#F5F6FF] transition-colors">
                <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center flex-shrink-0">
                  <ArrowUpCircle size={14} className="text-[#4A3AE8]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1E293B] truncate">
                    {r.pacientes?.nome ?? r.descricao ?? '—'}
                  </p>
                  <p className="text-[11px] text-[#94A3B8]">
                    {fmtData(r.data_competencia)} · {r.servicos?.nome ?? r.config_formas_pagamento?.nome ?? ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-[#1E293B]">{fmt(r.valor_bruto)}</p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ color: st?.cor, background: st?.bg }}>{st?.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Movimentação (Fluxo de Caixa) ───────────────────────────────────────────

function MovimentacaoAba({ receitas, onAtualizar }: { receitas: ReceitaFinanceira[]; onAtualizar: () => void }) {
  const [busca, setBusca]         = useState('')
  const [filtroStatus, setFiltro] = useState('todos')
  const [di, setDi]               = useState('')
  const [df, setDf]               = useState('')
  const [pending, startT]         = useTransition()

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
    XLSX.utils.book_append_sheet(wb, ws, 'Movimentação')
    XLSX.writeFile(wb, `movimentacao_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  async function marcarPago(id: string) {
    startT(async () => { await atualizarStatusReceitaAction(id, 'pago'); onAtualizar() })
  }
  async function cancelar(id: string) {
    startT(async () => { await atualizarStatusReceitaAction(id, 'cancelado'); onAtualizar() })
  }

  const totLiquido = filtradas.filter(r => r.status === 'pago').reduce((s, r) => s + r.valor_liquido, 0)
  const totBruto   = filtradas.reduce((s, r) => r.status !== 'cancelado' ? s + r.valor_bruto : s, 0)

  return (
    <div className="space-y-4">
      {/* Resumo rápido */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Bruto',    val: fmt(totBruto),   cor: '#4A3AE8', Icon: TrendingUp },
          { label: 'Líquido Pago',   val: fmt(totLiquido), cor: '#16A34A', Icon: ArrowUpCircle },
          { label: 'Registros',      val: String(filtradas.length), cor: '#64748B', Icon: FileText },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-[#E8E8E8] px-4 py-3 flex items-center gap-3">
            <c.Icon size={16} style={{ color: c.cor }} />
            <div><p className="text-[10px] text-[#94A3B8]">{c.label}</p><p className="font-bold text-sm" style={{ color: c.cor }}>{c.val}</p></div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white border border-[#E8E8E8] rounded-2xl p-3 shadow-sm">
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
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#16A34A] text-white text-xs font-semibold hover:bg-[#15803D]">
              <Download size={13} /> Excel
            </button>
          )}
        </div>
      </div>

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
                    <tr key={r.id} className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#F8F9FA] cursor-default">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium text-[#2C3E50]">{fmtData(r.data_competencia)}</p>
                        {r.data_liquidez && r.data_liquidez !== r.data_competencia && (
                          <p className="text-[10px] text-[#94A3B8]">Liq: {fmtData(r.data_liquidez)}</p>
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
                      <td className="px-4 py-3 font-bold text-[#16A34A]">{fmt(r.valor_liquido)}</td>
                      <td className="px-4 py-3 text-[#7C3AED] text-xs">
                        {r.valor_comissao > 0 ? <>{fmt(r.valor_comissao)} <span className="opacity-60">({r.percentual_comissao}%)</span></> : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ color: st?.cor, background: st?.bg }}>{st?.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {r.status === 'pendente' && (
                            <button onClick={() => marcarPago(r.id)} disabled={pending}
                              className="text-[10px] font-semibold text-[#16A34A] hover:underline cursor-pointer whitespace-nowrap">Marcar pago</button>
                          )}
                          {r.status === 'pago' && (
                            <button onClick={() => cancelar(r.id)} disabled={pending}
                              className="text-[10px] text-[#E74C3C] hover:underline cursor-pointer">Estornar</button>
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

// ─── Extrato de Pacientes ─────────────────────────────────────────────────────

function ExtratoPacientesAba({ receitas }: { receitas: ReceitaFinanceira[] }) {
  const [busca, setBusca] = useState('')
  const [pacSel, setPacSel] = useState<string | null>(null)

  const pacientes = useMemo(() => {
    const map: Record<string, string> = {}
    for (const r of receitas) {
      if (r.paciente_id && r.pacientes?.nome) map[r.paciente_id] = r.pacientes.nome
    }
    return Object.entries(map).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [receitas])

  const filtPac = useMemo(() =>
    pacientes.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()))
  , [pacientes, busca])

  const receitasPac = useMemo(() =>
    receitas.filter(r => r.paciente_id === pacSel).sort((a, b) => b.data_competencia.localeCompare(a.data_competencia))
  , [receitas, pacSel])

  const totalPac = receitasPac.filter(r => r.status !== 'cancelado').reduce((s, r) => s + r.valor_bruto, 0)
  const pagosPac = receitasPac.filter(r => r.status === 'pago').reduce((s, r) => s + r.valor_bruto, 0)

  function exportarExtrato() {
    const pac = pacientes.find(p => p.id === pacSel)
    const rows = receitasPac.map(r => ({
      Data:        fmtData(r.data_competencia),
      Serviço:     r.servicos?.nome ?? '',
      Profissional: r.profissionais?.nome ?? '',
      Forma:       r.config_formas_pagamento?.nome ?? '',
      Valor:       r.valor_bruto,
      Status:      STATUS_META[r.status]?.label ?? r.status,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Extrato')
    XLSX.writeFile(wb, `extrato_${pac?.nome.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Lista de pacientes */}
      <div className="w-72 flex-shrink-0 bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 border-b border-[#F1F5F9]">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar paciente…"
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-[#F8FAFC] text-sm outline-none focus:ring-1 focus:ring-[#4A3AE8]" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtPac.length === 0 ? (
            <p className="text-center text-xs text-[#94A3B8] py-6">Nenhum paciente.</p>
          ) : filtPac.map(p => (
            <button key={p.id} onClick={() => setPacSel(p.id)}
              className={`w-full text-left px-4 py-3 border-b border-[#F8FAFC] hover:bg-[#F0F4FF] transition-colors cursor-pointer ${pacSel === p.id ? 'bg-[#EEF2FF] border-l-2 border-l-[#4A3AE8]' : ''}`}>
              <p className="text-sm font-medium text-[#1E293B]">{p.nome}</p>
              <p className="text-[10px] text-[#94A3B8]">
                {receitas.filter(r => r.paciente_id === p.id).length} lançamentos
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Extrato do paciente selecionado */}
      <div className="flex-1 space-y-4">
        {!pacSel ? (
          <div className="bg-white rounded-2xl border border-[#E8E8E8] flex items-center justify-center h-48">
            <div className="text-center">
              <Users size={28} className="mx-auto mb-2 text-[#CBD5E1]" />
              <p className="text-sm text-[#94A3B8]">Selecione um paciente para ver o extrato</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#1E293B]">{pacientes.find(p => p.id === pacSel)?.nome}</p>
                <p className="text-xs text-[#94A3B8]">{receitasPac.length} lançamentos · Pago: <span className="text-[#16A34A] font-bold">{fmt(pagosPac)}</span> · Total: {fmt(totalPac)}</p>
              </div>
              <button onClick={exportarExtrato}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-[#16A34A] text-white text-xs font-semibold hover:bg-[#15803D]">
                <Download size={12} /> Exportar PDF/Excel
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#F8F9FA] border-b border-[#E8E8E8]">
                  <tr>
                    {['Data', 'Serviço', 'Profissional', 'Forma', 'Valor', 'Status'].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold text-[#7F8C8D] uppercase tracking-wider px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {receitasPac.map(r => {
                    const st = STATUS_META[r.status]
                    return (
                      <tr key={r.id} className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#F8F9FA] cursor-default">
                        <td className="px-4 py-3 text-[#2C3E50]">{fmtData(r.data_competencia)}</td>
                        <td className="px-4 py-3 font-medium text-[#2C3E50]">{r.servicos?.nome ?? '—'}</td>
                        <td className="px-4 py-3 text-[#7F8C8D]">{r.profissionais?.nome ?? '—'}</td>
                        <td className="px-4 py-3 text-[#7F8C8D]">{TIPO_ICON[r.config_formas_pagamento?.tipo ?? ''] ?? '💰'} {r.config_formas_pagamento?.nome ?? '—'}</td>
                        <td className="px-4 py-3 font-bold text-[#1E293B]">{fmt(r.valor_bruto)}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ color: st?.cor, background: st?.bg }}>{st?.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Gestão de Profissionais ──────────────────────────────────────────────────

function GestaoProfissionaisAba({ receitas, profissionais }: { receitas: ReceitaFinanceira[]; profissionais: { id: string; nome: string }[] }) {
  const [profSel, setProfSel] = useState<string>('')
  const [periodo, setPeriodo] = useState<'mes' | 'mes_ant' | 'custom'>('mes')
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
    if (periodo === 'mes_ant') {
      return {
        inicio: new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().slice(0, 10),
        fim:    new Date(hoje.getFullYear(), hoje.getMonth(), 0).toISOString().slice(0, 10),
      }
    }
    return { inicio: di, fim: df }
  }, [periodo, di, df])

  const relatorio = useMemo(() => {
    const filtradas = receitas.filter(r =>
      r.status !== 'cancelado' && r.status !== 'estornado' &&
      (!inicio || r.data_competencia >= inicio) &&
      (!fim    || r.data_competencia <= fim) &&
      (!profSel || r.profissional_id === profSel)
    )
    const byProf: Record<string, { id: string; nome: string; count: number; bruto: number; taxas: number; descontos: number; base: number; comissao: number }> = {}
    for (const r of filtradas) {
      const pid  = r.profissional_id ?? '__sem__'
      const nome = r.profissionais?.nome ?? '(sem profissional)'
      if (!byProf[pid]) byProf[pid] = { id: pid, nome, count: 0, bruto: 0, taxas: 0, descontos: 0, base: 0, comissao: 0 }
      byProf[pid].count    += 1
      byProf[pid].bruto    += r.valor_bruto
      byProf[pid].taxas    += r.taxa_operadora
      byProf[pid].descontos += r.desconto
      byProf[pid].base     += r.valor_liquido
      byProf[pid].comissao += r.valor_comissao
    }
    return Object.values(byProf).sort((a, b) => b.comissao - a.comissao)
  }, [receitas, inicio, fim, profSel])

  const totalComissao = relatorio.reduce((s, r) => s + r.comissao, 0)

  function exportarRelatorio() {
    const rows = relatorio.map(r => ({
      'Profissional':   r.nome,
      'Atendimentos':   r.count,
      'Receita Bruta':  r.bruto,
      'Descontos':      r.descontos,
      'Taxas':          r.taxas,
      'Base Comissão':  r.base,
      'Comissão (líq.)': r.comissao,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Comissões')
    XLSX.writeFile(wb, `comissoes_${inicio}_${fim}.xlsx`)
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white border border-[#E8E8E8] rounded-2xl p-4 shadow-sm flex items-center gap-4 flex-wrap">
        <select value={profSel} onChange={e => setProfSel(e.target.value)}
          className="h-9 px-3 border border-[#E8E8E8] rounded-lg text-sm outline-none focus:border-[#4A3AE8] bg-white">
          <option value="">Todos os profissionais</option>
          {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <div className="inline-flex bg-[#F8F9FA] rounded-lg p-0.5">
          {([['mes', 'Este mês'], ['mes_ant', 'Mês anterior'], ['custom', 'Personalizado']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setPeriodo(id)}
              className={`px-4 h-8 text-xs font-semibold rounded-md ${periodo === id ? 'bg-white shadow-sm text-[#2C3E50]' : 'text-[#7F8C8D]'}`}>
              {label}
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
        {relatorio.length > 0 && (
          <button onClick={exportarRelatorio}
            className="ml-auto flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#16A34A] text-white text-xs font-semibold hover:bg-[#15803D]">
            <Download size={13} /> Exportar Excel
          </button>
        )}
      </div>

      {/* KPI de comissão total */}
      {relatorio.length > 0 && (
        <div className="bg-gradient-to-r from-[#F3E8FF] to-[#EDE9FE] rounded-2xl border border-[#DDD6FE] px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#6D28D9] font-medium">Total a Repassar no Período</p>
            <p className="text-3xl font-bold text-[#7C3AED]">{fmt(totalComissao)}</p>
          </div>
          <Wallet size={32} className="text-[#7C3AED] opacity-40" />
        </div>
      )}

      {relatorio.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-12 text-center">
          <Users size={32} className="mx-auto mb-2 text-[#E8E8E8]" />
          <p className="text-sm text-[#7F8C8D]">Nenhuma comissão no período.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F8F9FA] border-b border-[#E8E8E8]">
              <tr>
                {['Profissional', 'Atendimentos', 'Receita Bruta', 'Descontos', 'Taxas Operadora', 'Base Comissão', 'Comissão Líquida'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {relatorio.map(r => (
                <tr key={r.nome} className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#F8F9FA] cursor-default">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-[#2C3E50]">{r.nome}</p>
                  </td>
                  <td className="px-5 py-3 text-[#7F8C8D]">{r.count}</td>
                  <td className="px-5 py-3 font-medium text-[#2C3E50]">{fmt(r.bruto)}</td>
                  <td className="px-5 py-3 text-[#E67E22]">{r.descontos > 0 ? `- ${fmt(r.descontos)}` : '—'}</td>
                  <td className="px-5 py-3 text-[#E74C3C]">{r.taxas > 0 ? `- ${fmt(r.taxas)}` : '—'}</td>
                  <td className="px-5 py-3 font-medium text-[#2C3E50]">{fmt(r.base)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#7C3AED] text-base">{fmt(r.comissao)}</span>
                      <span className="text-[10px] bg-[#F3E8FF] text-[#7C3AED] px-1.5 py-0.5 rounded-full font-semibold">
                        {r.bruto > 0 ? Math.round((r.comissao / r.bruto) * 100) : 0}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[#F8F9FA] border-t-2 border-[#E8E8E8]">
              <tr>
                <td className="px-5 py-3 font-bold text-[#2C3E50]">Total</td>
                <td className="px-5 py-3 text-[#7F8C8D]">{relatorio.reduce((s, r) => s + r.count, 0)}</td>
                <td className="px-5 py-3 font-bold">{fmt(relatorio.reduce((s, r) => s + r.bruto, 0))}</td>
                <td className="px-5 py-3 text-[#E67E22]">- {fmt(relatorio.reduce((s, r) => s + r.descontos, 0))}</td>
                <td className="px-5 py-3 text-[#E74C3C]">- {fmt(relatorio.reduce((s, r) => s + r.taxas, 0))}</td>
                <td className="px-5 py-3 font-bold">{fmt(relatorio.reduce((s, r) => s + r.base, 0))}</td>
                <td className="px-5 py-3 font-bold text-[#7C3AED]">{fmt(totalComissao)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Regras Fixas (Recorrências) ──────────────────────────────────────────────

interface RegraFixa {
  id: string; descricao: string; tipo: 'receita' | 'despesa'; valor: number; dia: number; ativo: boolean
}

function RegrasFixasAba() {
  const [regras, setRegras] = useState<RegraFixa[]>([
    { id: '1', descricao: 'Aluguel', tipo: 'despesa', valor: 2500, dia: 5, ativo: true },
    { id: '2', descricao: 'Sistema CinesioPro', tipo: 'despesa', valor: 297, dia: 10, ativo: true },
    { id: '3', descricao: 'Internet', tipo: 'despesa', valor: 150, dia: 15, ativo: true },
  ])
  const [form, setForm] = useState<Partial<RegraFixa> | null>(null)

  function salvar() {
    if (!form?.descricao || !form.valor || !form.dia) return
    if (form.id) {
      setRegras(prev => prev.map(r => r.id === form.id ? { ...r, ...form } as RegraFixa : r))
    } else {
      setRegras(prev => [...prev, { ...form, id: Date.now().toString(), ativo: true } as RegraFixa])
    }
    setForm(null)
  }

  const totalDespesas = regras.filter(r => r.tipo === 'despesa' && r.ativo).reduce((s, r) => s + r.valor, 0)
  const totalReceitas = regras.filter(r => r.tipo === 'receita' && r.ativo).reduce((s, r) => s + r.valor, 0)

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Despesas Fixas/mês',  val: fmt(totalDespesas), cor: '#E74C3C', Icon: ArrowDownCircle },
          { label: 'Receitas Fixas/mês',  val: fmt(totalReceitas), cor: '#16A34A', Icon: ArrowUpCircle },
          { label: 'Saldo Recorrente',     val: fmt(totalReceitas - totalDespesas), cor: totalReceitas >= totalDespesas ? '#16A34A' : '#E74C3C', Icon: TrendingUp },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-[#E8E8E8] px-4 py-3 flex items-center gap-3 shadow-sm">
            <c.Icon size={18} style={{ color: c.cor }} />
            <div><p className="text-[10px] text-[#94A3B8]">{c.label}</p><p className="font-bold text-sm" style={{ color: c.cor }}>{c.val}</p></div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-semibold text-[#1E293B]">Regras Cadastradas</p>
          <p className="text-xs text-[#94A3B8]">Lançadas automaticamente no fluxo de caixa no dia configurado</p>
        </div>
        <button onClick={() => setForm({ tipo: 'despesa', dia: 1, ativo: true })}
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#4A3AE8] text-white text-sm font-semibold hover:bg-[#3829c7]">
          <Plus size={14} /> Nova Regra
        </button>
      </div>

      {/* Formulário */}
      {form && (
        <div className="bg-[#F8F9FA] border border-[#E8E8E8] rounded-2xl p-5 space-y-4">
          <p className="font-semibold text-[#2C3E50]">{form.id ? 'Editar' : 'Nova'} Regra Fixa</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#7F8C8D] mb-1">Descrição</label>
              <input value={form.descricao ?? ''} onChange={e => setForm(p => ({ ...p!, descricao: e.target.value }))}
                placeholder="Ex: Aluguel, Salário, Internet…"
                className="w-full h-9 px-3 border border-[#E8E8E8] rounded-lg text-sm outline-none focus:border-[#4A3AE8]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#7F8C8D] mb-1">Tipo</label>
              <div className="inline-flex bg-white border border-[#E8E8E8] rounded-lg p-0.5">
                {(['despesa', 'receita'] as const).map(t => (
                  <button key={t} onClick={() => setForm(p => ({ ...p!, tipo: t }))}
                    className={`px-4 h-8 text-xs font-semibold rounded-md ${form.tipo === t ? (t === 'despesa' ? 'bg-[#FEE2E2] text-[#E74C3C]' : 'bg-[#DCFCE7] text-[#16A34A]') : 'text-[#7F8C8D]'}`}>
                    {t === 'despesa' ? '↓ Despesa' : '↑ Receita'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#7F8C8D] mb-1">Valor (R$)</label>
              <input type="number" step={0.01} value={form.valor ?? ''} onChange={e => setForm(p => ({ ...p!, valor: parseFloat(e.target.value) || 0 }))}
                className="w-full h-9 px-3 border border-[#E8E8E8] rounded-lg text-sm outline-none focus:border-[#4A3AE8]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#7F8C8D] mb-1">Dia do mês (1-31)</label>
              <input type="number" min={1} max={31} value={form.dia ?? ''} onChange={e => setForm(p => ({ ...p!, dia: parseInt(e.target.value) || 1 }))}
                className="w-full h-9 px-3 border border-[#E8E8E8] rounded-lg text-sm outline-none focus:border-[#4A3AE8]" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={salvar}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#16A34A] text-white text-sm font-semibold hover:bg-[#15803D]">
              <Save size={13} /> Salvar
            </button>
            <button onClick={() => setForm(null)}
              className="h-9 px-4 rounded-xl border border-[#E8E8E8] text-sm text-[#7F8C8D] hover:bg-[#F8F9FA]">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
        {regras.length === 0 ? (
          <div className="p-12 text-center">
            <Repeat size={28} className="mx-auto mb-2 text-[#CBD5E1]" />
            <p className="text-sm text-[#94A3B8]">Nenhuma regra cadastrada.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#F8F9FA] border-b border-[#E8E8E8]">
              <tr>
                {['Descrição', 'Tipo', 'Valor', 'Todo dia', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {regras.map(r => (
                <tr key={r.id} className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#F8F9FA] cursor-default">
                  <td className="px-5 py-3 font-medium text-[#2C3E50]">{r.descricao}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.tipo === 'despesa' ? 'bg-[#FEE2E2] text-[#E74C3C]' : 'bg-[#DCFCE7] text-[#16A34A]'}`}>
                      {r.tipo === 'despesa' ? '↓ Despesa' : '↑ Receita'}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-bold text-[#1E293B]">{fmt(r.valor)}</td>
                  <td className="px-5 py-3 text-[#7F8C8D]">Dia {r.dia}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.ativo ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#F1F5F9] text-[#94A3B8]'}`}>
                      {r.ativo ? 'Ativo' : 'Pausado'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setForm(r)} className="text-xs text-[#4A3AE8] hover:underline cursor-pointer">Editar</button>
                      <button onClick={() => setRegras(prev => prev.filter(x => x.id !== r.id))}
                        className="text-[#E74C3C] hover:opacity-70 cursor-pointer"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Contas e Taxas ───────────────────────────────────────────────────────────

interface ContaBancaria {
  id: string; nome: string; tipo: 'caixa' | 'banco' | 'digital'; saldo_inicial: number
}

const CONTA_ICON: Record<string, string> = { caixa: '💵', banco: '🏦', digital: '📱' }

function ContasTaxasAba({ formas, onAtualizar }: { formas: FormaPagamento[]; onAtualizar: () => void }) {
  // ── Contas bancárias (state local — pronto para conectar ao banco) ────────────
  const [contas, setContas] = useState<ContaBancaria[]>([
    { id: 'c1', nome: 'Caixa',          tipo: 'caixa',  saldo_inicial: 0 },
    { id: 'c2', nome: 'Conta Corrente', tipo: 'banco',  saldo_inicial: 0 },
  ])
  const [editConta, setEditConta] = useState<Partial<ContaBancaria> | null>(null)

  function salvarConta() {
    if (!editConta?.nome) return
    if (editConta.id) {
      setContas(prev => prev.map(c => c.id === editConta.id ? { ...c, ...editConta } as ContaBancaria : c))
    } else {
      setContas(prev => [...prev, { ...editConta, id: Date.now().toString(), tipo: editConta.tipo ?? 'banco', saldo_inicial: editConta.saldo_inicial ?? 0 } as ContaBancaria])
    }
    setEditConta(null)
  }

  // ── Taxas por operador (formas de pagamento) ─────────────────────────────────
  const [editandoForma, setEditandoForma] = useState<Partial<FormaPagamento & { conta_destino_nome: string }> | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const TIPOS = ['dinheiro', 'pix', 'credito', 'debito', 'transferencia', 'convenio', 'outro']

  async function salvarForma() {
    if (!editandoForma?.nome || !editandoForma?.tipo) { setErr('Nome e tipo são obrigatórios.'); return }
    setSaving(true); setErr('')
    const r = await salvarFormaPagamentoAction({
      id: editandoForma.id, nome: editandoForma.nome!, tipo: editandoForma.tipo!,
      taxa_percentual: editandoForma.taxa_percentual ?? 0,
      taxa_fixa: editandoForma.taxa_fixa ?? 0,
      prazo_liquidez_dias: editandoForma.prazo_liquidez_dias ?? 0,
      ativo: editandoForma.ativo ?? true,
    })
    setSaving(false)
    if ('error' in r) { setErr(r.error); return }
    setEditandoForma(null); onAtualizar()
  }

  async function excluirForma(id: string) {
    if (!confirm('Excluir esta configuração de taxa?')) return
    await excluirFormaPagamentoAction(id); onAtualizar()
  }

  return (
    <div className="grid grid-cols-2 gap-5 items-start">

      {/* ── Coluna esquerda: Contas Bancárias / Caixa ── */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
              <Wallet size={14} className="text-[#4A3AE8]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1E293B]">Contas Bancárias / Caixa</p>
              <p className="text-[10px] text-[#94A3B8]">Para onde o dinheiro vai</p>
            </div>
          </div>
          <button onClick={() => setEditConta({ tipo: 'banco', saldo_inicial: 0 })}
            className="flex items-center gap-1 h-8 px-3 rounded-lg bg-[#4A3AE8] text-white text-xs font-semibold hover:bg-[#3829c7]">
            <Plus size={12} /> Adicionar
          </button>
        </div>

        {editConta && (
          <div className="px-5 py-4 border-b border-[#F1F5F9] bg-[#F8FAFC] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-[#7F8C8D] mb-1">Nome da Conta</label>
                <input value={editConta.nome ?? ''} onChange={e => setEditConta(p => ({ ...p!, nome: e.target.value }))}
                  placeholder="Ex: Itaú Conta Corrente, Caixa…"
                  className="w-full h-9 px-3 border border-[#E8E8E8] rounded-lg text-sm outline-none focus:border-[#4A3AE8]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#7F8C8D] mb-1">Tipo</label>
                <select value={editConta.tipo ?? 'banco'} onChange={e => setEditConta(p => ({ ...p!, tipo: e.target.value as ContaBancaria['tipo'] }))}
                  className="w-full h-9 px-3 border border-[#E8E8E8] rounded-lg text-sm outline-none focus:border-[#4A3AE8] bg-white">
                  <option value="caixa">💵 Caixa</option>
                  <option value="banco">🏦 Banco</option>
                  <option value="digital">📱 Conta Digital</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#7F8C8D] mb-1">Saldo Inicial (R$)</label>
                <input type="number" step={0.01} value={editConta.saldo_inicial ?? 0}
                  onChange={e => setEditConta(p => ({ ...p!, saldo_inicial: parseFloat(e.target.value) || 0 }))}
                  className="w-full h-9 px-3 border border-[#E8E8E8] rounded-lg text-sm outline-none focus:border-[#4A3AE8]" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={salvarConta}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#16A34A] text-white text-xs font-semibold hover:bg-[#15803D]">
                <Save size={11} /> Salvar
              </button>
              <button onClick={() => setEditConta(null)}
                className="h-8 px-3 rounded-lg border border-[#E8E8E8] text-xs text-[#7F8C8D] hover:bg-[#F8F9FA]">
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-[#F8FAFC]">
          {contas.length === 0 ? (
            <p className="text-center text-sm text-[#94A3B8] py-8">Nenhuma conta cadastrada.</p>
          ) : contas.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#F5F6FF] transition-colors">
              <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] flex items-center justify-center text-base flex-shrink-0">
                {CONTA_ICON[c.tipo]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1E293B]">{c.nome}</p>
                <p className="text-[10px] text-[#94A3B8] capitalize">{c.tipo}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-[#94A3B8]">Saldo inicial</p>
                <p className="text-sm font-bold text-[#4A3AE8]">{fmt(c.saldo_inicial)}</p>
              </div>
              <button onClick={() => setEditConta(c)}
                className="ml-2 p-1.5 rounded-lg hover:bg-[#EEF2FF] text-[#94A3B8] hover:text-[#4A3AE8]">
                <Save size={13} />
              </button>
              <button onClick={() => setContas(prev => prev.filter(x => x.id !== c.id))}
                className="p-1.5 rounded-lg hover:bg-[#FEE2E2] text-[#94A3B8] hover:text-[#E74C3C]">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Coluna direita: Taxas por Operador ── */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#F3E8FF] flex items-center justify-center">
              <CreditCard size={14} className="text-[#7C3AED]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1E293B]">Taxas por Operador</p>
              <p className="text-[10px] text-[#94A3B8]">Formas de pagamento e seus custos</p>
            </div>
          </div>
          <button onClick={() => setEditandoForma({ ativo: true, taxa_percentual: 0, taxa_fixa: 0, prazo_liquidez_dias: 0 })}
            className="flex items-center gap-1 h-8 px-3 rounded-lg bg-[#7C3AED] text-white text-xs font-semibold hover:bg-[#6D28D9]">
            <Plus size={12} /> Configurar Taxa
          </button>
        </div>

        {err && <div className="mx-5 mt-3 bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg">{err}</div>}

        {/* Modal de edição inline */}
        {editandoForma && (
          <div className="px-5 py-4 border-b border-[#F1F5F9] bg-[#FAFAFA] space-y-3">
            <p className="text-sm font-semibold text-[#2C3E50]">{editandoForma.id ? 'Editar' : 'Nova'} Configuração de Taxa</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-[#7F8C8D] mb-1">Nome da Configuração</label>
                <input value={editandoForma.nome ?? ''} onChange={e => setEditandoForma(p => ({ ...p!, nome: e.target.value }))}
                  placeholder="Ex: Maquininha Stone Crédito"
                  className="w-full h-9 px-3 border border-[#E8E8E8] rounded-lg text-sm outline-none focus:border-[#7C3AED]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#7F8C8D] mb-1">Meio de Pagamento</label>
                <select value={editandoForma.tipo ?? ''} onChange={e => setEditandoForma(p => ({ ...p!, tipo: e.target.value }))}
                  className="w-full h-9 px-3 border border-[#E8E8E8] rounded-lg text-sm outline-none focus:border-[#7C3AED] bg-white">
                  <option value="">Selecione…</option>
                  {TIPOS.map(t => <option key={t} value={t}>{TIPO_ICON[t]} {t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#7F8C8D] mb-1">Taxa cobrada (%)</label>
                <input type="number" step={0.01} value={editandoForma.taxa_percentual ?? 0}
                  onChange={e => setEditandoForma(p => ({ ...p!, taxa_percentual: parseFloat(e.target.value) || 0 }))}
                  className="w-full h-9 px-3 border border-[#E8E8E8] rounded-lg text-sm outline-none focus:border-[#7C3AED]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#7F8C8D] mb-1">Prazo Recebimento (D+)</label>
                <input type="number" step={1} value={editandoForma.prazo_liquidez_dias ?? 0}
                  onChange={e => setEditandoForma(p => ({ ...p!, prazo_liquidez_dias: parseInt(e.target.value) || 0 }))}
                  className="w-full h-9 px-3 border border-[#E8E8E8] rounded-lg text-sm outline-none focus:border-[#7C3AED]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#7F8C8D] mb-1">Conta de Destino</label>
                <select value={editandoForma.conta_destino_nome ?? ''}
                  onChange={e => setEditandoForma(p => ({ ...p!, conta_destino_nome: e.target.value }))}
                  className="w-full h-9 px-3 border border-[#E8E8E8] rounded-lg text-sm outline-none focus:border-[#7C3AED] bg-white">
                  <option value="">Selecione a conta…</option>
                  {contas.map(c => <option key={c.id} value={c.nome}>{CONTA_ICON[c.tipo]} {c.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={salvarForma} disabled={saving}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#16A34A] text-white text-xs font-semibold hover:bg-[#15803D] disabled:opacity-50">
                <Save size={11} /> {saving ? 'Salvando…' : 'Salvar Configuração'}
              </button>
              <button onClick={() => { setEditandoForma(null); setErr('') }}
                className="h-8 px-3 rounded-lg border border-[#E8E8E8] text-xs text-[#7F8C8D] hover:bg-[#F8F9FA]">
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-[#F8FAFC]">
          {formas.length === 0 ? (
            <p className="text-center text-sm text-[#94A3B8] py-8">Nenhuma taxa configurada.</p>
          ) : formas.map(f => (
            <div key={f.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#F5F6FF] transition-colors">
              <div className="w-9 h-9 rounded-xl bg-[#F3E8FF] flex items-center justify-center text-sm flex-shrink-0">
                <Percent size={14} className="text-[#7C3AED]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1E293B]">{f.nome}</p>
                <p className="text-[10px] text-[#94A3B8]">
                  {TIPO_ICON[f.tipo]} {f.tipo} → Destino: {(f as any).conta_destino_nome ?? contas[0]?.nome ?? '—'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${f.taxa_percentual > 0 ? 'bg-[#FEE2E2] text-[#E74C3C]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                  -{f.taxa_percentual}%
                </span>
                {f.prazo_liquidez_dias > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#4A3AE8]">
                    D+{f.prazo_liquidez_dias}
                  </span>
                )}
              </div>
              <button onClick={() => setEditandoForma({ ...f, conta_destino_nome: (f as any).conta_destino_nome ?? '' })}
                className="p-1.5 rounded-lg hover:bg-[#F3E8FF] text-[#94A3B8] hover:text-[#7C3AED]">
                <Save size={13} />
              </button>
              <button onClick={() => excluirForma(f.id)}
                className="p-1.5 rounded-lg hover:bg-[#FEE2E2] text-[#94A3B8] hover:text-[#E74C3C]">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Config Comissões ─────────────────────────────────────────────────────────

function ConfigComissoesAba({ comissoes, profissionais, servicos, onAtualizar }: {
  comissoes: ComissaoConfig[]; profissionais: { id: string; nome: string }[]; servicos: { id: string; nome: string }[]; onAtualizar: () => void
}) {
  const [editandoCom, setEditandoCom] = useState<Partial<ComissaoConfig> | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  async function salvarComissao() {
    if (editandoCom?.percentual == null) { setErr('Informe o percentual.'); return }
    setSaving(true); setErr('')
    const r = await salvarComissaoAction({
      id: editandoCom.id, profissional_id: editandoCom.profissional_id ?? null,
      servico_id: editandoCom.servico_id ?? null,
      percentual: editandoCom.percentual, ativo: editandoCom.ativo ?? true,
    })
    setSaving(false)
    if ('error' in r) { setErr(r.error); return }
    setEditandoCom(null); onAtualizar()
  }

  async function excluirComissao(id: string) {
    if (!confirm('Excluir esta regra?')) return
    await excluirComissaoAction(id); onAtualizar()
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
        <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Hierarquia:</strong> Profissional+Serviço &gt; Profissional (geral) &gt; Global da clínica. A regra mais específica sempre vence.
        </p>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-semibold text-[#1E293B]">Regras de Comissão</p>
          <p className="text-xs text-[#94A3B8]">Defina percentuais por profissional, serviço ou global</p>
        </div>
        <button onClick={() => setEditandoCom({ ativo: true, profissional_id: null, servico_id: null, percentual: 0 })}
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#4A3AE8] text-white text-sm font-semibold hover:bg-[#3829c7]">
          <Plus size={14} /> Nova Regra
        </button>
      </div>

      {err && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{err}</div>}

      {editandoCom && (
        <div className="bg-[#F8F9FA] border border-[#E8E8E8] rounded-2xl p-5 space-y-3">
          <p className="font-semibold text-[#2C3E50]">{editandoCom.id ? 'Editar' : 'Nova'} Regra</p>
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
              <label className="block text-xs font-medium text-[#7F8C8D] mb-1">% do Profissional</label>
              <input type="number" step={0.5} min={0} max={100} value={editandoCom.percentual ?? 0}
                onChange={e => setEditandoCom(p => ({ ...p!, percentual: parseFloat(e.target.value) || 0 }))}
                className="w-full h-9 px-3 border border-[#E8E8E8] rounded-lg text-sm outline-none focus:border-[#4A3AE8]" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={salvarComissao} disabled={saving}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#16A34A] text-white text-sm font-semibold hover:bg-[#15803D] disabled:opacity-50">
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
              {['Profissional', 'Serviço', '% Profissional', '% Clínica', 'Escopo', ''].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comissoes.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-[#94A3B8]">Nenhuma regra configurada.</td></tr>
            ) : comissoes.map(c => {
              const profNome = profissionais.find(p => p.id === c.profissional_id)?.nome
              const servNome = servicos.find(s => s.id === c.servico_id)?.nome
              const escopo   = !c.profissional_id ? 'Global da clínica' : !c.servico_id ? 'Geral do profissional' : 'Específico'
              return (
                <tr key={c.id} className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#F8F9FA] cursor-default">
                  <td className="px-5 py-3 font-medium text-[#2C3E50]">{profNome ?? '(todos)'}</td>
                  <td className="px-5 py-3 text-[#7F8C8D]">{servNome ?? '(todos)'}</td>
                  <td className="px-5 py-3 font-bold text-[#7C3AED]">{c.percentual}%</td>
                  <td className="px-5 py-3 font-bold text-[#4A3AE8]">{100 - c.percentual}%</td>
                  <td className="px-5 py-3">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#4A3AE8]">{escopo}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditandoCom(c)} className="text-xs text-[#4A3AE8] hover:underline cursor-pointer">Editar</button>
                      <button onClick={() => excluirComissao(c.id)} className="text-[#E74C3C] hover:opacity-70 cursor-pointer"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Navegação por Pilares ────────────────────────────────────────────────────

interface PilarDef {
  id: Pilar
  label: string
  descricao: string
  cor: string
  bg: string
  Icon: React.FC<{ size?: number; className?: string }>
  abas: { id: AbaAtiva; label: string; Icon: React.FC<{ size?: number }> }[]
}

const PILARES: PilarDef[] = [
  {
    id: 'analise', label: 'Análise & Relatórios', descricao: 'Visibilidade financeira', cor: '#4A3AE8', bg: '#EEF2FF',
    Icon: BarChart2,
    abas: [
      { id: 'visao-geral',        label: 'Visão Geral',         Icon: BarChart2 },
      { id: 'movimentacao',       label: 'Movimentação',        Icon: ArrowUpCircle },
      { id: 'extrato-pacientes',  label: 'Extrato de Pacientes', Icon: Users },
    ],
  },
  {
    id: 'operacoes', label: 'Operações & Repasses', descricao: 'Comissões e recorrências', cor: '#7C3AED', bg: '#F3E8FF',
    Icon: Wallet,
    abas: [
      { id: 'gestao-profissionais', label: 'Gestão de Profissionais', Icon: Users },
      { id: 'regras-fixas',         label: 'Regras Fixas',            Icon: Repeat },
    ],
  },
  {
    id: 'configuracoes', label: 'Configurações', descricao: 'Regras do jogo', cor: '#0F766E', bg: '#CCFBF1',
    Icon: Settings,
    abas: [
      { id: 'contas-taxas',     label: 'Contas e Taxas',    Icon: CreditCard },
      { id: 'config-comissoes', label: 'Config. Comissões', Icon: Percent },
    ],
  },
]

// ─── Componente raiz ──────────────────────────────────────────────────────────

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
  const [pilarAtivo, setPilarAtivo] = useState<Pilar>('analise')
  const [abaAtiva,   setAbaAtiva]   = useState<AbaAtiva>('visao-geral')

  const pilar = PILARES.find(p => p.id === pilarAtivo)!

  function selecionarPilar(pid: Pilar) {
    setPilarAtivo(pid)
    const p = PILARES.find(x => x.id === pid)!
    setAbaAtiva(p.abas[0].id)
  }

  function atualizar() { window.location.reload() }

  return (
    <div className="space-y-4">

      {/* ── Seletor de Pilares — horizontal ── */}
      <div className="grid grid-cols-3 gap-3">
        {PILARES.map(p => (
          <button key={p.id} onClick={() => selecionarPilar(p.id)}
            className={`text-left rounded-2xl border px-5 py-4 transition-all cursor-pointer ${
              pilarAtivo === p.id ? 'shadow-md' : 'bg-white border-[#E8E8E8] hover:border-[#C7D2FE] hover:bg-[#F5F6FF] hover:shadow-sm'
            }`}
            style={pilarAtivo === p.id ? { background: p.bg, borderColor: p.cor + '40' } : undefined}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: pilarAtivo === p.id ? p.cor : '#F1F5F9' }}>
                <p.Icon size={17} className={pilarAtivo === p.id ? 'text-white' : 'text-[#94A3B8]'} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight" style={{ color: pilarAtivo === p.id ? p.cor : '#1E293B' }}>{p.label}</p>
                <p className="text-[11px] leading-tight mt-0.5" style={{ color: pilarAtivo === p.id ? p.cor + 'BB' : '#94A3B8' }}>{p.descricao}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Sub-abas do Pilar ativo ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {pilar.abas.map(a => (
          <button key={a.id} onClick={() => setAbaAtiva(a.id)}
            className={`flex items-center gap-1.5 h-9 px-4 rounded-xl text-sm font-medium transition-all border cursor-pointer ${
              abaAtiva === a.id
                ? 'shadow-sm border-transparent text-white'
                : 'bg-white border-[#E8E8E8] text-[#64748B] hover:border-[#C7D2FE] hover:bg-[#F5F6FF] hover:text-[#4A3AE8]'
            }`}
            style={abaAtiva === a.id ? { background: pilar.cor } : undefined}
          >
            <a.Icon size={13} />
            {a.label}
          </button>
        ))}

        {/* Guia Inteligente colapsável inline */}
        <div className="ml-auto">
          <GuiaInteligente aba={abaAtiva} />
        </div>
      </div>

      {/* ── Conteúdo ── */}
      {abaAtiva === 'visao-geral'          && <VisaoGeralAba kpis={kpis} receitas={todasReceitas} />}
      {abaAtiva === 'movimentacao'          && <MovimentacaoAba receitas={todasReceitas} onAtualizar={atualizar} />}
      {abaAtiva === 'extrato-pacientes'     && <ExtratoPacientesAba receitas={todasReceitas} />}
      {abaAtiva === 'gestao-profissionais'  && <GestaoProfissionaisAba receitas={todasReceitas} profissionais={profissionais} />}
      {abaAtiva === 'regras-fixas'          && <RegrasFixasAba />}
      {abaAtiva === 'contas-taxas'          && <ContasTaxasAba formas={formas} onAtualizar={atualizar} />}
      {abaAtiva === 'config-comissoes'      && <ConfigComissoesAba comissoes={comissoes} profissionais={profissionais} servicos={servicos} onAtualizar={atualizar} />}
    </div>
  )
}
