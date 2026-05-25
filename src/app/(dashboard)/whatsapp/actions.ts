'use server'

import { getEmpresaId } from '@/lib/get-empresa-id'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Env vars ────────────────────────────────────────────────────────────────
const UAZAPI_URL          = process.env.UAZAPI_URL         ?? ''
const UAZAPI_ADMIN_TOKEN  = process.env.UAZAPI_ADMIN_TOKEN ?? ''

// ─── Tipos públicos ───────────────────────────────────────────────────────────
export interface WaConfig {
  instance_id:    string
  instance_token: string
  jid?:           string
  phone?:         string
}

export type WaStatusResult =
  | { status: 'no_instance' }
  | { status: 'not_configured' }
  | { status: 'connected';    instanceId: string; phone: string; jid: string }
  | { status: 'disconnected'; instanceId: string }
  | { status: 'qrcode';       instanceId: string; qrcode: string }
  | { status: 'paircode';     instanceId: string; paircode: string }
  | { error: string }

// ─── Helpers UAZAPI ───────────────────────────────────────────────────────────
function isConfigured() {
  return Boolean(UAZAPI_URL && UAZAPI_ADMIN_TOKEN)
}

async function uazapiAdmin(
  endpoint: string,
  method:   'GET' | 'POST' | 'DELETE',
  body?:    object,
): Promise<any> {
  const res = await fetch(`${UAZAPI_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      // UAZAPI aceita 'apikey' (Evolution-based) ou 'admin-token' dependendo da versão
      'apikey':       UAZAPI_ADMIN_TOKEN,
      'admin-token':  UAZAPI_ADMIN_TOKEN,
    },
    body:  body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const text = await res.text()
  try   { return JSON.parse(text) }
  catch { return { _raw: text } }
}

async function uazapiInstance(
  token:    string,
  endpoint: string,
  method:   'GET' | 'POST' | 'DELETE',
  body?:    object,
): Promise<any> {
  const res = await fetch(`${UAZAPI_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'token':        token,   // UAZAPI padrão
      'apikey':       token,   // Evolution API v2 / UAZAPI alternativo
    },
    body:  body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const text = await res.text()
  try   { return JSON.parse(text) }
  catch { return { _raw: text } }
}

/** Normaliza o campo 'connected' de diferentes versões da UAZAPI / Evolution */
function parseConnected(raw: any): boolean {
  if (raw.connected === true)  return true
  if (raw.connected === false) return false
  const state: string = raw.state ?? raw.status ?? raw.connection?.state ?? ''
  return ['open', 'authenticated', 'logged_in', 'connected'].includes(state.toLowerCase())
}

/** Remove sufixo @s.whatsapp.net e formata como telefone */
function jidToPhone(jid: string): string {
  const num = jid.split('@')[0]
  if (num.startsWith('55') && num.length >= 12) {
    const ddd = num.slice(2, 4)
    const tel = num.slice(4)
    return `+55 (${ddd}) ${tel}`
  }
  return `+${num}`
}

// ─── DB helpers ───────────────────────────────────────────────────────────────
async function getConfig(empresaId: string): Promise<WaConfig | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('empresa_integracoes')
    .select('config')
    .eq('empresa_id', empresaId)
    .eq('tipo', 'whatsapp')
    .maybeSingle()
  return (data?.config as WaConfig) ?? null
}

async function saveConfig(empresaId: string, config: WaConfig) {
  const admin = createAdminClient()
  await admin.from('empresa_integracoes').upsert(
    { empresa_id: empresaId, tipo: 'whatsapp', config, ativo: true },
    { onConflict: 'empresa_id,tipo' },
  )
}

async function deleteConfig(empresaId: string) {
  const admin = createAdminClient()
  await admin
    .from('empresa_integracoes')
    .delete()
    .eq('empresa_id', empresaId)
    .eq('tipo', 'whatsapp')
}

// ═════════════════════════════════════════════════════════════════════════════
// Server Actions
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Lê o status atual da integração WhatsApp da empresa.
 * Combina o estado salvo no banco com a consulta em tempo real à UAZAPI.
 */
export async function getStatusWaAction(): Promise<WaStatusResult> {
  try {
    if (!isConfigured()) return { status: 'not_configured' }

    const { empresaId } = await getEmpresaId()
    const cfg = await getConfig(empresaId)
    if (!cfg) return { status: 'no_instance' }

    const raw = await uazapiInstance(cfg.instance_token, '/instance/status', 'GET')
    const connected = parseConnected(raw)

    if (connected) {
      const rawJid = raw.jid ?? raw.user?.id ?? cfg.jid ?? ''
      const jid    = rawJid.split('@')[0]
      const phone  = jidToPhone(rawJid || jid)

      // Persiste JID / phone se ainda não estava salvo
      if (!cfg.jid || !cfg.phone) {
        await saveConfig(empresaId, { ...cfg, jid, phone })
      }
      return { status: 'connected', instanceId: cfg.instance_id, phone, jid }
    }

    return { status: 'disconnected', instanceId: cfg.instance_id }
  } catch (e: any) {
    return { error: e.message ?? 'Erro desconhecido' }
  }
}

/**
 * Cria uma nova instância UAZAPI para a empresa e persiste no banco.
 * Endpoint real: POST /instance/create  (sem header de autenticação)
 */
export async function criarInstanciaWaAction(): Promise<
  { instanceId: string; instanceToken: string } | { error: string }
> {
  try {
    const { empresaId } = await getEmpresaId()

    // Endpoint correto conforme documentação UAZAPI — sem auth header
    const res = await fetch(`${UAZAPI_URL}/instance/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body:  JSON.stringify({ name: empresaId }),
      cache: 'no-store',
    })
    const raw = await res.json().catch(() => ({}))

    // Normaliza diferentes formatos de resposta
    const instanceId    = raw.id    ?? raw.data?.id    ?? raw.instance?.id    ?? ''
    const instanceToken = raw.token ?? raw.data?.token ?? raw.instance?.token ?? ''

    if (!instanceId || !instanceToken) {
      return { error: `Resposta inesperada da UAZAPI: ${JSON.stringify(raw)}` }
    }

    await saveConfig(empresaId, { instance_id: instanceId, instance_token: instanceToken })
    return { instanceId, instanceToken }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao criar instância' }
  }
}

/**
 * Solicita QR Code (sem phone) ou Pair Code (com phone) à instância UAZAPI.
 * Endpoint: POST /instance/connect  •  header: token  •  body: { phone? }
 */
export async function conectarWaAction(phone?: string): Promise<
  { qrcode: string } | { paircode: string } | { error: string }
> {
  try {
    if (!isConfigured()) return { error: 'UAZAPI não configurado.' }

    const { empresaId } = await getEmpresaId()
    const cfg = await getConfig(empresaId)
    if (!cfg) return { error: 'Nenhuma instância encontrada. Crie uma primeiro.' }

    // Com phone → paircode; sem phone → QR Code
    const body = phone ? { phone } : {}
    const raw  = await uazapiInstance(cfg.instance_token, '/instance/connect', 'POST', body)

    if (raw.qrcode)        return { qrcode: raw.qrcode }
    if (raw.paircode)      return { paircode: raw.paircode }
    if (raw.data?.qrcode)  return { qrcode: raw.data.qrcode }
    if (raw.data?.paircode)return { paircode: raw.data.paircode }

    return { error: `Resposta inesperada: ${JSON.stringify(raw)}` }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao conectar' }
  }
}

/**
 * Desconecta o dispositivo vinculado (sem excluir a instância).
 */
export async function desconectarWaAction(): Promise<{ success: true } | { error: string }> {
  try {
    if (!isConfigured()) return { error: 'UAZAPI não configurado.' }

    const { empresaId } = await getEmpresaId()
    const cfg = await getConfig(empresaId)
    if (!cfg) return { error: 'Nenhuma instância encontrada.' }

    await uazapiInstance(cfg.instance_token, '/instance/disconnect', 'POST')

    // Limpa jid/phone do banco (desconectado)
    await saveConfig(empresaId, {
      instance_id:    cfg.instance_id,
      instance_token: cfg.instance_token,
    })

    return { success: true }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao desconectar' }
  }
}

/**
 * Remove a instância da UAZAPI e exclui o registro do banco.
 */
export async function excluirInstanciaWaAction(): Promise<{ success: true } | { error: string }> {
  try {
    if (!isConfigured()) return { error: 'UAZAPI não configurado.' }

    const { empresaId } = await getEmpresaId()
    const cfg = await getConfig(empresaId)
    if (!cfg) return { error: 'Nenhuma instância encontrada.' }

    // Tenta desconectar antes de deletar (best effort)
    try {
      await uazapiInstance(cfg.instance_token, '/instance/disconnect', 'POST')
    } catch {}

    // Remove do banco
    await deleteConfig(empresaId)
    return { success: true }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao excluir instância' }
  }
}

/**
 * Reconfigura o webhook na UAZAPI apontando para o receptor do CinesioPro.
 * Garante que mensagens recebidas, confirmações e status cheguem ao sistema.
 */
export async function configurarWebhookWaAction(): Promise<{ success: true } | { error: string }> {
  try {
    if (!isConfigured()) return { error: 'UAZAPI não configurado.' }

    const { empresaId } = await getEmpresaId()
    const cfg = await getConfig(empresaId)
    if (!cfg) return { error: 'Nenhuma instância encontrada.' }

    // A UAZAPI não exige URL de webhook externo — apenas sincroniza a configuração
    await uazapiInstance(cfg.instance_token, '/webhook', 'POST', {
      events: ['messages', 'connection', 'messages_update', 'message.ack'],
    })

    return { success: true }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao configurar webhook' }
  }
}
