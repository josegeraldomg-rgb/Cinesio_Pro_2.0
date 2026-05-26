'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  listarTemplatesAction,
  salvarTemplateAction,
  enviarTesteTemplateAction,
} from './templates-actions'
import type { TemplateData, TemplatesMap } from './templates-actions'

// ─── Definição dos gatilhos ───────────────────────────────────────────────────
type TipoDisparo = 'imediato' | 'minutos_antes' | 'horario_fixo'

interface GatilhoDef {
  id:              string
  label:           string
  sublabelDefault: string
  emoji:           string
  tipo:            TipoDisparo
  minutosDefault?: number
  horarioDefault?: string
}

const GATILHOS: GatilhoDef[] = [
  { id: 'novo_agendamento_paciente', label: 'Novo Agendamento (Paciente)', sublabelDefault: 'Imediatamente',  emoji: '📅', tipo: 'imediato' },
  { id: 'novo_agendamento_empresa',  label: 'Novo Agendamento (Empresa)',  sublabelDefault: 'Imediatamente',  emoji: '📋', tipo: 'imediato' },
  { id: 'lembrete_horario',          label: 'Lembrete de Horário',         sublabelDefault: '180 min antes',  emoji: '⏰', tipo: 'minutos_antes', minutosDefault: 180 },
  { id: 'pedido_confirmacao',        label: 'Pedido de Confirmação',       sublabelDefault: '1440 min antes', emoji: '✅', tipo: 'minutos_antes', minutosDefault: 1440 },
  { id: 'aniversario_paciente',      label: 'Aniversário do Paciente',     sublabelDefault: 'Às 09:00h',      emoji: '🎂', tipo: 'horario_fixo', horarioDefault: '09:00' },
  { id: 'agenda_diaria',             label: 'Agenda Diária',               sublabelDefault: 'Às 21:00h',      emoji: '📊', tipo: 'horario_fixo', horarioDefault: '21:00' },
]

// ─── Mensagens padrão de fábrica ─────────────────────────────────────────────
const MENSAGENS_PADRAO: Record<string, string> = {
  novo_agendamento_paciente:
`Olá, [[cliente_nome]]! 🎉 Seu agendamento na *[[empresa_nome]]* foi confirmado com sucesso!

📅 *Data e horário:* [[data_agendamento]] às [[hora_agendamento]]
🏥 *Serviço(s):* [[servico_nome]]
💰 *Valor total:* [[valor_agendamento]]

Caso precise remarcar ou cancelar, é só nos avisar. Estamos à disposição! 😊`,

  novo_agendamento_empresa:
`Olá, [[cliente_nome]]! Seu agendamento na *[[empresa_nome]]* foi marcado com sucesso. Confira os detalhes:

📅 *Data e horário:* [[data_agendamento]] às [[hora_agendamento]]
🏥 *Serviço(s):* [[servico_nome]]
💰 *Valor total:* [[valor_agendamento]]

Caso precise remarcar ou cancelar, é só nos avisar. Estamos à disposição! 📲`,

  lembrete_horario:
`⏰ Olá, [[cliente_nome]]! Lembrete do seu agendamento na *[[empresa_nome]]*:

📅 *Data e horário:* [[data_agendamento]] às [[hora_agendamento]]
🏥 *Serviço(s):* [[servico_nome]]

Te esperamos! Caso precise remarcar, entre em contato com antecedência. 😊`,

  pedido_confirmacao:
`Olá, [[cliente_nome]]! 👋 Você tem um agendamento na *[[empresa_nome]]*:

📅 *[[data_agendamento]] às [[hora_agendamento]]*
🏥 *Serviço(s):* [[servico_nome]]

Por favor, confirme sua presença respondendo:
✅ *SIM* — Confirmo minha presença
❌ *NÃO* — Preciso cancelar

Aguardamos sua resposta! 🙏`,

  aniversario_paciente:
`🎂 Feliz aniversário, [[cliente_nome]]! 🎉

A equipe da *[[empresa_nome]]* deseja a você um dia incrível, repleto de saúde e alegria!

Você é muito especial para nós. Conte sempre com nosso carinho e cuidado! 💚`,

  agenda_diaria:
`📋 *Agenda do dia — [[data_agendamento]]*

Olá, equipe da *[[empresa_nome]]*!

Seguem os atendimentos programados para hoje. Bom trabalho a todos! 💪`,
}

// ─── Tags dinâmicas disponíveis ───────────────────────────────────────────────
interface TagDef { id: string; label: string; icon: string; sample: string }

const TAGS: TagDef[] = [
  { id: 'cliente_nome',      label: '[[cliente_nome]]',      icon: '👤', sample: 'Rafael Abner' },
  { id: 'empresa_nome',      label: '[[empresa_nome]]',      icon: '🏢', sample: 'Clínica Bem Estar' },
  { id: 'data_agendamento',  label: '[[data_agendamento]]',  icon: '📅', sample: '28/05/2026' },
  { id: 'hora_agendamento',  label: '[[hora_agendamento]]',  icon: '⏰', sample: '14:30' },
  { id: 'servico_nome',      label: '[[servico_nome]]',      icon: '✂️', sample: 'Pilates Terapêutico' },
  { id: 'valor_agendamento', label: '[[valor_agendamento]]', icon: '💰', sample: 'R$ 150,00' },
]

// ─── Renderização do preview ──────────────────────────────────────────────────
function renderPreview(texto: string): string {
  // 1. Substitui tags por placeholders seguros (só letras/underscore)
  const placeholders: Record<string, string> = {}
  let t = texto
  for (const tag of TAGS) {
    const ph = `XTAGX${tag.id.toUpperCase()}XTAGX`
    placeholders[ph] = `<span style="color:#2563eb;font-weight:500">${tag.sample}</span>`
    t = t.split(`[[${tag.id}]]`).join(ph)
  }

  // 2. Escapa HTML
  t = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 3. Formata sintaxe WhatsApp
  t = t.replace(/\*((?:[^*\n])+)\*/g, '<strong>$1</strong>')
  t = t.replace(/_((?:[^_\n])+)_/g,   '<em>$1</em>')
  t = t.replace(/~((?:[^~\n])+)~/g,   '<del>$1</del>')
  t = t.replace(/\n/g, '<br/>')

  // 4. Restaura placeholders como HTML
  for (const [ph, html] of Object.entries(placeholders)) {
    t = t.split(ph).join(html)
  }
  return t
}

// ─── Componente: Mockup de Celular ────────────────────────────────────────────
function PhoneMockup({ mensagem }: { mensagem: string }) {
  const html = renderPreview(mensagem)
  const hora  = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col items-center">
      {/* Corpo do celular */}
      <div
        className="relative rounded-[2.5rem] shadow-2xl overflow-hidden"
        style={{
          width: 260,
          background: '#1a1a2e',
          padding: '10px 8px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.08)',
        }}
      >
        {/* Notch + câmera */}
        <div className="flex justify-center mb-1">
          <div className="w-20 h-5 rounded-full bg-black flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#1f2937]" />
            <div className="w-2 h-2 rounded-full bg-[#374151]" />
          </div>
        </div>

        {/* Tela */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#e5ddd5' }}>
          {/* Header WhatsApp */}
          <div
            className="flex items-center gap-2.5 px-3 py-2.5"
            style={{ background: '#075E54' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} width={14} height={14}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: '#128C7E' }}
            >
              C
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold leading-tight truncate">Clínica Bem Estar</p>
              <p className="text-[10px]" style={{ color: '#a5d6ad' }}>online</p>
            </div>
            {/* Ícones de ação */}
            <div className="flex gap-2 opacity-80">
              <svg viewBox="0 0 24 24" fill="white" width={14} height={14}>
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
              <svg viewBox="0 0 24 24" fill="white" width={14} height={14}>
                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
              </svg>
            </div>
          </div>

          {/* Área de conversa */}
          <div
            className="px-2 py-3 min-h-[240px] flex flex-col justify-end"
            style={{
              background: '#e5ddd5',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c5b9ad' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          >
            {mensagem.trim() ? (
              <div className="flex justify-end">
                {/* Bolha de mensagem */}
                <div
                  className="relative rounded-2xl rounded-tr-sm px-3 py-2 shadow-sm max-w-[88%]"
                  style={{ background: '#dcf8c6' }}
                >
                  {/* Cauda da bolha */}
                  <div
                    className="absolute -right-1.5 top-0 w-3 h-3"
                    style={{
                      background: '#dcf8c6',
                      clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                    }}
                  />
                  <p
                    className="text-[10.5px] leading-relaxed text-[#1a1a1a] break-words"
                    style={{ fontFamily: 'system-ui, sans-serif' }}
                    dangerouslySetInnerHTML={{ __html: html || '<span style="color:#aaa">A mensagem aparecerá aqui…</span>' }}
                  />
                  {/* Horário + status */}
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[9px]" style={{ color: '#7a9f8a' }}>{hora}</span>
                    <svg viewBox="0 0 16 11" width={14} height={9} fill="#4fc3f7">
                      <path d="M11.07.43L4.16 7.34 1.21 4.39.54 5.06l3.62 3.62 7.57-7.57L11.07.43zm2.01 0l-7.57 7.57-.54-.54-.68.68 1.22 1.22 8.25-8.25-.68-.68z"/>
                    </svg>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <p className="text-[10px] text-[#7a9f8a] bg-white/60 px-3 py-1 rounded-full">
                  Edite a mensagem ao lado para ver o preview
                </p>
              </div>
            )}
          </div>

          {/* Barra de entrada */}
          <div
            className="flex items-center gap-1.5 px-2 py-1.5"
            style={{ background: '#f0f0f0' }}
          >
            <div className="flex-1 bg-white rounded-full px-3 py-1.5">
              <p className="text-[10px]" style={{ color: '#aaa' }}>Mensagem</p>
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#075E54' }}>
              <svg viewBox="0 0 24 24" fill="white" width={13} height={13}>
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Barra inferior do celular */}
        <div className="flex justify-center gap-6 mt-2 pb-1">
          <div className="w-6 h-1 rounded-full bg-gray-600" />
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function TemplatesTab() {
  const [gatilhoId,  setGatilhoId]  = useState(GATILHOS[0].id)
  const [templates,  setTemplates]  = useState<TemplatesMap>({})
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [sending,    setSending]    = useState(false)
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null)

  // Editor state (derivado do gatilho selecionado)
  const [mensagem,  setMensagem]  = useState('')
  const [ativo,     setAtivo]     = useState(true)
  const [minutos,   setMinutos]   = useState<number>(180)
  const [horario,   setHorario]   = useState('09:00')

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Helpers ────────────────────────────────────────────────────────────────
  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function gatilhoDef(id: string): GatilhoDef {
    return GATILHOS.find(g => g.id === id) ?? GATILHOS[0]
  }

  function sublabelAtual(id: string): string {
    const g = gatilhoDef(id)
    const t = templates[id]
    if (g.tipo === 'imediato')      return 'Imediatamente'
    if (g.tipo === 'minutos_antes') {
      const m = t?.minutos_antecedencia ?? g.minutosDefault ?? 180
      return m >= 60 ? `${Math.round(m / 60)}h antes` : `${m} min antes`
    }
    if (g.tipo === 'horario_fixo') {
      const h = t?.horario_disparo ?? g.horarioDefault ?? '09:00'
      return `Às ${h}h`
    }
    return ''
  }

  // ── Carrega templates do banco ──────────────────────────────────────────────
  useEffect(() => {
    listarTemplatesAction().then(res => {
      if ('data' in res) setTemplates(res.data)
      setLoading(false)
    })
  }, [])

  // ── Sincroniza editor quando muda o gatilho ou carregam templates ───────────
  useEffect(() => {
    const g = gatilhoDef(gatilhoId)
    const t = templates[gatilhoId]
    setMensagem(t?.mensagem  || MENSAGENS_PADRAO[gatilhoId] || '')
    setAtivo(   t?.ativo     ?? true)
    setMinutos( t?.minutos_antecedencia ?? g.minutosDefault ?? 180)
    setHorario( t?.horario_disparo      ?? g.horarioDefault ?? '09:00')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatilhoId, templates])

  // ── Inserir tag na posição do cursor ────────────────────────────────────────
  const inserirTag = useCallback((tag: string) => {
    const el = textareaRef.current
    if (!el) { setMensagem(m => m + tag); return }
    const start = el.selectionStart
    const end   = el.selectionEnd
    setMensagem(m => m.slice(0, start) + tag + m.slice(end))
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + tag.length, start + tag.length)
    }, 0)
  }, [])

  // ── Resetar ao padrão de fábrica ────────────────────────────────────────────
  function handleReset() {
    const g = gatilhoDef(gatilhoId)
    setMensagem(MENSAGENS_PADRAO[gatilhoId] || '')
    setMinutos(g.minutosDefault ?? 180)
    setHorario(g.horarioDefault ?? '09:00')
  }

  // ── Salvar ──────────────────────────────────────────────────────────────────
  async function handleSalvar() {
    setSaving(true)
    const g = gatilhoDef(gatilhoId)
    const res = await salvarTemplateAction(gatilhoId, {
      ativo,
      mensagem,
      minutos_antecedencia: g.tipo === 'minutos_antes' ? minutos : null,
      horario_disparo:      g.tipo === 'horario_fixo'  ? horario  : null,
    })
    setSaving(false)
    if ('error' in res) { showToast(res.error, false); return }

    // Atualiza cache local
    setTemplates(prev => ({
      ...prev,
      [gatilhoId]: {
        ...prev[gatilhoId],
        ativo,
        mensagem,
        minutos_antecedencia: g.tipo === 'minutos_antes' ? minutos : null,
        horario_disparo:      g.tipo === 'horario_fixo'  ? horario  : null,
      },
    }))
    showToast('Template salvo com sucesso!')
  }

  // ── Enviar teste ────────────────────────────────────────────────────────────
  async function handleTeste() {
    setSending(true)
    const res = await enviarTesteTemplateAction(mensagem)
    setSending(false)
    if ('error' in res) { showToast(res.error, false); return }
    showToast('Mensagem de teste enviada para o seu WhatsApp! ✓')
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const g = gatilhoDef(gatilhoId)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin w-7 h-7 text-[#CBD5E1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M12 3a9 9 0 109 9" />
        </svg>
      </div>
    )
  }

  return (
    <div className="py-5 space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${toast.ok ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`}>
          {toast.msg}
        </div>
      )}

      {/* Dica de formatação */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs">
        <span className="text-sm">ⓘ</span>
        <span>
          <strong>Dica do WhatsApp:</strong> Use <code className="bg-amber-100 px-1 rounded">*negrito*</code>
          {' '}|{' '}<code className="bg-amber-100 px-1 rounded">_itálico_</code>
          {' '}|{' '}<code className="bg-amber-100 px-1 rounded">~riscado~</code>
        </span>
      </div>

      {/* Layout 3 colunas */}
      <div className="grid grid-cols-[220px_1fr_280px] gap-5 items-start">

        {/* ── Coluna esquerda: Gatilhos ── */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1 mb-3">
            Gatilhos disponíveis
          </p>
          {GATILHOS.map(g => {
            const ativo    = templates[g.id]?.ativo ?? true
            const selected = gatilhoId === g.id
            return (
              <button
                key={g.id}
                onClick={() => setGatilhoId(g.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                  selected
                    ? 'border-[#25D366] bg-[#25D366]/8 shadow-sm'
                    : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1] hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base flex-shrink-0">{g.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${selected ? 'text-[#128C7E]' : 'text-[#2C3E50]'}`}>
                      {g.label}
                    </p>
                    <p className="text-[10px] text-[#94A3B8] mt-0.5">{sublabelAtual(g.id)}</p>
                  </div>
                  {/* Indicador ativo */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ativo ? 'bg-[#25D366]' : 'bg-[#CBD5E1]'}`} />
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Coluna central: Editor ── */}
        <div className="space-y-4">

          {/* Card Configurações de Envio */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-[#2C3E50] text-sm">Configurações de Envio</p>
              {/* Toggle Ativo */}
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-[#64748B] font-medium">Gatilho Ativo</span>
                <button
                  onClick={() => setAtivo(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${ativo ? 'bg-[#25D366]' : 'bg-[#CBD5E1]'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${ativo ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Horário do envio */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mb-2">
                  Horário do Envio
                </p>
                {g.tipo === 'imediato' && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EEF2FF] text-[#4A3AE8] text-xs font-semibold">
                    <span>✨</span> Envio Imediato
                  </div>
                )}
                {g.tipo === 'minutos_antes' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={10080}
                      value={minutos}
                      onChange={e => setMinutos(Number(e.target.value))}
                      className="w-20 px-2 py-1.5 rounded-lg border border-[#CBD5E1] text-sm text-center font-mono focus:outline-none focus:border-[#25D366]"
                    />
                    <span className="text-xs text-[#64748B]">min antes</span>
                  </div>
                )}
                {g.tipo === 'horario_fixo' && (
                  <input
                    type="time"
                    value={horario}
                    onChange={e => setHorario(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-[#CBD5E1] text-sm font-mono focus:outline-none focus:border-[#25D366]"
                  />
                )}
              </div>

              {/* Canal de envio */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mb-2">
                  Canal de Envio
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#DCFCE7] text-[#16A34A] text-xs font-semibold">
                  <svg viewBox="0 0 24 24" fill="currentColor" width={13} height={13}>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </div>
              </div>
            </div>
          </div>

          {/* Card Editor de Mensagem */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
            <p className="font-semibold text-[#2C3E50] text-sm mb-1">Conteúdo da Mensagem</p>
            <p className="text-xs text-[#94A3B8] mb-4">Clique nas tags abaixo para inseri-las dinamicamente no seu texto.</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {TAGS.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => inserirTag(tag.label)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] text-xs font-medium transition-colors border border-[#E2E8F0] hover:border-[#CBD5E1]"
                >
                  <span>{tag.icon}</span>
                  <span className="font-mono">{tag.label}</span>
                </button>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              rows={10}
              spellCheck={false}
              className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-sm text-[#2C3E50] bg-[#FAFAFA] font-mono resize-none focus:outline-none focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/15 leading-relaxed"
              placeholder="Digite a mensagem aqui…"
            />

            {/* Contador de caracteres */}
            <p className="text-right text-[10px] text-[#94A3B8] mt-1">
              {mensagem.length} caracteres
            </p>
          </div>

          {/* Rodapé de ações */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-[#64748B] border border-[#E2E8F0] bg-white hover:bg-slate-50 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
              Resetar Padrão
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleTeste}
                disabled={sending || !mensagem.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold bg-[#EEF2FF] text-[#4A3AE8] hover:bg-[#E0E7FF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? (
                  <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={14} height={14}>
                    <path strokeLinecap="round" d="M12 3a9 9 0 109 9" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653z" />
                  </svg>
                )}
                Enviar Teste
              </button>

              <button
                onClick={handleSalvar}
                disabled={saving || !mensagem.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold bg-[#25D366] text-white hover:bg-[#1ebe57] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                {saving ? (
                  <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={14} height={14}>
                    <path strokeLinecap="round" d="M12 3a9 9 0 109 9" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3" />
                  </svg>
                )}
                Salvar Template
              </button>
            </div>
          </div>
        </div>

        {/* ── Coluna direita: Mockup de celular ── */}
        <div className="flex flex-col items-center pt-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mb-4 self-start">
            Preview em tempo real
          </p>
          <PhoneMockup mensagem={mensagem} />
          <p className="mt-4 text-[10px] text-[#94A3B8] text-center leading-relaxed max-w-[220px]">
            As tags são substituídas por dados de exemplo. O resultado real depende dos dados do paciente.
          </p>
        </div>

      </div>
    </div>
  )
}
