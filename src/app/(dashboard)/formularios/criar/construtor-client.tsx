'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Type, AlignLeft, CheckSquare, Circle, SlidersHorizontal,
  Calendar, PenLine, Minus, Info, MapPin,
  GripVertical, Trash2, ChevronUp, ChevronDown,
  Plus, X, Save, Send, ArrowLeft, Eye, Settings2, Copy,
} from 'lucide-react'
import type { CampoFormulario, CampoTipo } from '@/lib/formularios/tipos'
import { CATEGORIAS } from '@/lib/formularios/tipos'

// ─── Paleta de tipos de campo ─────────────────────────────────────────────────
const TIPOS_CAMPO: { tipo: CampoTipo; label: string; descricao: string; Icon: React.FC<{ size?: number; className?: string }> }[] = [
  { tipo: 'texto_curto',     label: 'Texto Curto',      descricao: 'Resposta em uma linha',      Icon: Type },
  { tipo: 'texto_longo',     label: 'Texto Longo',      descricao: 'Resposta em múltiplas linhas', Icon: AlignLeft },
  { tipo: 'selecao_unica',   label: 'Seleção Única',    descricao: 'Escolha uma opção',          Icon: Circle },
  { tipo: 'selecao_multipla',label: 'Múltipla Escolha', descricao: 'Escolha várias opções',      Icon: CheckSquare },
  { tipo: 'escala_numerica', label: 'Escala Numérica',  descricao: 'Ex: EVA 0–10',               Icon: SlidersHorizontal },
  { tipo: 'data',            label: 'Data',             descricao: 'Seletor de data',             Icon: Calendar },
  { tipo: 'assinatura',      label: 'Assinatura',       descricao: 'Assinatura digital',         Icon: PenLine },
  { tipo: 'secao',           label: 'Seção',            descricao: 'Título separador de seção',  Icon: Minus },
  { tipo: 'instrucao',       label: 'Instrução',        descricao: 'Texto informativo ao paciente', Icon: Info },
  { tipo: 'mapa_dor',        label: 'Mapa de Dor',      descricao: 'Corpo para marcar localização', Icon: MapPin },
]

function gerarId() {
  return Math.random().toString(36).slice(2, 10)
}

function novoCampo(tipo: CampoTipo): CampoFormulario {
  const base: CampoFormulario = { id: gerarId(), tipo, label: '', obrigatorio: false }
  if (tipo === 'selecao_unica' || tipo === 'selecao_multipla') base.opcoes = ['Opção 1', 'Opção 2']
  if (tipo === 'escala_numerica') { base.min = 0; base.max = 10; base.rotulos = { min: 'Mínimo', max: 'Máximo' } }
  if (tipo === 'secao') base.label = 'Nova Seção'
  if (tipo === 'instrucao') base.label = 'Escreva aqui a instrução para o paciente.'
  return base
}

// ─── Preview de campo no canvas ───────────────────────────────────────────────
function CampoPreview({ campo }: { campo: CampoFormulario }) {
  switch (campo.tipo) {
    case 'secao':
      return <div className="font-bold text-base border-b border-gray-300 pb-1 text-gray-800">{campo.label || 'Seção sem título'}</div>
    case 'instrucao':
      return <div className="text-sm text-gray-500 italic">{campo.label || 'Instrução...'}</div>
    case 'texto_curto':
      return <div className="h-9 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-400 flex items-center px-3">Resposta curta...</div>
    case 'texto_longo':
      return <div className="h-16 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-400 flex items-start px-3 pt-2">Resposta longa...</div>
    case 'selecao_unica':
      return (
        <div className="flex flex-col gap-1">
          {(campo.opcoes ?? []).slice(0, 3).map((op, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
              {op}
            </div>
          ))}
          {(campo.opcoes?.length ?? 0) > 3 && <p className="text-xs text-gray-400">+{(campo.opcoes?.length ?? 0) - 3} opções...</p>}
        </div>
      )
    case 'selecao_multipla':
      return (
        <div className="flex flex-col gap-1">
          {(campo.opcoes ?? []).slice(0, 3).map((op, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0" />
              {op}
            </div>
          ))}
          {(campo.opcoes?.length ?? 0) > 3 && <p className="text-xs text-gray-400">+{(campo.opcoes?.length ?? 0) - 3} opções...</p>}
        </div>
      )
    case 'escala_numerica':
      return (
        <div>
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: (campo.max ?? 10) - (campo.min ?? 0) + 1 }, (_, i) => (campo.min ?? 0) + i).map(n => (
              <div key={n} className="w-8 h-8 rounded border border-gray-200 bg-gray-50 text-xs flex items-center justify-center text-gray-500">{n}</div>
            ))}
          </div>
          {campo.rotulos && (
            <div className="flex justify-between mt-1 text-xs text-gray-400">
              <span>{campo.rotulos.min}</span>
              <span>{campo.rotulos.max}</span>
            </div>
          )}
        </div>
      )
    case 'data':
      return <div className="h-9 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-400 flex items-center px-3">dd/mm/aaaa</div>
    case 'assinatura':
      return <div className="h-20 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-400">Área de assinatura</div>
    case 'mapa_dor':
      return <div className="h-24 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-400">🫀 Mapa corporal de dor</div>
    default:
      return null
  }
}

// ─── Painel de configuração do campo ─────────────────────────────────────────
function PainelConfig({
  campo,
  onChange,
  onClose,
}: {
  campo: CampoFormulario
  onChange: (updated: CampoFormulario) => void
  onClose: () => void
}) {
  function set(partial: Partial<CampoFormulario>) {
    onChange({ ...campo, ...partial })
  }

  function addOpcao() {
    const opcoes = [...(campo.opcoes ?? []), `Opção ${(campo.opcoes?.length ?? 0) + 1}`]
    set({ opcoes })
  }

  function removeOpcao(i: number) {
    const opcoes = (campo.opcoes ?? []).filter((_, idx) => idx !== i)
    set({ opcoes })
  }

  function editOpcao(i: number, val: string) {
    const opcoes = (campo.opcoes ?? []).map((op, idx) => idx === i ? val : op)
    set({ opcoes })
  }

  const tipoInfo = TIPOS_CAMPO.find(t => t.tipo === campo.tipo)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          {tipoInfo && <tipoInfo.Icon size={16} className="text-[#5b5fcf]" />}
          <span className="font-semibold text-gray-800 text-sm">{tipoInfo?.label}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
          <X size={16} />
        </button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

        {/* Label */}
        {campo.tipo !== 'instrucao' && campo.tipo !== 'secao' && (
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Pergunta / Label</label>
            <input
              type="text"
              value={campo.label}
              onChange={e => set({ label: e.target.value })}
              placeholder="Ex: Qual é a sua queixa principal?"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b5fcf]/30 focus:border-[#5b5fcf]"
            />
          </div>
        )}

        {/* Conteúdo de seção / instrução */}
        {(campo.tipo === 'secao' || campo.tipo === 'instrucao') && (
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              {campo.tipo === 'secao' ? 'Título da Seção' : 'Texto da Instrução'}
            </label>
            <textarea
              value={campo.label}
              onChange={e => set({ label: e.target.value })}
              rows={campo.tipo === 'instrucao' ? 4 : 2}
              placeholder={campo.tipo === 'secao' ? 'Ex: Histórico Clínico' : 'Ex: Por favor, responda com atenção...'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#5b5fcf]/30 focus:border-[#5b5fcf]"
            />
          </div>
        )}

        {/* Descrição/dica */}
        {campo.tipo !== 'secao' && campo.tipo !== 'instrucao' && (
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Descrição / Dica <span className="font-normal text-gray-400">(opcional)</span></label>
            <input
              type="text"
              value={campo.descricao ?? ''}
              onChange={e => set({ descricao: e.target.value })}
              placeholder="Ex: Descreva a localização e intensidade"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b5fcf]/30 focus:border-[#5b5fcf]"
            />
          </div>
        )}

        {/* Obrigatório */}
        {campo.tipo !== 'secao' && campo.tipo !== 'instrucao' && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700">Campo obrigatório</p>
              <p className="text-xs text-gray-400">O paciente não pode pular este campo</p>
            </div>
            <button
              onClick={() => set({ obrigatorio: !campo.obrigatorio })}
              className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 ${campo.obrigatorio ? 'bg-[#5b5fcf]' : 'bg-gray-200'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${campo.obrigatorio ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        )}

        {/* Opções (seleção única / múltipla) */}
        {(campo.tipo === 'selecao_unica' || campo.tipo === 'selecao_multipla') && (
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Opções de resposta</label>
            <div className="flex flex-col gap-2">
              {(campo.opcoes ?? []).map((op, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-4 h-4 flex-shrink-0 border-2 border-gray-300 ${campo.tipo === 'selecao_unica' ? 'rounded-full' : 'rounded'}`} />
                  <input
                    type="text"
                    value={op}
                    onChange={e => editOpcao(i, e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b5fcf]/30 focus:border-[#5b5fcf]"
                  />
                  <button onClick={() => removeOpcao(i)} className="text-gray-300 hover:text-red-400 p-1 rounded">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={addOpcao}
                className="flex items-center gap-2 text-sm text-[#5b5fcf] hover:text-[#4a4fb8] font-medium mt-1"
              >
                <Plus size={14} /> Adicionar opção
              </button>
            </div>
          </div>
        )}

        {/* Escala numérica */}
        {campo.tipo === 'escala_numerica' && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Mínimo</label>
                <input
                  type="number"
                  value={campo.min ?? 0}
                  onChange={e => set({ min: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b5fcf]/30 focus:border-[#5b5fcf]"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Máximo</label>
                <input
                  type="number"
                  value={campo.max ?? 10}
                  onChange={e => set({ max: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b5fcf]/30 focus:border-[#5b5fcf]"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">Rótulos</label>
              <input
                type="text"
                value={campo.rotulos?.min ?? ''}
                onChange={e => set({ rotulos: { min: e.target.value, max: campo.rotulos?.max ?? '' } })}
                placeholder="Rótulo do mínimo (ex: Sem dor)"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b5fcf]/30 focus:border-[#5b5fcf]"
              />
              <input
                type="text"
                value={campo.rotulos?.max ?? ''}
                onChange={e => set({ rotulos: { min: campo.rotulos?.min ?? '', max: e.target.value } })}
                placeholder="Rótulo do máximo (ex: Dor insuportável)"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b5fcf]/30 focus:border-[#5b5fcf]"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
interface Props {
  formularioInicial?: {
    id?: string
    nome: string
    descricao: string
    categoria: string
    campos_json: CampoFormulario[]
    status: string
  }
}

export function ConstrutorClient({ formularioInicial }: Props) {
  const router = useRouter()

  const [nome,      setNome]      = useState(formularioInicial?.nome ?? '')
  const [descricao, setDescricao] = useState(formularioInicial?.descricao ?? '')
  const [categoria, setCategoria] = useState(formularioInicial?.categoria ?? '')
  const [campos,    setCampos]    = useState<CampoFormulario[]>(formularioInicial?.campos_json ?? [])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [salvando,   setSalvando]   = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [erro,       setErro]       = useState<string | null>(null)
  const [sucesso,    setSucesso]    = useState<string | null>(null)

  // DnD state
  const dragIndex = useRef<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  const selectedCampo = campos.find(c => c.id === selectedId) ?? null

  // ── Manipulação de campos ──────────────────────────────────────────────────
  const addCampo = useCallback((tipo: CampoTipo) => {
    const campo = novoCampo(tipo)
    setCampos(prev => [...prev, campo])
    setSelectedId(campo.id)
  }, [])

  const updateCampo = useCallback((updated: CampoFormulario) => {
    setCampos(prev => prev.map(c => c.id === updated.id ? updated : c))
  }, [])

  const deleteCampo = useCallback((id: string) => {
    setCampos(prev => prev.filter(c => c.id !== id))
    setSelectedId(prev => prev === id ? null : prev)
  }, [])

  const duplicarCampo = useCallback((id: string) => {
    setCampos(prev => {
      const idx = prev.findIndex(c => c.id === id)
      if (idx === -1) return prev
      const copia = { ...prev[idx], id: gerarId(), label: prev[idx].label + ' (cópia)' }
      const next = [...prev]
      next.splice(idx + 1, 0, copia)
      return next
    })
  }, [])

  const moverCampo = useCallback((id: string, dir: -1 | 1) => {
    setCampos(prev => {
      const idx = prev.findIndex(c => c.id === id)
      const novo = idx + dir
      if (novo < 0 || novo >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[novo]] = [next[novo], next[idx]]
      return next
    })
  }, [])

  // ── Drag and Drop ──────────────────────────────────────────────────────────
  function handleDragStart(i: number) { dragIndex.current = i }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault()
    setDropIndex(i)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const from = dragIndex.current
    const to   = dropIndex
    if (from === null || to === null || from === to) { resetDrag(); return }
    setCampos(prev => {
      const next = [...prev]
      const [removed] = next.splice(from, 1)
      next.splice(to, 0, removed)
      return next
    })
    resetDrag()
  }

  function resetDrag() { dragIndex.current = null; setDropIndex(null) }

  // ── Salvar ─────────────────────────────────────────────────────────────────
  async function salvar(status: 'rascunho' | 'ativo') {
    setErro(null)
    if (!nome.trim())  { setErro('Dê um nome ao formulário antes de salvar.'); return }
    if (!categoria)    { setErro('Selecione uma categoria.'); return }
    if (campos.length === 0) { setErro('Adicione pelo menos um campo.'); return }

    status === 'ativo' ? setPublicando(true) : setSalvando(true)

    try {
      const method  = formularioInicial?.id ? 'PATCH' : 'POST'
      const payload = {
        ...(formularioInicial?.id ? { id: formularioInicial.id } : {}),
        nome, descricao, categoria, status,
        campos_json: campos,
      }

      const res  = await fetch('/api/formularios', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error ?? 'Erro ao salvar')

      setSucesso(status === 'ativo' ? 'Formulário publicado com sucesso!' : 'Rascunho salvo!')
      setTimeout(() => {
        setSucesso(null)
        router.push('/formularios')
      }, 1500)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado')
    } finally {
      setSalvando(false)
      setPublicando(false)
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: '#EDEFF3' }}>

      {/* ── Barra superior ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-6 py-3 bg-white border-b border-gray-100 flex-shrink-0" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <button
          onClick={() => router.push('/formularios')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0"
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Nome do formulário..."
            className="text-lg font-bold text-gray-800 bg-transparent border-none outline-none w-full placeholder:text-gray-300"
          />
        </div>

        <select
          value={categoria}
          onChange={e => setCategoria(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#5b5fcf]/30 focus:border-[#5b5fcf] flex-shrink-0"
        >
          <option value="">Categoria...</option>
          {Object.entries(CATEGORIAS).map(([key, info]) => (
            <option key={key} value={key}>{info.label}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => salvar('rascunho')}
            disabled={salvando || publicando}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <Save size={15} />
            {salvando ? 'Salvando...' : 'Salvar rascunho'}
          </button>
          <button
            onClick={() => salvar('ativo')}
            disabled={salvando || publicando}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-colors"
            style={{ background: '#5b5fcf' }}
          >
            <Send size={15} />
            {publicando ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </div>

      {/* ── Alertas ────────────────────────────────────────────────────────── */}
      {erro && (
        <div className="mx-6 mt-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between flex-shrink-0">
          {erro}
          <button onClick={() => setErro(null)}><X size={14} /></button>
        </div>
      )}
      {sucesso && (
        <div className="mx-6 mt-3 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex-shrink-0">
          ✓ {sucesso}
        </div>
      )}

      {/* ── Corpo: 3 colunas ───────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 gap-0 mt-4 px-6 pb-6">

        {/* ── Coluna esquerda: Paleta de tipos ─────────────────────────────── */}
        <div className="w-56 flex-shrink-0 mr-4">
          <div className="bg-white rounded-2xl overflow-hidden h-full" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tipos de Campo</p>
            </div>
            <div className="p-3 flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {TIPOS_CAMPO.map(({ tipo, label, descricao: desc, Icon }) => (
                <button
                  key={tipo}
                  onClick={() => addCampo(tipo)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all hover:bg-[#5b5fcf]/5 group"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100 group-hover:bg-[#5b5fcf]/10 transition-colors">
                    <Icon size={15} className="text-gray-500 group-hover:text-[#5b5fcf]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900 leading-none">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight truncate">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Coluna central: Canvas do formulário ─────────────────────────── */}
        <div className="flex-1 min-w-0 mr-4 overflow-y-auto">
          {/* Metadados */}
          <div className="bg-white rounded-2xl p-5 mb-3" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Descrição do Formulário</p>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Adicione uma descrição para orientar o paciente ao receber este formulário..."
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#5b5fcf]/30 focus:border-[#5b5fcf] text-gray-700"
            />
          </div>

          {/* Lista de campos */}
          {campos.length === 0 ? (
            <div className="bg-white rounded-2xl flex flex-col items-center justify-center py-20 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div className="w-14 h-14 rounded-2xl bg-[#5b5fcf]/10 flex items-center justify-center mb-4">
                <Plus size={24} className="text-[#5b5fcf]" />
              </div>
              <p className="font-semibold text-gray-700 mb-1">Nenhum campo ainda</p>
              <p className="text-sm text-gray-400 max-w-xs">Clique em um tipo de campo à esquerda para adicionar ao formulário</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {campos.map((campo, i) => {
                const isSelected = selectedId === campo.id
                const isDragOver = dropIndex === i
                return (
                  <div
                    key={campo.id}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={e => handleDragOver(e, i)}
                    onDrop={handleDrop}
                    onDragEnd={resetDrag}
                    onClick={() => setSelectedId(campo.id)}
                    className={`bg-white rounded-2xl cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-[#5b5fcf]' : 'hover:ring-1 hover:ring-gray-200'
                    } ${isDragOver && dragIndex.current !== i ? 'border-t-2 border-[#5b5fcf]' : ''}`}
                    style={{ boxShadow: isSelected ? '0 4px 16px rgba(91,95,207,0.15)' : '0 2px 12px rgba(0,0,0,0.06)' }}
                  >
                    <div className="flex items-start gap-3 p-4">
                      {/* Drag handle */}
                      <div className="flex-shrink-0 mt-1 cursor-grab text-gray-300 hover:text-gray-500">
                        <GripVertical size={16} />
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        {/* Header do campo */}
                        {campo.tipo !== 'secao' && campo.tipo !== 'instrucao' && (
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {campo.label || <span className="text-gray-400 font-normal italic">Campo sem label</span>}
                            </p>
                            {campo.obrigatorio && <span className="text-red-500 text-xs flex-shrink-0">*</span>}
                          </div>
                        )}
                        <CampoPreview campo={campo} />
                        {campo.descricao && (
                          <p className="text-xs text-gray-400 mt-2 italic">{campo.descricao}</p>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="flex-shrink-0 flex flex-col gap-1 ml-2">
                        <button
                          onClick={e => { e.stopPropagation(); moverCampo(campo.id, -1) }}
                          className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-600 disabled:opacity-30"
                          disabled={i === 0}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); moverCampo(campo.id, 1) }}
                          className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-600 disabled:opacity-30"
                          disabled={i === campos.length - 1}
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); duplicarCampo(campo.id) }}
                          className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-600"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); deleteCampo(campo.id) }}
                          className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Botão adicionar campo no final */}
              <button
                onClick={() => addCampo('texto_curto')}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:text-[#5b5fcf] hover:border-[#5b5fcf] transition-colors bg-white"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
              >
                <Plus size={16} /> Adicionar campo de texto
              </button>
            </div>
          )}
        </div>

        {/* ── Coluna direita: Configuração / Estatísticas ───────────────────── */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-white rounded-2xl overflow-hidden h-full" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            {selectedCampo ? (
              <PainelConfig
                campo={selectedCampo}
                onChange={updateCampo}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <div className="flex flex-col h-full">
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Settings2 size={16} className="text-[#5b5fcf]" />
                    <span className="font-semibold text-gray-800 text-sm">Visão geral</span>
                  </div>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-[#5b5fcf]">{campos.length}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Campos</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-[#5b5fcf]">{campos.filter(c => c.obrigatorio).length}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Obrigatórios</p>
                    </div>
                  </div>

                  {/* Composição de tipos */}
                  {campos.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Composição</p>
                      <div className="flex flex-col gap-1.5">
                        {Object.entries(
                          campos.reduce<Record<string, number>>((acc, c) => {
                            const info = TIPOS_CAMPO.find(t => t.tipo === c.tipo)
                            const label = info?.label ?? c.tipo
                            acc[label] = (acc[label] ?? 0) + 1
                            return acc
                          }, {})
                        ).map(([label, count]) => (
                          <div key={label} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 truncate">{label}</span>
                            <span className="font-semibold text-gray-800 ml-2 flex-shrink-0">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-[#5b5fcf]/5 rounded-xl border border-[#5b5fcf]/10">
                    <div className="flex items-start gap-2">
                      <Eye size={14} className="text-[#5b5fcf] mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-[#5b5fcf]">
                        Clique em qualquer campo para editar suas configurações
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
