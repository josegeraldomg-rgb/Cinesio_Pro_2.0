'use client'

import { useState } from 'react'
import { Calendar, CalendarX, Flag, History, Plus, Clock, Zap } from 'lucide-react'
import { AgendaClient } from './agenda-client'
import { AusenciasAba } from '@/components/agenda/ausencias-aba'
import { FeriadosAba } from '@/components/agenda/feriados-aba'
import { HistoricoAba } from '@/components/agenda/historico-aba'
import { ListaEsperaAba } from '@/components/agenda/lista-espera-aba'
import { NovoAgendamentoModal, type InicialAgendamento } from '@/components/agenda/novo-agendamento/novo-agendamento-modal'
import { NovoEncaixeModal } from '@/components/agenda/novo-encaixe-modal'
import type { EntradaListaEspera } from './lista-espera-actions'

type Tab = 'agenda' | 'ausencias' | 'feriados' | 'historico' | 'lista-espera'

export interface Profissional { id: string; nome: string; cor_agenda?: string | null; especialidade?: string | null }
export interface Sala         { id: string; nome: string; status: string }
export interface Servico      {
  id: string; nome: string; tipo: string
  duracao_minutos?: number; valor?: number
  cor?: string | null; icone?: string | null; categoria_id?: string | null
}
export interface Paciente { id: string; nome: string; telefone: string | null; ddi: string | null; cpf: string | null; status?: string | null }
export interface Vinculo  { servico_id: string; profissional_id: string; valor_override: number | null; duracao_override: number | null }
export interface Turno    {
  profissional_id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  intervalo_minutos: number | null
  ativo: boolean
}

export interface Ausencia {
  id: string
  profissional_id: string | null
  data_inicio: string
  data_fim: string
  hora_inicio?: string | null   // "HH:MM" — null = dia inteiro
  hora_fim?: string | null      // "HH:MM" — null = dia inteiro
  motivo: string | null
  tipo: 'folga' | 'ferias' | 'feriado' | 'outro'
}

// Nova interface: feriados são armazenados na tabela dedicada `feriados`
export interface Feriado {
  id: string
  nome: string
  data: string       // "YYYY-MM-DD"
  recorrente: boolean
}

export interface AgendamentoHist {
  id: string
  data_hora: string
  duracao_minutos: number
  status: string
  observacoes: string | null
  pacientes: { id: string; nome: string } | null
  profissionais: { id: string; nome: string; cor_agenda: string | null } | null
  servicos: { id: string; nome: string; tipo: string } | null
  salas: { nome: string } | null
}

interface Props {
  agendamentosSemana: any[]
  historico: AgendamentoHist[]
  profissionais: Profissional[]
  salas: Sala[]
  servicos: Servico[]
  ausencias: Ausencia[]         // folgas / férias / outro (folgas_ferias)
  feriados: Feriado[]           // tabela feriados dedicada
  pacientes: Paciente[]
  vinculos: Vinculo[]
  turnos: Turno[]
  inicioSemana: string
  listaEspera: EntradaListaEspera[]
}

export function AgendaPageClient(props: Props) {
  const [tab, setTab] = useState<Tab>('agenda')
  const [modalAberto, setModalAberto]           = useState(false)
  const [inicial, setInicial]                   = useState<InicialAgendamento | undefined>(undefined)
  const [encaixeAberto, setEncaixeAberto]       = useState(false)
  const [inicialEncaixe, setInicialEncaixe]     = useState<{ profissionalId?: string; data?: string; hora?: string } | undefined>(undefined)

  function abrirModal(inicial?: InicialAgendamento) {
    setInicial(inicial)
    setModalAberto(true)
  }
  function fecharModal() {
    setModalAberto(false)
    setInicial(undefined)
  }
  function abrirEncaixe(ini?: { profissionalId?: string; data?: string; hora?: string }) {
    setInicialEncaixe(ini)
    setEncaixeAberto(true)
  }

  // ausencias já vêm filtradas (sem tipo='feriado') do page.tsx
  const ausencias = props.ausencias

  const listaEsperaAtivos = props.listaEspera.filter(e => e.status === 'aguardando').length

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'agenda',       label: 'Agenda',        icon: <Calendar size={15} /> },
    { id: 'ausencias',   label: 'Ausências',     icon: <CalendarX size={15} />, count: ausencias.length },
    { id: 'feriados',    label: 'Feriados',      icon: <Flag size={15} />,      count: props.feriados.length },
    { id: 'lista-espera', label: 'Lista de Espera', icon: <Clock size={15} />,  count: listaEsperaAtivos || undefined },
    { id: 'historico',   label: 'Histórico',     icon: <History size={15} />,   count: props.historico.length },
  ]

  return (
    <div className="space-y-5 h-full flex flex-col">
      {/* Tabs + Botão Novo Agendamento */}
      <div className="flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
        <div className="inline-flex p-1 bg-white rounded-full border border-[#E8E8E8] shadow-sm">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${
                tab === t.id ? 'bg-[#F8F9FA] text-[#2C3E50] shadow-sm' : 'text-[#7F8C8D] hover:text-[#2C3E50]'
              }`}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  tab === t.id ? 'bg-[#4A3AE8] text-white' : 'bg-[#E8E8E8] text-[#7F8C8D]'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => abrirEncaixe()}
            className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-full text-sm font-semibold hover:bg-amber-600 shadow-md"
          >
            <Zap size={15} />
            Encaixe Rápido
          </button>
          <button
            onClick={() => abrirModal()}
            className="flex items-center gap-2 bg-[#4A3AE8] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#3829c7] shadow-md"
          >
            <Plus size={16} />
            Novo Agendamento
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-h-0">
        {tab === 'agenda' && (
          <AgendaClient
            agendamentosIniciais={props.agendamentosSemana}
            profissionais={props.profissionais}
            salas={props.salas}
            servicos={props.servicos}
            pacientes={props.pacientes}
            vinculos={props.vinculos}
            ausencias={ausencias}
            feriados={props.feriados}
            turnos={props.turnos}
            inicioSemana={props.inicioSemana}
            onNovoAgendamento={abrirModal}
            onEncaixe={abrirEncaixe}
          />
        )}

        {tab === 'ausencias' && (
          <AusenciasAba ausencias={ausencias} profissionais={props.profissionais} />
        )}

        {tab === 'feriados' && (
          <FeriadosAba feriados={props.feriados} />
        )}

        {tab === 'lista-espera' && (
          <ListaEsperaAba
            entradas={props.listaEspera}
            pacientes={props.pacientes}
            profissionais={props.profissionais}
            servicos={props.servicos}
            vinculos={props.vinculos}
          />
        )}

        {tab === 'historico' && (
          <HistoricoAba
            agendamentos={props.historico}
            profissionais={props.profissionais}
            servicos={props.servicos}
          />
        )}
      </div>

      {/* Modal de novo agendamento */}
      {modalAberto && (
        <NovoAgendamentoModal
          pacientes={props.pacientes}
          profissionais={props.profissionais}
          servicos={props.servicos}
          vinculos={props.vinculos}
          ausencias={ausencias}
          inicial={inicial}
          onClose={fecharModal}
        />
      )}

      {/* Modal de encaixe rápido */}
      {encaixeAberto && (
        <NovoEncaixeModal
          pacientes={props.pacientes}
          profissionais={props.profissionais}
          servicos={props.servicos}
          vinculos={props.vinculos}
          agendamentos={props.agendamentosSemana}
          turnos={props.turnos}
          inicial={inicialEncaixe}
          onClose={() => setEncaixeAberto(false)}
        />
      )}
    </div>
  )
}
