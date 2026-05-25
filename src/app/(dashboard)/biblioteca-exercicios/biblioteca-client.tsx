'use client'

import { useState, useMemo, useTransition } from 'react'
import { Plus, Search, Filter, Dumbbell, ListOrdered, FileText, Edit2, Trash2, Copy, Play, X, ChevronDown } from 'lucide-react'
import type { ExercicioBiblioteca, SequenciaBiblioteca, PlanoExercicio } from './actions'
import {
  duplicarExercicioSistemaAction,
  duplicarSequenciaSistemaAction,
  excluirExercicioBibliotecaAction,
  excluirSequenciaBibliotecaAction,
  excluirPlanoExercicioAction,
} from './actions'
import { ExercicioFormModal } from '@/components/biblioteca/exercicio-form-modal'
import { SequenciaFormModal } from '@/components/biblioteca/sequencia-form-modal'
import { PrescricaoModal } from '@/components/biblioteca/prescricao-modal'

interface Props {
  exerciciosIniciais: ExercicioBiblioteca[]
  sequenciasIniciais: SequenciaBiblioteca[]
  planosIniciais: PlanoExercicio[]
  pacientes: { id: string; nome: string }[]
  profissionais: { id: string; nome: string }[]
}

type Aba = 'exercicios' | 'sequencias' | 'planos'

const NIVEIS = ['leve', 'moderado', 'intenso'] as const
const NIVEL_COR: Record<string, { bg: string; text: string }> = {
  leve:     { bg: '#DCFCE7', text: '#16A34A' },
  moderado: { bg: '#FEF9C3', text: '#CA8A04' },
  intenso:  { bg: '#FEE2E2', text: '#DC2626' },
}

function nivelBadge(nivel: string | null) {
  if (!nivel) return null
  const c = NIVEL_COR[nivel] ?? { bg: '#F1F5F9', text: '#64748B' }
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize" style={{ background: c.bg, color: c.text }}>
      {nivel}
    </span>
  )
}

export function BibliotecaClient({ exerciciosIniciais, sequenciasIniciais, planosIniciais, pacientes, profissionais }: Props) {
  const [aba, setAba] = useState<Aba>('exercicios')
  const [exercicios, setExercicios] = useState(exerciciosIniciais)
  const [sequencias, setSequencias] = useState(sequenciasIniciais)
  const [planos, setPlanos] = useState(planosIniciais)

  // Modais
  const [exFormModal, setExFormModal] = useState<{ ex?: ExercicioBiblioteca } | null>(null)
  const [seqModal, setSeqModal] = useState<{ seq?: SequenciaBiblioteca } | null>(null)
  const [planoModal, setPlanoModal] = useState<{ plano?: PlanoExercicio } | null>(null)

  // Video player inline
  const [videoAberto, setVideoAberto] = useState<string | null>(null)

  // Toast
  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'erro' } | null>(null)
  const [, startT] = useTransition()

  function showToast(msg: string, tipo: 'ok' | 'erro' = 'ok') {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Filtros exercícios ────────────────────────────────────────────────────
  const [busca, setBusca] = useState('')
  const [filtNivel, setFiltNivel] = useState('')
  const [filtRegiao, setFiltRegiao] = useState('')
  const [filtAparelho, setFiltAparelho] = useState('')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  const regioes = useMemo(() => [...new Set(exercicios.map(e => e.regiao_corporal).filter(Boolean))].sort() as string[], [exercicios])
  const aparelhos = useMemo(() => [...new Set(exercicios.map(e => e.aparelho).filter(Boolean))].sort() as string[], [exercicios])

  const exerciciosFiltrados = useMemo(() => {
    let list = exercicios
    if (busca) {
      const t = busca.toLowerCase()
      list = list.filter(e =>
        e.nome.toLowerCase().includes(t) ||
        (e.grupo_muscular ?? '').toLowerCase().includes(t) ||
        (e.objetivo ?? '').toLowerCase().includes(t) ||
        (e.regiao_corporal ?? '').toLowerCase().includes(t)
      )
    }
    if (filtNivel) list = list.filter(e => e.nivel === filtNivel)
    if (filtRegiao) list = list.filter(e => e.regiao_corporal === filtRegiao)
    if (filtAparelho) list = list.filter(e => e.aparelho === filtAparelho)
    // Sistema primeiro, depois próprios
    return list.sort((a, b) => {
      if (a.is_sistema && !b.is_sistema) return -1
      if (!a.is_sistema && b.is_sistema) return 1
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })
  }, [exercicios, busca, filtNivel, filtRegiao, filtAparelho])

  // ── Busca sequências ──────────────────────────────────────────────────────
  const [buscaSeq, setBuscaSeq] = useState('')
  const sequenciasFiltradas = useMemo(() => {
    if (!buscaSeq) return sequencias
    const t = buscaSeq.toLowerCase()
    return sequencias.filter(s => s.nome.toLowerCase().includes(t) || (s.descricao ?? '').toLowerCase().includes(t))
  }, [sequencias, buscaSeq])

  // ── Ações ─────────────────────────────────────────────────────────────────

  async function duplicarExercicio(ex: ExercicioBiblioteca) {
    startT(async () => {
      const r = await duplicarExercicioSistemaAction(ex.id)
      if ('error' in r) { showToast(r.error, 'erro'); return }
      // Abre modal de edição do novo exercício duplicado
      showToast(`"${ex.nome}" duplicado — edite para personalizar.`)
      // Recarrega a lista
      const { listarExerciciosBibliotecaAction: refresh } = await import('./actions')
      const res = await refresh()
      if ('exercicios' in res) { setExercicios(res.exercicios); setExFormModal({ ex: res.exercicios.find(e => e.id === r.id) }) }
    })
  }

  async function excluirExercicio(ex: ExercicioBiblioteca) {
    if (!confirm(`Excluir "${ex.nome}"?`)) return
    startT(async () => {
      const r = await excluirExercicioBibliotecaAction(ex.id)
      if ('error' in r) { showToast(r.error, 'erro'); return }
      setExercicios(prev => prev.filter(e => e.id !== ex.id))
      showToast('Exercício excluído.')
    })
  }

  async function excluirSequencia(seq: SequenciaBiblioteca) {
    if (!confirm(`Excluir sequência "${seq.nome}"?`)) return
    startT(async () => {
      const r = await excluirSequenciaBibliotecaAction(seq.id)
      if ('error' in r) { showToast(r.error, 'erro'); return }
      setSequencias(prev => prev.filter(s => s.id !== seq.id))
      showToast('Sequência excluída.')
    })
  }

  async function duplicarSequencia(seq: SequenciaBiblioteca) {
    startT(async () => {
      const r = await duplicarSequenciaSistemaAction(seq.id)
      if ('error' in r) { showToast(r.error, 'erro'); return }
      showToast(`"${seq.nome}" duplicada — edite para personalizar.`)
      await recarregarSequencias()
    })
  }

  async function excluirPlano(plano: PlanoExercicio) {
    if (!confirm(`Excluir plano "${plano.nome}"?`)) return
    startT(async () => {
      const r = await excluirPlanoExercicioAction(plano.id)
      if ('error' in r) { showToast(r.error, 'erro'); return }
      setPlanos(prev => prev.filter(p => p.id !== plano.id))
      showToast('Plano excluído.')
    })
  }

  async function recarregarExercicios() {
    const { listarExerciciosBibliotecaAction: refresh } = await import('./actions')
    const res = await refresh()
    if ('exercicios' in res) setExercicios(res.exercicios)
  }

  async function recarregarSequencias() {
    const { listarSequenciasBibliotecaAction: refresh } = await import('./actions')
    const res = await refresh()
    if ('sequencias' in res) setSequencias(res.sequencias)
  }

  async function recarregarPlanos() {
    const { listarPlanosExerciciosAction: refresh } = await import('./actions')
    const res = await refresh()
    if ('planos' in res) setPlanos(res.planos)
  }

  const ABAS: { id: Aba; label: string; icon: typeof Dumbbell; count: number }[] = [
    { id: 'exercicios', label: 'Exercícios', icon: Dumbbell, count: exercicios.length },
    { id: 'sequencias', label: 'Sequências', icon: ListOrdered, count: sequencias.length },
    { id: 'planos',     label: 'Planos de Tratamento', icon: FileText, count: planos.length },
  ]

  return (
    <div className="h-full flex flex-col space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-bold text-[#2C3E50] text-lg">Biblioteca de Exercícios</h1>
          <p className="text-xs text-[#7F8C8D] mt-0.5">Gerencie exercícios, sequências de aula e planos de tratamento</p>
        </div>
        {aba === 'exercicios' && (
          <button
            onClick={() => setExFormModal({})}
            className="flex items-center gap-2 bg-[#4A3AE8] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#3829c7] shadow-md transition-colors"
          >
            <Plus size={16} /> Novo Exercício
          </button>
        )}
        {aba === 'sequencias' && (
          <button
            onClick={() => setSeqModal({})}
            className="flex items-center gap-2 bg-[#4A3AE8] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#3829c7] shadow-md transition-colors"
          >
            <Plus size={16} /> Nova Sequência
          </button>
        )}
        {aba === 'planos' && (
          <button
            onClick={() => setPlanoModal({})}
            className="flex items-center gap-2 bg-[#4A3AE8] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#3829c7] shadow-md transition-colors"
          >
            <Plus size={16} /> Nova Prescrição
          </button>
        )}
      </div>

      {/* Abas */}
      <div className="flex items-center gap-1 flex-shrink-0 bg-white border border-[#E8E8E8] rounded-xl p-1 w-fit">
        {ABAS.map(a => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              aba === a.id
                ? 'bg-[#4A3AE8] text-white shadow-sm'
                : 'text-[#7F8C8D] hover:text-[#2C3E50] hover:bg-[#F8F9FA]'
            }`}
          >
            <a.icon size={15} />
            {a.label}
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${aba === a.id ? 'bg-white/20 text-white' : 'bg-[#F0F0F0] text-[#7F8C8D]'}`}>
              {a.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Aba Exercícios ─────────────────────────────────────────────────────── */}
      {aba === 'exercicios' && (
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          {/* Filtros */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar exercício…"
                className="w-full pl-9 pr-3 py-2 border border-[#E8E8E8] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A3AE8]/30"
              />
            </div>

            <button
              onClick={() => setMostrarFiltros(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition-colors ${mostrarFiltros ? 'border-[#4A3AE8] bg-[#4A3AE8]/5 text-[#4A3AE8]' : 'border-[#E8E8E8] text-[#7F8C8D] hover:border-[#4A3AE8]/50'}`}
            >
              <Filter size={14} />
              Filtros
              {(filtNivel || filtRegiao || filtAparelho) && (
                <span className="w-4 h-4 bg-[#4A3AE8] text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                  {[filtNivel, filtRegiao, filtAparelho].filter(Boolean).length}
                </span>
              )}
            </button>

            {(filtNivel || filtRegiao || filtAparelho) && (
              <button onClick={() => { setFiltNivel(''); setFiltRegiao(''); setFiltAparelho('') }} className="text-xs text-[#7F8C8D] hover:text-red-600 transition-colors">
                Limpar filtros
              </button>
            )}

            <span className="text-xs text-[#7F8C8D] ml-auto">
              {exerciciosFiltrados.length} exercício{exerciciosFiltrados.length !== 1 ? 's' : ''}
            </span>
          </div>

          {mostrarFiltros && (
            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              <FilterSelect label="Nível" value={filtNivel} onChange={setFiltNivel} options={NIVEIS.map(n => ({ value: n, label: n }))} />
              <FilterSelect label="Região" value={filtRegiao} onChange={setFiltRegiao} options={regioes.map(r => ({ value: r, label: r }))} />
              <FilterSelect label="Aparelho" value={filtAparelho} onChange={setFiltAparelho} options={aparelhos.map(a => ({ value: a, label: a }))} />
            </div>
          )}

          {/* Grid de cards */}
          <div className="flex-1 overflow-auto">
            {exerciciosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#7F8C8D]">
                <Dumbbell size={40} className="mb-3 opacity-30" />
                <p className="text-sm">Nenhum exercício encontrado.</p>
                {(busca || filtNivel || filtRegiao || filtAparelho) && (
                  <button onClick={() => { setBusca(''); setFiltNivel(''); setFiltRegiao(''); setFiltAparelho('') }} className="mt-2 text-xs text-[#4A3AE8] hover:underline">
                    Limpar filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {exerciciosFiltrados.map(ex => (
                  <ExercicioCard
                    key={ex.id}
                    ex={ex}
                    videoAberto={videoAberto === ex.id}
                    onVideoToggle={() => setVideoAberto(v => v === ex.id ? null : ex.id)}
                    onEditar={() => setExFormModal({ ex })}
                    onDuplicar={() => duplicarExercicio(ex)}
                    onExcluir={() => excluirExercicio(ex)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Aba Sequências ─────────────────────────────────────────────────────── */}
      {aba === 'sequencias' && (
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          <div className="relative flex-shrink-0 w-full max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
            <input
              value={buscaSeq}
              onChange={e => setBuscaSeq(e.target.value)}
              placeholder="Buscar sequência…"
              className="w-full pl-9 pr-3 py-2 border border-[#E8E8E8] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A3AE8]/30"
            />
          </div>

          <div className="flex-1 overflow-auto space-y-2">
            {sequenciasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#7F8C8D]">
                <ListOrdered size={40} className="mb-3 opacity-30" />
                <p className="text-sm">Nenhuma sequência cadastrada.</p>
              </div>
            ) : (
              sequenciasFiltradas.map(seq => (
                <SequenciaRow
                  key={seq.id}
                  seq={seq}
                  onEditar={() => setSeqModal({ seq })}
                  onExcluir={() => excluirSequencia(seq)}
                  onDuplicar={() => duplicarSequencia(seq)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Aba Planos ─────────────────────────────────────────────────────────── */}
      {aba === 'planos' && (
        <div className="flex-1 min-h-0 overflow-auto space-y-2">
          {planos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#7F8C8D]">
              <FileText size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Nenhum plano de tratamento cadastrado.</p>
            </div>
          ) : (
            planos.map(plano => (
              <PlanoRow
                key={plano.id}
                plano={plano}
                onEditar={() => setPlanoModal({ plano })}
                onExcluir={() => excluirPlano(plano)}
              />
            ))
          )}
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.tipo === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ── Modais ────────────────────────────────────────────────────────────── */}
      {exFormModal !== null && (
        <ExercicioFormModal
          exercicio={exFormModal.ex}
          onClose={() => setExFormModal(null)}
          onSalvo={async () => { setExFormModal(null); await recarregarExercicios(); showToast('Exercício salvo!') }}
        />
      )}

      {seqModal !== null && (
        <SequenciaFormModal
          sequencia={seqModal.seq}
          exercicios={exercicios}
          onClose={() => setSeqModal(null)}
          onSalvo={async () => { setSeqModal(null); await recarregarSequencias(); showToast('Sequência salva!') }}
        />
      )}

      {planoModal !== null && (
        <PrescricaoModal
          plano={planoModal.plano}
          exercicios={exercicios}
          pacientes={pacientes}
          profissionais={profissionais}
          onClose={() => setPlanoModal(null)}
          onSalvo={async () => { setPlanoModal(null); await recarregarPlanos(); showToast('Plano salvo!') }}
        />
      )}
    </div>
  )
}

// ─── FilterSelect ─────────────────────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`appearance-none pl-3 pr-8 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A3AE8]/30 transition-colors ${
          value ? 'border-[#4A3AE8] bg-[#4A3AE8]/5 text-[#4A3AE8] font-medium' : 'border-[#E8E8E8] text-[#7F8C8D]'
        }`}
      >
        <option value="">{label}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#7F8C8D]" />
    </div>
  )
}

// ─── Paleta de cores por grupo muscular ──────────────────────────────────────

const GRUPO_COR: Record<string, { from: string; to: string; text: string }> = {
  'Core':            { from: '#4A3AE8', to: '#7B6FF0', text: '#4A3AE8' },
  'Coluna':          { from: '#0EA5E9', to: '#38BDF8', text: '#0EA5E9' },
  'MMII':            { from: '#10B981', to: '#34D399', text: '#059669' },
  'Glúteo':          { from: '#F59E0B', to: '#FCD34D', text: '#D97706' },
  'Quadril':         { from: '#F59E0B', to: '#FCD34D', text: '#D97706' },
  'Ombro':           { from: '#EF4444', to: '#F87171', text: '#DC2626' },
  'Manguito':        { from: '#EF4444', to: '#F87171', text: '#DC2626' },
  'Diafragma':       { from: '#8B5CF6', to: '#A78BFA', text: '#7C3AED' },
  'Pulmão':          { from: '#8B5CF6', to: '#A78BFA', text: '#7C3AED' },
  'Isquiotibiais':   { from: '#06B6D4', to: '#67E8F9', text: '#0891B2' },
  'Bíceps':          { from: '#F97316', to: '#FDBA74', text: '#EA580C' },
  'Tríceps':         { from: '#F97316', to: '#FDBA74', text: '#EA580C' },
  'Peitoral':        { from: '#EC4899', to: '#F9A8D4', text: '#DB2777' },
  'Trapézio':        { from: '#64748B', to: '#94A3B8', text: '#475569' },
  'Tornozelo':       { from: '#14B8A6', to: '#5EEAD4', text: '#0D9488' },
}

function getGrupoCor(grupo: string | null) {
  if (!grupo) return { from: '#4A3AE8', to: '#7B6FF0', text: '#4A3AE8' }
  const key = Object.keys(GRUPO_COR).find(k => grupo.includes(k))
  return key ? GRUPO_COR[key] : { from: '#4A3AE8', to: '#7B6FF0', text: '#4A3AE8' }
}

// ─── ExercicioCard ────────────────────────────────────────────────────────────

function ExercicioCard({
  ex,
  videoAberto,
  onVideoToggle,
  onEditar,
  onDuplicar,
  onExcluir,
}: {
  ex: ExercicioBiblioteca
  videoAberto: boolean
  onVideoToggle: () => void
  onEditar: () => void
  onDuplicar: () => void
  onExcluir: () => void
}) {
  const initials = ex.nome.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const cor = getGrupoCor(ex.grupo_muscular)

  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">

      {/* ── Área de mídia (thumbnail OU vídeo — nunca os dois) ── */}
      <div className="relative flex-shrink-0" style={{ height: 160 }}>

        {videoAberto && ex.video_url ? (
          /* Vídeo substitui o thumbnail */
          <VideoPlayer url={ex.video_url} height={160} />
        ) : ex.imagem_url ? (
          <img src={ex.imagem_url} alt={ex.nome} className="w-full h-full object-cover" />
        ) : (
          /* Placeholder com gradiente colorido */
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-1"
            style={{ background: `linear-gradient(135deg, ${cor.from}18, ${cor.to}30)` }}
          >
            <span
              className="text-4xl font-black tracking-tight select-none"
              style={{ color: `${cor.from}55` }}
            >
              {initials}
            </span>
            {ex.aparelho && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: `${cor.from}20`, color: cor.text }}>
                {ex.aparelho}
              </span>
            )}
          </div>
        )}

        {/* Badge SISTEMA / MINHA CLÍNICA */}
        <div className="absolute top-2.5 left-2.5">
          <span className={`text-[9px] font-bold tracking-wide px-2 py-0.5 rounded-full shadow-sm ${
            ex.is_sistema ? 'bg-[#4A3AE8] text-white' : 'bg-emerald-500 text-white'
          }`}>
            {ex.is_sistema ? 'SISTEMA' : 'MINHA CLÍNICA'}
          </span>
        </div>

        {/* Botão play/fechar */}
        {ex.video_url && (
          <button
            onClick={onVideoToggle}
            className={`absolute bottom-2.5 right-2.5 flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-md transition-all ${
              videoAberto
                ? 'bg-white text-[#2C3E50] hover:bg-gray-100'
                : 'bg-black/70 text-white hover:bg-black/90 backdrop-blur-sm'
            }`}
          >
            {videoAberto ? <><X size={11} /> Fechar</> : <><Play size={11} fill="white" /> Assistir</>}
          </button>
        )}
      </div>

      {/* ── Conteúdo ── */}
      <div className="p-3.5 flex flex-col gap-2 flex-1">

        {/* Nome + metadados */}
        <div>
          <p className="font-bold text-[#1A2332] text-sm leading-snug line-clamp-1">{ex.nome}</p>
          <p className="text-[11px] text-[#7F8C8D] mt-0.5 line-clamp-1">
            {[ex.grupo_muscular, ex.regiao_corporal].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Badges nível + séries */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {nivelBadge(ex.nivel)}
          {ex.series_padrao && (
            <span className="text-[10px] font-medium text-[#7F8C8D] bg-[#F1F5F9] px-2 py-0.5 rounded-full">
              {ex.series_padrao} séries · {ex.repeticoes_padrao ?? '—'}
            </span>
          )}
        </div>

        {/* Objetivo */}
        {ex.objetivo && (
          <p className="text-[11px] text-[#64748B] line-clamp-2 leading-relaxed">{ex.objetivo}</p>
        )}

        {/* Ações */}
        <div className="flex items-center gap-1.5 mt-auto pt-2.5 border-t border-[#F1F5F9]">
          {ex.is_sistema ? (
            <button
              onClick={onDuplicar}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-[#4A3AE8]/10 text-[#4A3AE8] hover:bg-[#4A3AE8]/20 transition-colors"
            >
              <Copy size={11} /> Duplicar para editar
            </button>
          ) : (
            <>
              <button
                onClick={onEditar}
                className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-[#F8F9FA] text-[#2C3E50] hover:bg-[#E8ECF0] transition-colors"
              >
                <Edit2 size={11} /> Editar
              </button>
              <button
                onClick={onExcluir}
                className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── VideoPlayer ──────────────────────────────────────────────────────────────

function VideoPlayer({ url, height = 200 }: { url: string; height?: number }) {
  const isYoutube = url.includes('youtu')
  const isVimeo = url.includes('vimeo')

  const style: React.CSSProperties = { height, width: '100%', border: 'none', display: 'block' }

  if (isYoutube) {
    const id = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1]
    if (!id) return <video src={url} controls className="w-full" style={{ height }} />
    return (
      <iframe
        src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`}
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
        style={style}
      />
    )
  }

  if (isVimeo) {
    const id = url.match(/vimeo\.com\/(\d+)/)?.[1]
    if (!id) return <video src={url} controls className="w-full" style={{ height }} />
    return (
      <iframe
        src={`https://player.vimeo.com/video/${id}?autoplay=1`}
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
        style={style}
      />
    )
  }

  return <video src={url} controls className="w-full" style={{ height }} />
}

// ─── SequenciaRow ─────────────────────────────────────────────────────────────

function SequenciaRow({ seq, onEditar, onExcluir, onDuplicar }: {
  seq: SequenciaBiblioteca
  onEditar: () => void
  onExcluir: () => void
  onDuplicar: () => void
}) {
  const [expandido, setExpandido] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-[#E8E8E8] shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${seq.is_sistema ? 'bg-[#4A3AE8]' : 'bg-[#4A3AE8]/10'}`}>
          <ListOrdered size={17} className={seq.is_sistema ? 'text-white' : 'text-[#4A3AE8]'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-[#2C3E50] text-sm truncate">{seq.nome}</p>
            {seq.is_sistema && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#4A3AE8] text-white flex-shrink-0">SISTEMA</span>
            )}
          </div>
          <p className="text-xs text-[#7F8C8D]">
            {seq.exercicios.length} exercício{seq.exercicios.length !== 1 ? 's' : ''}
            {seq.descricao && ` · ${seq.descricao}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setExpandido(v => !v)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7F8C8D] hover:bg-[#F8F9FA] transition-colors">
            <ChevronDown size={15} className={`transition-transform ${expandido ? 'rotate-180' : ''}`} />
          </button>
          {seq.is_sistema ? (
            <button onClick={onDuplicar} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-[#4A3AE8]/10 text-[#4A3AE8] hover:bg-[#4A3AE8]/20 transition-colors font-medium">
              <Copy size={11} /> Duplicar
            </button>
          ) : (
            <>
              <button onClick={onEditar} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7F8C8D] hover:bg-[#F8F9FA] transition-colors">
                <Edit2 size={14} />
              </button>
              <button onClick={onExcluir} className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {expandido && seq.exercicios.length > 0 && (
        <div className="border-t border-[#F0F0F0] px-4 py-3 space-y-1.5 bg-[#FAFAFA]">
          {seq.exercicios.map((ex, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-[#2C3E50]">
              <span className="w-5 h-5 rounded-full bg-[#4A3AE8]/10 text-[#4A3AE8] font-bold flex items-center justify-center text-[10px] flex-shrink-0">{i + 1}</span>
              <span className="font-medium">{ex.nome_exercicio}</span>
              {(ex.series || ex.repeticoes) && (
                <span className="text-[#7F8C8D]">{ex.series ? `${ex.series}x` : ''}{ex.repeticoes ?? ''}{ex.carga ? ` · ${ex.carga}` : ''}</span>
              )}
              {ex.obs && <span className="text-[#7F8C8D] italic truncate">{ex.obs}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── PlanoRow ─────────────────────────────────────────────────────────────────

function PlanoRow({ plano, onEditar, onExcluir }: {
  plano: PlanoExercicio
  onEditar: () => void
  onExcluir: () => void
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E8E8E8] shadow-sm p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
        <FileText size={17} className="text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#2C3E50] text-sm">{plano.nome}</p>
        <p className="text-xs text-[#7F8C8D]">
          {plano.paciente_nome}
          {plano.frequencia ? ` · ${plano.frequencia}` : ''}
          {' · '}
          {plano.exercicios.length} exercício{plano.exercicios.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${plano.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-[#F0F0F0] text-[#7F8C8D]'}`}>
            {plano.ativo ? 'Ativo' : 'Inativo'}
          </span>
          <span className="text-[10px] text-[#7F8C8D]">
            desde {new Date(plano.data_inicio).toLocaleDateString('pt-BR')}
            {plano.data_fim ? ` até ${new Date(plano.data_fim).toLocaleDateString('pt-BR')}` : ''}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onEditar} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7F8C8D] hover:bg-[#F8F9FA] transition-colors">
          <Edit2 size={14} />
        </button>
        <button onClick={onExcluir} className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
