'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getStatusWaAction } from './actions'
import {
  listarConversasAction,
  listarMensagensAction,
  marcarLidoAction,
  enviarMensagemAction,
  cadastrarContatoRapidoAction,
  simularMensagemAction,
  buscarLogsWebhookAction,
} from './painel-actions'
import type { Conversa, Mensagem } from './painel-actions'

const POLL_MS = 5000

// ─── WhatsApp tile background ─────────────────────────────────────────────────
const WA_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23e5ddd5'/%3E%3Cpath d='M0 0h80v80H0z' fill='url(%23p)'/%3E%3Cdefs%3E%3Cpattern id='p' x='0' y='0' width='80' height='80' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='40' cy='40' r='1.5' fill='%23c9bfb5' opacity='.6'/%3E%3Ccircle cx='0' cy='0' r='1.5' fill='%23c9bfb5' opacity='.6'/%3E%3Ccircle cx='80' cy='0' r='1.5' fill='%23c9bfb5' opacity='.6'/%3E%3Ccircle cx='0' cy='80' r='1.5' fill='%23c9bfb5' opacity='.6'/%3E%3Ccircle cx='80' cy='80' r='1.5' fill='%23c9bfb5' opacity='.6'/%3E%3Ccircle cx='20' cy='20' r='1' fill='%23c9bfb5' opacity='.4'/%3E%3Ccircle cx='60' cy='20' r='1' fill='%23c9bfb5' opacity='.4'/%3E%3Ccircle cx='20' cy='60' r='1' fill='%23c9bfb5' opacity='.4'/%3E%3Ccircle cx='60' cy='60' r='1' fill='%23c9bfb5' opacity='.4'/%3E%3C/pattern%3E%3C/defs%3E%3C/svg%3E")`

// ─── Helpers ─────────────────────────────────────────────────────────────────
function iniciais(nome: string): string {
  return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

function horario(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatarData(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ nome, size = 40 }: { nome?: string | null; size?: number }) {
  if (nome) {
    return (
      <div
        className="rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0"
        style={{ width: size, height: size, background: '#128C7E', fontSize: size * 0.36 }}
      >
        {iniciais(nome)}
      </div>
    )
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={{ width: size, height: size, background: '#DFE5E7' }}
    >
      <svg viewBox="0 0 212 212" width={size} height={size} fill="none">
        <circle cx="106" cy="106" r="106" fill="#DFE5E7"/>
        <path fill="#B2BBBF" d="M106.9 101.8c14.7 0 26.6-11.9 26.6-26.6S121.6 48.6 106.9 48.6 80.3 60.5 80.3 75.2s11.9 26.6 26.6 26.6zm0 13.3c-17.8 0-53.3 8.9-53.3 26.6v13.3h106.6v-13.3c0-17.7-35.5-26.6-53.3-26.6z"/>
      </svg>
    </div>
  )
}

// ─── Card de conversa na lista ────────────────────────────────────────────────
function ConversaCard({
  conv, selected, onClick,
}: {
  conv: Conversa; selected: boolean; onClick: () => void
}) {
  const nome = conv.paciente_nome ?? conv.nome_contato ?? 'Não cadastrado'
  const isDesconhecido = !conv.paciente_id
  const semConv = conv.sem_conversa

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 transition-colors"
      style={{
        padding: '10px 16px',
        background: selected ? '#F0F2F5' : 'transparent',
        borderBottom: '1px solid #F0F2F5',
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = '#F5F6F6' }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <Avatar nome={conv.paciente_nome ?? (conv.nome_contato && !isDesconhecido ? conv.nome_contato : null)} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-sm font-medium truncate" style={{ color: isDesconhecido ? '#667781' : '#111B21' }}>
            {isDesconhecido ? 'Não cadastrado' : nome}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {conv.ultima_msg_at && (
              <span className="text-[11px]" style={{ color: conv.nao_lidas > 0 ? '#25D366' : '#667781' }}>
                {horario(conv.ultima_msg_at)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[13px] truncate flex-1" style={{ color: semConv ? '#8696A0' : '#667781' }}>
            {isDesconhecido && (
              <span className="inline-block mr-1 px-1 rounded text-[10px] font-bold bg-orange-100 text-orange-600">Novo</span>
            )}
            {semConv
              ? 'Nenhuma conversa iniciada'
              : conv.ultima_mensagem ?? ''}
          </p>
          {conv.nao_lidas > 0 && (
            <span
              className="ml-2 flex-shrink-0 w-5 h-5 rounded-full text-white text-[11px] font-semibold flex items-center justify-center"
              style={{ background: '#25D366' }}
            >
              {conv.nao_lidas > 9 ? '9+' : conv.nao_lidas}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Bolha de mensagem ────────────────────────────────────────────────────────
function Bolha({ msg }: { msg: Mensagem }) {
  const minha = msg.de_mim

  function Conteudo() {
    if (msg.tipo === 'audio') {
      return (
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="currentColor" width={16} height={16}><path d="M12 3a4 4 0 014 4v5a4 4 0 01-8 0V7a4 4 0 014-4zm0 2a2 2 0 00-2 2v5a2 2 0 004 0V7a2 2 0 00-2-2zm-7 9h2a5 5 0 0010 0h2a7 7 0 01-6 6.92V23h-4v-2.08A7 7 0 015 14z"/></svg>
          <span className="text-xs">Áudio recebido</span>
          {msg.media_url && (
            <audio controls src={msg.media_url} className="h-6 w-28" />
          )}
        </div>
      )
    }
    if (msg.tipo === 'image') return <p className="text-sm">📷 {msg.conteudo || 'Imagem'}</p>
    if (msg.tipo === 'video') return <p className="text-sm">🎥 {msg.conteudo || 'Vídeo'}</p>
    if (msg.tipo === 'document') return <p className="text-sm">📄 {msg.conteudo || 'Documento'}</p>
    return <p className="text-[13.6px] leading-[19px] whitespace-pre-wrap break-words">{msg.conteudo}</p>
  }

  const StatusIcon = () => {
    if (!minha) return null
    if (msg.status === 'read') return (
      <svg viewBox="0 0 16 11" width={16} height={11} fill="#53BDEB" className="flex-shrink-0">
        <path d="M11.07.43L4.16 7.34 1.21 4.39.54 5.06l3.62 3.62 7.57-7.57L11.07.43zm2.01 0l-7.57 7.57-.54-.54-.68.68 1.22 1.22 8.25-8.25-.68-.68z"/>
      </svg>
    )
    return (
      <svg viewBox="0 0 16 11" width={16} height={11} fill="#8696A0" className="flex-shrink-0">
        <path d="M11.07.43L4.16 7.34 1.21 4.39.54 5.06l3.62 3.62 7.57-7.57L11.07.43zm2.01 0l-7.57 7.57-.54-.54-.68.68 1.22 1.22 8.25-8.25-.68-.68z"/>
      </svg>
    )
  }

  return (
    <div className={`flex ${minha ? 'justify-end' : 'justify-start'} mb-0.5 px-[5%]`}>
      <div
        className="relative max-w-[65%] px-[9px] pt-[6px] pb-[8px] rounded-[7.5px] shadow-sm"
        style={{ background: minha ? '#D9FDD3' : '#FFFFFF' }}
      >
        {/* Tail */}
        {minha ? (
          <svg className="absolute -right-[7px] top-0" viewBox="0 0 8 13" width={8} height={13}>
            <path d="M0 0 Q8 0 8 8 L0 13 Z" fill="#D9FDD3"/>
          </svg>
        ) : (
          <svg className="absolute -left-[7px] top-0" viewBox="0 0 8 13" width={8} height={13}>
            <path d="M8 0 Q0 0 0 8 L8 13 Z" fill="#FFFFFF"/>
          </svg>
        )}
        <Conteudo />
        <div className="flex items-center justify-end gap-1 mt-[2px]">
          <span className="text-[11px]" style={{ color: '#8696A0' }}>{formatarData(msg.enviado_em)}</span>
          <StatusIcon />
        </div>
      </div>
    </div>
  )
}

// ─── Estado desconectado (direita) ────────────────────────────────────────────
function EstadoDesconectado({ onGoConexao }: { onGoConexao: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8" style={{ background: '#F0F2F5' }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: '#D9FDD3' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth={1.5} width={36} height={36}>
          <rect x="5" y="2" width="14" height="20" rx="2"/>
          <line x1="9" y1="18" x2="15" y2="18"/>
        </svg>
      </div>
      <h3 className="font-bold text-lg mb-2" style={{ color: '#111B21' }}>WhatsApp Não Conectado</h3>
      <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#667781' }}>
        Sua instância está desconectada. Para enviar e receber mensagens, conecte seu aparelho.
      </p>
      <button
        onClick={onGoConexao}
        className="mt-6 px-6 py-2.5 rounded-full text-white text-sm font-semibold transition-colors shadow-sm"
        style={{ background: '#075E54' }}
      >
        Ir para Conexão
      </button>
    </div>
  )
}

// ─── Cadastro rápido inline ───────────────────────────────────────────────────
function CadastroRapido({
  conv, onCadastrado,
}: {
  conv: Conversa
  onCadastrado: (nome: string, pacienteId: string) => void
}) {
  const [nome,    setNome]    = useState('')
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState('')

  async function handleSalvar() {
    if (!nome.trim()) { setErr('Informe o nome do paciente.'); return }
    setLoading(true)
    const res = await cadastrarContatoRapidoAction(conv.id, nome.trim(), conv.telefone)
    setLoading(false)
    if ('error' in res) { setErr(res.error); return }
    onCadastrado(nome.trim(), res.pacienteId)
  }

  return (
    <div className="mx-4 my-3 p-4 rounded-xl border border-orange-200 bg-orange-50">
      <p className="text-xs font-semibold text-orange-700 mb-3">
        📋 Cadastrar este contato como paciente
      </p>
      <input
        type="text"
        value={nome}
        onChange={e => { setNome(e.target.value); setErr('') }}
        placeholder="Nome completo"
        className="w-full px-3 py-2 rounded-lg border border-orange-200 bg-white text-sm focus:outline-none focus:border-orange-400 mb-2"
      />
      {err && <p className="text-xs text-red-500 mb-2">{err}</p>}
      <p className="text-[10px] text-orange-500 mb-3">
        Telefone: {conv.telefone} · Será salvo como novo paciente
      </p>
      <button
        onClick={handleSalvar}
        disabled={loading}
        className="w-full py-2 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Salvando…' : 'Cadastrar Rápido'}
      </button>
    </div>
  )
}

// ─── Área de chat ─────────────────────────────────────────────────────────────
function ChatArea({
  conv,
  mensagens,
  loadingMsgs,
  onEnviar,
  onCadastrado,
}: {
  conv:        Conversa
  mensagens:   Mensagem[]
  loadingMsgs: boolean
  onEnviar:    (texto: string) => Promise<string | null>
  onCadastrado:(nome: string, pacienteId: string) => void
}) {
  const [texto,     setTexto]     = useState('')
  const [sending,   setSending]   = useState(false)
  const [errEnvio,  setErrEnvio]  = useState<string | null>(null)
  const bottomRef     = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(0)

  const nome = conv.paciente_nome ?? conv.nome_contato ?? conv.telefone
  const isDesconhecido = !conv.paciente_id && !conv.sem_conversa

  useEffect(() => {
    if (mensagens.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevLengthRef.current = mensagens.length
  }, [mensagens])

  async function handleEnviar() {
    const t = texto.trim()
    if (!t) return
    setSending(true)
    setErrEnvio(null)
    setTexto('')
    const err = await onEnviar(t)
    if (err) {
      setErrEnvio(err)
      setTexto(t)
    }
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar() }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header do chat */}
      <div
        className="flex items-center gap-3 px-4 py-2 flex-shrink-0"
        style={{ background: '#075E54', minHeight: 56 }}
      >
        <Avatar nome={conv.paciente_nome} size={40} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{nome}</p>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {conv.telefone ? `+${conv.telefone.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '$1 ($2) $3-$4')}` : ''}
          </p>
        </div>
        {/* ícones decorativos */}
        <div className="flex items-center gap-4 opacity-70">
          <svg viewBox="0 0 24 24" fill="white" width={20} height={20}>
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <svg viewBox="0 0 24 24" fill="white" width={20} height={20}>
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </div>
      </div>

      {/* Mensagens */}
      <div
        className="flex-1 overflow-y-auto py-3"
        style={{ background: WA_BG, backgroundSize: '80px 80px' }}
      >
        {/* Card de cadastro rápido */}
        {isDesconhecido && (
          <CadastroRapido conv={conv} onCadastrado={onCadastrado} />
        )}

        {conv.sem_conversa && (
          <div className="flex justify-center mb-3">
            <span
              className="text-[11px] px-3 py-1 rounded-[7.5px] shadow-sm"
              style={{ background: 'rgba(225,245,254,0.92)', color: '#667781' }}
            >
              Nenhuma mensagem ainda — inicie uma conversa abaixo
            </span>
          </div>
        )}

        {loadingMsgs && (
          <div className="flex justify-center py-8">
            <svg className="animate-spin w-5 h-5" style={{ color: '#128C7E' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M12 3a9 9 0 109 9" />
            </svg>
          </div>
        )}

        {!loadingMsgs && mensagens.length === 0 && !conv.sem_conversa && (
          <div className="flex justify-center">
            <span
              className="text-[11px] px-3 py-1 rounded-[7.5px] shadow-sm"
              style={{ background: 'rgba(225,245,254,0.92)', color: '#667781' }}
            >
              Sem mensagens nesta conversa ainda
            </span>
          </div>
        )}

        {mensagens.map(msg => <Bolha key={msg.id} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Erro de envio */}
      {errEnvio && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-t border-red-100 flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth={2} width={14} height={14}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.948 3.374H4.645c-1.73 0-2.813-1.874-1.948-3.374L10.052 3.378c.866-1.5 3.032-1.5 3.898 0L21.303 16.126zM12 15.75h.007v.008H12v-.008z"/>
          </svg>
          <p className="text-xs text-red-600 flex-1">{errEnvio}</p>
          <button onClick={() => setErrEnvio(null)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
        </div>
      )}

      {/* Input de mensagem */}
      <div
        className="flex items-end gap-2 px-3 py-2 flex-shrink-0"
        style={{ background: '#F0F2F5', borderTop: '1px solid #E9EDEF' }}
      >
        {/* emoji placeholder */}
        <button className="mb-1 opacity-50 hover:opacity-80 transition-opacity flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="#54656F" width={24} height={24}>
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
          </svg>
        </button>
        <div className="flex-1">
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem"
            rows={1}
            className="w-full px-4 py-2 rounded-lg text-sm resize-none focus:outline-none"
            style={{
              background: '#FFFFFF',
              color: '#111B21',
              maxHeight: 120,
              border: 'none',
              boxShadow: 'none',
            }}
          />
        </div>
        <button
          onClick={handleEnviar}
          disabled={sending || !texto.trim()}
          className="mb-0.5 w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-40"
          style={{ background: texto.trim() ? '#00A884' : '#00A884' }}
        >
          {sending ? (
            <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" d="M12 3a9 9 0 109 9" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="white" width={18} height={18}>
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Painel de diagnóstico (lista vazia) ─────────────────────────────────────
function PainelDiagnostico({ onMensagemSimulada }: { onMensagemSimulada: () => void }) {
  const [loadingSim,  setLoadingSim]  = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [simMsg,      setSimMsg]      = useState<string | null>(null)
  const [logs,        setLogs]        = useState<{ criado_em: string; event_type: string; resumo: string }[] | null>(null)
  const [logsErr,     setLogsErr]     = useState<string | null>(null)
  const [aberto,      setAberto]      = useState(false)

  async function handleSimular() {
    setLoadingSim(true); setSimMsg(null)
    const res = await simularMensagemAction()
    setLoadingSim(false)
    if ('error' in res) { setSimMsg(`Erro: ${res.error}`); return }
    setSimMsg('✅ Mensagem de teste inserida! Ela deve aparecer na lista à esquerda.')
    onMensagemSimulada()
  }

  async function handleVerLogs() {
    setLoadingLogs(true); setLogsErr(null)
    const res = await buscarLogsWebhookAction()
    setLoadingLogs(false)
    if ('error' in res) { setLogsErr(res.error); setLogs([]); return }
    setLogs(res.data)
  }

  return (
    <div className="mx-4 mt-4 rounded-xl border border-[#E9EDEF] bg-white overflow-hidden shadow-sm">
      <button
        onClick={() => setAberto(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-xs font-semibold" style={{ color: '#667781' }}>🔍 Diagnóstico do webhook</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="#8696A0" strokeWidth={2} width={14} height={14}
          style={{ transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {aberto && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#E9EDEF]">
          <div className="pt-3">
            <p className="text-[11px] mb-2" style={{ color: '#667781' }}>
              <strong>Passo 1 — Teste de banco/frontend:</strong> insere uma mensagem de teste diretamente no banco. Se aparecer na lista, o banco e o Painel estão OK.
            </p>
            <button
              onClick={handleSimular}
              disabled={loadingSim}
              className="w-full py-2 rounded-lg text-white text-xs font-semibold disabled:opacity-50 transition-colors"
              style={{ background: '#00A884' }}
            >
              {loadingSim ? 'Inserindo…' : 'Simular mensagem de teste'}
            </button>
            {simMsg && (
              <p className={`mt-2 text-[11px] ${simMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
                {simMsg}
              </p>
            )}
          </div>

          <div>
            <p className="text-[11px] mb-2" style={{ color: '#667781' }}>
              <strong>Passo 2 — Logs do webhook:</strong> verifica se a UAZAPI está enviando eventos para este sistema.
            </p>
            <button
              onClick={handleVerLogs}
              disabled={loadingLogs}
              className="w-full py-2 rounded-lg border text-xs font-semibold disabled:opacity-50 transition-colors"
              style={{ borderColor: '#E9EDEF', background: '#F0F2F5', color: '#667781' }}
            >
              {loadingLogs ? 'Buscando…' : 'Ver últimos eventos recebidos'}
            </button>

            {logsErr && <p className="mt-2 text-[11px] text-red-500">{logsErr}</p>}

            {logs !== null && (
              <div className="mt-2 rounded-lg border border-[#E9EDEF] bg-white overflow-hidden">
                {logs.length === 0 ? (
                  <div className="px-4 py-3">
                    <p className="text-[11px] font-semibold text-orange-600 mb-1">Nenhum evento recebido ainda</p>
                    <p className="text-[10px]" style={{ color: '#667781' }}>
                      Vá para a aba <strong>Conexão</strong>, certifique-se de estar conectado e clique em <strong>Sincronizar Webhook</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#F0F2F5]">
                    {logs.map((l, i) => (
                      <div key={i} className="px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-semibold truncate" style={{ color: '#475569' }}>{l.event_type}</span>
                          <span className="text-[10px] flex-shrink-0" style={{ color: '#8696A0' }}>
                            {new Date(l.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[10px] truncate mt-0.5" style={{ color: '#8696A0' }}>{l.resumo}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function PainelTab({ onGoConexao }: { onGoConexao: () => void }) {
  const [conversas,    setConversas]    = useState<Conversa[]>([])
  const [convSel,      setConvSel]      = useState<Conversa | null>(null)
  const [mensagens,    setMensagens]    = useState<Mensagem[]>([])
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs,  setLoadingMsgs]  = useState(false)
  const [erroLista,    setErroLista]    = useState<string | null>(null)
  const [busca,        setBusca]        = useState('')
  const [conectado,    setConectado]    = useState<boolean | null>(null)

  const pollRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const msgPollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const carregarConversas = useCallback(async () => {
    const res = await listarConversasAction()
    if ('data' in res) {
      setConversas(res.data)
      setErroLista(null)
    } else {
      setErroLista(res.error)
    }
    setLoadingConvs(false)
  }, [])

  const carregarMensagens = useCallback(async (conv: Conversa) => {
    if (conv.sem_conversa) { setMensagens([]); return }
    setLoadingMsgs(true)
    const res = await listarMensagensAction(conv.id)
    if ('data' in res) setMensagens(res.data)
    setLoadingMsgs(false)
    if (conv.nao_lidas > 0) {
      await marcarLidoAction(conv.id)
      setConversas(prev => prev.map(c => c.id === conv.id ? { ...c, nao_lidas: 0 } : c))
    }
  }, [])

  const silentPollMensagens = useCallback(async (conv: Conversa) => {
    const res = await listarMensagensAction(conv.id)
    if (!('data' in res)) return
    setMensagens(prev => {
      const novo = res.data
      if (novo.length !== prev.length) return novo
      if (novo.length > 0 && novo[novo.length - 1].status !== prev[prev.length - 1].status) return novo
      return prev
    })
  }, [])

  useEffect(() => {
    if (!convSel || convSel.sem_conversa) return
    const conv = convSel
    function tick() {
      silentPollMensagens(conv)
      msgPollRef.current = setTimeout(tick, POLL_MS)
    }
    msgPollRef.current = setTimeout(tick, POLL_MS)
    return () => { if (msgPollRef.current) clearTimeout(msgPollRef.current) }
  }, [convSel?.id, silentPollMensagens])

  useEffect(() => {
    getStatusWaAction().then(res => {
      setConectado(!('error' in res) && res.status === 'connected')
    })
    carregarConversas()
    function tick() {
      carregarConversas()
      pollRef.current = setTimeout(tick, POLL_MS)
    }
    pollRef.current = setTimeout(tick, POLL_MS)
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [carregarConversas])

  useEffect(() => {
    if (convSel) carregarMensagens(convSel)
  }, [convSel, carregarMensagens])

  async function selecionarConversa(conv: Conversa) {
    setConvSel(conv)
    setMensagens([])
  }

  async function handleEnviar(texto: string): Promise<string | null> {
    if (!convSel) return null
    const res = await enviarMensagemAction(convSel.id, convSel.jid, texto)
    if ('error' in res) return res.error

    const { mensagem, realConversaId } = res

    if (realConversaId) {
      const novaConv: Conversa = {
        ...convSel,
        id:              realConversaId,
        sem_conversa:    false,
        ultima_mensagem: `Você: ${texto}`,
        ultima_msg_at:   new Date().toISOString(),
        ultima_de_mim:   true,
      }
      setConvSel(novaConv)
      setConversas(prev => [novaConv, ...prev.filter(c => c.id !== convSel.id)])
    } else {
      setConversas(prev => prev.map(c =>
        c.id === convSel.id
          ? { ...c, ultima_mensagem: `Você: ${texto}`, ultima_msg_at: new Date().toISOString(), ultima_de_mim: true }
          : c
      ))
    }

    setMensagens(prev => [...prev, mensagem])
    return null
  }

  function handleCadastrado(nome: string, pacienteId: string) {
    if (!convSel) return
    const atualizado = { ...convSel, paciente_id: pacienteId, paciente_nome: nome }
    setConvSel(atualizado)
    setConversas(prev => prev.map(c => c.id === convSel.id ? atualizado : c))
  }

  const filtradas = conversas.filter(c => {
    if (!busca) return true
    const q = busca.toLowerCase()
    return (
      (c.paciente_nome  ?? '').toLowerCase().includes(q) ||
      (c.nome_contato   ?? '').toLowerCase().includes(q) ||
      (c.telefone       ?? '').includes(q)
    )
  })

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      className="flex overflow-hidden rounded-xl shadow-lg"
      style={{ height: 'calc(100vh - 180px)', minHeight: 520, border: '1px solid #E9EDEF' }}
    >
      {/* ── Coluna esquerda ── */}
      <div
        className="w-[340px] flex-shrink-0 flex flex-col"
        style={{ background: '#FFFFFF', borderRight: '1px solid #E9EDEF' }}
      >
        {/* Header verde */}
        <div
          className="flex items-center justify-between px-4 flex-shrink-0"
          style={{ background: '#075E54', height: 56 }}
        >
          <span className="text-[15px] font-semibold text-white">Conversas</span>
          <div className="flex items-center gap-4 opacity-80">
            <svg viewBox="0 0 24 24" fill="white" width={20} height={20}>
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14l4-4h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
            </svg>
            <svg viewBox="0 0 24 24" fill="white" width={20} height={20}>
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </div>
        </div>

        {/* Busca */}
        <div className="px-3 py-2 flex-shrink-0" style={{ background: '#F0F2F5' }}>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: '#FFFFFF' }}
          >
            <svg viewBox="0 0 24 24" fill="#8696A0" width={16} height={16}>
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Pesquisar ou começar nova conversa"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: '#111B21' }}
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto" style={{ background: '#FFFFFF' }}>
          {loadingConvs && (
            <div className="flex justify-center py-12">
              <svg className="animate-spin w-5 h-5" style={{ color: '#128C7E' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M12 3a9 9 0 109 9" />
              </svg>
            </div>
          )}
          {!loadingConvs && erroLista && (
            <div className="mx-3 mt-4 p-3 rounded-lg bg-red-50 border border-red-100">
              <p className="text-[11px] font-semibold text-red-600 mb-1">Erro ao carregar lista</p>
              <p className="text-[10px] text-red-500 font-mono break-all">{erroLista}</p>
            </div>
          )}
          {!loadingConvs && !erroLista && filtradas.length === 0 && !busca && (
            <PainelDiagnostico onMensagemSimulada={carregarConversas} />
          )}
          {!loadingConvs && !erroLista && filtradas.length === 0 && busca && (
            <p className="text-xs text-center py-10" style={{ color: '#8696A0' }}>Nenhuma conversa encontrada</p>
          )}
          {filtradas.map(conv => (
            <ConversaCard
              key={conv.id}
              conv={conv}
              selected={convSel?.id === conv.id}
              onClick={() => selecionarConversa(conv)}
            />
          ))}
        </div>
      </div>

      {/* ── Coluna direita ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {conectado === false && !convSel && (
          <EstadoDesconectado onGoConexao={onGoConexao} />
        )}

        {!convSel && conectado !== false && (
          <div
            className="flex flex-col items-center justify-center h-full text-center px-8"
            style={{ background: '#F0F2F5' }}
          >
            {/* Ícone decorativo circular estilo WhatsApp Web */}
            <div
              className="w-[240px] h-[240px] rounded-full flex items-center justify-center mb-8"
              style={{ background: 'rgba(18,140,126,0.08)', border: '2px solid rgba(18,140,126,0.12)' }}
            >
              <svg viewBox="0 0 212 212" width={120} height={120}>
                <path d="M106 0C47.4 0 0 47.4 0 106c0 19.3 5.2 37.3 14.3 52.9L0 212l54.5-14.2C70 206.8 87.5 212 106 212c58.6 0 106-47.4 106-106S164.6 0 106 0z" fill="#25D366"/>
                <path d="M106 194c-17.2 0-33.3-4.7-47.1-12.9l-3.4-2-35.2 9.2 9.4-34.3-2.2-3.5C18.7 136.9 14 122 14 106 14 55.2 55.2 14 106 14s92 41.2 92 92-41.2 92-92 92z" fill="#FAFAFA"/>
                <path d="M153.8 130c-2.7-1.4-15.9-7.8-18.3-8.7-2.5-.9-4.3-1.4-6.1 1.4-1.8 2.7-6.9 8.7-8.5 10.5-1.6 1.8-3.1 2-5.8.7-2.7-1.4-11.4-4.2-21.7-13.4-8-7.1-13.4-15.9-14.9-18.6-1.6-2.7-.2-4.2 1.2-5.5 1.2-1.2 2.7-3.1 4.1-4.7 1.4-1.6 1.8-2.7 2.7-4.5.9-1.8.5-3.4-.2-4.7-.7-1.4-6.1-14.7-8.4-20.1-2.2-5.3-4.5-4.5-6.1-4.6-1.6-.1-3.4-.1-5.2-.1-1.8 0-4.7.7-7.2 3.4-2.5 2.7-9.4 9.2-9.4 22.4s9.6 26 11 27.8c1.4 1.8 18.9 28.8 45.7 40.4 6.4 2.7 11.3 4.4 15.2 5.6 6.4 2 12.2 1.7 16.8 1 5.1-.8 15.9-6.5 18.1-12.8 2.3-6.2 2.3-11.6 1.6-12.7-.7-1-2.5-1.7-5.2-3.1z" fill="#25D366"/>
              </svg>
            </div>
            <h2 className="text-[22px] font-light mb-3" style={{ color: '#41525D' }}>
              WhatsApp CinesioPro
            </h2>
            <p className="text-[14px] leading-relaxed max-w-sm" style={{ color: '#8696A0' }}>
              Selecione uma conversa na lista à esquerda para começar a trocar mensagens.
            </p>
            <div className="flex items-center gap-2 mt-8 opacity-50">
              <svg viewBox="0 0 12 12" width={12} height={12} fill="#8696A0">
                <path d="M5.998.5C2.96.5.5 2.96.5 5.998c0 3.038 2.46 5.502 5.498 5.502C9.036 11.5 11.5 9.036 11.5 5.998 11.5 2.96 9.036.5 5.998.5zm2.5 7.5l-.833-.5L6.5 9.167V8.5h-1v.667L4.335 7.5l-.833.5V4l.833.5L5.5 2.833V3.5h1v-.667L7.665 4.5l.833-.5v4z"/>
              </svg>
              <span className="text-[12px]" style={{ color: '#8696A0' }}>
                Suas mensagens são criptografadas de ponta a ponta
              </span>
            </div>
          </div>
        )}

        {convSel && (
          <>
            {conectado === false && (
              <div className="px-4 py-2 flex items-center gap-2 flex-shrink-0" style={{ background: '#FFF9C4', borderBottom: '1px solid #F5E642' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth={2} width={14} height={14}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                </svg>
                <p className="text-xs text-orange-700 flex-1">WhatsApp desconectado — não é possível enviar mensagens.</p>
                <button onClick={onGoConexao} className="text-xs text-orange-700 underline font-medium">Conectar</button>
              </div>
            )}
            <ChatArea
              key={convSel.id}
              conv={convSel}
              mensagens={mensagens}
              loadingMsgs={loadingMsgs}
              onEnviar={handleEnviar}
              onCadastrado={handleCadastrado}
            />
          </>
        )}
      </div>
    </div>
  )
}
