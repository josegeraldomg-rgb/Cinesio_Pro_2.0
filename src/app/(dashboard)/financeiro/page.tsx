import { createAdminClient } from '@/lib/supabase/admin'
import { getEmpresaId } from '@/lib/get-empresa-id'
import { seedFormasPagamentoAction } from './actions'
import { FinanceiroClient } from './financeiro-client'

const SELECT_RECEITA = `
  id, agendamento_id, paciente_id, profissional_id, servico_id, forma_pagamento_id,
  valor_bruto, desconto, taxa_operadora, valor_liquido,
  percentual_comissao, valor_comissao, status,
  data_competencia, data_liquidez, data_pagamento, descricao, observacoes, criado_em,
  pacientes(nome, telefone, ddi),
  profissionais(nome, cor_agenda),
  servicos(nome),
  config_formas_pagamento(nome, tipo)
`.trim()

export default async function FinanceiroPage() {
  const { empresaId } = await getEmpresaId()
  const admin = createAdminClient()

  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10)
  const fimMes    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10)
  const seisAtras = new Date(hoje); seisAtras.setMonth(hoje.getMonth() - 6)
  const seisAtrasStr = seisAtras.toISOString().slice(0, 10)

  const [
    { data: receitasMes },
    { data: todasReceitas },
    { data: formas },
    { data: comissoes },
    { data: profissionais },
    { data: servicos },
  ] = await Promise.all([
    // KPIs do mês corrente
    admin.from('financeiro_receitas')
      .select('valor_bruto, valor_liquido, valor_comissao, status')
      .eq('empresa_id', empresaId)
      .in('status', ['pago', 'pendente'])
      .gte('data_competencia', inicioMes)
      .lte('data_competencia', fimMes),

    // Todos os lançamentos dos últimos 6 meses (tabela Lançamentos)
    admin.from('financeiro_receitas')
      .select(SELECT_RECEITA)
      .eq('empresa_id', empresaId)
      .gte('data_competencia', seisAtrasStr)
      .order('data_competencia', { ascending: false })
      .limit(1000),

    admin.from('config_formas_pagamento')
      .select('id, nome, tipo, taxa_percentual, taxa_fixa, prazo_liquidez_dias, ativo')
      .eq('empresa_id', empresaId)
      .order('nome'),

    admin.from('comissoes_config')
      .select('id, profissional_id, servico_id, percentual, ativo')
      .eq('empresa_id', empresaId)
      .order('criado_em'),

    admin.from('profissionais')
      .select('id, nome')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome'),

    admin.from('servicos')
      .select('id, nome')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome'),
  ])

  // Seed formas padrão se ainda não houver nenhuma
  if (!formas || formas.length === 0) {
    await seedFormasPagamentoAction()
  }

  const rows = receitasMes ?? []
  const kpis = {
    receita_bruta:   rows.reduce((s, r) => s + (r.valor_bruto   ?? 0), 0),
    receita_liquida: rows.filter(r => r.status === 'pago').reduce((s, r) => s + (r.valor_liquido ?? 0), 0),
    comissoes:       rows.reduce((s, r) => s + (r.valor_comissao ?? 0), 0),
    pendentes:       rows.filter(r => r.status === 'pendente').reduce((s, r) => s + (r.valor_bruto ?? 0), 0),
    count_pago:      rows.filter(r => r.status === 'pago').length,
    count_pendente:  rows.filter(r => r.status === 'pendente').length,
  }

  return (
    <FinanceiroClient
      kpis={kpis}
      todasReceitas={(todasReceitas ?? []) as any}
      formas={formas ?? []}
      comissoes={comissoes ?? []}
      profissionais={profissionais ?? []}
      servicos={servicos ?? []}
      periodoLabel={hoje.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
    />
  )
}
