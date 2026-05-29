'use client'

import { useState, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Calendar, Clock, User,
  CheckCircle2, AlertTriangle, Loader2, X, Repeat,
  MessageCircle, Star,
} from 'lucide-react'
import type {
  ProfissionalPortal, ServicoPortal, TurmaPortal, ConsultaPortal,
} from './actions'
import {
  buscarSlotsPortalAction, agendarPortalAction, cancelarConsultaPortalAction,
} from './actions'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const NIVEL_COR: Record<string, string> = {
  iniciante: 'bg-[#27AE60]/10 text-[#27AE60]',
  intermediario: 'bg-[#F39C12]/10 text-[#F39C12]',
  avancado: 'bg-[#E74C3C]/10 text-[#E74C3C]',
  livre: 'bg-[#4A3AE8]/10 text-[#4A3AE8]',
}
const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  agendado:  { label: 'Agendado',   cor: 'bg-blue-50 text-blue-600' },
  confirmado:{ label: 'Confirmado', cor: 'bg-green-50 text-green-600' },
  realizado: { label: 'Realizado',  cor: 'bg-gray-100 text-gray-500' },
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function proximas14Datas(): Date[] {
  const datas: Date[] = []
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  for (let i = 0; i < 14; i++) {
    const d = new Date(hoje)
    d.setDate(hoje.getDate() + i)
    datas.push(d)
  }
  return datas
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Passo = 1 | 2 | 3 | 4
type Aba = 'agendar' | 'consultas'

interface WizardState {
  passo: Passo
  profissional: ProfissionalPortal | null
  servico: ServicoPortal | null
  data: Date | null
  hhmm: string | null
  observacoes: string
  slots: string[]
  carregandoSlots: boolean
  semTurnos: boolean
  bloqueado: boolean
}

interface Props {
  profissionais: ProfissionalPortal[]
  turmas: TurmaPortal[]
  consultas: ConsultaPortal[]
  antecedencia_horas: number
  clinica_whatsapp: string | null
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function AgendarClient({
  profissionais,
  turmas,
  consultas,
  antecedencia_horas,
  clinica_whatsapp,
}: Props) {
  const [aba, setAba] = useState<Aba>('agendar')
  const [wizard, setWizard] = useState<WizardState>({
    passo: 1,
    profissional: null,
    servico: null,
    data: null,
    hhmm: null,
    observacoes: '',
    slots: [],
    carregandoSlots: false,
    semTurnos: false,
    bloqueado: false,
  })
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erroFinal, setErroFinal] = useState('')
  const [cancelando, setCancelando] = useState<string | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState<ConsultaPortal | null>(null)
  const [consultasLocais, setConsultasLocais] = useState<ConsultaPortal[]>(consultas)

  // ── Wizard helpers ───────────────────────────────────────────────────────────
  function resetWizard() {
    setWizard({
      passo: 1, profissional: null, servico: null,
      data: null, hhmm: null, observacoes: '',
      slots: [], carregandoSlots: false, semTurnos: false, bloqueado: false,
    })
    setSucesso(false)
    setErroFinal('')
  }

  function voltarPasso() {
    setWizard(prev => {
      const p = prev.passo
      if (p === 2) return { ...prev, passo: 1, profissional: null, servico: null }
      if (p === 3) return { ...prev, passo: 2, servico: null, data: null, hhmm: null, slots: [] }
      if (p === 4) return { ...prev, passo: 3, hhmm: null }
      return prev
    })
  }

  function selecionarProfissional(prof: ProfissionalPortal) {
    setWizard(prev => ({ ...prev, passo: 2, profissional: prof }))
  }

  function selecionarServico(servico: ServicoPortal) {
    setWizard(prev => ({ ...prev, passo: 3, servico: servico, data: null, hhmm: null, slots: [] }))
  }

  const buscarSlots = useCallback(async (profId: string, servId: string, data: Date) => {
    setWizard(prev => ({ ...prev, carregandoSlots: true, slots: [], hhmm: null, semTurnos: false, bloqueado: false }))
    const r = await buscarSlotsPortalAction(profId, servId, toDateStr(data))
    setWizard(prev => ({
      ...prev,
      carregandoSlots: false,
      slots: r.slots,
      semTurnos: r.sem_turnos ?? false,
      bloqueado: r.bloqueado ?? false,
    }))
  }, [])

  function selecionarData(data: Date) {
    setWizard(prev => ({ ...prev, data, hhmm: null }))
    if (wizard.profissional && wizard.servico) {
      buscarSlots(wizard.profissional.id, wizard.servico.id, data)
    }
  }

  function selecionarHorario(hhmm: string) {
    setWizard(prev => ({ ...prev, hhmm, passo: 4 }))
  }

  async function confirmarAgendamento() {
    if (!wizard.profissional || !wizard.servico || !wizard.data || !wizard.hhmm) return
    setEnviando(true)
    setErroFinal('')
    const dataISO = `${toDateStr(wizard.data)}T${wizard.hhmm}:00`
    const r = await agendarPortalAction({
      profissional_id: wizard.profissional.id,
      servico_id: wizard.servico.id,
      data_hora: dataISO,
      observacoes: wizard.observacoes,
    })
    setEnviando(false)
    if ('error' in r) {
      setErroFinal(r.error)
    } else {
      setSucesso(true)
    }
  }

  async function handleCancelar(consulta: ConsultaPortal) {
    setCancelando(consulta.id)
    const r = await cancelarConsultaPortalAction(consulta.id)
    setCancelando(null)
    setCancelConfirm(null)
    if ('error' in r) {
      alert(r.error)
    } else {
      setConsultasLocais(prev => prev.filter(c => c.id !== consulta.id))
    }
  }

  // ── Tela de Sucesso ──────────────────────────────────────────────────────────
  if (sucesso) {
    return (
      <div className="px-4 pt-10 pb-2 flex flex-col items-center text-center min-h-[60vh] justify-center">
        <div className="w-20 h-20 rounded-full bg-[#27AE60]/10 flex items-center justify-center mb-5">
          <CheckCircle2 size={40} className="text-[#27AE60]" />
        </div>
        <h2 className="text-xl font-bold text-[#2C3E50] mb-2">Agendamento confirmado!</h2>
        {wizard.data && wizard.hhmm && (
          <p className="text-sm text-[#7F8C8D] mb-1">
            {wizard.data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' '} às {wizard.hhmm}
          </p>
        )}
        {wizard.profissional && (
          <p className="text-sm text-[#7F8C8D]">com {wizard.profissional.nome}</p>
        )}
        <p className="text-xs text-[#7F8C8D] mt-3 bg-[#F8F9FA] rounded-xl p-3 max-w-xs">
          📱 Você receberá uma confirmação via WhatsApp.
        </p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={resetWizard}
            className="px-5 py-2.5 bg-[#4A3AE8] text-white rounded-xl text-sm font-semibold"
          >
            Novo agendamento
          </button>
          <button
            onClick={() => { setAba('consultas'); resetWizard() }}
            className="px-5 py-2.5 bg-white border border-[#E8E8E8] text-[#2C3E50] rounded-xl text-sm font-semibold"
          >
            Ver minhas consultas
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-5 pb-2 space-y-4">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-[#2C3E50]">Agenda</h1>
        <p className="text-xs text-[#7F8C8D]">Agende e gerencie suas consultas</p>
      </div>

      {/* ── Abas ────────────────────────────────────────────────────────── */}
      <div className="flex bg-[#F0F0F0] rounded-xl p-1">
        {(['agendar', 'consultas'] as const).map((a) => (
          <button
            key={a}
            onClick={() => { setAba(a); if (a === 'agendar') resetWizard() }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
              aba === a ? 'bg-white text-[#2C3E50] shadow-sm' : 'text-[#7F8C8D]'
            }`}
          >
            {a === 'agendar' ? '+ Novo agendamento' : 'Minhas consultas'}
            {a === 'consultas' && consultasLocais.filter(c => new Date(c.data_hora) > new Date()).length > 0 && (
              <span className="ml-1.5 bg-[#4A3AE8] text-white text-[9px] px-1.5 py-0.5 rounded-full">
                {consultasLocais.filter(c => new Date(c.data_hora) > new Date()).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {aba === 'agendar' && (
        <>
          {/* Indicador de passo */}
          {wizard.passo > 1 && (
            <div className="flex items-center gap-3">
              <button
                onClick={voltarPasso}
                className="w-8 h-8 rounded-full bg-white border border-[#E8E8E8] flex items-center justify-center text-[#7F8C8D] hover:text-[#2C3E50] transition"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 rounded-full transition-all ${
                      s < wizard.passo ? 'w-6 bg-[#4A3AE8]' :
                      s === wizard.passo ? 'w-10 bg-[#4A3AE8]' :
                      'w-6 bg-[#E8E8E8]'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-[#7F8C8D]">Passo {wizard.passo} de 4</span>
            </div>
          )}

          {/* ── Passo 1: Escolher Profissional ──────────────────────────── */}
          {wizard.passo === 1 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-[#2C3E50]">Com quem você quer se consultar?</h2>

              {profissionais.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E8E8E8] p-6 text-center">
                  <User size={28} className="text-[#E8E8E8] mx-auto mb-2" />
                  <p className="text-sm text-[#7F8C8D]">Nenhum profissional disponível no momento.</p>
                </div>
              ) : (
                profissionais.map((prof) => (
                  <button
                    key={prof.id}
                    onClick={() => selecionarProfissional(prof)}
                    className="w-full bg-white rounded-2xl border border-[#E8E8E8] p-4 flex items-center gap-4 hover:border-[#4A3AE8]/40 hover:shadow-sm transition text-left group"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{ background: prof.cor_agenda }}
                    >
                      {prof.avatar_url
                        ? <img src={prof.avatar_url} alt={prof.nome} className="w-full h-full rounded-full object-cover" />
                        : prof.nome.charAt(0)
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#2C3E50] text-sm">{prof.nome}</p>
                      {prof.especialidade && (
                        <p className="text-xs text-[#7F8C8D]">{prof.especialidade}</p>
                      )}
                      <p className="text-xs text-[#4A3AE8] mt-0.5">
                        {prof.servicos.length} serviço{prof.servicos.length !== 1 ? 's' : ''} disponível{prof.servicos.length !== 1 ? 'eis' : ''}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-[#7F8C8D] group-hover:text-[#4A3AE8] transition" />
                  </button>
                ))
              )}

              {/* Turmas Pilates */}
              {turmas.length > 0 && (
                <div className="mt-2">
                  <h3 className="text-sm font-semibold text-[#2C3E50] mb-2 flex items-center gap-2">
                    🧘 Turmas de Pilates
                  </h3>
                  {turmas.map((turma) => (
                    <TurmaCard key={turma.id} turma={turma} clinica_whatsapp={clinica_whatsapp} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Passo 2: Escolher Serviço ───────────────────────────────── */}
          {wizard.passo === 2 && wizard.profissional && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-white rounded-xl border border-[#E8E8E8] p-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: wizard.profissional.cor_agenda }}
                >
                  {wizard.profissional.nome.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-[#2C3E50] text-sm">{wizard.profissional.nome}</p>
                  <p className="text-xs text-[#7F8C8D]">{wizard.profissional.especialidade}</p>
                </div>
              </div>

              <h2 className="text-base font-semibold text-[#2C3E50]">Qual serviço você precisa?</h2>

              {wizard.profissional.servicos.map((serv) => (
                <button
                  key={serv.id}
                  onClick={() => selecionarServico(serv)}
                  className="w-full bg-white rounded-2xl border border-[#E8E8E8] p-4 flex items-center justify-between hover:border-[#4A3AE8]/40 hover:shadow-sm transition text-left group"
                >
                  <div>
                    <p className="font-semibold text-[#2C3E50] text-sm">{serv.nome}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-[#7F8C8D]">
                        <Clock size={11} /> {serv.duracao_minutos}min
                      </span>
                      {serv.valor > 0 && (
                        <span className="text-xs text-[#27AE60] font-medium">
                          R$ {serv.valor.toFixed(2).replace('.', ',')}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[#7F8C8D] group-hover:text-[#4A3AE8] transition" />
                </button>
              ))}
            </div>
          )}

          {/* ── Passo 3: Escolher Data e Horário ────────────────────────── */}
          {wizard.passo === 3 && wizard.profissional && wizard.servico && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-[#2C3E50]">Quando você quer vir?</h2>

              {/* Strip de datas */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
                {proximas14Datas().map((d) => {
                  const sel = wizard.data && toDateStr(d) === toDateStr(wizard.data)
                  return (
                    <button
                      key={d.toISOString()}
                      onClick={() => selecionarData(d)}
                      className={`flex-shrink-0 snap-start flex flex-col items-center px-3 py-2.5 rounded-xl border-2 min-w-[52px] transition ${
                        sel
                          ? 'border-[#4A3AE8] bg-[#4A3AE8] text-white'
                          : 'border-[#E8E8E8] bg-white text-[#2C3E50] hover:border-[#4A3AE8]/40'
                      }`}
                    >
                      <span className={`text-[10px] font-medium ${sel ? 'text-white/80' : 'text-[#7F8C8D]'}`}>
                        {DIAS[d.getDay()]}
                      </span>
                      <span className="text-base font-bold leading-tight">{d.getDate()}</span>
                      <span className={`text-[10px] ${sel ? 'text-white/80' : 'text-[#7F8C8D]'}`}>
                        {MESES[d.getMonth()]}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Slots */}
              {!wizard.data && (
                <p className="text-sm text-[#7F8C8D] text-center py-4">
                  👆 Selecione uma data para ver os horários disponíveis
                </p>
              )}

              {wizard.data && wizard.carregandoSlots && (
                <div className="flex items-center justify-center py-6 gap-2 text-[#7F8C8D]">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">Buscando horários...</span>
                </div>
              )}

              {wizard.data && !wizard.carregandoSlots && wizard.bloqueado && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                  <p className="text-sm font-medium text-orange-700">📅 Dia sem atendimento</p>
                  <p className="text-xs text-orange-600 mt-1">
                    O profissional não atende nessa data. Escolha outro dia.
                  </p>
                </div>
              )}

              {wizard.data && !wizard.carregandoSlots && wizard.semTurnos && !wizard.bloqueado && (
                <div className="bg-[#F8F9FA] border border-[#E8E8E8] rounded-xl p-4 text-center">
                  <p className="text-sm font-medium text-[#2C3E50]">Sem horários configurados</p>
                  <p className="text-xs text-[#7F8C8D] mt-1">
                    Horários para {DIAS[wizard.data.getDay()]}-feira não estão disponíveis. Tente outro dia.
                  </p>
                </div>
              )}

              {wizard.data && !wizard.carregandoSlots && wizard.slots.length > 0 && (
                <>
                  <p className="text-xs text-[#7F8C8D]">
                    {wizard.slots.length} horário{wizard.slots.length !== 1 ? 's' : ''} disponível{wizard.slots.length !== 1 ? 'eis' : ''}
                    {' '}• {wizard.servico.duracao_minutos}min cada
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {wizard.slots.map((hhmm) => (
                      <button
                        key={hhmm}
                        onClick={() => selecionarHorario(hhmm)}
                        className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition ${
                          wizard.hhmm === hhmm
                            ? 'border-[#4A3AE8] bg-[#4A3AE8] text-white'
                            : 'border-[#E8E8E8] bg-white text-[#2C3E50] hover:border-[#4A3AE8]/40'
                        }`}
                      >
                        {hhmm}
                      </button>
                    ))}
                  </div>
                  {wizard.hhmm && (
                    <button
                      onClick={() => setWizard(prev => ({ ...prev, passo: 4 }))}
                      className="w-full py-3 bg-[#4A3AE8] text-white rounded-xl font-semibold text-sm hover:bg-[#3829c7] transition mt-2"
                    >
                      Continuar com {wizard.hhmm} →
                    </button>
                  )}
                </>
              )}

              {wizard.data && !wizard.carregandoSlots && wizard.slots.length === 0 && !wizard.bloqueado && !wizard.semTurnos && (
                <div className="bg-[#F8F9FA] border border-[#E8E8E8] rounded-xl p-4 text-center">
                  <p className="text-sm font-medium text-[#2C3E50]">Sem horários disponíveis</p>
                  <p className="text-xs text-[#7F8C8D] mt-1">Todos os horários do dia estão ocupados. Tente outra data.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Passo 4: Confirmação ────────────────────────────────────── */}
          {wizard.passo === 4 && wizard.profissional && wizard.servico && wizard.data && wizard.hhmm && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-[#2C3E50]">Confirmar agendamento</h2>

              {/* Resumo */}
              <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
                <div className="bg-[#4A3AE8]/5 px-4 py-3 border-b border-[#E8E8E8]">
                  <p className="text-xs font-semibold text-[#4A3AE8] uppercase tracking-wide">Resumo</p>
                </div>
                <div className="divide-y divide-[#F0F0F0]">
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: wizard.profissional.cor_agenda }}
                    >
                      {wizard.profissional.nome.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs text-[#7F8C8D]">Profissional</p>
                      <p className="text-sm font-semibold text-[#2C3E50]">{wizard.profissional.nome}</p>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs text-[#7F8C8D]">Serviço</p>
                    <p className="text-sm font-semibold text-[#2C3E50]">{wizard.servico.nome}</p>
                    <p className="text-xs text-[#7F8C8D]">{wizard.servico.duracao_minutos}min</p>
                  </div>
                  <div className="px-4 py-3 flex gap-4">
                    <div>
                      <p className="text-xs text-[#7F8C8D]">Data</p>
                      <p className="text-sm font-semibold text-[#2C3E50]">
                        {wizard.data.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#7F8C8D]">Horário</p>
                      <p className="text-sm font-semibold text-[#2C3E50]">{wizard.hhmm}</p>
                    </div>
                    {wizard.servico.valor > 0 && (
                      <div>
                        <p className="text-xs text-[#7F8C8D]">Valor</p>
                        <p className="text-sm font-semibold text-[#27AE60]">
                          R$ {wizard.servico.valor.toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-[#7F8C8D] mb-1.5">
                  Observações (opcional)
                </label>
                <textarea
                  value={wizard.observacoes}
                  onChange={(e) => setWizard(prev => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Ex: primeira consulta, trazendo exames, dor específica..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8E8E8] text-sm text-[#2C3E50] placeholder:text-[#7F8C8D] outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10 resize-none"
                />
              </div>

              {erroFinal && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  <AlertTriangle size={14} />
                  {erroFinal}
                </div>
              )}

              <button
                onClick={confirmarAgendamento}
                disabled={enviando}
                className="w-full py-3.5 bg-[#4A3AE8] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#3829c7] disabled:opacity-50 transition"
              >
                {enviando ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {enviando ? 'Confirmando...' : 'Confirmar agendamento'}
              </button>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {aba === 'consultas' && (
        <ConsultasLista
          consultas={consultasLocais}
          cancelando={cancelando}
          cancelConfirm={cancelConfirm}
          antecedencia_horas={antecedencia_horas}
          onSolicitarCancelamento={(c) => setCancelConfirm(c)}
          onConfirmarCancelamento={handleCancelar}
          onFecharConfirmacao={() => setCancelConfirm(null)}
          onReagendar={() => { setAba('agendar'); resetWizard() }}
        />
      )}

      {/* Modal de confirmação de cancelamento */}
      {cancelConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-[#2C3E50]">Cancelar consulta?</h3>
            <div className="bg-[#F8F9FA] rounded-xl p-3">
              <p className="text-sm font-medium text-[#2C3E50]">
                {cancelConfirm.servico_nome}
              </p>
              <p className="text-xs text-[#7F8C8D] mt-0.5">
                {new Date(cancelConfirm.data_hora).toLocaleDateString('pt-BR', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })} às{' '}
                {new Date(cancelConfirm.data_hora).toLocaleTimeString('pt-BR', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
            <p className="text-xs text-[#7F8C8D]">
              ⚠️ Cancelamentos devem ser feitos com ao menos {antecedencia_horas}h de antecedência.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelConfirm(null)}
                className="flex-1 py-2.5 bg-[#F0F0F0] text-[#2C3E50] rounded-xl text-sm font-semibold"
              >
                Voltar
              </button>
              <button
                onClick={() => handleCancelar(cancelConfirm)}
                disabled={cancelando === cancelConfirm.id}
                className="flex-1 py-2.5 bg-[#E74C3C] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {cancelando === cancelConfirm.id
                  ? <Loader2 size={14} className="animate-spin" />
                  : 'Cancelar consulta'
                }
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Sub-componente: Card de Turma ────────────────────────────────────────────
function TurmaCard({ turma, clinica_whatsapp }: { turma: TurmaPortal; clinica_whatsapp: string | null }) {
  const msg = encodeURIComponent(
    `Olá! Gostaria de me matricular na turma *${turma.nome}*. Podem me ajudar?`
  )
  const linkWA = clinica_whatsapp
    ? `https://wa.me/55${clinica_whatsapp.replace(/\D/g, '')}?text=${msg}`
    : null

  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] p-4 mb-3">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-[#2C3E50] text-sm">{turma.nome}</p>
          {turma.profissional_nome && (
            <p className="text-xs text-[#7F8C8D]">{turma.profissional_nome}</p>
          )}
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${NIVEL_COR[turma.nivel] ?? NIVEL_COR.livre}`}>
          {turma.nivel}
        </span>
      </div>

      {turma.slots.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {turma.slots.map((s, i) => (
            <span key={i} className="text-[10px] bg-[#F0F0F0] text-[#7F8C8D] px-2 py-0.5 rounded-full">
              {DIAS[s.dia_semana]} {s.hora_inicio.slice(0, 5)}
            </span>
          ))}
        </div>
      )}

      {turma.matriculado ? (
        <div className="flex items-center gap-1.5 text-[#27AE60] text-xs font-semibold">
          <CheckCircle2 size={13} /> Você está matriculado nessa turma
        </div>
      ) : linkWA ? (
        <a
          href={linkWA}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2 bg-[#25D366] text-white rounded-xl text-xs font-semibold hover:bg-[#20ba5a] transition"
        >
          <MessageCircle size={13} /> Solicitar vaga via WhatsApp
        </a>
      ) : (
        <p className="text-xs text-[#7F8C8D] text-center">Entre em contato com a clínica para se matricular.</p>
      )}
    </div>
  )
}

// ─── Sub-componente: Lista de Consultas ───────────────────────────────────────
function ConsultasLista({
  consultas, cancelando, cancelConfirm, antecedencia_horas,
  onSolicitarCancelamento, onConfirmarCancelamento, onFecharConfirmacao, onReagendar,
}: {
  consultas: ConsultaPortal[]
  cancelando: string | null
  cancelConfirm: ConsultaPortal | null
  antecedencia_horas: number
  onSolicitarCancelamento: (c: ConsultaPortal) => void
  onConfirmarCancelamento: (c: ConsultaPortal) => void
  onFecharConfirmacao: () => void
  onReagendar: () => void
}) {
  const agora = new Date()
  const futuras = consultas.filter(c => new Date(c.data_hora) > agora)
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
  const passadas = consultas.filter(c => new Date(c.data_hora) <= agora)
    .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())

  if (consultas.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-8 text-center">
        <Calendar size={32} className="text-[#E8E8E8] mx-auto mb-3" />
        <p className="text-sm font-medium text-[#2C3E50]">Nenhuma consulta encontrada</p>
        <p className="text-xs text-[#7F8C8D] mt-1">Seus agendamentos aparecem aqui.</p>
        <button
          onClick={onReagendar}
          className="mt-4 px-4 py-2 bg-[#4A3AE8] text-white rounded-xl text-xs font-semibold"
        >
          Agendar agora
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {futuras.length > 0 && (
        <div>
          <p className="text-xs font-bold text-[#7F8C8D] uppercase tracking-wide mb-2">Próximas</p>
          <div className="space-y-3">
            {futuras.map(c => (
              <ConsultaCard
                key={c.id}
                consulta={c}
                cancelando={cancelando === c.id}
                onCancelar={() => onSolicitarCancelamento(c)}
                onReagendar={onReagendar}
              />
            ))}
          </div>
        </div>
      )}

      {passadas.length > 0 && (
        <div>
          <p className="text-xs font-bold text-[#7F8C8D] uppercase tracking-wide mb-2">Realizadas</p>
          <div className="space-y-3">
            {passadas.slice(0, 5).map(c => (
              <ConsultaCard key={c.id} consulta={c} passada />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-componente: Card de Consulta ─────────────────────────────────────────
function ConsultaCard({
  consulta, passada = false, cancelando = false, onCancelar, onReagendar,
}: {
  consulta: ConsultaPortal
  passada?: boolean
  cancelando?: boolean
  onCancelar?: () => void
  onReagendar?: () => void
}) {
  const dt = new Date(consulta.data_hora)
  const st = STATUS_LABEL[consulta.status] ?? { label: consulta.status, cor: 'bg-gray-100 text-gray-500' }

  return (
    <div className={`bg-white rounded-2xl border p-4 ${passada ? 'border-[#E8E8E8] opacity-75' : 'border-[#E8E8E8]'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Data pill */}
          <div className="flex-shrink-0 text-center bg-[#4A3AE8]/8 rounded-xl px-2.5 py-2 min-w-[48px]">
            <p className="text-[10px] text-[#4A3AE8] font-bold uppercase">{DIAS[dt.getDay()]}</p>
            <p className="text-lg font-black text-[#4A3AE8] leading-none">{dt.getDate()}</p>
            <p className="text-[10px] text-[#4A3AE8]">{MESES[dt.getMonth()]}</p>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#2C3E50] truncate">
              {consulta.servico_nome ?? 'Consulta'}
            </p>
            {consulta.profissional_nome && (
              <p className="text-xs text-[#7F8C8D]">{consulta.profissional_nome}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-xs text-[#7F8C8D]">
                <Clock size={10} />
                {dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${st.cor}`}>
                {st.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {!passada && (consulta.pode_cancelar || consulta.pode_reagendar) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-[#F0F0F0]">
          {consulta.pode_reagendar && onReagendar && (
            <button
              onClick={onReagendar}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#4A3AE8]/8 text-[#4A3AE8] rounded-xl text-xs font-semibold hover:bg-[#4A3AE8]/15 transition"
            >
              <Repeat size={12} /> Reagendar
            </button>
          )}
          {consulta.pode_cancelar && onCancelar && (
            <button
              onClick={onCancelar}
              disabled={cancelando}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-50 text-[#E74C3C] rounded-xl text-xs font-semibold hover:bg-red-100 disabled:opacity-50 transition"
            >
              {cancelando ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
