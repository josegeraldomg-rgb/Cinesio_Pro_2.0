import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/webhook/uazapi
 *
 * Receptor de eventos enviados pela UAZAPI em tempo real.
 * Persiste o payload bruto para auditoria e processa eventos relevantes.
 *
 * Eventos esperados:
 *   - messages          → nova mensagem recebida
 *   - connection        → mudança de estado de conexão
 *   - messages_update   → status de entrega/leitura
 *   - message.ack       → confirmação de leitura
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()

    // ── Identifica a empresa pelo token da instância (query param ?token=)
    const token      = req.nextUrl.searchParams.get('token') ?? ''
    const event_type = payload.event ?? payload.type ?? 'unknown'

    const admin = createAdminClient()

    // ── Busca empresa pela instância
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

    // ── Persiste log bruto (anti-duplicação via message_id_externo não implementada ainda)
    await admin.from('whatsapp_webhook_debug_logs').insert({
      empresa_id: empresaId,
      event_type,
      payload,
    })

    // ── Filtra loops: mensagens enviadas pela própria API (wasSentByApi)
    if (payload.key?.fromMe === true || payload.wasSentByApi === true) {
      return NextResponse.json({ ok: true, skipped: 'own_message' })
    }

    // ── Processamento futuro por tipo de evento
    // TODO: salvar em whatsapp_mensagens, notificar via Realtime, acionar Agente IA

    return NextResponse.json({ ok: true, event: event_type })
  } catch (err: any) {
    console.error('[webhook/uazapi]', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

// A UAZAPI pode enviar um GET de verificação
export async function GET() {
  return NextResponse.json({ ok: true, service: 'cinesiopro-uazapi-webhook' })
}
