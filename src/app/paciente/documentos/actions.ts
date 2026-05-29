'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const BUCKET = 'exames-pacientes'

// ─── Helper de contexto ───────────────────────────────────────────────────────
async function getPatientContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()
  const [{ data: usuario }, { data: paciente }] = await Promise.all([
    admin.from('usuarios').select('empresa_id').eq('id', user.id).maybeSingle(),
    admin.from('pacientes')
      .select('id, nome, cpf, data_nascimento')
      .eq('usuario_id', user.id)
      .maybeSingle(),
  ])

  if (!usuario?.empresa_id) return { error: 'Empresa não identificada.' }
  if (!paciente) return { error: 'Paciente não encontrado.' }

  return { admin, empresa_id: usuario.empresa_id, paciente, paciente_id: paciente.id }
}

// ─── Tipos exportados ─────────────────────────────────────────────────────────
export interface FormularioPendente {
  token: string
  nome: string
  categoria: string
  descricao: string | null
  expira_em: string | null
  criado_em: string
}

export interface FormularioRespondido {
  nome: string
  categoria: string
  respondido_em: string
}

export interface ExamePaciente {
  id: string
  nome_arquivo: string
  tipo: string
  tamanho_bytes: number | null
  mime_type: string | null
  observacoes: string | null
  created_at: string
}

export interface SessaoRealizada {
  id: string
  data_hora: string
  servico_nome: string | null
  profissional_nome: string | null
  duracao_minutos: number
}

export interface DadosDocumentosPage {
  formulariosPendentes: FormularioPendente[]
  formulariosRespondidos: FormularioRespondido[]
  exames: ExamePaciente[]
  sessoes: SessaoRealizada[]
  paciente: { nome: string; cpf: string | null; data_nascimento: string | null }
  clinicaNome: string
  clinicaEndereco: string | null
  clinicaCnpj: string | null
  error?: string
}

// ════════════════════════════════════════════════════════════════
//  BUSCAR TODOS OS DADOS (page.tsx)
// ════════════════════════════════════════════════════════════════
export async function buscarDadosDocumentosAction(): Promise<DadosDocumentosPage> {
  const ctx = await getPatientContext()
  const vazio: DadosDocumentosPage = {
    formulariosPendentes: [], formulariosRespondidos: [],
    exames: [], sessoes: [],
    paciente: { nome: '', cpf: null, data_nascimento: null },
    clinicaNome: 'CinesioPro', clinicaEndereco: null, clinicaCnpj: null,
  }

  if ('error' in ctx) return { ...vazio, error: ctx.error }
  const { admin, empresa_id, paciente_id, paciente } = ctx

  const [
    { data: envios },
    { data: respostas },
    { data: exames },
    { data: sessoes },
    { data: empresa },
  ] = await Promise.all([
    // Formulários pendentes do paciente
    admin
      .from('formularios_envios')
      .select(`
        token_unico, expira_em, created_at,
        formularios ( nome, categoria, descricao )
      `)
      .eq('paciente_id', paciente_id)
      .eq('status', 'pendente')
      .order('created_at', { ascending: false }),

    // Formulários já respondidos (últimos 20)
    admin
      .from('formularios_respostas')
      .select(`
        created_at,
        formularios ( nome, categoria )
      `)
      .eq('paciente_id', paciente_id)
      .order('created_at', { ascending: false })
      .limit(20),

    // Exames enviados pelo paciente
    admin
      .from('exames_paciente')
      .select('id, nome_arquivo, tipo, tamanho_bytes, mime_type, observacoes, created_at')
      .eq('paciente_id', paciente_id)
      .order('created_at', { ascending: false }),

    // Sessões realizadas (últimos 6 meses) para declarações
    admin
      .from('agendamentos')
      .select(`
        id, data_hora, duracao_minutos,
        servicos ( nome ),
        profissionais ( nome )
      `)
      .eq('paciente_id', paciente_id)
      .eq('status', 'realizado')
      .gte('data_hora', new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString())
      .order('data_hora', { ascending: false }),

    // Dados da clínica para declarações
    admin
      .from('empresas')
      .select('nome, cnpj, endereco')
      .eq('id', empresa_id)
      .single(),
  ])

  const formulariosPendentes: FormularioPendente[] = (envios ?? []).map((e) => {
    const f = (e.formularios as any) ?? {}
    return {
      token: e.token_unico,
      nome: f.nome ?? 'Formulário',
      categoria: f.categoria ?? 'anamnese',
      descricao: f.descricao ?? null,
      expira_em: e.expira_em,
      criado_em: e.created_at,
    }
  })

  const formulariosRespondidos: FormularioRespondido[] = (respostas ?? []).map((r) => {
    const f = (r.formularios as any) ?? {}
    return {
      nome: f.nome ?? 'Formulário',
      categoria: f.categoria ?? 'anamnese',
      respondido_em: r.created_at,
    }
  })

  const examesLista: ExamePaciente[] = (exames ?? []).map((e) => ({
    id: e.id,
    nome_arquivo: e.nome_arquivo,
    tipo: e.tipo,
    tamanho_bytes: e.tamanho_bytes,
    mime_type: e.mime_type,
    observacoes: e.observacoes,
    created_at: e.created_at,
  }))

  const sessoesLista: SessaoRealizada[] = (sessoes ?? []).map((s) => ({
    id: s.id,
    data_hora: s.data_hora,
    servico_nome: (s.servicos as any)?.nome ?? null,
    profissional_nome: (s.profissionais as any)?.nome ?? null,
    duracao_minutos: s.duracao_minutos,
  }))

  const endereco = empresa?.endereco as any
  const endStr = endereco
    ? [endereco.rua, endereco.numero, endereco.bairro, endereco.cidade, endereco.estado]
        .filter(Boolean).join(', ')
    : null

  return {
    formulariosPendentes,
    formulariosRespondidos,
    exames: examesLista,
    sessoes: sessoesLista,
    paciente: {
      nome: paciente.nome,
      cpf: paciente.cpf,
      data_nascimento: paciente.data_nascimento,
    },
    clinicaNome: empresa?.nome ?? 'CinesioPro',
    clinicaEndereco: endStr,
    clinicaCnpj: empresa?.cnpj ?? null,
  }
}

// ════════════════════════════════════════════════════════════════
//  UPLOAD DE EXAME
// ════════════════════════════════════════════════════════════════
export async function uploadExameAction(
  formData: FormData,
): Promise<{ success: true; id: string } | { error: string }> {
  const ctx = await getPatientContext()
  if ('error' in ctx) return { error: ctx.error ?? 'Erro.' }
  const { admin, empresa_id, paciente_id } = ctx

  const file = formData.get('file') as File | null
  const tipo = (formData.get('tipo') as string) || 'outro'
  const observacoes = (formData.get('observacoes') as string)?.trim() || null

  if (!file || file.size === 0) return { error: 'Nenhum arquivo selecionado.' }
  if (file.size > 10 * 1024 * 1024) return { error: 'Arquivo muito grande. Limite: 10MB.' }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const safeName = file.name.replace(/[^\w.-]/g, '_').slice(0, 80)
  const storagePath = `${empresa_id}/${paciente_id}/${Date.now()}_${safeName}`

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) return { error: `Erro no upload: ${uploadError.message}` }

  const { data: row, error: dbError } = await admin
    .from('exames_paciente')
    .insert({
      empresa_id,
      paciente_id,
      nome_arquivo: file.name,
      tipo,
      storage_path: storagePath,
      tamanho_bytes: file.size,
      mime_type: file.type,
      observacoes,
    })
    .select('id')
    .single()

  if (dbError) {
    // Limpa o arquivo do storage se o DB falhou
    await admin.storage.from(BUCKET).remove([storagePath])
    return { error: dbError.message }
  }

  revalidatePath('/paciente/documentos')
  return { success: true, id: row.id }
}

// ════════════════════════════════════════════════════════════════
//  GERAR URL ASSINADA PARA VISUALIZAR EXAME
// ════════════════════════════════════════════════════════════════
export async function gerarUrlExameAction(
  id: string,
): Promise<{ url: string } | { error: string }> {
  const ctx = await getPatientContext()
  if ('error' in ctx) return { error: ctx.error ?? 'Erro.' }
  const { admin, paciente_id } = ctx

  const { data: exame } = await admin
    .from('exames_paciente')
    .select('storage_path')
    .eq('id', id)
    .eq('paciente_id', paciente_id) // garante titularidade
    .maybeSingle()

  if (!exame) return { error: 'Exame não encontrado.' }

  const { data: signed, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(exame.storage_path, 3600) // expira em 1h

  if (error || !signed?.signedUrl) return { error: 'Não foi possível gerar o link.' }
  return { url: signed.signedUrl }
}

// ════════════════════════════════════════════════════════════════
//  EXCLUIR EXAME
// ════════════════════════════════════════════════════════════════
export async function excluirExameAction(
  id: string,
): Promise<{ success: true } | { error: string }> {
  const ctx = await getPatientContext()
  if ('error' in ctx) return { error: ctx.error ?? 'Erro.' }
  const { admin, paciente_id } = ctx

  const { data: exame } = await admin
    .from('exames_paciente')
    .select('storage_path')
    .eq('id', id)
    .eq('paciente_id', paciente_id)
    .maybeSingle()

  if (!exame) return { error: 'Exame não encontrado.' }

  // Remove do Storage primeiro
  await admin.storage.from(BUCKET).remove([exame.storage_path])

  // Remove do banco
  const { error } = await admin.from('exames_paciente').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/paciente/documentos')
  return { success: true }
}
