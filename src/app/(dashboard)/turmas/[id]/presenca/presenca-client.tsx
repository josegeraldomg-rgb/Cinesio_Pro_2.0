'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Lock, CheckSquare, Square, ChevronDown, BookOpen, Save, Gift, MessageCircle, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import type { PresencaAluno, SessaoPresenca, Sequencia, ConfigPresenca } from './actions'
import { salvarPresencaEvolucaoAction, criarCreditoReposicaoAction } from './actions'
import { SequenciasModal } from '@/components/turmas/sequencias-modal'

interface Props {
  turmaId: string
  turmaNome: string
  sessoes: { id: string; data_hora: string; status: string }[]
  sessaoAtual: SessaoPresenca
  sessaoIdInicial: string
  alunosIniciais: PresencaAluno[]
  presencasExistentes: Record<string, { status: string; evolucao_individual: string | null }>
  travada: boolean
  config: ConfigPresenca
  sequencias: Sequencia[]
}

type StatusPresenca = 'presente' | 'faltou' | 'justificado' | ''

export function PresencaClient(props: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Inicializa estado com presenças já existentes
  const [alunos, setAlunos] = useState<PresencaAluno[]>(() =>
    props.alunosIniciais.map(a => ({
      ...a,
      status: (props.presencasExistentes[a.paciente_id]?.status as StatusPresenca) ?? '',
      evolucao_individual: props.presencasExistentes[a.paciente_id]?.evolucao_individual ?? '',
    }))
  )

  const [evolucaoPadrao, setEvolucaoPadrao] = useState(props.sessaoAtual.evolucao_padrao ?? '')
  const [sequenciaIds, setSequenciaIds] = useState<string[]>(props.sessaoAtual.sequencias_ids)
  const [sequencias, setSequencias] = useState<Sequencia[]>(props.sequencias)
  const [seqModalAberto, setSeqModalAberto] = useState(false)

  // Créditos pendentes: paciente_id → true se deve gerar crédito
  const [creditosPendentes, setCreditosPendentes] = useState<Record<string, boolean>>({})
  const [creditosProcessando, setCreditosProcessando] = useState<Record<string, boolean>>({})

  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'erro' } | null>(null)
  const [salvando, setSalvando] = useState(false)

  function showToast(msg: string, tipo: 'ok' | 'erro') {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  function marcarTodosPresentes() {
    setAlunos(prev => prev.map(a => ({ ...a, status: 'presente' as StatusPresenca })))
  }

  function setStatus(pacienteId: string, status: StatusPresenca) {
    setAlunos(prev => prev.map(a =>
      a.paciente_id === pacienteId ? { ...a, status } : a
    ))
    // Se trocou de faltou para outro, remove crédito pendente
    if (status !== 'faltou') {
      setCreditosPendentes(prev => { const n = { ...prev }; delete n[pacienteId]; return n })
    }
  }

  function setEvolucaoIndividual(pacienteId: string, texto: string) {
    setAlunos(prev => prev.map(a =>
      a.paciente_id === pacienteId ? { ...a, evolucao_individual: texto } : a
    ))
  }

  async function gerarCredito(aluno: PresencaAluno) {
    setCreditosProcessando(prev => ({ ...prev, [aluno.paciente_id]: true }))
    try {
      const res = await criarCreditoReposicaoAction({
        paciente_id: aluno.paciente_id,
        turma_id: props.sessaoAtual.turma_id,
        sessao_id: props.sessaoAtual.id,
        motivo: 'Falta na sessão',
        telefone: aluno.paciente_telefone,
        ddi: aluno.paciente_ddi,
      })
      if ('error' in res) {
        showToast(res.error, 'erro')
      } else {
        // Marca como crédito gerado (não mais pendente)
        setCreditosPendentes(prev => { const n = { ...prev }; delete n[aluno.paciente_id]; return n })
        showToast(`Crédito gerado para ${aluno.paciente_nome}`, 'ok')
        if (res.link_whatsapp) {
          window.open(res.link_whatsapp, '_blank')
        }
      }
    } finally {
      setCreditosProcessando(prev => { const n = { ...prev }; delete n[aluno.paciente_id]; return n })
    }
  }

  async function handleSalvar() {
    if (props.travada) { showToast('Sessão travada para edição.', 'erro'); return }
    setSalvando(true)
    try {
      const res = await salvarPresencaEvolucaoAction({
        sessao_id: props.sessaoAtual.id,
        turma_id: props.sessaoAtual.turma_id,
        profissional_id: props.sessaoAtual.profissional_id,
        evolucao_padrao: evolucaoPadrao,
        sequencia_id: sequenciaIds[0] ?? null,
        sequencias_ids: sequenciaIds,
        presencas: alunos.map(a => ({
          paciente_id: a.paciente_id,
          status: a.status,
          evolucao_individual: a.evolucao_individual,
        })),
      })

      if ('error' in res) {
        showToast(res.error, 'erro')
      } else {
        // Gera créditos pendentes
        const pendentes = alunos.filter(a => creditosPendentes[a.paciente_id])
        for (const aluno of pendentes) {
          await gerarCredito(aluno)
        }
        showToast('Chamada salva com sucesso!', 'ok')
        router.refresh()
      }
    } finally {
      setSalvando(false)
    }
  }

  const sequenciasSelecionadas = sequencias.filter(s => sequenciaIds.includes(s.id))

  function toggleSequencia(id: string) {
    setSequenciaIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const todosPresentes = alunos.length > 0 && alunos.every(a => a.status === 'presente')
  const presenteCount = alunos.filter(a => a.status === 'presente').length
  const faltouCount = alunos.filter(a => a.status === 'faltou').length

  function formatarDataHora(iso: string) {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Breadcrumb + cabeçalho */}
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm text-[#7F8C8D]">
          <Link href="/turmas" className="hover:text-[#2C3E50] flex items-center gap-1">
            <ChevronLeft size={15} />
            Turmas
          </Link>
          <span>/</span>
          <span className="text-[#2C3E50] font-medium">{props.turmaNome}</span>
          <span>/</span>
          <span className="text-[#2C3E50] font-medium">Presença</span>
        </div>

        {props.travada && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-amber-700 text-xs font-medium">
            <Lock size={13} />
            Sessão travada ({props.config.trava_horas}h expiradas)
          </div>
        )}
      </div>

      {/* Seletor de sessão */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-sm text-[#7F8C8D]">Sessão:</span>
        <div className="relative">
          <select
            className="appearance-none bg-white border border-[#E8E8E8] rounded-lg px-3 py-1.5 pr-8 text-sm text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#4A3AE8]/30"
            value={props.sessaoIdInicial}
            onChange={e => router.push(`/turmas/${props.turmaId}/presenca?sessao=${e.target.value}`)}
          >
            {props.sessoes.map(s => (
              <option key={s.id} value={s.id}>
                {formatarDataHora(s.data_hora)} · {s.status === 'realizada' ? 'Realizada' : s.status === 'cancelada' ? 'Cancelada' : 'Agendada'}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7F8C8D] pointer-events-none" />
        </div>
      </div>

      {/* Layout principal 2 colunas */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-auto">

        {/* Coluna esquerda — Chamada */}
        <div className="bg-white rounded-xl border border-[#E8E8E8] shadow-sm flex flex-col">
          <div className="p-4 border-b border-[#F0F0F0] flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[#2C3E50] text-sm">Chamada</h2>
              <p className="text-xs text-[#7F8C8D] mt-0.5">
                {presenteCount} presente{presenteCount !== 1 ? 's' : ''} · {faltouCount} falt{faltouCount !== 1 ? 'aram' : 'ou'}
              </p>
            </div>
            {!props.travada && (
              <button
                onClick={marcarTodosPresentes}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  todosPresentes
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-[#F8F9FA] text-[#7F8C8D] hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                {todosPresentes ? <CheckSquare size={13} /> : <Square size={13} />}
                Todos Presentes
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-3 space-y-2">
            {alunos.length === 0 && (
              <p className="text-sm text-[#7F8C8D] text-center py-8">Nenhum aluno matriculado.</p>
            )}
            {alunos.map(aluno => (
              <AlunoRow
                key={aluno.paciente_id}
                aluno={aluno}
                travada={props.travada}
                creditoPendente={!!creditosPendentes[aluno.paciente_id]}
                creditoProcessando={!!creditosProcessando[aluno.paciente_id]}
                onStatus={s => setStatus(aluno.paciente_id, s)}
                onCreditoToggle={v => setCreditosPendentes(prev => ({ ...prev, [aluno.paciente_id]: v }))}
              />
            ))}
          </div>
        </div>

        {/* Coluna direita — Evolução */}
        <div className="bg-white rounded-xl border border-[#E8E8E8] shadow-sm flex flex-col">
          <div className="p-4 border-b border-[#F0F0F0]">
            <h2 className="font-semibold text-[#2C3E50] text-sm">Evolução da Sessão</h2>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-5">
            {/* Seletor de sequências (multi-seleção) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#7F8C8D] uppercase tracking-wide">
                  Sequências de Exercícios
                  {sequenciaIds.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-[#4A3AE8] text-white rounded-full text-[10px] font-bold">
                      {sequenciaIds.length}
                    </span>
                  )}
                </label>
                <button
                  onClick={() => setSeqModalAberto(true)}
                  className="flex items-center gap-1 px-2 py-1 bg-[#F8F9FA] border border-[#E8E8E8] rounded-lg text-xs font-medium text-[#2C3E50] hover:bg-[#EDF0F2] transition-colors"
                >
                  <BookOpen size={12} />
                  Biblioteca
                </button>
              </div>

              {/* Lista de sequências como checkboxes */}
              {sequencias.length === 0 ? (
                <p className="text-xs text-[#7F8C8D] italic">Nenhuma sequência cadastrada. Use a Biblioteca para criar.</p>
              ) : (
                <div className="border border-[#E8E8E8] rounded-lg overflow-hidden">
                  {sequencias.map((s, i) => {
                    const selecionada = sequenciaIds.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        disabled={props.travada}
                        onClick={() => toggleSequencia(s.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors disabled:opacity-60 ${
                          i > 0 ? 'border-t border-[#F0F0F0]' : ''
                        } ${selecionada ? 'bg-[#4A3AE8]/5' : 'bg-white hover:bg-[#F8F9FA]'}`}
                      >
                        <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                          selecionada ? 'bg-[#4A3AE8] border-[#4A3AE8]' : 'border-[#D1D5DB]'
                        }`}>
                          {selecionada && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span className={`text-sm flex-1 ${selecionada ? 'font-semibold text-[#2C3E50]' : 'text-[#4B5563]'}`}>
                          {s.nome}
                        </span>
                        {s.exercicios.length > 0 && (
                          <span className="text-xs text-[#9CA3AF]">{s.exercicios.length} ex.</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Preview dos exercícios das sequências selecionadas */}
              {sequenciasSelecionadas.length > 0 && (
                <div className="mt-2 space-y-2">
                  {sequenciasSelecionadas.map(seq => (
                    seq.exercicios.length > 0 && (
                      <div key={seq.id} className="p-3 bg-[#F8F9FA] rounded-lg">
                        <p className="text-[10px] font-bold text-[#4A3AE8] uppercase tracking-wide mb-1.5">{seq.nome}</p>
                        <div className="space-y-1">
                          {seq.exercicios.map((ex, i) => (
                            <div key={i} className="text-xs text-[#2C3E50] flex gap-2">
                              <span className="text-[#7F8C8D] w-4">{i + 1}.</span>
                              <span className="font-medium">{ex.nome_exercicio}</span>
                              {(ex.series || ex.repeticoes) && (
                                <span className="text-[#7F8C8D]">
                                  {ex.series ? `${ex.series}x` : ''}{ex.repeticoes ?? ''}
                                  {ex.carga ? ` · ${ex.carga}` : ''}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* Evolução padrão */}
            <div>
              <label className="text-xs font-medium text-[#7F8C8D] uppercase tracking-wide mb-1.5 block">
                Evolução Padrão (todos os alunos)
              </label>
              <textarea
                disabled={props.travada}
                rows={4}
                value={evolucaoPadrao}
                onChange={e => setEvolucaoPadrao(e.target.value)}
                placeholder="Descreva a evolução geral da sessão para todos os presentes..."
                className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm text-[#2C3E50] placeholder:text-[#BDC3C7] focus:outline-none focus:ring-2 focus:ring-[#4A3AE8]/30 resize-none disabled:opacity-60 disabled:bg-[#F8F9FA]"
              />
            </div>

            {/* Evolução individual por aluno */}
            <div>
              <p className="text-xs font-medium text-[#7F8C8D] uppercase tracking-wide mb-2">
                Por Aluno
              </p>
              <div className="space-y-3">
                {alunos.map(aluno => {
                  const presente = aluno.status === 'presente'
                  return (
                    <div key={aluno.paciente_id} className={presente ? '' : 'opacity-40'}>
                      <p className="text-xs font-medium text-[#2C3E50] mb-1">
                        {aluno.paciente_nome}
                        {!presente && aluno.status && (
                          <span className="ml-2 text-[#7F8C8D] font-normal">
                            ({aluno.status === 'faltou' ? 'faltou' : 'justificado'})
                          </span>
                        )}
                      </p>
                      <textarea
                        disabled={props.travada || !presente}
                        rows={2}
                        value={aluno.evolucao_individual}
                        onChange={e => setEvolucaoIndividual(aluno.paciente_id, e.target.value)}
                        placeholder={presente ? 'Evolução individual...' : '—'}
                        className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm text-[#2C3E50] placeholder:text-[#BDC3C7] focus:outline-none focus:ring-2 focus:ring-[#4A3AE8]/30 resize-none disabled:opacity-50 disabled:bg-[#F8F9FA]"
                      />
                    </div>
                  )
                })}
                {alunos.length === 0 && (
                  <p className="text-sm text-[#7F8C8D]">Nenhum aluno matriculado.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé — botão salvar */}
      {!props.travada && (
        <div className="flex-shrink-0 flex justify-end pt-1">
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="flex items-center gap-2 bg-[#4A3AE8] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#3829c7] shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={15} />
            {salvando ? 'Salvando…' : 'Salvar Chamada e Evolução'}
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.tipo === 'ok'
            ? 'bg-emerald-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {toast.tipo === 'erro' && <AlertTriangle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Modal de sequências */}
      {seqModalAberto && (
        <SequenciasModal
          sequenciasIniciais={sequencias}
          onClose={() => setSeqModalAberto(false)}
          onUpdate={setSequencias}
        />
      )}
    </div>
  )
}

// ─── AlunoRow ─────────────────────────────────────────────────────────────────

function AlunoRow({
  aluno,
  travada,
  creditoPendente,
  creditoProcessando,
  onStatus,
  onCreditoToggle,
}: {
  aluno: PresencaAluno
  travada: boolean
  creditoPendente: boolean
  creditoProcessando: boolean
  onStatus: (s: StatusPresenca) => void
  onCreditoToggle: (v: boolean) => void
}) {
  const STATUSES: { val: StatusPresenca; label: string; cor: string }[] = [
    { val: 'presente',   label: 'P', cor: 'bg-emerald-500 text-white' },
    { val: 'faltou',     label: 'F', cor: 'bg-red-500 text-white' },
    { val: 'justificado', label: 'J', cor: 'bg-amber-500 text-white' },
  ]

  const initials = aluno.paciente_nome
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase()

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F8F9FA] transition-colors">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-[#4A3AE8]/10 flex items-center justify-center text-xs font-bold text-[#4A3AE8] flex-shrink-0">
          {initials}
        </div>
        <span className="flex-1 text-sm font-medium text-[#2C3E50] truncate">{aluno.paciente_nome}</span>

        {/* Botões de status */}
        <div className="flex items-center gap-1">
          {STATUSES.map(s => (
            <button
              key={s.val}
              disabled={travada}
              onClick={() => onStatus(aluno.status === s.val ? '' : s.val)}
              className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${
                aluno.status === s.val
                  ? s.cor + ' shadow-sm scale-110'
                  : 'bg-[#F0F0F0] text-[#7F8C8D] hover:bg-[#E8E8E8]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={s.val === 'presente' ? 'Presente' : s.val === 'faltou' ? 'Faltou' : 'Justificado'}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt de crédito de reposição */}
      {aluno.status === 'faltou' && !travada && (
        <div className="ml-11 flex items-center gap-2 text-xs">
          <Gift size={12} className="text-[#7F8C8D]" />
          <span className="text-[#7F8C8D]">Gerar crédito de reposição?</span>
          {creditoPendente ? (
            <button
              onClick={() => onCreditoToggle(false)}
              className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium hover:bg-amber-200 transition-colors"
            >
              Cancelar
            </button>
          ) : (
            <button
              onClick={() => onCreditoToggle(true)}
              className="px-2 py-0.5 rounded-full bg-[#4A3AE8]/10 text-[#4A3AE8] font-medium hover:bg-[#4A3AE8]/20 transition-colors"
            >
              Sim
            </button>
          )}
          {creditoPendente && aluno.paciente_telefone && (
            <span className="text-amber-600">
              <MessageCircle size={12} className="inline mr-0.5" />
              WhatsApp será aberto ao salvar
            </span>
          )}
        </div>
      )}
    </div>
  )
}
