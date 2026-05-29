'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search, ArrowLeft, Copy, BookOpen,
  CheckCircle2, Hash, Star, List, PersonStanding,
} from 'lucide-react'
import { BIBLIOTECA, type FormularioMeta } from '@/lib/formularios/biblioteca-metadata'
import { CATEGORIAS } from '@/lib/formularios/tipos'
import { MapaCorporal, ZONA_NOMES } from '@/components/formularios/mapa-corporal'
import { CAMPOS_BIBLIOTECA } from '@/lib/formularios/campos-biblioteca'

// â”€â”€â”€ DiÃ¡logo de confirmaÃ§Ã£o de duplicaÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ModalDuplicar({
  form,
  onConfirm,
  onClose,
  loading,
}: {
  form: FormularioMeta
  onConfirm: () => void
  onClose: () => void
  loading: boolean
}) {
  const cat = CATEGORIAS[form.categoria]
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: cat?.corBg ?? '#f3f4f6' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: cat?.cor ?? '#6b7280' }}>{cat?.icone ?? 'article'}</span>
          </div>
          <div>
            <p className="font-bold text-gray-900">Duplicar formulÃ¡rio</p>
            <p className="text-xs text-gray-500">{cat?.label}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-1">
          SerÃ¡ criada uma cÃ³pia de <strong>"{form.nome}"</strong> em <strong>Meus FormulÃ¡rios</strong>, onde vocÃª pode editÃ¡-la livremente.
        </p>
        <p className="text-xs text-gray-400 mb-6">O original da biblioteca nÃ£o serÃ¡ alterado.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: '#5b5fcf' }}
          >
            {loading ? 'Duplicando...' : 'Duplicar e editar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// â”€â”€â”€ Card de formulÃ¡rio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FormCard({
  form,
  onDuplicar,
}: {
  form: FormularioMeta
  onDuplicar: (f: FormularioMeta) => void
}) {
  const cat = CATEGORIAS[form.categoria]
  return (
    <div
      className="bg-white rounded-2xl p-5 flex flex-col gap-3 transition-all hover:-translate-y-0.5"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s, transform 0.2s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.1)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      {/* CabeÃ§alho */}
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cat?.corBg ?? '#f3f4f6' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: cat?.cor ?? '#6b7280' }}>{cat?.icone ?? 'article'}</span>
        </div>
        {form.pontuavel && (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 flex-shrink-0">
            <Star size={10} fill="currentColor" /> PontuÃ¡vel
          </span>
        )}
      </div>

      {/* Nome */}
      <div className="flex-1">
        <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1">{form.nome}</h3>
        <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">{form.descricao}</p>
      </div>

      {/* Tags */}
      {form.tags && form.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {form.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{tag}</span>
          ))}
          {form.tags.length > 3 && <span className="text-xs text-gray-400">+{form.tags.length - 3}</span>}
        </div>
      )}

      {/* RodapÃ© */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Hash size={11} /> {form.num_campos} campos
          </span>
          {form.referencia && (
            <span className="text-gray-300 truncate max-w-[100px]" title={form.referencia}>
              {form.referencia.split(',')[0]}
            </span>
          )}
        </div>
        <button
          onClick={() => onDuplicar(form)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
          style={{ background: '#5b5fcf' }}
        >
          <Copy size={11} /> Duplicar
        </button>
      </div>
    </div>
  )
}

// â”€â”€â”€ Componente principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function BibliotecaClient() {
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const [catFiltro, setCatFiltro] = useState<string | null>(null)
  const [filterMode, setFilterMode] = useState<'categoria' | 'corpo'>('categoria')
  const [zonaSelecionada, setZonaSelecionada] = useState<string | null>(null)
  const [duplicando, setDuplicando] = useState<FormularioMeta | null>(null)
  const [loadingDup, setLoadingDup] = useState(false)
  const [sucesso, setSucesso] = useState<string | null>(null)

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase()
    return BIBLIOTECA.filter(f => {
      const matchCat = filterMode === 'categoria'
        ? (!catFiltro || f.categoria === catFiltro)
        : (!zonaSelecionada || f.partes_corpo.includes(zonaSelecionada))
      const matchBusca = !q ||
        f.nome.toLowerCase().includes(q) ||
        f.descricao.toLowerCase().includes(q) ||
        (f.tags ?? []).some(t => t.toLowerCase().includes(q))
      return matchCat && matchBusca
    })
  }, [busca, catFiltro, filterMode, zonaSelecionada])

  // Contagem por categoria
  const contagemCat = useMemo(() =>
    BIBLIOTECA.reduce<Record<string, number>>((acc, f) => {
      acc[f.categoria] = (acc[f.categoria] ?? 0) + 1; return acc
    }, {})
  , [])

  async function confirmarDuplicar() {
    if (!duplicando) return
    setLoadingDup(true)
    try {
      const res = await fetch('/api/formularios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome:       duplicando.nome,
          descricao:  duplicando.descricao,
          categoria:  duplicando.categoria,
          campos_json: CAMPOS_BIBLIOTECA[duplicando.id] ?? [],
          status:     'rascunho',
        }),
      })
      if (!res.ok) throw new Error('Erro ao duplicar')
      const novo = await res.json()
      setDuplicando(null)
      setSucesso(`"${duplicando.nome}" duplicado com sucesso!`)
      setTimeout(() => setSucesso(null), 3000)
      router.push(`/formularios/${novo.id}/editar`)
    } catch {
      setDuplicando(null)
    } finally {
      setLoadingDup(false)
    }
  }

  return (
    <div className="flex h-full min-h-screen" style={{ background: '#EDEFF3' }}>

      {/* â”€â”€ Sidebar de categorias â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <aside className="w-64 flex-shrink-0 p-4 pr-0">
        <div className="bg-white rounded-2xl overflow-hidden h-full" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="px-4 py-4 border-b border-gray-100">
            <Link href="/formularios" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-3">
              <ArrowLeft size={14} /> Voltar
            </Link>
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-[#5b5fcf]" />
              <p className="font-bold text-gray-800 text-sm">Biblioteca</p>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{BIBLIOTECA.length} formulÃ¡rios disponÃ­veis</p>

            {/* Toggle modo de filtro */}
            <div className="flex mt-3 bg-gray-100 rounded-xl p-0.5 gap-0.5">
              <button
                onClick={() => { setFilterMode('categoria'); setZonaSelecionada(null) }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterMode === 'categoria'
                    ? 'bg-white text-[#5b5fcf] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List size={12} /> Categoria
              </button>
              <button
                onClick={() => { setFilterMode('corpo'); setCatFiltro(null) }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterMode === 'corpo'
                    ? 'bg-white text-[#5b5fcf] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <PersonStanding size={12} /> RegiÃ£o
              </button>
            </div>
          </div>

          {/* â”€â”€ Modo Categoria â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {filterMode === 'categoria' && (
            <nav className="p-3 flex flex-col gap-0.5">
              {/* Todos */}
              <button
                onClick={() => setCatFiltro(null)}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm transition-colors ${
                  !catFiltro ? 'bg-[#5b5fcf]/10 text-[#5b5fcf] font-semibold' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>Todos</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${!catFiltro ? 'bg-[#5b5fcf]/20 text-[#5b5fcf]' : 'bg-gray-100 text-gray-500'}`}>
                  {BIBLIOTECA.length}
                </span>
              </button>

              {Object.entries(CATEGORIAS).map(([key, info]) => {
                const count = contagemCat[key] ?? 0
                const ativo = catFiltro === key
                return (
                  <button
                    key={key}
                    onClick={() => setCatFiltro(ativo ? null : key)}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm transition-colors ${
                      ativo ? 'font-semibold' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    style={ativo ? { background: `${info.corBg}`, color: info.cor } : {}}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 16, color: ativo ? info.cor : '#9ca3af' }}>
                        {info.icone}
                      </span>
                      <span className="truncate">{info.label}</span>
                    </div>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ml-1"
                      style={ativo ? { background: `${info.cor}20`, color: info.cor } : { background: '#f3f4f6', color: '#6b7280' }}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </nav>
          )}

          {/* â”€â”€ Modo Corpo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {filterMode === 'corpo' && (
            <div className="p-4">
              <MapaCorporal
                zonaSelecionada={zonaSelecionada}
                onSelect={setZonaSelecionada}
              />
            </div>
          )}
        </div>
      </aside>

      {/* â”€â”€ Ãrea principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <main className="flex-1 p-4 pl-4 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {filterMode === 'corpo' && zonaSelecionada
                ? (ZONA_NOMES[zonaSelecionada] ?? zonaSelecionada)
                : filterMode === 'corpo'
                  ? 'Todas as RegiÃµes'
                  : catFiltro
                    ? CATEGORIAS[catFiltro]?.label
                    : 'Todos os FormulÃ¡rios'
              }
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {filtrados.length} formulÃ¡rio{filtrados.length !== 1 ? 's' : ''}
              {busca && ` para "${busca}"`}
            </p>
          </div>

          {/* Busca */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar formulÃ¡rios, tags..."
              className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#5b5fcf]/30 focus:border-[#5b5fcf] w-64"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            />
          </div>
        </div>

        {/* Sucesso */}
        {sucesso && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 mb-4">
            <CheckCircle2 size={16} /> {sucesso}
          </div>
        )}

        {/* Grid de cards */}
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <Search size={32} className="text-gray-300 mb-3" />
            <p className="font-semibold text-gray-700 mb-1">Nenhum formulÃ¡rio encontrado</p>
            <p className="text-sm text-gray-400">Tente outro termo ou categoria</p>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {filtrados.map(form => (
              <FormCard key={form.id} form={form} onDuplicar={setDuplicando} />
            ))}
          </div>
        )}
      </main>

      {/* â”€â”€ Modal duplicar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {duplicando && (
        <ModalDuplicar
          form={duplicando}
          onConfirm={confirmarDuplicar}
          onClose={() => setDuplicando(null)}
          loading={loadingDup}
        />
      )}
    </div>
  )
}

