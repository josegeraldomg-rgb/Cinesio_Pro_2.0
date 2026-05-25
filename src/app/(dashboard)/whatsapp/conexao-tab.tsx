'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getStatusWaAction,
  criarInstanciaWaAction,
  conectarWaAction,
  desconectarWaAction,
  excluirInstanciaWaAction,
  configurarWebhookWaAction,
} from './actions'
import type { WaStatusResult } from './actions'

// ─── Constantes ───────────────────────────────────────────────────────────────
const LOADING_TIMEOUT   = 14   // segundos de espera ao criar / conectar
const POLLING_INTERVAL  = 3000 // ms — verifica status enquanto aguarda QR scan
const QR_POLL_LIMIT     = 20   // ~60 s de polling antes de expirar

// ─── Ícones SVG inline ────────────────────────────────────────────────────────
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-full h-full">
      <rect x="5" y="2" width="14" height="20" rx="2" /><line x1="9" y1="18" x2="15" y2="18" />
    </svg>
  )
}
function IconWarning() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}
function IconZap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  )
}
function IconRefresh({ spinning }: { spinning?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}
      className={spinning ? 'animate-spin' : ''}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  )
}
function IconSpinner() {
  return (
    <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
      width={36} height={36}>
      <path strokeLinecap="round" d="M12 3a9 9 0 109 9" />
    </svg>
  )
}

// ─── Helpers visuais ─────────────────────────────────────────────────────────
function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: 'gray' | 'green' | 'red' | 'amber' }) {
  const map = {
    gray:  'bg-[#F1F5F9] text-[#64748B]',
    green: 'bg-[#DCFCE7] text-[#16A34A]',
    red:   'bg-[#FEE2E2] text-[#DC2626]',
    amber: 'bg-[#FEF9C3] text-[#B45309]',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono ${map[color]}`}>
      {children}
    </span>
  )
}

function Btn({
  children, onClick, variant = 'default', disabled, full, loading,
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'default' | 'outline' | 'danger' | 'teal'
  disabled?: boolean
  full?: boolean
  loading?: boolean
}) {
  const base = `inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${full ? 'w-full' : ''}`
  const styles = {
    default: 'bg-[#4A3AE8] text-white hover:bg-[#3829c7] shadow-sm',
    outline: 'border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC]',
    danger:  'bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-sm',
    teal:    'bg-[#0d9488] text-white hover:bg-[#0f766e] shadow-md',
  }
  return (
    <button onClick={onClick} disabled={disabled || loading} className={`${base} ${styles[variant]}`}>
      {loading && <IconSpinner />}
      {children}
    </button>
  )
}

// ─── Estados ─────────────────────────────────────────────────────────────────
type Status =
  | 'init'
  | 'no_instance'
  | 'not_configured'
  | 'loading'
  | 'qrcode'
  | 'paircode'
  | 'disconnected'
  | 'connected'
  | 'error'

// ═════════════════════════════════════════════════════════════════════════════
// Componente principal
// ═════════════════════════════════════════════════════════════════════════════
export function ConexaoTab() {
  const [status,     setStatus]     = useState<Status>('init')
  const [instanceId, setInstanceId] = useState<string | null>(null)
  const [qrcode,     setQrcode]     = useState<string | null>(null)
  const [paircode,   setPaircode]   = useState<string | null>(null)
  const [phone,      setPhone]      = useState<string | null>(null)
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)
  const [countdown,  setCountdown]  = useState(LOADING_TIMEOUT)
  const [refreshing, setRefreshing] = useState(false)
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null)
  const [confirming, setConfirming] = useState(false)

  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCount    = useRef(0)
  const cdRef        = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Toast helper ────────────────────────────────────────────────────────────
  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Aplica resultado de getStatus ────────────────────────────────────────
  const applyStatus = useCallback((res: WaStatusResult) => {
    if ('error' in res) {
      setStatus('error')
      setErrorMsg(res.error)
      return
    }
    switch (res.status) {
      case 'no_instance':
        setStatus('no_instance'); setInstanceId(null); break
      case 'not_configured':
        setStatus('not_configured'); break
      case 'connected':
        setStatus('connected')
        setInstanceId(res.instanceId)
        setPhone(res.phone)
        stopPolling()
        break
      case 'disconnected':
        setStatus('disconnected')
        setInstanceId(res.instanceId)
        stopPolling()
        break
      case 'qrcode':
        setStatus('qrcode')
        setInstanceId(res.instanceId)
        setQrcode(res.qrcode)
        break
      case 'paircode':
        setStatus('paircode')
        setInstanceId(res.instanceId)
        setPaircode(res.paircode)
        break
    }
  }, [])

  // ── Polling ─────────────────────────────────────────────────────────────────
  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }
  function startPolling() {
    stopPolling()
    pollCount.current = 0
    pollRef.current = setInterval(async () => {
      pollCount.current++
      if (pollCount.current >= QR_POLL_LIMIT) {
        stopPolling()
        setStatus('disconnected')
        showToast('QR Code expirou. Gere um novo.', false)
        return
      }
      const res = await getStatusWaAction()
      if (!('error' in res) && res.status === 'connected') {
        applyStatus(res)
        showToast('WhatsApp conectado com sucesso! ✓')
      }
    }, POLLING_INTERVAL)
  }

  // ── Countdown durante loading ────────────────────────────────────────────
  function startCountdown() {
    setCountdown(LOADING_TIMEOUT)
    if (cdRef.current) clearInterval(cdRef.current)
    cdRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(cdRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }
  function stopCountdown() {
    if (cdRef.current) { clearInterval(cdRef.current); cdRef.current = null }
  }

  // ── Carregamento inicial ─────────────────────────────────────────────────
  useEffect(() => {
    getStatusWaAction().then(applyStatus)
    return () => { stopPolling(); stopCountdown() }
  }, [applyStatus])

  // ── Refresh manual ───────────────────────────────────────────────────────
  async function handleRefresh() {
    setRefreshing(true)
    const res = await getStatusWaAction()
    applyStatus(res)
    setRefreshing(false)
  }

  // ── Criar instância e conectar ───────────────────────────────────────────
  async function handleCriarEConectar() {
    setStatus('loading')
    startCountdown()
    setErrorMsg(null)

    const criarRes = await criarInstanciaWaAction()
    if ('error' in criarRes) {
      stopCountdown()
      setStatus('error')
      setErrorMsg(criarRes.error)
      return
    }
    setInstanceId(criarRes.instanceId)

    // Configura webhook (best effort — não bloqueia se falhar)
    configurarWebhookWaAction().catch(() => {})

    const conectarRes = await conectarWaAction()
    stopCountdown()

    if ('error' in conectarRes) {
      setStatus('error')
      setErrorMsg(conectarRes.error)
      return
    }
    if ('qrcode' in conectarRes) {
      setStatus('qrcode')
      setQrcode(conectarRes.qrcode)
      startPolling()
    } else {
      setStatus('paircode')
      setPaircode(conectarRes.paircode)
      startPolling()
    }
  }

  // ── Gerar novo QR ────────────────────────────────────────────────────────
  async function handleNovoQr() {
    setStatus('loading')
    startCountdown()
    stopPolling()

    const res = await conectarWaAction()
    stopCountdown()

    if ('error' in res) {
      setStatus('error'); setErrorMsg(res.error); return
    }
    if ('qrcode' in res) {
      setStatus('qrcode'); setQrcode(res.qrcode); startPolling()
    } else {
      setStatus('paircode'); setPaircode(res.paircode); startPolling()
    }
  }

  // ── Desconectar ──────────────────────────────────────────────────────────
  async function handleDesconectar() {
    const res = await desconectarWaAction()
    if ('error' in res) { showToast(res.error, false); return }
    setStatus('disconnected')
    setPhone(null)
    showToast('Dispositivo desconectado.')
  }

  // ── Excluir instância ────────────────────────────────────────────────────
  async function handleExcluir() {
    if (!confirming) { setConfirming(true); return }
    setConfirming(false)
    const res = await excluirInstanciaWaAction()
    if ('error' in res) { showToast(res.error, false); return }
    setStatus('no_instance')
    setInstanceId(null)
    setPhone(null)
    showToast('Instância excluída.')
  }

  // ── Sincronizar webhook ──────────────────────────────────────────────────
  async function handleWebhook() {
    const res = await configurarWebhookWaAction()
    if ('error' in res) { showToast(res.error, false); return }
    showToast('Webhook sincronizado com sucesso!')
  }

  // ─── Ícone do header por estado ─────────────────────────────────────────
  function HeaderIcon() {
    if (status === 'connected') {
      return (
        <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: '#DCFCE7', color: '#16A34A' }}>
          <div className="w-6 h-6"><IconCheck /></div>
        </div>
      )
    }
    if (status === 'loading') {
      return (
        <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: '#EEF2FF', color: '#4A3AE8' }}>
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" d="M12 3a9 9 0 109 9" />
          </svg>
        </div>
      )
    }
    if (status === 'disconnected') {
      return (
        <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: '#FEF9C3', color: '#B45309' }}>
          <div className="w-5 h-5"><IconWarning /></div>
        </div>
      )
    }
    // default: gear / settings
    return (
      <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: '#F1F5F9', color: '#64748B' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
    )
  }

  // ─── Conteúdo do body por estado ────────────────────────────────────────
  function Body() {
    // ── init / carregando do banco ──
    if (status === 'init') {
      return (
        <div className="flex flex-col items-center py-20">
          <svg className="animate-spin w-8 h-8 text-[#CBD5E1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M12 3a9 9 0 109 9" />
          </svg>
        </div>
      )
    }

    // ── não configurado ──
    if (status === 'not_configured') {
      return (
        <div className="flex flex-col items-center py-16 text-center max-w-sm mx-auto">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: '#FEF9C3', color: '#B45309' }}>
            <div className="w-7 h-7"><IconWarning /></div>
          </div>
          <h3 className="font-bold text-[#2C3E50] mb-2">UAZAPI não configurada</h3>
          <p className="text-sm text-[#7F8C8D] leading-relaxed">
            Defina as variáveis de ambiente <code className="bg-slate-100 px-1 rounded text-xs">UAZAPI_URL</code> e{' '}
            <code className="bg-slate-100 px-1 rounded text-xs">UAZAPI_ADMIN_TOKEN</code> para ativar a integração.
          </p>
        </div>
      )
    }

    // ── sem instância ──
    if (status === 'no_instance') {
      return (
        <div className="flex flex-col items-center py-16 text-center max-w-xs mx-auto">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: '#F1F5F9', color: '#94A3B8' }}>
            <div className="w-7 h-7"><IconPhone /></div>
          </div>
          <h3 className="font-bold text-[#2C3E50] mb-2">Nenhuma instância criada</h3>
          <p className="text-sm text-[#7F8C8D] leading-relaxed mb-7">
            Para começar a enviar mensagens via WhatsApp, precisamos criar uma instância e
            sincronizar seu dispositivo.
          </p>
          <Btn variant="teal" full onClick={handleCriarEConectar}>
            Criar Instância e Conectar
          </Btn>
        </div>
      )
    }

    // ── loading / aguardando ──
    if (status === 'loading') {
      const pct = Math.round(((LOADING_TIMEOUT - countdown) / LOADING_TIMEOUT) * 100)
      return (
        <div className="flex flex-col items-center py-16 text-center">
          <div style={{ color: '#4A3AE8' }}>
            <IconSpinner />
          </div>
          <p className="mt-5 text-sm font-medium text-[#475569]">Aguardando resposta do servidor UAZAPI…</p>
          <div className="mt-5 w-56">
            <div className="flex justify-between text-xs text-[#94A3B8] mb-1.5">
              <span>Verificando</span>
              <span>{countdown}s</span>
            </div>
            <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${pct}%`, background: '#4A3AE8' }}
              />
            </div>
          </div>
        </div>
      )
    }

    // ── QR Code ──
    if (status === 'qrcode' && qrcode) {
      const src = qrcode.startsWith('data:') ? qrcode : `data:image/png;base64,${qrcode}`
      return (
        <div className="flex flex-col items-center py-8">
          <div className="p-3 bg-white border-2 border-[#E2E8F0] rounded-2xl shadow-sm mb-6 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="QR Code WhatsApp" width={200} height={200} className="block" />
          </div>
          <div className="text-left max-w-xs space-y-2">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-3 text-center">
              Como escanear
            </p>
            {[
              'Abra o WhatsApp no celular',
              'Toque em ⋮ Mais opções → Dispositivos vinculados',
              'Toque em Vincular um dispositivo',
              'Aponte a câmera para o QR Code acima',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#25D366] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-[#475569]">{step}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-[#94A3B8]">Aguardando leitura do código…</p>
        </div>
      )
    }

    // ── Pair Code ──
    if (status === 'paircode' && paircode) {
      return (
        <div className="flex flex-col items-center py-10 text-center">
          <div className="px-8 py-4 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-2xl mb-6">
            <p className="text-3xl font-mono font-bold tracking-[0.25em] text-[#2C3E50]">
              {paircode}
            </p>
          </div>
          <p className="text-sm font-semibold text-[#475569] mb-4">Como usar o código</p>
          <div className="text-left max-w-xs space-y-2">
            {[
              'Abra o WhatsApp no celular',
              'Toque em ⋮ → Dispositivos vinculados',
              'Toque em Vincular com número de telefone',
              `Digite o código: ${paircode}`,
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#25D366] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-[#475569]">{step}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-[#94A3B8]">Aguardando confirmação no aparelho…</p>
        </div>
      )
    }

    // ── Desconectado ──
    if (status === 'disconnected') {
      return (
        <div className="flex flex-col items-center py-14 text-center max-w-xs mx-auto">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: '#FEF9C3', color: '#B45309' }}>
            <div className="w-8 h-8"><IconWarning /></div>
          </div>
          <h3 className="font-bold text-[#2C3E50] mb-1.5">Conexão encerrada</h3>
          <p className="text-sm text-[#7F8C8D] mb-8 leading-relaxed">
            A conexão com o WhatsApp foi interrompida ou o dispositivo foi desvinculado.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Btn variant="teal" full onClick={handleNovoQr}>
              Gerar Novo QR Code
            </Btn>
            <Btn variant="danger" onClick={handleExcluir}>
              {confirming ? 'Confirmar exclusão' : 'Excluir Instância'}
            </Btn>
          </div>
          {confirming && (
            <button onClick={() => setConfirming(false)} className="mt-2 text-xs text-[#94A3B8] hover:underline">
              Cancelar
            </button>
          )}
        </div>
      )
    }

    // ── Conectado ──
    if (status === 'connected') {
      return (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
            style={{ background: '#DCFCE7', color: '#16A34A' }}>
            <div className="w-9 h-9"><IconCheck /></div>
          </div>
          <Badge color="green">Conectado</Badge>
          <p className="mt-4 text-2xl font-bold text-[#2C3E50]">{phone}</p>
          <p className="mt-1 text-sm text-[#7F8C8D]">O envio automático está ativo usando este número.</p>
          <div className="mt-8 flex gap-3">
            <Btn variant="outline" onClick={handleDesconectar}>
              Desconectar Dispositivo
            </Btn>
            <Btn variant="danger" onClick={handleExcluir}>
              {confirming ? 'Confirmar exclusão' : 'Excluir Instância'}
            </Btn>
          </div>
          {confirming && (
            <button onClick={() => setConfirming(false)} className="mt-2 text-xs text-[#94A3B8] hover:underline">
              Cancelar
            </button>
          )}
        </div>
      )
    }

    // ── Erro ──
    if (status === 'error') {
      return (
        <div className="flex flex-col items-center py-14 text-center max-w-sm mx-auto">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: '#FEE2E2', color: '#DC2626' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="font-bold text-[#2C3E50] mb-2">Erro ao conectar</h3>
          {errorMsg && (
            <p className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-4 py-2 mb-6 font-mono text-xs leading-relaxed break-all">
              {errorMsg}
            </p>
          )}
          <Btn onClick={() => { setStatus('no_instance'); setErrorMsg(null) }}>
            Voltar
          </Btn>
        </div>
      )
    }

    return null
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto py-8 px-2">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
            toast.ok ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <HeaderIcon />
            <div>
              <p className="font-bold text-[#2C3E50] text-sm">Conexão UAZAPI</p>
              <p className="text-xs text-[#7F8C8D]">Sincronize seu WhatsApp fazendo a leitura do QR Code.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Badge do ID */}
            <Badge color="gray">
              {instanceId ? instanceId.slice(0, 14) : 'Sem ID'}
            </Badge>
            {/* Botão webhook */}
            <button
              onClick={handleWebhook}
              title="Sincronizar Webhook"
              className="p-2 rounded-lg text-[#0ea5e9] hover:bg-[#F0F9FF] transition-colors"
            >
              <IconZap />
            </button>
            {/* Botão refresh */}
            <button
              onClick={handleRefresh}
              title="Verificar status"
              className="p-2 rounded-lg text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
            >
              <IconRefresh spinning={refreshing} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6">
          <Body />
        </div>
      </div>
    </div>
  )
}
