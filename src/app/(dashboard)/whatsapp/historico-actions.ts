'use server'

import { getEmpresaId } from '@/lib/get-empresa-id'
import { createAdminClient } from '@/lib/supabase/admin'
import { PAGE_SIZE } from './historico-utils'

// ─── Tipos ─────────────────────────────────────────────────────────────────────
export type StatusDisparo =
  | 'agendado'
  | 'enviado'
  | 'entregue'
  | 'lido'
  | 'pendente'
  | 'erro'
  | 'cancelado'

export interface Disparo {
  id:            string
  paciente_id:   string | null
  paciente_nome: string | null
  telefone:      string
  gatilho:       string
  mensagem:      string
  status:        StatusDisparo
  agendado_para: string | null
  enviado_em:    string | null
  erro_msg:      string | null
  criado_em:     string
}

// ─── Listar (paginado + filtros) ───────────────────────────────────────────────
export async function listarDisparosAction(params: {
  busca?:  string
  status?: string
  pagina?: number
}): Promise<{ data: Disparo[]; total: number } | { error: string }> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()
    const { busca = '', status = '', pagina = 1 } = params
    const from = (pagina - 1) * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1

    let q = admin
      .from('whatsapp_disparos')
      .select('*', { count: 'exact' })
      .eq('empresa_id', empresaId)
      .order('criado_em', { ascending: false })
      .range(from, to)

    if (status) q = q.eq('status', status)

    if (busca.trim()) {
      q = q.or(
        `paciente_nome.ilike.%${busca.trim()}%,telefone.ilike.%${busca.trim()}%`,
      )
    }

    const { data, error, count } = await q

    if (error) return { error: error.message }
    return { data: (data ?? []) as Disparo[], total: count ?? 0 }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao listar histórico' }
  }
}

// ─── Cancelar disparo agendado ─────────────────────────────────────────────────
export async function cancelarDisparoAction(
  id: string,
): Promise<{ success: true } | { error: string }> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()

    const { error } = await admin
      .from('whatsapp_disparos')
      .update({ status: 'cancelado' })
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .eq('status', 'agendado')   // só cancela se ainda está agendado

    if (error) return { error: error.message }
    return { success: true }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao cancelar disparo' }
  }
}

// ─── Enviar agora (força disparo imediato) ─────────────────────────────────────
export async function enviarAgoraAction(
  id: string,
): Promise<{ success: true } | { error: string }> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()

    // 1. Busca o disparo
    const { data: disp, error: errDisp } = await admin
      .from('whatsapp_disparos')
      .select('*')
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .maybeSingle()

    if (errDisp) return { error: errDisp.message }
    if (!disp)   return { error: 'Disparo não encontrado.' }
    if (disp.status !== 'agendado' && disp.status !== 'pendente') {
      return { error: 'Este disparo não está mais aguardando envio.' }
    }

    // 2. Busca configuração UAZAPI da empresa
    const { data: integ } = await admin
      .from('empresa_integracoes')
      .select('config')
      .eq('empresa_id', empresaId)
      .eq('tipo', 'whatsapp')
      .maybeSingle()

    const cfg = integ?.config as { instance_token?: string } | null
    if (!cfg?.instance_token) return { error: 'WhatsApp não configurado.' }

    const uazapiUrl = process.env.UAZAPI_URL ?? ''
    if (!uazapiUrl) return { error: 'UAZAPI_URL não configurada.' }

    // 3. Normaliza telefone
    const numero = disp.telefone.replace(/\D/g, '')

    // 4. Envia via UAZAPI
    const res = await fetch(`${uazapiUrl}/send/text`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'token':        cfg.instance_token,
      },
      body:  JSON.stringify({ number: numero, text: disp.mensagem }),
      cache: 'no-store',
    })

    const raw = await res.text()
    if (!res.ok) {
      // Marca como erro mas não interrompe
      await admin
        .from('whatsapp_disparos')
        .update({ status: 'erro', erro_msg: raw.slice(0, 300) })
        .eq('id', id)
      return { error: `UAZAPI ${res.status}: ${raw.slice(0, 120)}` }
    }

    // 5. Atualiza status
    await admin
      .from('whatsapp_disparos')
      .update({ status: 'enviado', enviado_em: new Date().toISOString(), agendado_para: null })
      .eq('id', id)

    return { success: true }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao enviar disparo' }
  }
}
