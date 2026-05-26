'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type {
  ProntuarioDetalhe,
  RegistroTimeline,
  TipoRegistro,
} from '../actions'
import {
  listarTimelineAction,
  salvarProntuarioAction,
  salvarEvolucaoAction,
  salvarPlanoAction,
} from '../actions'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcularIdade(dataNasc: string | null): string {
  if (!dataNasc) return '—'
  const nasc = new Date(dataNasc)
  const hoje = new Date()
  let age = hoje.getFullYear() - nasc.getFullYear()
  if (
    hoje.getMonth() < nasc.getMonth() ||
    (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())
  ) age--
  return `${age} anos`
}

function formatarData(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatarDataHora(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatarTelefone(tel: string | null): string {
  if (!tel) return ''
  const d = tel.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return tel
}

function iniciais(nome: string) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

// ─── Metadados visuais por tipo ───────────────────────────────────────────────

const TIPO_META: Record<TipoRegistro, { label: string; color: string; bg: string; icon: string }> = {
  evolucao: { label: 'Evolução',          color: '#3B82F6', bg: '#EFF6FF', icon: 'edit_note'    },
  plano:    { label: 'Plano Tratamento',  color: '#8B5CF6', bg: '#F5F3FF', icon: 'medical_services' },
}

type ModalTipo = null | 'evolucao' | 'plano' | 'prontuario'
type FiltroTimeline = 'todos' | TipoRegistro

// ─── Componente principal ─────────────────────────────────────────────────────

export function ProntuarioClient({
  detalhe,
  timelineInicial,
}: {
  detalhe:         ProntuarioDetalhe
  timelineInicial: RegistroTimeline[]
}) {
  const router   = useRouter()
  const [isPending, startTransition] = useTransition()

  const { paciente, prontuario } = detalhe
  const [timeline, setTimeline]   = useState<RegistroTimeline[]>(timelineInicial)
  const [filtro, setFiltro]       = useState<FiltroTimeline>('todos')
  const [modal, setModal]         = useState<ModalTipo>(null)
  const [expandido, setExpandido] = useState<Set<string>>(new Set())
  const [salvando, setSalvando]   = useState(false)
  const [erro, setErro]           = useState<string | null>(null)

  function handleFiltro(f: FiltroTimeline) {
    setFiltro(f)
    startTransition(async () => {
      const res = await listarTimelineAction(paciente.id, f === 'todos' ? 'todos' : f as TipoRegistro)
      if ('data' in res) setTimeline(res.data)
    })
  }

  function toggleExpand(id: string) {
    setExpandido(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function recarregarTimeline() {
    const res = await listarTimelineAction(paciente.id, filtro === 'todos' ? 'todos' : filtro as TipoRegistro)
    if ('data' in res) setTimeline(res.data)
  }

  function abrirModal(m: ModalTipo) {
    setErro(null)
    setModal(m)
  }

  const filtrosTabs: { key: FiltroTimeline; label: string }[] = [
    { key: 'todos',    label: 'Todos'             },
    { key: 'evolucao', label: 'Evoluções'         },
    { key: 'plano',    label: 'Planos de Tratamento' },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#EDEFF3' }}>
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <button onClick={() => router.push('/prontuarios')} className="text-[#64748B] hover:text-[#1E293B] transition-colors">
            Prontuários
          </button>
          <span className="text-[#CBD5E1]">/</span>
          <span className="text-[#1E293B] font-medium truncate">{paciente.nome}</span>
        </div>

        {/* ── Header do Paciente ── */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm px-6 py-5 mb-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-white text-lg flex-shrink-0"
              style={{ background: '#3B82F6' }}>
              {paciente.foto_url
                ? <img src={paciente.foto_url} alt="" className="w-full h-full rounded-full object-cover" />
                : iniciais(paciente.nome)
              }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-lg font-bold text-[#1E293B]">{paciente.nome}</h1>
                {paciente.status !== 'ativo' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-600">
                    {paciente.status === 'inativo' ? 'Inativo' : 'Alta'}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748B]">
                {paciente.data_nascimento && (
                  <span>{formatarData(paciente.data_nascimento)} · {calcularIdade(paciente.data_nascimento)}</span>
                )}
                {paciente.cpf && <span>CPF {paciente.cpf}</span>}
                {paciente.telefone && <span>{formatarTelefone(paciente.telefone)}</span>}
              </div>
              {(paciente.convenio || paciente.email) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#94A3B8] mt-1">
                  {paciente.convenio && <span>Convênio: {paciente.convenio}{paciente.numero_convenio ? ` · ${paciente.numero_convenio}` : ''}</span>}
                  {paciente.email && <span>{paciente.email}</span>}
                </div>
              )}
            </div>

            {/* Editar prontuário base */}
            <button
              onClick={() => abrirModal('prontuario')}
              title="Editar dados clínicos base"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] transition-all flex-shrink-0"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
              Dados Clínicos
            </button>
          </div>

          {/* Chips de dados clínicos base */}
          {(prontuario.alergias || prontuario.medicamentos) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {prontuario.alergias && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>warning</span>
                  <span className="uppercase text-[10px] tracking-wide opacity-70">Alergia</span>
                  <span>·</span>
                  <span>{prontuario.alergias}</span>
                </div>
              )}
              {prontuario.medicamentos && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>medication</span>
                  <span className="uppercase text-[10px] tracking-wide opacity-70">Medicamentos</span>
                  <span>·</span>
                  <span className="truncate max-w-[200px]">{prontuario.medicamentos}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Botões de ação ── */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { tipo: 'evolucao' as ModalTipo, label: 'Nova Evolução',          icon: 'edit_note',         color: '#3B82F6' },
            { tipo: 'plano'    as ModalTipo, label: 'Plano de Tratamento',    icon: 'medical_services',  color: '#8B5CF6' },
            { tipo: null       as ModalTipo, label: 'Copiloto IA',            icon: 'auto_awesome',      color: '#CBD5E1', stub: true },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={() => !btn.stub && abrirModal(btn.tipo)}
              title={btn.stub ? 'Em breve' : undefined}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-semibold transition-all ${
                btn.stub
                  ? 'border-dashed border-[#E2E8F0] text-[#CBD5E1] cursor-default'
                  : 'bg-white border-[#E2E8F0] text-[#334155] shadow-sm hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: btn.color }}>
                {btn.icon}
              </span>
              {btn.label}
            </button>
          ))}
        </div>

        {/* ── Filtros da timeline ── */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {filtrosTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleFiltro(tab.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filtro === tab.key
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Timeline ── */}
        {isPending && (
          <div className="text-center py-8 text-sm text-[#94A3B8]">Carregando...</div>
        )}

        {!isPending && timeline.length === 0 && (
          <div className="text-center py-16 text-[#94A3B8]">
            <span className="material-symbols-outlined block mb-2 opacity-30" style={{ fontSize: 40 }}>timeline</span>
            <p className="text-sm font-medium">Nenhum registro encontrado</p>
            <p className="text-xs mt-1">Use os botões acima para adicionar o primeiro registro.</p>
          </div>
        )}

        {!isPending && (
          <div className="space-y-2">
            {timeline.map(reg => {
              const meta   = TIPO_META[reg.tipo]
              const aberto = expandido.has(reg.id)

              return (
                <div key={reg.id} className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleExpand(reg.id)}
                    className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: meta.bg }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: meta.color }}>
                        {meta.icon}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                          style={{ background: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                        {reg.profissional_nome && (
                          <span className="text-xs text-[#94A3B8]">{reg.profissional_nome}</span>
                        )}
                        <span className="text-xs text-[#CBD5E1] ml-auto">{formatarDataHora(reg.criado_em)}</span>
                      </div>
                      <p className="text-sm text-[#334155] line-clamp-2">{reg.resumo}</p>
                    </div>

                    <span className="material-symbols-outlined flex-shrink-0 text-[#CBD5E1] transition-transform"
                      style={{ fontSize: 18, transform: aberto ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                      chevron_right
                    </span>
                  </button>

                  {aberto && (
                    <div className="px-5 pb-4 pt-0 border-t border-[#F1F5F9]">
                      <DetalheRegistro reg={reg} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modais ── */}
      {modal === 'prontuario' && (
        <ProntuarioBaseModal
          prontuario={prontuario}
          onClose={() => setModal(null)}
          onSalvar={async (payload) => {
            setSalvando(true); setErro(null)
            const res = await salvarProntuarioAction(prontuario.id, payload)
            setSalvando(false)
            if ('error' in res) { setErro(res.error); return }
            setModal(null)
            // Recarrega a página para atualizar os chips
            window.location.reload()
          }}
          salvando={salvando}
          erro={erro}
        />
      )}

      {modal === 'evolucao' && (
        <EvolucaoModal
          onClose={() => setModal(null)}
          onSalvar={async (payload) => {
            setSalvando(true); setErro(null)
            const res = await salvarEvolucaoAction(paciente.id, payload)
            setSalvando(false)
            if ('error' in res) { setErro(res.error); return }
            setModal(null)
            await recarregarTimeline()
          }}
          salvando={salvando}
          erro={erro}
        />
      )}

      {modal === 'plano' && (
        <PlanoModal
          onClose={() => setModal(null)}
          onSalvar={async (payload) => {
            setSalvando(true); setErro(null)
            const res = await salvarPlanoAction(paciente.id, payload)
            setSalvando(false)
            if ('error' in res) { setErro(res.error); return }
            setModal(null)
            await recarregarTimeline()
          }}
          salvando={salvando}
          erro={erro}
        />
      )}
    </div>
  )
}

// ─── Detalhe expandido ────────────────────────────────────────────────────────

function DetalheRegistro({ reg }: { reg: RegistroTimeline }) {
  const d = reg.dados

  if (reg.tipo === 'evolucao') {
    return (
      <div className="mt-3 text-sm text-[#334155] whitespace-pre-line leading-relaxed">
        {String(d.conteudo ?? '')}
      </div>
    )
  }

  if (reg.tipo === 'plano') {
    const statusLabel: Record<string, string> = {
      ativo: 'Ativo', reavaliacao: 'Em Reavaliação', alta: 'Alta', encerrado: 'Encerrado',
    }
    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm text-[#334155]">{String(d.diagnostico_clinico ?? '')}</p>
        <div className="flex flex-wrap gap-3 text-xs text-[#64748B]">
          {Boolean(d.cid10) && <span>CID-10: {String(d.cid10)}</span>}
          {Boolean(d.sessoes_previstas) && <span>Sessões previstas: {String(d.sessoes_previstas)}</span>}
          {Boolean(d.sessoes_realizadas) && <span>Realizadas: {String(d.sessoes_realizadas)}</span>}
          {Boolean(d.data_inicio) && <span>Início: {new Date(String(d.data_inicio)).toLocaleDateString('pt-BR')}</span>}
          {Boolean(d.status) && (
            <span className={`px-2 py-0.5 rounded-full font-semibold ${
              d.status === 'ativo' ? 'bg-green-100 text-green-700' :
              d.status === 'alta'  ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {statusLabel[String(d.status)] ?? String(d.status)}
            </span>
          )}
        </div>
      </div>
    )
  }

  return null
}

// ─── Componentes de suporte ───────────────────────────────────────────────────

function Backdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-lg">
        {children}
      </div>
    </div>
  )
}

function ModalBox({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9]">
        <h2 className="font-bold text-[#1E293B]">{title}</h2>
        <button onClick={onClose} className="text-[#94A3B8] hover:text-[#64748B]">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function ErroBanner({ msg }: { msg: string }) {
  return (
    <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">{msg}</div>
  )
}

// ─── Modal Prontuário Base ────────────────────────────────────────────────────

function ProntuarioBaseModal({
  prontuario, onClose, onSalvar, salvando, erro,
}: {
  prontuario: ProntuarioDetalhe['prontuario']
  onClose:    () => void
  onSalvar:   (p: { alergias?: string; antecedentes?: string; medicamentos?: string }) => void
  salvando:   boolean
  erro:       string | null
}) {
  const [alergias,     setAlergias]     = useState(prontuario.alergias     ?? '')
  const [antecedentes, setAntecedentes] = useState(prontuario.antecedentes ?? '')
  const [medicamentos, setMedicamentos] = useState(prontuario.medicamentos ?? '')

  return (
    <Backdrop onClose={onClose}>
      <ModalBox title="Dados Clínicos Base" onClose={onClose}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1.5">Alergias</label>
            <input value={alergias} onChange={e => setAlergias(e.target.value)}
              placeholder="Ex: Dipirona, látex..."
              className="w-full text-sm border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#3B82F6]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1.5">Medicamentos em uso</label>
            <textarea value={medicamentos} onChange={e => setMedicamentos(e.target.value)}
              placeholder="Liste os medicamentos em uso contínuo..."
              className="w-full h-20 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#3B82F6] resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1.5">Antecedentes / Histórico</label>
            <textarea value={antecedentes} onChange={e => setAntecedentes(e.target.value)}
              placeholder="Cirurgias anteriores, patologias, histórico familiar relevante..."
              className="w-full h-24 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#3B82F6] resize-none" />
          </div>
        </div>
        {erro && <ErroBanner msg={erro} />}
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9] transition-colors">
            Cancelar
          </button>
          <button onClick={() => onSalvar({ alergias, antecedentes, medicamentos })}
            disabled={salvando}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: '#3B82F6' }}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </ModalBox>
    </Backdrop>
  )
}

// ─── Modal de Evolução ────────────────────────────────────────────────────────

function EvolucaoModal({
  onClose, onSalvar, salvando, erro,
}: {
  onClose:  () => void
  onSalvar: (payload: { conteudo: string }) => void
  salvando: boolean
  erro:     string | null
}) {
  const [conteudo, setConteudo] = useState('')

  return (
    <Backdrop onClose={onClose}>
      <ModalBox title="Nova Evolução Clínica" onClose={onClose}>
        <textarea value={conteudo} onChange={e => setConteudo(e.target.value)}
          placeholder="Descreva a evolução clínica, queixas, condutas adotadas, resposta ao tratamento..."
          className="w-full h-40 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#3B82F6] text-[#334155] resize-none" />
        {erro && <ErroBanner msg={erro} />}
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9] transition-colors">
            Cancelar
          </button>
          <button onClick={() => onSalvar({ conteudo })}
            disabled={salvando || !conteudo.trim()}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: '#3B82F6' }}>
            {salvando ? 'Salvando…' : 'Salvar Evolução'}
          </button>
        </div>
      </ModalBox>
    </Backdrop>
  )
}

// ─── Modal de Plano de Tratamento ─────────────────────────────────────────────

function PlanoModal({
  onClose, onSalvar, salvando, erro,
}: {
  onClose:  () => void
  onSalvar: (payload: { diagnostico_clinico: string; cid10?: string; sessoes_previstas?: number; data_inicio?: string; observacoes?: string }) => void
  salvando: boolean
  erro:     string | null
}) {
  const [diag,    setDiag]    = useState('')
  const [cid10,   setCid10]   = useState('')
  const [sessoes, setSessoes] = useState('')
  const [inicio,  setInicio]  = useState(new Date().toISOString().slice(0, 10))
  const [obs,     setObs]     = useState('')

  return (
    <Backdrop onClose={onClose}>
      <ModalBox title="Novo Plano de Tratamento" onClose={onClose}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1.5">Diagnóstico Clínico *</label>
            <textarea value={diag} onChange={e => setDiag(e.target.value)}
              placeholder="Descreva o diagnóstico e conduta clínica planejada..."
              className="w-full h-28 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#3B82F6] resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1.5">CID-10</label>
              <input value={cid10} onChange={e => setCid10(e.target.value)}
                placeholder="Ex: M54.5"
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2.5 outline-none focus:border-[#3B82F6]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1.5">Sessões previstas</label>
              <input value={sessoes} onChange={e => setSessoes(e.target.value)} type="number" min="1"
                placeholder="Ex: 12"
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2.5 outline-none focus:border-[#3B82F6]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1.5">Data início</label>
              <input value={inicio} onChange={e => setInicio(e.target.value)} type="date"
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2.5 outline-none focus:border-[#3B82F6]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1.5">Observações</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)}
              placeholder="Metas, observações complementares..."
              className="w-full h-20 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#3B82F6] resize-none" />
          </div>
        </div>
        {erro && <ErroBanner msg={erro} />}
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9] transition-colors">
            Cancelar
          </button>
          <button onClick={() => onSalvar({ diagnostico_clinico: diag, cid10, sessoes_previstas: sessoes ? Number(sessoes) : undefined, data_inicio: inicio, observacoes: obs })}
            disabled={salvando || !diag.trim()}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: '#8B5CF6' }}>
            {salvando ? 'Salvando…' : 'Salvar Plano'}
          </button>
        </div>
      </ModalBox>
    </Backdrop>
  )
}
