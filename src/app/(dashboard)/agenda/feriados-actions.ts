'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' as const }

  const admin = createAdminClient()
  const { data: me } = await admin
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!me) return { error: 'Empresa não encontrada.' as const }
  return { admin, empresa_id: me.empresa_id }
}

// ── Criar / editar feriado ──────────────────────────────────────
export async function salvarFeriadoAction(formData: FormData) {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  const id         = String(formData.get('id') ?? '') || null
  const nome       = String(formData.get('nome') ?? '').trim()
  const data       = String(formData.get('data') ?? '').trim()
  const recorrente = formData.get('recorrente') === 'true'

  if (!nome) return { error: 'Informe o nome do feriado.' }
  if (!data) return { error: 'Informe a data do feriado.' }

  const payload = { empresa_id, nome, data, recorrente }

  let res
  if (id) {
    res = await admin.from('feriados').update(payload).eq('id', id).select('id').single()
  } else {
    res = await admin.from('feriados').insert(payload).select('id').single()
  }

  if (res.error) {
    if (res.error.message.includes('unique') || res.error.code === '23505') {
      return { error: 'Já existe um feriado cadastrado nessa data.' }
    }
    return { error: res.error.message }
  }

  revalidatePath('/agenda')
  return { success: true }
}

// ── Excluir feriado ─────────────────────────────────────────────
export async function excluirFeriadoAction(id: string) {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin } = ctx

  const { error } = await admin.from('feriados').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/agenda')
  return { success: true }
}

// ── Importar feriados nacionais via BrasilAPI ───────────────────
export async function importarFeriadosBrasilAPIAction(ano: number) {
  const ctx = await getContext()
  if ('error' in ctx) return { error: ctx.error }
  const { admin, empresa_id } = ctx

  // Fetch da BrasilAPI
  let dados: { date: string; name: string; type: string }[]
  try {
    const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`BrasilAPI retornou ${res.status}`)
    dados = await res.json()
  } catch (e: any) {
    return { error: `Não foi possível conectar à BrasilAPI: ${e.message ?? 'erro desconhecido'}` }
  }

  if (!Array.isArray(dados) || dados.length === 0) {
    return { error: 'BrasilAPI não retornou feriados para este ano.' }
  }

  // Busca datas já cadastradas para a empresa neste ano (evita duplicatas)
  const { data: existentes } = await admin
    .from('feriados')
    .select('data')
    .eq('empresa_id', empresa_id)
    .gte('data', `${ano}-01-01`)
    .lte('data', `${ano}-12-31`)

  const datasExistentes = new Set((existentes ?? []).map(f => f.data))

  const novos = dados
    .filter(d => d.date && !datasExistentes.has(d.date))
    .map(d => ({
      empresa_id,
      nome: d.name,
      data: d.date,
      recorrente: true,  // feriados nacionais repetem todo ano
    }))

  if (novos.length === 0) {
    return {
      success: true,
      importados: 0,
      msg: `Todos os feriados nacionais de ${ano} já estão cadastrados.`,
    }
  }

  const { error } = await admin.from('feriados').insert(novos)
  if (error) return { error: error.message }

  revalidatePath('/agenda')
  return {
    success: true,
    importados: novos.length,
    msg: `${novos.length} feriado${novos.length !== 1 ? 's' : ''} importado${novos.length !== 1 ? 's' : ''} com sucesso!`,
  }
}

// ── Criar emenda (folga extra adjacente ao feriado) ─────────────
// Cria outra entrada em feriados para o dia de emenda.
export async function criarEmendaAction(data: string, nomeFeriado: string) {
  const fd = new FormData()
  fd.set('nome', `Emenda — ${nomeFeriado}`)
  fd.set('data', data)
  fd.set('recorrente', 'false')
  return salvarFeriadoAction(fd)
}
