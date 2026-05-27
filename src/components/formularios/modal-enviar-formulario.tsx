'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, Search, Send, Link2, Copy, CheckCheck,
  MessageCircle, Mail, Clock, ChevronDown,
  User, FileText, AlertCircle, Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIAS } from '@/lib/formularios/tipos'
import { enviarTextWaAction } from '@/app/(dashboard)/whatsapp/actions'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Paciente { id: string; nome: string; ddi: string | null; telefone: string | null; email: string | null }
interface Formulario { id: string; nome: string; categoria: string; status: string }

interface Props {
  /** Formulário já escolhido (ex: clicou "Enviar" num card da lista) */
  formularioId?:   string
  formularioNome?: string
  formularioCat?:  string
  /** Paciente já escolhido (ex: abriu da página do paciente) */
  pacienteId?:     string
  pacienteNome?:   string
  pacienteTelefone?: string
  pacienteDdi?:    string
  onClose:         () => void
  onSuccess?:      (envio: { id: string; token_unico: string; link: string }) => void
}

type Via = 'whatsapp' | 'email' | 'link'
type Etapa = 'form' | 'sucesso'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtFone(ddi: string | null, tel: string | null) {
  if (!tel) return null
  const d = (ddi ?? '55').replace(/\D/g, '')
  const t = tel.replace(/\D/g, '')
  return `${d}${t}`
}

function whatsappUrl(fone: string, msg: string) {
  return `https://wa.me/${fone}?text=${encodeURIComponent(msg)}`
}

function mailtoUrl(email: string, link: string, nome: string) {
  const sub = encodeURIComponent(`Formulário para preencher — ${nome}`)
  const body = encodeURIComponent(
    `Olá!\n\nPor favor, preencha o formulário abaixo antes da sua próxima consulta:\n${link}\n\nAté logo!`
  )
  return `mailto:${email}?subject=${sub}&body=${body}`
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/** Campo de busca de paciente com dropdown assíncrono */
function BuscaPaciente({ onSelect }: { onSelect: (p: Paciente) => void }) {
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState<Paciente[]>([])
  const [loading, setLoading]     = useState(false)
  const [aberto, setAberto]       = useState(false)
  const timerRef                  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase                  = createClient()

  const buscar = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('pacientes')
      .select('id, nome, ddi, telefone, email')
      .ilike('nome', `%${q}%`)
      .eq('status', 'ativo')
      .limit(8)
    setResults(data ?? [])
    setLoading(false)
  }, [supabase])

  function handleChange(val: string) {
    setQuery(val)
    setAberto(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => buscar(val), 300)
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus-within:ring-2 focus-within:ring-[#5b5fcf]/30 focus-within:border-[#5b5fcf]">
        <Search size={15} className="text-gray-400 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setAberto(true)}
          placeholder="Buscar paciente pelo nome..."
          className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder:text-gray-400"
        />
        {loading && <Loader2 size={14} className="text-gray-400 animate-spin flex-shrink-0" />}
      </div>

      {aberto && (results.length > 0 || query.length >= 2) && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAberto(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden" style={{ maxHeight: 220 }}>
            {results.length === 0 && !loading && (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">Nenhum paciente encontrado</div>
            )}
            <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
              {results.map(p => (
                <button
                  key={p.id}
                  onClick={() => { onSelect(p); setQuery(p.nome); setAberto(false) }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-[#5b5fcf]/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#5b5fcf]">
                    {p.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.nome}</p>
                    <p className="text-xs text-gray-400 truncate">{p.telefone ? `${p.ddi ?? '+55'} ${p.telefone}` : 'Sem telefone'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/** Dropdown de formulários da clínica */
function SeletorFormulario({ onSelect }: { onSelect: (f: Formulario) => void }) {
  const [lista,   setLista]   = useState<Formulario[]>([])
  const [aberto,  setAberto]  = useState(false)
  const [loading, setLoading] = useState(true)
  const [selecionado, setSel] = useState<Formulario | null>(null)

  useEffect(() => {
    fetch('/api/formularios')
      .then(r => r.json())
      .then((data: Formulario[]) => {
        setLista(Array.isArray(data) ? data.filter(f => f.status === 'ativo') : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function escolher(f: Formulario) {
    setSel(f)
    onSelect(f)
    setAberto(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto(v => !v)}
        className="flex items-center justify-between w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-sm hover:border-[#5b5fcf] transition-colors"
      >
        {loading ? (
          <span className="text-gray-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Carregando...</span>
        ) : selecionado ? (
          <span className="flex items-center gap-2 text-gray-800 font-medium truncate">
            <span className="material-symbols-outlined text-[#5b5fcf]" style={{ fontSize: 16 }}>
              {CATEGORIAS[selecionado.categoria]?.icone ?? 'article'}
            </span>
            {selecionado.nome}
          </span>
        ) : (
          <span className="text-gray-400">Selecionar formulário...</span>
        )}
        <ChevronDown size={14} className={`text-gray-400 flex-shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAberto(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden">
            {lista.length === 0 ? (
              <div className="px-4 py-4 text-sm text-gray-400 text-center">
                Nenhum formulário publicado. <br/>
                <a href="/formularios/criar" className="text-[#5b5fcf] font-medium">Criar um agora →</a>
              </div>
            ) : (
              <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
                {lista.map(f => {
                  const cat = CATEGORIAS[f.categoria]
                  return (
                    <button
                      key={f.id}
                      onClick={() => escolher(f)}
                      className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 text-left"
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cat?.corBg ?? '#f3f4f6' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15, color: cat?.cor ?? '#6b7280' }}>
                          {cat?.icone ?? 'article'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{f.nome}</p>
                        <p className="text-xs text-gray-400">{cat?.label ?? f.categoria}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Modal principal ──────────────────────────────────────────────────────────
export function ModalEnviarFormulario({
  formularioId: fIdProp, formularioNome: fNomeProp, formularioCat: fCatProp,
  pacienteId: pIdProp, pacienteNome: pNomeProp, pacienteTelefone: pTelProp, pacienteDdi: pDdiProp,
  onClose, onSuccess,
}: Props) {

  // Formulário selecionado
  const [fId,   setFId]   = useState(fIdProp ?? '')
  const [fNome, setFNome] = useState(fNomeProp ?? '')
  const [fCat,  setFCat]  = useState(fCatProp ?? '')

  // Paciente selecionado
  const [pId,   setPId]   = useState(pIdProp ?? '')
  const [pNome, setPNome] = useState(pNomeProp ?? '')
  const [pTel,  setPTel]  = useState(pTelProp ?? '')
  const [pDdi,  setPDdi]  = useState(pDdiProp ?? '55')
  const [pEmail,setPEmail]= useState('')

  // Config
  const [via,       setVia]       = useState<Via>('whatsapp')
  const [diasExp,   setDiasExp]   = useState(7)
  const [enviando,  setEnviando]  = useState(false)
  const [erro,      setErro]      = useState<string | null>(null)
  const [etapa,     setEtapa]     = useState<Etapa>('form')

  // Resultado
  const [linkGerado,    setLinkGerado]    = useState('')
  const [copiado,       setCopiado]       = useState(false)
  const [envioId,       setEnvioId]       = useState('')
  const [waSending,     setWaSending]     = useState(false)
  const [waEnviado,     setWaEnviado]     = useState(false)
  const [waErro,        setWaErro]        = useState<string | null>(null)

  // ── Handlers ────────────────────────────────────────────────────────────
  function selecionarPaciente(p: Paciente) {
    setPId(p.id); setPNome(p.nome)
    setPTel(p.telefone ?? ''); setPDdi(p.ddi?.replace('+', '') ?? '55')
    setPEmail(p.email ?? '')
  }

  function selecionarFormulario(f: Formulario) {
    setFId(f.id); setFNome(f.nome); setFCat(f.categoria)
  }

  async function enviar() {
    setErro(null)
    if (!fId)  { setErro('Selecione um formulário.'); return }
    if (!pId)  { setErro('Selecione um paciente.'); return }
    if (via === 'whatsapp' && !pTel) { setErro('Este paciente não tem telefone cadastrado.'); return }
    if (via === 'email'    && !pEmail) { setErro('Este paciente não tem e-mail cadastrado.'); return }

    setEnviando(true)
    try {
      const res = await fetch('/api/formularios/envios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formulario_id:   fId,
          paciente_id:     pId,
          enviado_via:     via,
          dias_expiracao:  diasExp,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao criar envio')

      setLinkGerado(json.link)
      setEnvioId(json.id)
      setEtapa('sucesso')
      onSuccess?.({ id: json.id, token_unico: json.token_unico, link: json.link })
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado')
    } finally {
      setEnviando(false)
    }
  }

  async function copiarLink() {
    await navigator.clipboard.writeText(linkGerado)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function abrirWhatsApp() {
    const fone = fmtFone(pDdi, pTel)
    if (!fone) return
    const msg = `Olá, ${pNome}! 👋\n\nPor favor, preencha o formulário *${fNome}* antes da sua próxima consulta:\n\n🔗 ${linkGerado}\n\nQualquer dúvida, estamos à disposição!`

    setWaSending(true)
    setWaErro(null)
    const result = await enviarTextWaAction(fone, msg)
    setWaSending(false)

    if ('ok' in result) {
      setWaEnviado(true)
    } else {
      // UAZAPI indisponível ou desconectado — abre wa.me como fallback
      setWaErro(result.error)
      window.open(result.fallbackUrl, '_blank')
    }
  }

  function abrirEmail() {
    if (!pEmail) return
    window.open(mailtoUrl(pEmail, linkGerado, fNome), '_blank')
  }

  const catInfo = CATEGORIAS[fCat]

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Painel */}
      <div
        className="relative bg-white rounded-2xl w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 480, maxHeight: '92vh', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#5b5fcf]/10 flex items-center justify-center">
              <Send size={17} className="text-[#5b5fcf]" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Enviar Formulário</p>
              <p className="text-xs text-gray-400">
                {etapa === 'sucesso' ? 'Link gerado com sucesso' : 'Configure e envie ao paciente'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* ── Etapa: formulário ─────────────────────────────────────────── */}
        {etapa === 'form' && (
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

            {/* Formulário */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block flex items-center gap-1.5">
                <FileText size={12} /> Formulário
              </label>
              {fIdProp ? (
                /* Pré-selecionado */
                <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50">
                  {catInfo && (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: catInfo.corBg }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 15, color: catInfo.cor }}>{catInfo.icone}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{fNomeProp}</p>
                    {catInfo && <p className="text-xs text-gray-400">{catInfo.label}</p>}
                  </div>
                </div>
              ) : (
                <SeletorFormulario onSelect={selecionarFormulario} />
              )}
            </div>

            {/* Paciente */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block flex items-center gap-1.5">
                <User size={12} /> Paciente
              </label>
              {pIdProp ? (
                /* Pré-selecionado */
                <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50">
                  <div className="w-7 h-7 rounded-full bg-[#5b5fcf]/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#5b5fcf]">
                    {pNomeProp?.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{pNomeProp}</p>
                </div>
              ) : (
                <BuscaPaciente onSelect={selecionarPaciente} />
              )}
            </div>

            {/* Método de envio */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block flex items-center gap-1.5">
                <Send size={12} /> Método de Envio
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { val: 'whatsapp', Icon: MessageCircle, label: 'WhatsApp', cor: '#25d366', bg: '#f0fdf4', disabled: !pTel && !!pIdProp },
                  { val: 'email',    Icon: Mail,          label: 'E-mail',   cor: '#3b82f6', bg: '#eff6ff', disabled: !pEmail && !!pIdProp },
                  { val: 'link',     Icon: Link2,         label: 'Só link',  cor: '#6b7280', bg: '#f9fafb', disabled: false },
                ] as const).map(({ val, Icon, label, cor, bg, disabled }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => !disabled && setVia(val)}
                    disabled={disabled}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                      via === val
                        ? 'border-current font-semibold'
                        : 'border-gray-100 hover:border-gray-200 text-gray-500'
                    } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={via === val ? { borderColor: cor, background: bg, color: cor } : {}}
                  >
                    <Icon size={18} />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
              {via === 'whatsapp' && !pTel && !pIdProp && pId && (
                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={11} /> Paciente sem telefone. O link será gerado mas não enviado automaticamente.
                </p>
              )}
            </div>

            {/* Validade */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block flex items-center gap-1.5">
                <Clock size={12} /> Validade do link
              </label>
              <div className="flex gap-2">
                {[3, 7, 15, 30].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDiasExp(d)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${
                      diasExp === d
                        ? 'border-[#5b5fcf] bg-[#5b5fcf]/10 text-[#5b5fcf]'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                O paciente terá {diasExp} dia{diasExp > 1 ? 's' : ''} para responder
              </p>
            </div>

            {/* Erro */}
            {erro && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle size={14} className="flex-shrink-0" /> {erro}
              </div>
            )}
          </div>
        )}

        {/* ── Etapa: sucesso ────────────────────────────────────────────── */}
        {etapa === 'sucesso' && (
          <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
            {/* Confirmação */}
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-1">
                <CheckCheck size={26} className="text-green-500" />
              </div>
              <p className="font-bold text-gray-900">Envio criado!</p>
              <p className="text-sm text-gray-500">
                O formulário <strong>{fNome}</strong> foi vinculado a <strong>{pNome}</strong>.
              </p>
            </div>

            {/* Link */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Link do formulário</label>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                <p className="flex-1 text-xs text-gray-600 font-mono truncate">{linkGerado}</p>
                <button
                  onClick={copiarLink}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${
                    copiado ? 'bg-green-100 text-green-700' : 'bg-[#5b5fcf]/10 text-[#5b5fcf] hover:bg-[#5b5fcf]/20'
                  }`}
                >
                  {copiado ? <><CheckCheck size={12} /> Copiado!</> : <><Copy size={12} /> Copiar</>}
                </button>
              </div>
            </div>

            {/* Botões de envio rápido */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Enviar agora</p>
              {pTel && (
                <button
                  onClick={abrirWhatsApp}
                  disabled={waSending || waEnviado}
                  className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-70"
                  style={{ background: waEnviado ? '#16a34a' : '#25d366' }}
                >
                  {waSending ? (
                    <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                  ) : waEnviado ? (
                    <><CheckCheck size={16} /> Enviado com sucesso!</>
                  ) : (
                    <><MessageCircle size={18} /> Enviar via WhatsApp</>
                  )}
                </button>
              )}
              {waErro && (
                <p className="text-xs text-amber-600 flex items-center gap-1.5">
                  <AlertCircle size={12} className="flex-shrink-0" />
                  WhatsApp automático indisponível — o link foi aberto no navegador.
                </p>
              )}
              {pEmail && (
                <button
                  onClick={abrirEmail}
                  className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
                  style={{ background: '#3b82f6' }}
                >
                  <Mail size={18} /> Enviar por E-mail
                </button>
              )}
              <button
                onClick={copiarLink}
                className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Link2 size={16} />
                {copiado ? 'Link copiado!' : 'Copiar link para enviar manualmente'}
              </button>
            </div>

            {/* Validade info */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl">
              <Clock size={14} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                Este link expira em <strong>{diasExp} dia{diasExp > 1 ? 's' : ''}</strong>.
                Quando respondido, as respostas vão direto para o prontuário do paciente.
              </p>
            </div>
          </div>
        )}

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex gap-3">
          {etapa === 'form' ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={enviar}
                disabled={enviando || !fId || !pId}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:opacity-90"
                style={{ background: '#5b5fcf' }}
              >
                {enviando ? <><Loader2 size={15} className="animate-spin" /> Gerando...</> : <><Send size={15} /> Gerar link</>}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all"
              style={{ background: '#5b5fcf' }}
            >
              Concluir
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
