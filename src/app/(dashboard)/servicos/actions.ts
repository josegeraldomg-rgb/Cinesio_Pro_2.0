'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─────────────────────────────────────────────
// Helper: pega empresa_id do usuário autenticado
// ─────────────────────────────────────────────
async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' as const }

  const { data: me } = await supabase
    .from('usuarios')
    .select('empresa_id, perfil')
    .eq('id', user.id)
    .single()

  if (!me) return { error: 'Usuário não encontrado.' as const }
  return { supabase, empresa_id: me.empresa_id, perfil: me.perfil }
}

// ════════════════════════════════════════════════
//                    SERVIÇOS
// ════════════════════════════════════════════════
export async function salvarServicoAction(formData: FormData) {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { supabase, empresa_id } = ctx

  const id              = String(formData.get('id') ?? '') || null
  const nome            = String(formData.get('nome') ?? '').trim()
  const descricao       = String(formData.get('descricao') ?? '').trim() || null
  const categoria_id    = String(formData.get('categoria_id') ?? '') || null
  const tipo            = String(formData.get('tipo') ?? 'fisioterapia')
  const duracao_minutos = parseInt(String(formData.get('duracao_minutos') ?? '50'), 10)
  const valor           = parseFloat(String(formData.get('valor') ?? '0').replace(',', '.'))
  const cor             = String(formData.get('cor') ?? '#4A3AE8')
  const icone           = String(formData.get('icone') ?? '') || null
  const permite_online  = formData.get('permite_agendamento_online') === 'on'
  const ativo           = formData.get('ativo') !== 'off'

  if (!nome) return { error: 'Informe o nome do serviço.' }
  if (Number.isNaN(duracao_minutos) || duracao_minutos < 1) return { error: 'Duração inválida.' }
  if (Number.isNaN(valor) || valor < 0) return { error: 'Valor inválido.' }

  const payload = {
    empresa_id,
    nome,
    descricao,
    categoria_id,
    tipo,
    duracao_minutos,
    valor,
    cor,
    icone,
    permite_agendamento_online: permite_online,
    ativo,
  }

  let res
  if (id) {
    res = await supabase.from('servicos').update(payload).eq('id', id).select('id').single()
  } else {
    res = await supabase.from('servicos').insert(payload).select('id').single()
  }

  if (res.error) return { error: res.error.message }

  revalidatePath('/servicos')
  return { success: true, id: res.data?.id }
}

export async function excluirServicoAction(id: string) {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { supabase } = ctx

  const { error } = await supabase.from('servicos').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/servicos')
  return { success: true }
}

export async function toggleServicoAtivoAction(id: string, ativo: boolean) {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { supabase } = ctx

  const { error } = await supabase.from('servicos').update({ ativo }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/servicos')
  return { success: true }
}

// ════════════════════════════════════════════════
//                  CATEGORIAS
// ════════════════════════════════════════════════
export async function salvarCategoriaAction(formData: FormData) {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { supabase, empresa_id } = ctx

  const id        = String(formData.get('id') ?? '') || null
  const nome      = String(formData.get('nome') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim() || null
  const cor       = String(formData.get('cor') ?? '#4A3AE8')
  const icone     = String(formData.get('icone') ?? 'medical_services')
  const ordem     = parseInt(String(formData.get('ordem') ?? '0'), 10) || 0

  if (!nome) return { error: 'Informe o nome da categoria.' }

  const payload = { empresa_id, nome, descricao, cor, icone, ordem }

  let res
  if (id) {
    res = await supabase.from('categorias_servicos').update(payload).eq('id', id).select('id').single()
  } else {
    res = await supabase.from('categorias_servicos').insert(payload).select('id').single()
  }

  if (res.error) return { error: res.error.message }

  revalidatePath('/servicos')
  return { success: true, id: res.data?.id }
}

export async function excluirCategoriaAction(id: string) {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { supabase } = ctx

  const { error } = await supabase.from('categorias_servicos').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/servicos')
  return { success: true }
}

// ════════════════════════════════════════════════
//           VÍNCULO PROFISSIONAL ↔ SERVIÇO
// ════════════════════════════════════════════════
export async function setVinculosProfissionaisAction(
  servicoId: string,
  vinculos: { profissional_id: string; valor_override: number | null; duracao_override: number | null }[]
) {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { supabase } = ctx

  // Estratégia simples: apaga tudo e reinsere — mais previsível que diff
  const { error: delErr } = await supabase
    .from('servico_profissional')
    .delete()
    .eq('servico_id', servicoId)

  if (delErr) return { error: delErr.message }

  if (vinculos.length > 0) {
    const { error: insErr } = await supabase.from('servico_profissional').insert(
      vinculos.map(v => ({
        servico_id: servicoId,
        profissional_id: v.profissional_id,
        valor_override: v.valor_override,
        duracao_override: v.duracao_override,
      }))
    )
    if (insErr) return { error: insErr.message }
  }

  revalidatePath('/servicos')
  return { success: true }
}
