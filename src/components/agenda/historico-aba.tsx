'use client'

import { useState, useMemo } from 'react'
import { Search, X, Calendar, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { AgendamentoHist, Profissional, Servico } from '@/app/(dashboard)/agenda/agenda-page-client'

interface Props {
  agendamentos: AgendamentoHist[]
  profissionais: Profissional[]
  servicos: Servico[]
}

type StatusFiltro = 'todos' | 'agendado' | 'confirmado' | 'em_atendimento' | 'realizado' | 'cancelado' | 'faltou'

const STATUS_META: Record<string, { label: string; cor: string; bg: string; Icon: any }> = {
  agendado:       { label: 'Agendado',       cor: '#7F8C8D', bg: '#F0F0F0',       Icon: Clock },
  confirmado:     { label: 'Confirmado',     cor: '#27AE60', bg: '#27AE60' + '1A', Icon: CheckCircle2 },
  em_atendimento: { label: 'Em Atendimento', cor: '#3498DB', bg: '#3498DB' + '1A', Icon: Clock },
  realizado:      { label: 'Realizado',      cor: '#8E44AD', bg: '#8E44AD' + '1A', Icon: CheckCircle2 },
  cancelado:      { label: 'Cancelado',      cor: '#E74C3C', bg: '#E74C3C' + '1A', Icon: XCircle },
  faltou:         { label: 'Faltou',         cor: '#E67E22', bg: '#E67E22' + '1A', Icon: AlertCircle },
}

function fmtDataHora(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function HistoricoAba({ agendamentos, profissionais, servicos }: Props) {
  const [busca, setBusca]                 = useState('')
  const [filtroStatus, setFiltroStatus]   = useState<StatusFiltro>('todos')
  const [filtroProf, setFiltroProf]       = useState('')
  const [filtroServ, setFiltroServ]       = useState('')
  const [dataInicio, setDataInicio]       = useState('')
  const [dataFim, setDataFim]             = useState('')

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return agendamentos.filter(a => {
      if (filtroStatus !== 'todos' && a.status !== filtroStatus) return false
      if (filtroProf && a.profissionais?.id !== filtroProf) return false
      if (filtroServ && a.servicos?.id !== filtroServ) return false
      if (dataInicio && a.data_hora < dataInicio) return false
      if (dataFim && a.data_hora > dataFim + 'T23:59:59') return false
      if (q) {
        const hay = `${a.pacientes?.nome ?? ''} ${a.servicos?.nome ?? ''} ${a.profissionais?.nome ?? ''} ${a.observacoes ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [agendamentos, busca, filtroStatus, filtroProf, filtroServ, dataInicio, dataFim])

  const filtrosAtivos = !!(busca || filtroStatus !== 'todos' || filtroProf || filtroServ || dataInicio || dataFim)
  function limpar() {
    setBusca('')
    setFiltroStatus('todos')
    setFiltroProf('')
    setFiltroServ('')
    setDataInicio('')
    setDataFim('')
  }

  // Estatísticas do filtro corrente
  const stats = useMemo(() => {
    const total = filtrados.length
    const por_status = filtrados.reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1
      return acc
    }, {})
    return { total, por_status }
  }, [filtrados])

  return (
    <div className="space-y-4">
      {/* Filtros — 2 linhas */}
      <div className="bg-white border border-[#E8E8E8] rounded-2xl p-3 shadow-sm space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar paciente, serviço, profissional ou observação…"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#F8F9FA] border border-transparent text-sm outline-none focus:bg-white focus:border-[#4A3AE8]"
            />
          </div>

          <select
            value={filtroProf}
            onChange={(e) => setFiltroProf(e.target.value)}
            className="h-9 px-3 rounded-lg bg-[#F8F9FA] border border-transparent text-sm outline-none focus:bg-white focus:border-[#4A3AE8] cursor-pointer"
          >
            <option value="">Todos profissionais</option>
            {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>

          <select
            value={filtroServ}
            onChange={(e) => setFiltroServ(e.target.value)}
            className="h-9 px-3 rounded-lg bg-[#F8F9FA] border border-transparent text-sm outline-none focus:bg-white focus:border-[#4A3AE8] cursor-pointer"
          >
            <option value="">Todos serviços</option>
            {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>

          {filtrosAtivos && (
            <button
              onClick={limpar}
              className="flex items-center gap-1 h-9 px-3 rounded-lg text-xs font-semibold text-[#E74C3C] hover:bg-[#E74C3C]/10"
            >
              <X size={12} />
              Limpar tudo
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Período */}
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-[#7F8C8D]" />
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="h-9 px-2 rounded-lg bg-[#F8F9FA] border border-transparent text-sm outline-none focus:bg-white focus:border-[#4A3AE8]"
            />
            <span className="text-xs text-[#7F8C8D]">até</span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="h-9 px-2 rounded-lg bg-[#F8F9FA] border border-transparent text-sm outline-none focus:bg-white focus:border-[#4A3AE8]"
            />
          </div>

          {/* Status */}
          <div className="inline-flex bg-[#F8F9FA] rounded-lg p-0.5 flex-wrap">
            {(['todos','agendado','confirmado','em_atendimento','realizado','cancelado','faltou'] as StatusFiltro[]).map(s => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={`px-2.5 h-8 text-[11px] font-semibold rounded-md transition-colors ${
                  filtroStatus === s ? 'bg-white text-[#2C3E50] shadow-sm' : 'text-[#7F8C8D] hover:text-[#2C3E50]'
                }`}
              >
                {s === 'todos' ? 'Todos' : STATUS_META[s]?.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="flex items-center gap-3 flex-wrap text-xs">
        <span className="text-[#7F8C8D]">
          <strong className="text-[#2C3E50]">{stats.total}</strong> atendimento{stats.total === 1 ? '' : 's'}
        </span>
        {Object.entries(stats.por_status).map(([status, count]) => {
          const meta = STATUS_META[status]
          if (!meta) return null
          return (
            <span
              key={status}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold"
              style={{ color: meta.cor, background: meta.bg }}
            >
              {meta.label}: {count}
            </span>
          )
        })}
      </div>

      {/* Tabela */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-12 text-center">
          <p className="text-sm text-[#7F8C8D] mb-3">
            {agendamentos.length === 0
              ? 'Nenhum atendimento registrado ainda.'
              : 'Nenhum atendimento encontrado com esses filtros.'}
          </p>
          {filtrosAtivos && (
            <button onClick={limpar} className="text-sm font-semibold text-[#4A3AE8] hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F9FA] border-b border-[#E8E8E8]">
                <tr>
                  <th className="text-left text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">Data / Hora</th>
                  <th className="text-left text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">Paciente</th>
                  <th className="text-left text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">Profissional</th>
                  <th className="text-left text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">Serviço</th>
                  <th className="text-left text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">Sala</th>
                  <th className="text-left text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(a => {
                  const meta = STATUS_META[a.status]
                  const Icon = meta?.Icon
                  return (
                    <tr key={a.id} className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#F8F9FA]/50">
                      <td className="px-5 py-3 text-[#2C3E50]">
                        <p className="font-semibold">{fmtDataHora(a.data_hora)}</p>
                        <p className="text-[11px] text-[#7F8C8D]">{a.duracao_minutos}min</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-[#2C3E50]">{a.pacientes?.nome ?? '—'}</p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: a.profissionais?.cor_agenda ?? '#7F8C8D' }}
                          />
                          <span className="text-[#2C3E50]">{a.profissionais?.nome ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[#7F8C8D]">
                        {a.servicos?.nome ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-[#7F8C8D]">{a.salas?.nome ?? '—'}</td>
                      <td className="px-5 py-3">
                        {meta && (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ color: meta.cor, background: meta.bg }}
                          >
                            <Icon size={11} />
                            {meta.label}
                          </span>
                        )}
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
