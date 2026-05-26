'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getStatusWaAction } from './actions'
import {
  listarConversasAction,
  listarMensagensAction,
  marcarLidoAction,
  enviarMensagemAction,
  cadastrarContatoRapidoAction,
} from './painel-actions'
import type { Conversa, Mensagem } from './painel-actions'

const POLL_MS = 5000

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
        style={{ width: size, height: size, background: '#3B82F6', fontSize: size * 0.36 }}
      >
        {iniciais(nome)}
      </div>
    )
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: '#E2E8F0' }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={1.5} width={size * 0.5} height={size * 0.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
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
      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-[#F1F5F9] ${
        selected ? 'bg-[#EEF6FF]' : 'bg-white hover:bg-[#F8FAFC]'
      }`}
    >
      <Avatar nome={conv.paciente_nome ?? (conv.nome_contato && !isDesconhecido ? conv.nome_contato : null)} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-sm font-semibold truncate ${isDesconhecido ? 'text-[#64748B]' : 'text-[#1E293B]'}`}>
            {isDesconhecido ? 'Não cadastrado' : nome}
          </span>
          {isDesconhecido && (
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-600">
              Novo
            </span>
          )}
        </div>
        <p className="text-[11px] text-[#94A3B8] truncate">
          {conv.telefone ? conv.telefone.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4') : ''}
        </p>
        <p className={`text-xs truncate mt-0.5 ${semConv ? 'text-[#94A3B8] italic' : 'text-[#64748B]'}`}>
          {semConv
            ? 'Nenhuma conversa iniciada'
            : conv.ultima_mensagem ?? ''}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {conv.ultima_msg_at && (
          <span className="text-[10px] text-[#94A3B8]">{horario(conv.ultima_msg_at)}</span>
        )}
        {conv.nao_lidas > 0 && (
          <span className="w-5 h-5 rounded-full bg-[#25D366] text-white text-[10px] font-bold flex items-center justify-center">
            {conv.nao_lidas > 9 ? '9+' : conv.nao_lidas}
          </span>
        )}
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
    if (msg.tipo === 'image') return <p className="text-xs">📷 {msg.conteudo || 'Imagem'}</p>
    if (msg.tipo === 'video') return <p className="text-xs">🎥 {msg.conteudo || 'Vídeo'}</p>
    if (msg.tipo === 'document') return <p className="text-xs">📄 {msg.conteudo || 'Documento'}</p>
    return <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.conteudo}</p>
  }

  const StatusIcon = () => {
    if (!minha) return null
    if (msg.status === 'read') return (
      <svg viewBox="0 0 16 11" width={14} height={9} fill="#53BDEB" className="flex-shrink-0">
        <path d="M11.07.43L4.16 7.34 1.21 4.39.54 5.06l3.62 3.62 7.57-7.57L11.07.43zm2.01 0l-7.57 7.57-.54-.54-.68.68 1.22 1.22 8.25-8.25-.68-.68z"/>
      </svg>
    )
    return (
      <svg viewBox="0 0 16 11" width={14} height={9} fill="#94A3B8" className="flex-shrink-0">
        <path d="M11.07.43L4.16 7.34 1.21 4.39.54 5.06l3.62 3.62 7.57-7.57L11.07.43zm2.01 0l-7.57 7.57-.54-.54-.68.68 1.22 1.22 8.25-8.25-.68-.68z"/>
      </svg>
    )
  }

  return (
    <div className={`flex ${minha ? 'justify-end' : 'justify-start'} mb-1`}>
      <div
        className={`relative max-w-[72%] px-3 py-2 rounded-2xl shadow-sm ${
          minha
            ? 'rounded-tr-sm bg-[#dcf8c6] text-[#1a1a1a]'
            : 'rounded-tl-sm bg-white text-[#1a1a1a]'
        }`}
      >
        <Conteudo />
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[10px] text-[#94A3B8]">{formatarData(msg.enviado_em)}</span>
          <StatusIcon />
        </div>
      </div>
    </div>
  )
}

// ─── Estado desconectado (direita) ────────────────────────────────────────────
function EstadoDesconectado({ onGoConexao }: { onGoConexao: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-20 h-20 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-5">
        <svg viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth={1.5} width={36} height={36}>
          <rect x="5" y="2" width="14" height="20" rx="2"/>
          <line x1="9" y1="18" x2="15" y2="18"/>
        </svg>
      </div>
      <h3 className="font-bold text-[#1E293B] text-lg mb-2">WhatsApp Não Conectado</h3>
      <p className="text-sm text-[#64748B] leading-relaxed max-w-xs">
        Sua instância do WhatsApp está desconectada. Para enviar e receber mensagens em tempo real diretamente pelo sistema, conecte seu aparelho.
      </p>
      <button
        onClick={onGoConexao}
        className="mt-6 px-6 py-2.5 rounded-full bg-[#3B82F6] text-white text-sm font-semibold hover:bg-[#2563EB] transition-colors shadow-sm"
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
      setTexto(t) // restaura o texto para o usuário não perder o que digitou
    }
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar() }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header do chat */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E2E8F0] bg-white flex-shrink-0">
        <Avatar nome={conv.paciente_nome} size={36} />
        <div>
          <p className="text-sm font-semibold text-[#1E293B]">{nome}</p>
          <p className="text-[10px] text-[#94A3B8]">
            {conv.telefone ? `+${conv.telefone.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '$1 ($2) $3-$4')}` : ''}
          </p>
        </div>
      </div>

      {/* Mensagens */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{ background: '#f0f2f5' }}
      >
        {/* Card de cadastro rápido */}
        {isDesconhecido && (
          <CadastroRapido conv={conv} onCadastrado={onCadastrado} />
        )}

        {conv.sem_conversa && (
          <div className="flex justify-center mb-4">
            <span className="text-[11px] text-[#94A3B8] bg-white px-3 py-1 rounded-full shadow-sm">
              Nenhuma mensagem ainda — inicie uma conversa abaixo
            </span>
          </div>
        )}

        {loadingMsgs && (
          <div className="flex justify-center py-8">
            <svg className="animate-spin w-5 h-5 text-[#CBD5E1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M12 3a9 9 0 109 9" />
            </svg>
          </div>
        )}

        {!loadingMsgs && mensagens.length === 0 && !conv.sem_conversa && (
          <div className="flex justify-center">
            <span className="text-[11px] text-[#94A3B8] bg-white px-3 py-1 rounded-full shadow-sm">
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
      <div className="flex items-end gap-2 px-4 py-3 border-t border-[#E2E8F0] bg-white flex-shrink-0">
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem…"
          rows={1}
          className="flex-1 px-3 py-2 rounded-2xl border border-[#E2E8F0] text-sm resize-none focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366]/30"
          style={{ maxHeight: 120 }}
        />
        <button
          onClick={handleEnviar}
          disabled={sending || !texto.trim()}
          className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center disabled:opacity-40 transition-colors hover:bg-[#1ebe57] flex-shrink-0"
        >
          {sending ? (
            <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" d="M12 3a9 9 0 109 9" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="white" width={16} height={16}>
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
            </svg>
          )}
        </button>
      </div>
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

  // ── Carrega conversas ────────────────────────────────────────────────────────
  const carregarConversas = useCallback(async () => {
    const res = await listarConversasAction()
    if ('data' in res) {
      setConversas(res.data)
      setErroLista(null)
    } else {
      setErroLista(res.error)
      console.error('[PainelTab] listarConversasAction:', res.error)
    }
    setLoadingConvs(false)
  }, [])

  // ── Carrega mensagens da conversa selecionada ─────────────────────────────
  const carregarMensagens = useCallback(async (conv: Conversa) => {
    if (conv.sem_conversa) { setMensagens([]); return }
    setLoadingMsgs(true)
    const res = await listarMensagensAction(conv.id)
    if ('data' in res) setMensagens(res.data)
    setLoadingMsgs(false)
    // Marca como lido
    if (conv.nao_lidas > 0) {
      await marcarLidoAction(conv.id)
      setConversas(prev => prev.map(c => c.id === conv.id ? { ...c, nao_lidas: 0 } : c))
    }
  }, [])

  // Poll silencioso: atualiza mensagens do chat ativo sem spinner
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

  // ── Poll de mensagens da conversa ativa ──────────────────────────────────────
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

  // ── Verifica conexão e inicia polling ────────────────────────────────────────
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

  // ── Re-carrega mensagens quando muda a conversa ──────────────────────────
  useEffect(() => {
    if (convSel) carregarMensagens(convSel)
  }, [convSel, carregarMensagens])

  // ── Seleciona conversa ────────────────────────────────────────────────────
  async function selecionarConversa(conv: Conversa) {
    setConvSel(conv)
    setMensagens([])
  }

  // ── Envia mensagem ────────────────────────────────────────────────────────
  async function handleEnviar(texto: string): Promise<string | null> {
    if (!convSel) return null
    const res = await enviarMensagemAction(convSel.id, convSel.jid, texto)
    if ('error' in res) return res.error

    const { mensagem, realConversaId } = res

    // Se foi uma conversa virtual (pac-*), atualiza convSel com o ID real
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
      // Substitui o item virtual na lista pela conversa real
      setConversas(prev => [
        novaConv,
        ...prev.filter(c => c.id !== convSel.id),
      ])
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

  // ── Cadastrou contato ─────────────────────────────────────────────────────
  function handleCadastrado(nome: string, pacienteId: string) {
    if (!convSel) return
    const atualizado = { ...convSel, paciente_id: pacienteId, paciente_nome: nome }
    setConvSel(atualizado)
    setConversas(prev => prev.map(c => c.id === convSel.id ? atualizado : c))
  }

  // ── Filtro de busca ────────────────────────────────────────────────────────
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
    <div className="flex" style={{ height: 'calc(100vh - 180px)', minHeight: 520 }}>

      {/* ── Coluna esquerda: Lista de conversas ── */}
      <div className="w-[300px] flex-shrink-0 border-r border-[#E2E8F0] flex flex-col">
        {/* Busca */}
        <div className="px-3 py-2.5 border-b border-[#E2E8F0] bg-white">
          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#F1F5F9]">
            <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2} width={14} height={14}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
            </svg>
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar paciente..."
              className="flex-1 bg-transparent text-sm text-[#475569] placeholder:text-[#94A3B8] outline-none"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs && (
            <div className="flex justify-center py-12">
              <svg className="animate-spin w-5 h-5 text-[#CBD5E1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
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
          {!loadingConvs && !erroLista && filtradas.length === 0 && (
            <p className="text-xs text-[#94A3B8] text-center py-10">Nenhuma conversa encontrada</p>
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

      {/* ── Coluna direita: Chat ou estado vazio ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {conectado === false && !convSel && (
          <EstadoDesconectado onGoConexao={onGoConexao} />
        )}

        {!convSel && conectado !== false && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth={1.2} width={56} height={56} className="mb-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"/>
            </svg>
            <p className="text-sm font-medium text-[#94A3B8]">Selecione uma conversa para começar</p>
          </div>
        )}

        {convSel && (
          <>
            {conectado === false && (
              <div className="px-4 py-2 bg-orange-50 border-b border-orange-100 flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth={2} width={14} height={14}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                </svg>
                <p className="text-xs text-orange-600">WhatsApp desconectado — não é possível enviar mensagens.</p>
                <button onClick={onGoConexao} className="ml-auto text-xs text-orange-600 underline font-medium">Conectar</button>
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
