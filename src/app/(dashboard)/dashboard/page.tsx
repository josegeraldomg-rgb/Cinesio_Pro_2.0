import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Users, TrendingUp, FileText, Sparkles,
  Plus, DollarSign, ClipboardList, CheckCircle2, Clock, XCircle, AlertCircle
} from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { formatCurrency, formatDateTime, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('empresa_id, nome')
    .eq('id', user.id)
    .single()

  const empresaId = usuario?.empresa_id
  const hoje = new Date().toISOString().split('T')[0]

  // Buscar dados em paralelo
  const [
    { count: totalPacientes },
    { data: agendamentosHoje },
    { data: receitasMes },
    { data: relatoriosPendentes },
  ] = await Promise.all([
    supabase.from('pacientes').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('status', 'ativo'),
    supabase.from('agendamentos')
      .select('*, pacientes(nome, foto_url), profissionais(nome), servicos(nome, tipo)')
      .eq('empresa_id', empresaId)
      .gte('data_hora', `${hoje}T00:00:00`)
      .lte('data_hora', `${hoje}T23:59:59`)
      .order('data_hora'),
    supabase.from('receitas')
      .select('valor')
      .eq('empresa_id', empresaId)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabase.from('evolucoes_clinicas')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .is('ia_narrativa', null),
  ])

  const receitaTotal = receitasMes?.reduce((acc, r) => acc + (r.valor || 0), 0) || 0

  // Imagens 3D vêm do repo público microsoft/fluentui-emoji (Apache 2.0).
  // Ficam posicionadas em absolute estourando o card (top/right negativos).
  const kpiCards = [
    {
      label: 'Total de Pacientes',
      value: totalPacientes ?? 0,
      change: '+12 este mês',
      gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      image: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Red%20heart/3D/red_heart_3d.png',
      imgSize: 65,
      imgTop: -38,
      imgRight: 12,
      rotate: -18,
    },
    {
      label: 'Receita (Mensal)',
      value: formatCurrency(receitaTotal),
      change: '+12% vs. mês anterior',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
      image: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Money%20with%20wings/3D/money_with_wings_3d.png',
      imgSize: 68,
      imgTop: -38,
      imgRight: 10,
      rotate: -14,
    },
    {
      label: 'Relatórios Pendentes',
      value: relatoriosPendentes ?? 0,
      change: 'aguardando',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
      image: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Clipboard/3D/clipboard_3d.png',
      imgSize: 62,
      imgTop: -35,
      imgRight: 14,
      rotate: 20,
    },
    {
      label: 'Insights de IA',
      value: agendamentosHoje?.length ?? 0,
      change: 'ativos',
      gradient: 'linear-gradient(135deg, #a855f7 0%, #c026d3 100%)',
      image: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Brain/3D/brain_3d.png',
      imgSize: 65,
      imgTop: -40,
      imgRight: 12,
      rotate: -16,
    },
  ]

  const statusIcon: Record<string, React.ReactNode> = {
    confirmado: <CheckCircle2 size={14} className="text-green-500" />,
    agendado: <Clock size={14} className="text-gray-400" />,
    em_atendimento: <Clock size={14} className="text-blue-500" />,
    cancelado: <XCircle size={14} className="text-red-400" />,
    faltou: <AlertCircle size={14} className="text-orange-400" />,
    realizado: <CheckCircle2 size={14} className="text-purple-500" />,
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards — pt-12 dá espaço para a imagem 3D estourar para cima sem cortar */}
      <div className="grid grid-cols-4 gap-4 pt-6">
        {kpiCards.map((card, idx) => (
          <div
            key={card.label}
            className="kpi-card"
            style={{
              background: card.gradient,
              position: 'relative',
              zIndex: kpiCards.length - idx,
              overflow: 'visible',
            }}
          >
            <p className="text-white/85 text-[11px] font-semibold uppercase tracking-wider mb-2">
              {card.label}
            </p>
            <p className="text-[34px] leading-none font-bold text-white drop-shadow-sm">
              {card.value}
            </p>
            <span className="inline-block mt-3 text-[11px] font-semibold text-white bg-white/20 backdrop-blur px-2.5 py-1 rounded-full">
              {card.change}
            </span>

            {/* Imagem 3D — absoluta, com top/right negativos para "estourar" o card */}
            <img
              src={card.image}
              alt=""
              aria-hidden="true"
              className="pointer-events-none select-none absolute drop-shadow-xl"
              style={{
                top: card.imgTop,
                right: card.imgRight,
                width: card.imgSize,
                height: card.imgSize,
                transform: `rotate(${card.rotate}deg)`,
                filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.35))',
              }}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Agenda de Hoje */}
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Agenda de Hoje</CardTitle>
              <Link href="/agenda">
                <span className="text-xs text-[#4A3AE8] font-medium hover:underline cursor-pointer">
                  Ver Calendário →
                </span>
              </Link>
            </CardHeader>

            {agendamentosHoje && agendamentosHoje.length > 0 ? (
              <div className="space-y-3">
                {agendamentosHoje.map((ag: any) => (
                  <div
                    key={ag.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F8F9FA] transition-colors cursor-pointer group"
                  >
                    <Avatar
                      name={ag.pacientes?.nome || 'Paciente'}
                      src={ag.pacientes?.foto_url}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#2C3E50] text-sm truncate">
                        {ag.pacientes?.nome}
                      </p>
                      <p className="text-[#7F8C8D] text-xs">
                        {ag.servicos?.nome} · {ag.profissionais?.nome}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[#2C3E50] text-sm font-medium">
                        {new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        {statusIcon[ag.status]}
                        <span className={`status-pill ${STATUS_COLORS[ag.status] || ''}`}>
                          {STATUS_LABELS[ag.status] || ag.status}
                        </span>
                      </div>
                    </div>
                    <Badge variant={ag.servicos?.tipo === 'pilates' ? 'success' : 'info'} className="ml-1">
                      {ag.servicos?.tipo === 'pilates' ? 'Pilates' : 'Fisio'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-[#7F8C8D]">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum agendamento para hoje</p>
              </div>
            )}

            {/* Ações rápidas */}
            <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-[#E8E8E8]">
              <Link href="/pacientes/novo">
                <button className="w-full flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-dashed border-[#E8E8E8] hover:border-[#4A3AE8] hover:bg-[#4A3AE8]/5 text-[#7F8C8D] hover:text-[#4A3AE8] transition-all text-xs font-medium cursor-pointer">
                  <Plus size={20} />
                  Cadastrar Paciente
                </button>
              </Link>
              <Link href="/financeiro/novo">
                <button className="w-full flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-dashed border-[#E8E8E8] hover:border-[#27AE60] hover:bg-[#27AE60]/5 text-[#7F8C8D] hover:text-[#27AE60] transition-all text-xs font-medium cursor-pointer">
                  <DollarSign size={20} />
                  Novo Lançamento
                </button>
              </Link>
              <Link href="/relatorios">
                <button className="w-full flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-dashed border-[#E8E8E8] hover:border-[#8E44AD] hover:bg-[#8E44AD]/5 text-[#7F8C8D] hover:text-[#8E44AD] transition-all text-xs font-medium cursor-pointer">
                  <Sparkles size={20} />
                  Gerar Relatório IA
                </button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Painel lateral: Saúde da Clínica + Alertas IA */}
        <div className="space-y-4">
          {/* Saúde da Clínica */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Saúde da Clínica</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-[#7F8C8D]">Taxa de Ocupação</span>
                  <span className="text-xs font-bold text-[#2C3E50]">78%</span>
                </div>
                <div className="h-2 bg-[#E8E8E8] rounded-full overflow-hidden">
                  <div className="h-full bg-[#27AE60] rounded-full" style={{ width: '78%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-[#7F8C8D]">Retenção de Pacientes</span>
                  <span className="text-xs font-bold text-[#2C3E50]">91%</span>
                </div>
                <div className="h-2 bg-[#E8E8E8] rounded-full overflow-hidden">
                  <div className="h-full bg-[#3498DB] rounded-full" style={{ width: '91%' }} />
                </div>
              </div>
              <div className="pt-2 border-t border-[#E8E8E8]">
                <p className="text-xs text-[#7F8C8D] mb-1">Tratamento + Rentável</p>
                <p className="font-semibold text-[#2C3E50] text-sm">Fisioterapia Ortopédica</p>
                <p className="text-xs text-[#7F8C8D]">
                  Ticket médio: <span className="font-semibold text-[#27AE60]">R$ 138,00</span>
                </p>
              </div>
            </div>
          </Card>

          {/* Alertas IA */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#8E44AD]" />
                Alertas IA em Tempo Real
              </CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {[
                {
                  title: 'Pico de Desempenho',
                  desc: 'Maria Silva apresentou melhora de 40% no EVA. Considere reavaliação.',
                  action: 'Ver Paciente',
                  color: 'border-l-[#27AE60] bg-[#27AE60]/5',
                  icon: '📈',
                },
                {
                  title: 'Alerta de Inadimplência',
                  desc: '3 pacientes com pagamentos em atraso há +30 dias.',
                  action: 'Ver Painel',
                  color: 'border-l-[#E67E22] bg-[#E67E22]/5',
                  icon: '⚠️',
                },
                {
                  title: 'Condição Estendida',
                  desc: 'Lucas Oliveira está na 12ª sessão. Agendar reavaliação do plano.',
                  action: 'Agendar',
                  color: 'border-l-[#4A3AE8] bg-[#4A3AE8]/5',
                  icon: '🔔',
                },
              ].map((alert) => (
                <div
                  key={alert.title}
                  className={`border-l-4 rounded-r-lg p-3 ${alert.color} cursor-pointer hover:opacity-80 transition-opacity`}
                >
                  <p className="text-xs font-semibold text-[#2C3E50] mb-0.5">
                    {alert.icon} {alert.title}
                  </p>
                  <p className="text-xs text-[#7F8C8D] mb-2">{alert.desc}</p>
                  <span className="text-[10px] text-[#4A3AE8] font-semibold hover:underline">
                    {alert.action} →
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Calendar(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
