'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, X, ChevronLeft, ChevronRight, SendHorizonal, Ban } from 'lucide-react'
import {
  listarDisparosAction,
  cancelarDisparoAction,
  enviarAgoraAction,
} from './historico-actions'
import type { Disparo, StatusDisparo } from './historico-actions'
import { PAGE_SIZE } from './historico-utils'

// ─── Mapa de rótulos dos gatilhos ─────────────────────────────────────────────
const GATILHO_LABEL: Record<string, string> = {
  novo_agendamento_paciente:    'Novo Agendamento',
  novo_agendamento_profissional:'Novo Agendamento',
  lembrete_horario:             'Lembrete',
  pedido_confirmacao:           'Confirmação',
  cancelamento:                 'Cancelamento',
  reagendamento:                'Reagendamento',
  falta_no_show:                'Falta / No-show',
  fila_espera:                  'Fila de Espera',
  pos_atendimento_nps:          'Pós-Atendimento',
  confirmacao_recebida:         'Confirmado',
  aniversario_paciente:         'Aniversário',
  agenda_diaria:                'Agenda Diária',
  envio_formulario:             'Formulário',
}

// ─── Cores dos badges de gatilho ──────────────────────────────────────────────
const GATILHO_COLOR: Record<string, { bg: string; color: string }> = {
  novo_agendamento_paciente:    { bg: '#DCFCE7', color: '#16A34A' },
  novo_agendamento_profissional:{ bg: '#F5F3FF', color: '#7C3AED' },
  lembrete_horario:             { bg: '#FEF3C7', color: '#D97706' },
  pedido_confirmacao:           { bg: '#DBEAFE', color: '#2563EB' },
  cancelamento:                 { bg: '#FEE2E2', color: '#DC2626' },
  reagendamento:                { bg: '#E0F2FE', color: '#0369A1' },
  falta_no_show:                { bg: '#F3E8FF', color: '#9333EA' },
  fila_espera:                  { bg: '#FFFBEB', color: '#B45309' },
  pos_atendimento_nps:          { bg: '#FEF9C3', color: '#A16207' },
  confirmacao_recebida:         { bg: '#DCFCE7', color: '#15803D' },
  aniversario_paciente:         { bg: '#FCE7F3', color: '#BE185D' },
  agenda_diaria:                { bg: '#E0F2FE', color: '#0369A1' },
  envio_formulario:             { bg: '#E0F2FE', color: '#0891B2' },
}

// ─── Status ────────────────────────────────────────────────────────────────────
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '',          label: 'Todos os status'   },
  { value: 'agendado',  label: 'Agendado'          },
  { value: 'pendente',  label: 'Pendente'          },
  { value: 'enviado',   label: 'Enviado'           },
  { value: 'entregue',  label: 'Entregue'          },
  { value: 'lido',      label: 'Lido'              },
  { value: 'erro',      label: 'Erro'              },
  { value: 'cancelado', label: 'Cancelado'         },
]

// ─── Ícone de status (ticks do WhatsApp + indicadores) ───────────────────────
function StatusIcon({ status }: { status: StatusDisparo }) {
  if (status === 'lido') return (
    <svg viewBox="0 0 16 11" width={18} height={12} fill="#53BDEB">
      <path d="M11.07.43L4.16 7.34 1.21 4.39.54 5.06l3.62 3.62 7.57-7.57L11.07.43zm2.01 0l-7.57 7.57-.54-.54-.68.68 1.22 1.22 8.25-8.25-.68-.68z"/>
    </svg>
  )
  if (status === 'entregue') return (
    <svg viewBox="0 0 16 11" width={18} height={12} fill="#8696A0">
      <path d="M11.07.43L4.16 7.34 1.21 4.39.54 5.06l3.62 3.62 7.57-7.57L11.07.43zm2.01 0l-7.57 7.57-.54-.54-.68.68 1.22 1.22 8.25-8.25-.68-.68z"/>
    </svg>
  )
  if (status === 'enviado') return (
    <svg viewBox="0 0 8 11" width={10} height={12} fill="#8696A0">
      <path d="M6.07.43L-.84 7.34-2.79 5.39-3.46 6.06-.84 8.68 7.43.43 6.07.43z" transform="translate(2,0)"/>
    </svg>
  )
  if (status === 'erro') return (
    <span className="text-[11px] font-bold text-red-500">!</span>
  )
  if (status === 'cancelado') return (
    <X size={12} className="text-[#94A3B8]" />
  )
  if (status === 'agendado') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth={2} width={14} height={14}>
      <circle cx="12" cy="12" r="10"/>
      <path strokeLinecap="round" d="M12 6v6l4 2"/>
    </svg>
  )
  // pendente
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2} width={14} height={14}>
      <circle cx="12" cy="12" r="10"/>
      <path strokeLinecap="round" d="M12 6v6l4 2"/>
    </svg>
  )
}

// ─── Badge de status ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: StatusDisparo }) {
  const map: Record<StatusDisparo, { bg: string; color: string; label: string }> = {
    agendado:  { bg: '#FEF3C7', color: '#D97706', label: 'Agendado'  },
    pendente:  { bg: '#F1F5F9', color: '#64748B', label: 'Pendente'  },
    enviado:   { bg: '#F1F5F9', color: '#475569', label: 'Enviado'   },
    entregue:  { bg: '#F0FDF4', color: '#16A34A', label: 'Entregue'  },
    lido:      { bg: '#EFF6FF', color: '#2563EB', label: 'Lido'      },
    erro:      { bg: '#FEF2F2', color: '#DC2626', label: 'Erro'      },
    cancelado: { bg: '#F1F5F9', color: '#94A3B8', label: 'Cancelado' },
  }
  const { bg, color, label } = map[status]
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: bg, color }}
    >
      <StatusIcon status={status} />
      {label}
    </span>
  )
}

// ─── Formata telefone para exibição ──────────────────────────────────────────
function fmtFone(tel: string) {
  const n = tel.replace(/\D/g, '')
  if (n.length === 13) return `+${n.slice(0,2)} (${n.slice(2,4)}) ${n.slice(4,9)}-${n.slice(9)}`
  if (n.length === 12) return `+${n.slice(0,2)} (${n.slice(2,4)}) ${n.slice(4,8)}-${n.slice(8)}`
  return tel
}

// ─── Renderiza texto da mensagem (formatação WhatsApp) ────────────────────────
function MensagemPreview({ texto }: { texto: string }) {
  // Só aplica formatação visual
  const html = texto
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*((?:[^*\n])+)\*/g, '<strong>$1</strong>')
    .replace(/_((?:[^_\n])+)_/g,   '<em>$1</em>')
    .replace(/~((?:[^~\n])+)~/g,   '<del>$1</del>')
    .replace(/\n/g, '<br/>')

  return (
    <p
      className="text-xs text-[#475569] leading-relaxed line-clamp-3"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// ─── Card de disparo ──────────────────────────────────────────────────────────
function DisparoCard({
  disparo,
  onCancelar,
  onEnviarAgora,
}: {
  disparo:      Disparo
  onCancelar:   (id: string) => void
  onEnviarAgora:(id: string) => void
}) {
  const [loadingCancel, setLoadingCancel] = useState(false)
  const [loadingSend,   setLoadingSend]   = useState(false)

  const gc  = GATILHO_COLOR[disparo.gatilho] ?? { bg: '#F1F5F9', color: '#64748B' }
  const gl  = GATILHO_LABEL[disparo.gatilho] ?? disparo.gatilho
  const isAgendado = disparo.status === 'agendado' || disparo.status === 'pendente'

  const dataRef = disparo.enviado_em ?? disparo.agendado_para ?? disparo.criado_em
  const dataFmt = new Date(dataRef).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  async function handleCancelar() {
    setLoadingCancel(true)
    await onCancelar(disparo.id)
    setLoadingCancel(false)
  }

  async function handleEnviar() {
    setLoadingSend(true)
    await onEnviarAgora(disparo.id)
    setLoadingSend(false)
  }

  return (
    <div
      className="bg-white rounded-2xl border transition-shadow hover:shadow-md"
      style={{
        borderColor: isAgendado ? '#FDE68A' : '#E2E8F0',
        boxShadow: isAgendado ? '0 0 0 1px #FDE68A' : undefined,
      }}
    >
      <div className="flex items-start gap-4 p-4">
        {/* Avatar */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ background: gc.color }}
        >
          {(disparo.paciente_nome ?? '?').charAt(0).toUpperCase()}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          {/* Linha 1: nome + badge gatilho */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-[#1E293B] truncate">
              {disparo.paciente_nome ?? 'Não identificado'}
            </span>
            <span
              className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
              style={{ background: gc.bg, color: gc.color }}
            >
              {gl}
            </span>
          </div>

          {/* Linha 2: telefone */}
          <p className="text-[11px] text-[#94A3B8] mb-2 font-mono">
            {fmtFone(disparo.telefone)}
          </p>

          {/* Mensagem (preview) */}
          <MensagemPreview texto={disparo.mensagem} />

          {/* Erro */}
          {disparo.status === 'erro' && disparo.erro_msg && (
            <p className="mt-2 text-[11px] text-red-500 bg-red-50 rounded-lg px-2 py-1 font-mono">
              {disparo.erro_msg}
            </p>
          )}

          {/* Alerta de agendamento + botões de ação */}
          {isAgendado && (
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                <span className="text-[11px] font-semibold text-amber-700">
                  {disparo.agendado_para
                    ? `Programado para ${new Date(disparo.agendado_para).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                    : 'Aguardando envio'
                  }
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelar}
                  disabled={loadingCancel || loadingSend}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                >
                  {loadingCancel
                    ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" d="M12 3a9 9 0 109 9"/></svg>
                    : <Ban size={12} />
                  }
                  Cancelar
                </button>

                <button
                  onClick={handleEnviar}
                  disabled={loadingCancel || loadingSend}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[#25D366] text-white hover:bg-[#1ebe57] disabled:opacity-40 transition-colors shadow-sm"
                >
                  {loadingSend
                    ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" d="M12 3a9 9 0 109 9"/></svg>
                    : <SendHorizonal size={12} />
                  }
                  Enviar Agora
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Direita: status + data */}
        <div className="flex-shrink-0 flex flex-col items-end gap-2 ml-2">
          <StatusBadge status={disparo.status} />
          <span className="text-[10px] text-[#94A3B8] font-mono text-right">
            {dataFmt}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function HistoricoTab() {
  const [disparos,  setDisparos]  = useState<Disparo[]>([])
  const [total,     setTotal]     = useState(0)
  const [pagina,    setPagina]    = useState(1)
  const [busca,     setBusca]     = useState('')
  const [status,    setStatus]    = useState('')
  const [loading,   setLoading]   = useState(true)
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null)

  // Debounce de busca
  const [buscaDebounced, setBuscaDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 350)
    return () => clearTimeout(t)
  }, [busca])

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const carregar = useCallback(async () => {
    setLoading(true)
    const res = await listarDisparosAction({ busca: buscaDebounced, status, pagina })
    setLoading(false)
    if ('error' in res) { showToast(res.error, false); return }
    setDisparos(res.data)
    setTotal(res.total)
  }, [buscaDebounced, status, pagina])

  // Recarrega quando filtros mudam
  useEffect(() => {
    setPagina(1)
  }, [buscaDebounced, status])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function handleCancelar(id: string) {
    const res = await cancelarDisparoAction(id)
    if ('error' in res) { showToast(res.error, false); return }
    showToast('Disparo cancelado.')
    carregar()
  }

  async function handleEnviarAgora(id: string) {
    const res = await enviarAgoraAction(id)
    if ('error' in res) { showToast(res.error, false); return }
    showToast('Mensagem enviada com sucesso! ✓')
    carregar()
  }

  const totalPaginas = Math.ceil(total / PAGE_SIZE)

  // ─── Estatísticas rápidas ─────────────────────────────────────────────────
  const stats = [
    { label: 'Total',     value: total,                             color: '#64748B' },
    { label: 'Agendados', value: disparos.filter(d => d.status === 'agendado').length,  color: '#D97706' },
    { label: 'Enviados',  value: disparos.filter(d => d.status === 'enviado' || d.status === 'entregue' || d.status === 'lido').length, color: '#16A34A' },
    { label: 'Erros',     value: disparos.filter(d => d.status === 'erro').length,      color: '#DC2626' },
  ]

  return (
    <div className="py-5 space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${toast.ok ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`}>
          {toast.msg}
        </div>
      )}

      {/* Cabeçalho */}
      <div>
        <h2 className="text-lg font-bold text-[#2C3E50]">Histórico de Disparos</h2>
        <p className="text-xs text-[#94A3B8]">Auditoria completa de todas as mensagens automáticas enviadas ou programadas.</p>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#E2E8F0] px-4 py-3 flex items-center gap-3">
            <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <div>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wide">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3 flex items-center gap-3 flex-wrap shadow-sm">
        {/* Busca */}
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por paciente ou telefone…"
            className="w-full h-9 pl-9 pr-8 rounded-lg bg-[#F8F9FA] border border-transparent text-sm outline-none focus:bg-white focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/15"
          />
          {busca && (
            <button onClick={() => setBusca('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Status */}
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="h-9 px-3 rounded-lg bg-[#F8F9FA] border border-transparent text-sm text-[#475569] outline-none focus:bg-white focus:border-[#25D366] cursor-pointer"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Refresh */}
        <button
          onClick={carregar}
          disabled={loading}
          className="h-9 px-3 rounded-lg bg-[#F8F9FA] border border-transparent text-[#475569] hover:bg-[#E2E8F0] transition-colors disabled:opacity-40"
          title="Recarregar"
        >
          <svg
            className={loading ? 'animate-spin' : ''}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={15} height={15}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="animate-spin w-6 h-6 text-[#25D366]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M12 3a9 9 0 109 9" />
          </svg>
        </div>
      ) : disparos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}>
            <svg viewBox="0 0 24 24" fill="white" width={26} height={26}>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a5.49 5.49 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#2C3E50] mb-1">Nenhum disparo encontrado</p>
          <p className="text-xs text-[#94A3B8] max-w-xs">
            {busca || status
              ? 'Tente ajustar os filtros de busca.'
              : 'Os disparos automáticos aparecerão aqui assim que o sistema começar a enviar mensagens.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {disparos.map(d => (
            <DisparoCard
              key={d.id}
              disparo={d}
              onCancelar={handleCancelar}
              onEnviarAgora={handleEnviarAgora}
            />
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-[#94A3B8]">
            {((pagina - 1) * PAGE_SIZE) + 1}–{Math.min(pagina * PAGE_SIZE, total)} de {total} disparos
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} /> Anterior
            </button>

            {/* Páginas numeradas */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                let p: number
                if (totalPaginas <= 5) {
                  p = i + 1
                } else if (pagina <= 3) {
                  p = i + 1
                } else if (pagina >= totalPaginas - 2) {
                  p = totalPaginas - 4 + i
                } else {
                  p = pagina - 2 + i
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPagina(p)}
                    className="w-8 h-8 rounded-full text-xs font-semibold transition-colors"
                    style={{
                      background: p === pagina ? '#25D366' : 'transparent',
                      color:      p === pagina ? 'white'   : '#475569',
                    }}
                  >
                    {p}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Próxima <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
