// CinesioPro — modelo de Perfis & Permissões
// =================================================================
// 5 perfis padrão · 17 módulos · 4 ações (CRUD) por módulo
// Os perfis vivem em memória aqui hoje. Quando a tabela `perfis`
// existir no Supabase, basta substituir PERFIS_PADRAO por um fetch.

export type Acao = 'visualizar' | 'criar' | 'editar' | 'excluir'

export interface ModuloDef {
  id: string
  nome: string
  icon: string          // Material Symbol name
  descricao?: string
  devOnly?: boolean     // só aparece no editor do perfil Desenvolvedor
}

export interface PermissoesModulo {
  visualizar: boolean
  criar: boolean
  editar: boolean
  excluir: boolean
}

export interface PerfilDef {
  id: string
  nome: string
  descricao: string
  padrao: boolean       // perfil padrão do sistema (não pode ser excluído)
  cor: string           // cor de destaque (hex)
  icon: string          // Material Symbol
  permissoes: Record<string, PermissoesModulo>
}

// ── Módulos do sistema ──
export const MODULOS: ModuloDef[] = [
  { id: 'painel',         nome: 'Painel',          icon: 'dashboard' },
  { id: 'agenda',         nome: 'Agenda',          icon: 'calendar_month' },
  { id: 'ausencias',      nome: 'Ausências',       icon: 'event_busy' },
  { id: 'pacientes',      nome: 'Pacientes',       icon: 'groups' },
  { id: 'turmas',         nome: 'Turmas',          icon: 'sports_gymnastics' },
  { id: 'servicos',       nome: 'Serviços',        icon: 'medical_services' },
  { id: 'prontuario',     nome: 'Prontuário',      icon: 'description' },
  { id: 'avaliacoes',     nome: 'Avaliações',      icon: 'fact_check' },
  { id: 'financeiro',     nome: 'Financeiro',      icon: 'payments' },
  { id: 'comissoes',      nome: 'Comissões',       icon: 'request_quote' },
  { id: 'relatorios',     nome: 'Relatórios',      icon: 'analytics' },
  { id: 'whatsapp',       nome: 'WhatsApp',        icon: 'chat' },
  { id: 'portal',         nome: 'Portal Paciente', icon: 'favorite' },
  { id: 'configuracoes',  nome: 'Configurações',   icon: 'settings' },
  { id: 'usuarios',       nome: 'Usuários',        icon: 'manage_accounts' },
  { id: 'logs',           nome: 'Logs',            icon: 'history' },
  { id: 'empresas',       nome: 'Empresas (SaaS)', icon: 'business', devOnly: true },
]

// ── Helpers para gerar matrizes de permissões ──
function full(): Record<string, PermissoesModulo> {
  return Object.fromEntries(
    MODULOS.map(m => [m.id, { visualizar: true, criar: true, editar: true, excluir: true }])
  )
}

function none(): Record<string, PermissoesModulo> {
  return Object.fromEntries(
    MODULOS.map(m => [m.id, { visualizar: false, criar: false, editar: false, excluir: false }])
  )
}

function mix(on: Record<string, Partial<PermissoesModulo>>): Record<string, PermissoesModulo> {
  const base = none()
  for (const [k, v] of Object.entries(on)) {
    base[k] = { visualizar: false, criar: false, editar: false, excluir: false, ...v }
  }
  return base
}

// ── 5 Perfis Padrão ──
export const PERFIS_PADRAO: PerfilDef[] = [
  {
    id: 'dev',
    nome: 'Desenvolvedor',
    descricao: 'Acesso total ao sistema e gestão de empresas (SaaS Owner)',
    padrao: true,
    cor: '#8E44AD',
    icon: 'shield_person',
    permissoes: full(),
  },
  {
    id: 'admin',
    nome: 'Administrador',
    descricao: 'Acesso total ao sistema da própria empresa',
    padrao: true,
    cor: '#4A3AE8',
    icon: 'admin_panel_settings',
    permissoes: {
      ...full(),
      empresas: { visualizar: false, criar: false, editar: false, excluir: false },
    },
  },
  {
    id: 'profissional',
    nome: 'Profissional',
    descricao: 'Agenda própria, prontuário, avaliações e comissões',
    padrao: true,
    cor: '#3498DB',
    icon: 'medical_information',
    permissoes: mix({
      painel:     { visualizar: true },
      agenda:     { visualizar: true, criar: true, editar: true },
      pacientes:  { visualizar: true, editar: true },
      prontuario: { visualizar: true, criar: true, editar: true },
      avaliacoes: { visualizar: true, criar: true, editar: true },
      financeiro: { visualizar: true },
      comissoes:  { visualizar: true },
      whatsapp:   { visualizar: true, criar: true },
      portal:     { visualizar: true },
    }),
  },
  {
    id: 'recepcionista',
    nome: 'Recepcionista',
    descricao: 'Agendamentos, cadastro de pacientes e pagamentos',
    padrao: true,
    cor: '#27AE60',
    icon: 'support_agent',
    permissoes: mix({
      painel:     { visualizar: true },
      agenda:     { visualizar: true, criar: true, editar: true, excluir: true },
      ausencias:  { visualizar: true, criar: true },
      pacientes:  { visualizar: true, criar: true, editar: true },
      financeiro: { visualizar: true, criar: true },
      whatsapp:   { visualizar: true, criar: true },
    }),
  },
  {
    id: 'paciente',
    nome: 'Paciente',
    descricao: 'Apenas o portal do paciente (próprio)',
    padrao: true,
    cor: '#E67E22',
    icon: 'person',
    permissoes: mix({
      portal: { visualizar: true },
    }),
  },
]

// ── Utilidades ──
export const ACOES: Acao[] = ['visualizar', 'criar', 'editar', 'excluir']

export const ACOES_LABEL: Record<Acao, string> = {
  visualizar: 'Visualizar',
  criar: 'Criar',
  editar: 'Editar',
  excluir: 'Excluir',
}

export function countAtivas(perfil: PerfilDef): number {
  let total = 0
  for (const perms of Object.values(perfil.permissoes)) {
    if (perms.visualizar) total++
    if (perms.criar)      total++
    if (perms.editar)     total++
    if (perms.excluir)    total++
  }
  return total
}

export function perfilNomePor(id: string): string {
  return PERFIS_PADRAO.find(p => p.id === id)?.nome ?? id
}
