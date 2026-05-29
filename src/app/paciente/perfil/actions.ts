'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

interface DadosPerfil {
  nome: string
  email: string
  telefone: string
  ddi: string
  data_nascimento: string
  cpf: string
  foto_url: string | null
  cep: string
  rua: string
  numero: string
  bairro: string
  cidade: string
  estado: string
}

/**
 * Salva as alterações de perfil feitas pelo paciente.
 * Valida autenticação e titularidade antes de qualquer UPDATE.
 */
export async function salvarPerfilAction(pacienteId: string, dados: DadosPerfil) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()

  // Confirma que o paciente realmente pertence ao usuário logado
  const { data: paciente } = await admin
    .from('pacientes')
    .select('id')
    .eq('id', pacienteId)
    .eq('usuario_id', user.id)
    .maybeSingle()

  if (!paciente) return { error: 'Acesso negado.' }

  const { error } = await admin.from('pacientes').update({
    nome:            dados.nome.trim(),
    email:           dados.email.trim().toLowerCase() || null,
    telefone:        dados.telefone.replace(/\D/g, '') || null,
    ddi:             dados.ddi || '55',
    data_nascimento: dados.data_nascimento || null,
    endereco: {
      cep:    dados.cep.replace(/\D/g, '') || null,
      rua:    dados.rua.trim() || null,
      numero: dados.numero.trim() || null,
      bairro: dados.bairro.trim() || null,
      cidade: dados.cidade.trim() || null,
      estado: dados.estado.trim().toUpperCase() || null,
    },
    updated_at: new Date().toISOString(),
  }).eq('id', pacienteId)

  if (error) return { error: error.message }

  // Sincroniza nome no registro de usuário também
  await admin.from('usuarios').update({
    nome:       dados.nome.trim(),
    email:      dados.email.trim().toLowerCase() || null,
    updated_at: new Date().toISOString(),
  }).eq('id', user.id)

  revalidatePath('/paciente/perfil')
  revalidatePath('/paciente/home')
  return { success: true }
}
