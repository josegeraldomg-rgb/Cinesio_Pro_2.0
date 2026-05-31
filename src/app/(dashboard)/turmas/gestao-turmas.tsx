'use client'

import { useState, useMemo, useTransition } from 'react'
import { Plus, ChevronDown, ChevronUp, AlertTriangle, AlertCircle, ChevronLeft, ChevronRight, ClipboardList, MoreVertical, Pencil, Trash2, Check, X as XIcon, Calendar, FileText, Loader2 } from 'lucide-react'
import type { NovaMatricula, PlanoServico, SlotComVagas, Turma, Matricula } from './actions'
import { atribuirSlotAlunoAction, editarDatasMatriculaAction, encerrarMatriculaAction, salvarPlanoServicoAction } from './actions'
import { gerarContratoAlunoAction } from './contrato-actions'
import { gerarPDFContrato, abrirContratoPDF } from '@/lib/contrato-pdf'
import { TurmaFormModal } from '@/components/turmas/turma-form-modal'
import { SlotGestaoModal } from './slot-gestao-modal'
import { MatricularNoPlanModal } from './matricular-no-plan-modal'
import Link from 'next/link'

// ─── Constantes ──────────────────────────────────────────────────────────────

const SERVICE_PALETTE = [
  '#4A3AE8', '#27AE60', '#E67E22', '#E74C3C',
  '#8E44AD', '#16A085', '#D35400', '#2980B9',
  '#1ABC9C', '#C0392B',
]

const DIAS_SEMANA = [
  { dia: 1, label: 'Segunda' },
  { dia: 2, label: 'Terça' },
  { dia: 3, label: 'Quarta' },
  { dia: 4, label: 'Quinta' },
  { dia: 5, label: 'Sexta' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

function getWeekDates(offset: number): Date[] {
  const now = new Date()
  const dow = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Paciente { id: string; nome: string; telefone: string | null }

interface Props {
  novasMatriculas: NovaMatricula[]
  matriculas: Matricula[]
  turmas: Turma[]
  planosServico: PlanoServico[]
  slotsComVagas: SlotComVagas[]
  servicos: { id: string; nome: string }[]
  profissionais: { id: string; nome: string }[]
  salas: { id: string; nome: string }[]
  pacientes: Paciente[]
  sequencias?: { id: string; nome: string }[]
  onAtualizar: () => void
  onNovoPlanosClick: () => void
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AbaGestaoTurmas({
  novasMatriculas,
  matriculas,
  turmas,
  planosServico,
  slotsComVagas,
  servicos,
  profissionais,
  salas,
  pacientes,
  sequencias = [],
  onAtualizar,
  onNovoPlanosClick,
}: Props) {
  const [semanaOffset, setSemanaOffset]     = useState(0)
  const [expandidos, setExpandidos]         = useState<Record<string, boolean>>({})
  const [draggingMatId, setDraggingMatId]   = useState<string | null>(null)
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null)
  const [modalCriar, setModalCriar]         = useState(false)
  const [slotDetalhe, setSlotDetalhe]       = useState<SlotComVagas | null>(null)
  const [matriculandoPlano, setMatriculandoPlano] = useState<PlanoServico | null>(null)
  const [toast, setToast]                   = useState<{ msg: string; ok: boolean } | null>(null)
  const [modalNovoPlano, setModalNovoPlano] = useState(false)
  // Gestão de edição/exclusão de matrícula
  const [cardMenuAberto, setCardMenuAberto]         = useState<string | null>(null)   // mat.id
  const [editandoDatas, setEditandoDatas]           = useState<string | null>(null)   // mat.id
  const [editDatasForm, setEditDatasForm]           = useState<{ inicio: string; saida: string }>({ inicio: '', saida: '' })
  const [confirmEncerramento, setConfirmEncerramento] = useState<string | null>(null) // mat.id
  const [savingMat, setSavingMat]                   = useState<string | null>(null)   // mat.id
  const [gerandoContrato, setGerandoContrato]       = useState<string | null>(null)   // mat.id
  const [, startT] = useTransition()

  // Mapa de turma_id → Turma (para o modal de detalhes)
  const turmaMap = useMemo(() => Object.fromEntries((turmas ?? []).map(t => [t.id, t])), [turmas])

  // ── Semana ──────────────────────────────────────────────────────────────────
  const weekDates = useMemo(() => getWeekDates(semanaOffset), [semanaOffset])

  const weekLabel = useMemo(() => {
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long' }
    return `${weekDates[0].toLocaleDateString('pt-BR', opts)} a ${weekDates[4].toLocaleDateString('pt-BR', opts)}`
  }, [weekDates])

  // ── Cores por serviço ────────────────────────────────────────────────────────
  const serviceColorMap = useMemo(() => {
    const m: Record<string, string> = {}
    servicos.forEach((s, i) => { m[s.id] = SERVICE_PALETTE[i % SERVICE_PALETTE.length] })
    return m
  }, [servicos])

  function getServiceColor(servicoId: string | null | undefined): string {
    if (!servicoId) return '#7F8C8D'
    return serviceColorMap[servicoId] ?? '#7F8C8D'
  }

  // ── Grupos de planos ──────────────────────────────────────────────────────────
  const gruposPlano = useMemo(() => {
    const map = new Map<string, {
      plano: PlanoServico
      alunos: Array<{ mat: NovaMatricula; slotsAtivos: number; pendentes: number }>
    }>()

    for (const m of novasMatriculas.filter(m => m.status === 'ativo')) {
      const plano = planosServico.find(p => p.id === m.plano_id)
      if (!plano) continue

      const slotsAtivos = (m.slots ?? []).filter(s => s.ativo !== false).length
      const pendentes   = Math.max(0, plano.dias_semana - slotsAtivos)

      if (!map.has(plano.id)) map.set(plano.id, { plano, alunos: [] })
      map.get(plano.id)!.alunos.push({ mat: m, slotsAtivos, pendentes })
    }

    return Array.from(map.values()).sort((a, b) => a.plano.nome.localeCompare(b.plano.nome))
  }, [novasMatriculas, planosServico])

  // ── Slots por dia da semana ────────────────────────────────────────────────
  const slotsByDia = useMemo(() => {
    const m: Record<number, SlotComVagas[]> = {}
    for (const s of slotsComVagas) {
      if (!m[s.dia_semana]) m[s.dia_semana] = []
      m[s.dia_semana].push(s)
    }
    for (const dia in m) m[dia].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
    return m
  }, [slotsComVagas])

  // ── Drag info computado ───────────────────────────────────────────────────
  const draggingMat   = useMemo(() => novasMatriculas.find(m => m.id === draggingMatId) ?? null, [draggingMatId, novasMatriculas])
  const draggingPlano = useMemo(() => draggingMat ? planosServico.find(p => p.id === draggingMat.plano_id) ?? null : null, [draggingMat, planosServico])

  // ── Validação de drop ─────────────────────────────────────────────────────
  type DropStatus = 'ok' | 'wrong-service' | 'full' | 'already-enrolled' | 'plan-complete'

  function canDropOnSlot(slot: SlotComVagas): DropStatus {
    if (!draggingMat || !draggingPlano) return 'wrong-service'
    if (slot.turmas?.servico_id !== draggingPlano.servico_id) return 'wrong-service'
    const jaNoSlot = (draggingMat.slots ?? []).some(s => s.slot_id === slot.id && s.ativo !== false)
    if (jaNoSlot) return 'already-enrolled'
    if (slot.vagas_livres <= 0) return 'full'
    const slotsAtivos = (draggingMat.slots ?? []).filter(s => s.ativo !== false).length
    if (slotsAtivos >= draggingPlano.dias_semana) return 'plan-complete'
    return 'ok'
  }

  // ── Toast ──────────────────────────────────────────────────────────────────
  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Handlers DnD ──────────────────────────────────────────────────────────
  function handleDragStart(matriculaId: string) { setDraggingMatId(matriculaId) }
  function handleDragEnd()                       { setDraggingMatId(null); setDragOverSlotId(null) }

  function handleDragOver(e: React.DragEvent, slot: SlotComVagas) {
    e.preventDefault()
    setDragOverSlotId(slot.id)
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear if truly leaving the element (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverSlotId(null)
    }
  }

  function handleDrop(e: React.DragEvent, slot: SlotComVagas) {
    e.preventDefault()
    setDragOverSlotId(null)
    if (!draggingMatId) return

    const status = canDropOnSlot(slot)
    if (status !== 'ok') {
      const msgs: Record<DropStatus, string> = {
        'wrong-service':   'Serviço diferente do plano do aluno.',
        'full':            'Este horário está lotado.',
        'already-enrolled':'O aluno já está neste horário.',
        'plan-complete':   'O aluno já completou todos os horários do plano.',
        'ok':              '',
      }
      showToast(msgs[status], false)
      return
    }

    const matId = draggingMatId
    setDraggingMatId(null)
    startT(async () => {
      const r = await atribuirSlotAlunoAction(matId, slot.id)
      if ('error' in r) { showToast(r.error, false); return }
      showToast('Aluno adicionado ao horário!')
      onAtualizar()
    })
  }

  function toggleExpandido(planoId: string) {
    setExpandidos(prev => ({ ...prev, [planoId]: !(prev[planoId] ?? true) }))
  }

  function abrirMenuCard(matId: string) {
    setCardMenuAberto(prev => (prev === matId ? null : matId))
    setEditandoDatas(null)
    setConfirmEncerramento(null)
  }

  function abrirEditarDatas(mat: NovaMatricula) {
    setEditandoDatas(mat.id)
    setEditDatasForm({ inicio: mat.data_matricula ?? '', saida: mat.data_saida ?? '' })
    setCardMenuAberto(null)
    setConfirmEncerramento(null)
  }

  async function salvarDatas(matId: string) {
    if (!editDatasForm.inicio) { showToast('Data de início obrigatória.', false); return }
    setSavingMat(matId)
    const r = await editarDatasMatriculaAction(matId, editDatasForm.inicio, editDatasForm.saida || null)
    setSavingMat(null)
    if ('error' in r) { showToast(r.error, false); return }
    setEditandoDatas(null)
    showToast('Matrícula atualizada.', true)
    onAtualizar()
  }

  async function handleGerarContrato(matId: string) {
    setGerandoContrato(matId)
    setCardMenuAberto(null)
    const r = await gerarContratoAlunoAction(matId)
    setGerandoContrato(null)
    if ('error' in r) { showToast(r.error, false); return }
    const html = gerarPDFContrato(r.config, r.aluno, r.plano)
    abrirContratoPDF(html)
  }

  async function encerrarMat(matId: string) {
    setSavingMat(matId)
    const r = await encerrarMatriculaAction(matId)
    setSavingMat(null)
    setConfirmEncerramento(null)
    if ('error' in r && r.error !== 'MATRICULA_JA_ENCERRADA') { showToast(r.error, false); return }
    showToast('Matrícula encerrada.', true)
    onAtualizar()
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-5 items-start">

      {/* ══════════════════ SIDEBAR ══════════════════ */}
      <div className="w-64 flex-shrink-0 space-y-3">
        {/* Header sidebar */}
        <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm px-4 py-3">
          <p className="font-bold text-sm text-[#2C3E50]">Alunos Matriculados</p>
          <p className="text-[11px] text-[#7F8C8D] mt-0.5">Arraste para agendar</p>
        </div>

        {/* Grupos de planos */}
        {gruposPlano.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8E8E8] p-8 text-center">
            <p className="text-sm text-[#7F8C8D]">Nenhum aluno matriculado no novo modelo</p>
          </div>
        ) : (
          gruposPlano.map(({ plano, alunos }) => {
            const cor         = getServiceColor(plano.servico_id)
            const temPendente = alunos.some(a => a.pendentes > 0)
            const isOpen      = expandidos[plano.id] ?? true

            return (
              <div key={plano.id} className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden">
                {/* Cabeçalho do grupo */}
                <div className="flex items-center">
                  <button
                    onClick={() => toggleExpandido(plano.id)}
                    className="flex-1 flex items-center gap-2.5 px-3 py-3 hover:bg-[#F8F9FA] transition-colors min-w-0"
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cor }} />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[11px] font-bold text-[#2C3E50] leading-tight truncate">
                        {plano.servicos?.nome ?? 'Serviço'} · {plano.dias_semana}x/semana
                      </p>
                      <p className="text-[10px] text-[#7F8C8D]">
                        R$ {plano.valor_mensal.toFixed(0)}/mês · {alunos.length} aluno(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {temPendente && <AlertTriangle size={12} className="text-[#E74C3C]" />}
                      {isOpen
                        ? <ChevronUp size={13} className="text-[#7F8C8D]" />
                        : <ChevronDown size={13} className="text-[#7F8C8D]" />
                      }
                    </div>
                  </button>
                  {/* Botão matricular aluno no plano */}
                  <button
                    onClick={e => { e.stopPropagation(); setMatriculandoPlano(plano) }}
                    title="Matricular aluno neste plano"
                    className="self-stretch px-3 border-l border-[#F0F0F0] flex items-center justify-center text-[#4A3AE8] hover:bg-[#4A3AE8] hover:text-white hover:border-[#4A3AE8] transition-all duration-150 flex-shrink-0 cursor-pointer"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                {/* Cards dos alunos */}
                {isOpen && (
                  <div className="border-t border-[#F0F0F0] p-2 space-y-1.5">
                    {alunos.map(({ mat, slotsAtivos, pendentes }) => {
                      const nome        = mat.pacientes?.nome ?? 'Aluno'
                      const initials    = getInitials(nome)
                      const isDragging  = draggingMatId === mat.id
                      const menuAberto  = cardMenuAberto === mat.id
                      const emEdicao    = editandoDatas === mat.id
                      const emConfirm   = confirmEncerramento === mat.id
                      const isSaving    = savingMat === mat.id

                      return (
                        <div
                          key={mat.id}
                          className={`rounded-xl border transition-all overflow-hidden ${menuAberto || emEdicao || emConfirm ? 'border-[#4A3AE8]/30 shadow-sm' : 'border-[#E8E8E8]'}`}
                          style={{ opacity: isDragging ? 0.4 : 1 }}
                        >
                          {/* Linha principal do card (draggable) */}
                          <div
                            draggable={!menuAberto && !emEdicao && !emConfirm}
                            onDragStart={() => handleDragStart(mat.id)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center gap-2.5 p-2 bg-[#FAFAFA] ${!menuAberto && !emEdicao && !emConfirm ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} select-none`}
                          >
                            {/* Avatar */}
                            <div
                              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold"
                              style={{ background: cor }}
                            >
                              {initials}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-[#2C3E50] truncate">{nome}</p>
                              {pendentes > 0 ? (
                                <>
                                  <p className="text-[10px] text-[#E74C3C] font-semibold">
                                    Pendente ({slotsAtivos}/{plano.dias_semana})
                                  </p>
                                  <div className="h-0.5 bg-[#E8E8E8] rounded-full mt-0.5 overflow-hidden">
                                    <div className="h-full rounded-full bg-[#E74C3C]" style={{ width: `${(slotsAtivos / plano.dias_semana) * 100}%` }} />
                                  </div>
                                </>
                              ) : (
                                <p className="text-[10px] text-[#27AE60] font-semibold">
                                  {slotsAtivos}/{plano.dias_semana} agendados ✓
                                </p>
                              )}
                            </div>

                            {/* Botão de menu */}
                            <button
                              draggable={false}
                              onClick={e => { e.stopPropagation(); abrirMenuCard(mat.id) }}
                              className={`h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${menuAberto ? 'bg-[#4A3AE8] text-white' : 'text-[#B0B0B0] hover:text-[#4A3AE8] hover:bg-[#4A3AE8]/10'}`}
                              title="Opções da matrícula"
                            >
                              <MoreVertical size={13} />
                            </button>
                          </div>

                          {/* ── Menu de ações ── */}
                          {menuAberto && !emEdicao && !emConfirm && (
                            <div className="border-t border-[#EEE] bg-white px-2 py-1.5 space-y-1">
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => abrirEditarDatas(mat)}
                                  className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-lg text-[11px] font-semibold text-[#4A3AE8] bg-[#4A3AE8]/8 hover:bg-[#4A3AE8]/15 transition-colors cursor-pointer"
                                >
                                  <Pencil size={11} /> Editar
                                </button>
                                <button
                                  onClick={() => { setConfirmEncerramento(mat.id); setCardMenuAberto(null) }}
                                  className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-lg text-[11px] font-semibold text-[#E74C3C] bg-[#E74C3C]/8 hover:bg-[#E74C3C]/15 transition-colors cursor-pointer"
                                >
                                  <Trash2 size={11} /> Excluir
                                </button>
                              </div>
                              <button
                                onClick={() => handleGerarContrato(mat.id)}
                                disabled={gerandoContrato === mat.id}
                                className="w-full flex items-center justify-center gap-1.5 h-7 rounded-lg text-[11px] font-semibold text-[#27AE60] bg-[#27AE60]/8 hover:bg-[#27AE60]/15 disabled:opacity-50 transition-colors cursor-pointer"
                              >
                                {gerandoContrato === mat.id
                                  ? <><Loader2 size={11} className="animate-spin" /> Gerando…</>
                                  : <><FileText size={11} /> Contrato PDF</>}
                              </button>
                            </div>
                          )}

                          {/* ── Formulário de edição de datas ── */}
                          {emEdicao && (
                            <div className="border-t border-[#EEE] bg-white px-3 py-3 space-y-2.5">
                              <div>
                                <label className="block text-[10px] font-bold text-[#7F8C8D] uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <Calendar size={9} /> Data de início <span className="text-[#E74C3C]">*</span>
                                </label>
                                <input
                                  type="date"
                                  value={editDatasForm.inicio}
                                  onChange={e => setEditDatasForm(p => ({ ...p, inicio: e.target.value }))}
                                  className="w-full h-8 px-2.5 border border-[#E8E8E8] rounded-lg text-xs outline-none focus:border-[#4A3AE8] bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-[#7F8C8D] uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <Calendar size={9} /> Desmatrícula <span className="font-normal text-[#7F8C8D] normal-case">(opcional)</span>
                                </label>
                                <input
                                  type="date"
                                  value={editDatasForm.saida}
                                  min={editDatasForm.inicio || undefined}
                                  onChange={e => setEditDatasForm(p => ({ ...p, saida: e.target.value }))}
                                  className="w-full h-8 px-2.5 border border-[#E8E8E8] rounded-lg text-xs outline-none focus:border-[#4A3AE8] bg-white"
                                />
                              </div>
                              <div className="flex gap-1.5 pt-0.5">
                                <button
                                  onClick={() => { setEditandoDatas(null); setCardMenuAberto(null) }}
                                  className="flex-1 h-7 rounded-lg border border-[#E8E8E8] text-[11px] text-[#7F8C8D] hover:text-[#2C3E50] cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => salvarDatas(mat.id)}
                                  disabled={isSaving}
                                  className="flex-1 h-7 rounded-lg bg-[#4A3AE8] text-white text-[11px] font-semibold hover:bg-[#3D2ED6] disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  {isSaving ? '…' : <><Check size={10} /> Salvar</>}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* ── Confirmação de encerramento ── */}
                          {emConfirm && (
                            <div className="border-t border-[#EEE] bg-[#E74C3C]/5 px-3 py-2.5">
                              <p className="text-[11px] font-semibold text-[#E74C3C] mb-2">
                                Encerrar matrícula de <strong>{nome}</strong>?
                              </p>
                              <p className="text-[10px] text-[#7F8C8D] mb-2.5">
                                Os horários serão desvinculados e a matrícula encerrada.
                              </p>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => setConfirmEncerramento(null)}
                                  className="flex-1 h-7 rounded-lg border border-[#E8E8E8] bg-white text-[11px] text-[#7F8C8D] hover:text-[#2C3E50] cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => encerrarMat(mat.id)}
                                  disabled={isSaving}
                                  className="flex-1 h-7 rounded-lg bg-[#E74C3C] text-white text-[11px] font-semibold hover:bg-[#C0392B] disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  {isSaving ? '…' : <><Trash2 size={10} /> Encerrar</>}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* Botão Novo Plano */}
        <button
          onClick={() => setModalNovoPlano(true)}
          className="w-full h-10 rounded-xl border border-dashed border-[#4A3AE8]/40 text-[#4A3AE8] text-sm font-semibold hover:bg-[#4A3AE8]/5 flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={14} /> Novo Plano
        </button>
      </div>

      {/* ══════════════════ QUADRO DE HORÁRIOS ══════════════════ */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header calendário */}
        <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm px-5 py-3 flex items-center gap-3 flex-wrap">
          <h2 className="font-bold text-[#2C3E50] text-base">Quadro de Horários</h2>

          {/* Navegação semanal */}
          <div className="flex items-center gap-1.5 ml-1">
            <button
              onClick={() => setSemanaOffset(o => o - 1)}
              className="h-7 w-7 rounded-lg border border-[#E8E8E8] flex items-center justify-center hover:bg-[#F0F0F0] transition-colors"
            >
              <ChevronLeft size={13} className="text-[#7F8C8D]" />
            </button>
            <span className="text-xs font-semibold text-[#2C3E50] whitespace-nowrap px-1">
              Semana Atual: {weekLabel}
            </span>
            <button
              onClick={() => setSemanaOffset(o => o + 1)}
              className="h-7 w-7 rounded-lg border border-[#E8E8E8] flex items-center justify-center hover:bg-[#F0F0F0] transition-colors"
            >
              <ChevronRight size={13} className="text-[#7F8C8D]" />
            </button>
          </div>

          <div className="ml-auto">
            <button
              onClick={() => setModalCriar(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[#4A3AE8] text-white text-sm font-semibold hover:bg-[#3D2ED6] shadow-sm"
            >
              <Plus size={14} /> Nova Turma
            </button>
          </div>
        </div>

        {/* Grid Mon–Sex */}
        <div className="grid grid-cols-5 gap-3">
          {DIAS_SEMANA.map(({ dia, label }, colIdx) => {
            const date      = weekDates[colIdx]
            const daySlots  = slotsByDia[dia] ?? []
            const dateLabel = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

            return (
              <div key={dia} className="space-y-2">
                {/* Cabeçalho do dia */}
                <div className="text-center py-1">
                  <p className="text-[11px] font-bold text-[#7F8C8D] uppercase tracking-wider">{label}</p>
                  <p className="text-[10px] text-[#B0B0B0]">{dateLabel}</p>
                </div>

                {/* Horários do dia */}
                {daySlots.length === 0 ? (
                  <div className="h-20 rounded-xl border border-dashed border-[#E0E0E0] bg-[#FAFAFA] flex items-center justify-center">
                    <p className="text-[11px] text-[#C0C0C0] italic">Livre</p>
                  </div>
                ) : (
                  daySlots.map(slot => {
                    const cor      = getServiceColor(slot.turmas?.servico_id ?? null)
                    const ocupados = slot.vagas_total - slot.vagas_livres
                    const pct      = slot.vagas_total > 0 ? Math.round((ocupados / slot.vagas_total) * 100) : 0
                    const lotado   = slot.vagas_livres <= 0
                    const corBarra = pct >= 90 ? '#E74C3C' : pct >= 70 ? '#E67E22' : '#27AE60'

                    const isDragOver = dragOverSlotId === slot.id && !!draggingMatId
                    const dropStatus = isDragOver ? canDropOnSlot(slot) : null
                    const dropOk     = dropStatus === 'ok'

                    return (
                      <div
                        key={slot.id}
                        onClick={() => { if (!draggingMatId) setSlotDetalhe(slot) }}
                        onDragOver={e => handleDragOver(e, slot)}
                        onDragLeave={handleDragLeave}
                        onDrop={e => handleDrop(e, slot)}
                        className={[
                          'rounded-xl border-2 p-2.5 transition-all relative group overflow-hidden',
                          isDragOver
                            ? (dropOk
                                ? 'border-[#27AE60] bg-[#27AE60]/8 shadow-md'
                                : 'border-[#E74C3C] bg-[#E74C3C]/8')
                            : 'border-[#E8E8E8] bg-white hover:shadow-sm',
                          draggingMatId && !isDragOver ? 'opacity-80' : '',
                          !draggingMatId ? 'cursor-pointer' : '',
                        ].join(' ')}
                        style={{ borderLeftWidth: '3px', borderLeftColor: cor }}
                      >
                        {/* Hora */}
                        <p className="text-xs font-bold text-[#2C3E50]">{slot.hora_inicio}</p>

                        {/* Nome da turma */}
                        <p className="text-[11px] font-semibold text-[#2C3E50] truncate mt-0.5">
                          {slot.turmas?.nome ?? 'Turma'}
                        </p>

                        {/* Barra de ocupação */}
                        <div className="mt-1.5">
                          {lotado ? (
                            <p className="text-[10px] font-bold text-[#E74C3C]">
                              Lotado ({ocupados}/{slot.vagas_total})
                            </p>
                          ) : (
                            <p className="text-[10px] text-[#7F8C8D]">
                              Vagas: {ocupados}/{slot.vagas_total}
                            </p>
                          )}
                          <div className="h-1 bg-[#E8E8E8] rounded-full overflow-hidden mt-0.5">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: corBarra }}
                            />
                          </div>
                        </div>

                        {/* Ações rápidas no hover (apenas quando não está arrastando) */}
                        {!draggingMatId && (
                          <div className="absolute top-1.5 right-1.5 hidden group-hover:flex gap-1">
                            <Link
                              href={`/turmas/${slot.turma_id}/presenca`}
                              className="h-6 w-6 rounded-md bg-white border border-[#E8E8E8] flex items-center justify-center hover:border-[#4A3AE8]/40 hover:text-[#4A3AE8] transition-colors shadow-sm"
                              title="Fazer chamada"
                            >
                              <ClipboardList size={11} className="text-[#4A3AE8]" />
                            </Link>
                          </div>
                        )}

                        {/* Indicador visual de drop válido */}
                        {isDragOver && dropOk && (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#27AE60]/10 rounded-xl pointer-events-none">
                            <span className="text-[11px] font-bold text-[#27AE60] bg-white px-2 py-0.5 rounded-full shadow-sm">
                              Soltar aqui
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )
          })}
        </div>

        {/* Legenda de cores */}
        {servicos.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E8E8E8] px-4 py-2.5 flex items-center gap-4 flex-wrap">
            <span className="text-[11px] font-semibold text-[#7F8C8D]">Serviços:</span>
            {servicos.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: SERVICE_PALETTE[i % SERVICE_PALETTE.length] }} />
                <span className="text-[11px] text-[#2C3E50]">{s.nome}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modais ── */}
      {modalCriar && (
        <TurmaFormModal
          profissionais={profissionais}
          salas={salas}
          servicos={servicos}
          onClose={() => setModalCriar(false)}
          onCriado={(_id, _sessoes) => { setModalCriar(false); onAtualizar() }}
        />
      )}

      {matriculandoPlano && (
        <MatricularNoPlanModal
          plano={matriculandoPlano}
          pacientes={pacientes}
          novasMatriculas={novasMatriculas}
          onClose={() => setMatriculandoPlano(null)}
          onConfirmado={(criadas) => {
            setMatriculandoPlano(null)
            showToast(`${criadas} aluno(s) matriculado(s) com sucesso!`, true)
            onAtualizar()
          }}
        />
      )}

      {slotDetalhe && (
        <SlotGestaoModal
          slot={slotDetalhe}
          turma={turmaMap[slotDetalhe.turma_id] ?? null}
          novasMatriculas={novasMatriculas}
          matriculas={matriculas}
          servicos={servicos}
          profissionais={profissionais}
          salas={salas}
          onClose={() => setSlotDetalhe(null)}
          onAtualizar={() => onAtualizar()}
        />
      )}

      {/* ── Modal Novo Plano ── */}
      {modalNovoPlano && (
        <NovoPlanoModal
          servicos={servicos}
          onClose={() => setModalNovoPlano(false)}
          onCriado={() => {
            setModalNovoPlano(false)
            setToast({ msg: 'Plano criado com sucesso!', ok: true })
            setTimeout(() => setToast(null), 4000)
            onAtualizar()
          }}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 text-white text-sm px-4 py-3 rounded-xl shadow-lg ${toast.ok ? 'bg-[#27AE60]' : 'bg-[#E74C3C]'}`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ─── Modal Novo Plano ─────────────────────────────────────────────────────────

function NovoPlanoModal({
  servicos,
  onClose,
  onCriado,
}: {
  servicos: { id: string; nome: string }[]
  onClose: () => void
  onCriado: () => void
}) {
  const [nome,       setNome]       = useState('')
  const [servicoId,  setServicoId]  = useState('')
  const [diasSemana, setDiasSemana] = useState(2)
  const [valor,      setValor]      = useState(0)
  const [saving,     setSaving]     = useState(false)
  const [erro,       setErro]       = useState('')

  async function salvar() {
    if (!nome.trim())   { setErro('Informe o nome do plano.'); return }
    if (!servicoId)     { setErro('Selecione um serviço.'); return }
    if (diasSemana < 1) { setErro('Dias/semana deve ser pelo menos 1.'); return }
    setSaving(true); setErro('')
    const r = await salvarPlanoServicoAction({
      servico_id:   servicoId,
      nome:         nome.trim(),
      dias_semana:  diasSemana,
      valor_mensal: valor,
      ativo:        true,
    })
    setSaving(false)
    if ('error' in r) { setErro('Erro ao salvar: ' + r.error); return }
    onCriado()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9]">
          <h2 className="font-bold text-[#2C3E50]">Novo Plano</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#64748B] transition-colors">
            <XIcon size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold text-[#7F8C8D] mb-1.5">Nome do plano *</label>
            <input
              autoFocus
              value={nome}
              onChange={e => setNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && salvar()}
              placeholder="Ex: Plano 2x Pilates"
              className="w-full h-10 px-3 border border-[#E8E8E8] rounded-xl text-sm outline-none focus:border-[#4A3AE8] transition-colors"
            />
          </div>

          {/* Serviço + Dias/semana */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[#7F8C8D] mb-1.5">Serviço *</label>
              {servicos.length === 0 ? (
                <div className="flex items-center gap-2 h-10 px-3 border border-[#E74C3C]/40 bg-[#E74C3C]/5 rounded-xl text-xs text-[#E74C3C]">
                  <AlertCircle size={13} />
                  Cadastre serviços em Equipe → Serviços
                </div>
              ) : (
                <select
                  value={servicoId}
                  onChange={e => setServicoId(e.target.value)}
                  className="w-full h-10 px-3 border border-[#E8E8E8] rounded-xl text-sm outline-none focus:border-[#4A3AE8] bg-white transition-colors"
                >
                  <option value="">Selecionar...</option>
                  {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#7F8C8D] mb-1.5">Dias/semana *</label>
              <input
                type="number"
                min={1}
                max={7}
                value={diasSemana}
                onChange={e => setDiasSemana(Number(e.target.value))}
                className="w-full h-10 px-3 border border-[#E8E8E8] rounded-xl text-sm outline-none focus:border-[#4A3AE8] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#7F8C8D] mb-1.5">Valor mensal (R$)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={valor}
                onChange={e => setValor(Number(e.target.value))}
                className="w-full h-10 px-3 border border-[#E8E8E8] rounded-xl text-sm outline-none focus:border-[#4A3AE8] transition-colors"
              />
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm text-[#E74C3C]">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              {erro}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-6 pb-5">
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-xl border border-[#E8E8E8] text-sm font-semibold text-[#7F8C8D] hover:text-[#2C3E50] hover:border-[#CBD5E1] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={saving || servicos.length === 0}
            className="h-10 px-6 rounded-xl bg-[#4A3AE8] text-white text-sm font-bold hover:bg-[#3D2ED6] disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
