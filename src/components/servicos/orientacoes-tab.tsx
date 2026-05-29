'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  listarOrientacoesAction,
  salvarOrientacaoAction,
  excluirOrientacaoAction,
  type OrientacaoServico,
} from '@/app/(dashboard)/servicos/orientacoes-actions'
import { ORIENTACAO_TAGS } from '@/lib/orientacoes-utils'
import type { Servico, Profissional, Vinculo } from '@/app/(dashboard)/servicos/servicos-client'

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface EditorState {
  id?:      string
  mensagem: string
  ativo:    boolean
  dirty:    boolean
  saving:   boolean
}

type EditorMap = Record<string, EditorState>  // key = `${servico_id}__${profissional_id ?? 'geral'}`

function editorKey(servicoId: string, profId: string | null) {
  return `${servicoId}__${profId ?? 'geral'}`
}

// ─── Sub-componente: editor de mensagem individual ────────────────────────────

function MensagemEditor({
  label,
  sublabel,
  state,
  onChange,
  onToggleAtivo,
  onSalvar,
  onExcluir,
}: {
  label:        string
  sublabel?:    string
  state:        EditorState
  onChange:     (v: string) => void
  onToggleAtivo:(v: boolean) => void
  onSalvar:     () => void
  onExcluir?:   () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const inserirTag = useCallback((tag: string) => {
    const el = textareaRef.current
    if (!el) { onChange(state.mensagem + tag); return }
    const start = el.selectionStart
    const end   = el.selectionEnd
    const nova  = state.mensagem.slice(0, start) + tag + state.mensagem.slice(end)
    onChange(nova)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + tag.length, start + tag.length)
    }, 0)
  }, [state.mensagem, onChange])

  return (
    <div className={`rounded-xl border transition-all ${state.ativo ? 'border-[#E2E8F0] bg-white' : 'border-dashed border-[#CBD5E1] bg-[#F8FAFC]'}`}>
      {/* Cabeçalho do editor */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#F1F5F9]">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1E293B] truncate">{label}</p>
          {sublabel && <p className="text-[11px] text-[#94A3B8] mt-0.5">{sublabel}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Toggle ativo */}
          <span className="text-xs text-[#64748B]">{state.ativo ? 'Ativo' : 'Inativo'}</span>
          <button
            onClick={() => onToggleAtivo(!state.ativo)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${state.ativo ? 'bg-[#25D366]' : 'bg-[#CBD5E1]'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${state.ativo ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
          {/* Excluir (só se já existe no banco) */}
          {onExcluir && state.id && (
            <button
              onClick={onExcluir}
              className="p-1 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50 transition-all"
              title="Remover orientação"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Body do editor */}
      <div className="p-4 space-y-3">
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {ORIENTACAO_TAGS.map(t => (
            <button
              key={t.tag}
              onClick={() => inserirTag(t.tag)}
              title={`Exemplo: ${t.exemplo}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] text-[11px] font-medium border border-[#E2E8F0] transition-colors"
            >
              <span className="font-mono">{t.tag}</span>
            </button>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={state.mensagem}
          onChange={e => onChange(e.target.value)}
          rows={5}
          placeholder="Digite a orientação que será enviada ao paciente quando este serviço for agendado..."
          className="w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-[#334155] bg-white placeholder:text-[#94A3B8] resize-none focus:outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10 leading-relaxed"
        />

        {/* Rodapé */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[#94A3B8]">{state.mensagem.length} caracteres</p>
          <button
            onClick={onSalvar}
            disabled={state.saving || !state.mensagem.trim()}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-white transition-all disabled:opacity-50 hover:opacity-90"
            style={{ background: state.dirty ? '#4A3AE8' : '#CBD5E1' }}
          >
            {state.saving ? (
              <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={12} height={12}>
                <path strokeLinecap="round" d="M12 3a9 9 0 109 9"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={12} height={12}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3"/>
              </svg>
            )}
            {state.dirty ? 'Salvar' : 'Salvo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function OrientacoesTab({
  servicos,
  profissionais,
  vinculos,
}: {
  servicos:      Servico[]
  profissionais: Profissional[]
  vinculos:      Vinculo[]
}) {
  const [loading, setLoading]               = useState(true)
  const [servicoId, setServicoId]           = useState<string | null>(null)
  const [editors, setEditors]               = useState<EditorMap>({})
  const [expandProf, setExpandProf]         = useState(false)
  const [toast, setToast]                   = useState<{ msg: string; ok: boolean } | null>(null)

  const servicosAtivos = servicos.filter(s => s.ativo)

  // Profissionais vinculados ao serviço selecionado
  const profsDoServico = servicoId
    ? profissionais.filter(p =>
        vinculos.some(v => v.servico_id === servicoId && v.profissional_id === p.id)
      )
    : []

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Carrega orientações do banco ──────────────────────────────────────────
  useEffect(() => {
    listarOrientacoesAction().then(res => {
      if ('data' in res) {
        const map: EditorMap = {}
        for (const o of res.data) {
          const k = editorKey(o.servico_id, o.profissional_id)
          map[k] = { id: o.id, mensagem: o.mensagem, ativo: o.ativo, dirty: false, saving: false }
        }
        setEditors(map)
      }
      setLoading(false)
    })
  }, [])

  // ── Selecionar serviço ────────────────────────────────────────────────────
  function selecionarServico(id: string) {
    setServicoId(id)
    setExpandProf(false)
    // Inicializa editors vazios para geral e profissionais se ainda não existirem
    setEditors(prev => {
      const next = { ...prev }
      const kg = editorKey(id, null)
      if (!next[kg]) next[kg] = { mensagem: '', ativo: true, dirty: false, saving: false }
      return next
    })
  }

  // ── Helpers de editor ─────────────────────────────────────────────────────
  function getEditor(sid: string, pid: string | null): EditorState {
    const k = editorKey(sid, pid)
    return editors[k] ?? { mensagem: '', ativo: true, dirty: false, saving: false }
  }

  function updateEditor(sid: string, pid: string | null, patch: Partial<EditorState>) {
    const k = editorKey(sid, pid)
    setEditors(prev => ({
      ...prev,
      [k]: { ...(prev[k] ?? { mensagem: '', ativo: true, dirty: false, saving: false }), ...patch },
    }))
  }

  // ── Salvar ────────────────────────────────────────────────────────────────
  async function salvar(sid: string, pid: string | null) {
    const state = getEditor(sid, pid)
    if (!state.mensagem.trim()) return

    updateEditor(sid, pid, { saving: true })
    const res = await salvarOrientacaoAction({
      id:              state.id,
      servico_id:      sid,
      profissional_id: pid,
      mensagem:        state.mensagem,
      ativo:           state.ativo,
    })
    if ('error' in res) {
      showToast(res.error, false)
      updateEditor(sid, pid, { saving: false })
      return
    }
    updateEditor(sid, pid, { id: res.id, saving: false, dirty: false })
    showToast('Orientação salva com sucesso!')
  }

  // ── Excluir ───────────────────────────────────────────────────────────────
  async function excluir(sid: string, pid: string | null) {
    const state = getEditor(sid, pid)
    if (!state.id) return

    const res = await excluirOrientacaoAction(state.id)
    if ('error' in res) { showToast(res.error, false); return }

    const k = editorKey(sid, pid)
    setEditors(prev => {
      const next = { ...prev }
      delete next[k]
      return next
    })
    showToast('Orientação removida.')
  }

  // ── Indicador: serviço tem pelo menos 1 orientação ────────────────────────
  function temOrientacao(sid: string): boolean {
    return Object.keys(editors).some(k => k.startsWith(`${sid}__`) && editors[k].id)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin w-6 h-6 text-[#CBD5E1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M12 3a9 9 0 109 9"/>
        </svg>
      </div>
    )
  }

  const servico = servicosAtivos.find(s => s.id === servicoId)

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${toast.ok ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`}>
          {toast.msg}
        </div>
      )}

      {/* Descrição */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-blue-100 bg-blue-50 text-blue-700 text-sm">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={18} height={18} className="flex-shrink-0 mt-0.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>
        </svg>
        <p>
          Configure mensagens automáticas que serão enviadas ao paciente via WhatsApp <strong>sempre que um serviço for agendado</strong>.
          Você pode definir uma mensagem geral por serviço e personalizar para cada profissional.
        </p>
      </div>

      {/* Layout 2 colunas */}
      <div className="grid grid-cols-[260px_1fr] gap-5 items-start">

        {/* ── Lista de serviços ── */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#F1F5F9]">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#94A3B8]">Serviços ativos</p>
          </div>
          <div className="divide-y divide-[#F8FAFC] max-h-[560px] overflow-y-auto">
            {servicosAtivos.length === 0 && (
              <p className="px-4 py-6 text-sm text-[#94A3B8] text-center">Nenhum serviço ativo</p>
            )}
            {servicosAtivos.map(s => {
              const selecionado = servicoId === s.id
              const tem = temOrientacao(s.id)
              return (
                <button
                  key={s.id}
                  onClick={() => selecionarServico(s.id)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${
                    selecionado
                      ? 'bg-[#4A3AE8]/5 border-l-2 border-[#4A3AE8]'
                      : 'hover:bg-[#F8FAFC] border-l-2 border-transparent'
                  }`}
                >
                  {/* Cor do serviço */}
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: s.cor ?? '#94A3B8' }}
                  />
                  <span className={`flex-1 text-sm truncate ${selecionado ? 'font-semibold text-[#1E293B]' : 'text-[#475569]'}`}>
                    {s.nome}
                  </span>
                  {/* Indicador: tem orientação */}
                  {tem && (
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: '#25D366' }}
                      title="Orientação configurada"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Painel direito: editor ── */}
        {!servicoId ? (
          <div className="flex flex-col items-center justify-center py-24 text-[#94A3B8]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={40} height={40} className="mb-3 opacity-40">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3m-3 3h3m-3 3h3"/>
            </svg>
            <p className="text-sm font-medium">Selecione um serviço</p>
            <p className="text-xs mt-1">para configurar as orientações automáticas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Título */}
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: servico?.cor ?? '#94A3B8' }} />
              <h3 className="font-bold text-[#1E293B]">{servico?.nome}</h3>
              {profsDoServico.length > 0 && (
                <span className="text-[11px] text-[#94A3B8]">{profsDoServico.length} profissional{profsDoServico.length !== 1 ? 'is' : ''} vinculado{profsDoServico.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {/* Editor Geral */}
            <MensagemEditor
              label="Mensagem geral"
              sublabel="Enviada para qualquer profissional que não tenha mensagem personalizada"
              state={getEditor(servicoId, null)}
              onChange={v  => updateEditor(servicoId, null, { mensagem: v, dirty: true })}
              onToggleAtivo={v => updateEditor(servicoId, null, { ativo: v, dirty: true })}
              onSalvar={() => salvar(servicoId, null)}
              onExcluir={() => excluir(servicoId, null)}
            />

            {/* Seção por profissional */}
            {profsDoServico.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
                {/* Cabeçalho expansível */}
                <button
                  onClick={() => setExpandProf(v => !v)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={16} height={16} className="text-[#64748B]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>
                    </svg>
                    <span className="text-sm font-semibold text-[#1E293B]">Personalizar por profissional</span>
                    <span className="text-[11px] text-[#94A3B8]">opcional — sobrepõe a mensagem geral</span>
                  </div>
                  <svg
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    width={16} height={16}
                    className={`text-[#94A3B8] transition-transform ${expandProf ? 'rotate-180' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
                  </svg>
                </button>

                {/* Editors por profissional */}
                {expandProf && (
                  <div className="px-5 pb-5 space-y-4 border-t border-[#F1F5F9] pt-4">
                    {profsDoServico.map(prof => (
                      <MensagemEditor
                        key={prof.id}
                        label={prof.nome}
                        sublabel={prof.especialidade ?? undefined}
                        state={(() => {
                          const k = editorKey(servicoId, prof.id)
                          return editors[k] ?? { mensagem: '', ativo: true, dirty: false, saving: false }
                        })()}
                        onChange={v  => updateEditor(servicoId, prof.id, { mensagem: v, dirty: true })}
                        onToggleAtivo={v => updateEditor(servicoId, prof.id, { ativo: v, dirty: true })}
                        onSalvar={() => salvar(servicoId, prof.id)}
                        onExcluir={() => excluir(servicoId, prof.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
