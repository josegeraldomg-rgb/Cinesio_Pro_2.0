'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

/**
 * Paciente confirma presença na próxima consulta.
 * Valida que o agendamento realmente pertence ao paciente antes de atualizar.
 */
export async function confirmarPresencaAction(agendamentoId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()

  // Busca o paciente vinculado ao usuário
  const { data: paciente } = await admin
    .from('pacientes')
    .select('id')
    .eq('usuario_id', user.id)
    .maybeSingle()

  if (!paciente) return { error: 'Paciente não encontrado.' }

  // Garante que o agendamento pertence a esse paciente
  const { data: agendamento } = await admin
    .from('agendamentos')
    .select('id, status')
    .eq('id', agendamentoId)
    .eq('paciente_id', paciente.id)
    .maybeSingle()

  if (!agendamento) return { error: 'Agendamento não encontrado.' }
  if (agendamento.status === 'confirmado') return { success: true } // já confirmado

  const { error } = await admin
    .from('agendamentos')
    .update({ status: 'confirmado', updated_at: new Date().toISOString() })
    .eq('id', agendamentoId)

  if (error) return { error: error.message }

  revalidatePath('/paciente/home')
  return { success: true }
}
