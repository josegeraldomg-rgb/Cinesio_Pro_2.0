import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─── POST /api/formularios/envios ─────────────────────────────────────────────
// Cria um envio (link único) para um paciente responder o formulário
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user.id)
    .single()

  if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const body = await req.json()
  const { formulario_id, paciente_id, enviado_via = 'link', dias_expiracao = 7 } = body

  if (!formulario_id) return NextResponse.json({ error: 'formulario_id é obrigatório' }, { status: 400 })
  if (!paciente_id)   return NextResponse.json({ error: 'paciente_id é obrigatório' }, { status: 400 })

  const expira_em = new Date()
  expira_em.setDate(expira_em.getDate() + dias_expiracao)

  const { data, error } = await supabase
    .from('formularios_envios')
    .insert({
      formulario_id,
      paciente_id,
      empresa_id:  usuario.empresa_id,
      enviado_via,
      expira_em:   expira_em.toISOString(),
      status:      'pendente',
    })
    .select(`
      id, token_unico, status, enviado_via, expira_em, created_at,
      formularios(nome),
      pacientes(nome, telefone, ddi)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const link = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/responder/${data.token_unico}`
  return NextResponse.json({ ...data, link }, { status: 201 })
}

// ─── GET /api/formularios/envios ──────────────────────────────────────────────
// Lista todos os envios da empresa
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user.id)
    .single()

  if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const { data, error } = await supabase
    .from('formularios_envios')
    .select(`
      id, token_unico, status, enviado_via, expira_em, respondido_em, created_at,
      formularios(id, nome, categoria),
      pacientes(id, nome, telefone, ddi)
    `)
    .eq('empresa_id', usuario.empresa_id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
