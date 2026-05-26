'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type {
  ProntuarioDetalhe,
  RegistroTimeline,
  TipoRegistro,
  AlertaCritico,
  Medicamento,
} from '../actions'
import {
  listarTimelineAction,
  salvarAlertasAction,
  toggleAcessoRestritoAction,
  salvarEvolucaoAction,
  salvarPrescricaoAction,
  salvarLaudoAction,
  salvarAtestadoAction,
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
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
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

// ─── Tipos de registro — cores e labels ───────────────────────────────────────

const TIPO_META: Record<TipoRegistro, { label: string; color: string; bg: string; icon: string }> = {
  evolucao:  { label: 'Evolução',   color: '#3B82F6', bg: '#EFF6FF', icon: 'edit_note' },
  prescricao:{ label: 'Prescrição', color: '#8B5CF6', bg: '#F5F3FF', icon: 'medication' },
  laudo:     { label: 'Laudo',      color: '#0EA5E9', bg: '#F0F9FF', icon: 'description' },
  atestado:  { label: 'Atestado',   color: '#10B981', bg: '#ECFDF5', icon: 'verified' },
  anexo:     { label: 'Anexo',      color: '#F59E0B', bg: '#FFFBEB', icon: 'attach_file' },
}

// ─── Tipos de alerta — cores ──────────────────────────────────────────────────

const ALERTA_META: Record<AlertaCritico['tipo'], { label: string; color: string }> = {
  alergia:   { label: 'Alergia',   color: '#EF4444' },
  cirurgia:  { label: 'Cirurgia',  color: '#F97316' },
  patologia: { label: 'Patologia', color: '#8B5CF6' },
}

// ─── Componente principal ─────────────────────────────────────────────────────

type ModalTipo = null | 'evolucao' | 'prescricao' | 'laudo' | 'atestado' | 'alertas'
type FiltroTimeline = 'todos' | TipoRegistro

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
  const [timeline, setTimeline]     = useState<RegistroTimeline[]>(timelineInicial)
  const [filtro, setFiltro]         = useState<FiltroTimeline>('todos')
  const [modal, setModal]           = useState<ModalTipo>(null)
  const [expandido, setExpandido]   = useState<Set<string>>(new Set())
  const [restrito, setRestrito]     = useState(prontuario.acesso_restrito)
  const [alertas, setAlertas]       = useState<AlertaCritico[]>(prontuario.alertas_criticos)
  const [erro, setErro]             = useState<string | null>(null)
  const [salvando, setSalvando]     = useState(false)

  // ── Mudar filtro ──────────────────────────────────────────────────────────
  function handleFiltro(f: FiltroTimeline) {
    setFiltro(f)
    startTransition(async () => {
      const res = await listarTimelineAction(paciente.id, f === 'todos' ? 'todos' : f as TipoRegistro)
      if ('data' in res) setTimeline(res.data)
    })
  }

  // ── Toggle acesso restrito ────────────────────────────────────────────────
  async function handleRestrito() {
    const novo = !restrito
    setRestrito(novo)
    await toggleAcessoRestritoAction(prontuario.id, novo)
  }

  // ── Expand/collapse ───────────────────────────────────────────────────────
  function toggleExpand(id: string) {
    setExpandido(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // ── Recarregar timeline ───────────────────────────────────────────────────
  async function recarregarTimeline() {
    const res = await listarTimelineAction(paciente.id, filtro === 'todos' ? 'todos' : filtro as TipoRegistro)
    if ('data' in res) setTimeline(res.data)
  }

  const filtrosTabs: { key: FiltroTimeline; label: string }[] = [
    { key: 'todos',     label: 'Todos'      },
    { key: 'evolucao',  label: 'Evoluções'  },
    { key: 'prescricao',label: 'Prescrições'},
    { key: 'laudo',     label: 'Laudos'     },
    { key: 'atestado',  label: 'Atestados'  },
    { key: 'anexo',     label: 'Anexos'     },
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
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-white text-lg flex-shrink-0"
              style={{ background: '#3B82F6' }}
            >
              {paciente.foto_url
                ? <img src={paciente.foto_url} alt="" className="w-full h-full rounded-full object-cover" />
                : iniciais(paciente.nome)
              }
            </div>

            {/* Info principal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-lg font-bold text-[#1E293B]">{paciente.nome}</h1>
                {paciente.status !== 'ativo' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-600">
                    Pendente Ativação
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

            {/* Ações direita */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* LGPD toggle */}
              <button
                onClick={handleRestrito}
                title={restrito ? 'Acesso restrito ativo — clique para liberar' : 'Clique para restringir acesso (LGPD)'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  restrito
                    ? 'bg-red-50 border-red-200 text-red-600'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  {restrito ? 'lock' : 'lock_open'}
                </span>
                LGPD
              </button>

              {/* PDF (stub) */}
              <button
                title="Exportar prontuário em PDF"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] transition-all"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>picture_as_pdf</span>
                PDF
              </button>
            </div>
          </div>

          {/* ── Alertas críticos ── */}
          {alertas.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {alertas.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>warning</span>
                  <span className="uppercase text-[10px] tracking-wide opacity-70">{ALERTA_META[a.tipo]?.label}</span>
                  <span>·</span>
                  <span className="font-semibold">{a.descricao}</span>
                </div>
              ))}
              <button
                onClick={() => setModal('alertas')}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] text-[#94A3B8] hover:text-[#64748B] border border-dashed border-[#E2E8F0] hover:border-[#CBD5E1] transition-all"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>edit</span>
                Editar alertas
              </button>
            </div>
          )}
          {alertas.length === 0 && (
            <div className="mt-3">
              <button
                onClick={() => setModal('alertas')}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-xs text-[#94A3B8] hover:text-[#64748B] border border-dashed border-[#E2E8F0] hover:border-[#CBD5E1] transition-all"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add_alert</span>
                Adicionar alerta clínico
              </button>
            </div>
          )}
        </div>

        {/* ── Botões de ação ── */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
          {[
            { tipo: 'evolucao'  as ModalTipo, label: 'Evolução',    icon: 'edit_note'   },
            { tipo: 'prescricao'as ModalTipo, label: 'Prescrição',  icon: 'medication'  },
            { tipo: 'laudo'     as ModalTipo, label: 'Laudo',       icon: 'description' },
            { tipo: 'atestado'  as ModalTipo, label: 'Atestado',    icon: 'verified'    },
            { tipo: null        as ModalTipo, label: 'Copiloto IA', icon: 'auto_awesome', stub: true },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={() => !btn.stub && setModal(btn.tipo)}
              title={btn.stub ? 'Em breve' : undefined}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-semibold transition-all ${
                btn.stub
                  ? 'border-dashed border-[#E2E8F0] text-[#CBD5E1] cursor-default'
                  : 'bg-white border-[#E2E8F0] text-[#334155] shadow-sm hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20, color: btn.stub ? '#CBD5E1' : '#3B82F6' }}
              >
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
                <div
                  key={reg.id}
                  className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpand(reg.id)}
                    className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-[#F8FAFC] transition-colors"
                  >
                    {/* Ponto da timeline */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: meta.bg }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: meta.color }}>
                        {meta.icon}
                      </span>
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                        {reg.profissional_nome && (
                          <span className="text-xs text-[#94A3B8]">{reg.profissional_nome}</span>
                        )}
                        <span className="text-xs text-[#CBD5E1] ml-auto">{formatarDataHora(reg.criado_em)}</span>
                      </div>
                      <p className="text-sm text-[#334155] line-clamp-2">{reg.resumo}</p>
                    </div>

                    {/* Chevron */}
                    <span
                      className="material-symbols-outlined flex-shrink-0 text-[#CBD5E1] transition-transform"
                      style={{ fontSize: 18, transform: aberto ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >
                      chevron_right
                    </span>
                  </button>

                  {/* Detalhe expandido */}
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
      {modal === 'alertas' && (
        <AlertasModal
          prontuarioId={prontuario.id}
          inicial={alertas}
          onClose={() => setModal(null)}
          onSalvar={novos => { setAlertas(novos); setModal(null) }}
        />
      )}
      {modal === 'evolucao' && (
        <EvolucaoModal
          pacienteId={paciente.id}
          onClose={() => setModal(null)}
          onSalvar={async (payload) => {
            setSalvando(true)
            setErro(null)
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
      {modal === 'prescricao' && (
        <PrescricaoModal
          pacienteId={paciente.id}
          onClose={() => setModal(null)}
          onSalvar={async (payload) => {
            setSalvando(true)
            setErro(null)
            const res = await salvarPrescricaoAction(paciente.id, payload)
            setSalvando(false)
            if ('error' in res) { setErro(res.error); return }
            setModal(null)
            await recarregarTimeline()
          }}
          salvando={salvando}
          erro={erro}
        />
      )}
      {modal === 'laudo' && (
        <LaudoModal
          pacienteId={paciente.id}
          onClose={() => setModal(null)}
          onSalvar={async (payload) => {
            setSalvando(true)
            setErro(null)
            const res = await salvarLaudoAction(paciente.id, payload)
            setSalvando(false)
            if ('error' in res) { setErro(res.error); return }
            setModal(null)
            await recarregarTimeline()
          }}
          salvando={salvando}
          erro={erro}
        />
      )}
      {modal === 'atestado' && (
        <AtestadoModal
          pacienteId={paciente.id}
          onClose={() => setModal(null)}
          onSalvar={async (payload) => {
            setSalvando(true)
            setErro(null)
            const res = await salvarAtestadoAction(paciente.id, payload)
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

// ─── Detalhe expandido de cada tipo ───────────────────────────────────────────

function DetalheRegistro({ reg }: { reg: RegistroTimeline }) {
  const d = reg.dados

  if (reg.tipo === 'evolucao') {
    return (
      <div className="mt-3 text-sm text-[#334155] whitespace-pre-line leading-relaxed">
        {String(d.conteudo ?? '')}
      </div>
    )
  }

  if (reg.tipo === 'prescricao') {
    const meds = (d.medicamentos as Medicamento[]) ?? []
    return (
      <div className="mt-3 space-y-2">
        <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide">Medicamentos</p>
        {meds.map((m, i) => (
          <div key={i} className="bg-[#F8FAFC] rounded-lg px-3 py-2 text-sm">
            <span className="font-semibold text-[#1E293B]">{m.nome}</span>
            {m.dosagem    && <span className="text-[#64748B]"> · {m.dosagem}</span>}
            {m.posologia  && <span className="text-[#64748B]"> — {m.posologia}</span>}
            {m.quantidade && <span className="text-[#94A3B8]"> ({m.quantidade})</span>}
            {m.observacao && <p className="text-xs text-[#94A3B8] mt-0.5">{m.observacao}</p>}
          </div>
        ))}
        {Boolean(d.observacoes) && (
          <p className="text-xs text-[#64748B] mt-2">{String(d.observacoes)}</p>
        )}
        {Boolean(d.cid10) && <p className="text-xs text-[#94A3B8]">CID-10: {String(d.cid10)}</p>}
      </div>
    )
  }

  if (reg.tipo === 'laudo') {
    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm font-semibold text-[#1E293B]">{String(d.titulo ?? 'Laudo Técnico')}</p>
        <p className="text-sm text-[#334155] whitespace-pre-line leading-relaxed">{String(d.conteudo ?? '')}</p>
        {Boolean(d.cid10) && <p className="text-xs text-[#94A3B8]">CID-10: {String(d.cid10)}</p>}
      </div>
    )
  }

  if (reg.tipo === 'atestado') {
    const tipoLabel: Record<string, string> = {
      afastamento:   'Atestado de Afastamento',
      comparecimento:'Atestado de Comparecimento',
      acompanhamento:'Atestado de Acompanhamento',
    }
    return (
      <div className="mt-3 space-y-1.5">
        <p className="text-sm font-semibold text-[#1E293B]">{tipoLabel[String(d.tipo)] ?? String(d.tipo)}</p>
        {Boolean(d.dias) && <p className="text-sm text-[#334155]">Período: {String(d.dias)} dia(s)</p>}
        {Boolean(d.cid10) && <p className="text-xs text-[#94A3B8]">CID-10: {String(d.cid10)}</p>}
        {Boolean(d.observacoes) && <p className="text-sm text-[#64748B]">{String(d.observacoes)}</p>}
      </div>
    )
  }

  if (reg.tipo === 'anexo') {
    const url  = String(d.url ?? '')
    const nome = String(d.nome ?? 'Anexo')
    const mime = String(d.tipo_mime ?? '')
    const isImg = mime.startsWith('image/')

    return (
      <div className="mt-3">
        {isImg ? (
          <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={nome} className="max-h-48 rounded-lg border border-[#E2E8F0] object-cover" />
          </a>
        ) : (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#3B82F6] hover:bg-[#EFF6FF] transition-colors w-fit"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>attach_file</span>
            {nome}
          </a>
        )}
      </div>
    )
  }

  return null
}

// ─── Backdrop comum ───────────────────────────────────────────────────────────

function Backdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)' }}
      onClick={onClose}
    >
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
    <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
      {msg}
    </div>
  )
}

// ─── Modal de Alertas ─────────────────────────────────────────────────────────

function AlertasModal({
  prontuarioId, inicial, onClose, onSalvar,
}: {
  prontuarioId: string
  inicial:      AlertaCritico[]
  onClose:      () => void
  onSalvar:     (alertas: AlertaCritico[]) => void
}) {
  const [alertas, setAlertas] = useState<AlertaCritico[]>(inicial)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]       = useState<string | null>(null)

  function addAlerta() {
    setAlertas(prev => [...prev, { tipo: 'alergia', descricao: '' }])
  }

  function updateAlerta(i: number, field: keyof AlertaCritico, val: string) {
    setAlertas(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: val } : a))
  }

  function removeAlerta(i: number) {
    setAlertas(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSalvar() {
    setSalvando(true)
    setErro(null)
    const res = await salvarAlertasAction(prontuarioId, alertas)
    setSalvando(false)
    if ('error' in res) { setErro(res.error); return }
    onSalvar(alertas)
  }

  return (
    <Backdrop onClose={onClose}>
      <ModalBox title="Alertas Clínicos" onClose={onClose}>
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {alertas.map((a, i) => (
            <div key={i} className="flex gap-2 items-start">
              <select
                value={a.tipo}
                onChange={e => updateAlerta(i, 'tipo', e.target.value)}
                className="text-sm border border-[#E2E8F0] rounded-lg px-2 py-2 bg-white text-[#334155] flex-shrink-0"
              >
                <option value="alergia">Alergia</option>
                <option value="cirurgia">Cirurgia</option>
                <option value="patologia">Patologia</option>
              </select>
              <input
                value={a.descricao}
                onChange={e => updateAlerta(i, 'descricao', e.target.value)}
                placeholder="Descrição do alerta..."
                className="flex-1 text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:border-[#3B82F6] text-[#334155]"
              />
              <button onClick={() => removeAlerta(i)} className="text-[#94A3B8] hover:text-red-400 pt-2">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addAlerta}
          className="mt-3 flex items-center gap-1 text-sm text-[#3B82F6] hover:text-blue-700 font-medium"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
          Adicionar alerta
        </button>

        {erro && <ErroBanner msg={erro} />}

        <div className="flex gap-2 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9] transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: '#3B82F6' }}
          >
            {salvando ? 'Salvando…' : 'Salvar Alertas'}
          </button>
        </div>
      </ModalBox>
    </Backdrop>
  )
}

// ─── Modal de Evolução ────────────────────────────────────────────────────────

function EvolucaoModal({
  pacienteId, onClose, onSalvar, salvando, erro,
}: {
  pacienteId: string
  onClose:    () => void
  onSalvar:   (payload: { conteudo: string }) => void
  salvando:   boolean
  erro:       string | null
}) {
  const [conteudo, setConteudo] = useState('')

  return (
    <Backdrop onClose={onClose}>
      <ModalBox title="Nova Evolução Clínica" onClose={onClose}>
        <textarea
          value={conteudo}
          onChange={e => setConteudo(e.target.value)}
          placeholder="Descreva a evolução clínica do paciente, queixas, condutas adotadas, resposta ao tratamento..."
          className="w-full h-40 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#3B82F6] text-[#334155] resize-none"
        />
        {erro && <ErroBanner msg={erro} />}
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9] transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onSalvar({ conteudo })}
            disabled={salvando || !conteudo.trim()}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: '#3B82F6' }}
          >
            {salvando ? 'Salvando…' : 'Salvar Evolução'}
          </button>
        </div>
      </ModalBox>
    </Backdrop>
  )
}

// ─── Modal de Prescrição ──────────────────────────────────────────────────────

function PrescricaoModal({
  pacienteId, onClose, onSalvar, salvando, erro,
}: {
  pacienteId: string
  onClose:    () => void
  onSalvar:   (payload: { tipo: 'simples'|'especial'|'antibiotico'; medicamentos: Medicamento[]; observacoes?: string; cid10?: string }) => void
  salvando:   boolean
  erro:       string | null
}) {
  const [tipo, setTipo]       = useState<'simples'|'especial'|'antibiotico'>('simples')
  const [meds, setMeds]       = useState<Medicamento[]>([{ nome: '', dosagem: '', posologia: '', quantidade: '', observacao: '' }])
  const [obs, setObs]         = useState('')
  const [cid10, setCid10]     = useState('')

  function updateMed(i: number, field: keyof Medicamento, val: string) {
    setMeds(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: val } : m))
  }

  function addMed() {
    setMeds(prev => [...prev, { nome: '', dosagem: '', posologia: '', quantidade: '', observacao: '' }])
  }

  function removeMed(i: number) {
    setMeds(prev => prev.filter((_, idx) => idx !== i))
  }

  const valido = meds.some(m => m.nome.trim())

  return (
    <Backdrop onClose={onClose}>
      <ModalBox title="Nova Prescrição Médica" onClose={onClose}>
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {/* Tipo */}
          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1.5">Tipo de Receita</label>
            <div className="flex gap-2">
              {(['simples','especial','antibiotico'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    tipo === t ? 'bg-[#3B82F6] text-white border-[#3B82F6]' : 'border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
                  }`}
                >
                  {t === 'simples' ? 'Simples' : t === 'especial' ? 'Especial' : 'Antibiótico'}
                </button>
              ))}
            </div>
          </div>

          {/* Medicamentos */}
          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-2">Medicamentos</label>
            <div className="space-y-3">
              {meds.map((m, i) => (
                <div key={i} className="bg-[#F8FAFC] rounded-xl p-3 space-y-2">
                  <div className="flex gap-2">
                    <input value={m.nome} onChange={e => updateMed(i, 'nome', e.target.value)}
                      placeholder="Nome do medicamento *"
                      className="flex-1 text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:border-[#3B82F6] bg-white" />
                    {meds.length > 1 && (
                      <button onClick={() => removeMed(i)} className="text-[#94A3B8] hover:text-red-400">
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={m.dosagem} onChange={e => updateMed(i, 'dosagem', e.target.value)}
                      placeholder="Dosagem (ex: 500mg)"
                      className="text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:border-[#3B82F6] bg-white" />
                    <input value={m.posologia} onChange={e => updateMed(i, 'posologia', e.target.value)}
                      placeholder="Posologia (ex: 8/8h)"
                      className="text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:border-[#3B82F6] bg-white" />
                  </div>
                  <input value={m.quantidade} onChange={e => updateMed(i, 'quantidade', e.target.value)}
                    placeholder="Quantidade (ex: 30 comprimidos)"
                    className="w-full text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:border-[#3B82F6] bg-white" />
                </div>
              ))}
            </div>
            <button onClick={addMed} className="mt-2 flex items-center gap-1 text-sm text-[#3B82F6] hover:text-blue-700 font-medium">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              Adicionar medicamento
            </button>
          </div>

          {/* CID-10 e Observações */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1.5">CID-10</label>
              <input value={cid10} onChange={e => setCid10(e.target.value)}
                placeholder="Ex: M54.5"
                className="w-full text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:border-[#3B82F6]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1.5">Observações</label>
              <input value={obs} onChange={e => setObs(e.target.value)}
                placeholder="Observações gerais"
                className="w-full text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:border-[#3B82F6]" />
            </div>
          </div>
        </div>

        {erro && <ErroBanner msg={erro} />}
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9] transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onSalvar({ tipo, medicamentos: meds, observacoes: obs, cid10 })}
            disabled={salvando || !valido}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: '#8B5CF6' }}
          >
            {salvando ? 'Salvando…' : 'Salvar Prescrição'}
          </button>
        </div>
      </ModalBox>
    </Backdrop>
  )
}

// ─── Modal de Laudo ───────────────────────────────────────────────────────────

function LaudoModal({
  pacienteId, onClose, onSalvar, salvando, erro,
}: {
  pacienteId: string
  onClose:    () => void
  onSalvar:   (payload: { titulo: string; conteudo: string; cid10?: string }) => void
  salvando:   boolean
  erro:       string | null
}) {
  const [titulo,   setTitulo]   = useState('Laudo Técnico')
  const [conteudo, setConteudo] = useState('')
  const [cid10,    setCid10]    = useState('')

  return (
    <Backdrop onClose={onClose}>
      <ModalBox title="Novo Laudo Técnico" onClose={onClose}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1.5">Título do Laudo</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)}
              className="w-full text-sm border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#3B82F6]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1.5">Conteúdo do Laudo</label>
            <textarea value={conteudo} onChange={e => setConteudo(e.target.value)}
              placeholder="Descreva o laudo técnico..."
              className="w-full h-40 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#3B82F6] text-[#334155] resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1.5">CID-10</label>
            <input value={cid10} onChange={e => setCid10(e.target.value)}
              placeholder="Ex: M54.5"
              className="w-full text-sm border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#3B82F6]" />
          </div>
        </div>
        {erro && <ErroBanner msg={erro} />}
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9] transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onSalvar({ titulo, conteudo, cid10 })}
            disabled={salvando || !conteudo.trim()}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: '#0EA5E9' }}
          >
            {salvando ? 'Salvando…' : 'Salvar Laudo'}
          </button>
        </div>
      </ModalBox>
    </Backdrop>
  )
}

// ─── Modal de Atestado ────────────────────────────────────────────────────────

function AtestadoModal({
  pacienteId, onClose, onSalvar, salvando, erro,
}: {
  pacienteId: string
  onClose:    () => void
  onSalvar:   (payload: { tipo: 'afastamento'|'comparecimento'|'acompanhamento'; dias?: number; cid10?: string; observacoes?: string }) => void
  salvando:   boolean
  erro:       string | null
}) {
  const [tipo, setTipo]   = useState<'afastamento'|'comparecimento'|'acompanhamento'>('afastamento')
  const [dias, setDias]   = useState('')
  const [cid10, setCid10] = useState('')
  const [obs, setObs]     = useState('')

  return (
    <Backdrop onClose={onClose}>
      <ModalBox title="Novo Atestado Médico" onClose={onClose}>
        <div className="space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1.5">Tipo de Atestado</label>
            <div className="flex gap-2 flex-wrap">
              {(['afastamento','comparecimento','acompanhamento'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    tipo === t ? 'bg-[#10B981] text-white border-[#10B981]' : 'border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
                  }`}
                >
                  {t === 'afastamento' ? 'Afastamento' : t === 'comparecimento' ? 'Comparecimento' : 'Acompanhamento'}
                </button>
              ))}
            </div>
          </div>

          {/* Dias e CID */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1.5">Dias de Afastamento</label>
              <input value={dias} onChange={e => setDias(e.target.value)} type="number" min="1"
                placeholder="Ex: 3"
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#3B82F6]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1.5">CID-10</label>
              <input value={cid10} onChange={e => setCid10(e.target.value)}
                placeholder="Ex: M54.5"
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#3B82F6]" />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1.5">Observações</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)}
              placeholder="Informações complementares do atestado..."
              className="w-full h-24 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#3B82F6] text-[#334155] resize-none" />
          </div>
        </div>
        {erro && <ErroBanner msg={erro} />}
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9] transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onSalvar({ tipo, dias: dias ? Number(dias) : undefined, cid10, observacoes: obs })}
            disabled={salvando}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: '#10B981' }}
          >
            {salvando ? 'Salvando…' : 'Salvar Atestado'}
          </button>
        </div>
      </ModalBox>
    </Backdrop>
  )
}
