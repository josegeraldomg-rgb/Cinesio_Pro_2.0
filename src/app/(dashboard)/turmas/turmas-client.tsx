'use client'

import { useState, useMemo, useTransition } from 'react'
import { Plus, Users, Calendar, BookOpen, DollarSign, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, Search, Pencil, Trash2, FileText } from 'lucide-react'
import type { Turma, Matricula, TurmaSessao } from './actions'
import { atualizarStatusMatriculaAction, cancelarSessaoAction, gerarCobrancasMensaisAction, inativarTurmaAction } from './actions'
import { TurmaFormModal } from '@/components/turmas/turma-form-modal'
import { MatriculaModal } from '@/components/turmas/matricula-modal'
import { EditarTurmaModal } from '@/components/turmas/editar-turma-modal'
import Link from 'next/link'
import { gerarPdfTurma } from '@/lib/turma-pdf'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const NIVEL_LABEL: Record<string, string> = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado', livre: 'Livre' }
const NIVEL_COR: Record<string, string> = { iniciante: '#27AE60', intermediario: '#E67E22', avancado: '#E74C3C', livre: '#4A3AE8' }

const STATUS_SESSAO: Record<string, { label: string; cor: string; bg: string; Icon: typeof CheckCircle2 }> = {
  agendada:  { label: 'Agendada',  cor: '#4A3AE8', bg: '#4A3AE815', Icon: Clock },
  realizada: { label: 'Realizada', cor: '#27AE60', bg: '#27AE6015', Icon: CheckCircle2 },
  cancelada: { label: 'Cancelada', cor: '#E74C3C', bg: '#E74C3C15', Icon: XCircle },
}

function fmtDataHora(s: string) {
  const d = new Date(s)
  return { data: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), dia: DIAS[d.getDay()] }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Profissional { id: string; nome: string }
interface Sala { id: string; nome: string }
interface Servico { id: string; nome: string }
interface Paciente { id: string; nome: string; telefone: string | null }

interface Sequencia { id: string; nome: string }

interface Props {
  turmas: Turma[]
  matriculas: Matricula[]
  sessoes: TurmaSessao[]
  profissionais: Profissional[]
  salas: Sala[]
  servicos: Servico[]
  pacientes: Paciente[]
  sequencias?: Sequencia[]
}

type Tab = 'turmas' | 'sessoes' | 'matriculas'

// ─── Aba Turmas ───────────────────────────────────────────────────────────────

function AbasTurmas({ turmas, matriculas, profissionais, salas, servicos, pacientes, sequencias, onAtualizar }: {
  turmas: Turma[], matriculas: Matricula[], profissionais: Profissional[], salas: Sala[], servicos: Servico[], pacientes: Paciente[], sequencias?: Sequencia[], onAtualizar: () => void
}) {
  const [modalCriar, setModalCriar] = useState(false)
  const [editarTurma, setEditarTurma] = useState<Turma | null>(null)
  const [matriculaInfo, setMatriculaInfo] = useState<{ turma: Turma } | null>(null)
  const [toast, setToast] = useState('')
  const [, startT] = useTransition()

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 4000) }

  function excluirTurma(turma: Turma) {
    if (!confirm(`Excluir a turma "${turma.nome}"? Esta ação irá inativar a turma e não pode ser desfeita.`)) return
    startT(async () => {
      const r = await inativarTurmaAction(turma.id)
      if ('error' in r) { alert(r.error); return }
      showToast('Turma excluída.')
      onAtualizar()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#7F8C8D]">{turmas.length} turma(s) ativa(s)</p>
        <button onClick={() => setModalCriar(true)} className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[#4A3AE8] text-white text-sm font-semibold hover:bg-[#3D2ED6] shadow-sm">
          <Plus size={15} /> Nova Turma
        </button>
      </div>

      {turmas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] py-20 text-center text-[#7F8C8D]">
          <Users size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">Nenhuma turma cadastrada</p>
          <p className="text-sm mt-1">Crie a primeira turma de aula coletiva</p>
          <button onClick={() => setModalCriar(true)} className="mt-4 flex items-center gap-2 h-9 px-4 rounded-xl bg-[#4A3AE8] text-white text-sm font-semibold mx-auto">
            <Plus size={15} /> Criar Turma
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {turmas.map(t => {
            const turmaMatriculas = matriculas.filter(m => m.turma_id === t.id && m.status === 'ativo')
            return (
              <div key={t.id} className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-[#2C3E50]">{t.nome}</h3>
                    {t.profissionais?.nome && <p className="text-xs text-[#7F8C8D] mt-0.5">{t.profissionais.nome}</p>}
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ color: NIVEL_COR[t.nivel], background: NIVEL_COR[t.nivel] + '15' }}>
                    {NIVEL_LABEL[t.nivel]}
                  </span>
                </div>

                {/* Slots */}
                <div className="space-y-1.5">
                  {t.slots.filter(s => s.ativo).map(s => {
                    const alunosNoSlot = turmaMatriculas.filter(m => (m.slots_ids ?? []).includes(s.id)).length
                    const cap = s.capacidade_maxima ?? t.capacidade_slot
                    const pct = cap > 0 ? Math.round((alunosNoSlot / cap) * 100) : 0
                    const corBarra = pct >= 90 ? '#E74C3C' : pct >= 70 ? '#E67E22' : '#27AE60'
                    return (
                      <div key={s.id} className="bg-[#F8F9FA] rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-[#2C3E50]">{DIAS[s.dia_semana]} · {s.hora_inicio}–{s.hora_fim}</span>
                          <span className="text-[#7F8C8D]">{alunosNoSlot}/{cap}</span>
                        </div>
                        <div className="h-1 bg-[#E8E8E8] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: corBarra }} />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Planos */}
                {t.planos.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {t.planos.map(p => (
                      <span key={p.id} className="text-[11px] bg-[#F8F9FA] text-[#7F8C8D] border border-[#E8E8E8] px-2 py-1 rounded-lg">
                        {p.frequencia_semanal}x · R${p.valor_mensal.toFixed(0)}/mês
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-1 border-t border-[#F0F0F0]">
                  <button onClick={() => setMatriculaInfo({ turma: t })}
                    className="flex-1 h-8 rounded-lg bg-[#4A3AE8]/10 text-[#4A3AE8] text-xs font-semibold hover:bg-[#4A3AE8]/20">
                    Matricular Aluno
                  </button>
                  <button onClick={() => gerarPdfTurma(t, matriculas)}
                    className="h-8 w-8 rounded-lg border border-[#E8E8E8] flex items-center justify-center text-[#7F8C8D] hover:text-[#27AE60] hover:border-[#27AE60]/30 transition-colors"
                    title="Gerar PDF da turma">
                    <FileText size={13} />
                  </button>
                  <button onClick={() => setEditarTurma(t)}
                    className="h-8 w-8 rounded-lg border border-[#E8E8E8] flex items-center justify-center text-[#7F8C8D] hover:text-[#4A3AE8] hover:border-[#4A3AE8]/30 transition-colors"
                    title="Editar turma">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => excluirTurma(t)}
                    className="h-8 w-8 rounded-lg border border-[#E8E8E8] flex items-center justify-center text-[#7F8C8D] hover:text-[#E74C3C] hover:border-[#E74C3C]/30 transition-colors"
                    title="Excluir turma">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2C3E50] text-white text-sm px-4 py-3 rounded-xl shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      {modalCriar && (
        <TurmaFormModal profissionais={profissionais} salas={salas} servicos={servicos}
          onClose={() => setModalCriar(false)}
          onCriado={(_, sessoes) => { setModalCriar(false); showToast(`Turma criada! ${sessoes} sessões geradas.`); onAtualizar() }} />
      )}

      {matriculaInfo && (
        <MatriculaModal
          turmaId={matriculaInfo.turma.id}
          turmaNome={matriculaInfo.turma.nome}
          slots={matriculaInfo.turma.slots}
          planos={matriculaInfo.turma.planos}
          pacientes={pacientes}
          onClose={() => setMatriculaInfo(null)}
          onConfirmado={() => { setMatriculaInfo(null); showToast('Aluno matriculado com sucesso!'); onAtualizar() }} />
      )}

      {editarTurma && (
        <EditarTurmaModal
          turma={editarTurma}
          profissionais={profissionais}
          salas={salas}
          servicos={servicos}
          sequencias={sequencias}
          onClose={() => setEditarTurma(null)}
          onSalvo={() => { setEditarTurma(null); showToast('Turma atualizada.'); onAtualizar() }} />
      )}
    </div>
  )
}

// ─── Aba Sessões ──────────────────────────────────────────────────────────────

function AbaSessoes({ sessoes, matriculas, onAtualizar }: { sessoes: TurmaSessao[]; matriculas: Matricula[]; onAtualizar: () => void }) {
  const [busca, setBusca]   = useState('')
  const [filtroStatus, setFiltro] = useState('todos')
  const [, startT] = useTransition()

  const filtradas = useMemo(() => {
    return sessoes.filter(s => {
      if (filtroStatus !== 'todos' && s.status !== filtroStatus) return false
      if (busca) {
        const hay = (s.turmas?.nome ?? '').toLowerCase()
        if (!hay.includes(busca.toLowerCase())) return false
      }
      return true
    })
  }, [sessoes, filtroStatus, busca])

  function getAlunosDoSlot(sessao: TurmaSessao): { paciente_id: string; nome: string }[] {
    return matriculas
      .filter(m => m.turma_id === sessao.turma_id && m.status === 'ativo' && (m.slots_ids ?? []).includes(sessao.slot_id))
      .map(m => ({ paciente_id: m.paciente_id, nome: m.pacientes?.nome ?? 'Paciente' }))
  }

  function cancelar(id: string) {
    if (!confirm('Cancelar esta sessão?')) return
    startT(async () => { await cancelarSessaoAction(id); onAtualizar() })
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#E8E8E8] rounded-2xl p-3 flex items-center gap-3 flex-wrap shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar turma…"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#F8F9FA] text-sm outline-none" />
        </div>
        <div className="inline-flex bg-[#F8F9FA] rounded-lg p-0.5">
          {(['todos', 'agendada', 'realizada', 'cancelada'] as const).map(s => (
            <button key={s} onClick={() => setFiltro(s)}
              className={`px-3 h-8 text-[11px] font-semibold rounded-md transition-colors ${filtroStatus === s ? 'bg-white text-[#2C3E50] shadow-sm' : 'text-[#7F8C8D]'}`}>
              {s === 'todos' ? 'Todos' : STATUS_SESSAO[s]?.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden">
        {filtradas.length === 0 ? (
          <div className="py-16 text-center text-[#7F8C8D] text-sm">
            <Calendar size={32} className="mx-auto mb-2 opacity-20" />
            Nenhuma sessão encontrada
          </div>
        ) : (
          <div className="divide-y divide-[#F0F0F0]">
            {filtradas.map(s => {
              const { data, hora, dia } = fmtDataHora(s.data_hora)
              const cfg = STATUS_SESSAO[s.status]
              const Icon = cfg.Icon
              const alunos = getAlunosDoSlot(s)
              const passado = new Date(s.data_hora) <= new Date()
              return (
                <div key={s.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[#F8F9FA] transition-colors">
                  <div className="w-14 text-center flex-shrink-0">
                    <p className="text-xs text-[#7F8C8D]">{dia}</p>
                    <p className="font-bold text-[#2C3E50] text-sm">{data}</p>
                    <p className="text-xs text-[#7F8C8D]">{hora}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#2C3E50] text-sm truncate">{s.turmas?.nome}</p>
                    <p className="text-xs text-[#7F8C8D]">{s.turma_slots?.hora_inicio} · {s.turma_slots?.salas?.nome ?? 'Sem sala'} · {alunos.length} aluno(s)</p>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full flex-shrink-0"
                    style={{ color: cfg.cor, background: cfg.bg }}>
                    <Icon size={11} />{cfg.label}
                  </span>
                  <div className="flex gap-2 flex-shrink-0">
                    {(s.status === 'agendada' || s.status === 'realizada') && s.turma_id && (
                      <Link
                        href={`/turmas/${s.turma_id}/presenca?sessao=${s.id}`}
                        className="h-8 px-3 rounded-lg bg-[#4A3AE8] text-white text-xs font-semibold hover:bg-[#3D2ED6] flex items-center"
                      >
                        {s.status === 'realizada' ? 'Ver Chamada' : 'Chamada'}
                      </Link>
                    )}
                    {s.status === 'agendada' && (
                      <button onClick={() => cancelar(s.id)}
                        className="h-8 px-3 rounded-lg border border-[#E74C3C]/30 text-[#E74C3C] text-xs font-semibold hover:bg-[#E74C3C]/5">
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Aba Matrículas ───────────────────────────────────────────────────────────

function AbaMatriculas({ matriculas, onAtualizar }: { matriculas: Matricula[]; onAtualizar: () => void }) {
  const [busca, setBusca]     = useState('')
  const [filtroStatus, setFiltro] = useState('ativo')
  const [, startT] = useTransition()

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase()
    return matriculas.filter(m => {
      if (filtroStatus !== 'todos' && m.status !== filtroStatus) return false
      if (q) {
        const hay = `${m.pacientes?.nome ?? ''} ${m.turmas?.nome ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [matriculas, busca, filtroStatus])

  function atualizarStatus(id: string, status: 'ativo' | 'pausado' | 'encerrado') {
    const label = status === 'ativo' ? 'reativar' : status === 'pausado' ? 'pausar' : 'encerrar'
    if (!confirm(`Deseja ${label} esta matrícula?`)) return
    startT(async () => { await atualizarStatusMatriculaAction(id, status); onAtualizar() })
  }

  const STATUS_MAT: Record<string, { label: string; cor: string; bg: string }> = {
    ativo:     { label: 'Ativo',     cor: '#27AE60', bg: '#27AE6015' },
    pausado:   { label: 'Pausado',   cor: '#E67E22', bg: '#E67E2215' },
    encerrado: { label: 'Encerrado', cor: '#E74C3C', bg: '#E74C3C15' },
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#E8E8E8] rounded-2xl p-3 flex items-center gap-3 flex-wrap shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar aluno ou turma…"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#F8F9FA] text-sm outline-none" />
        </div>
        <div className="inline-flex bg-[#F8F9FA] rounded-lg p-0.5">
          {(['todos', 'ativo', 'pausado', 'encerrado'] as const).map(s => (
            <button key={s} onClick={() => setFiltro(s)}
              className={`px-3 h-8 text-[11px] font-semibold rounded-md transition-colors ${filtroStatus === s ? 'bg-white text-[#2C3E50] shadow-sm' : 'text-[#7F8C8D]'}`}>
              {s === 'todos' ? 'Todos' : STATUS_MAT[s]?.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden">
        {filtradas.length === 0 ? (
          <div className="py-16 text-center text-[#7F8C8D] text-sm">
            <Users size={32} className="mx-auto mb-2 opacity-20" />
            Nenhuma matrícula encontrada
          </div>
        ) : (
          <div className="divide-y divide-[#F0F0F0]">
            {filtradas.map(m => {
              const cfg = STATUS_MAT[m.status] ?? STATUS_MAT.ativo
              return (
                <div key={m.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[#F8F9FA] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#2C3E50] truncate">{m.pacientes?.nome}</p>
                    <p className="text-xs text-[#7F8C8D]">{m.turmas?.nome} · {m.turma_planos?.nome ?? 'Sem plano'}</p>
                    <p className="text-[11px] text-[#7F8C8D]">Desde {new Date(m.data_matricula + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                  {m.turma_planos?.valor_mensal && (
                    <p className="text-sm font-semibold text-[#27AE60] flex-shrink-0">
                      R$ {m.turma_planos.valor_mensal.toFixed(2)}/mês
                    </p>
                  )}
                  <span className="text-[11px] font-semibold px-2 py-1 rounded-full flex-shrink-0"
                    style={{ color: cfg.cor, background: cfg.bg }}>{cfg.label}</span>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {m.status !== 'ativo'    && <button onClick={() => atualizarStatus(m.id, 'ativo')}     className="h-7 px-2.5 rounded-lg bg-[#27AE60]/10 text-[#27AE60] text-[11px] font-semibold">Reativar</button>}
                    {m.status === 'ativo'    && <button onClick={() => atualizarStatus(m.id, 'pausado')}   className="h-7 px-2.5 rounded-lg bg-[#E67E22]/10 text-[#E67E22] text-[11px] font-semibold">Pausar</button>}
                    {m.status !== 'encerrado'&& <button onClick={() => atualizarStatus(m.id, 'encerrado')} className="h-7 px-2.5 rounded-lg bg-[#E74C3C]/10 text-[#E74C3C] text-[11px] font-semibold">Encerrar</button>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function TurmasClient({ turmas, matriculas, sessoes, profissionais, salas, servicos, pacientes, sequencias = [] }: Props) {
  const [tab, setTab] = useState<Tab>('turmas')
  const [cobrancaMes, setCobrancaMes] = useState(new Date().toISOString().slice(0, 7))
  const [, startT] = useTransition()
  const [toastCob, setToastCob] = useState('')

  function atualizar() { window.location.reload() }

  function gerarCobracas() {
    if (!confirm(`Gerar cobranças pendentes para ${cobrancaMes}?`)) return
    startT(async () => {
      const r = await gerarCobrancasMensaisAction(cobrancaMes)
      if ('error' in r) { alert(r.error); return }
      setToastCob(`${r.criadas} cobranças criadas · ${r.ignoradas} já existentes`)
      setTimeout(() => setToastCob(''), 5000)
    })
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'turmas',     label: 'Turmas',     count: turmas.length },
    { id: 'sessoes',    label: 'Sessões',     count: sessoes.filter(s => s.status === 'agendada').length },
    { id: 'matriculas', label: 'Matrículas',  count: matriculas.filter(m => m.status === 'ativo').length },
  ]

  return (
    <div className="space-y-5">
      {/* Header com tabs e ação de cobranças */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex p-1 bg-white rounded-full border border-[#E8E8E8] shadow-sm">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all ${tab === t.id ? 'bg-[#F8F9FA] text-[#2C3E50] shadow-sm' : 'text-[#7F8C8D] hover:text-[#2C3E50]'}`}>
              {t.label}
              {t.count !== undefined && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-[#4A3AE8] text-white' : 'bg-[#E8E8E8] text-[#7F8C8D]'}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'turmas' && (
          <div className="flex items-center gap-2">
            <input type="month" value={cobrancaMes} onChange={e => setCobrancaMes(e.target.value)}
              className="h-9 px-3 border border-[#E8E8E8] rounded-xl text-sm outline-none focus:border-[#4A3AE8]" />
            <button onClick={gerarCobracas}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#27AE60] text-[#27AE60] text-xs font-semibold hover:bg-[#27AE60]/5">
              <DollarSign size={13} /> Gerar Cobranças
            </button>
          </div>
        )}
      </div>

      {tab === 'turmas'     && <AbasTurmas turmas={turmas} matriculas={matriculas} profissionais={profissionais} salas={salas} servicos={servicos} pacientes={pacientes} sequencias={sequencias} onAtualizar={atualizar} />}
      {tab === 'sessoes'    && <AbaSessoes sessoes={sessoes} matriculas={matriculas} onAtualizar={atualizar} />}
      {tab === 'matriculas' && <AbaMatriculas matriculas={matriculas} onAtualizar={atualizar} />}

      {toastCob && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2C3E50] text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toastCob}
        </div>
      )}
    </div>
  )
}
