'use server'

import { getEmpresaId } from '@/lib/get-empresa-id'
import { createAdminClient } from '@/lib/supabase/admin'

const UAZAPI_URL = process.env.UAZAPI_URL ?? ''

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface Conversa {
  id:              string
  jid:             string
  telefone:        string
  nome_contato:    string | null
  paciente_id:     string | null
  paciente_nome:   string | null
  ultima_mensagem: string | null
  ultima_msg_at:   string | null
  ultima_de_mim:   boolean
  ultima_tipo:     string
  nao_lidas:       number
  /** Paciente cadastrado mas sem conversa ainda */
  sem_conversa?:   boolean
}

export interface Mensagem {
  id:         string
  de_mim:     boolean
  tipo:       string
  conteudo:   string | null
  media_url:  string | null
  status:     string
  enviado_em: string
}

// ─── Listar conversas (com pacientes sem conversa ao final) ───────────────────
export async function listarConversasAction(): Promise<
  { data: Conversa[] } | { error: string }
> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()

    // ── Query 1: Conversas existentes (pode falhar se migration 018 não rodou)
    const { data: convs, error: convErr } = await admin
      .from('whatsapp_conversas')
      .select(`
        id, jid, telefone, nome_contato, paciente_id,
        ultima_mensagem, ultima_msg_at, ultima_de_mim, ultima_tipo, nao_lidas,
        pacientes(nome)
      `)
      .eq('empresa_id', empresaId)
      .order('ultima_msg_at', { ascending: false, nullsFirst: false })

    // Não para em caso de erro — exibe pacientes mesmo sem a tabela de conversas
    if (convErr) console.warn('[listarConversasAction] whatsapp_conversas:', convErr.message)

    const conversoesIds = new Set((convs ?? []).map((c: any) => c.paciente_id).filter(Boolean))

    // ── Query 2: Pacientes com telefone que ainda não têm conversa
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let queryPac: any = admin
      .from('pacientes')
      .select('id, nome, telefone, ddi')
      .eq('empresa_id', empresaId)
      .not('telefone', 'is', null)
      .neq('telefone', '')
      .order('nome', { ascending: true })
      .limit(50)

    if (conversoesIds.size > 0) {
      queryPac = queryPac.not('id', 'in', `(${[...conversoesIds].join(',')})`)
    }

    const { data: semConversa, error: pacErr } = await queryPac
    if (pacErr) console.warn('[listarConversasAction] pacientes:', pacErr.message)

    const lista: Conversa[] = [
      ...(convs ?? []).map((c: any) => ({
        id:              c.id,
        jid:             c.jid,
        telefone:        c.telefone,
        nome_contato:    c.nome_contato,
        paciente_id:     c.paciente_id,
        paciente_nome:   c.pacientes?.nome ?? null,
        ultima_mensagem: c.ultima_mensagem,
        ultima_msg_at:   c.ultima_msg_at,
        ultima_de_mim:   c.ultima_de_mim,
        ultima_tipo:     c.ultima_tipo,
        nao_lidas:       c.nao_lidas,
      })),
      ...(semConversa ?? []).map((p: any) => ({
        id:              `pac-${p.id}`,
        jid:             `${p.ddi ?? '55'}${p.telefone}@s.whatsapp.net`,
        telefone:        `${p.ddi ?? '55'}${p.telefone}`,
        nome_contato:    null,
        paciente_id:     p.id,
        paciente_nome:   p.nome,
        ultima_mensagem: null,
        ultima_msg_at:   null,
        ultima_de_mim:   false,
        ultima_tipo:     'text',
        nao_lidas:       0,
        sem_conversa:    true,
      })),
    ]

    return { data: lista }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao listar conversas' }
  }
}

// ─── Listar mensagens de uma conversa ────────────────────────────────────────
export async function listarMensagensAction(conversaId: string): Promise<
  { data: Mensagem[] } | { error: string }
> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('whatsapp_mensagens')
      .select('id, de_mim, tipo, conteudo, media_url, status, enviado_em')
      .eq('empresa_id', empresaId)
      .eq('conversa_id', conversaId)
      .order('enviado_em', { ascending: true })
      .limit(100)

    if (error) return { error: error.message }
    return { data: (data ?? []) as Mensagem[] }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao listar mensagens' }
  }
}

// ─── Marcar conversa como lida ────────────────────────────────────────────────
export async function marcarLidoAction(conversaId: string): Promise<void> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()
    await admin
      .from('whatsapp_conversas')
      .update({ nao_lidas: 0 })
      .eq('id', conversaId)
      .eq('empresa_id', empresaId)
  } catch {}
}

// ─── Enviar mensagem de texto ─────────────────────────────────────────────────
export async function enviarMensagemAction(
  conversaId: string,
  jid:         string,
  texto:       string,
): Promise<{ success: true; mensagem: Mensagem; realConversaId?: string } | { error: string }> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()

    // Busca token da instância
    const { data: integ } = await admin
      .from('empresa_integracoes')
      .select('config')
      .eq('empresa_id', empresaId)
      .eq('tipo', 'whatsapp')
      .maybeSingle()

    const cfg = integ?.config as { instance_token?: string } | null
    if (!cfg?.instance_token) return { error: 'WhatsApp não está conectado.' }

    // Envia via UAZAPI — endpoint: /send/text, campo "number" aceita número ou JID completo
    const number = jid.split('@')[0].split(':')[0]   // número internacional puro (ex: 5531999999999)
    const res = await fetch(`${UAZAPI_URL}/send/text`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'token': cfg.instance_token },
      body:    JSON.stringify({ number, text: texto }),
      cache:   'no-store',
    })
    const raw = await res.json().catch(() => ({}))
    if (!res.ok) return { error: raw?.error ?? raw?.message ?? `Erro HTTP ${res.status}` }

    // ── Se conversaId é virtual (pac-{uuid}), cria conversa real primeiro ──
    let realConversaId = conversaId
    let criouConversa  = false

    if (conversaId.startsWith('pac-')) {
      const pacienteId = conversaId.slice(4)
      const telefone   = jid.split('@')[0].split(':')[0]
      const jidFull    = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`

      // Busca nome do paciente para preencher nome_contato
      const { data: pac } = await admin
        .from('pacientes')
        .select('nome')
        .eq('id', pacienteId)
        .maybeSingle()

      const { data: conv, error: convErr } = await admin
        .from('whatsapp_conversas')
        .upsert(
          {
            empresa_id:      empresaId,
            jid:             jidFull,
            telefone,
            paciente_id:     pacienteId,
            nome_contato:    pac?.nome ?? null,
            ultima_mensagem: `Você: ${texto}`,
            ultima_msg_at:   new Date().toISOString(),
            ultima_de_mim:   true,
            ultima_tipo:     'text',
            nao_lidas:       0,
          },
          { onConflict: 'empresa_id,jid' },
        )
        .select('id')
        .single()

      if (convErr) return { error: convErr.message }
      realConversaId = conv.id
      criouConversa  = true
    }

    // Salva mensagem localmente (optimistic — não depende do webhook)
    const msgId = raw.key?.id ?? raw.messageId ?? raw.id ?? null
    const { data: msg, error } = await admin
      .from('whatsapp_mensagens')
      .insert({
        empresa_id:  empresaId,
        conversa_id: realConversaId,
        message_id:  msgId,
        de_mim:      true,
        tipo:        'text',
        conteudo:    texto,
        status:      'sent',
      })
      .select()
      .single()

    if (error) return { error: error.message }

    // Atualiza preview da conversa (upsert já fez isso se criouConversa)
    if (!criouConversa) {
      await admin
        .from('whatsapp_conversas')
        .update({
          ultima_mensagem: `Você: ${texto}`,
          ultima_msg_at:   new Date().toISOString(),
          ultima_de_mim:   true,
          ultima_tipo:     'text',
        })
        .eq('id', realConversaId)
        .eq('empresa_id', empresaId)
    }

    return {
      success:        true,
      mensagem:       msg as Mensagem,
      realConversaId: criouConversa ? realConversaId : undefined,
    }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao enviar mensagem' }
  }
}

// ─── Vincular contato a um paciente existente ────────────────────────────────
export async function vincularPacienteAction(
  conversaId: string,
  pacienteId:  string,
): Promise<{ success: true } | { error: string }> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()
    const { error } = await admin
      .from('whatsapp_conversas')
      .update({ paciente_id: pacienteId })
      .eq('id', conversaId)
      .eq('empresa_id', empresaId)
    if (error) return { error: error.message }
    return { success: true }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao vincular' }
  }
}

// ─── Criar paciente rápido a partir de um contato ────────────────────────────
export async function cadastrarContatoRapidoAction(
  conversaId: string,
  nome:        string,
  telefone:    string,
): Promise<{ success: true; pacienteId: string } | { error: string }> {
  try {
    const { empresaId } = await getEmpresaId()
    const admin = createAdminClient()

    const { data: pac, error: pacErr } = await admin
      .from('pacientes')
      .insert({ empresa_id: empresaId, nome, telefone: telefone.replace(/\D/g, ''), ddi: '55' })
      .select('id')
      .single()

    if (pacErr) return { error: pacErr.message }

    await admin
      .from('whatsapp_conversas')
      .update({ paciente_id: pac.id, nome_contato: nome })
      .eq('id', conversaId)
      .eq('empresa_id', empresaId)

    return { success: true, pacienteId: pac.id }
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao cadastrar contato' }
  }
}
