'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

import type { ComissaoConfig } from '@/lib/financeiro/calcular-comissao'

// ─── Tipos exportados ────────────────────────────────────────────────────────

export interface FormaPagamento {
  id: string
  nome: string
  tipo: string
  taxa_percentual: number
  taxa_fixa: number
  prazo_liquidez_dias: number
  ativo: boolean
}

export interface ReceitaFinanceira {
  id: string
  agendamento_id: string | null
  paciente_id: string | null
  profissional_id: string | null
  servico_id: string | null
  forma_pagamento_id: string | null
  valor_bruto: number
  desconto: number
  taxa_operadora: number
  valor_liquido: number
  percentual_comissao: number
  valor_comissao: number
  status: 'pago' | 'pendente' | 'cancelado' | 'estornado'
  data_competencia: string
  data_liquidez: string | null
  data_pagamento: string | null
  descricao: string | null
  observacoes: string | null
  criado_em: string
  // joins
  pacientes?: { nome: string; telefone: string | null; ddi: string | null } | null
  profissionais?: { nome: string; cor_agenda: string | null } | null
  servicos?: { nome: string } | null
  config_formas_pagamento?: { nome: string; tipo: string } | null
}

// ─── Contexto ────────────────────────────────────────────────────────────────

type Ctx = { error: string } | { admin: ReturnType<typeof createAdminClient>; empresa_id: string }

async function getContext(): Promise<Ctx> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()
  const { data: me } = await admin
    .from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle()
  if (!me?.empresa_id) return { error: 'Empresa não encontrada.' }
  return { admin, empresa_id: String(me.empresa_id) }
}

// ─── Formas de pagamento ─────────────────────────────────────────────────────

export async function listarFormasPagamentoAction(): Promise<
  { formas: FormaPagamento[] } | { error: string }
> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { data, error } = await admin
    .from('config_formas_pagamento')
    .select('*')
    .eq('empresa_id', empresa_id)
    .order('nome')
  if (error) return { error: error.message }
  return { formas: data ?? [] }
}

const FORMAS_PADRAO = [
  { nome: 'Dinheiro',        tipo: 'dinheiro',     taxa_percentual: 0,    taxa_fixa: 0, prazo_liquidez_dias: 0 },
  { nome: 'Pix',             tipo: 'pix',          taxa_percentual: 0,    taxa_fixa: 0, prazo_liquidez_dias: 0 },
  { nome: 'Cartão Débito',   tipo: 'debito',       taxa_percentual: 1.5,  taxa_fixa: 0, prazo_liquidez_dias: 1 },
  { nome: 'Cartão Crédito',  tipo: 'credito',      taxa_percentual: 2.99, taxa_fixa: 0, prazo_liquidez_dias: 30 },
  { nome: 'Transferência',   tipo: 'transferencia', taxa_percentual: 0,   taxa_fixa: 0, prazo_liquidez_dias: 0 },
  { nome: 'Convênio',        tipo: 'convenio',     taxa_percentual: 0,    taxa_fixa: 0, prazo_liquidez_dias: 30 },
]

export async function seedFormasPagamentoAction(): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { count } = await admin
    .from('config_formas_pagamento')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', empresa_id)

  if ((count ?? 0) > 0) return { success: true }   // já tem, não duplica

  const { error } = await admin
    .from('config_formas_pagamento')
    .insert(FORMAS_PADRAO.map(f => ({ ...f, empresa_id })))

  if (error) return { error: error.message }
  revalidatePath('/financeiro')
  return { success: true }
}

export async function salvarFormaPagamentoAction(payload: {
  id?: string
  nome: string
  tipo: string
  taxa_percentual: number
  taxa_fixa: number
  prazo_liquidez_dias: number
  ativo: boolean
}): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { id, ...rest } = payload
  let error
  if (id) {
    ;({ error } = await admin.from('config_formas_pagamento').update(rest).eq('id', id).eq('empresa_id', empresa_id))
  } else {
    ;({ error } = await admin.from('config_formas_pagamento').insert({ ...rest, empresa_id }))
  }
  if (error) return { error: error.message }
  revalidatePath('/financeiro')
  return { success: true }
}

export async function excluirFormaPagamentoAction(id: string): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { error } = await admin
    .from('config_formas_pagamento').delete().eq('id', id).eq('empresa_id', empresa_id)
  if (error) return { error: error.message }
  revalidatePath('/financeiro')
  return { success: true }
}

// ─── Comissões ───────────────────────────────────────────────────────────────

export async function listarComissoesAction(): Promise<
  { comissoes: ComissaoConfig[] } | { error: string }
> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { data, error } = await admin
    .from('comissoes_config')
    .select('*')
    .eq('empresa_id', empresa_id)
    .order('criado_em')
  if (error) return { error: error.message }
  return { comissoes: data ?? [] }
}

export async function salvarComissaoAction(payload: {
  id?: string
  profissional_id: string | null
  servico_id: string | null
  percentual: number
  ativo: boolean
}): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { id, ...rest } = payload
  let error
  if (id) {
    ;({ error } = await admin.from('comissoes_config').update(rest).eq('id', id))
  } else {
    ;({ error } = await admin.from('comissoes_config').insert({ ...rest, empresa_id }))
  }
  if (error) return { error: error.message }
  revalidatePath('/financeiro')
  return { success: true }
}

export async function excluirComissaoAction(id: string): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin } = ctx

  const { error } = await admin.from('comissoes_config').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/financeiro')
  return { success: true }
}

// ─── Receitas ────────────────────────────────────────────────────────────────

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

export async function listarReceitasAction(filtros?: {
  status?: string
  profissional_id?: string
  data_inicio?: string
  data_fim?: string
}): Promise<{ receitas: ReceitaFinanceira[] } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  let q = admin
    .from('financeiro_receitas')
    .select(SELECT_RECEITA)
    .eq('empresa_id', empresa_id)

  if (filtros?.status)          q = q.eq('status', filtros.status)
  if (filtros?.profissional_id) q = q.eq('profissional_id', filtros.profissional_id)
  if (filtros?.data_inicio)     q = q.gte('data_competencia', filtros.data_inicio)
  if (filtros?.data_fim)        q = q.lte('data_competencia', filtros.data_fim)

  const { data, error } = await q.order('data_competencia', { ascending: false }).limit(500)
  if (error) return { error: error.message }
  return { receitas: (data ?? []) as unknown as ReceitaFinanceira[] }
}

export async function criarReceitaAction(payload: {
  agendamento_id: string | null
  paciente_id: string | null
  profissional_id: string | null
  servico_id: string | null
  forma_pagamento_id: string
  valor_bruto: number
  desconto: number
  taxa_operadora: number
  valor_liquido: number
  percentual_comissao: number
  valor_comissao: number
  status: 'pago' | 'pendente'
  data_competencia: string
  data_liquidez: string | null
  descricao?: string | null
  observacoes?: string | null
}): Promise<{ success: true; id: string } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { data: me } = await admin
    .from('usuarios').select('id').eq('empresa_id', empresa_id).limit(1).maybeSingle()

  const { data, error } = await admin
    .from('financeiro_receitas')
    .insert({ ...payload, empresa_id, criado_por: me?.id ?? null })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/financeiro')
  revalidatePath('/agenda')
  return { success: true, id: data.id }
}

export async function atualizarStatusReceitaAction(
  id: string,
  status: 'pago' | 'cancelado' | 'estornado',
): Promise<{ success: true } | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const update: Record<string, unknown> = { status }
  if (status === 'pago') update.data_pagamento = new Date().toISOString()

  const { error } = await admin
    .from('financeiro_receitas')
    .update(update)
    .eq('id', id)
    .eq('empresa_id', empresa_id)

  if (error) return { error: error.message }
  revalidatePath('/financeiro')
  return { success: true }
}

// ─── KPIs (usado pela página /financeiro) ────────────────────────────────────

export async function buscarKpisFinanceiroAction(periodo: {
  inicio: string
  fim: string
}): Promise<{
  receita_bruta: number
  receita_liquida: number
  comissoes: number
  pendentes: number
  count_pago: number
  count_pendente: number
} | { error: string }> {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const { data, error } = await admin
    .from('financeiro_receitas')
    .select('valor_bruto, valor_liquido, valor_comissao, status')
    .eq('empresa_id', empresa_id)
    .in('status', ['pago', 'pendente'])
    .gte('data_competencia', periodo.inicio)
    .lte('data_competencia', periodo.fim)

  if (error) return { error: error.message }
  const rows = data ?? []

  return {
    receita_bruta:   rows.reduce((s, r) => s + (r.valor_bruto   ?? 0), 0),
    receita_liquida: rows.filter(r => r.status === 'pago').reduce((s, r) => s + (r.valor_liquido ?? 0), 0),
    comissoes:       rows.reduce((s, r) => s + (r.valor_comissao ?? 0), 0),
    pendentes:       rows.filter(r => r.status === 'pendente').reduce((s, r) => s + (r.valor_bruto ?? 0), 0),
    count_pago:      rows.filter(r => r.status === 'pago').length,
    count_pendente:  rows.filter(r => r.status === 'pendente').length,
  }
}
