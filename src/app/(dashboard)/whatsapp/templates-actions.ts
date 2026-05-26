'use server'

import { getEmpresaId } from '@/lib/get-empresa-id'
import { createAdminClient } from '@/lib/supabase/admin'

const UAZAPI_URL         = process.env.UAZAPI_URL         ?? ''
const UAZAPI_ADMIN_TOKEN = process.env.UAZAPI_ADMIN_TOKEN ?? ''

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface TemplateData {
  id?:                   string
  ativo:                 boolean
  mensagem:              string
  minutos_antecedencia?: number | null
  horario_disparo?:      string | null
}

export type TemplatesMap = Record<string, TemplateData>

// ─── Dados de amostra para substituição no envio de teste ────────────────────
const AMOSTRAS: Record<string, string> = {
  cliente_nome:      'Rafael Abner',
  empresa_nome:      'Clínica Bem Estar',
  data_agendamento:  '28/05/2026',
  hora_agendamento:  '14:30',
  servico_nome:      'Pilates Terapêutico',
  valor_agendamento: 'R$ 150,00',
}

function renderMensagem(mensagem: string): string {
  return Object.entries(AMOSTRAS).reduce(
    (acc, [key, val]) => acc.split(`[[${key}]]`).join(val),
    mensagem,
  )
}

// ─── UAZAPI helper (duplicado local para isolamento deste módulo) ─────────────
async function uazapiPost(token: string, endpoint: string, body: object): Promise<any> {
  const res = await fetch(`${UAZAPI_URL}${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'token': token },
    body:    JSON.stringify(body),
    cache:   'no-store',
  })
  const text = await res.text()
  try   { return JSON.parse(text) }
  catch { return { _raw: text } }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Lista todos os templates salvos no banco para a empresa logada.
 * Retorna um mapa gatilho → TemplateData.
 */
export async function listarTemplatesAction(): Promise<
  { data: TemplatesMap } | { error: string }
> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('whatsapp_templates')
      .select('*')
      .eq('empresa_id', empresaId)

    if (error) return { error: error.message }

    const map: TemplatesMap = {}
    for (const row of data ?? []) {
      map[row.gatilho] = {
        id:                   row.id,
        ativo:                row.ativo,
        mensagem:             row.mensagem,
        minutos_antecedencia: row.minutos_antecedencia,
        horario_disparo:      row.horario_disparo,
      }
    }
    return { data: map }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao listar templates' }
  }
}

/**
 * Cria ou atualiza um template de mensagem para um gatilho específico.
 */
export async function salvarTemplateAction(
  gatilho: string,
  payload: Omit<TemplateData, 'id'>,
): Promise<{ success: true } | { error: string }> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()
    const { error } = await admin
      .from('whatsapp_templates')
      .upsert(
        {
          empresa_id:           empresaId,
          gatilho,
          ativo:                payload.ativo,
          mensagem:             payload.mensagem,
          minutos_antecedencia: payload.minutos_antecedencia ?? null,
          horario_disparo:      payload.horario_disparo ?? null,
        },
        { onConflict: 'empresa_id,gatilho' },
      )

    if (error) return { error: error.message }
    return { success: true }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao salvar template' }
  }
}

/**
 * Envia a mensagem com tags substituídas por dados de amostra para o próprio
 * número conectado na instância UAZAPI da empresa — para validação visual.
 */
export async function enviarTesteTemplateAction(
  mensagem: string,
): Promise<{ success: true } | { error: string }> {
  try {
    if (!UAZAPI_URL || !UAZAPI_ADMIN_TOKEN) {
      return { error: 'UAZAPI não configurado no servidor.' }
    }

    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()
    const { data: integ } = await admin
      .from('empresa_integracoes')
      .select('config')
      .eq('empresa_id', empresaId)
      .eq('tipo', 'whatsapp')
      .maybeSingle()

    const cfg = integ?.config as { instance_token?: string; jid?: string } | null
    if (!cfg?.instance_token) return { error: 'Nenhuma instância WhatsApp conectada.' }
    if (!cfg.jid)             return { error: 'WhatsApp não está conectado a nenhum número.' }

    const texto = renderMensagem(mensagem)
    // Extrai número puro (sem JID e sem sufixo de dispositivo :XX)
    const number = cfg.jid.split('@')[0].split(':')[0]

    const raw = await uazapiPost(cfg.instance_token, '/send/text', { number, text: texto })

    if (raw?.error || raw?.status === 'error') {
      return { error: `UAZAPI: ${JSON.stringify(raw)}` }
    }
    return { success: true }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao enviar teste' }
  }
}
