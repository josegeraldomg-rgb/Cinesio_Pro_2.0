'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, AlertCircle, Heart } from 'lucide-react'
import type { CampoFormulario } from '@/lib/formularios/tipos'
import { CATEGORIAS } from '@/lib/formularios/tipos'

// ─── Tipo de valor por campo ──────────────────────────────────────────────────
type RespostaValor = string | number | string[] | null

// ─── Campo individual ─────────────────────────────────────────────────────────
function CampoResposta({
  campo,
  valor,
  onChange,
  erro,
}: {
  campo: CampoFormulario
  valor: RespostaValor
  onChange: (v: RespostaValor) => void
  erro?: boolean
}) {
  // ── Seção ──────────────────────────────────────────────────────────────────
  if (campo.tipo === 'secao') {
    return (
      <div className="pt-6 pb-2 border-b-2 border-gray-100">
        <h3 className="font-bold text-gray-800 text-base">{campo.label}</h3>
        {campo.descricao && <p className="text-sm text-gray-500 mt-0.5">{campo.descricao}</p>}
      </div>
    )
  }

  // ── Instrução ──────────────────────────────────────────────────────────────
  if (campo.tipo === 'instrucao') {
    return (
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <p className="text-sm text-blue-700 leading-relaxed">{campo.label}</p>
        {campo.descricao && <p className="text-xs text-blue-500 mt-1">{campo.descricao}</p>}
      </div>
    )
  }

  // ── Campos com label ───────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      {/* Label */}
      <div className="flex items-start gap-1">
        <span className="text-sm font-semibold text-gray-800 leading-snug">{campo.label}</span>
        {campo.obrigatorio && <span className="text-red-500 text-sm leading-none mt-0.5">*</span>}
      </div>
      {campo.descricao && <p className="text-xs text-gray-400 -mt-1">{campo.descricao}</p>}

      {/* ── Texto curto ─────────────────────────────────────────────────── */}
      {campo.tipo === 'texto_curto' && (
        <input
          type="text"
          value={(valor as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder="Sua resposta aqui..."
          className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5b5fcf]/30 focus:border-[#5b5fcf] bg-white ${
            erro ? 'border-red-400 bg-red-50/30' : 'border-gray-200'
          }`}
        />
      )}

      {/* ── Texto longo ─────────────────────────────────────────────────── */}
      {campo.tipo === 'texto_longo' && (
        <textarea
          value={(valor as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder="Descreva aqui com detalhes..."
          rows={4}
          className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5b5fcf]/30 focus:border-[#5b5fcf] resize-none bg-white ${
            erro ? 'border-red-400 bg-red-50/30' : 'border-gray-200'
          }`}
        />
      )}

      {/* ── Seleção única ───────────────────────────────────────────────── */}
      {campo.tipo === 'selecao_unica' && (
        <div className="space-y-2">
          {(campo.opcoes ?? []).map(op => (
            <label
              key={op}
              onClick={() => onChange(op)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                valor === op
                  ? 'border-[#5b5fcf] bg-[#5b5fcf]/6'
                  : erro
                  ? 'border-red-300 hover:border-[#5b5fcf]/40 hover:bg-gray-50'
                  : 'border-gray-200 hover:border-[#5b5fcf]/40 hover:bg-gray-50'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                valor === op ? 'border-[#5b5fcf]' : 'border-gray-300'
              }`}>
                {valor === op && <div className="w-2 h-2 rounded-full bg-[#5b5fcf]" />}
              </div>
              <span className={`text-sm ${valor === op ? 'text-[#5b5fcf] font-medium' : 'text-gray-700'}`}>{op}</span>
            </label>
          ))}
        </div>
      )}

      {/* ── Seleção múltipla ────────────────────────────────────────────── */}
      {campo.tipo === 'selecao_multipla' && (
        <div className="space-y-2">
          {(campo.opcoes ?? []).map(op => {
            const selecionadas = (valor as string[]) ?? []
            const checked = selecionadas.includes(op)
            return (
              <label
                key={op}
                onClick={() => {
                  const next = checked
                    ? selecionadas.filter(x => x !== op)
                    : [...selecionadas, op]
                  onChange(next)
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                  checked
                    ? 'border-[#5b5fcf] bg-[#5b5fcf]/6'
                    : erro
                    ? 'border-red-300 hover:border-[#5b5fcf]/40 hover:bg-gray-50'
                    : 'border-gray-200 hover:border-[#5b5fcf]/40 hover:bg-gray-50'
                }`}
              >
                <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  checked ? 'border-[#5b5fcf] bg-[#5b5fcf]' : 'border-gray-300'
                }`}>
                  {checked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm ${checked ? 'text-[#5b5fcf] font-medium' : 'text-gray-700'}`}>{op}</span>
              </label>
            )
          })}
        </div>
      )}

      {/* ── Escala numérica ─────────────────────────────────────────────── */}
      {campo.tipo === 'escala_numerica' && (() => {
        const min  = campo.min ?? 0
        const max  = campo.max ?? 10
        const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i)
        return (
          <div className="space-y-2">
            <div className="flex gap-1.5 flex-wrap">
              {nums.map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange(n)}
                  className={`min-w-[40px] h-11 px-2 rounded-xl text-sm font-bold transition-all ${
                    valor === n
                      ? 'bg-[#5b5fcf] text-white shadow-md scale-105'
                      : erro
                      ? 'bg-red-50 text-red-400 border border-red-200 hover:bg-[#5b5fcf]/10 hover:text-[#5b5fcf] hover:border-transparent'
                      : 'bg-gray-100 text-gray-700 hover:bg-[#5b5fcf]/10 hover:text-[#5b5fcf]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            {campo.rotulos && (
              <div className="flex justify-between text-xs text-gray-400 px-0.5">
                <span>{campo.rotulos.min}</span>
                <span>{campo.rotulos.max}</span>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Data ────────────────────────────────────────────────────────── */}
      {campo.tipo === 'data' && (
        <input
          type="date"
          value={(valor as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          className={`px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5b5fcf]/30 focus:border-[#5b5fcf] bg-white ${
            erro ? 'border-red-400' : 'border-gray-200'
          }`}
        />
      )}

      {/* ── Assinatura ──────────────────────────────────────────────────── */}
      {campo.tipo === 'assinatura' && (
        <div
          onClick={() => onChange('assinado')}
          className={`h-28 border-2 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
            valor === 'assinado'
              ? 'border-[#5b5fcf] bg-[#5b5fcf]/5'
              : erro
              ? 'border-dashed border-red-300 bg-red-50/20'
              : 'border-dashed border-gray-200 bg-gray-50/50 hover:border-[#5b5fcf]/40'
          }`}
        >
          {valor === 'assinado' ? (
            <>
              <CheckCircle2 size={24} className="text-[#5b5fcf]" />
              <p className="text-xs text-[#5b5fcf] font-medium">Assinado</p>
            </>
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" />
                <path d="M20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
              <p className="text-xs text-gray-400">Clique para assinar</p>
            </>
          )}
        </div>
      )}

      {/* ── Mapa de dor ─────────────────────────────────────────────────── */}
      {campo.tipo === 'mapa_dor' && (
        <div className="h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1.5 bg-gray-50/50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
            <ellipse cx="12" cy="5" rx="3" ry="3.5" />
            <path d="M9,8.5 C7,9 6,11 6,13 L6,17 L8,17 L8,22 L16,22 L16,17 L18,17 L18,13 C18,11 17,9 15,8.5" />
          </svg>
          <p className="text-xs text-gray-400">Mapa de dor (em breve)</p>
        </div>
      )}

      {/* Mensagem de erro */}
      {erro && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={11} /> Este campo é obrigatório
        </p>
      )}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  token:                  string
  nomeFormulario:         string
  descricaoFormulario:    string | null
  categoriaFormulario:    string
  campos:                 CampoFormulario[]
  nomePaciente:           string
  nomeClinica:            string
}

// ─── Formulário principal ─────────────────────────────────────────────────────
export function ResponderForm({
  token, nomeFormulario, descricaoFormulario, categoriaFormulario,
  campos, nomePaciente, nomeClinica,
}: Props) {
  const [respostas,  setRespostas]  = useState<Record<string, RespostaValor>>({})
  const [erros,      setErros]      = useState<Set<string>>(new Set())
  const [enviando,   setEnviando]   = useState(false)
  const [erroEnvio,  setErroEnvio]  = useState<string | null>(null)
  const [concluido,  setConcluido]  = useState(false)

  const cat = CATEGORIAS[categoriaFormulario]

  function setResposta(id: string, valor: RespostaValor) {
    setRespostas(prev => ({ ...prev, [id]: valor }))
    // Remove erro ao preencher
    if (erros.has(id)) {
      setErros(prev => { const next = new Set(prev); next.delete(id); return next })
    }
  }

  function validar(): boolean {
    const novosErros = new Set<string>()
    for (const campo of campos) {
      if (campo.tipo === 'secao' || campo.tipo === 'instrucao') continue
      if (!campo.obrigatorio) continue

      const val = respostas[campo.id]

      if (val === null || val === undefined || val === '') {
        novosErros.add(campo.id)
        continue
      }
      if (Array.isArray(val) && val.length === 0) {
        novosErros.add(campo.id)
        continue
      }
    }
    setErros(novosErros)
    return novosErros.size === 0
  }

  async function enviar() {
    if (!validar()) {
      // Scroll ao primeiro erro
      const primeiroId = campos.find(c => erros.has(c.id) || (c.obrigatorio && !respostas[c.id]))?.id
      if (primeiroId) {
        document.getElementById(`campo-${primeiroId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    setEnviando(true)
    setErroEnvio(null)

    try {
      const res = await fetch(`/api/responder/${token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ respostas }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao enviar respostas')
      setConcluido(true)
    } catch (e: unknown) {
      setErroEnvio(e instanceof Error ? e.message : 'Erro inesperado')
    } finally {
      setEnviando(false)
    }
  }

  // ── Tela de sucesso ──────────────────────────────────────────────────────
  if (concluido) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#edeff3] to-white p-6">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-50 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Respostas enviadas!</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            Obrigado, <strong>{nomePaciente.split(' ')[0]}</strong>! Suas respostas foram registradas com sucesso e encaminhadas à equipe de <strong>{nomeClinica}</strong>.
          </p>
          <p className="text-xs text-gray-400">
            Você pode fechar esta página.
          </p>
        </div>
      </div>
    )
  }

  // ── Formulário ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#edeff3] to-white">
      <div className="max-w-2xl mx-auto px-4 py-10 pb-20">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="text-center mb-6">
          <div
            className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center shadow-sm"
            style={{ background: cat?.corBg ?? '#f3f4f6' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: cat?.cor ?? '#6b7280' }}>
              {cat?.icone ?? 'article'}
            </span>
          </div>
          <p className="text-xs font-medium mb-1" style={{ color: cat?.cor ?? '#6b7280' }}>
            {cat?.label ?? categoriaFormulario} · {nomeClinica}
          </p>
          <h1 className="text-xl font-bold text-gray-900">{nomeFormulario}</h1>
          {descricaoFormulario && (
            <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">{descricaoFormulario}</p>
          )}
        </div>

        {/* ── Saudação ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl px-5 py-4 mb-4 flex items-center gap-3" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="w-9 h-9 rounded-full bg-[#5b5fcf]/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-[#5b5fcf]">
            {nomePaciente.charAt(0).toUpperCase()}
          </div>
          <p className="text-sm text-gray-600">
            Olá, <strong>{nomePaciente.split(' ')[0]}</strong>! Preencha o formulário abaixo com atenção.
            Os campos marcados com <span className="text-red-500">*</span> são obrigatórios.
          </p>
        </div>

        {/* ── Campos ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 space-y-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          {campos.map(campo => (
            <div key={campo.id} id={`campo-${campo.id}`}>
              <CampoResposta
                campo={campo}
                valor={respostas[campo.id] ?? null}
                onChange={v => setResposta(campo.id, v)}
                erro={erros.has(campo.id)}
              />
            </div>
          ))}

          {/* ── Erro de validação geral ───────────────────────────────── */}
          {erros.size > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>Preencha os campos obrigatórios destacados em vermelho antes de continuar.</span>
            </div>
          )}

          {/* ── Erro de envio ─────────────────────────────────────────── */}
          {erroEnvio && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{erroEnvio}</span>
            </div>
          )}

          {/* ── Botão enviar ──────────────────────────────────────────── */}
          <div className="pt-2">
            <button
              type="button"
              onClick={enviar}
              disabled={enviando}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60 hover:opacity-90 active:scale-[0.99]"
              style={{ background: '#5b5fcf' }}
            >
              {enviando ? (
                <><Loader2 size={16} className="animate-spin" /> Enviando respostas...</>
              ) : (
                'Enviar respostas'
              )}
            </button>
          </div>
        </div>

        {/* ── Rodapé ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-1.5 mt-6">
          <Heart size={12} className="text-gray-300" />
          <p className="text-xs text-gray-400">
            Formulário enviado por <strong>{nomeClinica}</strong> via CinesioPro
          </p>
        </div>

      </div>
    </div>
  )
}
