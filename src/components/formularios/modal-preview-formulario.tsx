'use client'

import { useState } from 'react'
import { X, Eye } from 'lucide-react'
import type { CampoFormulario } from '@/lib/formularios/tipos'
import { CATEGORIAS } from '@/lib/formularios/tipos'

// ─── Renderer de campo individual ─────────────────────────────────────────────
function CampoPreview({ campo }: { campo: CampoFormulario }) {
  const [texto,      setTexto]      = useState('')
  const [data,       setData]       = useState('')
  const [unica,      setUnica]      = useState<string | null>(null)
  const [multiplas,  setMultiplas]  = useState<string[]>([])
  const [escala,     setEscala]     = useState<number | null>(null)

  // ── Seção ──────────────────────────────────────────────────────────────────
  if (campo.tipo === 'secao') {
    return (
      <div className="pt-4 pb-2 border-b-2 border-gray-100">
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
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Sua resposta aqui..."
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5b5fcf]/30 focus:border-[#5b5fcf] bg-white"
        />
      )}

      {/* ── Texto longo ─────────────────────────────────────────────────── */}
      {campo.tipo === 'texto_longo' && (
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Descreva aqui com detalhes..."
          rows={3}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5b5fcf]/30 focus:border-[#5b5fcf] resize-none bg-white"
        />
      )}

      {/* ── Seleção única ───────────────────────────────────────────────── */}
      {campo.tipo === 'selecao_unica' && (
        <div className="space-y-2">
          {(campo.opcoes ?? []).map(op => (
            <label
              key={op}
              onClick={() => setUnica(op)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                unica === op
                  ? 'border-[#5b5fcf] bg-[#5b5fcf]/6'
                  : 'border-gray-200 hover:border-[#5b5fcf]/40 hover:bg-gray-50'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                unica === op ? 'border-[#5b5fcf]' : 'border-gray-300'
              }`}>
                {unica === op && <div className="w-2 h-2 rounded-full bg-[#5b5fcf]" />}
              </div>
              <span className={`text-sm ${unica === op ? 'text-[#5b5fcf] font-medium' : 'text-gray-700'}`}>{op}</span>
            </label>
          ))}
        </div>
      )}

      {/* ── Seleção múltipla ────────────────────────────────────────────── */}
      {campo.tipo === 'selecao_multipla' && (
        <div className="space-y-2">
          {(campo.opcoes ?? []).map(op => {
            const checked = multiplas.includes(op)
            return (
              <label
                key={op}
                onClick={() => setMultiplas(prev => checked ? prev.filter(x => x !== op) : [...prev, op])}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                  checked
                    ? 'border-[#5b5fcf] bg-[#5b5fcf]/6'
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
                  onClick={() => setEscala(n)}
                  className={`min-w-[38px] h-10 px-2 rounded-xl text-sm font-bold transition-all ${
                    escala === n
                      ? 'bg-[#5b5fcf] text-white shadow-md scale-105'
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
          value={data}
          onChange={e => setData(e.target.value)}
          className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5b5fcf]/30 focus:border-[#5b5fcf] bg-white"
        />
      )}

      {/* ── Assinatura ──────────────────────────────────────────────────── */}
      {campo.tipo === 'assinatura' && (
        <div className="h-28 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1.5 bg-gray-50/50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" />
            <path d="M20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
          <p className="text-xs text-gray-400">Clique para assinar</p>
        </div>
      )}

      {/* ── Mapa de dor ─────────────────────────────────────────────────── */}
      {campo.tipo === 'mapa_dor' && (
        <div className="h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1.5 bg-gray-50/50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
            <ellipse cx="12" cy="5" rx="3" ry="3.5" />
            <path d="M9,8.5 C7,9 6,11 6,13 L6,17 L8,17 L8,22 L16,22 L16,17 L18,17 L18,13 C18,11 17,9 15,8.5" />
          </svg>
          <p className="text-xs text-gray-400">Marque as regiões de dor no corpo</p>
        </div>
      )}
    </div>
  )
}

// ─── Modal de Preview ──────────────────────────────────────────────────────────
interface Props {
  nome: string
  descricao?: string | null
  categoria: string
  campos: CampoFormulario[]
  onClose: () => void
}

export function ModalPreviewFormulario({ nome, descricao, categoria, campos, onClose }: Props) {
  const cat = CATEGORIAS[categoria]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative bg-[#EDEFF3] rounded-2xl w-full max-w-xl flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
      >
        {/* ── Topbar do modal ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Eye size={15} className="text-[#5b5fcf]" />
            <span className="text-sm font-bold text-gray-700">Pré-visualização</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* ── Conteúdo scrollável ───────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Header do formulário (como o paciente veria) */}
          <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cat?.corBg ?? '#f3f4f6' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: cat?.cor ?? '#6b7280' }}>
                  {cat?.icone ?? 'article'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-gray-900 text-lg leading-tight">{nome}</h2>
                {cat && (
                  <span className="text-xs font-medium mt-0.5 inline-block" style={{ color: cat.cor }}>
                    {cat.label}
                  </span>
                )}
                {descricao && <p className="text-sm text-gray-500 mt-2 leading-relaxed">{descricao}</p>}
              </div>
            </div>
          </div>

          {/* Campos */}
          {campos.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 flex flex-col items-center text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <p className="text-gray-400 text-sm">Este formulário ainda não possui campos.</p>
              <p className="text-gray-300 text-xs mt-1">Adicione campos no editor para visualizá-los aqui.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-5 space-y-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              {campos.map(campo => (
                <CampoPreview key={campo.id} campo={campo} />
              ))}

              {/* Botão de envio simulado */}
              <div className="pt-4 border-t border-gray-100">
                <button
                  type="button"
                  disabled
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white opacity-60 cursor-not-allowed"
                  style={{ background: '#5b5fcf' }}
                >
                  Enviar respostas
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Rodapé informativo ────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-2 py-2.5 bg-amber-50 border-t border-amber-100 flex-shrink-0">
          <Eye size={12} className="text-amber-500" />
          <p className="text-xs text-amber-600 font-medium">Modo pré-visualização — respostas não serão salvas</p>
        </div>
      </div>
    </div>
  )
}
