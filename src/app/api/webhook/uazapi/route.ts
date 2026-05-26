import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Helpers de parsing ───────────────────────────────────────────────────────
function extrairTelefone(jid: string): string {
  return jid.split('@')[0].split(':')[0].replace(/\D/g, '')
}

function extrairMensagem(data: any): { tipo: string; conteudo: string; mediaUrl: string } {
  const msg = data.message ?? {}
  if (msg.conversation)        return { tipo: 'text',     conteudo: msg.conversation,                   mediaUrl: '' }
  if (msg.extendedTextMessage) return { tipo: 'text',     conteudo: msg.extendedTextMessage?.text ?? '', mediaUrl: '' }
  if (msg.audioMessage)        return { tipo: 'audio',    conteudo: '',                                  mediaUrl: msg.audioMessage?.url ?? '' }
  if (msg.imageMessage)        return { tipo: 'image',    conteudo: msg.imageMessage?.caption ?? '',     mediaUrl: msg.imageMessage?.url ?? '' }
  if (msg.videoMessage)        return { tipo: 'video',    conteudo: msg.videoMessage?.caption ?? '',     mediaUrl: '' }
  if (msg.documentMessage)     return { tipo: 'document', conteudo: msg.documentMessage?.fileName ?? '', mediaUrl: '' }
  if (msg.stickerMessage)      return { tipo: 'sticker',  conteudo: '(figurinha)',                       mediaUrl: '' }
  if (msg.reactionMessage)     return { tipo: 'reaction', conteudo: msg.reactionMessage?.text ?? '❤️',  mediaUrl: '' }
  return { tipo: 'text', conteudo: JSON.stringify(msg).slice(0, 100), mediaUrl: '' }
}

function previaMensagem(tipo: string, conteudo: string): string {
  if (tipo === 'audio')    return '🎵 Áudio recebido'
  if (tipo === 'image')    return conteudo ? `📷 ${conteudo}` : '📷 Imagem'
  if (tipo === 'video')    return conteudo ? `🎥 ${conteudo}` : '🎥 Vídeo'
  if (tipo === 'document') return conteudo ? `📄 ${conteudo}` : '📄 Documento'
  if (tipo === 'sticker')  return '(figurinha)'
  return conteudo
}

// ─── Handler principal ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const payload    = await req.json()
    const event_type = (payload.event ?? payload.type ?? 'unknown') as string
    const token      = req.nextUrl.searchParams.get('token') ?? ''
    const admin      = createAdminClient()

    // ── Identifica empresa pelo ?token= na URL
    let empresaId: string | null = null
    if (token) {
      const { data } = await admin
        .from('empresa_integracoes')
        .select('empresa_id')
        .eq('tipo', 'whatsapp')
        .filter('config->>instance_token', 'eq', token)
        .maybeSingle()
      empresaId = data?.empresa_id ?? null
    }

    // ── Log bruto para auditoria (não-fatal: ignora se tabela não existir)
    try {
      await admin.from('whatsapp_webhook_debug_logs').insert({
        empresa_id: empresaId,
        event_type,
        payload,
      })
    } catch {}

    if (!empresaId) return NextResponse.json({ ok: true, skipped: 'unknown_instance' })

    // ── Eventos de mensagem (vários formatos possíveis da UAZAPI / Evolution)
    const isMsgEvent = ['message', 'messages'].some(s => event_type.toLowerCase().includes(s))
    if (isMsgEvent && !event_type.includes('update') && !event_type.includes('ack')) {
      const data  = payload.data ?? payload.message ?? payload
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        await processarMensagem(admin, empresaId, item)
      }
    }

    // ── Eventos de status (entrega/leitura)
    if (event_type.includes('update') || event_type.includes('ack')) {
      const data  = payload.data ?? payload
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) await processarStatusUpdate(admin, empresaId, item)
    }

    return NextResponse.json({ ok: true, event: event_type })
  } catch (err: any) {
    console.error('[webhook/uazapi]', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'cinesiopro-uazapi-webhook' })
}

// ─── Processa uma mensagem recebida ou enviada ────────────────────────────────
async function processarMensagem(admin: any, empresaId: string, data: any) {
  const key       = data.key ?? {}
  const fromMe    = key.fromMe ?? false
  const remoteJid = key.remoteJid ?? ''
  const messageId = key.id ?? ''

  if (!remoteJid || !messageId) return
  if (remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') return

  const pushName              = data.pushName ?? ''
  const { tipo, conteudo, mediaUrl } = extrairMensagem(data)
  const previa                = previaMensagem(tipo, conteudo)
  const tsRaw                 = data.messageTimestamp ?? data.timestamp
  const enviado_em            = tsRaw ? new Date(Number(tsRaw) * 1000).toISOString() : new Date().toISOString()
  const telefone              = extrairTelefone(remoteJid)

  // Tenta vincular paciente pelo telefone (últimos 10 dígitos)
  const last10 = telefone.slice(-10)
  const { data: pac } = await admin
    .from('pacientes')
    .select('id')
    .eq('empresa_id', empresaId)
    .or(`telefone.eq.${telefone},telefone.like.%${last10}`)
    .maybeSingle()
  const pacienteId = pac?.id ?? null

  // Upsert conversa
  const { data: conversa } = await admin
    .from('whatsapp_conversas')
    .upsert(
      {
        empresa_id:      empresaId,
        jid:             remoteJid,
        telefone,
        nome_contato:    pushName || null,
        paciente_id:     pacienteId,
        ultima_mensagem: fromMe ? `Você: ${previa}` : previa,
        ultima_msg_at:   enviado_em,
        ultima_de_mim:   fromMe,
        ultima_tipo:     tipo,
      },
      { onConflict: 'empresa_id,jid', ignoreDuplicates: false },
    )
    .select('id')
    .single()

  if (!conversa) return

  // Incrementa nao_lidas atomicamente para mensagens recebidas
  if (!fromMe) {
    await admin.rpc('wa_inc_nao_lidas', { p_empresa_id: empresaId, p_jid: remoteJid })
  }

  // Insere mensagem (ignora duplicata)
  await admin
    .from('whatsapp_mensagens')
    .upsert(
      {
        empresa_id:  empresaId,
        conversa_id: conversa.id,
        message_id:  messageId,
        de_mim:      fromMe,
        tipo,
        conteudo:    conteudo || null,
        media_url:   mediaUrl || null,
        status:      'sent',
        enviado_em,
      },
      { onConflict: 'empresa_id,message_id', ignoreDuplicates: true },
    )
}

// ─── Processa atualização de status de entrega/leitura ───────────────────────
async function processarStatusUpdate(admin: any, empresaId: string, data: any) {
  const msgId = data.key?.id ?? ''
  const st    = (data.update?.status ?? data.status ?? '').toLowerCase()
  if (!msgId || !st) return

  const map: Record<string, string> = { delivery_ack: 'delivered', read: 'read', played: 'read' }
  const novoStatus = map[st]
  if (!novoStatus) return

  await admin
    .from('whatsapp_mensagens')
    .update({ status: novoStatus })
    .eq('empresa_id', empresaId)
    .eq('message_id', msgId)
}
