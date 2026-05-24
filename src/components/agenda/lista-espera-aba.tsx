'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Plus, X, Clock, Pencil, Trash2, Bell, BellOff, Calendar,
  User, Stethoscope, Search, CheckCircle2, XCircle, AlertCircle, ChevronDown,
} from 'lucide-react'
import {
  criarEntradaListaEsperaAction,
  editarEntradaListaEsperaAction,
  excluirEntradaListaEsperaAction,
  mudarStatusListaEsperaAction,
  type EntradaListaEspera,
} from '@/app/(dashboard)/agenda/lista-espera-actions'
import type { Paciente, Profissional, Servico, Vinculo } from '@/app/(dashboard)/agenda/agenda-page-client'

interface Props {
  entradas: EntradaListaEspera[]
  pacientes: Paciente[]
  profissionais: Profissional[]
  servicos: Servico[]
  vinculos: Vinculo[]
}

// ── Helpers ──────────────────────────────────────────────────────
function fmtData(s: string) {
  const [a, m, d] = s.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDataCurta(s: string) {
  const [a, m, d] = s.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const STATUS_META = {
  aguardando: { label: 'Aguardando',  cor: '#E67E22', bg: '#E67E2215' },
  notificado: { label: 'Notificado',  cor: '#3498DB', bg: '#3498DB15' },
  agendado:   { label: 'Agendado',    cor: '#27AE60', bg: '#27AE6015' },
  cancelado:  { label: 'Cancelado',   cor: '#E74C3C', bg: '#E74C3C15' },
}

// ═══════════════════════════════════════════════════════════════
// Componente principal
// ═══════════════════════════════════════════════════════════════
export function ListaEsperaAba({ entradas, pacientes, profissionais, servicos, vinculos }: Props) {
  const [modal, setModal]     = useState<{ tipo: 'novo' | 'editar'; entrada?: EntradaListaEspera } | null>(null)
  const [busca, setBusca]     = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const aguardando = useMemo(() => {
    const q = busca.toLowerCase()
    return entradas.filter(e => e.status === 'aguardando' &&
      (!q || e.paciente_nome.toLowerCase().includes(q) || (e.servico_nome ?? '').toLowerCase().includes(q)))
  }, [entradas, busca])

  const historico = useMemo(() => {
    const q = busca.toLowerCase()
    return entradas.filter(e => e.status !== 'aguardando' &&
      (!q || e.paciente_nome.toLowerCase().includes(q)))
  }, [entradas, busca])

  async function excluir(id: string) {
    if (!confirm('Remover esta entrada da lista de espera?')) return
    setLoading(id)
    await excluirEntradaListaEsperaAction(id)
    setLoading(null)
    window.location.reload()
  }

  async function cancelar(id: string) {
    if (!confirm('Cancelar esta entrada?')) return
    setLoading(id)
    await mudarStatusListaEsperaAction(id, 'cancelado')
    setLoading(null)
    window.location.reload()
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-3 flex items-center gap-2 flex-1 min-w-[260px] shadow-sm">
          <Search size={14} className="text-[#7F8C8D] flex-shrink-0" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por paciente ou serviço…"
            className="flex-1 text-sm bg-transparent outline-none text-[#2C3E50] placeholder:text-[#BDC3C7]"
          />
          {busca && <button onClick={() => setBusca('')}><X size={14} className="text-[#7F8C8D]" /></button>}
        </div>

        <button
          onClick={() => setModal({ tipo: 'novo' })}
          className="flex items-center gap-2 bg-[#E67E22] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#ca6f1e] shadow-md flex-shrink-0"
        >
          <Plus size={16} />
          Adicionar à Fila
        </button>
      </div>

      {/* ── Seção: Aguardando Vaga ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-[#E67E22] animate-pulse" />
          <h3 className="text-sm font-bold text-[#2C3E50]">
            Aguardando Vaga
            <span className="ml-2 text-xs font-semibold text-[#E67E22] bg-[#E67E22]/10 px-2 py-0.5 rounded-full">
              {aguardando.length}
            </span>
          </h3>
        </div>

        {aguardando.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8E8E8] p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#E67E22]/10 flex items-center justify-center mx-auto mb-3">
              <Clock size={22} className="text-[#E67E22]" />
            </div>
            <p className="text-sm font-semibold text-[#2C3E50] mb-1">Fila vazia</p>
            <p className="text-xs text-[#7F8C8D] max-w-xs mx-auto">
              {busca
                ? 'Nenhum paciente aguardando corresponde à busca.'
                : 'Nenhum paciente aguardando vaga. Clique em "Adicionar à Fila" para cadastrar.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {aguardando.map(e => (
              <EntradaCard
                key={e.id}
                entrada={e}
                loading={loading === e.id}
                onEditar={() => setModal({ tipo: 'editar', entrada: e })}
                onCancelar={() => cancelar(e.id)}
                onExcluir={() => excluir(e.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Seção: Histórico ── */}
      {historico.length > 0 && (
        <section className="opacity-75">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-bold text-[#7F8C8D] uppercase tracking-wider">Histórico Recente</h3>
          </div>
          <div className="space-y-1.5">
            {historico.map(e => (
              <EntradaCard
                key={e.id}
                entrada={e}
                loading={loading === e.id}
                historico
                onExcluir={() => excluir(e.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Modal ── */}
      {modal && (
        <ListaEsperaForm
          entrada={modal.tipo === 'editar' ? modal.entrada ?? null : null}
          pacientes={pacientes}
          profissionais={profissionais}
          servicos={servicos}
          vinculos={vinculos}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Card de uma entrada
// ═══════════════════════════════════════════════════════════════
function EntradaCard({
  entrada: e, loading, historico = false,
  onEditar, onCancelar, onExcluir,
}: {
  entrada: EntradaListaEspera
  loading: boolean
  historico?: boolean
  onEditar?: () => void
  onCancelar?: () => void
  onExcluir?: () => void
}) {
  const meta = STATUS_META[e.status]

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-2xl px-4 py-3 flex items-start gap-3 shadow-sm">
      {/* Indicador de status */}
      <div className="mt-0.5 flex-shrink-0">
        {e.status === 'aguardando'
          ? <div className="w-3 h-3 rounded-full bg-[#E67E22] animate-pulse mt-1" />
          : e.status === 'agendado'
            ? <CheckCircle2 size={16} className="text-[#27AE60]" />
            : e.status === 'cancelado'
              ? <XCircle size={16} className="text-[#E74C3C]" />
              : <AlertCircle size={16} className="text-[#3498DB]" />
        }
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-sm font-bold text-[#2C3E50]">{e.paciente_nome}</p>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: meta.cor, background: meta.bg }}
          >
            {meta.label}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[#7F8C8D]">
            {e.notificar_automaticamente
              ? <><Bell size={10} className="text-[#3498DB]" /> Auto</>
              : <><BellOff size={10} /> Manual</>
            }
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#7F8C8D] flex-wrap mb-1">
          {e.servico_nome && (
            <span className="flex items-center gap-1">
              <Stethoscope size={11} />
              {e.servico_nome}
            </span>
          )}
          {e.profissional_nome && (
            <span className="flex items-center gap-1">
              <User size={11} />
              {e.profissional_nome}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-[#7F8C8D]">
          <Calendar size={11} />
          <span>
            {fmtDataCurta(e.data_inicio)}
            {e.data_inicio !== e.data_fim && <> → {fmtDataCurta(e.data_fim)}</>}
          </span>
          {(e.hora_inicio || e.hora_fim) && (
            <>
              <span className="text-[#BDC3C7]">·</span>
              <Clock size={11} />
              <span>
                {e.hora_inicio && e.hora_fim
                  ? `${e.hora_inicio} – ${e.hora_fim}`
                  : e.hora_inicio
                    ? `a partir das ${e.hora_inicio}`
                    : `até ${e.hora_fim}`
                }
              </span>
            </>
          )}
        </div>

        {e.observacoes && (
          <p className="text-[11px] text-[#7F8C8D] italic mt-1 truncate">{e.observacoes}</p>
        )}
      </div>

      {/* Ações */}
      {!historico && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {onEditar && (
            <button onClick={onEditar} disabled={loading}
              className="p-1.5 rounded-lg text-[#4A3AE8] hover:bg-[#4A3AE8]/10 disabled:opacity-40">
              <Pencil size={14} />
            </button>
          )}
          {onCancelar && (
            <button onClick={onCancelar} disabled={loading}
              className="p-1.5 rounded-lg text-[#E67E22] hover:bg-[#E67E22]/10 disabled:opacity-40"
              title="Cancelar entrada">
              <XCircle size={14} />
            </button>
          )}
          {onExcluir && (
            <button onClick={onExcluir} disabled={loading}
              className="p-1.5 rounded-lg text-[#E74C3C] hover:bg-[#E74C3C]/10 disabled:opacity-40">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
      {historico && onExcluir && (
        <button onClick={onExcluir} disabled={loading}
          className="p-1.5 rounded-lg text-[#BDC3C7] hover:text-[#E74C3C] hover:bg-[#E74C3C]/10 flex-shrink-0 disabled:opacity-40">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Combobox de paciente com filtro inteligente
// ═══════════════════════════════════════════════════════════════
function PacienteCombobox({
  pacientes, value, onChange,
}: {
  pacientes: Paciente[]
  value: string
  onChange: (id: string) => void
}) {
  const [aberto, setAberto]   = useState(false)
  const [filtro, setFiltro]   = useState('')
  const ref                   = useRef<HTMLDivElement>(null)
  const inputRef              = useRef<HTMLInputElement>(null)

  const selecionado = pacientes.find(p => p.id === value)

  const lista = useMemo(() => {
    if (!filtro) return pacientes
    const q = filtro.toLowerCase()
    return pacientes.filter(p =>
      p.nome.toLowerCase().includes(q) ||
      (p.telefone ?? '').includes(q) ||
      (p.cpf ?? '').includes(q)
    )
  }, [pacientes, filtro])

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function selecionar(p: Paciente) {
    onChange(p.id)
    setFiltro('')
    setAberto(false)
  }

  function abrir() {
    setAberto(true)
    setFiltro('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={aberto ? () => setAberto(false) : abrir}
        className={`w-full h-10 px-3 rounded-lg border text-sm text-left flex items-center justify-between gap-2 outline-none transition-colors ${
          aberto ? 'border-[#E67E22] bg-white' : 'border-[#E8E8E8] bg-white hover:border-[#E67E22]/50'
        }`}
      >
        <span className={selecionado ? 'text-[#2C3E50] font-medium' : 'text-[#BDC3C7]'}>
          {selecionado ? selecionado.nome : 'Buscar paciente…'}
        </span>
        <ChevronDown size={14} className={`text-[#7F8C8D] flex-shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {aberto && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-[#E8E8E8] rounded-xl shadow-xl overflow-hidden">
          {/* Campo de busca */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#F0F0F0]">
            <Search size={13} className="text-[#7F8C8D] flex-shrink-0" />
            <input
              ref={inputRef}
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              placeholder="Nome, telefone ou CPF…"
              className="flex-1 text-sm outline-none text-[#2C3E50] placeholder:text-[#BDC3C7]"
            />
            {filtro && (
              <button type="button" onClick={() => setFiltro('')}>
                <X size={13} className="text-[#BDC3C7] hover:text-[#7F8C8D]" />
              </button>
            )}
          </div>

          {/* Lista */}
          <ul className="max-h-52 overflow-y-auto py-1">
            {lista.length === 0 ? (
              <li className="px-4 py-3 text-xs text-[#7F8C8D] text-center">Nenhum paciente encontrado</li>
            ) : lista.map(p => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => selecionar(p)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#F8F9FA] transition-colors ${
                    p.id === value ? 'bg-[#E67E22]/8 text-[#E67E22] font-semibold' : 'text-[#2C3E50]'
                  }`}
                >
                  <span className="font-medium">{p.nome}</span>
                  {p.telefone && (
                    <span className="ml-2 text-[11px] text-[#7F8C8D]">{p.telefone}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Prévia da faixa de verificação
// ═══════════════════════════════════════════════════════════════
function FaixaVerificacao({
  dataInicio, dataFim, horaInicio, horaFim,
}: {
  dataInicio: string
  dataFim: string
  horaInicio: string
  horaFim: string
}) {
  if (!dataInicio || !dataFim) return null

  const mesmoDia = dataInicio === dataFim

  return (
    <div className="flex items-start gap-2.5 bg-[#F0F4FF] border border-[#4A3AE8]/20 rounded-xl px-4 py-3">
      <Calendar size={15} className="text-[#4A3AE8] flex-shrink-0 mt-0.5" />
      <p className="text-xs text-[#4A3AE8] leading-relaxed">
        <span className="font-semibold block mb-0.5">Faixa de Verificação</span>
        Serão notificadas vagas que surgirem{' '}
        {mesmoDia ? (
          <>em <strong>{fmtData(dataInicio)}</strong></>
        ) : (
          <>entre <strong>{fmtData(dataInicio)}</strong> e <strong>{fmtData(dataFim)}</strong></>
        )}
        {horaInicio && horaFim ? (
          <>, dentro do horário das <strong>{horaInicio} às {horaFim}</strong>.</>
        ) : horaInicio ? (
          <>, a partir das <strong>{horaInicio}</strong>.</>
        ) : horaFim ? (
          <>, até as <strong>{horaFim}</strong>.</>
        ) : (
          <>, em qualquer horário.</>
        )}
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Toggle switch — estrutura correta para Tailwind peer
// ═══════════════════════════════════════════════════════════════
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors flex-shrink-0 ${
        checked ? 'bg-[#3498DB]' : 'bg-[#E8E8E8]'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Form Modal — criar ou editar entrada
// ═══════════════════════════════════════════════════════════════
function ListaEsperaForm({
  entrada, pacientes, profissionais, servicos, vinculos, onClose,
}: {
  entrada: EntradaListaEspera | null
  pacientes: Paciente[]
  profissionais: Profissional[]
  servicos: Servico[]
  vinculos: Vinculo[]
  onClose: () => void
}) {
  const hoje = new Date().toISOString().slice(0, 10)

  const [pacienteId,  setPacienteId]  = useState(entrada?.paciente_id ?? '')
  const [servicoId,   setServicoId]   = useState(entrada?.servico_id ?? '')
  const [profId,      setProfId]      = useState(entrada?.profissional_id ?? '')
  const [dataInicio,  setDataInicio]  = useState(entrada?.data_inicio ?? hoje)
  const [dataFim,     setDataFim]     = useState(entrada?.data_fim ?? hoje)
  const [horaInicio,  setHoraInicio]  = useState(entrada?.hora_inicio ?? '')
  const [horaFim,     setHoraFim]     = useState(entrada?.hora_fim ?? '')
  const [observacoes, setObservacoes] = useState(entrada?.observacoes ?? '')
  // Padrão: notificação automática ativada
  const [notifAuto,   setNotifAuto]   = useState(entrada?.notificar_automaticamente ?? true)
  const [loading,     setLoading]     = useState(false)
  const [err,         setErr]         = useState<string | null>(null)

  // ── Filtro cruzado serviço ↔ profissional via vínculos ──────
  const profsFiltrados = useMemo(() => {
    if (!servicoId) return profissionais
    const ids = vinculos.filter(v => v.servico_id === servicoId).map(v => v.profissional_id)
    return profissionais.filter(p => ids.includes(p.id))
  }, [servicoId, profissionais, vinculos])

  const servicosFiltrados = useMemo(() => {
    if (!profId) return servicos
    const ids = vinculos.filter(v => v.profissional_id === profId).map(v => v.servico_id)
    return servicos.filter(s => ids.includes(s.id))
  }, [profId, servicos, vinculos])

  // Ao mudar serviço, limpa o profissional se ele não for compatível
  function handleServicoChange(id: string) {
    setServicoId(id)
    if (id && profId) {
      const ids = vinculos.filter(v => v.servico_id === id).map(v => v.profissional_id)
      if (!ids.includes(profId)) setProfId('')
    }
  }

  // Ao mudar profissional, limpa o serviço se não for compatível
  function handleProfChange(id: string) {
    setProfId(id)
    if (id && servicoId) {
      const ids = vinculos.filter(v => v.profissional_id === id).map(v => v.servico_id)
      if (!ids.includes(servicoId)) setServicoId('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pacienteId && !entrada) { setErr('Selecione um paciente.'); return }
    setLoading(true); setErr(null)

    const payload = {
      servico_id:               servicoId || null,
      profissional_id:          profId    || null,
      data_inicio:              dataInicio,
      data_fim:                 dataFim,
      hora_inicio:              horaInicio || null,
      hora_fim:                 horaFim    || null,
      observacoes:              observacoes.trim() || null,
      notificar_automaticamente: notifAuto,
    }

    const r = entrada
      ? await editarEntradaListaEsperaAction(entrada.id, payload)
      : await criarEntradaListaEsperaAction({ paciente_id: pacienteId, ...payload })

    setLoading(false)
    if ('error' in r) { setErr(r.error); return }
    onClose()
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg my-8">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E67E22]/10 flex items-center justify-center">
              <Clock size={16} className="text-[#E67E22]" />
            </div>
            <h2 className="font-bold text-[#2C3E50] text-lg">
              {entrada ? 'Editar Entrada' : 'Adicionar à Lista de Espera'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#F8F9FA] text-[#7F8C8D]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Paciente */}
          {!entrada ? (
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Paciente *</label>
              <PacienteCombobox
                pacientes={pacientes}
                value={pacienteId}
                onChange={setPacienteId}
              />
            </div>
          ) : (
            <div className="bg-[#F8F9FA] rounded-xl px-3 py-2.5 flex items-center gap-2">
              <User size={14} className="text-[#E67E22]" />
              <span className="text-sm font-semibold text-[#2C3E50]">{entrada.paciente_nome}</span>
            </div>
          )}

          {/* Serviço + Profissional com filtro cruzado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">
                Serviço
                {profId && servicosFiltrados.length < servicos.length && (
                  <span className="ml-1 text-[#E67E22] font-normal">· filtrado</span>
                )}
              </label>
              <select
                value={servicoId}
                onChange={e => handleServicoChange(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#E67E22] bg-white"
              >
                <option value="">Qualquer serviço</option>
                {servicosFiltrados.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">
                Profissional
                {servicoId && profsFiltrados.length < profissionais.length && (
                  <span className="ml-1 text-[#E67E22] font-normal">· filtrado</span>
                )}
              </label>
              <select
                value={profId}
                onChange={e => handleProfChange(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#E67E22] bg-white"
              >
                <option value="">Qualquer profissional</option>
                {profsFiltrados.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Período */}
          <div>
            <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Período de interesse *</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-[#BDC3C7] mb-1">De</p>
                <input
                  type="date"
                  required
                  value={dataInicio}
                  min={hoje}
                  onChange={e => {
                    setDataInicio(e.target.value)
                    if (e.target.value > dataFim) setDataFim(e.target.value)
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#E67E22]"
                />
              </div>
              <div>
                <p className="text-[10px] text-[#BDC3C7] mb-1">Até</p>
                <input
                  type="date"
                  required
                  value={dataFim}
                  min={dataInicio}
                  onChange={e => setDataFim(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#E67E22]"
                />
              </div>
            </div>
          </div>

          {/* Faixa de horário */}
          <div>
            <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">
              Faixa de horário preferida{' '}
              <span className="font-normal">(deixe em branco = qualquer hora)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-[#BDC3C7] mb-1">Das</p>
                <input
                  type="time"
                  value={horaInicio}
                  onChange={e => setHoraInicio(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#E67E22] text-[#2C3E50]"
                />
              </div>
              <div>
                <p className="text-[10px] text-[#BDC3C7] mb-1">Às</p>
                <input
                  type="time"
                  value={horaFim}
                  onChange={e => setHoraFim(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#E67E22] text-[#2C3E50]"
                />
              </div>
            </div>
          </div>

          {/* Faixa de verificação — preview dinâmico */}
          <FaixaVerificacao
            dataInicio={dataInicio}
            dataFim={dataFim}
            horaInicio={horaInicio}
            horaFim={horaFim}
          />

          {/* Observações */}
          <div>
            <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Observações</label>
            <textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              rows={2}
              placeholder="Requisitos especiais, preferências…"
              className="w-full px-3 py-2 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#E67E22] resize-none"
            />
          </div>

          {/* Notificação automática */}
          <div
            onClick={() => setNotifAuto(v => !v)}
            className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-colors ${
              notifAuto ? 'border-[#3498DB]/40 bg-[#3498DB]/5' : 'border-[#E8E8E8] hover:border-[#E8E8E8]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${notifAuto ? 'bg-[#3498DB]/10' : 'bg-[#F8F9FA]'}`}>
                {notifAuto
                  ? <Bell size={16} className="text-[#3498DB]" />
                  : <BellOff size={16} className="text-[#7F8C8D]" />
                }
              </div>
              <div>
                <p className="text-sm font-semibold text-[#2C3E50]">
                  {notifAuto ? 'Notificação automática via WhatsApp' : 'Notificação manual pela recepção'}
                </p>
                <p className="text-xs text-[#7F8C8D]">
                  {notifAuto
                    ? 'O sistema avisa o paciente ao surgir uma vaga compatível.'
                    : 'A recepção será avisada e fará o contato manualmente.'}
                </p>
              </div>
            </div>
            <Toggle checked={notifAuto} onChange={setNotifAuto} />
          </div>

          {err && (
            <div className="text-xs text-[#E74C3C] bg-[#E74C3C]/10 border border-[#E74C3C]/30 rounded-lg px-3 py-2">
              {err}
            </div>
          )}

          {/* Rodapé */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E8E8E8]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-sm font-medium text-[#7F8C8D] hover:bg-[#F8F9FA]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#E67E22] text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#ca6f1e] disabled:opacity-50 shadow-md"
            >
              {loading ? 'Salvando…' : entrada ? 'Salvar' : 'Adicionar à Fila'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
