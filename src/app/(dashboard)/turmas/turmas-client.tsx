'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, Calendar, BookOpen, DollarSign, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, Search, Pencil, Trash2, FileText, ArrowLeftRight, RefreshCw, AlertCircle } from 'lucide-react'
import type { Turma, Matricula, TurmaSessao, PlanoServico, NovaMatricula, SlotComVagas } from './actions'
import { atualizarStatusMatriculaAction, cancelarSessaoAction, gerarCobrancasMensaisAction, inativarTurmaAction, salvarPlanoServicoAction, excluirPlanoServicoAction, encerrarMatriculaAction, pausarReativarMatriculaAction } from './actions'
import { AbaGestaoTurmas } from './gestao-turmas'
import { AbaContrato } from './aba-contrato'
import { TurmaFormModal } from '@/components/turmas/turma-form-modal'
import { MatriculaTurmaModal } from '@/components/turmas/matricula-turma-modal'
import { EditarTurmaModal } from '@/components/turmas/editar-turma-modal'
import { NovaMatriculaModal } from '@/components/turmas/nova-matricula-modal'
import { RemanejamentoModal } from '@/components/turmas/remanejamento-modal'
import { RealocacaoModal } from '@/components/turmas/realocacao-modal'
import { SlotDetailModal, type AlunoSlotInfo } from '@/components/turmas/slot-detail-modal'
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

const STATUS_MAT: Record<string, { label: string; cor: string; bg: string }> = {
  ativo:     { label: 'Ativo',     cor: '#27AE60', bg: '#27AE6015' },
  pausado:   { label: 'Pausado',   cor: '#E67E22', bg: '#E67E2215' },
  encerrado: { label: 'Encerrado', cor: '#E74C3C', bg: '#E74C3C15' },
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
  planosServico: PlanoServico[]
  novasMatriculas: NovaMatricula[]
  slotsComVagas: SlotComVagas[]
}

type Tab = 'gestao' | 'turmas' | 'sessoes' | 'matriculas' | 'contrato'

// ─── Aba Turmas (com seção Planos de Serviço) ─────────────────────────────────

function AbasTurmas({ turmas, matriculas, novasMatriculas, profissionais, salas, servicos, pacientes, sequencias, planosServico: planosServicoProp, slotsComVagas, onAtualizar }: {
  turmas: Turma[], matriculas: Matricula[], novasMatriculas: NovaMatricula[], profissionais: Profissional[], salas: Sala[], servicos: Servico[], pacientes: Paciente[], sequencias?: Sequencia[], planosServico: PlanoServico[], slotsComVagas: SlotComVagas[], onAtualizar: () => void
}) {
  const [modalCriar, setModalCriar] = useState(false)
  const [editarTurma, setEditarTurma] = useState<Turma | null>(null)
  const [matriculaInfo, setMatriculaInfo] = useState<{ turma: Turma } | null>(null)
  const [slotDetalhe, setSlotDetalhe] = useState<{ turma: Turma; slotId: string } | null>(null)
  const [toast, setToast] = useState('')
  const [, startT] = useTransition()

  // Planos de serviço state — cópia local para atualização otimista
  const [planosServico, setPlanosServico] = useState<PlanoServico[]>(planosServicoProp)
  const [mostrarPlanos, setMostrarPlanos] = useState(false)
  const [editandoPlano, setEditandoPlano] = useState<Partial<PlanoServico> | null>(null)
  const [savingPlano, setSavingPlano] = useState(false)
  const [errPlano, setErrPlano] = useState('')

  // Sincroniza quando o servidor atualiza (após router.refresh)
  useMemo(() => { setPlanosServico(planosServicoProp) }, [planosServicoProp])

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

  async function salvarPlano() {
    if (!editandoPlano?.nome || !editandoPlano?.dias_semana) {
      setErrPlano('Preencha o nome e os dias por semana.')
      return
    }
    if (!editandoPlano?.servico_id) {
      setErrPlano('Selecione um serviço. Se a lista estiver vazia, cadastre serviços em Equipe → Serviços.')
      return
    }
    setSavingPlano(true)
    setErrPlano('')
    const r = await salvarPlanoServicoAction({
      id: editandoPlano.id,
      servico_id: editandoPlano.servico_id,
      nome: editandoPlano.nome,
      dias_semana: editandoPlano.dias_semana,
      valor_mensal: editandoPlano.valor_mensal ?? 0,
      ativo: editandoPlano.ativo ?? true,
    })
    setSavingPlano(false)
    if ('error' in r) { setErrPlano('Erro ao salvar: ' + r.error); return }

    // Atualização otimista — reflete na lista sem esperar o servidor
    const servicoNome = servicos.find(s => s.id === editandoPlano.servico_id)?.nome ?? null
    if (editandoPlano.id) {
      setPlanosServico(prev => prev.map(p => p.id === editandoPlano.id
        ? { ...p, ...editandoPlano as PlanoServico, servicos: servicoNome ? { nome: servicoNome } : p.servicos }
        : p
      ))
    } else {
      const novoPlano: PlanoServico = {
        id: crypto.randomUUID(),
        servico_id: editandoPlano.servico_id!,
        nome: editandoPlano.nome!,
        dias_semana: editandoPlano.dias_semana!,
        valor_mensal: editandoPlano.valor_mensal ?? 0,
        ativo: editandoPlano.ativo ?? true,
        servicos: servicoNome ? { nome: servicoNome } : null,
      }
      setPlanosServico(prev => [...prev, novoPlano])
    }

    setEditandoPlano(null)
    showToast(editandoPlano.id ? 'Plano atualizado.' : 'Plano criado.')
    onAtualizar() // sincroniza com servidor em background
  }

  function excluirPlano(id: string) {
    if (!confirm('Excluir este plano de serviço?')) return
    setPlanosServico(prev => prev.filter(p => p.id !== id)) // otimista
    startT(async () => {
      const r = await excluirPlanoServicoAction(id)
      if ('error' in r) { alert(r.error); onAtualizar(); return }
      showToast('Plano excluído.')
      onAtualizar()
    })
  }

  return (
    <div className="space-y-6">

      {/* Lista de Turmas */}
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
                    // Modelo legado: turma_matriculas com slots_ids
                    const alunosLegado = turmaMatriculas.filter(m => (m.slots_ids ?? []).includes(s.id)).length
                    // Novo modelo: matriculas → matricula_slots com slot_id
                    const alunosNovo = novasMatriculas.filter(m =>
                      m.status === 'ativo' &&
                      (m.slots ?? []).some(ms => ms.slot_id === s.id && ms.ativo !== false)
                    ).length
                    const alunosNoSlot = alunosLegado + alunosNovo
                    const cap = s.capacidade_maxima ?? t.capacidade_slot
                    const pct = cap > 0 ? Math.round((alunosNoSlot / cap) * 100) : 0
                    const corBarra = pct >= 90 ? '#E74C3C' : pct >= 70 ? '#E67E22' : '#27AE60'
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSlotDetalhe({ turma: t, slotId: s.id })}
                        className="w-full bg-[#F8F9FA] rounded-lg px-3 py-2 text-left hover:bg-[#F0F0F0] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-[#2C3E50]">{DIAS[s.dia_semana]} · {s.hora_inicio}–{s.hora_fim}</span>
                          <span className="text-[#7F8C8D]">{alunosNoSlot}/{cap}</span>
                        </div>
                        <div className="h-1 bg-[#E8E8E8] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: corBarra }} />
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="flex gap-2 pt-1 border-t border-[#F0F0F0] justify-end">
                  <button onClick={() => gerarPdfTurma(t, matriculas, novasMatriculas)}
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
        <MatriculaTurmaModal
          turma={matriculaInfo.turma}
          pacientes={pacientes}
          planosServico={planosServicoProp}
          slotsComVagas={slotsComVagas}
          onClose={() => setMatriculaInfo(null)}
          onConfirmado={() => { setMatriculaInfo(null); showToast('Aluno(s) matriculado(s) com sucesso!'); onAtualizar() }} />
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

      {slotDetalhe && (() => {
        const t = slotDetalhe.turma
        const s = t.slots.find(x => x.id === slotDetalhe.slotId)
        if (!s) return null
        const turmaMatriculasSlot = matriculas.filter(m => m.turma_id === t.id && m.status === 'ativo')
        const alunosAntigos: AlunoSlotInfo[] = turmaMatriculasSlot
          .filter(m => (m.slots_ids ?? []).includes(s.id))
          .map(m => ({
            matricula_id: m.id,
            paciente_id: m.paciente_id,
            nome: m.pacientes?.nome ?? '—',
            telefone: m.pacientes?.telefone ?? null,
            planoNome: m.turma_planos?.nome ?? null,
            planoFreq: m.turma_planos?.frequencia_semanal ?? null,
            valor: m.turma_planos?.valor_mensal ?? null,
            modelo: 'antigo' as const,
          }))
        const alunosNovos: AlunoSlotInfo[] = novasMatriculas
          .filter(m => m.status === 'ativo' && (m.slots ?? []).some(ms => ms.slot_id === s.id && ms.ativo !== false))
          .map(m => ({
            matricula_id: m.id,
            paciente_id: m.paciente_id,
            nome: m.pacientes?.nome ?? '—',
            telefone: m.pacientes?.telefone ?? null,
            planoNome: m.planos_servico?.nome ?? null,
            planoFreq: m.planos_servico?.dias_semana ?? null,
            valor: m.planos_servico?.valor_mensal ?? null,
            modelo: 'novo' as const,
          }))
        return (
          <SlotDetailModal
            turmaNome={t.nome}
            turmaServicoId={t.servico_id ?? null}
            slot={s}
            capacidadeSlot={t.capacidade_slot}
            alunos={[...alunosAntigos, ...alunosNovos]}
            slotsComVagas={slotsComVagas}
            onClose={() => setSlotDetalhe(null)}
            onAtualizar={() => { setSlotDetalhe(null); onAtualizar() }}
          />
        )
      })()}
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

function AbaMatriculas({
  matriculas,
  novasMatriculas,
  slotsComVagas,
  pacientes,
  planosServico,
  onAtualizar,
}: {
  matriculas: Matricula[]
  novasMatriculas: NovaMatricula[]
  slotsComVagas: SlotComVagas[]
  pacientes: { id: string; nome: string; telefone: string | null }[]
  planosServico: PlanoServico[]
  onAtualizar: () => void
}) {
  const [busca, setBusca]     = useState('')
  const [filtroStatus, setFiltro] = useState('ativo')
  const [modeloFiltro, setModeloFiltro] = useState<'todos' | 'novo' | 'antigo'>('todos')
  const [novaMatriculaModal, setNovaMatriculaModal] = useState(false)
  const [remanejandoMat, setRemanejandoMat] = useState<NovaMatricula | null>(null)
  const [realocandoMat, setRealocandoMat] = useState<NovaMatricula | null>(null)
  const [, startT] = useTransition()

  // Filter novas matriculas
  const novasFiltradas = useMemo(() => {
    const q = busca.toLowerCase()
    return novasMatriculas.filter(m => {
      if (filtroStatus !== 'todos' && m.status !== filtroStatus) return false
      if (q) {
        const hay = `${m.pacientes?.nome ?? ''} ${m.planos_servico?.nome ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [novasMatriculas, busca, filtroStatus])

  // Filter old matriculas
  const antigasFiltradas = useMemo(() => {
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

  function atualizarStatusAntigo(id: string, status: 'ativo' | 'pausado' | 'encerrado') {
    const label = status === 'ativo' ? 'reativar' : status === 'pausado' ? 'pausar' : 'encerrar'
    if (!confirm(`Deseja ${label} esta matrícula?`)) return
    startT(async () => { await atualizarStatusMatriculaAction(id, status); onAtualizar() })
  }

  function encerrarNova(id: string) {
    if (!confirm('Encerrar esta matrícula?')) return
    startT(async () => {
      const r = await encerrarMatriculaAction(id)
      if ('error' in r && r.error !== 'MATRICULA_JA_ENCERRADA') { alert(r.error); return }
      onAtualizar()
    })
  }

  function pausarReativarNova(id: string, status: 'ativo' | 'pausado') {
    const label = status === 'ativo' ? 'reativar' : 'pausar'
    if (!confirm(`Deseja ${label} esta matrícula?`)) return
    startT(async () => {
      await pausarReativarMatriculaAction(id, status)
      onAtualizar()
    })
  }

  const totalAtivas = novasMatriculas.filter(m => m.status === 'ativo').length + matriculas.filter(m => m.status === 'ativo').length

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#E8E8E8] rounded-2xl p-3 flex items-center gap-3 flex-wrap shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar aluno ou turma/plano…"
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
        <button
          onClick={() => setNovaMatriculaModal(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[#4A3AE8] text-white text-xs font-semibold hover:bg-[#3D2ED6] shadow-sm flex-shrink-0"
        >
          <Plus size={14} /> Nova Matrícula
        </button>
      </div>

      {/* Modelo switcher */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#7F8C8D]">Mostrar:</span>
        <div className="inline-flex bg-[#F8F9FA] rounded-lg p-0.5">
          {([['todos', 'Todos'], ['novo', 'Novo modelo'], ['antigo', 'Legado']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setModeloFiltro(v)}
              className={`px-3 h-7 text-[11px] font-semibold rounded-md transition-colors ${modeloFiltro === v ? 'bg-white text-[#2C3E50] shadow-sm' : 'text-[#7F8C8D]'}`}>
              {l}
            </button>
          ))}
        </div>
        <span className="text-xs text-[#7F8C8D] ml-auto">{totalAtivas} ativa(s)</span>
      </div>

      {/* Novo modelo */}
      {(modeloFiltro === 'todos' || modeloFiltro === 'novo') && (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[#F0F0F0] bg-[#4A3AE8]/3 flex items-center gap-2">
            <span className="text-xs font-bold text-[#4A3AE8] uppercase tracking-wider">Novo Modelo — Plano de Serviço</span>
            <span className="text-[11px] bg-[#4A3AE8]/10 text-[#4A3AE8] px-2 py-0.5 rounded-full">{novasFiltradas.length}</span>
          </div>
          {novasFiltradas.length === 0 ? (
            <div className="py-10 text-center text-[#7F8C8D] text-sm">
              <Users size={28} className="mx-auto mb-2 opacity-20" />
              Nenhuma matrícula encontrada
            </div>
          ) : (
            <div className="divide-y divide-[#F0F0F0]">
              {novasFiltradas.map(m => {
                const cfg = STATUS_MAT[m.status] ?? STATUS_MAT.ativo
                const slotsAtivos = (m.slots ?? []).filter(s => s.ativo)
                return (
                  <div key={m.id} className="px-5 py-3 hover:bg-[#F8F9FA] transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-[#2C3E50]">{m.pacientes?.nome}</p>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: cfg.cor, background: cfg.bg }}>{cfg.label}</span>
                        </div>
                        <p className="text-xs text-[#7F8C8D] mt-0.5">
                          {m.planos_servico?.nome ?? 'Plano'} · {m.planos_servico?.servicos?.nome ?? 'Serviço'}
                        </p>
                        {slotsAtivos.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {slotsAtivos.map(s => (
                              <span key={s.id} className="text-[11px] bg-[#F0F0F0] text-[#7F8C8D] px-2 py-0.5 rounded-md">
                                {s.turma_slots?.turmas?.nome ?? '?'} — {DIAS[s.turma_slots?.dia_semana ?? 0]} {s.turma_slots?.hora_inicio ?? ''}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-[11px] text-[#7F8C8D] mt-1">
                          Desde {new Date(m.data_matricula + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {m.planos_servico?.valor_mensal != null && (
                          <p className="text-sm font-bold text-[#27AE60]">R$ {m.planos_servico.valor_mensal.toFixed(2)}/mês</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {m.status === 'ativo' && (
                        <>
                          <button onClick={() => setRemanejandoMat(m)}
                            className="h-7 px-2.5 rounded-lg bg-[#4A3AE8]/10 text-[#4A3AE8] text-[11px] font-semibold flex items-center gap-1 hover:bg-[#4A3AE8]/20">
                            <ArrowLeftRight size={11} /> Remanejar
                          </button>
                          <button onClick={() => setRealocandoMat(m)}
                            className="h-7 px-2.5 rounded-lg bg-[#E67E22]/10 text-[#E67E22] text-[11px] font-semibold flex items-center gap-1 hover:bg-[#E67E22]/20">
                            <RefreshCw size={11} /> Realocar
                          </button>
                          <button onClick={() => pausarReativarNova(m.id, 'pausado')}
                            className="h-7 px-2.5 rounded-lg bg-[#E67E22]/10 text-[#E67E22] text-[11px] font-semibold">
                            Pausar
                          </button>
                        </>
                      )}
                      {m.status === 'pausado' && (
                        <button onClick={() => pausarReativarNova(m.id, 'ativo')}
                          className="h-7 px-2.5 rounded-lg bg-[#27AE60]/10 text-[#27AE60] text-[11px] font-semibold">
                          Reativar
                        </button>
                      )}
                      {m.status !== 'encerrado' && (
                        <button onClick={() => encerrarNova(m.id)}
                          className="h-7 px-2.5 rounded-lg bg-[#E74C3C]/10 text-[#E74C3C] text-[11px] font-semibold">
                          Encerrar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modelo antigo (legado) */}
      {(modeloFiltro === 'todos' || modeloFiltro === 'antigo') && (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[#F0F0F0] bg-[#F8F9FA] flex items-center gap-2">
            <span className="text-xs font-bold text-[#7F8C8D] uppercase tracking-wider">Legado — Matrícula por Turma</span>
            <span className="text-[11px] bg-[#E8E8E8] text-[#7F8C8D] px-2 py-0.5 rounded-full">{antigasFiltradas.length}</span>
          </div>
          {antigasFiltradas.length === 0 ? (
            <div className="py-10 text-center text-[#7F8C8D] text-sm">
              <Users size={28} className="mx-auto mb-2 opacity-20" />
              Nenhuma matrícula encontrada
            </div>
          ) : (
            <div className="divide-y divide-[#F0F0F0]">
              {antigasFiltradas.map(m => {
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
                      {m.status !== 'ativo'    && <button onClick={() => atualizarStatusAntigo(m.id, 'ativo')}     className="h-7 px-2.5 rounded-lg bg-[#27AE60]/10 text-[#27AE60] text-[11px] font-semibold">Reativar</button>}
                      {m.status === 'ativo'    && <button onClick={() => atualizarStatusAntigo(m.id, 'pausado')}   className="h-7 px-2.5 rounded-lg bg-[#E67E22]/10 text-[#E67E22] text-[11px] font-semibold">Pausar</button>}
                      {m.status !== 'encerrado'&& <button onClick={() => atualizarStatusAntigo(m.id, 'encerrado')} className="h-7 px-2.5 rounded-lg bg-[#E74C3C]/10 text-[#E74C3C] text-[11px] font-semibold">Encerrar</button>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {novaMatriculaModal && (
        <NovaMatriculaModal
          pacientes={pacientes}
          planosServico={planosServico}
          slotsComVagas={slotsComVagas}
          onClose={() => setNovaMatriculaModal(false)}
          onConfirmado={() => { setNovaMatriculaModal(false); onAtualizar() }}
        />
      )}

      {remanejandoMat && (
        <RemanejamentoModal
          matricula={remanejandoMat}
          slotsDisponiveis={slotsComVagas}
          onClose={() => setRemanejandoMat(null)}
          onSalvar={() => { setRemanejandoMat(null); onAtualizar() }}
        />
      )}

      {realocandoMat && (
        <RealocacaoModal
          matricula={realocandoMat}
          slotsDisponiveis={slotsComVagas}
          sessoesFuturas={[]}
          onClose={() => setRealocandoMat(null)}
          onSalvar={() => { setRealocandoMat(null); onAtualizar() }}
        />
      )}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function TurmasClient({
  turmas, matriculas, sessoes, profissionais, salas, servicos, pacientes, sequencias = [],
  planosServico, novasMatriculas, slotsComVagas,
}: Props) {
  const [tab, setTab] = useState<Tab>('gestao')
  const [cobrancaMes, setCobrancaMes] = useState(new Date().toISOString().slice(0, 7))
  const [, startT] = useTransition()
  const [toastCob, setToastCob] = useState('')
  const router = useRouter()

  function atualizar() { router.refresh() }

  function gerarCobracas() {
    if (!confirm(`Gerar cobranças pendentes para ${cobrancaMes}?`)) return
    startT(async () => {
      const r = await gerarCobrancasMensaisAction(cobrancaMes)
      if ('error' in r) { alert(r.error); return }
      setToastCob(`${r.criadas} cobranças criadas · ${r.ignoradas} já existentes`)
      setTimeout(() => setToastCob(''), 5000)
    })
  }

  const totalMatriculas = matriculas.filter(m => m.status === 'ativo').length + novasMatriculas.filter(m => m.status === 'ativo').length

  const pendentesGestao = novasMatriculas.filter(m => {
    if (m.status !== 'ativo') return false
    const plano = planosServico.find(p => p.id === m.plano_id)
    if (!plano) return false
    return (m.slots ?? []).filter(s => s.ativo !== false).length < plano.dias_semana
  }).length

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'gestao',     label: 'Gestão Turmas', count: pendentesGestao || undefined },
    { id: 'turmas',     label: 'Turmas',         count: turmas.length },
    { id: 'sessoes',    label: 'Sessões',         count: sessoes.filter(s => s.status === 'agendada').length },
    { id: 'matriculas', label: 'Matrículas',      count: totalMatriculas },
    { id: 'contrato',   label: 'Contrato' },
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

      {tab === 'gestao' && (
        <AbaGestaoTurmas
          novasMatriculas={novasMatriculas}
          matriculas={matriculas}
          turmas={turmas}
          planosServico={planosServico}
          slotsComVagas={slotsComVagas}
          servicos={servicos}
          profissionais={profissionais}
          salas={salas}
          pacientes={pacientes}
          sequencias={sequencias}
          onAtualizar={atualizar}
          onNovoPlanosClick={() => setTab('turmas')}
        />
      )}
      {tab === 'turmas' && (
        <AbasTurmas
          turmas={turmas} matriculas={matriculas} novasMatriculas={novasMatriculas}
          profissionais={profissionais} salas={salas} servicos={servicos} pacientes={pacientes}
          sequencias={sequencias} planosServico={planosServico}
          slotsComVagas={slotsComVagas}
          onAtualizar={atualizar}
        />
      )}
      {tab === 'sessoes' && <AbaSessoes sessoes={sessoes} matriculas={matriculas} onAtualizar={atualizar} />}
      {tab === 'contrato' && <AbaContrato />}
      {tab === 'matriculas' && (
        <AbaMatriculas
          matriculas={matriculas}
          novasMatriculas={novasMatriculas}
          slotsComVagas={slotsComVagas}
          pacientes={pacientes}
          planosServico={planosServico}
          onAtualizar={atualizar}
        />
      )}

      {toastCob && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2C3E50] text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toastCob}
        </div>
      )}
    </div>
  )
}
