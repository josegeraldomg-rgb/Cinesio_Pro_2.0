'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ProntuarioDetalhe, RegistroTimeline, TipoRegistro, ProfissionalItem } from '../actions'
import {
  listarTimelineAction,
  salvarProntuarioAction,
  salvarEvolucaoAction,
  salvarDocumentoAction,
  salvarPlanoAction,
  restringirAcessoAction,
  removerRestricaoAction,
} from '../actions'
import {
  gerarPDFPrescricao,
  gerarPDFLaudo,
  gerarPDFAtestado,
  gerarPDFProntuario,
  gerarPDFEvolucoes,
  abrirPDF,
  type EmpresaPDF,
  type PacientePDF,
  type ProfissionalPDF,
  type RegistroPDF,
} from '@/lib/prontuario-pdf'

// ─── Código de override do desenvolvedor ─────────────────────────────────────
const DEV_OVERRIDE_KEY = 'DEV@CinesioPro#2025!'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcularIdade(d: string | null) {
  if (!d) return ''
  const nasc = new Date(d), hoje = new Date()
  let a = hoje.getFullYear() - nasc.getFullYear()
  if (hoje.getMonth() < nasc.getMonth() ||
    (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())) a--
  return `${a} anos`
}

function formatarData(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatarDataHora(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatarTel(tel: string | null) {
  if (!tel) return ''
  const d = tel.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return tel
}

function iniciais(nome: string) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

// ─── Lock helpers ─────────────────────────────────────────────────────────────

interface LockData { hash: string; locked_by: string | null }

function parseLock(anamnese: string | null): LockData | null {
  if (!anamnese) return null
  try {
    const d = JSON.parse(anamnese)
    if (d._locked === true) return { hash: String(d.hash ?? ''), locked_by: (d.locked_by as string | null) ?? null }
  } catch {}
  return null
}

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── Tipo Meta ────────────────────────────────────────────────────────────────

const TIPO_META: Record<TipoRegistro, { label: string; color: string; bg: string; icon: string }> = {
  evolucao:   { label: 'Evolução',         color: '#1D4ED8', bg: '#DBEAFE', icon: 'edit_note'        },
  plano:      { label: 'Plano Tratamento', color: '#7C3AED', bg: '#EDE9FE', icon: 'medical_services' },
  prescricao: { label: 'Prescrição',       color: '#0369A1', bg: '#E0F2FE', icon: 'thermometer'      },
  laudo:      { label: 'Laudo Técnico',    color: '#6D28D9', bg: '#F3E8FF', icon: 'description'      },
  atestado:   { label: 'Atestado',         color: '#065F46', bg: '#D1FAE5', icon: 'stethoscope'      },
  anexo:      { label: 'Anexo',            color: '#92400E', bg: '#FEF3C7', icon: 'attach_file'      },
  copiloto:   { label: 'Copiloto IA',      color: '#BE185D', bg: '#FCE7F3', icon: 'auto_awesome'     },
  formulario: { label: 'Formulário',       color: '#0F766E', bg: '#CCFBF1', icon: 'assignment_turned_in' },
}

type ModalTipo = null | 'prontuario' | 'evolucao' | 'prescricao' | 'laudo' | 'atestado' | 'anexo' | 'copiloto' | 'plano' | 'restringir'
type FiltroTimeline = 'todos' | TipoRegistro

// ─── Componente principal ─────────────────────────────────────────────────────

export function ProntuarioClient({
  detalhe, timelineInicial, onVoltar,
}: {
  detalhe: ProntuarioDetalhe
  timelineInicial: RegistroTimeline[]
  /** Se fornecido, o botão Voltar chama este callback em vez de navegar para /prontuarios */
  onVoltar?: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { paciente, prontuario, empresa, profissionais } = detalhe

  const [timeline, setTimeline]   = useState<RegistroTimeline[]>(timelineInicial)
  const [filtro, setFiltro]       = useState<FiltroTimeline>('todos')
  const [modal, setModal]         = useState<ModalTipo>(null)
  const [expandido, setExpandido] = useState<Set<string>>(
    () => timelineInicial.length > 0 ? new Set([timelineInicial[0].id]) : new Set()
  )
  const [salvando, setSalvando]   = useState(false)
  const [erro, setErro]           = useState<string | null>(null)
  const [pdfViewer, setPdfViewer] = useState<{ url: string; nome: string } | null>(null)

  // Lock state — verificado no client para evitar SSR mismatch
  const lockInfo   = parseLock(prontuario.anamnese)
  const sessionKey = `prontlock_${prontuario.id}`
  const [desbloqueado, setDesbloqueado] = useState<boolean>(!lockInfo)
  useEffect(() => {
    if (lockInfo && sessionStorage.getItem(sessionKey) === 'ok') setDesbloqueado(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Injeta o nome do paciente no header do dashboard
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('page-title-change', {
      detail: { title: paciente.nome, description: 'Prontuário' },
    }))
    return () => {
      window.dispatchEvent(new CustomEvent('page-title-change', {
        detail: { title: '', description: '' },
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paciente.nome])

  // Dados para PDF
  const empresaPDF: EmpresaPDF = {
    nome: empresa.nome, telefone: empresa.telefone, email: empresa.email, cnpj: empresa.cnpj,
  }
  const pacientePDF: PacientePDF = {
    nome: paciente.nome, cpf: paciente.cpf, data_nascimento: paciente.data_nascimento, telefone: paciente.telefone,
  }

  function handleFiltro(f: FiltroTimeline) {
    setFiltro(f)
    startTransition(async () => {
      const res = await listarTimelineAction(paciente.id, f)
      if ('data' in res) {
        setTimeline(res.data)
        if (res.data.length > 0) {
          setExpandido(new Set([res.data[0].id]))
        }
      }
    })
  }

  function toggleExpand(id: string) {
    setExpandido(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function recarregarTimeline() {
    const res = await listarTimelineAction(paciente.id, filtro)
    if ('data' in res) {
      setTimeline(res.data)
      if (res.data.length > 0) {
        setExpandido(prev => new Set([res.data[0].id, ...prev]))
      }
    }
  }

  function abrirModal(m: ModalTipo) { setErro(null); setModal(m) }

  async function handleSalvarEvolucao(conteudo: string) {
    setSalvando(true); setErro(null)
    const res = await salvarEvolucaoAction(paciente.id, { conteudo })
    setSalvando(false)
    if ('error' in res) { setErro(res.error); return }
    setModal(null); await recarregarTimeline()
  }

  async function handleSalvarDoc(
    tipo: 'prescricao' | 'laudo' | 'atestado' | 'anexo' | 'copiloto',
    dados: Record<string, unknown>,
    pdfFn?: () => void,
  ) {
    setSalvando(true); setErro(null)
    const res = await salvarDocumentoAction(paciente.id, tipo, dados)
    setSalvando(false)
    if ('error' in res) { setErro(res.error); return }
    setModal(null)
    pdfFn?.()
    await recarregarTimeline()
  }

  function handleExportarProntuario() {
    const registros: RegistroPDF[] = timeline.map(r => ({
      tipo: r.tipo, criado_em: r.criado_em, profissional_nome: r.profissional_nome,
      resumo: r.resumo, dados: r.dados,
    }))
    const html = gerarPDFProntuario(empresaPDF, pacientePDF, {
      alergias: prontuario.alergias, antecedentes: prontuario.antecedentes, medicamentos: prontuario.medicamentos,
    }, registros)
    abrirPDF(html)
  }

  function handleExportarEvolucoes() {
    const evolucoes: RegistroPDF[] = timeline
      .filter(r => r.tipo === 'evolucao' || r.tipo === 'copiloto')
      .map(r => ({
        tipo: r.tipo, criado_em: r.criado_em, profissional_nome: r.profissional_nome,
        resumo: r.resumo, dados: r.dados,
      }))
    const html = gerarPDFEvolucoes(empresaPDF, pacientePDF, evolucoes)
    abrirPDF(html)
  }

  const filtrosTabs: { key: FiltroTimeline; label: string }[] = [
    { key: 'todos',      label: 'Todos'       },
    { key: 'evolucao',   label: 'Evoluções'   },
    { key: 'formulario', label: 'Formulários' },
    { key: 'prescricao', label: 'Prescrições' },
    { key: 'laudo',      label: 'Laudos'      },
    { key: 'atestado',   label: 'Atestados'   },
    { key: 'anexo',      label: 'Anexos'      },
    { key: 'plano',      label: 'Planos'      },
  ]

  return (
    <>
    <div className="max-w-5xl mx-auto space-y-3">

        {/* ── Header do Paciente — linha compacta ── */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">

          {/* Faixa de status de restrição */}
          {lockInfo && (
            <div className="px-5 py-1.5 flex items-center gap-2 text-xs font-bold"
              style={{
                background: desbloqueado ? '#DCFCE7' : '#FEF9C3',
                color:      desbloqueado ? '#15803D' : '#92400E',
              }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                {desbloqueado ? 'lock_open' : 'lock'}
              </span>
              {desbloqueado
                ? 'Prontuário restrito — acesso autorizado nesta sessão'
                : 'Prontuário com acesso restrito por senha'}
            </div>
          )}

          {/* Linha única: Voltar · Avatar · Nome · Info · Botões */}
          <div className="px-5 py-3 flex items-center gap-3">

            {/* Botão Voltar */}
            <button
              onClick={() => onVoltar ? onVoltar() : router.push('/prontuarios')}
              title={onVoltar ? 'Voltar para Pacientes' : 'Voltar para a lista de prontuários'}
              className="flex items-center justify-center w-7 h-7 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:border-[#CBD5E1] hover:text-[#1E293B] transition-all flex-shrink-0"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
            </button>

            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0 overflow-hidden"
              style={{ background: '#3B82F6' }}
            >
              {paciente.foto_url
                ? <img src={paciente.foto_url} alt="" className="w-full h-full object-cover" />
                : iniciais(paciente.nome)}
            </div>

            {/* Nome + status + ID */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black text-[#1E293B] truncate">{paciente.nome}</h1>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                  paciente.status === 'ativo'   ? 'bg-green-100 text-green-700'   :
                  paciente.status === 'inativo' ? 'bg-orange-100 text-orange-600' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {paciente.status === 'ativo' ? 'Ativo' : paciente.status === 'inativo' ? 'Inativo' : 'Alta'}
                </span>
              </div>
              <p className="text-[10px] text-[#94A3B8] font-mono leading-none mt-0.5">
                #{prontuario.id.slice(-8).toUpperCase()}
              </p>
            </div>

            {/* Divisor */}
            <div className="w-px h-8 bg-[#E2E8F0] flex-shrink-0 mx-1" />

            {/* Chips de info clínica */}
            <div className="flex items-center gap-5 flex-1 min-w-0 overflow-hidden">
              {/* Nascimento / Idade */}
              <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#94A3B8' }}>cake</span>
                <span className="text-xs text-[#475569] whitespace-nowrap">
                  {paciente.data_nascimento
                    ? `${calcularIdade(paciente.data_nascimento)} · ${formatarData(paciente.data_nascimento)}`
                    : '—'}
                </span>
              </div>
              {/* Telefone */}
              {paciente.telefone && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#94A3B8' }}>call</span>
                  <span className="text-xs text-[#475569] whitespace-nowrap">{formatarTel(paciente.telefone)}</span>
                </div>
              )}
              {/* Convênio */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#94A3B8' }}>health_and_safety</span>
                <span className="text-xs text-[#475569] whitespace-nowrap">{paciente.convenio || 'Particular'}</span>
              </div>
            </div>

            {/* Divisor */}
            <div className="w-px h-8 bg-[#E2E8F0] flex-shrink-0 mx-1" />

            {/* Botões de ação */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => abrirModal('restringir')}
                title={lockInfo ? 'Gerenciar restrição de acesso' : 'Restringir acesso com senha'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                style={lockInfo
                  ? { background: '#FEF9C3', borderColor: '#FDE047', color: '#92400E' }
                  : { background: '#F8FAFC', borderColor: '#E2E8F0', color: '#64748B' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                  {lockInfo ? 'lock' : 'lock_open'}
                </span>
                {lockInfo ? 'Restrito' : 'Restringir'}
              </button>
              <button onClick={() => abrirModal('prontuario')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] transition-all">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>edit</span>
                Dados
              </button>
              <button onClick={handleExportarProntuario}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] transition-all"
                title="Exportar prontuário completo em PDF">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>picture_as_pdf</span>
                PDF
              </button>
            </div>
          </div>

          {/* Chips de alertas clínicos (apenas quando houver dados) */}
          {(prontuario.alergias || prontuario.medicamentos || prontuario.antecedentes) && (
            <div className="px-5 pb-3 pt-0 flex flex-wrap gap-2 border-t border-[#F8FAFC]">
              {prontuario.alergias && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>warning</span>
                  <span className="uppercase text-[10px] tracking-wide opacity-70">Alergia</span>
                  <span>·</span>
                  <span>{prontuario.alergias}</span>
                </div>
              )}
              {prontuario.medicamentos && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>medication</span>
                  <span className="uppercase text-[10px] tracking-wide opacity-70">Medicamentos</span>
                  <span>·</span>
                  <span className="truncate max-w-[200px]">{prontuario.medicamentos}</span>
                </div>
              )}
              {prontuario.antecedentes && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>history</span>
                  <span className="uppercase text-[10px] tracking-wide opacity-70">Antecedentes</span>
                  <span>·</span>
                  <span className="truncate max-w-[200px]">{prontuario.antecedentes}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Lock Screen (se restrito e não desbloqueado) ── */}
        {lockInfo && !desbloqueado && (
          <LockScreen
            lockInfo={lockInfo}
            onUnlock={() => {
              sessionStorage.setItem(sessionKey, 'ok')
              setDesbloqueado(true)
            }}
          />
        )}

        {/* ── Conteúdo principal (visível só se desbloqueado) ── */}
        {(!lockInfo || desbloqueado) && (
          <>
            {/* Barra de Ações */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm px-4 py-3 mb-4 flex items-center gap-2 overflow-x-auto">
              <ActionBtn label="Anexar"        icon="attach_file" variant="outline" onClick={() => abrirModal('anexo')} />
              <ActionBtn label="Prescrição"    icon="thermometer" color="#0369A1"   onClick={() => abrirModal('prescricao')} />
              <ActionBtn label="Laudo Técnico" icon="description" color="#6D28D9"   onClick={() => abrirModal('laudo')} />
              <ActionBtn label="Atestado"      icon="stethoscope" color="#065F46"   onClick={() => abrirModal('atestado')} />
              <button onClick={() => abrirModal('copiloto')}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 shadow-sm ml-auto"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#DB2777)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
                Copiloto Clínico por Voz
              </button>
            </div>

            {/* Evolução Rápida */}
            <EvolucaoRapida onSalvar={handleSalvarEvolucao} salvando={salvando} />

            {/* Filtros + Exportar Evoluções */}
            <div className="flex items-center gap-2 mb-4 mt-4 flex-wrap">
              <div className="flex gap-1 overflow-x-auto pb-0.5 flex-1 min-w-0">
                {filtrosTabs.map(tab => (
                  <button key={tab.key} onClick={() => handleFiltro(tab.key)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      filtro === tab.key
                        ? 'bg-[#3B82F6] text-white shadow-sm'
                        : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
                    }`}>{tab.label}</button>
                ))}
              </div>
              <button
                onClick={handleExportarEvolucoes}
                title="Gerar PDF com todas as evoluções clínicas"
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#1D4ED8] bg-[#EFF6FF] text-xs font-semibold text-[#1D4ED8] hover:bg-[#DBEAFE] transition-colors cursor-pointer">
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>picture_as_pdf</span>
                PDF Evoluções
              </button>
            </div>

            {/* Timeline */}
            {isPending && <div className="text-center py-8 text-sm text-[#94A3B8]">Carregando...</div>}
            {!isPending && timeline.length === 0 && (
              <div className="text-center py-16 text-[#94A3B8]">
                <span className="material-symbols-outlined block mb-2 opacity-30" style={{ fontSize: 40 }}>timeline</span>
                <p className="text-sm font-medium">Nenhum registro encontrado</p>
                <p className="text-xs mt-1">Use os botões acima para registrar a primeira entrada.</p>
              </div>
            )}
            {!isPending && (
              <div className="space-y-2">
                {timeline.map(reg => {
                  const meta   = TIPO_META[reg.tipo]
                  const aberto = expandido.has(reg.id)
                  return (
                    <div key={reg.id} className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                      <button onClick={() => toggleExpand(reg.id)}
                        className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-[#F8FAFC] transition-colors">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: meta.bg }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16, color: meta.color }}>{meta.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                              style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                            {reg.profissional_nome && (
                              <span className="text-xs text-[#94A3B8]">{reg.profissional_nome}</span>
                            )}
                            <span className="text-xs text-[#CBD5E1] ml-auto">{formatarDataHora(reg.criado_em)}</span>
                          </div>
                          <p className="text-sm text-[#334155] line-clamp-2">{reg.resumo}</p>
                        </div>
                        <span className="material-symbols-outlined flex-shrink-0 text-[#CBD5E1] transition-transform"
                          style={{ fontSize: 18, transform: aberto ? 'rotate(90deg)' : 'none' }}>chevron_right</span>
                      </button>
                      {aberto && (
                        <div className="px-5 pb-4 border-t border-[#F1F5F9]">
                          <DetalheRegistro
                            reg={reg}
                            empresaPDF={empresaPDF}
                            pacientePDF={pacientePDF}
                            profissionais={profissionais}
                            onVerPDF={(url, nome) => setPdfViewer({ url, nome })}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modais ── */}
      {modal === 'prontuario' && (
        <ProntuarioBaseModal prontuario={prontuario} onClose={() => setModal(null)}
          onSalvar={async p => {
            setSalvando(true); setErro(null)
            const res = await salvarProntuarioAction(prontuario.id, p)
            setSalvando(false)
            if ('error' in res) { setErro(res.error); return }
            setModal(null); window.location.reload()
          }}
          salvando={salvando} erro={erro} />
      )}

      {modal === 'restringir' && (
        <RestricaoModal
          prontuarioId={prontuario.id}
          lockInfo={lockInfo}
          profissionais={profissionais}
          onClose={() => setModal(null)}
          onLocked={() => { setModal(null); window.location.reload() }}
          onUnlocked={() => {
            sessionStorage.removeItem(sessionKey)
            setDesbloqueado(false)
            setModal(null)
            window.location.reload()
          }}
        />
      )}

      {modal === 'anexo' && (
        <AnexarModal pacienteId={paciente.id} onClose={() => setModal(null)}
          onSalvar={d => handleSalvarDoc('anexo', d)}
          salvando={salvando} erro={erro} />
      )}

      {modal === 'prescricao' && (
        <PrescricaoModal profissionais={profissionais} onClose={() => setModal(null)}
          onSalvar={(dados, prof) => handleSalvarDoc('prescricao', dados, () => {
            abrirPDF(gerarPDFPrescricao(empresaPDF, pacientePDF,
              { uso: String(dados.uso ?? ''), medicamentos: String(dados.medicamentos ?? ''), posologia: String(dados.posologia ?? '') },
              prof))
          })}
          salvando={salvando} erro={erro} />
      )}

      {modal === 'laudo' && (
        <LaudoModal profissionais={profissionais} onClose={() => setModal(null)}
          onSalvar={(dados, prof) => handleSalvarDoc('laudo', dados, () => {
            abrirPDF(gerarPDFLaudo(empresaPDF, pacientePDF,
              { titulo: String(dados.titulo ?? 'Laudo'), corpo: String(dados.corpo ?? '') },
              prof))
          })}
          salvando={salvando} erro={erro} />
      )}

      {modal === 'atestado' && (
        <AtestadoModal profissionais={profissionais} onClose={() => setModal(null)}
          onSalvar={(dados, prof) => handleSalvarDoc('atestado', dados, () => {
            abrirPDF(gerarPDFAtestado(empresaPDF, pacientePDF,
              { dias: dados.dias as number | null, data_inicio: String(dados.data_inicio ?? ''), cid: String(dados.cid ?? ''), observacoes: String(dados.observacoes ?? '') },
              prof))
          })}
          salvando={salvando} erro={erro} />
      )}

      {modal === 'copiloto' && (
        <CopilotoModal onClose={() => setModal(null)}
          onSalvar={d => handleSalvarDoc('copiloto', d)}
          salvando={salvando} erro={erro} />
      )}

      {modal === 'plano' && (
        <PlanoModal onClose={() => setModal(null)}
          onSalvar={async p => {
            setSalvando(true); setErro(null)
            const res = await salvarPlanoAction(paciente.id, p)
            setSalvando(false)
            if ('error' in res) { setErro(res.error); return }
            setModal(null); await recarregarTimeline()
          }}
          salvando={salvando} erro={erro} />
      )}

      {pdfViewer && (
        <VisualizadorPDFModal url={pdfViewer.url} nome={pdfViewer.nome} onClose={() => setPdfViewer(null)} />
      )}
    </>
  )
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5">
      <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 15, color: '#94A3B8' }}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wide leading-none mb-0.5">{label}</p>
        <p className="text-sm text-[#1E293B] font-medium truncate">{value}</p>
      </div>
    </div>
  )
}

// ─── LockScreen ───────────────────────────────────────────────────────────────

function LockScreen({ lockInfo, onUnlock }: { lockInfo: LockData; onUnlock: () => void }) {
  const [senha, setSenha]   = useState('')
  const [erro, setErro]     = useState('')
  const [loading, setLoading] = useState(false)

  async function tentar() {
    if (!senha.trim()) return
    setLoading(true); setErro('')

    if (senha === DEV_OVERRIDE_KEY) {
      setLoading(false); onUnlock(); return
    }

    const hash = await sha256hex(senha)
    if (hash === lockInfo.hash) {
      setLoading(false); onUnlock()
    } else {
      setLoading(false)
      setErro('Senha incorreta. Tente novamente.')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl px-8 py-10 max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: '#FEF9C3' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#92400E' }}>lock</span>
        </div>
        <h2 className="text-lg font-black text-[#1E293B] mb-2">Prontuário Restrito</h2>
        <p className="text-sm text-[#64748B] mb-6 leading-relaxed">
          Este prontuário está protegido por senha. Insira a senha cadastrada para acessar o conteúdo.
        </p>
        <input
          type="password"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && tentar()}
          placeholder="Digite a senha de acesso"
          autoFocus
          className="w-full text-sm border-2 border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#3B82F6] mb-3 text-center tracking-widest"
        />
        {erro && <p className="text-xs text-red-500 mb-3">{erro}</p>}
        <button
          onClick={tentar}
          disabled={loading || !senha.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all"
          style={{ background: '#1E293B' }}
        >
          {loading ? 'Verificando…' : 'Acessar Prontuário'}
        </button>
        <p className="text-xs text-[#CBD5E1] mt-5">
          Esqueceu a senha? Entre em contato com o administrador do sistema.
        </p>
      </div>
    </div>
  )
}

// ─── RestricaoModal ───────────────────────────────────────────────────────────

function RestricaoModal({ prontuarioId, lockInfo, profissionais, onClose, onLocked, onUnlocked }: {
  prontuarioId: string
  lockInfo: LockData | null
  profissionais: ProfissionalItem[]
  onClose: () => void
  onLocked: () => void
  onUnlocked: () => void
}) {
  const [aba, setAba]               = useState<'lock' | 'unlock'>(lockInfo ? 'unlock' : 'lock')
  const [senha, setSenha]           = useState('')
  const [senhaConf, setSenhaConf]   = useState('')
  const [profId, setProfId]         = useState(lockInfo?.locked_by ?? '')
  const [erro, setErro]             = useState('')
  const [loading, setLoading]       = useState(false)

  async function handleRestringir() {
    if (!senha.trim())        { setErro('Informe uma senha.'); return }
    if (senha !== senhaConf)  { setErro('As senhas não coincidem.'); return }
    if (senha.length < 4)     { setErro('A senha deve ter pelo menos 4 caracteres.'); return }
    setLoading(true); setErro('')
    const hash = await sha256hex(senha)
    const res = await restringirAcessoAction(prontuarioId, { hash, profissional_id: profId || null })
    setLoading(false)
    if ('error' in res) { setErro(res.error); return }
    onLocked()
  }

  async function handleRemover() {
    if (!senha.trim()) { setErro('Informe a senha ou o código de administrador.'); return }
    setLoading(true); setErro('')

    if (senha === DEV_OVERRIDE_KEY) {
      const res = await removerRestricaoAction(prontuarioId)
      setLoading(false)
      if ('error' in res) { setErro(res.error); return }
      onUnlocked(); return
    }

    if (!lockInfo) { setErro('Nenhuma restrição ativa.'); setLoading(false); return }
    const hash = await sha256hex(senha)
    if (hash !== lockInfo.hash) { setErro('Senha incorreta.'); setLoading(false); return }

    const res = await removerRestricaoAction(prontuarioId)
    setLoading(false)
    if ('error' in res) { setErro(res.error); return }
    onUnlocked()
  }

  return (
    <Backdrop onClose={onClose}>
      <ModalBox title="Restrição de Acesso" icon="lock" iconColor="#92400E" onClose={onClose}>

        {/* Abas (só aparece quando já existe restrição) */}
        {lockInfo && (
          <div className="flex gap-1 mb-5 bg-[#F8FAFC] rounded-xl p-1">
            <button onClick={() => { setAba('lock'); setErro(''); setSenha(''); setSenhaConf('') }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                aba === 'lock' ? 'bg-white shadow-sm text-[#1E293B]' : 'text-[#94A3B8]'
              }`}>
              Alterar Senha
            </button>
            <button onClick={() => { setAba('unlock'); setErro(''); setSenha('') }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                aba === 'unlock' ? 'bg-white shadow-sm text-[#1E293B]' : 'text-[#94A3B8]'
              }`}>
              Remover Restrição
            </button>
          </div>
        )}

        {/* Aba: Definir / Alterar Senha */}
        {aba === 'lock' && (
          <div className="space-y-4">
            <div className="px-4 py-3 rounded-xl text-sm text-[#64748B]"
              style={{ background: '#FEF9C3', border: '1px solid #FDE047' }}>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 16, color: '#92400E' }}>info</span>
                <p>Após ativar, apenas o profissional responsável ou o administrador do sistema poderão acessar este prontuário.</p>
              </div>
            </div>
            <Field label="Profissional Responsável (opcional)">
              <ProfissionalSelect profissionais={profissionais} value={profId} onChange={setProfId} />
            </Field>
            <Field label="Nova Senha *">
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#92400E]" />
            </Field>
            <Field label="Confirmar Senha *">
              <input type="password" value={senhaConf} onChange={e => setSenhaConf(e.target.value)}
                placeholder="Repita a senha"
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#92400E]"
                onKeyDown={e => e.key === 'Enter' && handleRestringir()} />
            </Field>
            {erro && <ErroBanner msg={erro} />}
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9]">Cancelar</button>
              <button onClick={handleRestringir} disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{ background: '#92400E' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>lock</span>
                {loading ? 'Salvando…' : lockInfo ? 'Atualizar Senha' : 'Ativar Restrição'}
              </button>
            </div>
          </div>
        )}

        {/* Aba: Remover Restrição */}
        {aba === 'unlock' && (
          <div className="space-y-4">
            <div className="px-4 py-3 rounded-xl text-sm text-[#64748B]"
              style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 16, color: '#D97706' }}>warning</span>
                <p>Para remover a restrição, informe a senha cadastrada ou o código de administrador do sistema.</p>
              </div>
            </div>
            <Field label="Senha ou Código de Administrador">
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRemover()}
                placeholder="Senha de acesso"
                autoFocus
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#D97706]" />
            </Field>
            {erro && <ErroBanner msg={erro} />}
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9]">Cancelar</button>
              <button onClick={handleRemover} disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{ background: '#D97706' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>lock_open</span>
                {loading ? 'Verificando…' : 'Remover Restrição'}
              </button>
            </div>
          </div>
        )}

      </ModalBox>
    </Backdrop>
  )
}

// ─── ActionBtn ────────────────────────────────────────────────────────────────

function ActionBtn({ label, icon, color, variant, onClick }: {
  label: string; icon: string; color?: string; variant?: 'outline'; onClick: () => void
}) {
  if (variant === 'outline') return (
    <button onClick={onClick}
      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border border-dashed border-[#CBD5E1] text-[#64748B] hover:border-[#94A3B8] hover:text-[#334155] transition-all">
      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{icon}</span>{label}
    </button>
  )
  return (
    <button onClick={onClick}
      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
      style={{ color, borderColor: color + '40', background: color + '10' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 15, color }}>{icon}</span>{label}
    </button>
  )
}

// ─── Evolução Rápida ──────────────────────────────────────────────────────────

function EvolucaoRapida({ onSalvar, salvando }: { onSalvar: (c: string) => void; salvando: boolean }) {
  const [texto, setTexto]   = useState('')
  const [aberto, setAberto] = useState(false)

  if (!aberto) return (
    <button onClick={() => setAberto(true)}
      className="w-full flex items-center gap-3 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm px-5 py-3.5 text-sm text-[#94A3B8] hover:text-[#64748B] hover:border-[#CBD5E1] transition-all text-left">
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#3B82F6' }}>edit_note</span>
      Registrar nova evolução clínica...
    </button>
  )
  return (
    <div className="bg-white rounded-2xl border border-[#3B82F6] shadow-sm px-5 py-4">
      <textarea autoFocus value={texto} onChange={e => setTexto(e.target.value)}
        placeholder="Descreva a evolução clínica, queixas, condutas adotadas, resposta ao tratamento..."
        className="w-full h-28 text-sm text-[#334155] placeholder:text-[#94A3B8] outline-none resize-none" />
      <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-[#F1F5F9]">
        <button onClick={() => { setAberto(false); setTexto('') }}
          className="px-3 py-1.5 text-sm text-[#64748B] hover:text-[#334155]">Cancelar</button>
        <button onClick={() => { onSalvar(texto); setTexto(''); setAberto(false) }}
          disabled={salvando || !texto.trim()}
          className="px-4 py-1.5 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-50"
          style={{ background: '#3B82F6' }}>
          {salvando ? 'Salvando…' : 'Salvar Evolução'}
        </button>
      </div>
    </div>
  )
}

// ─── Detalhe expandido ────────────────────────────────────────────────────────

function DetalheRegistro({ reg, empresaPDF, pacientePDF, profissionais, onVerPDF }: {
  reg: RegistroTimeline
  empresaPDF: EmpresaPDF
  pacientePDF: PacientePDF
  profissionais: ProfissionalItem[]
  onVerPDF?: (url: string, nome: string) => void
}) {
  const d = reg.dados

  // Recupera profissional que foi usado ao criar o documento
  const profIdDados = String(d.profissional_id ?? '')
  const profPDF     = profIdDados ? getProfissionalPDF(profissionais, profIdDados) : null

  const btnPDF = (fn: () => void) => (
    <button onClick={fn}
      className="mt-4 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] hover:text-[#334155] transition-all">
      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>picture_as_pdf</span>
      Reimprimir PDF
    </button>
  )

  if (reg.tipo === 'evolucao') return (
    <div className="mt-3 text-sm text-[#334155] whitespace-pre-line leading-relaxed">
      {String(d.conteudo ?? '')}
    </div>
  )

  if (reg.tipo === 'prescricao') return (
    <div className="mt-3 space-y-2 text-sm">
      {Boolean(d.uso) && (
        <p><span className="font-semibold text-[#64748B]">Uso:</span> {String(d.uso)}</p>
      )}
      {Boolean(d.medicamentos) && (
        <div>
          <p className="font-semibold text-[#64748B] mb-1">Medicamentos:</p>
          <p className="whitespace-pre-line">{String(d.medicamentos)}</p>
        </div>
      )}
      {Boolean(d.posologia) && (
        <div>
          <p className="font-semibold text-[#64748B] mb-1">Posologia:</p>
          <p className="whitespace-pre-line">{String(d.posologia)}</p>
        </div>
      )}
      {btnPDF(() => abrirPDF(gerarPDFPrescricao(
        empresaPDF, pacientePDF,
        { uso: String(d.uso ?? ''), medicamentos: String(d.medicamentos ?? ''), posologia: String(d.posologia ?? '') },
        profPDF,
      )))}
    </div>
  )

  if (reg.tipo === 'laudo') return (
    <div className="mt-3 space-y-2 text-sm">
      {Boolean(d.titulo) && <p className="font-semibold text-[#1E293B]">{String(d.titulo)}</p>}
      {Boolean(d.corpo) && (
        <p className="whitespace-pre-line text-[#334155] leading-relaxed">{String(d.corpo)}</p>
      )}
      {btnPDF(() => abrirPDF(gerarPDFLaudo(
        empresaPDF, pacientePDF,
        { titulo: String(d.titulo ?? 'Laudo'), corpo: String(d.corpo ?? '') },
        profPDF,
      )))}
    </div>
  )

  if (reg.tipo === 'atestado') return (
    <div className="mt-3 space-y-1.5 text-sm">
      {Boolean(d.dias) && (
        <p><span className="font-semibold text-[#64748B]">Dias:</span> {String(d.dias)}</p>
      )}
      {Boolean(d.data_inicio) && (
        <p><span className="font-semibold text-[#64748B]">Início:</span> {new Date(String(d.data_inicio)).toLocaleDateString('pt-BR')}</p>
      )}
      {Boolean(d.cid) && (
        <p><span className="font-semibold text-[#64748B]">CID:</span> {String(d.cid)}</p>
      )}
      {Boolean(d.observacoes) && <p className="text-[#64748B]">{String(d.observacoes)}</p>}
      {btnPDF(() => abrirPDF(gerarPDFAtestado(
        empresaPDF, pacientePDF,
        { dias: d.dias as number | null, data_inicio: String(d.data_inicio ?? ''), cid: String(d.cid ?? ''), observacoes: String(d.observacoes ?? '') },
        profPDF,
      )))}
    </div>
  )

  if (reg.tipo === 'copiloto') return (
    <div className="mt-3 space-y-2 text-sm">
      {Boolean(d.queixa) && (
        <p><span className="font-semibold text-[#64748B]">Queixa:</span> {String(d.queixa)}</p>
      )}
      {Boolean(d.anamnese) && (
        <div>
          <p className="font-semibold text-[#64748B] mb-0.5">Anamnese:</p>
          <p className="whitespace-pre-line text-[#334155]">{String(d.anamnese)}</p>
        </div>
      )}
      {Boolean(d.conduta) && (
        <div>
          <p className="font-semibold text-[#64748B] mb-0.5">Conduta:</p>
          <p className="whitespace-pre-line text-[#334155]">{String(d.conduta)}</p>
        </div>
      )}
      {Boolean(d.cid) && <p><span className="font-semibold text-[#64748B]">CID:</span> {String(d.cid)}</p>}
      {Boolean(d.anotacoes) && <p className="text-[#94A3B8] italic">{String(d.anotacoes)}</p>}
    </div>
  )

  if (reg.tipo === 'anexo') {
    const url  = String(d.url ?? '')
    const nome = String(d.nome ?? 'Arquivo')
    const mime = String(d.tipo_mime ?? '')
    const isImage = mime.startsWith('image/')
    const isPdf   = !isImage && (
      mime === 'application/pdf' ||
      /\.pdf(\?|#|$)/i.test(url) ||
      (!mime && url.length > 0)   // sem mime mas tem URL → tenta como PDF
    )
    return (
      <div className="mt-3">
        {Boolean(d.comentario) && <p className="text-sm text-[#64748B] mb-2">{String(d.comentario)}</p>}
        {url
          ? isImage
            ? <a href={url} target="_blank" rel="noreferrer">
                <img src={url} alt={nome} className="max-h-48 rounded-lg border border-[#E2E8F0]" />
              </a>
            : <div className="flex items-center gap-2 flex-wrap">
                {onVerPDF && (
                  <button onClick={() => onVerPDF(url, nome)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-[#92400E] bg-[#FEF3C7] text-sm font-semibold text-[#92400E] hover:bg-[#FDE68A] transition-colors cursor-pointer">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>visibility</span>
                    Visualizar
                  </button>
                )}
                <a href={url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#3B82F6] hover:bg-[#EFF6FF] transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                  Baixar
                </a>
              </div>
          : <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FEF9C3] border border-[#FDE68A] text-sm text-[#92400E]">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
              Arquivo não enviado — apenas o nome foi salvo.
            </div>
        }
      </div>
    )
  }

  if (reg.tipo === 'plano') {
    const sl: Record<string, string> = { ativo: 'Ativo', reavaliacao: 'Reavaliação', alta: 'Alta', encerrado: 'Encerrado' }
    return (
      <div className="mt-3 space-y-2 text-sm">
        <p className="text-[#334155]">{String(d.diagnostico_clinico ?? '')}</p>
        <div className="flex flex-wrap gap-3 text-xs text-[#64748B]">
          {Boolean(d.cid10) && <span>CID-10: {String(d.cid10)}</span>}
          {Boolean(d.sessoes_previstas) && <span>Previstas: {String(d.sessoes_previstas)}</span>}
          {Boolean(d.sessoes_realizadas) && <span>Realizadas: {String(d.sessoes_realizadas)}</span>}
          {Boolean(d.status) && (
            <span className={`px-2 py-0.5 rounded-full font-semibold ${
              d.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>{sl[String(d.status)] ?? String(d.status)}</span>
          )}
        </div>
      </div>
    )
  }

  if (reg.tipo === 'formulario') {
    type CampoItem = { id: string; tipo: string; label: string; obrigatorio?: boolean }
    const campos   = (d.campos   as CampoItem[]        ) ?? []
    const respostas = (d.respostas as Record<string, unknown>) ?? {}

    function fmtValor(tipo: string, val: unknown): string {
      if (val === null || val === undefined || val === '') return '—'
      if (tipo === 'selecao_multipla' && Array.isArray(val)) return val.join(', ') || '—'
      if (tipo === 'escala_numerica') return String(val)
      if (tipo === 'assinatura')      return val === 'assinado' ? 'Assinado ✓' : '—'
      if (tipo === 'data')            return val ? new Date(String(val)).toLocaleDateString('pt-BR') : '—'
      return String(val)
    }

    const camposRespondidos = campos.filter(c =>
      c.tipo !== 'secao' && c.tipo !== 'instrucao' && c.tipo !== 'mapa_dor'
    )

    return (
      <div className="mt-3 space-y-3">
        {camposRespondidos.map(campo => {
          const val = respostas[campo.id]
          const vazio = val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)
          return (
            <div key={campo.id} className="flex flex-col gap-0.5">
              <p className="text-xs font-semibold text-[#64748B] leading-snug">
                {campo.label}
                {campo.obrigatorio && <span className="text-red-400 ml-0.5">*</span>}
              </p>
              <p className={`text-sm leading-relaxed ${vazio ? 'text-[#CBD5E1] italic' : 'text-[#1E293B]'}`}>
                {vazio ? 'Não respondido' : fmtValor(campo.tipo, val)}
              </p>
            </div>
          )
        })}
        {camposRespondidos.length === 0 && (
          <p className="text-sm text-[#94A3B8] italic">Nenhum campo com resposta registrada.</p>
        )}
      </div>
    )
  }

  return null
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

function Backdrop({ onClose, children, wide, maximized }: {
  onClose: () => void; children: React.ReactNode; wide?: boolean; maximized?: boolean
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.6)' }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full transition-all duration-300 ${
          maximized
            ? 'max-w-none h-screen rounded-none'
            : wide
              ? 'max-w-3xl max-h-[92vh] overflow-y-auto'
              : 'max-w-lg max-h-[92vh] overflow-y-auto'
        }`}
        style={maximized ? { position: 'fixed', inset: 0, height: '100dvh', overflow: 'auto' } : undefined}
      >
        {children}
      </div>
    </div>
  )
}

function ModalBox({ title, icon, iconColor, onClose, children, maximizable, maximized, onToggleMaximize }: {
  title: string; icon?: string; iconColor?: string; onClose: () => void; children: React.ReactNode
  maximizable?: boolean; maximized?: boolean; onToggleMaximize?: () => void
}) {
  return (
    <div className={`bg-white shadow-2xl overflow-hidden ${maximized ? 'rounded-none min-h-screen flex flex-col' : 'rounded-2xl'}`}>
      <div className="flex items-center gap-2 px-6 py-4 border-b border-[#F1F5F9] flex-shrink-0">
        {icon && <span className="material-symbols-outlined" style={{ fontSize: 20, color: iconColor }}>{icon}</span>}
        <h2 className="font-bold text-[#1E293B] flex-1">{title}</h2>
        {maximizable && (
          <button onClick={onToggleMaximize} title={maximized ? 'Restaurar' : 'Maximizar'}
            className="text-[#94A3B8] hover:text-[#64748B] mr-1">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              {maximized ? 'close_fullscreen' : 'open_in_full'}
            </span>
          </button>
        )}
        <button onClick={onClose} className="text-[#94A3B8] hover:text-[#64748B]">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
        </button>
      </div>
      <div className={`px-6 py-5 ${maximized ? 'flex-1 overflow-y-auto' : ''}`}>{children}</div>
    </div>
  )
}

function ErroBanner({ msg }: { msg: string }) {
  return (
    <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">{msg}</div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#64748B] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

// ─── Seletor de Profissional ──────────────────────────────────────────────────

function ProfissionalSelect({ profissionais, value, onChange, color }: {
  profissionais: ProfissionalItem[]
  value: string; onChange: (v: string) => void; color?: string
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full text-sm border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none bg-white"
      style={{ borderColor: value ? (color ?? '#3B82F6') + '80' : undefined }}>
      <option value="">— Selecionar profissional —</option>
      {profissionais.map(p => (
        <option key={p.id} value={p.id}>
          {p.nome}{p.crefito ? ` · ${p.crefito}` : ''}{p.especialidade ? ` — ${p.especialidade}` : ''}
        </option>
      ))}
    </select>
  )
}

function getProfissionalPDF(profissionais: ProfissionalItem[], id: string): ProfissionalPDF | null {
  const p = profissionais.find(x => x.id === id)
  if (!p) return null
  return { nome: p.nome, registro: p.crefito ?? '', especialidade: p.especialidade }
}

// ─── Modal Dados Clínicos Base ────────────────────────────────────────────────

function ProntuarioBaseModal({ prontuario, onClose, onSalvar, salvando, erro }: {
  prontuario: ProntuarioDetalhe['prontuario']
  onClose: () => void
  onSalvar: (p: { alergias?: string; antecedentes?: string; medicamentos?: string }) => void
  salvando: boolean; erro: string | null
}) {
  const [alergias,     setAlergias]     = useState(prontuario.alergias     ?? '')
  const [antecedentes, setAntecedentes] = useState(prontuario.antecedentes ?? '')
  const [medicamentos, setMedicamentos] = useState(prontuario.medicamentos ?? '')
  return (
    <Backdrop onClose={onClose}>
      <ModalBox title="Dados Clínicos Base" icon="edit" iconColor="#3B82F6" onClose={onClose}>
        <div className="space-y-4">
          <Field label="Alergias">
            <input value={alergias} onChange={e => setAlergias(e.target.value)}
              placeholder="Ex: Dipirona, látex..."
              className="w-full text-sm border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#3B82F6]" />
          </Field>
          <Field label="Medicamentos em uso">
            <textarea value={medicamentos} onChange={e => setMedicamentos(e.target.value)}
              className="w-full h-20 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#3B82F6] resize-none" />
          </Field>
          <Field label="Antecedentes / Histórico">
            <textarea value={antecedentes} onChange={e => setAntecedentes(e.target.value)}
              placeholder="Cirurgias, patologias, histórico familiar..."
              className="w-full h-24 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#3B82F6] resize-none" />
          </Field>
        </div>
        {erro && <ErroBanner msg={erro} />}
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9]">Cancelar</button>
          <button onClick={() => onSalvar({ alergias, antecedentes, medicamentos })} disabled={salvando}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{ background: '#3B82F6' }}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </ModalBox>
    </Backdrop>
  )
}

// ─── Modal Anexar ─────────────────────────────────────────────────────────────

function AnexarModal({ pacienteId, onClose, onSalvar, salvando, erro }: {
  pacienteId: string; onClose: () => void; onSalvar: (d: Record<string, unknown>) => void
  salvando: boolean; erro: string | null
}) {
  const [nome,        setNome]        = useState('')
  const [comentario,  setComentario]  = useState('')
  const [uploading,   setUploading]   = useState(false)
  const [fileUrl,     setFileUrl]     = useState('')
  const [fileMime,    setFileMime]    = useState('')
  const [uploadErro,  setUploadErro]  = useState<string | null>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const input2Ref = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    if (!nome) setNome(file.name)
    setFileMime(file.type)
    setUploading(true)
    setUploadErro(null)
    setFileUrl('')
    try {
      const sb   = createClient()
      const ext  = file.name.split('.').pop() ?? 'bin'
      const path = `${pacienteId}/${Date.now()}.${ext}`
      const { data, error } = await sb.storage.from('prontuarios').upload(path, file, { upsert: true })
      if (error) {
        setUploadErro(`Falha no upload: ${error.message}`)
      } else {
        const { data: pub } = sb.storage.from('prontuarios').getPublicUrl(data.path)
        setFileUrl(pub.publicUrl)
      }
    } catch (err: unknown) {
      setUploadErro(`Erro inesperado: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Backdrop onClose={onClose}>
      <ModalBox title="Anexar Arquivo ou Foto" icon="attach_file" iconColor="#92400E" onClose={onClose}>
        <p className="text-xs text-[#64748B] mb-4">
          Faça o upload de laudos, exames em PDF ou imagens clínicas. Limite: 10MB.
        </p>
        <div className="space-y-4">
          <Field label="Nome / Descrição do Anexo">
            <input value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Ex: Exame de Sangue, Laudo de Retorno..."
              className="w-full text-sm border-2 border-[#3B82F6] rounded-xl px-4 py-2.5 outline-none" />
          </Field>
          <Field label="Comentário / Observações">
            <textarea value={comentario} onChange={e => setComentario(e.target.value)}
              placeholder="Observações ou anotações sobre este documento..."
              className="w-full h-20 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#3B82F6] resize-none" />
          </Field>
          {uploadErro && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <span className="material-symbols-outlined flex-shrink-0 mt-0.5" style={{ fontSize: 16 }}>error</span>
              <div>
                <p className="font-semibold">Falha no upload do arquivo</p>
                <p className="text-xs mt-0.5 text-red-600">{uploadErro}</p>
                <p className="text-xs mt-1 text-red-500">Verifique se o bucket &quot;prontuarios&quot; existe no Supabase Storage e tem permissão de escrita.</p>
              </div>
            </div>
          )}
          {fileUrl
            ? <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                Arquivo enviado com sucesso!
              </div>
            : <div className="grid grid-cols-2 gap-3">
                <input ref={inputRef}  type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFile} />
                <input ref={input2Ref} type="file" accept="image/*"         className="hidden" onChange={handleFile} />
                <button onClick={() => inputRef.current?.click()} disabled={uploading}
                  className="flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-dashed border-[#E2E8F0] text-[#94A3B8] hover:border-[#CBD5E1] hover:text-[#64748B] transition-all">
                  {uploading
                    ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: 32 }}>progress_activity</span>
                    : <span className="material-symbols-outlined" style={{ fontSize: 32 }}>description</span>
                  }
                  <span className="text-sm font-medium">{uploading ? 'Enviando…' : 'Documento/PDF'}</span>
                </button>
                <button onClick={() => input2Ref.current?.click()} disabled={uploading}
                  className="flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-dashed border-[#E2E8F0] text-[#94A3B8] hover:border-[#CBD5E1] hover:text-[#64748B] transition-all">
                  <span className="material-symbols-outlined" style={{ fontSize: 32 }}>photo_camera</span>
                  <span className="text-sm font-medium">Imagem/Foto</span>
                </button>
              </div>
          }
        </div>
        {erro && <ErroBanner msg={erro} />}
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9]">Cancelar</button>
          <button onClick={() => onSalvar({ nome, comentario, url: fileUrl, tipo_mime: fileMime })}
            disabled={salvando || uploading || !nome.trim() || Boolean(uploadErro)}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{ background: '#92400E' }}>
            {uploading ? 'Enviando…' : salvando ? 'Salvando…' : 'Salvar Anexo'}
          </button>
        </div>
      </ModalBox>
    </Backdrop>
  )
}

// ─── Modal Visualizador PDF ───────────────────────────────────────────────────

function VisualizadorPDFModal({ url, nome, onClose }: {
  url: string; nome: string; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: 'rgba(0,0,0,0.75)' }}>
      {/* Barra superior */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1E293B] text-white flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#FCD34D' }}>picture_as_pdf</span>
          <span className="text-sm font-semibold truncate">{nome}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          <a href={url} target="_blank" rel="noreferrer" download={nome}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
            Baixar
          </a>
          <button onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            Fechar
          </button>
        </div>
      </div>
      {/* Iframe */}
      <div className="flex-1 min-h-0">
        <iframe
          src={`${url}#toolbar=1&navpanes=0`}
          className="w-full h-full border-0"
          title={nome}
        />
      </div>
    </div>
  )
}

// ─── Modal Prescrição ─────────────────────────────────────────────────────────

function PrescricaoModal({ profissionais, onClose, onSalvar, salvando, erro }: {
  profissionais: ProfissionalItem[]; onClose: () => void
  onSalvar: (d: Record<string, unknown>, prof: ProfissionalPDF | null) => void
  salvando: boolean; erro: string | null
}) {
  const [uso,          setUso]          = useState('Uso Interno')
  const [medicamentos, setMedicamentos] = useState('')
  const [posologia,    setPosologia]    = useState('')
  const [profId,       setProfId]       = useState('')
  return (
    <Backdrop onClose={onClose}>
      <ModalBox title="Nova Prescrição Médica" icon="thermometer" iconColor="#0369A1" onClose={onClose}>
        <div className="space-y-4">
          <Field label="Profissional Responsável">
            <ProfissionalSelect profissionais={profissionais} value={profId} onChange={setProfId} color="#0369A1" />
          </Field>
          <Field label="Uso">
            <select value={uso} onChange={e => setUso(e.target.value)}
              className="w-full text-sm border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#0369A1] bg-white">
              {['Uso Interno', 'Uso Externo', 'Uso Tópico', 'Uso Injetável', 'Uso Inalatório'].map(o =>
                <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Medicamento(s) *">
            <textarea value={medicamentos} onChange={e => setMedicamentos(e.target.value)}
              placeholder="Ex: Dipirona 500mg - 1 cx"
              className="w-full h-28 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#0369A1] resize-none" />
          </Field>
          <Field label="Posologia / Recomendações">
            <textarea value={posologia} onChange={e => setPosologia(e.target.value)}
              placeholder="Ex: Tomar 1 comprimido de 8 em 8 horas..."
              className="w-full h-24 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#0369A1] resize-none" />
          </Field>
        </div>
        {erro && <ErroBanner msg={erro} />}
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9]">Cancelar</button>
          <button
            onClick={() => onSalvar(
              { uso, medicamentos, posologia, profissional_id: profId || null },
              getProfissionalPDF(profissionais, profId),
            )}
            disabled={salvando || !medicamentos.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{ background: '#0369A1' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
            {salvando ? 'Salvando…' : 'Salvar & Imprimir PDF'}
          </button>
        </div>
      </ModalBox>
    </Backdrop>
  )
}

// ─── Modal Laudo ──────────────────────────────────────────────────────────────

function LaudoModal({ profissionais, onClose, onSalvar, salvando, erro }: {
  profissionais: ProfissionalItem[]; onClose: () => void
  onSalvar: (d: Record<string, unknown>, prof: ProfissionalPDF | null) => void
  salvando: boolean; erro: string | null
}) {
  const [titulo, setTitulo] = useState('Laudo Médico Especializado')
  const [corpo,  setCorpo]  = useState('')
  const [profId, setProfId] = useState('')
  return (
    <Backdrop onClose={onClose}>
      <ModalBox title="Emitir Laudo Técnico" icon="description" iconColor="#6D28D9" onClose={onClose}>
        <div className="space-y-4">
          <Field label="Profissional Responsável">
            <ProfissionalSelect profissionais={profissionais} value={profId} onChange={setProfId} color="#6D28D9" />
          </Field>
          <Field label="Título do Documento">
            <input value={titulo} onChange={e => setTitulo(e.target.value)}
              className="w-full text-sm border-2 border-[#6D28D9] rounded-xl px-4 py-2.5 outline-none" />
          </Field>
          <Field label="Corpo do Laudo / Parecer *">
            <textarea value={corpo} onChange={e => setCorpo(e.target.value)}
              placeholder="Descreva o parecer técnico detalhadamente..."
              className="w-full h-40 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#6D28D9] resize-none" />
          </Field>
        </div>
        {erro && <ErroBanner msg={erro} />}
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9]">Cancelar</button>
          <button
            onClick={() => onSalvar(
              { titulo, corpo, profissional_id: profId || null },
              getProfissionalPDF(profissionais, profId),
            )}
            disabled={salvando || !corpo.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{ background: '#6D28D9' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
            {salvando ? 'Salvando…' : 'Salvar & Imprimir PDF'}
          </button>
        </div>
      </ModalBox>
    </Backdrop>
  )
}

// ─── Modal Atestado ───────────────────────────────────────────────────────────

function AtestadoModal({ profissionais, onClose, onSalvar, salvando, erro }: {
  profissionais: ProfissionalItem[]; onClose: () => void
  onSalvar: (d: Record<string, unknown>, prof: ProfissionalPDF | null) => void
  salvando: boolean; erro: string | null
}) {
  const [dias,        setDias]        = useState('')
  const [dataInicio,  setDataInicio]  = useState(new Date().toISOString().slice(0, 10))
  const [cid,         setCid]         = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [profId,      setProfId]      = useState('')
  return (
    <Backdrop onClose={onClose}>
      <ModalBox title="Emitir Atestado Médico" icon="stethoscope" iconColor="#065F46" onClose={onClose}>
        <div className="space-y-4">
          <Field label="Profissional Responsável">
            <ProfissionalSelect profissionais={profissionais} value={profId} onChange={setProfId} color="#065F46" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dias de Afastamento">
              <input value={dias} onChange={e => setDias(e.target.value)} type="number" min="1" placeholder="Ex: 3"
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#065F46]" />
            </Field>
            <Field label="Data de Início">
              <input value={dataInicio} onChange={e => setDataInicio(e.target.value)} type="date"
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#065F46]" />
            </Field>
          </div>
          <Field label="CID (opcional — sigilo LGPD)">
            <input value={cid} onChange={e => setCid(e.target.value)} placeholder="Ex: M54.5"
              className="w-full text-sm border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#065F46]" />
          </Field>
          <Field label="Observações">
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)}
              placeholder="Informações complementares..."
              className="w-full h-20 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#065F46] resize-none" />
          </Field>
        </div>
        {erro && <ErroBanner msg={erro} />}
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9]">Cancelar</button>
          <button
            onClick={() => onSalvar(
              { dias: dias ? Number(dias) : null, data_inicio: dataInicio, cid, observacoes, profissional_id: profId || null },
              getProfissionalPDF(profissionais, profId),
            )}
            disabled={salvando}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{ background: '#065F46' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
            {salvando ? 'Salvando…' : 'Salvar & Imprimir PDF'}
          </button>
        </div>
      </ModalBox>
    </Backdrop>
  )
}

// ─── Modal Copiloto ───────────────────────────────────────────────────────────

function CopilotoModal({ onClose, onSalvar, salvando, erro }: {
  onClose: () => void; onSalvar: (d: Record<string, unknown>) => void
  salvando: boolean; erro: string | null
}) {
  const [gravando,   setGravando]   = useState(false)
  const [maximized,  setMaximized]  = useState(false)
  const [canal,      setCanal]      = useState('Presencial')
  const [pa,         setPa]         = useState('')
  const [fc,         setFc]         = useState('')
  const [temp,       setTemp]       = useState('')
  const [queixa,     setQueixa]     = useState('')
  const [anamnese,   setAnamnese]   = useState('')
  const [conduta,    setConduta]    = useState('')
  const [cid,        setCid]        = useState('')
  const [anotacoes,  setAnotacoes]  = useState('')
  const mediaRef = useRef<MediaRecorder | null>(null)

  async function toggleGravacao() {
    if (gravando) { mediaRef.current?.stop(); setGravando(false); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mr.onstop = () => stream.getTracks().forEach(t => t.stop())
      mr.start(); mediaRef.current = mr; setGravando(true)
    } catch { alert('Permita o acesso ao microfone.') }
  }

  const inputCls = 'w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2.5 outline-none focus:border-[#BE185D] bg-white'
  const taCls    = (h: string) => `w-full ${h} text-sm border border-[#E2E8F0] rounded-xl px-3 py-2.5 outline-none focus:border-[#BE185D] resize-y bg-white`

  return (
    <Backdrop onClose={onClose} wide maximized={maximized}>
      <ModalBox
        title="Copiloto Clínico por Voz (AI Scribe)"
        icon="auto_awesome" iconColor="#BE185D" onClose={onClose}
        maximizable maximized={maximized} onToggleMaximize={() => setMaximized(v => !v)}
      >

        {/* ── Faixa de gravação ── */}
        <div className="flex items-center gap-4 bg-gradient-to-r from-[#FFF1F2] to-[#F5F3FF] rounded-2xl border border-pink-100 px-5 py-4 mb-5">
          {/* Ícone mic */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
            gravando ? 'bg-red-100 animate-pulse' : 'bg-white shadow-sm'
          }`}>
            <span className="material-symbols-outlined" style={{ fontSize: 26, color: gravando ? '#EF4444' : '#BE185D' }}>
              {gravando ? 'mic' : 'mic_none'}
            </span>
          </div>
          {/* Texto + botões */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1E293B] mb-0.5">
              {gravando ? '🔴 Gravando…' : 'Grave o relato do atendimento'}
            </p>
            <p className="text-xs text-[#64748B]">
              {gravando ? 'Clique em Parar quando terminar. A IA estruturará a consulta automaticamente.' : 'Nossa IA transcreve e estrutura em termos clínicos e sinais vitais.'}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={toggleGravacao}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white ${gravando ? 'bg-red-500 hover:bg-red-600' : 'hover:opacity-90'}`}
              style={!gravando ? { background: 'linear-gradient(135deg,#7C3AED,#DB2777)' } : {}}>
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{gravando ? 'stop' : 'mic'}</span>
              {gravando ? 'Parar' : 'Gravar'}
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]">
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>upload</span>Upload
            </button>
          </div>
        </div>

        {/* ── Grid 2 colunas ── */}
        <div className="grid grid-cols-2 gap-x-5 gap-y-4">

          {/* Coluna esquerda */}
          <div className="space-y-4">
            <Field label="Canal de Atendimento *">
              <select value={canal} onChange={e => setCanal(e.target.value)} className={inputCls}>
                {['Presencial', 'Teleconsulta', 'Domiciliar'].map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>

            <Field label="Queixa Principal *">
              <input value={queixa} onChange={e => setQueixa(e.target.value)}
                placeholder="Ex: Cefaleia constante com picos febris..."
                className={inputCls} />
            </Field>

            <Field label="Anamnese / Histórico Clínico">
              <textarea value={anamnese} onChange={e => setAnamnese(e.target.value)}
                placeholder="Descreva o histórico clínico e achados do exame..."
                className={taCls('h-[108px]')} />
            </Field>

            <Field label="Conduta Terapêutica / Prescrição">
              <textarea value={conduta} onChange={e => setConduta(e.target.value)}
                placeholder="Medicamentos, encaminhamentos e recomendações..."
                className={taCls('h-[88px]')} />
            </Field>
          </div>

          {/* Coluna direita */}
          <div className="space-y-4">
            {/* Sinais Vitais */}
            <div className="bg-[#FFF1F2] rounded-xl border border-pink-100 p-3">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#BE185D' }}>favorite</span>
                <span className="text-xs font-bold text-[#BE185D] uppercase tracking-wide">Sinais Vitais</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['PA',       'Ex: 120/80', pa,   setPa],
                  ['FC',       'Ex: 80 bpm', fc,   setFc],
                  ['Temp °C',  'Ex: 36.5',   temp, setTemp],
                ] as const).map(([l, ph, v, s]) => (
                  <div key={String(l)}>
                    <p className="text-[10px] text-[#BE185D] font-semibold mb-1">{String(l)}</p>
                    <input
                      value={String(v)}
                      onChange={e => (s as (x: string) => void)(e.target.value)}
                      placeholder={String(ph)}
                      className="w-full text-xs border border-pink-100 rounded-lg px-2 py-2 outline-none focus:border-[#BE185D] bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Field label="Hipótese Diagnóstica (CID)">
              <input value={cid} onChange={e => setCid(e.target.value)}
                placeholder="Ex: R51 — Cefaleia"
                className={inputCls} />
            </Field>

            <Field label="Anotações Internas">
              <textarea value={anotacoes} onChange={e => setAnotacoes(e.target.value)}
                placeholder="Observações administrativas, lembretes..."
                className={taCls('h-[108px]')} />
            </Field>
          </div>
        </div>

        {erro && <ErroBanner msg={erro} />}

        <div className="flex gap-2 mt-5 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9]">
            Descartar
          </button>
          <button
            onClick={() => onSalvar({ canal, queixa, anamnese, conduta, cid, anotacoes, sinais_vitais: { pa, fc, temp } })}
            disabled={salvando || !queixa.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{ background: '#1E293B' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
            {salvando ? 'Salvando…' : 'Salvar Atendimento Clínico'}
          </button>
        </div>
      </ModalBox>
    </Backdrop>
  )
}

// ─── Modal Plano ──────────────────────────────────────────────────────────────

function PlanoModal({ onClose, onSalvar, salvando, erro }: {
  onClose: () => void
  onSalvar: (p: { diagnostico_clinico: string; cid10?: string; sessoes_previstas?: number; data_inicio?: string; observacoes?: string }) => void
  salvando: boolean; erro: string | null
}) {
  const [diag,    setDiag]    = useState('')
  const [cid10,   setCid10]   = useState('')
  const [sessoes, setSessoes] = useState('')
  const [inicio,  setInicio]  = useState(new Date().toISOString().slice(0, 10))
  const [obs,     setObs]     = useState('')
  return (
    <Backdrop onClose={onClose}>
      <ModalBox title="Novo Plano de Tratamento" icon="medical_services" iconColor="#7C3AED" onClose={onClose}>
        <div className="space-y-3">
          <Field label="Diagnóstico Clínico *">
            <textarea value={diag} onChange={e => setDiag(e.target.value)}
              placeholder="Descreva o diagnóstico e conduta clínica..."
              className="w-full h-28 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#7C3AED] resize-none" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="CID-10">
              <input value={cid10} onChange={e => setCid10(e.target.value)} placeholder="Ex: M54.5"
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2.5 outline-none focus:border-[#7C3AED]" />
            </Field>
            <Field label="Sessões previstas">
              <input value={sessoes} onChange={e => setSessoes(e.target.value)} type="number" min="1" placeholder="Ex: 12"
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2.5 outline-none focus:border-[#7C3AED]" />
            </Field>
            <Field label="Data início">
              <input value={inicio} onChange={e => setInicio(e.target.value)} type="date"
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2.5 outline-none focus:border-[#7C3AED]" />
            </Field>
          </div>
          <Field label="Observações">
            <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Metas, observações..."
              className="w-full h-20 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#7C3AED] resize-none" />
          </Field>
        </div>
        {erro && <ErroBanner msg={erro} />}
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9]">Cancelar</button>
          <button
            onClick={() => onSalvar({ diagnostico_clinico: diag, cid10, sessoes_previstas: sessoes ? Number(sessoes) : undefined, data_inicio: inicio, observacoes: obs })}
            disabled={salvando || !diag.trim()}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{ background: '#7C3AED' }}>
            {salvando ? 'Salvando…' : 'Salvar Plano'}
          </button>
        </div>
      </ModalBox>
    </Backdrop>
  )
}
