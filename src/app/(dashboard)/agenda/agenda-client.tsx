'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { Paciente, Servico, Vinculo, Ausencia, Feriado, Profissional as ProfTipo, Turno } from '@/app/(dashboard)/agenda/agenda-page-client'
import type { InicialAgendamento } from '@/components/agenda/novo-agendamento/novo-agendamento-modal'
import { AgendamentoDetalheModal, type AgendamentoDetalhe } from '@/components/agenda/agendamento-detalhe-modal'
import { NotificacaoVagaModal } from '@/components/agenda/notificacao-vaga-modal'
import { buscarCompativeisListaEsperaAction, type EntradaListaEspera } from './lista-espera-actions'

// ─────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────
interface Agendamento {
  id: string
  data_hora: string
  duracao_minutos: number
  status: string
  observacoes?: string | null
  valor?: number | null
  canal?: string | null
  paciente_id?: string
  profissional_id?: string
  created_at?: string
  pacientes: { nome: string; foto_url?: string } | null
  profissionais: { id?: string; nome: string; cor_agenda: string } | null
  servicos: { nome: string; tipo: string; valor?: number | null } | null
  salas?: { nome: string } | null
  criado_por?: { id: string; nome: string; perfil: string } | null
  recorrencia_id?: string | null
  recorrencias?: { frequencia: string; tipo_fim: string; total_sessoes?: number | null } | null
}

interface Props {
  agendamentosIniciais: Agendamento[]
  profissionais: ProfTipo[]
  salas: { id: string; nome: string; status: string }[]
  servicos: Servico[]
  pacientes: Paciente[]
  vinculos: Vinculo[]
  ausencias: Ausencia[]
  feriados: Feriado[]
  turnos: Turno[]
  inicioSemana: string
  onNovoAgendamento: (inicial?: InicialAgendamento) => void
  onEncaixe?: (inicial?: { profissionalId?: string; data?: string; hora?: string }) => void
}

type StatusSlot = 'livre' | 'ocupado' | 'bloqueado' | 'encaixe' | 'cancelado' | 'atendido' | 'fora'

// ─────────────────────────────────────────────────────────────────
// Paleta de cores por status do slot
// ─────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<StatusSlot, { bg: string; border: string; dot: string; text: string; label: string }> = {
  livre:      { bg: '#27AE6010', border: '#27AE6030', dot: '#27AE60', text: '#27AE60', label: 'Livre' },
  ocupado:    { bg: '#3498DB15', border: '#3498DB40', dot: '#3498DB', text: '#1c6391', label: 'Ocupado' },
  bloqueado:  { bg: '#7F8C8D15', border: '#7F8C8D30', dot: '#7F8C8D', text: '#7F8C8D', label: 'Bloqueado' },
  encaixe:    { bg: '#E67E2218', border: '#E67E2240', dot: '#E67E22', text: '#a85916', label: 'Encaixe' },
  cancelado:  { bg: '#E74C3C18', border: '#E74C3C40', dot: '#E74C3C', text: '#a93423', label: 'Cancelado' },
  atendido:   { bg: '#1f8b4d22', border: '#1f8b4d50', dot: '#1f8b4d', text: '#1f8b4d', label: 'Atendido' },
  fora:       { bg: 'transparent',  border: 'transparent', dot: '#fff',   text: '#BDC3C7', label: '' },
}

const HORAS_TODAS = Array.from({ length: 28 }, (_, i) => i * 30 + 6 * 60) // 06:00 → 19:30 em passos de 30 min

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
function toDateStr(d: Date) {
  const ano = d.getFullYear()
  const mes = (d.getMonth() + 1).toString().padStart(2, '0')
  const dia = d.getDate().toString().padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function hhmmFromMin(min: number): string {
  const h = Math.floor(min / 60).toString().padStart(2, '0')
  const m = (min % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function minFromHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

function ehHoje(d: Date) {
  const t = new Date()
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}

function fmtDataExtenso(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ─────────────────────────────────────────────────────────────────
// Lógica: status de cada célula (profissional × hora) num dia
// ─────────────────────────────────────────────────────────────────
function computarStatus(
  profissionalId: string,
  slotInicio: number,       // minutos desde 00:00
  slotFim: number,
  data: Date,
  turnos: Turno[],
  agendamentos: Agendamento[],
  ausencias: Ausencia[],
  feriados: Feriado[],
  mostrarCancelados: boolean,
): { status: StatusSlot; agendamento?: Agendamento } {
  const dataStr   = toDateStr(data)
  const diaSemana = data.getDay()

  // 0) Feriado — bloqueia dia inteiro para TODOS os profissionais
  //    Recorrente: compara apenas MM-DD (ignora o ano)
  const ehFeriado = feriados.some(f =>
    f.recorrente
      ? f.data.slice(5) === dataStr.slice(5)   // MM-DD igual
      : f.data === dataStr                      // data exata
  )
  if (ehFeriado) return { status: 'bloqueado' }

  // 1) Ausência — verifica sobreposição de data E horário (parcial ou dia inteiro)
  const ausencia = ausencias.find(a => {
    if (!(a.profissional_id === profissionalId || a.profissional_id === null)) return false
    if (!(a.data_inicio <= dataStr && dataStr <= a.data_fim)) return false

    // Sem horário definido → dia inteiro bloqueado
    if (!a.hora_inicio && !a.hora_fim) return true

    // Dia intermediário numa ausência multi-dia com horário → bloqueia dia inteiro
    if (dataStr > a.data_inicio && dataStr < a.data_fim) return true

    // Calcula o intervalo bloqueado neste dia específico
    let bloqIni: number
    let bloqFim: number
    if (dataStr === a.data_inicio && dataStr === a.data_fim) {
      // Mesmo dia: usa exatamente os dois horários
      bloqIni = a.hora_inicio ? minFromHHMM(a.hora_inicio) : 0
      bloqFim = a.hora_fim    ? minFromHHMM(a.hora_fim)    : 24 * 60
    } else if (dataStr === a.data_inicio) {
      // Primeiro dia: hora_inicio até fim do dia
      bloqIni = a.hora_inicio ? minFromHHMM(a.hora_inicio) : 0
      bloqFim = 24 * 60
    } else {
      // Último dia: início do dia até hora_fim
      bloqIni = 0
      bloqFim = a.hora_fim ? minFromHHMM(a.hora_fim) : 24 * 60
    }

    return slotInicio < bloqFim && slotFim > bloqIni
  })
  if (ausencia) return { status: 'bloqueado' }

  // 2) Verifica se está dentro de algum turno
  const turnosDoDia = turnos.filter(t =>
    t.profissional_id === profissionalId
    && t.dia_semana === diaSemana
    && t.ativo
  )
  const noTurno = turnosDoDia.some(t => {
    const ini = minFromHHMM(t.hora_inicio)
    const fim = minFromHHMM(t.hora_fim)
    return slotInicio >= ini && slotFim <= fim
  })
  if (!noTurno) return { status: 'fora' }

  // 3) Há agendamento que colide?
  const ags = agendamentos.filter(a => {
    const id = a.profissional_id ?? a.profissionais?.id
    if (id !== profissionalId) return false
    if (!a.data_hora.startsWith(dataStr)) return false
    const agIni = minFromHHMM(a.data_hora.slice(11, 16))
    const agFim = agIni + a.duracao_minutos
    return slotInicio < agFim && slotFim > agIni
  })

  if (ags.length === 0) return { status: 'livre' }

  // Múltiplos → encaixe (overbooking)
  if (ags.length > 1) return { status: 'encaixe', agendamento: ags[0] }

  const ag = ags[0]
  if (ag.status === 'cancelado') {
    if (!mostrarCancelados) return { status: 'livre' }
    return { status: 'cancelado', agendamento: ag }
  }
  if (ag.status === 'realizado') return { status: 'atendido', agendamento: ag }
  return { status: 'ocupado', agendamento: ag }
}

// ═════════════════════════════════════════════════════════════════
// Component principal
// ═════════════════════════════════════════════════════════════════
export function AgendaClient({
  agendamentosIniciais, profissionais, salas, pacientes, turnos, ausencias, feriados, onNovoAgendamento, onEncaixe,
}: Props) {
  const [data, setData]               = useState<Date>(() => new Date())
  const [view, setView]               = useState<'dia' | 'semana'>('dia')
  const [filtroProf, setFiltroProf]   = useState('todos')
  const [mostrarCancelados, setShowC] = useState(false)
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(agendamentosIniciais)
  const [agendamentoAberto, setAgendamentoAberto] = useState<AgendamentoDetalhe | null>(null)
  const [vagasCompativeis, setVagasCompativeis] = useState<EntradaListaEspera[]>([])
  const [slotVago, setSlotVago] = useState<{ data: string; hora: string; profNome?: string } | null>(null)

  function navegar(delta: number) {
    const d = new Date(data)
    if (view === 'dia') d.setDate(d.getDate() + delta)
    else d.setDate(d.getDate() + delta * 7)
    setData(d)
  }

  const profsVisiveis = useMemo(
    () => filtroProf === 'todos'
      ? profissionais
      : profissionais.filter(p => p.id === filtroProf),
    [profissionais, filtroProf],
  )

  function abrirDetalhe(ag: Agendamento) {
    setAgendamentoAberto(ag as AgendamentoDetalhe)
  }

  async function handleStatusChange(id: string, novoStatus: string) {
    setAgendamentos(ags => ags.map(a => a.id === id ? { ...a, status: novoStatus } : a))
    if (agendamentoAberto?.id === id) {
      setAgendamentoAberto(prev => prev ? { ...prev, status: novoStatus } : null)
    }

    // Quando um agendamento é cancelado, busca entradas compatíveis na lista de espera
    if (novoStatus === 'cancelado') {
      const ag = agendamentosIniciais.find(a => a.id === id)
        ?? agendamentos.find(a => a.id === id)
      if (ag) {
        const profId = ag.profissional_id ?? ag.profissionais?.id ?? null
        const data   = ag.data_hora.slice(0, 10)
        const hora   = ag.data_hora.slice(11, 16)
        const res = await buscarCompativeisListaEsperaAction(profId ?? null, data, hora)
        if ('entries' in res && res.entries.length > 0) {
          setVagasCompativeis(res.entries)
          setSlotVago({
            data,
            hora,
            profNome: ag.profissionais?.nome,
          })
        }
      }
    }
  }

  function handleAlterar() {
    if (!agendamentoAberto) return
    const profId = agendamentoAberto.profissional_id ?? agendamentoAberto.profissionais?.id
    const dataStr = agendamentoAberto.data_hora.slice(0, 10)
    const hora    = agendamentoAberto.data_hora.slice(11, 16)
    setAgendamentoAberto(null)
    onNovoAgendamento({ profissionalId: profId, data: dataStr, hora })
  }

  const pacienteAberto = agendamentoAberto
    ? (pacientes.find(p => p.id === agendamentoAberto.paciente_id) ?? null)
    : null

  // Posição desta sessão dentro da série (ordenada por data_hora)
  const sessaoAtual = useMemo(() => {
    if (!agendamentoAberto?.recorrencia_id) return undefined
    const serie = agendamentos
      .filter(a => a.recorrencia_id === agendamentoAberto.recorrencia_id)
      .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
    const idx = serie.findIndex(a => a.id === agendamentoAberto.id)
    return idx !== -1 ? idx + 1 : undefined
  }, [agendamentoAberto, agendamentos])

  const detalheModal = agendamentoAberto ? (
    <AgendamentoDetalheModal
      agendamento={agendamentoAberto}
      paciente={pacienteAberto}
      sessaoAtual={sessaoAtual}
      onClose={() => setAgendamentoAberto(null)}
      onAlterar={handleAlterar}
      onStatusChange={(novoStatus) => handleStatusChange(agendamentoAberto.id, novoStatus)}
    />
  ) : null

  const notificacaoModal = slotVago && vagasCompativeis.length > 0 ? (
    <NotificacaoVagaModal
      entradas={vagasCompativeis}
      slotData={slotVago.data}
      slotHora={slotVago.hora}
      profissionalNome={slotVago.profNome}
      onClose={() => { setSlotVago(null); setVagasCompativeis([]) }}
      onNotificado={(id) => {
        setVagasCompativeis(prev => prev.filter(e => e.id !== id))
      }}
    />
  ) : null

  // ── DIA: grade Profissionais × Slots de 30min ──
  if (view === 'dia') {
    return (
      <div className="space-y-3">
        <Toolbar
          data={data} view={view} filtroProf={filtroProf}
          mostrarCancelados={mostrarCancelados} profissionais={profissionais}
          onNav={navegar} onHoje={() => setData(new Date())}
          onView={setView} onFiltroProf={setFiltroProf} onShowC={setShowC}
        />
        <Legenda />
        <VisaoDia
          data={data}
          profissionais={profsVisiveis}
          turnos={turnos}
          agendamentos={agendamentos}
          ausencias={ausencias}
          feriados={feriados}
          mostrarCancelados={mostrarCancelados}
          onSlotLivre={(profId, dataStr, hora) =>
            onNovoAgendamento({ profissionalId: profId, data: dataStr, hora })
          }
          onAgendamentoClick={abrirDetalhe}
          onEncaixe={onEncaixe}
        />

        {detalheModal}
        {notificacaoModal}
        <BotaoFlutuante onClick={() => onNovoAgendamento()} />
      </div>
    )
  }

  // ── SEMANA: cards resumidos ──
  return (
    <div className="space-y-3">
      <Toolbar
        data={data} view={view} filtroProf={filtroProf}
        mostrarCancelados={mostrarCancelados} profissionais={profissionais}
        onNav={navegar} onHoje={() => setData(new Date())}
        onView={setView} onFiltroProf={setFiltroProf} onShowC={setShowC}
      />
      <Legenda />
      <VisaoSemana
        data={data}
        profissionais={profsVisiveis}
        turnos={turnos}
        agendamentos={agendamentos}
        ausencias={ausencias}
        feriados={feriados}
        mostrarCancelados={mostrarCancelados}
        onAgendamentoClick={abrirDetalhe}
      />

      {detalheModal}
      {notificacaoModal}
      <BotaoFlutuante onClick={() => onNovoAgendamento()} />
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// Toolbar
// ═════════════════════════════════════════════════════════════════
function Toolbar(props: {
  data: Date; view: 'dia' | 'semana'; filtroProf: string
  mostrarCancelados: boolean; profissionais: ProfTipo[]
  onNav: (d: number) => void; onHoje: () => void
  onView: (v: 'dia' | 'semana') => void
  onFiltroProf: (id: string) => void
  onShowC: (b: boolean) => void
}) {
  const { data, view, filtroProf, mostrarCancelados, profissionais,
    onNav, onHoje, onView, onFiltroProf, onShowC } = props

  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] px-4 py-3 flex items-center justify-between flex-wrap gap-3 shadow-sm">
      {/* Navegação */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNav(-1)}
          className="w-9 h-9 rounded-full hover:bg-[#F8F9FA] flex items-center justify-center text-[#7F8C8D]"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-bold text-[#2C3E50] text-sm min-w-[160px] text-center">
          {view === 'dia'
            ? fmtDataExtenso(data)
            : `Semana de ${data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
        </span>
        <button
          onClick={() => onNav(1)}
          className="w-9 h-9 rounded-full hover:bg-[#F8F9FA] flex items-center justify-center text-[#7F8C8D]"
        >
          <ChevronRight size={18} />
        </button>
        <button
          onClick={onHoje}
          className="ml-2 text-sm font-semibold text-[#4A3AE8] hover:underline"
        >
          Hoje
        </button>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-2">
        <div className="inline-flex p-0.5 bg-[#F8F9FA] rounded-lg border border-[#E8E8E8]">
          {(['dia', 'semana'] as const).map(v => (
            <button
              key={v}
              onClick={() => onView(v)}
              className={`px-4 h-8 text-xs font-semibold rounded-md transition-colors capitalize ${
                view === v ? 'bg-[#4A3AE8] text-white shadow-sm' : 'text-[#7F8C8D] hover:text-[#2C3E50]'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <select
          value={filtroProf}
          onChange={(e) => onFiltroProf(e.target.value)}
          className="h-9 px-3 rounded-lg bg-[#F8F9FA] border border-[#E8E8E8] text-sm outline-none focus:bg-white focus:border-[#4A3AE8] cursor-pointer"
        >
          <option value="todos">Todos</option>
          {profissionais.map(p => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-[#7F8C8D]">
          <input
            type="checkbox"
            checked={mostrarCancelados}
            onChange={(e) => onShowC(e.target.checked)}
            className="w-3.5 h-3.5 accent-[#E74C3C]"
          />
          Mostrar Cancelados
        </label>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// Legenda
// ═════════════════════════════════════════════════════════════════
function Legenda() {
  const itens: StatusSlot[] = ['livre', 'ocupado', 'bloqueado', 'encaixe', 'cancelado', 'atendido']
  return (
    <div className="flex items-center gap-4 flex-wrap text-xs">
      {itens.map(s => (
        <span key={s} className="flex items-center gap-1.5 text-[#7F8C8D]">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_STYLES[s].dot }} />
          {STATUS_STYLES[s].label}
        </span>
      ))}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// Visão DIA — grade profissionais × slots de 30 min
// ═════════════════════════════════════════════════════════════════

type CelulaGrade =
  | { tipo: 'pular' }
  | { tipo: 'celula'; status: StatusSlot; rowSpan: number; agendamento?: Agendamento; hora: string }

/** Pré-computa a grade inteira para poder aplicar rowSpan corretamente.
 *  Para cada profissional e cada slot, decide se deve renderizar (e com qual rowSpan)
 *  ou pular (porque uma célula acima já tem rowSpan que cobre este slot). */
function buildGrade(
  faixaMinutos: number[],
  profissionais: ProfTipo[],
  data: Date,
  turnos: Turno[],
  agendamentos: Agendamento[],
  ausencias: Ausencia[],
  feriados: Feriado[],
  mostrarCancelados: boolean,
): Record<string, CelulaGrade[]> {
  const grade: Record<string, CelulaGrade[]> = {}

  for (const prof of profissionais) {
    grade[prof.id] = []
    let absorverAteIdx = -1   // último índice de slot coberto por rowSpan anterior

    for (let i = 0; i < faixaMinutos.length; i++) {
      // Slot coberto por um rowSpan de linha anterior → não renderizar <td>
      if (i <= absorverAteIdx) {
        grade[prof.id].push({ tipo: 'pular' })
        continue
      }

      const min = faixaMinutos[i]
      const r = computarStatus(
        prof.id, min, min + 30, data, turnos, agendamentos, ausencias, feriados, mostrarCancelados,
      )

      let rowSpan = 1

      // Calcula quantos slots consecutivos este agendamento ocupa.
      // Só aplica rowSpan para status com agendamento único (não encaixe).
      if (
        r.agendamento &&
        (r.status === 'ocupado' || r.status === 'atendido' || r.status === 'cancelado')
      ) {
        const agIni = minFromHHMM(r.agendamento.data_hora.slice(11, 16))
        const agFim = agIni + r.agendamento.duracao_minutos
        let span = 0
        for (let j = i; j < faixaMinutos.length; j++) {
          const sIni = faixaMinutos[j]
          const sFim = sIni + 30
          if (sIni < agFim && sFim > agIni) span++
          else break
        }
        rowSpan = Math.max(1, span)
        absorverAteIdx = i + rowSpan - 1
      }

      grade[prof.id].push({
        tipo: 'celula',
        status: r.status,
        rowSpan,
        agendamento: r.agendamento,
        hora: hhmmFromMin(min),
      })
    }
  }

  return grade
}

function VisaoDia(props: {
  data: Date; profissionais: ProfTipo[]; turnos: Turno[]
  agendamentos: Agendamento[]; ausencias: Ausencia[]; feriados: Feriado[]; mostrarCancelados: boolean
  onSlotLivre: (profissionalId: string, data: string, hora: string) => void
  onAgendamentoClick: (ag: Agendamento) => void
  onEncaixe?: (ini?: { profissionalId?: string; data?: string; hora?: string }) => void
}) {
  const { data, profissionais, turnos, agendamentos, ausencias, feriados, mostrarCancelados, onSlotLivre, onAgendamentoClick, onEncaixe } = props

  // Faixa horária dinâmica: só mostra horas em que algum profissional trabalha
  const faixaMinutos = useMemo(() => {
    const diaSemana = data.getDay()
    const turnosDoDia = turnos.filter(t => t.dia_semana === diaSemana && t.ativo)
    if (turnosDoDia.length === 0) return [] as number[]
    const ini = Math.min(...turnosDoDia.map(t => minFromHHMM(t.hora_inicio)))
    const fim = Math.max(...turnosDoDia.map(t => minFromHHMM(t.hora_fim)))
    const lista: number[] = []
    for (let m = ini; m < fim; m += 30) lista.push(m)
    return lista
  }, [data, turnos])

  // Grade pré-computada com rowSpan por agendamento
  const grade = useMemo(
    () => buildGrade(faixaMinutos, profissionais, data, turnos, agendamentos, ausencias, feriados, mostrarCancelados),
    [faixaMinutos, profissionais, data, turnos, agendamentos, ausencias, feriados, mostrarCancelados],
  )

  if (profissionais.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-12 text-center text-sm text-[#7F8C8D]">
        Nenhum profissional ativo. Cadastre em <strong>/horarios</strong>.
      </div>
    )
  }

  if (faixaMinutos.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-12 text-center text-sm text-[#7F8C8D]">
        Nenhum profissional trabalha neste dia da semana.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-[#F8F9FA] border-b border-[#E8E8E8]">
            <tr>
              <th className="w-16 px-3 py-3"></th>
              {profissionais.map(p => (
                <th key={p.id} className="px-3 py-3 text-center min-w-[140px]">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: p.cor_agenda ?? '#4A3AE8' }} />
                    <span className="font-bold text-sm text-[#2C3E50]">{p.nome}</span>
                  </div>
                  {p.especialidade && (
                    <p className="text-[10px] text-[#7F8C8D] font-normal mt-0.5">{p.especialidade}</p>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {faixaMinutos.map((min, rowIdx) => (
              <tr key={min} className="border-b border-[#F0F0F0] last:border-0">
                <td className="w-16 px-3 py-2 align-top text-[11px] font-semibold text-[#7F8C8D]">
                  {hhmmFromMin(min)}
                </td>
                {profissionais.map(p => {
                  const celula = grade[p.id][rowIdx]

                  // Coberta por rowSpan de linha anterior → não renderizar <td>
                  if (celula.tipo === 'pular') return null

                  const { status, rowSpan, agendamento, hora } = celula
                  const styles  = STATUS_STYLES[status]
                  const ehLivre = status === 'livre'

                  if (status === 'fora') {
                    return <td key={p.id} rowSpan={rowSpan} className="px-3 py-2" />
                  }

                  // Altura proporcional à duração: cada slot de 30 min tem ~40px
                  const alturaMin = rowSpan * 40

                  const ehClicavel = ehLivre || !!agendamento

                  return (
                    <td key={p.id} rowSpan={rowSpan} className="px-2 py-1 align-top">
                      <button
                        type="button"
                        onClick={() => {
                          if (ehLivre) onSlotLivre(p.id, toDateStr(data), hora)
                          else if (agendamento) onAgendamentoClick(agendamento)
                        }}
                        className={`w-full text-left rounded-lg px-3 py-2 border transition-all ${
                          ehClicavel
                            ? 'cursor-pointer hover:shadow-md hover:scale-[1.01]'
                            : 'cursor-default'
                        }`}
                        style={{
                          background: styles.bg,
                          borderColor: styles.border,
                          minHeight: `${alturaMin - 8}px`,
                        }}
                        title={
                          agendamento
                            ? `${agendamento.pacientes?.nome} · ${agendamento.servicos?.nome}`
                            : ehLivre ? 'Clique para criar agendamento' : styles.label
                        }
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: styles.dot }} />
                          <span className="font-semibold truncate" style={{ color: styles.text }}>
                            {agendamento
                              ? agendamento.pacientes?.nome ?? hora
                              : `${hora} às ${hhmmFromMin(min + 30)}`}
                          </span>
                        </div>
                        {agendamento?.servicos?.nome && (
                          <p className="text-[10px] mt-0.5 truncate opacity-70" style={{ color: styles.text }}>
                            {agendamento.servicos.nome}
                          </p>
                        )}
                        {rowSpan > 1 && agendamento && (
                          <p className="text-[10px] mt-1 opacity-50" style={{ color: styles.text }}>
                            {agendamento.duracao_minutos} min
                          </p>
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// Visão SEMANA — mais compacta
// ═════════════════════════════════════════════════════════════════
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function VisaoSemana(props: {
  data: Date; profissionais: ProfTipo[]; turnos: Turno[]
  agendamentos: Agendamento[]; ausencias: Ausencia[]; feriados: Feriado[]; mostrarCancelados: boolean
  onAgendamentoClick: (ag: Agendamento) => void
}) {
  const { data, profissionais, turnos, agendamentos, ausencias, feriados, mostrarCancelados, onAgendamentoClick } = props

  // Semana segunda → domingo a partir da data
  const inicioSemana = useMemo(() => {
    const d = new Date(data)
    const dow = d.getDay()
    const diffParaSeg = dow === 0 ? -6 : 1 - dow
    d.setDate(d.getDate() + diffParaSeg)
    d.setHours(0, 0, 0, 0)
    return d
  }, [data])

  const dias = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(inicioSemana)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [inicioSemana])

  function agendamentosDoDia(d: Date) {
    const dStr = toDateStr(d)
    return agendamentos
      .filter(a => a.data_hora.startsWith(dStr))
      .filter(a => mostrarCancelados || a.status !== 'cancelado')
      .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
  }

  function statusDoAgendamento(ag: Agendamento): StatusSlot {
    if (ag.status === 'cancelado') return 'cancelado'
    if (ag.status === 'realizado') return 'atendido'
    return 'ocupado'
  }

  function diaTemAusencia(d: Date): boolean {
    const dStr = toDateStr(d)
    // Feriado da nova tabela (data exata ou recorrente por MM-DD)
    const ehFeriado = feriados.some(f =>
      f.recorrente ? f.data.slice(5) === dStr.slice(5) : f.data === dStr
    )
    if (ehFeriado) return true
    // Ausência global antiga (folgas_ferias com profissional_id null — compat. legado)
    return ausencias.some(a => a.data_inicio <= dStr && dStr <= a.data_fim && a.profissional_id === null)
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[#E8E8E8] bg-[#F8F9FA]">
        {dias.map((d, i) => {
          const hoje = ehHoje(d)
          return (
            <div
              key={i}
              className={`px-3 py-3 text-center border-r border-[#E8E8E8] last:border-0 ${hoje ? 'bg-[#4A3AE8]/5' : ''}`}
            >
              <p className="text-[10px] uppercase font-bold tracking-wider text-[#7F8C8D]">{DIAS_SEMANA[d.getDay()]}</p>
              <p className={`text-lg font-bold ${hoje ? 'text-[#4A3AE8]' : 'text-[#2C3E50]'}`}>{d.getDate()}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-7 min-h-[400px]">
        {dias.map((d, i) => {
          const ags     = agendamentosDoDia(d)
          const ausente = diaTemAusencia(d)
          return (
            <div
              key={i}
              className={`border-r border-[#F0F0F0] last:border-0 p-2 space-y-1.5 ${ehHoje(d) ? 'bg-[#4A3AE8]/3' : ''}`}
            >
              {ausente && (
                <div className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-center" style={{ background: STATUS_STYLES.bloqueado.bg, color: STATUS_STYLES.bloqueado.text }}>
                  Bloqueado
                </div>
              )}
              {ags.length === 0 && !ausente && (
                <p className="text-[10px] text-[#BDC3C7] text-center py-4">Sem agendamentos</p>
              )}
              {ags.map(ag => {
                const s = statusDoAgendamento(ag)
                const styles = STATUS_STYLES[s]
                const hora = ag.data_hora.slice(11, 16)
                return (
                  <div
                    key={ag.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onAgendamentoClick(ag)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onAgendamentoClick(ag) }}
                    className="rounded-md px-2 py-1.5 border text-[11px] cursor-pointer hover:shadow-sm transition-shadow"
                    style={{ background: styles.bg, borderColor: styles.border }}
                    title={`${hora} · ${ag.pacientes?.nome ?? ''} · ${ag.servicos?.nome ?? ''}`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: styles.dot }} />
                      <span className="font-bold" style={{ color: styles.text }}>{hora}</span>
                    </div>
                    <p className="font-semibold truncate" style={{ color: styles.text }}>{ag.pacientes?.nome ?? '—'}</p>
                    {ag.profissionais?.nome && (
                      <p className="text-[9px] opacity-70 truncate" style={{ color: styles.text }}>
                        {ag.profissionais.nome}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// FAB
// ═════════════════════════════════════════════════════════════════
function BotaoFlutuante({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Novo Agendamento"
      className="fixed bottom-6 right-6 w-14 h-14 bg-[#4A3AE8] hover:bg-[#3829c7] text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 z-50"
    >
      <Plus size={24} />
    </button>
  )
}
