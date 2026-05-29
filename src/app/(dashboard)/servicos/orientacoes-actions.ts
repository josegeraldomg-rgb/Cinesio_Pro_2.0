'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface OrientacaoServico {
  id:               string
  empresa_id:       string
  servico_id:       string
  profissional_id:  string | null   // null = vale para todos os profissionais
  mensagem:         string
  ativo:            boolean
}

// ─── Helper de contexto ───────────────────────────────────────────────────────

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' as const }

  const admin = createAdminClient()
  const { data: me } = await admin
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!me) return { error: 'Usuário não encontrado.' as const }
  return { admin, empresa_id: me.empresa_id as string }
}

// ─── Tags dinâmicas disponíveis nas mensagens ─────────────────────────────────

export const ORIENTACAO_TAGS: { tag: string; label: string; exemplo: string }[] = [
  { tag: '[[cliente_nome]]',    label: 'Nome do paciente',   exemplo: 'Maria Silva'              },
  { tag: '[[servico_nome]]',    label: 'Nome do serviço',    exemplo: 'Avaliação Física'          },
  { tag: '[[profissional_nome]]', label: 'Profissional',     exemplo: 'Dr. João Oliveira'         },
  { tag: '[[data_agendamento]]', label: 'Data',              exemplo: '28/05/2026'               },
  { tag: '[[hora_agendamento]]', label: 'Horário',           exemplo: '14:30'                    },
]

export function renderOrientacao(
  mensagem: string,
  vars: Record<string, string>,
): string {
  return Object.entries(vars).reduce(
    (acc, [key, val]) => acc.split(`[[${key}]]`).join(val),
    mensagem,
  )
}

// ─── Listar orientações da empresa ────────────────────────────────────────────

export async function listarOrientacoesAction(): Promise<
  { data: OrientacaoServico[] } | { error: string }
> {
  try {
    const ctx = await getContext()
    if ('error' in ctx) return { error: ctx.error as string }
    const { admin, empresa_id } = ctx

    const { data, error } = await admin
      .from('orientacoes_servico')
      .select('*')
      .eq('empresa_id', empresa_id)
      .order('servico_id')

    if (error) return { error: error.message }
    return { data: (data ?? []) as OrientacaoServico[] }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao listar orientações' }
  }
}

// ─── Salvar (upsert) orientação ───────────────────────────────────────────────

export async function salvarOrientacaoAction(payload: {
  id?:              string
  servico_id:       string
  profissional_id?: string | null
  mensagem:         string
  ativo:            boolean
}): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const ctx = await getContext()
    if ('error' in ctx) return { error: ctx.error as string }
    const { admin, empresa_id } = ctx

    const row = {
      empresa_id,
      servico_id:      payload.servico_id,
      profissional_id: payload.profissional_id ?? null,
      mensagem:        payload.mensagem.trim(),
      ativo:           payload.ativo,
    }

    if (!row.mensagem) return { error: 'A mensagem não pode ser vazia.' }

    let id = payload.id

    if (id) {
      const { error } = await admin
        .from('orientacoes_servico')
        .update(row)
        .eq('id', id)
        .eq('empresa_id', empresa_id)
      if (error) return { error: error.message }
    } else {
      const { data, error } = await admin
        .from('orientacoes_servico')
        .insert(row)
        .select('id')
        .single()
      if (error) return { error: error.message }
      id = data.id
    }

    revalidatePath('/equipe')
    return { success: true, id: id! }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao salvar orientação' }
  }
}

// ─── Excluir orientação ───────────────────────────────────────────────────────

export async function excluirOrientacaoAction(
  id: string,
): Promise<{ success: true } | { error: string }> {
  try {
    const ctx = await getContext()
    if ('error' in ctx) return { error: ctx.error as string }
    const { admin, empresa_id } = ctx

    const { error } = await admin
      .from('orientacoes_servico')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresa_id)

    if (error) return { error: error.message }
    revalidatePath('/equipe')
    return { success: true }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao excluir orientação' }
  }
}

// ─── Disparar orientação após agendamento ────────────────────────────────────
// Chamado internamente por criarAgendamentoAction.
// Busca a orientação mais específica (profissional_id match > null) e envia via UAZAPI.

export async function dispararOrientacaoAction(args: {
  empresa_id:       string
  servico_id:       string
  profissional_id:  string
  paciente_id:      string
  data_hora:        string          // ISO string
}): Promise<{ sent: true } | { skipped: string }> {
  try {
    const admin = createAdminClient()

    // 1. Busca orientações ativas para esse serviço
    const { data: orientacoes } = await admin
      .from('orientacoes_servico')
      .select('*')
      .eq('empresa_id', args.empresa_id)
      .eq('servico_id', args.servico_id)
      .eq('ativo', true)

    if (!orientacoes || orientacoes.length === 0) {
      return { skipped: 'Nenhuma orientação configurada para este serviço.' }
    }

    // 2. Prefere orientação específica do profissional; fallback = geral (profissional_id null)
    const especifica = orientacoes.find(o => o.profissional_id === args.profissional_id)
    const geral      = orientacoes.find(o => o.profissional_id === null)
    const orientacao = especifica ?? geral

    if (!orientacao) return { skipped: 'Nenhuma orientação aplicável.' }

    // 3. Busca dados do paciente
    const { data: paciente } = await admin
      .from('pacientes')
      .select('nome, ddi, telefone')
      .eq('id', args.paciente_id)
      .maybeSingle()

    if (!paciente?.telefone) {
      return { skipped: 'Paciente sem telefone cadastrado.' }
    }

    // 4. Busca dados do serviço e profissional
    const [{ data: servico }, { data: profissional }] = await Promise.all([
      admin.from('servicos').select('nome').eq('id', args.servico_id).maybeSingle(),
      admin.from('usuarios').select('nome').eq('id', args.profissional_id).maybeSingle(),
    ])

    // 5. Substitui tags
    const dataHora = new Date(args.data_hora)
    const mensagem = renderOrientacao(orientacao.mensagem, {
      cliente_nome:      paciente.nome,
      servico_nome:      servico?.nome ?? '',
      profissional_nome: profissional?.nome ?? '',
      data_agendamento:  dataHora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      hora_agendamento:  dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    })

    // 6. Busca token UAZAPI da empresa
    const { data: integ } = await admin
      .from('empresa_integracoes')
      .select('config')
      .eq('empresa_id', args.empresa_id)
      .eq('tipo', 'whatsapp')
      .maybeSingle()

    const cfg = integ?.config as { instance_token?: string } | null
    if (!cfg?.instance_token) return { skipped: 'UAZAPI não configurado.' }

    const uazapiUrl = process.env.UAZAPI_URL ?? ''
    if (!uazapiUrl) return { skipped: 'UAZAPI_URL não configurada.' }

    // 7. Formata número e envia
    const ddi    = (paciente.ddi ?? '55').replace(/\D/g, '')
    const numero = ddi + paciente.telefone.replace(/\D/g, '')

    const res = await fetch(`${uazapiUrl}/send/text`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'token': cfg.instance_token },
      body:    JSON.stringify({ number: numero, text: mensagem }),
      cache:   'no-store',
    })

    if (!res.ok) {
      const raw = await res.text()
      return { skipped: `UAZAPI ${res.status}: ${raw.slice(0, 120)}` }
    }

    return { sent: true }
  } catch (e: any) {
    return { skipped: e.message ?? 'Erro ao disparar orientação' }
  }
}
