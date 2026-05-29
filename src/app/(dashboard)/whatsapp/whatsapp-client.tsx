'use client'

import { useState, useRef, useCallback } from 'react'
import { MessageSquare, History, FileText, Link2, Bot, Bug } from 'lucide-react'
import * as XLSX from 'xlsx'
import { ConexaoTab } from './conexao-tab'
import { TemplatesTab } from './templates-tab'
import { PainelTab } from './painel-tab'
import { HistoricoTab } from './historico-tab'

// ── Tipos ─────────────────────────────────────────────────────────────────────
export interface LogEntry {
  id:       number
  data:     Date
  situacao: 'Enviado' | 'Recebido'
  acao:     string
  json:     string
}

export type AddLogFn = (situacao: 'Enviado' | 'Recebido', acao: string, payload: object) => void

type Aba = 'painel' | 'historico' | 'templates' | 'conexao' | 'agente-ia' | 'diagnostico'

// ── Ícone decorativo WhatsApp para os placeholders ───────────────────────────
function WaIcon({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

// ── Placeholder genérico ─────────────────────────────────────────────────────
function EmBreve({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
        style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
      >
        <WaIcon size={38} className="text-white" />
      </div>
      <h2 className="text-xl font-bold text-[#2C3E50] mb-2">{titulo}</h2>
      <p className="text-sm text-[#7F8C8D] max-w-sm leading-relaxed">{descricao}</p>
      <span className="mt-6 inline-block px-4 py-1.5 rounded-full text-xs font-semibold bg-[#25D366]/10 text-[#128C7E]">
        Em breve
      </span>
    </div>
  )
}

// ── Aba Diagnóstico ───────────────────────────────────────────────────────────
function DiagnosticoTab({
  logs,
  setLogs,
  debugEnabled,
  onToggle,
}: {
  logs:         LogEntry[]
  setLogs:      React.Dispatch<React.SetStateAction<LogEntry[]>>
  debugEnabled: boolean
  onToggle:     (v: boolean) => void
}) {
  function exportarExcel() {
    const rows = logs.map(l => ({
      Data:     l.data.toLocaleString('pt-BR'),
      Acao:     l.acao,
      Situacao: l.situacao,
      JSON:     l.json,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 12 }, { wch: 120 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Logs UAZAPI')
    XLSX.writeFile(wb, `uazapi-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`)
  }

  return (
    <div className="py-6 space-y-5">
      {/* Cabeçalho + Toggle */}
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="font-semibold text-[#2C3E50] text-sm">Log de chamadas API — UAZAPI</p>
          <p className="text-xs text-[#7F8C8D] mt-0.5">
            Registra cada requisição enviada e resposta recebida. Visível apenas para Desenvolvedores.
          </p>
        </div>

        {/* Toggle switch */}
        <button
          onClick={() => onToggle(!debugEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            debugEnabled ? 'bg-[#8E44AD]' : 'bg-[#CBD5E1]'
          }`}
          title={debugEnabled ? 'Desligar diagnóstico' : 'Ligar diagnóstico'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              debugEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Estado desligado */}
      {!debugEnabled && (
        <div className="flex flex-col items-center py-12 text-center text-[#94A3B8]">
          <Bug size={32} className="mb-3 opacity-40" />
          <p className="text-sm font-medium">Diagnóstico desligado</p>
          <p className="text-xs mt-1">Ative o toggle acima para começar a capturar logs.</p>
        </div>
      )}

      {/* Tabela de logs */}
      {debugEnabled && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <p className="text-xs font-semibold text-[#475569] uppercase tracking-wide">
              {logs.length === 0 ? 'Aguardando chamadas…' : `${logs.length} entrada${logs.length !== 1 ? 's' : ''}`}
            </p>
            {logs.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={exportarExcel}
                  className="text-xs text-[#4A3AE8] hover:underline font-medium"
                >
                  ↓ Exportar Excel
                </button>
                <button
                  onClick={() => setLogs([])}
                  className="text-xs text-[#94A3B8] hover:text-[#DC2626] transition-colors"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#94A3B8]">
              Nenhum log ainda. Interaja com a aba Conexão para gerar chamadas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0]">
                    <th className="text-left px-4 py-2.5 font-semibold text-[#64748B] whitespace-nowrap w-36">Data</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-[#64748B] w-28">Situação</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-[#64748B]">JSON</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                      <td className="px-4 py-2.5 text-[#64748B] whitespace-nowrap font-mono">
                        {log.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        <span className="block text-[10px] text-[#94A3B8]">{log.acao}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          log.situacao === 'Enviado'
                            ? 'bg-[#EEF2FF] text-[#4A3AE8]'
                            : 'bg-[#DCFCE7] text-[#16A34A]'
                        }`}>
                          {log.situacao === 'Enviado' ? '↑ Enviado' : '↓ Recebido'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <pre className="text-[10px] text-[#334155] font-mono whitespace-pre-wrap break-all leading-relaxed max-h-32 overflow-y-auto">
                          {log.json}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Client principal ──────────────────────────────────────────────────────────
export function WhatsappClient({ isDev }: { isDev: boolean }) {
  const [aba, setAba] = useState<Aba>('painel')

  // ── Estado de logs (levantado para compartilhar com DiagnosticoTab) ──────────
  const [logs,         setLogs]         = useState<LogEntry[]>([])
  const [debugEnabled, setDebugEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('wa_debug') === 'true'
  })
  const logIdRef = useRef(0)

  function toggleDebug(v: boolean) {
    localStorage.setItem('wa_debug', String(v))
    setDebugEnabled(v)
    if (!v) setLogs([])
  }

  // ── addLog exposto para ConexaoTab ───────────────────────────────────────────
  const addLog = useCallback<AddLogFn>((situacao, acao, payload) => {
    if (!debugEnabled) return
    const entry: LogEntry = {
      id:       ++logIdRef.current,
      data:     new Date(),
      situacao,
      acao,
      json:     JSON.stringify(payload, null, 2),
    }
    setLogs(prev => [entry, ...prev].slice(0, 50))
  }, [debugEnabled])

  // ── Definição das abas ───────────────────────────────────────────────────────
  const ABAS_BASE: { id: Aba; label: string; icon: React.ReactNode }[] = [
    { id: 'painel',    label: 'Painel',     icon: <MessageSquare size={15} /> },
    { id: 'historico', label: 'Histórico',  icon: <History size={15} /> },
    { id: 'templates', label: 'Templates',  icon: <FileText size={15} /> },
    { id: 'conexao',   label: 'Conexão',    icon: <Link2 size={15} /> },
    { id: 'agente-ia', label: 'Agente IA',  icon: <Bot size={15} /> },
  ]

  const ABAS = isDev
    ? [...ABAS_BASE, { id: 'diagnostico' as Aba, label: 'Diagnóstico', icon: <Bug size={15} /> }]
    : ABAS_BASE

  return (
    <div className="space-y-0">
      {/* Barra de abas */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm">
        <nav className="flex items-center px-2 pt-2">
          {ABAS.map((a) => {
            const active = aba === a.id
            const isDiag = a.id === 'diagnostico'
            return (
              <button
                key={a.id}
                onClick={() => setAba(a.id)}
                className={`
                  flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-xl
                  border-b-2 transition-all
                  ${active
                    ? isDiag
                      ? 'border-[#8E44AD] text-[#8E44AD] font-semibold bg-[#8E44AD]/5'
                      : 'border-[#25D366] text-[#128C7E] font-semibold bg-[#25D366]/5'
                    : 'border-transparent text-[#7F8C8D] hover:text-[#2C3E50] hover:bg-slate-50'
                  }
                `}
              >
                <span className={active ? (isDiag ? 'text-[#8E44AD]' : 'text-[#25D366]') : 'text-[#B0BEC5]'}>
                  {a.icon}
                </span>
                {a.label}
                {/* Badge indicador quando diagnóstico está ativo */}
                {isDiag && debugEnabled && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-[#8E44AD] animate-pulse" />
                )}
              </button>
            )
          })}
        </nav>

        {/* Divisor */}
        <div className="border-t border-[#E8E8E8]" />

        {/* Conteúdo da aba */}
        <div className="px-6">
          {aba === 'painel'      && <PainelTab onGoConexao={() => setAba('conexao')} />}
          {aba === 'historico'   && <HistoricoTab />}
          {aba === 'templates'   && <TemplatesTab />}
          {aba === 'conexao'     && <ConexaoTab addLog={addLog} debugEnabled={debugEnabled} />}
          {aba === 'agente-ia'   && <EmBreve titulo="Agente IA"         descricao="Configure um assistente inteligente para responder dúvidas, agendar e enviar confirmações automaticamente." />}
          {aba === 'diagnostico' && isDev && (
            <DiagnosticoTab
              logs={logs}
              setLogs={setLogs}
              debugEnabled={debugEnabled}
              onToggle={toggleDebug}
            />
          )}
        </div>
      </div>
    </div>
  )
}
