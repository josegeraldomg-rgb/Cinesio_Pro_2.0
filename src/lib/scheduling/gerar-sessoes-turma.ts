export interface SlotConfig {
  id: string
  dia_semana: number       // 0=Dom … 6=Sáb
  hora_inicio: string      // "08:00"
  duracao_minutos: number
}

export interface SessaoGerada {
  slot_id: string
  dataHora: Date
}

const MAX_SESSOES = 500

export function gerarSessoesTurma(
  slots: SlotConfig[],
  dataInicio: Date,
  horizonte = 90,          // dias à frente
  dataFim?: Date,
): SessaoGerada[] {
  const ativos = slots.filter(s => s.dia_semana >= 0 && s.dia_semana <= 6)
  if (ativos.length === 0) return []

  const limite = dataFim
    ? new Date(Math.min(dataFim.getTime(), addDays(dataInicio, horizonte).getTime()))
    : addDays(dataInicio, horizonte)

  const resultado: SessaoGerada[] = []
  const cursor = new Date(dataInicio)
  cursor.setHours(0, 0, 0, 0)

  while (cursor <= limite && resultado.length < MAX_SESSOES) {
    const diaSemana = cursor.getDay()

    for (const slot of ativos) {
      if (slot.dia_semana !== diaSemana) continue
      const [h, m] = slot.hora_inicio.split(':').map(Number)
      const dataHora = new Date(cursor)
      dataHora.setHours(h, m, 0, 0)
      resultado.push({ slot_id: slot.id, dataHora })
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return resultado
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  return r
}
