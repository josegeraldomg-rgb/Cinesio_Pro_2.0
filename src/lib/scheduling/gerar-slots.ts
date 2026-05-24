// ─────────────────────────────────────────────────────────────────────────────
// CinesioPro · Scheduling Engine
//
// Função pura que gera slots de horários para um profissional numa data.
//
// REGRAS:
//   · Lê os turnos do profissional para aquele dia da semana
//   · Lê o "Intervalo entre slots" do turno (granularidade — ex: 30min → slots
//     a cada 30 minutos: 08:00, 08:30, 09:00…)
//   · Se o intervalo for 0/ausente, usa a duração do serviço como passo
//   · Para CADA slot candidato calcula se há conflito com agendamentos
//     existentes do profissional naquele dia
//   · NÃO descarta slots ocupados — devolve com `status: 'ocupado'`
//     para que a UI mostre bloqueado (a recepção pode forçar encaixe)
//   · Se a data cai dentro de uma ausência/feriado, retorna lista vazia +
//     `bloqueado_por_ausencia` no caller
// ─────────────────────────────────────────────────────────────────────────────

export interface Turno {
  hora_inicio: string         // "HH:MM" ou "HH:MM:SS"
  hora_fim: string
  intervalo_minutos?: number  // granularidade do slot (a cada N minutos)
  ativo?: boolean
}

export interface AgendamentoExistente {
  data_hora: string           // ISO completo
  duracao_minutos: number
  status?: string             // 'cancelado' / 'faltou' liberam o slot
}

export interface Ausencia {
  data_inicio: string         // "YYYY-MM-DD"
  data_fim: string            // "YYYY-MM-DD"
}

export interface Slot {
  inicio: string                       // ISO completo
  fim: string                          // ISO completo
  hhmm: string                         // "HH:MM" para exibição
  status: 'disponivel' | 'ocupado'     // ocupado pode ser usado p/ encaixe forçado
}

export interface GerarSlotsInput {
  data: string
  duracaoMinutos: number
  turnos: Turno[]
  agendamentos?: AgendamentoExistente[]
  ausencias?: Ausencia[]
}

// ── helpers ──
function hhmmParaMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

function minutosParaHHMM(min: number): string {
  const h = Math.floor(min / 60).toString().padStart(2, '0')
  const m = (min % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function dataHoraISO(data: string, hhmm: string): string {
  return `${data}T${hhmm.length === 5 ? hhmm + ':00' : hhmm}`
}

function dentroDaAusencia(data: string, ausencias: Ausencia[]): boolean {
  return ausencias.some(a => a.data_inicio <= data && data <= a.data_fim)
}

const STATUS_LIBERAM_SLOT = new Set(['cancelado', 'faltou'])

// ── função principal ──
export function gerarSlots(input: GerarSlotsInput): Slot[] {
  const { data, duracaoMinutos, turnos, agendamentos = [], ausencias = [] } = input

  if (duracaoMinutos < 1)       return []
  if (turnos.length === 0)      return []
  if (dentroDaAusencia(data, ausencias)) return []

  // Pré-computa intervalos ocupados (em minutos a partir das 00:00)
  const ocupados: { ini: number; fim: number }[] = []
  for (const a of agendamentos) {
    if (a.status && STATUS_LIBERAM_SLOT.has(a.status)) continue
    if (!a.data_hora.startsWith(data)) continue
    const hhmm = a.data_hora.slice(11, 16)
    const ini  = hhmmParaMinutos(hhmm)
    ocupados.push({ ini, fim: ini + a.duracao_minutos })
  }

  const colide = (ini: number, fim: number) =>
    ocupados.some(o => ini < o.fim && fim > o.ini)

  const slots: Slot[] = []
  const vistos = new Set<string>()

  for (const t of turnos) {
    if (t.ativo === false) continue

    const tIni      = hhmmParaMinutos(t.hora_inicio)
    const tFim      = hhmmParaMinutos(t.hora_fim)
    // Granularidade = intervalo configurado. Fallback: duração do serviço.
    const passo = (t.intervalo_minutos && t.intervalo_minutos > 0)
      ? t.intervalo_minutos
      : duracaoMinutos

    let cursor = tIni
    while (cursor + duracaoMinutos <= tFim) {
      const fim  = cursor + duracaoMinutos
      const hhmm = minutosParaHHMM(cursor)

      if (!vistos.has(hhmm)) {
        vistos.add(hhmm)
        slots.push({
          inicio: dataHoraISO(data, hhmm),
          fim:    dataHoraISO(data, minutosParaHHMM(fim)),
          hhmm,
          status: colide(cursor, fim) ? 'ocupado' : 'disponivel',
        })
      }

      cursor += passo
    }
  }

  slots.sort((a, b) => a.hhmm.localeCompare(b.hhmm))
  return slots
}

// ── conveniência: só os horários disponíveis (HH:MM) ──
export function gerarHorasDisponiveis(input: GerarSlotsInput): string[] {
  return gerarSlots(input).filter(s => s.status === 'disponivel').map(s => s.hhmm)
}

// ── traduções para UI ──
export const DIAS_SEMANA = [
  { id: 0, nome: 'Domingo',       sigla: 'DOM' },
  { id: 1, nome: 'Segunda-feira', sigla: 'SEG' },
  { id: 2, nome: 'Terça-feira',   sigla: 'TER' },
  { id: 3, nome: 'Quarta-feira',  sigla: 'QUA' },
  { id: 4, nome: 'Quinta-feira',  sigla: 'QUI' },
  { id: 5, nome: 'Sexta-feira',   sigla: 'SEX' },
  { id: 6, nome: 'Sábado',        sigla: 'SÁB' },
]
