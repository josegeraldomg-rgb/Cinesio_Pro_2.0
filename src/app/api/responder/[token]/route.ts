import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── POST /api/responder/[token] ──────────────────────────────────────────────
// Rota pública (sem auth). Salva as respostas do paciente, marca o envio
// como respondido e cria uma entrada na timeline do prontuário.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createAdminClient()

  // ── 1. Valida o envio pelo token ─────────────────────────────────────────
  const { data: envio, error: errEnvio } = await admin
    .from('formularios_envios')
    .select('id, status, expira_em, formulario_id, paciente_id, empresa_id')
    .eq('token_unico', token)
    .maybeSingle()

  if (errEnvio || !envio) {
    return NextResponse.json({ error: 'Link inválido' }, { status: 404 })
  }

  if (envio.status === 'respondido') {
    return NextResponse.json({ error: 'Este formulário já foi respondido' }, { status: 409 })
  }

  if (envio.expira_em && new Date(envio.expira_em) < new Date()) {
    return NextResponse.json({ error: 'Este link expirou' }, { status: 410 })
  }

  // ── 2. Lê o payload ──────────────────────────────────────────────────────
  let respostas: Record<string, unknown>
  try {
    const body = await req.json()
    respostas = body.respostas ?? {}
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
  }

  // ── 3. Busca dados do formulário (nome, categoria, campos) ───────────────
  const { data: formulario } = await admin
    .from('formularios')
    .select('nome, categoria, campos_json')
    .eq('id', envio.formulario_id)
    .maybeSingle()

  // ── 4. Insere a resposta ─────────────────────────────────────────────────
  const { data: resposta, error: errResp } = await admin
    .from('formularios_respostas')
    .insert({
      envio_id:       envio.id,
      formulario_id:  envio.formulario_id,
      paciente_id:    envio.paciente_id,
      empresa_id:     envio.empresa_id,
      respostas_json: respostas,
    })
    .select('id')
    .single()

  if (errResp) {
    return NextResponse.json({ error: errResp.message }, { status: 500 })
  }

  // ── 5. Cria / busca prontuário do paciente ───────────────────────────────
  let prontuarioId: string | null = null

  const { data: pronExistente } = await admin
    .from('prontuarios')
    .select('id')
    .eq('empresa_id', envio.empresa_id)
    .eq('paciente_id', envio.paciente_id)
    .maybeSingle()

  if (pronExistente) {
    prontuarioId = pronExistente.id
  } else {
    const { data: pronNovo } = await admin
      .from('prontuarios')
      .insert({ empresa_id: envio.empresa_id, paciente_id: envio.paciente_id })
      .select('id')
      .single()
    prontuarioId = pronNovo?.id ?? null
  }

  // ── 6. Cria entrada na timeline (evolucoes_clinicas) ─────────────────────
  if (formulario && prontuarioId) {
    const conteudo = 'FORMULARIO:' + JSON.stringify({
      nome_formulario: formulario.nome,
      categoria:       formulario.categoria,
      campos:          formulario.campos_json ?? [],
      respostas,
    })

    const [evol] = await Promise.all([
      admin.from('evolucoes_clinicas').insert({
        empresa_id:       envio.empresa_id,
        paciente_id:      envio.paciente_id,
        profissional_id:  null,
        conteudo,
        data_atendimento: new Date().toISOString(),
      }).select('id').single(),

      // Atualiza prontuario_id na resposta
      admin.from('formularios_respostas')
        .update({ prontuario_id: prontuarioId })
        .eq('id', resposta.id),
    ])

    // Liga a evolução clínica ao prontuário (campo opcional, apenas para referência futura)
    if (evol.data?.id) {
      // Não há campo prontuario_id em evolucoes_clinicas — a ligação é pelo paciente_id
    }
  }

  // ── 7. Marca o envio como respondido ─────────────────────────────────────
  await admin
    .from('formularios_envios')
    .update({
      status:        'respondido',
      respondido_em: new Date().toISOString(),
    })
    .eq('id', envio.id)

  return NextResponse.json({ ok: true, resposta_id: resposta.id }, { status: 201 })
}
