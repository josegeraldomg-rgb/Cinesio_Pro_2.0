'use server'

import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'exercicios'

export async function uploadMidiaExercicio(
  exercicioId: string,
  tipo: 'imagem' | 'video',
  formData: FormData,
): Promise<{ url: string } | { error: string }> {
  const file = formData.get('file') as File | null
  if (!file) return { error: 'Nenhum arquivo enviado.' }

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${tipo}/${exercicioId}.${ext}`

  const admin = createAdminClient()
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) return { error: error.message }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl }
}
