/** Gerador de datas para séries recorrentes — função pura, sem I/O. */

export interface RecorrenciaConfig {
  frequencia: 'semanal' | 'quinzenal' | 'mensal' | 'personalizado'
  /** Intervalo em dias — obrigatório apenas quando frequencia = 'personalizado' */
  intervalo_dias?: number
  tipo_fim: 'sessoes' | 'data'
  /** Número total de sessões — obrigatório quando tipo_fim = 'sessoes' */
  total_sessoes?: number
  /** Data de encerramento "YYYY-MM-DD" — obrigatória quando tipo_fim = 'data' */
  data_fim?: string
}

const MAX_OCORRENCIAS = 104  // ~2 anos semanais — teto de segurança

/**
 * Gera a lista de datas (sem hora) de uma série recorrente.
 * A primeira data retornada é sempre `dataInicio`.
 */
export function gerarDatasOcorrencias(
  dataInicio: Date,
  config: RecorrenciaConfig,
): Date[] {
  const datas: Date[] = []

  // Clone imutável para não mutar o parâmetro
  let atual = new Date(dataInicio)
  atual.setHours(0, 0, 0, 0)

  const limite: Date | null =
    config.tipo_fim === 'data' && config.data_fim
      ? (() => { const d = new Date(config.data_fim + 'T00:00:00'); d.setHours(0,0,0,0); return d })()
      : null

  const maxSessoes =
    config.tipo_fim === 'sessoes'
      ? (config.total_sessoes ?? 1)
      : MAX_OCORRENCIAS

  while (datas.length < maxSessoes && datas.length < MAX_OCORRENCIAS) {
    // Verifica limite por data
    if (limite && atual > limite) break

    datas.push(new Date(atual))

    // Avança para a próxima ocorrência
    switch (config.frequencia) {
      case 'semanal':
        atual.setDate(atual.getDate() + 7)
        break
      case 'quinzenal':
        atual.setDate(atual.getDate() + 14)
        break
      case 'mensal':
        atual.setMonth(atual.getMonth() + 1)
        break
      case 'personalizado': {
        const dias = config.intervalo_dias ?? 7
        atual.setDate(atual.getDate() + dias)
        break
      }
    }
  }

  return datas
}

/** Formata uma data para "YYYY-MM-DD" sem depender de TZ do ambiente. */
export function toDateStr(d: Date): string {
  const ano = d.getFullYear()
  const mes = (d.getMonth() + 1).toString().padStart(2, '0')
  const dia = d.getDate().toString().padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/** Label amigável para a frequência. */
export function labelFrequencia(f: RecorrenciaConfig['frequencia'], intervaloDias?: number): string {
  switch (f) {
    case 'semanal':      return 'toda semana'
    case 'quinzenal':    return 'a cada 2 semanas'
    case 'mensal':       return 'todo mês'
    case 'personalizado': return `a cada ${intervaloDias ?? '?'} dias`
  }
}
