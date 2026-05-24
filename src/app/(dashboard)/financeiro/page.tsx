import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Plus, TrendingUp, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function FinanceiroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single()
  const empresaId = usuario?.empresa_id

  const mesAtual = new Date()
  const inicioMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1).toISOString()

  const [
    { data: receitas },
    { data: despesas },
    { data: inadimplencia },
  ] = await Promise.all([
    supabase.from('receitas').select('*').eq('empresa_id', empresaId).gte('created_at', inicioMes).order('created_at', { ascending: false }),
    supabase.from('despesas').select('*').eq('empresa_id', empresaId).gte('created_at', inicioMes).order('created_at', { ascending: false }),
    supabase.from('inadimplencia_historico').select('*, pacientes(nome)').eq('empresa_id', empresaId).eq('status', 'pendente').order('dias_atraso', { ascending: false }).limit(5),
  ])

  const totalReceitas = receitas?.reduce((a, r) => a + (r.valor || 0), 0) || 0
  const totalDespesas = despesas?.reduce((a, d) => a + (d.valor || 0), 0) || 0
  const saldo = totalReceitas - totalDespesas

  const faixas = {
    '0_30': inadimplencia?.filter((i) => i.faixa === '0_30').length || 0,
    '31_60': inadimplencia?.filter((i) => i.faixa === '31_60').length || 0,
    '61_90': inadimplencia?.filter((i) => i.faixa === '61_90').length || 0,
    'mais_90': inadimplencia?.filter((i) => i.faixa === 'mais_90').length || 0,
  }

  const kpis = [
    { label: 'Receita do Mês', value: formatCurrency(totalReceitas), icon: TrendingUp, color: 'text-[#27AE60]', bg: 'bg-[#27AE60]/10' },
    { label: 'Despesas do Mês', value: formatCurrency(totalDespesas), icon: TrendingDown, color: 'text-[#E74C3C]', bg: 'bg-[#E74C3C]/10' },
    { label: 'Saldo Líquido', value: formatCurrency(saldo), icon: DollarSign, color: saldo >= 0 ? 'text-[#27AE60]' : 'text-[#E74C3C]', bg: saldo >= 0 ? 'bg-[#27AE60]/10' : 'bg-[#E74C3C]/10' },
    { label: 'Inadimplentes', value: inadimplencia?.length || '0', icon: AlertTriangle, color: 'text-[#E67E22]', bg: 'bg-[#E67E22]/10' },
  ]

  const formaPgLabel: Record<string, string> = {
    pix: 'PIX',
    cartao_debito: 'Cartão Débito',
    cartao_credito: 'Cartão Crédito',
    boleto: 'Boleto',
    dinheiro: 'Dinheiro',
    transferencia: 'Transferência',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[#7F8C8D] text-sm capitalize">
          {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Exportar</Button>
          <Button size="sm">
            <Plus size={14} />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-[#7F8C8D] mb-1">{kpi.label}</p>
                  <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                  <Icon size={18} className={kpi.color} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Receitas */}
        <div className="col-span-2">
          <Card padding={false}>
            <div className="p-5 border-b border-[#E8E8E8] flex items-center justify-between">
              <CardTitle>Receitas do Mês</CardTitle>
              <Badge variant="success">{receitas?.length || 0} lançamentos</Badge>
            </div>
            {receitas && receitas.length > 0 ? (
              <div className="divide-y divide-[#E8E8E8]">
                {receitas.slice(0, 10).map((r: any) => (
                  <div key={r.id} className="flex items-center px-5 py-3 hover:bg-[#F8F9FA] transition-colors">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#2C3E50]">{r.descricao}</p>
                      <p className="text-xs text-[#7F8C8D]">
                        {formatDate(r.created_at)} · {formaPgLabel[r.forma_pagamento] || r.forma_pagamento}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#27AE60]">+{formatCurrency(r.valor)}</p>
                      <Badge variant={r.status === 'recebido' ? 'success' : r.status === 'pendente' ? 'warning' : 'danger'} className="text-[10px]">
                        {r.status === 'recebido' ? 'Recebido' : r.status === 'pendente' ? 'Pendente' : 'Cancelado'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-[#7F8C8D]">
                <DollarSign size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhuma receita registrada este mês</p>
              </div>
            )}
          </Card>
        </div>

        {/* Inadimplência */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-[#E67E22]" />
                Painel de Inadimplência
              </CardTitle>
            </CardHeader>

            {/* Aging */}
            <div className="space-y-2 mb-4">
              {[
                { label: '0 a 30 dias', count: faixas['0_30'], color: 'bg-yellow-400' },
                { label: '31 a 60 dias', count: faixas['31_60'], color: 'bg-orange-400' },
                { label: '61 a 90 dias', count: faixas['61_90'], color: 'bg-red-400' },
                { label: 'Acima de 90 dias', count: faixas['mais_90'], color: 'bg-red-700' },
              ].map((faixa) => (
                <div key={faixa.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${faixa.color}`} />
                    <span className="text-xs text-[#2C3E50]">{faixa.label}</span>
                  </div>
                  <span className="text-xs font-bold text-[#2C3E50]">{faixa.count}</span>
                </div>
              ))}
            </div>

            {inadimplencia && inadimplencia.length > 0 ? (
              <div className="space-y-2">
                {inadimplencia.slice(0, 4).map((i: any) => (
                  <div key={i.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                    <div>
                      <p className="text-xs font-semibold text-[#2C3E50]">{i.pacientes?.nome}</p>
                      <p className="text-[10px] text-red-500">{i.dias_atraso} dias em atraso</p>
                    </div>
                    <p className="text-xs font-bold text-red-600">{formatCurrency(i.valor_devido)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-[#27AE60] font-medium">✓ Sem inadimplências!</p>
              </div>
            )}

            <Button variant="outline" size="sm" className="w-full mt-3 border-[#E67E22] text-[#E67E22] hover:bg-[#E67E22]/5">
              Ver Painel Completo
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
