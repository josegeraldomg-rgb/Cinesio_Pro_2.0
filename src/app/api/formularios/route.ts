import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─── GET /api/formularios ─────────────────────────────────────────────────────
// Retorna os formulários da empresa autenticada
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
    .from('formularios')
    .select('id, nome, descricao, categoria, status, campos_json, eh_biblioteca, created_at, updated_at')
    .eq('empresa_id', usuario.empresa_id)
    .neq('status', 'arquivado')
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ─── POST /api/formularios ────────────────────────────────────────────────────
// Cria ou duplica um formulário
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
  const { nome, descricao, categoria, campos_json, status = 'rascunho' } = body

  if (!nome?.trim()) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  if (!categoria)    return NextResponse.json({ error: 'Categoria é obrigatória' }, { status: 400 })

  const { data, error } = await supabase
    .from('formularios')
    .insert({
      empresa_id:    usuario.empresa_id,
      nome:          nome.trim(),
      descricao:     descricao?.trim() ?? null,
      categoria,
      campos_json:   campos_json ?? [],
      status,
      eh_biblioteca: false,
      criado_por:    user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// ─── PATCH /api/formularios ───────────────────────────────────────────────────
// Atualiza um formulário existente
export async function PATCH(req: NextRequest) {
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
  const { id, nome, descricao, categoria, campos_json, status } = body

  if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (nome       !== undefined) updates.nome        = nome.trim()
  if (descricao  !== undefined) updates.descricao   = descricao?.trim() ?? null
  if (categoria  !== undefined) updates.categoria   = categoria
  if (campos_json !== undefined) updates.campos_json = campos_json
  if (status     !== undefined) updates.status      = status

  const { data, error } = await supabase
    .from('formularios')
    .update(updates)
    .eq('id', id)
    .eq('empresa_id', usuario.empresa_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ─── DELETE /api/formularios ──────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user.id)
    .single()

  if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

  // Soft delete: muda status para arquivado
  const { error } = await supabase
    .from('formularios')
    .update({ status: 'arquivado' })
    .eq('id', id)
    .eq('empresa_id', usuario.empresa_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
