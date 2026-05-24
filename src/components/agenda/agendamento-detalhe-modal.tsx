'use client'

import { useState } from 'react'
import {
  X, Clock, User, Stethoscope, DollarSign, Monitor,
  MessageCircle, CalendarCheck, Pencil, AlertTriangle, Check, Repeat,
} from 'lucide-react'
import { atualizarStatusAgendamentoAction } from '@/app/(dashboard)/agenda/actions'
import { formatCurrency } from '@/lib/utils'
import type { Paciente } from '@/app/(dashboard)/agenda/agenda-page-client'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AgendamentoDetalhe {
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
  profissionais: { id?: string; nome: string; cor_agenda: string | null } | null
  servicos: { nome: string; tipo: string; valor?: number | null } | null
  salas?: { nome: string } | null
  criado_por?: { id: string; nome: string; perfil: string } | null
  recorrencia_id?: string | null
  recorrencias?: { frequencia: string; tipo_fim: string; total_sessoes?: number | null } | null
}

interface Props {
  agendamento: AgendamentoDetalhe
  paciente: Paciente | null          // dados completos (telefone, ddi)
  sessaoAtual?: number               // posição na série (1-based), se recorrente
  onClose: () => void
  onAlterar: () => void              // abre NovoAgendamentoModal pré-preenchido
  onStatusChange: (novoStatus: string) => void  // atualiza localmente no grid
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extrai "HH:MM" de qualquer formato Supabase:
 *  '2026-05-25T14:00:00+00:00' ou '2026-05-25 14:00:00+00'
 *  O caractere na posição 10 é sempre 'T' ou ' ', horas sempre em 11-15. */
function parseHora(dataHora: string): string {
  return dataHora.slice(11, 16)
}

function horaFim(dataHora: string, duracaoMin: number): string {
  const [h, m] = dataHora.slice(11, 16).split(':').map(Number)
  const totalMin = h * 60 + m + duracaoMin
  return `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`
}

/** Formata data por extenso sem depender do parsing de timezone do browser.
 *  Extrai ano/mês/dia diretamente da string para evitar off-by-one de TZ. */
function formatDataExtenso(dataHora: string): string {
  const [ano, mes, dia] = dataHora.slice(0, 10).split('-').map(Number)
  // new Date(y, m-1, d) usa horário local — sem risco de virar dia pelo offset UTC
  const d = new Date(ano, mes - 1, dia)
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

function formatDataHoraCriacao(ts?: string): string {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatTelefone(ddi: string | null, tel: string | null): string {
  if (!tel) return '—'
  const d = ddi && ddi !== '55' ? `+${ddi} ` : ''
  const t = tel.replace(/\D/g, '')
  if (t.length === 11) return `${d}(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}`
  if (t.length === 10) return `${d}(${t.slice(0, 2)}) ${t.slice(2, 6)}-${t.slice(6)}`
  return `${d}${tel}`
}

function waLink(ddi: string | null, tel: string | null, mensagem: string): string {
  if (!tel) return '#'
  const numero = ((ddi ?? '55') + tel).replace(/\D/g, '')
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
}

// ─── Badge de status ──────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  agendado:        { label: 'Aguardando Confirmação', bg: '#FFF3CD', text: '#856404', dot: '#F39C12' },
  confirmado:      { label: 'Confirmado',             bg: '#CCE5FF', text: '#004085', dot: '#3498DB' },
  em_atendimento:  { label: 'Em Atendimento',         bg: '#CCE5FF', text: '#004085', dot: '#3498DB' },
  realizado:       { label: 'Atendido',               bg: '#D4EDDA', text: '#155724', dot: '#27AE60' },
  cancelado:       { label: 'Cancelado',              bg: '#F8D7DA', text: '#721C24', dot: '#E74C3C' },
  faltou:          { label: 'Faltou',                 bg: '#E2E3E5', text: '#383D41', dot: '#7F8C8D' },
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AgendamentoDetalheModal({ agendamento, paciente, sessaoAtual, onClose, onAlterar, onStatusChange }: Props) {
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)   // qual ação está em loading
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)

  const ag    = agendamento
  const meta  = STATUS_META[ag.status] ?? STATUS_META.agendado
  const isFinal = ag.status === 'realizado' || ag.status === 'cancelado' || ag.status === 'faltou'

  const horaIni = parseHora(ag.data_hora)
  const horaFim_ = horaFim(ag.data_hora, ag.duracao_minutos)

  // ── Nomes formatados ──
  const nomeP  = ag.pacientes?.nome  ?? '—'
  const nomeS  = ag.servicos?.nome   ?? '—'
  const nomeProf = ag.profissionais?.nome ?? '—'
  const telFormatado = formatTelefone(paciente?.ddi ?? null, paciente?.telefone ?? null)

  // ── Canal / Agendado por ──
  const canalLabel = (() => {
    if (ag.canal === 'whatsapp_ia')    return 'IA · WhatsApp'
    if (ag.canal === 'paciente_app')   return 'App do Paciente'
    if (ag.criado_por) {
      const perfil = ag.criado_por.perfil
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
      return `${ag.criado_por.nome} · ${perfil}`
    }
    return 'Sistema'
  })()

  // ── Valor a exibir: salvo no agendamento → fallback valor do serviço ──
  const valorExibir = ag.valor ?? ag.servicos?.valor ?? null

  // ── Pacote / sessão ──
  const pacoteLabel = (() => {
    if (!ag.recorrencia_id) return null   // avulso — mostrado inline na linha

    const rec = ag.recorrencias
    const freqMap: Record<string, string> = {
      semanal: 'Semanal', quinzenal: 'Quinzenal',
      mensal: 'Mensal', personalizado: 'Personalizado',
    }
    const freq = freqMap[rec?.frequencia ?? ''] ?? ''

    // Total de sessões: confiamos em total_sessoes se tipo_fim='sessoes',
    // senão mostramos '?' (série por data, sem total fixo)
    const total = rec?.tipo_fim === 'sessoes' && rec.total_sessoes
      ? `${rec.total_sessoes}`
      : '?'

    const ordinal = sessaoAtual ? `${sessaoAtual}ª` : '—'

    return `${ordinal} de ${total} sessões${freq ? ` · ${freq}` : ''}`
  })()

  // ── Mensagens WhatsApp ──
  const dataLegivel = formatDataExtenso(ag.data_hora)
  const msgLembrete = `Olá, ${nomeP}! 👋\n\nLembramos que você tem uma sessão de *${nomeS}* agendada para *${dataLegivel}* às *${horaIni}* com *${nomeProf}*.\n\nAguardamos você! 😊`
  const msgCancelamento = `Olá, ${nomeP}! Informamos que seu agendamento de *${nomeS}* para *${dataLegivel}* às *${horaIni}* foi *cancelado*.\n\nPara reagendar ou em caso de dúvidas, entre em contato. 🙏`
  const msgAlteracao = `Olá, ${nomeP}! Seu agendamento de *${nomeS}* está sendo alterado. Em breve você receberá os novos dados confirmados. 📅`

  // ── Ações ──
  async function executarStatus(novoStatus: 'confirmado' | 'realizado' | 'cancelado' | 'faltou') {
    setLoading(novoStatus)
    setFeedback(null)
    const r = await atualizarStatusAgendamentoAction(ag.id, novoStatus)
    setLoading(null)
    if (r && 'error' in r) {
      setFeedback({ tipo: 'erro', msg: r.error ?? 'Erro ao atualizar.' })
    } else {
      onStatusChange(novoStatus)
      setFeedback({ tipo: 'ok', msg: novoStatus === 'cancelado' ? 'Agendamento cancelado.' : 'Status atualizado!' })
      setTimeout(onClose, 1200)
    }
  }

  function handleAlterar() {
    // Abre WA de notificação se tiver telefone, depois abre modal de edição
    if (paciente?.telefone) {
      window.open(waLink(paciente.ddi ?? null, paciente.telefone, msgAlteracao), '_blank')
    }
    onAlterar()
  }

  function handleCancelar() {
    if (!confirmandoCancelamento) {
      setConfirmandoCancelamento(true)
      return
    }
    // Abre WA de cancelamento e executa
    if (paciente?.telefone) {
      window.open(waLink(paciente.ddi ?? null, paciente.telefone, msgCancelamento), '_blank')
    }
    executarStatus('cancelado')
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8]">
          <div className="flex items-center gap-2 text-[#2C3E50]">
            <CalendarCheck size={18} className="text-[#4A3AE8]" />
            <h2 className="font-bold text-base">Detalhes do Agendamento</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#F8F9FA] text-[#7F8C8D]">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-4">

          {/* ── Badge de status ── */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: meta.bg, color: meta.text }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: meta.dot }} />
            {meta.label}
          </div>

          {/* ── Bloco horário ── */}
          <div className="bg-[#F8F9FA] rounded-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-[#4A3AE8]/10 text-[#4A3AE8] flex items-center justify-center flex-shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#7F8C8D] uppercase tracking-wider mb-0.5">Horário</p>
              <p className="text-2xl font-bold text-[#2C3E50]">
                {horaIni} <span className="text-[#7F8C8D] font-normal">—</span> {horaFim_}
              </p>
              <p className="text-xs text-[#7F8C8D] mt-0.5 capitalize">{formatDataExtenso(ag.data_hora)}</p>
            </div>
          </div>

          {/* ── Tabela de informações ── */}
          <div className="divide-y divide-[#F0F0F0]">
            {[
              { icon: <User size={14} />,          label: 'Paciente',            value: nomeP },
              { icon: <Stethoscope size={14} />,   label: 'Serviço',             value: nomeS },
              { icon: <User size={14} />,          label: 'Profissional',        value: nomeProf },
              { icon: <DollarSign size={14} />,    label: 'Valor',               value: valorExibir != null ? formatCurrency(valorExibir) : '—' },
              { icon: <Monitor size={14} />,       label: 'Canal / Agendado por', value: canalLabel },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-2.5">
                <span className="flex items-center gap-2 text-xs text-[#7F8C8D]">
                  {row.icon}
                  {row.label}
                </span>
                <span className="text-xs font-semibold text-[#2C3E50]">{row.value}</span>
              </div>
            ))}

            {/* Linha Pacote / Avulso */}
            <div className="flex items-center justify-between py-2.5">
              <span className="flex items-center gap-2 text-xs text-[#7F8C8D]">
                <Repeat size={14} />
                Pacote
              </span>
              {pacoteLabel ? (
                <span className="text-xs font-semibold text-[#4A3AE8]">{pacoteLabel}</span>
              ) : (
                <span className="text-xs font-semibold text-[#7F8C8D]">Avulso</span>
              )}
            </div>

            {/* WhatsApp — link clicável */}
            <div className="flex items-center justify-between py-2.5">
              <span className="flex items-center gap-2 text-xs text-[#7F8C8D]">
                <MessageCircle size={14} />
                WhatsApp
              </span>
              {paciente?.telefone ? (
                <a
                  href={waLink(paciente.ddi ?? null, paciente.telefone, '')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-[#25D366] hover:underline"
                >
                  {telFormatado}
                </a>
              ) : (
                <span className="text-xs text-[#BDC3C7]">Não informado</span>
              )}
            </div>

            {/* Agendado em */}
            <div className="flex items-center justify-between py-2.5">
              <span className="flex items-center gap-2 text-xs text-[#7F8C8D]">
                <CalendarCheck size={14} />
                Agendado em
              </span>
              <span className="text-xs font-semibold text-[#2C3E50]">{formatDataHoraCriacao(ag.created_at)}</span>
            </div>
          </div>

          {/* ── Observações ── */}
          {ag.observacoes && (
            <div className="bg-[#FFF9E6] border border-[#F39C12]/30 rounded-xl px-3 py-2.5 text-xs text-[#856404]">
              <p className="font-semibold mb-0.5">Observações</p>
              <p>{ag.observacoes}</p>
            </div>
          )}

          {/* ── Feedback ── */}
          {feedback && (
            <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
              feedback.tipo === 'ok'
                ? 'bg-[#27AE60]/10 text-[#27AE60] border border-[#27AE60]/30'
                : 'bg-[#E74C3C]/10 text-[#E74C3C] border border-[#E74C3C]/30'
            }`}>
              {feedback.tipo === 'ok' ? <Check size={13} /> : <AlertTriangle size={13} />}
              {feedback.msg}
            </div>
          )}

          {/* ── Confirmação de cancelamento ── */}
          {confirmandoCancelamento && !feedback && (
            <div className="bg-[#E74C3C]/8 border border-[#E74C3C]/30 rounded-xl p-3 text-xs text-[#E74C3C]">
              <p className="font-semibold mb-2 flex items-center gap-1.5">
                <AlertTriangle size={13} /> Confirmar cancelamento?
              </p>
              <p className="text-[#7F8C8D] mb-3">O paciente será notificado via WhatsApp sobre o cancelamento.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelar}
                  disabled={loading === 'cancelado'}
                  className="flex-1 bg-[#E74C3C] text-white py-1.5 rounded-lg text-xs font-semibold hover:bg-[#c0392b] disabled:opacity-50"
                >
                  {loading === 'cancelado' ? 'Cancelando…' : 'Sim, cancelar e notificar'}
                </button>
                <button
                  onClick={() => setConfirmandoCancelamento(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#7F8C8D] hover:bg-[#F8F9FA]"
                >
                  Voltar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Rodapé com ações ── */}
        {!isFinal && !feedback && (
          <div className="px-6 py-4 border-t border-[#E8E8E8] space-y-3">
            {/* Ações primárias */}
            <div className="flex gap-2">
              {ag.status === 'agendado' && (
                <button
                  onClick={() => executarStatus('confirmado')}
                  disabled={!!loading}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#27AE60] text-white py-2.5 rounded-full text-sm font-semibold hover:bg-[#1f8b4d] disabled:opacity-50 shadow-sm"
                >
                  <Check size={15} strokeWidth={3} />
                  {loading === 'confirmado' ? 'Confirmando…' : 'Confirmar'}
                </button>
              )}

              <button
                onClick={() => executarStatus('realizado')}
                disabled={!!loading}
                className="flex-1 flex items-center justify-center gap-1.5 border border-[#2C3E50] text-[#2C3E50] py-2.5 rounded-full text-sm font-semibold hover:bg-[#2C3E50]/5 disabled:opacity-50"
              >
                <Check size={14} />
                {loading === 'realizado' ? 'Salvando…' : 'Atendido'}
              </button>

              {paciente?.telefone && (
                <a
                  href={waLink(paciente.ddi ?? null, paciente.telefone, msgLembrete)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 border border-[#25D366] text-[#25D366] py-2.5 rounded-full text-sm font-semibold hover:bg-[#25D366]/5"
                >
                  <MessageCircle size={14} />
                  Lembrete
                </a>
              )}
            </div>

            {/* Ações secundárias */}
            {!confirmandoCancelamento && (
              <div className="flex items-center justify-between">
                <button
                  onClick={handleAlterar}
                  className="flex items-center gap-1.5 text-sm text-[#7F8C8D] hover:text-[#4A3AE8] font-medium px-2 py-1 rounded-lg hover:bg-[#4A3AE8]/5 transition-colors"
                >
                  <Pencil size={13} />
                  Alterar
                </button>

                <button
                  onClick={onClose}
                  className="text-sm text-[#7F8C8D] hover:text-[#2C3E50] font-medium px-2 py-1 rounded-lg hover:bg-[#F8F9FA]"
                >
                  Fechar
                </button>

                <button
                  onClick={handleCancelar}
                  className="flex items-center gap-1.5 text-sm text-[#E74C3C] hover:text-[#c0392b] font-medium px-2 py-1 rounded-lg hover:bg-[#E74C3C]/5 transition-colors"
                >
                  <AlertTriangle size={13} />
                  Cancelar agendamento
                </button>
              </div>
            )}
          </div>
        )}

        {/* Rodapé simplificado para status final */}
        {isFinal && (
          <div className="px-6 py-4 border-t border-[#E8E8E8] flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-full text-sm font-medium text-[#7F8C8D] hover:bg-[#F8F9FA]"
            >
              Fechar
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
