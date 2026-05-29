'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const BUCKET = 'avatars'
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function extFromMime(mime: string) {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png':  'png',
    'image/webp': 'webp',
    'image/gif':  'gif',
  }
  return map[mime] ?? 'jpg'
}

// ─── Upload da foto do próprio usuário logado ─────────────────────────────────
export async function uploadAvatarUsuarioAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'Nenhum arquivo enviado.' }
  if (!ALLOWED.includes(file.type)) return { error: 'Formato inválido. Use JPEG, PNG ou WebP.' }
  if (file.size > MAX_SIZE) return { error: 'Arquivo muito grande (máx 5 MB).' }

  const path = `usuarios/${user.id}.${extFromMime(file.type)}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  // Adiciona cache-bust para forçar recarga da imagem
  const urlComCache = `${publicUrl}?t=${Date.now()}`

  const admin = createAdminClient()
  await Promise.all([
    admin.from('usuarios').update({ avatar_url: urlComCache }).eq('id', user.id),
    admin.from('profissionais').update({ avatar_url: urlComCache }).eq('usuario_id', user.id),
  ])

  revalidatePath('/', 'layout')
  revalidatePath('/equipe')
  return { success: true, url: urlComCache }
}

// ─── Upload da foto de um paciente (admin/profissional) ───────────────────────
export async function uploadFotoPacienteAction(pacienteId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'Nenhum arquivo enviado.' }
  if (!ALLOWED.includes(file.type)) return { error: 'Formato inválido. Use JPEG, PNG ou WebP.' }
  if (file.size > MAX_SIZE) return { error: 'Arquivo muito grande (máx 5 MB).' }

  const path = `pacientes/${pacienteId}.${extFromMime(file.type)}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const urlComCache = `${publicUrl}?t=${Date.now()}`

  const admin = createAdminClient()
  await admin.from('pacientes').update({ foto_url: urlComCache }).eq('id', pacienteId)

  revalidatePath('/pacientes')
  revalidatePath(`/pacientes/${pacienteId}`)
  return { success: true, url: urlComCache }
}

// ─── Upload do avatar de um profissional (por admin) ──────────────────────────
export async function uploadAvatarProfissionalAction(profissionalId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'Nenhum arquivo enviado.' }
  if (!ALLOWED.includes(file.type)) return { error: 'Formato inválido. Use JPEG, PNG ou WebP.' }
  if (file.size > MAX_SIZE) return { error: 'Arquivo muito grande (máx 5 MB).' }

  const path = `profissionais/${profissionalId}.${extFromMime(file.type)}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const urlComCache = `${publicUrl}?t=${Date.now()}`

  const admin = createAdminClient()
  await admin.from('profissionais').update({ avatar_url: urlComCache }).eq('id', profissionalId)
  // Sincroniza no usuário vinculado, se houver
  const { data: prof } = await admin
    .from('profissionais')
    .select('usuario_id')
    .eq('id', profissionalId)
    .maybeSingle()
  if (prof?.usuario_id) {
    await admin.from('usuarios').update({ avatar_url: urlComCache }).eq('id', prof.usuario_id)
  }

  revalidatePath('/equipe')
  revalidatePath('/', 'layout')
  return { success: true, url: urlComCache }
}
