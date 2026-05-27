'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, Search, FileText, Send, Library,
  Clock, CheckCircle2, AlertCircle, MoreHorizontal,
  Trash2, Copy, Eye, Edit3, BookOpen,
} from 'lucide-react'
import { CATEGORIAS } from '@/lib/formularios/tipos'
import { ModalEnviarFormulario } from '@/components/formularios/modal-enviar-formulario'
import { ModalPreviewFormulario } from '@/components/formularios/modal-preview-formulario'
import type { CampoFormulario } from '@/lib/formularios/tipos'

type Formulario = {
  id: string
  nome: string
  descricao: string | null
  categoria: string
  status: string
  campos_json: unknown[]
  created_at: string
  updated_at: string
}

type Envio = {
  id: string
  status: string
  enviado_via: string
  expira_em: string | null
  respondido_em: string | null
  created_at: string
  formularios: { id: string; nome: string; categoria: string } | null
  pacientes: { id: string; nome: string } | null
}

interface Props {
  formularios: Formulario[]
  envios: Envio[]
}

type Aba = 'meus' | 'envios'

const STATUS_LABEL: Record<string, { label: string; cor: string; Icon: React.FC<{ size?: number; className?: string }> }> = {
  ativo:    { label: 'Publicado',  cor: 'text-green-600 bg-green-50 border-green-200',  Icon: CheckCircle2 },
  rascunho: { label: 'Rascunho',   cor: 'text-yellow-600 bg-yellow-50 border-yellow-200', Icon: Clock },
  arquivado:{ label: 'Arquivado',  cor: 'text-gray-500 bg-gray-50 border-gray-200',     Icon: AlertCircle },
}

const ENVIO_STATUS: Record<string, { label: string; cor: string }> = {
  pendente:   { label: 'Pendente',   cor: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  respondido: { label: 'Respondido', cor: 'text-green-700 bg-green-50 border-green-200' },
  expirado:   { label: 'Expirado',   cor: 'text-gray-500 bg-gray-100 border-gray-200' },
}

function MenuCard({ formulario, onDelete, onDuplicate, onPreview }: {
  formulario: Formulario
  onDelete: () => void
  onDuplicate: () => void
  onPreview: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-white rounded-xl border border-gray-100 shadow-lg py-1 w-44" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
            <Link
              href={`/formularios/${formulario.id}/editar`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Edit3 size={14} /> Editar
            </Link>
            <button onClick={() => { onDuplicate(); setOpen(false) }} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full">
              <Copy size={14} /> Duplicar
            </button>
            <button onClick={() => { onPreview(); setOpen(false) }} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full">
              <Eye size={14} /> Pré-visualizar
            </button>
            <hr className="my-1 border-gray-100" />
            <button onClick={() => { onDelete(); setOpen(false) }} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full">
              <Trash2 size={14} /> Arquivar
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function FormulariosClient({ formularios, envios }: Props) {
  const router = useRouter()
  const [aba, setAba] = useState<Aba>('meus')
  const [busca, setBusca] = useState('')
  const [lista, setLista] = useState<Formulario[]>(formularios)
  const [modalEnviar,   setModalEnviar]   = useState<{ id: string; nome: string; categoria: string } | null>(null)
  const [previewForm,   setPreviewForm]   = useState<Formulario | null>(null)

  const filtrados = lista.filter(f =>
    f.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (f.descricao ?? '').toLowerCase().includes(busca.toLowerCase())
  )

  async function arquivar(id: string) {
    const res = await fetch(`/api/formularios?id=${id}`, { method: 'DELETE' })
    if (res.ok) setLista(prev => prev.filter(f => f.id !== id))
  }

  async function duplicar(f: Formulario) {
    const res = await fetch('/api/formularios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: `${f.nome} (cópia)`,
        descricao: f.descricao,
        categoria: f.categoria,
        campos_json: f.campos_json,
        status: 'rascunho',
      }),
    })
    if (res.ok) {
      const novo = await res.json()
      setLista(prev => [novo, ...prev])
    }
  }

  const pendentes  = envios.filter(e => e.status === 'pendente').length
  const respondidos = envios.filter(e => e.status === 'respondido').length

  return (
    <div className="p-8" style={{ background: '#EDEFF3', minHeight: '100vh' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Formulários</h1>
          <p className="text-sm text-gray-500 mt-1">Crie, envie e acompanhe formulários clínicos dos seus pacientes</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/formularios/biblioteca"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            <BookOpen size={16} /> Biblioteca
          </Link>
          <Link
            href="/formularios/criar"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: '#5b5fcf', boxShadow: '0 4px 12px rgba(91,95,207,0.3)' }}
          >
            <Plus size={16} /> Novo Formulário
          </Link>
        </div>
      </div>

      {/* ── Cards de resumo ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Meus Formulários', valor: lista.length,                     sub: `${lista.filter(f => f.status === 'ativo').length} publicados`, cor: '#5b5fcf', bg: '#eff0fd', Icon: FileText },
          { label: 'Envios Pendentes', valor: pendentes,                        sub: 'aguardando resposta',                                           cor: '#f59e0b', bg: '#fffbeb', Icon: Clock },
          { label: 'Respondidos',      valor: respondidos,                      sub: 'respostas recebidas',                                           cor: '#22c55e', bg: '#f0fdf4', Icon: CheckCircle2 },
          { label: 'Total de Envios',  valor: envios.length,                    sub: 'formulários enviados',                                          cor: '#0ea5e9', bg: '#f0f9ff', Icon: Send },
        ].map(({ label, valor, sub, cor, bg, Icon }) => (
          <div key={label} className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{label}</p>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={18} style={{ color: cor }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{valor}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Abas ─────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 pt-1">
          <div className="flex gap-1">
            {([
              { key: 'meus',   label: 'Meus Formulários', Icon: FileText, count: lista.length },
              { key: 'envios', label: 'Envios',            Icon: Send,     count: envios.length },
            ] as const).map(({ key, label, Icon, count }) => (
              <button
                key={key}
                onClick={() => setAba(key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  aba === key
                    ? 'border-[#5b5fcf] text-[#5b5fcf]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={15} />
                {label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${aba === key ? 'bg-[#5b5fcf]/10 text-[#5b5fcf]' : 'bg-gray-100 text-gray-500'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {aba === 'meus' && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar formulários..."
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b5fcf]/30 focus:border-[#5b5fcf] w-56"
              />
            </div>
          )}
        </div>

        {/* ── Aba: Meus Formulários ──────────────────────────────────────────── */}
        {aba === 'meus' && (
          <div className="divide-y divide-gray-50">
            {filtrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#5b5fcf]/10 flex items-center justify-center mb-4">
                  <FileText size={24} className="text-[#5b5fcf]" />
                </div>
                <p className="font-semibold text-gray-700 mb-1">
                  {busca ? 'Nenhum formulário encontrado' : 'Nenhum formulário criado ainda'}
                </p>
                <p className="text-sm text-gray-400 mb-6 max-w-xs">
                  {busca
                    ? 'Tente outro termo de busca'
                    : 'Crie seu primeiro formulário ou explore a biblioteca de modelos prontos'}
                </p>
                {!busca && (
                  <div className="flex gap-3">
                    <Link href="/formularios/biblioteca" className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                      <Library size={14} className="inline mr-1.5" /> Ver Biblioteca
                    </Link>
                    <Link href="/formularios/criar" className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: '#5b5fcf' }}>
                      <Plus size={14} className="inline mr-1.5" /> Criar Formulário
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              filtrados.map(f => {
                const cat = CATEGORIAS[f.categoria]
                const st  = STATUS_LABEL[f.status] ?? STATUS_LABEL.rascunho
                const { Icon: StIcon } = st
                const total  = Array.isArray(f.campos_json) ? f.campos_json.length : 0
                const atualizado = new Date(f.updated_at).toLocaleDateString('pt-BR')
                return (
                  <div key={f.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors group">
                    {/* Ícone categoria */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: cat?.corBg ?? '#f3f4f6' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: cat?.cor ?? '#6b7280' }}>
                        {cat?.icone ?? 'article'}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-gray-800 truncate">{f.nome}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 flex-shrink-0 ${st.cor}`}>
                          <StIcon size={11} /> {st.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {cat && <span style={{ color: cat.cor }}>{cat.label}</span>}
                        <span>·</span>
                        <span>{total} campo{total !== 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span>Atualizado {atualizado}</span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => router.push(`/formularios/${f.id}/editar`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-white transition-colors"
                      >
                        <Edit3 size={12} /> Editar
                      </button>
                      <button
                        onClick={() => setModalEnviar({ id: f.id, nome: f.nome, categoria: f.categoria })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors hover:opacity-90"
                        style={{ background: '#5b5fcf' }}
                      >
                        <Send size={12} /> Enviar
                      </button>
                    </div>

                    <MenuCard
                      formulario={f}
                      onDelete={() => arquivar(f.id)}
                      onDuplicate={() => duplicar(f)}
                      onPreview={() => setPreviewForm(f)}
                    />
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── Aba: Envios ───────────────────────────────────────────────────── */}
        {aba === 'envios' && (
          <div className="divide-y divide-gray-50">
            {envios.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#5b5fcf]/10 flex items-center justify-center mb-4">
                  <Send size={24} className="text-[#5b5fcf]" />
                </div>
                <p className="font-semibold text-gray-700 mb-1">Nenhum envio registrado</p>
                <p className="text-sm text-gray-400">Quando você enviar um formulário a um paciente, ele aparecerá aqui</p>
              </div>
            ) : (
              envios.map(e => {
                const st = ENVIO_STATUS[e.status] ?? ENVIO_STATUS.pendente
                const cat = CATEGORIAS[e.formularios?.categoria ?? '']
                const data = new Date(e.created_at).toLocaleDateString('pt-BR')
                return (
                  <div key={e.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cat?.corBg ?? '#f3f4f6' }}>
                      <FileText size={18} style={{ color: cat?.cor ?? '#6b7280' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-gray-800 truncate">{e.formularios?.nome ?? '—'}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${st.cor}`}>{st.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{e.pacientes?.nome ?? '—'}</span>
                        <span>·</span>
                        <span>Via {e.enviado_via}</span>
                        <span>·</span>
                        <span>{data}</span>
                        {e.respondido_em && <>
                          <span>·</span>
                          <span className="text-green-600">Respondido {new Date(e.respondido_em).toLocaleDateString('pt-BR')}</span>
                        </>}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* ── Modal: Pré-visualizar Formulário ──────────────────────────────── */}
      {previewForm && (
        <ModalPreviewFormulario
          nome={previewForm.nome}
          descricao={previewForm.descricao}
          categoria={previewForm.categoria}
          campos={(previewForm.campos_json as CampoFormulario[]) ?? []}
          onClose={() => setPreviewForm(null)}
        />
      )}

      {/* ── Modal: Enviar Formulário ───────────────────────────────────────── */}
      {modalEnviar && (
        <ModalEnviarFormulario
          formularioId={modalEnviar.id}
          formularioNome={modalEnviar.nome}
          formularioCat={modalEnviar.categoria}
          onSuccess={() => setAba('envios')}
          onClose={() => {
            setModalEnviar(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
