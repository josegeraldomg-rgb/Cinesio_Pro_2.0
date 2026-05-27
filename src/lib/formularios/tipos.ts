export type CampoTipo =
  | 'secao'
  | 'instrucao'
  | 'texto_curto'
  | 'texto_longo'
  | 'selecao_unica'
  | 'selecao_multipla'
  | 'escala_numerica'
  | 'data'
  | 'assinatura'
  | 'mapa_dor'

export interface CampoFormulario {
  id: string
  tipo: CampoTipo
  label: string
  descricao?: string
  obrigatorio?: boolean
  opcoes?: string[]
  min?: number
  max?: number
  rotulos?: { min: string; max: string }
}

export interface FormularioBiblioteca {
  id: string
  nome: string
  descricao: string
  categoria: string
  campos: CampoFormulario[]
  referencia?: string
  pontuavel?: boolean
  tags?: string[]
}

export interface CategoriaInfo {
  label: string
  cor: string
  corBg: string
  corTexto: string
  icone: string
}

export const CATEGORIAS: Record<string, CategoriaInfo> = {
  anamnese:       { label: 'Anamnese e Avaliação', cor: '#3b82f6', corBg: '#eff6ff', corTexto: '#1d4ed8', icone: 'assignment_ind' },
  escalas_dor:    { label: 'Escalas de Dor',        cor: '#ef4444', corBg: '#fef2f2', corTexto: '#b91c1c', icone: 'sentiment_very_dissatisfied' },
  funcionalidade: { label: 'Funcionalidade e QV',   cor: '#22c55e', corBg: '#f0fdf4', corTexto: '#15803d', icone: 'accessibility_new' },
  respiratorio:   { label: 'Respiratório',           cor: '#0ea5e9', corBg: '#f0f9ff', corTexto: '#0369a1', icone: 'air' },
  neurologia:     { label: 'Neurologia',             cor: '#a855f7', corBg: '#faf5ff', corTexto: '#7e22ce', icone: 'neurology' },
  pilates:        { label: 'Pilates e Exercício',    cor: '#ec4899', corBg: '#fdf2f8', corTexto: '#be185d', icone: 'self_improvement' },
  uroginecologia: { label: 'Uroginecologia',         cor: '#f43f5e', corBg: '#fff1f2', corTexto: '#be123c', icone: 'health_and_beauty' },
  saude_mental:   { label: 'Saúde Mental',           cor: '#8b5cf6', corBg: '#f5f3ff', corTexto: '#6d28d9', icone: 'psychology' },
  retorno_alta:   { label: 'Alta e Retorno',         cor: '#10b981', corBg: '#ecfdf5', corTexto: '#065f46', icone: 'flag' },
  consentimentos: { label: 'Consentimentos',         cor: '#64748b', corBg: '#f8fafc', corTexto: '#334155', icone: 'gavel' },
}
