export interface ComissaoConfig {
  id: string
  profissional_id: string | null
  servico_id: string | null
  percentual: number
  ativo: boolean
}

/** Hierarquia: Profissional+Serviço → Profissional → Global clínica → 0 */
export function calcularComissao(
  comissoes: ComissaoConfig[],
  profissional_id: string | null,
  servico_id: string | null,
  valor_base: number,
): { percentual: number; valor: number } {
  const ativas = comissoes.filter(c => c.ativo)

  const regra =
    ativas.find(c => c.profissional_id === profissional_id && c.servico_id === servico_id)
    ?? ativas.find(c => c.profissional_id === profissional_id && !c.servico_id)
    ?? ativas.find(c => !c.profissional_id && !c.servico_id)

  if (!regra) return { percentual: 0, valor: 0 }
  const valor = parseFloat(((valor_base * regra.percentual) / 100).toFixed(2))
  return { percentual: regra.percentual, valor }
}
