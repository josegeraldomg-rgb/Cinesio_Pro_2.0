'use server'

import { getEmpresaId } from '@/lib/get-empresa-id'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Env vars ────────────────────────────────────────────────────────────────
const UAZAPI_URL          = process.env.UAZAPI_URL          ?? ''
const UAZAPI_ADMIN_TOKEN  = process.env.UAZAPI_ADMIN_TOKEN  ?? ''
const APP_URL             = process.env.NEXT_PUBLIC_APP_URL ?? ''

// ─── Tipos públicos ───────────────────────────────────────────────────────────
export interface WaConfig {
  instance_id:    string
  instance_token: string
  jid?:           string
  phone?:         string
}

export interface WaReqDebug {
  method:   string
  url:      string
  headers:  Record<string, string>
  body?:    object
}

export type WaStatusResult =
  | { status: 'no_instance';   _req?: WaReqDebug }
  | { status: 'not_configured';_req?: WaReqDebug }
  | { status: 'connected';    instanceId: string; phone: string; jid: string; _req?: WaReqDebug }
  | { status: 'disconnected'; instanceId: string;                              _req?: WaReqDebug }
  | { status: 'qrcode';       instanceId: string; qrcode: string;             _req?: WaReqDebug }
  | { status: 'paircode';     instanceId: string; paircode: string;           _req?: WaReqDebug }
  | { error: string;          _req?: WaReqDebug }

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
): Promise<{ data: any; req: WaReqDebug }> {
  const url     = `${UAZAPI_URL}${endpoint}`
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json', 'token': token }
  const req: WaReqDebug = { method, url, headers, body }

  const res  = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' })
  const text = await res.text()
  let data: any
  try   { data = JSON.parse(text) }
  catch { data = { _raw: text } }
  return { data, req }
}

/** Normaliza o campo 'connected' de diferentes versões da UAZAPI / Evolution.
 *  NÃO faz short-circuit em connected===false — verifica todos os indicadores. */
function parseConnected(raw: any): boolean {
  // Indicadores positivos — qualquer um é suficiente
  if (raw.connected         === true) return true
  if (raw.loggedIn          === true) return true
  if (raw.instance?.loggedIn=== true) return true
  if (raw.status?.connected === true) return true
  if (raw.status?.loggedIn  === true) return true

  // Verifica campos de string (instance.status, raw.state, etc.)
  const instanceStatus = typeof raw.instance?.status === 'string' ? raw.instance.status : ''
  const state: string  =
    raw.state ??
    raw.connection?.state ??
    instanceStatus ??
    (typeof raw.status === 'string' ? raw.status : '') ??
    ''
  if (['open', 'authenticated', 'logged_in', 'connected'].includes(state.toLowerCase())) return true

  return false
}

/** Remove sufixo @s.whatsapp.net e identificador de dispositivo (:84) e formata como telefone */
function jidToPhone(jid: string): string {
  const num = jid.split('@')[0].split(':')[0]
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

    const { data: raw, req } = await uazapiInstance(cfg.instance_token, '/instance/status', 'GET')
    const connected = parseConnected(raw)

    if (connected) {
      const rawJid = raw.jid ?? raw.status?.jid ?? raw.instance?.jid ?? raw.user?.id ?? cfg.jid ?? ''
      const jid    = rawJid.split('@')[0].split(':')[0]
      const phone  = jidToPhone(rawJid || jid)
      if (!cfg.jid || cfg.jid !== jid || !cfg.phone) {
        await saveConfig(empresaId, { ...cfg, jid, phone })
      }
      return { status: 'connected', instanceId: cfg.instance_id, phone, jid, _req: req }
    }

    // Instância em processo de conexão — retorna QR Code atualizado se disponível
    const freshQr = raw.qrcode ?? raw.instance?.qrcode ?? ''
    if (freshQr) {
      return { status: 'qrcode', instanceId: cfg.instance_id, qrcode: freshQr, _req: req }
    }

    return { status: 'disconnected', instanceId: cfg.instance_id, _req: req }
  } catch (e: any) {
    return { error: e.message ?? 'Erro desconhecido' }
  }
}

/**
 * Cria uma nova instância UAZAPI para a empresa e persiste no banco.
 * Endpoint real: POST /instance/create  (sem header de autenticação)
 */
export async function criarInstanciaWaAction(): Promise<
  { instanceId: string; instanceToken: string; _req: WaReqDebug } | { error: string; _req: WaReqDebug }
> {
  const url     = `${UAZAPI_URL}/instance/create`
  const headers = { 'Content-Type': 'application/json', 'admintoken': UAZAPI_ADMIN_TOKEN, 'apikey': UAZAPI_ADMIN_TOKEN }

  try {
    const { empresaId } = await getEmpresaId()
    const instanceName  = `empresa-${empresaId.slice(0, 8)}-${Date.now()}`
    const body          = { name: instanceName }
    const req: WaReqDebug = { method: 'POST', url, headers, body }

    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), cache: 'no-store' })
    const raw = await res.json().catch(() => ({}))

    if (!res.ok) {
      return { error: `UAZAPI HTTP ${res.status}: ${JSON.stringify(raw)}`, _req: req }
    }

    const instanceId    = raw.id    ?? raw.data?.id    ?? raw.instance?.id    ?? ''
    const instanceToken = raw.token ?? raw.data?.token ?? raw.instance?.token ?? ''

    if (!instanceId || !instanceToken) {
      return { error: `Resposta inesperada da UAZAPI: ${JSON.stringify(raw)}`, _req: req }
    }

    await saveConfig(empresaId, { instance_id: instanceId, instance_token: instanceToken })
    return { instanceId, instanceToken, _req: req }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao criar instância', _req: { method: 'POST', url, headers } }
  }
}

/**
 * Solicita QR Code (sem phone) ou Pair Code (com phone) à instância UAZAPI.
 * Endpoint: POST /instance/connect  •  header: token  •  body: { phone? }
 */
export async function conectarWaAction(phone?: string): Promise<
  | { qrcode: string;          _req: WaReqDebug }
  | { paircode: string;        _req: WaReqDebug }
  | { already_connected: true; _req: WaReqDebug }
  | { error: string;           _req?: WaReqDebug }
> {
  try {
    if (!isConfigured()) return { error: 'UAZAPI não configurado.' }

    const { empresaId } = await getEmpresaId()
    const cfg = await getConfig(empresaId)
    if (!cfg) return { error: 'Nenhuma instância encontrada. Crie uma primeiro.' }

    const body = phone ? { phone, browser: 'auto' } : { browser: 'auto' }
    const { data: raw, req } = await uazapiInstance(cfg.instance_token, '/instance/connect', 'POST', body)

    const isConnected = raw.connected === true || raw.instance?.loggedIn === true
    if (isConnected) return { already_connected: true, _req: req }

    const qrcode   = raw.qrcode   ?? raw.data?.qrcode   ?? raw.instance?.qrcode   ?? ''
    const paircode = raw.paircode ?? raw.data?.paircode ?? raw.instance?.paircode ?? ''

    if (qrcode)   return { qrcode, _req: req }
    if (paircode) return { paircode, _req: req }

    return { error: `Resposta inesperada: ${JSON.stringify(raw)}`, _req: req }
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
 * Configura (ou atualiza) o webhook da instância UAZAPI — Modo Simples.
 * Sem action/id: cria um novo ou atualiza o único webhook existente automaticamente.
 * Requer URL pública acessível pela UAZAPI.
 */
export async function configurarWebhookWaAction(customUrl?: string): Promise<
  { success: true; url: string } | { error: string }
> {
  try {
    if (!isConfigured()) return { error: 'UAZAPI não configurado.' }

    const { empresaId } = await getEmpresaId()
    const cfg = await getConfig(empresaId)
    if (!cfg) return { error: 'Nenhuma instância encontrada.' }

    // URL: 1) passada pelo usuário via UI, 2) variável de ambiente APP_URL
    const baseUrl = customUrl?.trim() || APP_URL || ''
    if (!baseUrl) {
      return {
        error: 'Informe a URL pública do sistema no campo abaixo (ex: https://seudominio.com).',
      }
    }

    const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/webhook/uazapi?token=${cfg.instance_token}`

    // Modo simples (sem action / id) — UAZAPI cria ou atualiza automaticamente
    await uazapiInstance(cfg.instance_token, '/webhook', 'POST', {
      url:                 webhookUrl,
      enabled:             true,
      events:              ['messages', 'messages_update', 'message.ack', 'connection'],
      excludeMessages:     ['wasSentByApi'],  // ⚠️ evita loop: mensagens enviadas por API não voltam como evento
      addUrlEvents:        false,
      addUrlTypesMessages: false,
    })

    return { success: true, url: webhookUrl }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao configurar webhook' }
  }
}

/**
 * Retorna a configuração atual do webhook da instância.
 */
export async function verWebhookWaAction(): Promise<
  { data: any[] } | { error: string }
> {
  try {
    if (!isConfigured()) return { error: 'UAZAPI não configurado.' }
    const { empresaId } = await getEmpresaId()
    const cfg = await getConfig(empresaId)
    if (!cfg) return { error: 'Nenhuma instância encontrada.' }
    const { data } = await uazapiInstance(cfg.instance_token, '/webhook', 'GET')
    return { data: Array.isArray(data) ? data : (data ? [data] : []) }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao buscar webhook' }
  }
}

/**
 * Retorna os últimos 20 erros de entrega do webhook local da instância.
 * Útil para diagnosticar por que mensagens não estão chegando.
 */
export async function verWebhookErrosWaAction(): Promise<
  { data: WebhookErro[]; capturaDesde: string | null } | { error: string }
> {
  try {
    if (!isConfigured()) return { error: 'UAZAPI não configurado.' }
    const { empresaId } = await getEmpresaId()
    const cfg = await getConfig(empresaId)
    if (!cfg) return { error: 'Nenhuma instância encontrada.' }

    const url     = `${UAZAPI_URL}/webhook/errors`
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json', 'token': cfg.instance_token }
    const res     = await fetch(url, { method: 'GET', headers, cache: 'no-store' })
    const capturaDesde = res.headers.get('X-Webhook-Error-Capture-Started-At')
    const text    = await res.text()
    let raw: any
    try { raw = JSON.parse(text) } catch { raw = [] }

    const lista: WebhookErro[] = (Array.isArray(raw) ? raw : []).map((e: any) => ({
      created:     e.created ?? e.timestamp ?? '',
      url:         e.url ?? '',
      evento:      e.event ?? e.evento ?? '',
      tentativas:  e.attempts ?? e.tentativas ?? 0,
      httpStatus:  e.status ?? e.httpStatus ?? null,
      erro:        e.error ?? e.message ?? e.erro ?? '',
      payload:     e.payload ?? null,
    }))

    return { data: lista, capturaDesde }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao buscar erros do webhook' }
  }
}

/**
 * Envia uma mensagem de boas-vindas para o próprio número conectado,
 * confirmando que a via de mão dupla (envio + recebimento) está ativa.
 * Fire-and-forget — falhas são silenciosas.
 */
export async function enviarBoasVindasAction(jid: string): Promise<void> {
  try {
    const { empresaId } = await getEmpresaId()
    const cfg = await getConfig(empresaId)
    if (!cfg?.instance_token || !UAZAPI_URL) return

    const number = jid.split('@')[0].split(':')[0]  // extrai apenas os dígitos
    await fetch(`${UAZAPI_URL}/send/text`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'token': cfg.instance_token },
      body:    JSON.stringify({
        number,
        text: '✅ *CinesioPro Conectado!*\n\nSeu WhatsApp foi vinculado com sucesso ao sistema. A partir de agora, você poderá enviar e receber mensagens dos pacientes diretamente pelo Painel.',
      }),
      cache: 'no-store',
    })
  } catch {}
}

/**
 * Envia uma mensagem de texto via UAZAPI para um número específico.
 * Usado pelo modal de envio de formulários e outros fluxos da plataforma.
 * Retorna { ok: true } se enviado, ou { error, fallbackUrl } para o cliente abrir wa.me.
 */
export async function enviarTextWaAction(
  number: string,   // apenas dígitos, ex: "5531999990000"
  text:   string,
): Promise<
  | { ok: true }
  | { error: string; fallbackUrl: string }
> {
  const fallbackUrl = `https://wa.me/${number}?text=${encodeURIComponent(text)}`
  try {
    if (!isConfigured()) return { error: 'UAZAPI não configurado', fallbackUrl }

    const { empresaId } = await getEmpresaId()
    const cfg = await getConfig(empresaId)
    if (!cfg?.instance_token) return { error: 'Nenhuma instância WhatsApp encontrada', fallbackUrl }

    const res = await fetch(`${UAZAPI_URL}/send/text`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'token': cfg.instance_token },
      body:    JSON.stringify({ number, text }),
      cache:   'no-store',
    })

    if (!res.ok) {
      const raw = await res.text()
      return { error: `UAZAPI ${res.status}: ${raw.slice(0, 120)}`, fallbackUrl }
    }

    return { ok: true }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao enviar mensagem', fallbackUrl }
  }
}

export interface WebhookErro {
  created:    string
  url:        string
  evento:     string
  tentativas: number
  httpStatus: number | null
  erro:       string
  payload:    any
}
