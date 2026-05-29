'use client'

import { useState, useMemo } from 'react'
import { Tag, LayoutGrid, Plus, Search, X, MessageSquare } from 'lucide-react'
import { ListaServicos } from '@/components/servicos/lista-servicos'
import { ListaCategorias } from '@/components/servicos/lista-categorias'
import { ServicoForm } from '@/components/servicos/servico-form'
import { CategoriaForm } from '@/components/servicos/categoria-form'
import { VinculoProfissionais } from '@/components/servicos/vinculo-profissionais'
import { OrientacoesTab } from '@/components/servicos/orientacoes-tab'

type Tab = 'servicos' | 'categorias' | 'orientacoes'
type StatusFilter = 'ativos' | 'inativos' | 'todos'

export interface Servico {
  id: string
  nome: string
  descricao: string | null
  categoria_id: string | null
  tipo: string
  duracao_minutos: number
  valor: number
  cor: string | null
  icone: string | null
  ativo: boolean
  permite_agendamento_online: boolean
}

export interface Categoria {
  id: string
  nome: string
  descricao: string | null
  cor: string
  icone: string
  ordem: number
  ativo: boolean
}

export interface Profissional {
  id: string
  nome: string
  especialidade: string | null
  cor_agenda: string | null
  avatar_url: string | null
}

export interface Vinculo {
  servico_id: string
  profissional_id: string
  valor_override: number | null
  duracao_override: number | null
}

interface Props {
  servicos: Servico[]
  categorias: Categoria[]
  profissionais: Profissional[]
  vinculos: Vinculo[]
  podeEditar: boolean
}

export function ServicosClient(props: Props) {
  const { servicos, categorias, profissionais, vinculos, podeEditar } = props
  const [tab, setTab] = useState<Tab>('servicos')

  // Filtros
  const [busca, setBusca]                 = useState('')
  const [filtroCat, setFiltroCat]         = useState<string>('')   // '' = todas
  const [filtroProf, setFiltroProf]       = useState<string>('')   // '' = todos
  const [filtroStatus, setFiltroStatus]   = useState<StatusFilter>('ativos')
  const [filtroOnline, setFiltroOnline]   = useState(false)

  // Modais
  const [editingServico, setEditingServico]       = useState<Servico | null>(null)
  const [creatingServico, setCreatingServico]     = useState(false)
  const [editingCategoria, setEditingCategoria]   = useState<Categoria | null>(null)
  const [creatingCategoria, setCreatingCategoria] = useState(false)
  const [vinculandoServico, setVinculandoServico] = useState<Servico | null>(null)

  // Aplica filtros
  const servicosFiltrados = useMemo(() => {
    const buscaLow = busca.trim().toLowerCase()
    const idsProf = new Set(
      filtroProf
        ? vinculos.filter(v => v.profissional_id === filtroProf).map(v => v.servico_id)
        : servicos.map(s => s.id)
    )

    return servicos.filter(s => {
      if (filtroStatus === 'ativos'   && !s.ativo) return false
      if (filtroStatus === 'inativos' &&  s.ativo) return false
      if (filtroCat    && s.categoria_id !== filtroCat) return false
      if (filtroProf   && !idsProf.has(s.id)) return false
      if (filtroOnline && !s.permite_agendamento_online) return false
      if (buscaLow) {
        const hay = (s.nome + ' ' + (s.descricao ?? '')).toLowerCase()
        if (!hay.includes(buscaLow)) return false
      }
      return true
    })
  }, [servicos, vinculos, busca, filtroCat, filtroProf, filtroStatus, filtroOnline])

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'servicos',    label: 'Serviços',    icon: <Tag size={15} />,          count: tab === 'servicos' ? servicosFiltrados.length : servicos.length },
    { id: 'categorias',  label: 'Categorias',  icon: <LayoutGrid size={15} />,   count: categorias.length },
    { id: 'orientacoes', label: 'Orientações', icon: <MessageSquare size={15} /> },
  ]

  const filtrosAtivos = !!(busca || filtroCat || filtroProf || filtroOnline || filtroStatus !== 'ativos')

  function limparFiltros() {
    setBusca('')
    setFiltroCat('')
    setFiltroProf('')
    setFiltroStatus('ativos')
    setFiltroOnline(false)
  }

  return (
    <div className="space-y-5">
      {/* Tabs + Novo (sempre visível — Server Action valida permissão) */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex p-1 bg-white rounded-full border border-[#E8E8E8] shadow-sm">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${
                tab === t.id ? 'bg-[#F8F9FA] text-[#2C3E50] shadow-sm' : 'text-[#7F8C8D] hover:text-[#2C3E50]'
              }`}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  tab === t.id ? 'bg-[#4A3AE8] text-white' : 'bg-[#E8E8E8] text-[#7F8C8D]'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab !== 'orientacoes' && (
          <button
            onClick={() => tab === 'servicos' ? setCreatingServico(true) : setCreatingCategoria(true)}
            className="flex items-center gap-2 bg-[#4A3AE8] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#3829c7] shadow-md"
          >
            <Plus size={16} />
            {tab === 'servicos' ? 'Novo Serviço' : 'Nova Categoria'}
          </button>
        )}
      </div>

      {/* Barra de filtros — só para a tab Serviços */}
      {tab === 'servicos' && (
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-3 flex items-center gap-2 flex-wrap shadow-sm">
          {/* Busca */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar serviço por nome ou descrição…"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#F8F9FA] border border-transparent text-sm outline-none focus:bg-white focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
            />
          </div>

          {/* Categoria */}
          <select
            value={filtroCat}
            onChange={(e) => setFiltroCat(e.target.value)}
            className="h-9 px-3 rounded-lg bg-[#F8F9FA] border border-transparent text-sm outline-none focus:bg-white focus:border-[#4A3AE8] cursor-pointer"
          >
            <option value="">Todas as categorias</option>
            {categorias.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>

          {/* Profissional */}
          <select
            value={filtroProf}
            onChange={(e) => setFiltroProf(e.target.value)}
            className="h-9 px-3 rounded-lg bg-[#F8F9FA] border border-transparent text-sm outline-none focus:bg-white focus:border-[#4A3AE8] cursor-pointer"
          >
            <option value="">Todos os profissionais</option>
            {profissionais.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>

          {/* Status */}
          <div className="inline-flex bg-[#F8F9FA] rounded-lg p-0.5">
            {(['ativos','inativos','todos'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={`px-3 h-8 text-xs font-semibold rounded-md transition-colors ${
                  filtroStatus === s ? 'bg-white text-[#2C3E50] shadow-sm' : 'text-[#7F8C8D] hover:text-[#2C3E50]'
                }`}
              >
                {s === 'ativos' ? 'Ativos' : s === 'inativos' ? 'Inativos' : 'Todos'}
              </button>
            ))}
          </div>

          {/* Online */}
          <button
            onClick={() => setFiltroOnline(o => !o)}
            className={`h-9 px-3 rounded-lg text-xs font-semibold transition-colors ${
              filtroOnline
                ? 'bg-[#27AE60] text-white'
                : 'bg-[#F8F9FA] text-[#7F8C8D] hover:text-[#2C3E50]'
            }`}
            title="Mostrar apenas serviços disponíveis para agendamento online"
          >
            🌐 Online
          </button>

          {filtrosAtivos && (
            <button
              onClick={limparFiltros}
              className="flex items-center gap-1 h-9 px-3 rounded-lg text-xs font-semibold text-[#E74C3C] hover:bg-[#E74C3C]/10"
            >
              <X size={12} />
              Limpar
            </button>
          )}
        </div>
      )}

      {/* Conteúdo */}
      {tab === 'servicos' && (
        servicosFiltrados.length === 0 && servicos.length > 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8E8E8] p-12 text-center">
            <p className="text-sm text-[#7F8C8D] mb-3">Nenhum serviço encontrado com esses filtros.</p>
            <button onClick={limparFiltros} className="text-sm font-semibold text-[#4A3AE8] hover:underline">
              Limpar filtros
            </button>
          </div>
        ) : (
          <ListaServicos
            servicos={servicosFiltrados}
            categorias={categorias}
            vinculos={vinculos}
            profissionais={profissionais}
            podeEditar={podeEditar}
            onEdit={setEditingServico}
            onVincular={setVinculandoServico}
          />
        )
      )}

      {tab === 'categorias' && (
        <ListaCategorias
          categorias={categorias}
          servicos={servicos}
          podeEditar={podeEditar}
          onEdit={setEditingCategoria}
        />
      )}

      {tab === 'orientacoes' && (
        <OrientacoesTab
          servicos={servicos}
          profissionais={profissionais}
          vinculos={vinculos}
        />
      )}

      {/* Modais */}
      {(creatingServico || editingServico) && (
        <ServicoForm
          servico={editingServico}
          categorias={categorias}
          onClose={() => {
            setCreatingServico(false)
            setEditingServico(null)
          }}
        />
      )}

      {(creatingCategoria || editingCategoria) && (
        <CategoriaForm
          categoria={editingCategoria}
          onClose={() => {
            setCreatingCategoria(false)
            setEditingCategoria(null)
          }}
        />
      )}

      {vinculandoServico && (
        <VinculoProfissionais
          servico={vinculandoServico}
          profissionais={profissionais}
          vinculosAtuais={vinculos.filter(v => v.servico_id === vinculandoServico.id)}
          onClose={() => setVinculandoServico(null)}
        />
      )}
    </div>
  )
}
