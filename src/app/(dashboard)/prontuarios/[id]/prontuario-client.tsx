'use client'

import { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ProntuarioDetalhe, RegistroTimeline, TipoRegistro } from '../actions'
import {
  listarTimelineAction,
  salvarProntuarioAction,
  salvarEvolucaoAction,
  salvarDocumentoAction,
  salvarPlanoAction,
} from '../actions'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcularIdade(dataNasc: string | null): string {
  if (!dataNasc) return ''
  const nasc = new Date(dataNasc)
  const hoje = new Date()
  let age = hoje.getFullYear() - nasc.getFullYear()
  if (hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())) age--
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
  evolucao:  { label: 'Evolução',           color: '#1D4ED8', bg: '#DBEAFE', icon: 'edit_note'        },
  plano:     { label: 'Plano Tratamento',   color: '#7C3AED', bg: '#EDE9FE', icon: 'medical_services' },
  prescricao:{ label: 'Prescrição',         color: '#0369A1', bg: '#E0F2FE', icon: 'thermometer'      },
  laudo:     { label: 'Laudo Técnico',      color: '#6D28D9', bg: '#F3E8FF', icon: 'description'      },
  atestado:  { label: 'Atestado',           color: '#065F46', bg: '#D1FAE5', icon: 'stethoscope'      },
  anexo:     { label: 'Anexo',              color: '#92400E', bg: '#FEF3C7', icon: 'attach_file'      },
  copiloto:  { label: 'Copiloto IA',        color: '#BE185D', bg: '#FCE7F3', icon: 'auto_awesome'     },
}

type ModalTipo = null | 'prontuario' | 'evolucao' | 'prescricao' | 'laudo' | 'atestado' | 'anexo' | 'copiloto' | 'plano'
type FiltroTimeline = 'todos' | TipoRegistro

// ─── Impressão de documento ────────────────────────────────────────────────────

function imprimirDocumento(titulo: string, conteudo: string) {
  const win = window.open('', '_blank', 'width=800,height=600')
  if (!win) return
  win.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${titulo}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
        h1 { font-size: 18px; margin-bottom: 8px; }
        .sub { color: #666; font-size: 13px; margin-bottom: 32px; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
        .content { font-size: 14px; white-space: pre-wrap; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>${titulo}</h1>
      <div class="sub">Data de emissão: ${new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })}</div>
      <div class="content">${conteudo.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
    </body>
    </html>
  `)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 400)
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ProntuarioClient({
  detalhe,
  timelineInicial,
}: {
  detalhe:         ProntuarioDetalhe
  timelineInicial: RegistroTimeline[]
}) {
  const router = useRouter()
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
      const res = await listarTimelineAction(paciente.id, f)
      if ('data' in res) setTimeline(res.data)
    })
  }

  function toggleExpand(id: string) {
    setExpandido(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function recarregarTimeline() {
    const res = await listarTimelineAction(paciente.id, filtro)
    if ('data' in res) setTimeline(res.data)
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
    imprimir?: () => void,
  ) {
    setSalvando(true); setErro(null)
    const res = await salvarDocumentoAction(paciente.id, tipo, dados)
    setSalvando(false)
    if ('error' in res) { setErro(res.error); return }
    setModal(null)
    imprimir?.()
    await recarregarTimeline()
  }

  async function handleSalvarPlano(payload: Parameters<typeof salvarPlanoAction>[1]) {
    setSalvando(true); setErro(null)
    const res = await salvarPlanoAction(paciente.id, payload)
    setSalvando(false)
    if ('error' in res) { setErro(res.error); return }
    setModal(null); await recarregarTimeline()
  }

  const filtrosTabs: { key: FiltroTimeline; label: string }[] = [
    { key: 'todos',     label: 'Todos'        },
    { key: 'evolucao',  label: 'Evoluções'    },
    { key: 'prescricao',label: 'Prescrições'  },
    { key: 'laudo',     label: 'Laudos'       },
    { key: 'atestado',  label: 'Atestados'    },
    { key: 'anexo',     label: 'Anexos'       },
    { key: 'plano',     label: 'Planos'       },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#EDEFF3' }}>
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <button onClick={() => router.push('/prontuarios')} className="text-[#64748B] hover:text-[#1E293B] transition-colors">
            Prontuários
          </button>
          <span className="text-[#CBD5E1]">/</span>
          <span className="text-[#1E293B] font-medium truncate">{paciente.nome}</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm px-6 py-5 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-white text-lg flex-shrink-0"
              style={{ background: '#3B82F6' }}>
              {paciente.foto_url
                ? <img src={paciente.foto_url} alt="" className="w-full h-full rounded-full object-cover" />
                : iniciais(paciente.nome)
              }
            </div>
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
            <button onClick={() => abrirModal('prontuario')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] transition-all flex-shrink-0">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
              Dados Clínicos
            </button>
          </div>

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

        {/* ── Barra de Ações ── */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm px-4 py-3 mb-4 flex items-center gap-2 overflow-x-auto">
          {/* Anexar */}
          <ActionBtn
            label="Anexar"
            icon="attach_file"
            variant="outline"
            onClick={() => abrirModal('anexo')}
          />
          {/* Prescrição */}
          <ActionBtn
            label="Prescrição"
            icon="thermometer"
            color="#0369A1"
            onClick={() => abrirModal('prescricao')}
          />
          {/* Laudo Técnico */}
          <ActionBtn
            label="Laudo Técnico"
            icon="description"
            color="#6D28D9"
            onClick={() => abrirModal('laudo')}
          />
          {/* Atestado */}
          <ActionBtn
            label="Atestado"
            icon="stethoscope"
            color="#065F46"
            onClick={() => abrirModal('atestado')}
          />
          {/* Copiloto IA */}
          <button
            onClick={() => abrirModal('copiloto')}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 shadow-sm ml-auto"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #DB2777)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
            Copiloto Clínico por Voz
          </button>
        </div>

        {/* ── Evolução rápida ── */}
        <EvolucaoRapida onSalvar={handleSalvarEvolucao} salvando={salvando} />

        {/* ── Filtros ── */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1 mt-4">
          {filtrosTabs.map(tab => (
            <button key={tab.key} onClick={() => handleFiltro(tab.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filtro === tab.key
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Timeline ── */}
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
                          style={{ background: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                        {reg.profissional_nome && <span className="text-xs text-[#94A3B8]">{reg.profissional_nome}</span>}
                        <span className="text-xs text-[#CBD5E1] ml-auto">{formatarDataHora(reg.criado_em)}</span>
                      </div>
                      <p className="text-sm text-[#334155] line-clamp-2">{reg.resumo}</p>
                    </div>
                    <span className="material-symbols-outlined flex-shrink-0 text-[#CBD5E1] transition-transform"
                      style={{ fontSize: 18, transform: aberto ? 'rotate(90deg)' : 'none' }}>
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
      {modal === 'anexo' && (
        <AnexarModal pacienteId={paciente.id} onClose={() => setModal(null)}
          onSalvar={(dados) => handleSalvarDoc('anexo', dados)}
          salvando={salvando} erro={erro} />
      )}
      {modal === 'prescricao' && (
        <PrescricaoModal onClose={() => setModal(null)}
          onSalvar={(dados) => handleSalvarDoc('prescricao', dados, () => {
            const uso = String(dados.uso ?? '')
            const meds = String(dados.medicamentos ?? '')
            const pos = String(dados.posologia ?? '')
            imprimirDocumento('Prescrição Médica',
              `Uso: ${uso}\n\nMedicamento(s):\n${meds}\n\nPosologia / Recomendações:\n${pos}`)
          })}
          salvando={salvando} erro={erro} />
      )}
      {modal === 'laudo' && (
        <LaudoModal onClose={() => setModal(null)}
          onSalvar={(dados) => handleSalvarDoc('laudo', dados, () => {
            imprimirDocumento(String(dados.titulo ?? 'Laudo Técnico'), String(dados.corpo ?? ''))
          })}
          salvando={salvando} erro={erro} />
      )}
      {modal === 'atestado' && (
        <AtestadoModal onClose={() => setModal(null)}
          onSalvar={(dados) => handleSalvarDoc('atestado', dados, () => {
            imprimirDocumento('Atestado Médico',
              `Atesto que o(a) paciente necessita de afastamento de ${dados.dias ?? '—'} dia(s)\n` +
              `Data de início: ${dados.data_inicio ?? ''}\n` +
              (dados.cid ? `CID: ${dados.cid}\n` : '') +
              (dados.observacoes ? `\nObservações: ${dados.observacoes}` : ''))
          })}
          salvando={salvando} erro={erro} />
      )}
      {modal === 'copiloto' && (
        <CopilotoModal onClose={() => setModal(null)}
          onSalvar={(dados) => handleSalvarDoc('copiloto', dados)}
          salvando={salvando} erro={erro} />
      )}
      {modal === 'plano' && (
        <PlanoModal onClose={() => setModal(null)}
          onSalvar={handleSalvarPlano}
          salvando={salvando} erro={erro} />
      )}
    </div>
  )
}

// ─── Botão de ação ────────────────────────────────────────────────────────────

function ActionBtn({ label, icon, color, variant, onClick }: {
  label: string; icon: string; color?: string
  variant?: 'outline'; onClick: () => void
}) {
  if (variant === 'outline') {
    return (
      <button onClick={onClick}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border border-dashed border-[#CBD5E1] text-[#64748B] hover:border-[#94A3B8] hover:text-[#334155] transition-all">
        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{icon}</span>
        {label}
      </button>
    )
  }
  return (
    <button onClick={onClick}
      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
      style={{ color, borderColor: color + '40', background: color + '10' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 15, color }}>{icon}</span>
      {label}
    </button>
  )
}

// ─── Evolução Rápida (inline) ─────────────────────────────────────────────────

function EvolucaoRapida({ onSalvar, salvando }: { onSalvar: (c: string) => void; salvando: boolean }) {
  const [texto, setTexto]     = useState('')
  const [aberto, setAberto]   = useState(false)

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)}
        className="w-full flex items-center gap-3 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm px-5 py-3.5 text-sm text-[#94A3B8] hover:text-[#64748B] hover:border-[#CBD5E1] transition-all text-left">
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#3B82F6' }}>edit_note</span>
        Registrar nova evolução clínica...
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#3B82F6] shadow-sm px-5 py-4">
      <textarea
        autoFocus
        value={texto}
        onChange={e => setTexto(e.target.value)}
        placeholder="Descreva a evolução clínica, queixas, condutas adotadas, resposta ao tratamento..."
        className="w-full h-28 text-sm text-[#334155] placeholder:text-[#94A3B8] outline-none resize-none"
      />
      <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-[#F1F5F9]">
        <button onClick={() => { setAberto(false); setTexto('') }}
          className="px-3 py-1.5 text-sm text-[#64748B] hover:text-[#334155]">Cancelar</button>
        <button
          onClick={() => { onSalvar(texto); setTexto(''); setAberto(false) }}
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

function DetalheRegistro({ reg }: { reg: RegistroTimeline }) {
  const d = reg.dados

  if (reg.tipo === 'evolucao') {
    return <div className="mt-3 text-sm text-[#334155] whitespace-pre-line leading-relaxed">{String(d.conteudo ?? '')}</div>
  }

  if (reg.tipo === 'prescricao') {
    return (
      <div className="mt-3 space-y-2 text-sm">
        {Boolean(d.uso) && <p><span className="font-semibold text-[#64748B]">Uso:</span> {String(d.uso)}</p>}
        {Boolean(d.medicamentos) && (
          <div>
            <p className="font-semibold text-[#64748B] mb-1">Medicamento(s):</p>
            <p className="whitespace-pre-line text-[#334155]">{String(d.medicamentos)}</p>
          </div>
        )}
        {Boolean(d.posologia) && (
          <div>
            <p className="font-semibold text-[#64748B] mb-1">Posologia / Recomendações:</p>
            <p className="whitespace-pre-line text-[#334155]">{String(d.posologia)}</p>
          </div>
        )}
      </div>
    )
  }

  if (reg.tipo === 'laudo') {
    return (
      <div className="mt-3 space-y-2 text-sm">
        {Boolean(d.titulo) && <p className="font-semibold text-[#1E293B]">{String(d.titulo)}</p>}
        {Boolean(d.corpo) && <p className="whitespace-pre-line text-[#334155] leading-relaxed">{String(d.corpo)}</p>}
      </div>
    )
  }

  if (reg.tipo === 'atestado') {
    return (
      <div className="mt-3 space-y-1.5 text-sm">
        {Boolean(d.dias)        && <p><span className="font-semibold text-[#64748B]">Dias de afastamento:</span> {String(d.dias)}</p>}
        {Boolean(d.data_inicio) && <p><span className="font-semibold text-[#64748B]">Data de início:</span> {formatarData(String(d.data_inicio))}</p>}
        {Boolean(d.cid)         && <p><span className="font-semibold text-[#64748B]">CID:</span> {String(d.cid)}</p>}
        {Boolean(d.observacoes) && <p className="text-[#64748B] mt-2">{String(d.observacoes)}</p>}
      </div>
    )
  }

  if (reg.tipo === 'anexo') {
    const url  = String(d.url  ?? '')
    const nome = String(d.nome ?? 'Arquivo')
    const mime = String(d.tipo_mime ?? '')
    const isImg = mime.startsWith('image/')
    return (
      <div className="mt-3">
        {Boolean(d.comentario) && <p className="text-sm text-[#64748B] mb-2">{String(d.comentario)}</p>}
        {url ? (
          isImg
            ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={nome} className="max-h-48 rounded-lg border border-[#E2E8F0]" /></a>
            : <a href={url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#3B82F6] hover:bg-[#EFF6FF]">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>attach_file</span>{nome}
              </a>
        ) : (
          <p className="text-sm text-[#94A3B8]">{nome} (sem URL)</p>
        )}
      </div>
    )
  }

  if (reg.tipo === 'copiloto') {
    return (
      <div className="mt-3 space-y-2 text-sm">
        {Boolean(d.queixa)     && <p><span className="font-semibold text-[#64748B]">Queixa:</span> {String(d.queixa)}</p>}
        {Boolean(d.anamnese)   && <div><p className="font-semibold text-[#64748B] mb-0.5">Anamnese:</p><p className="whitespace-pre-line text-[#334155]">{String(d.anamnese)}</p></div>}
        {Boolean(d.conduta)    && <div><p className="font-semibold text-[#64748B] mb-0.5">Conduta:</p><p className="whitespace-pre-line text-[#334155]">{String(d.conduta)}</p></div>}
        {Boolean(d.cid)        && <p><span className="font-semibold text-[#64748B]">Hipótese (CID):</span> {String(d.cid)}</p>}
        {Boolean(d.anotacoes)  && <p className="text-[#94A3B8] italic">{String(d.anotacoes)}</p>}
        {Boolean(d.sinais_vitais) && typeof d.sinais_vitais === 'object' && (
          <div className="flex gap-3 text-xs text-[#64748B] mt-1">
            {Boolean((d.sinais_vitais as Record<string,unknown>).pa)   && <span>PA: {String((d.sinais_vitais as Record<string,unknown>).pa)}</span>}
            {Boolean((d.sinais_vitais as Record<string,unknown>).fc)   && <span>FC: {String((d.sinais_vitais as Record<string,unknown>).fc)}</span>}
            {Boolean((d.sinais_vitais as Record<string,unknown>).temp) && <span>Temp: {String((d.sinais_vitais as Record<string,unknown>).temp)}°C</span>}
          </div>
        )}
      </div>
    )
  }

  if (reg.tipo === 'plano') {
    const statusLabel: Record<string, string> = { ativo:'Ativo', reavaliacao:'Reavaliação', alta:'Alta', encerrado:'Encerrado' }
    return (
      <div className="mt-3 space-y-2 text-sm">
        <p className="text-[#334155]">{String(d.diagnostico_clinico ?? '')}</p>
        <div className="flex flex-wrap gap-3 text-xs text-[#64748B]">
          {Boolean(d.cid10)              && <span>CID-10: {String(d.cid10)}</span>}
          {Boolean(d.sessoes_previstas)  && <span>Sessões previstas: {String(d.sessoes_previstas)}</span>}
          {Boolean(d.sessoes_realizadas) && <span>Realizadas: {String(d.sessoes_realizadas)}</span>}
          {Boolean(d.data_inicio)        && <span>Início: {formatarData(String(d.data_inicio))}</span>}
          {Boolean(d.status) && (
            <span className={`px-2 py-0.5 rounded-full font-semibold ${d.status==='ativo'?'bg-green-100 text-green-700':d.status==='alta'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-600'}`}>
              {statusLabel[String(d.status)] ?? String(d.status)}
            </span>
          )}
        </div>
      </div>
    )
  }

  return null
}

// ─── Utilitários de modal ─────────────────────────────────────────────────────

function Backdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.6)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

function ModalBox({ title, icon, iconColor, onClose, children }: {
  title: string; icon?: string; iconColor?: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-[#F1F5F9]">
        {icon && <span className="material-symbols-outlined" style={{ fontSize: 20, color: iconColor }}>{icon}</span>}
        <h2 className="font-bold text-[#1E293B] flex-1">{title}</h2>
        <button onClick={onClose} className="text-[#94A3B8] hover:text-[#64748B]">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function ErroBanner({ msg }: { msg: string }) {
  return <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">{msg}</div>
}

function ModalFooter({ onClose, onSave, saveLabel, color, disabled }: {
  onClose: () => void; onSave: () => void; saveLabel: string; color: string; disabled?: boolean
}) {
  return (
    <div className="flex gap-2 mt-5 justify-end">
      <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9] transition-colors">
        Cancelar
      </button>
      <button onClick={onSave} disabled={disabled}
        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
        style={{ background: color }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
        {saveLabel}
      </button>
    </div>
  )
}

// ─── Modal Dados Clínicos Base ────────────────────────────────────────────────

function ProntuarioBaseModal({ prontuario, onClose, onSalvar, salvando, erro }: {
  prontuario: ProntuarioDetalhe['prontuario']
  onClose: () => void; onSalvar: (p: { alergias?: string; antecedentes?: string; medicamentos?: string }) => void
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
            <input value={alergias} onChange={e => setAlergias(e.target.value)} placeholder="Ex: Dipirona, látex..."
              className="w-full text-sm border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#3B82F6]" />
          </Field>
          <Field label="Medicamentos em uso">
            <textarea value={medicamentos} onChange={e => setMedicamentos(e.target.value)}
              placeholder="Liste os medicamentos em uso contínuo..."
              className="w-full h-20 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#3B82F6] resize-none" />
          </Field>
          <Field label="Antecedentes / Histórico">
            <textarea value={antecedentes} onChange={e => setAntecedentes(e.target.value)}
              placeholder="Cirurgias anteriores, patologias, histórico familiar..."
              className="w-full h-24 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#3B82F6] resize-none" />
          </Field>
        </div>
        {erro && <ErroBanner msg={erro} />}
        <ModalFooter onClose={onClose} onSave={() => onSalvar({ alergias, antecedentes, medicamentos })}
          saveLabel={salvando ? 'Salvando…' : 'Salvar'} color="#3B82F6" disabled={salvando} />
      </ModalBox>
    </Backdrop>
  )
}

// ─── Modal Anexar ─────────────────────────────────────────────────────────────

function AnexarModal({ pacienteId, onClose, onSalvar, salvando, erro }: {
  pacienteId: string; onClose: () => void
  onSalvar: (d: Record<string, unknown>) => void
  salvando: boolean; erro: string | null
}) {
  const [nome,       setNome]       = useState('')
  const [comentario, setComentario] = useState('')
  const [uploading,  setUploading]  = useState(false)
  const [fileUrl,    setFileUrl]    = useState('')
  const [fileMime,   setFileMime]   = useState('')
  const inputRef  = useRef<HTMLInputElement>(null)
  const input2Ref = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!nome) setNome(file.name)
    setFileMime(file.type)
    setUploading(true)
    try {
      const supabase = createClient()
      const ext  = file.name.split('.').pop()
      const path = `${pacienteId}/${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('prontuarios').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: pub } = supabase.storage.from('prontuarios').getPublicUrl(data.path)
      setFileUrl(pub.publicUrl)
    } catch {
      // bucket pode não existir — salva sem URL
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
              className="w-full text-sm border-2 border-[#3B82F6] rounded-xl px-4 py-2.5 outline-none focus:border-[#2563EB]" />
          </Field>
          <Field label="Comentário / Observações">
            <textarea value={comentario} onChange={e => setComentario(e.target.value)}
              placeholder="Observações ou anotações sobre este documento..."
              className="w-full h-20 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#3B82F6] resize-none" />
          </Field>

          {fileUrl ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
              Arquivo enviado com sucesso
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFile} />
              <input ref={input2Ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              <button onClick={() => inputRef.current?.click()} disabled={uploading}
                className="flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-dashed border-[#E2E8F0] text-[#94A3B8] hover:border-[#CBD5E1] hover:text-[#64748B] transition-all">
                <span className="material-symbols-outlined" style={{ fontSize: 32 }}>description</span>
                <span className="text-sm font-medium">Documento/PDF</span>
              </button>
              <button onClick={() => input2Ref.current?.click()} disabled={uploading}
                className="flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-dashed border-[#E2E8F0] text-[#94A3B8] hover:border-[#CBD5E1] hover:text-[#64748B] transition-all">
                <span className="material-symbols-outlined" style={{ fontSize: 32 }}>photo_camera</span>
                <span className="text-sm font-medium">Imagem/Foto</span>
              </button>
            </div>
          )}
        </div>
        {erro && <ErroBanner msg={erro} />}
        <ModalFooter onClose={onClose}
          onSave={() => onSalvar({ nome, comentario, url: fileUrl, tipo_mime: fileMime })}
          saveLabel={uploading ? 'Enviando…' : salvando ? 'Salvando…' : 'Salvar Anexo'}
          color="#92400E" disabled={salvando || uploading || !nome.trim()} />
      </ModalBox>
    </Backdrop>
  )
}

// ─── Modal Prescrição ─────────────────────────────────────────────────────────

function PrescricaoModal({ onClose, onSalvar, salvando, erro }: {
  onClose: () => void; onSalvar: (d: Record<string, unknown>) => void
  salvando: boolean; erro: string | null
}) {
  const [uso,         setUso]         = useState('Uso Interno')
  const [medicamentos,setMedicamentos]= useState('')
  const [posologia,   setPosologia]   = useState('')
  return (
    <Backdrop onClose={onClose}>
      <ModalBox title="Nova Prescrição Médica" icon="thermometer" iconColor="#0369A1" onClose={onClose}>
        <div className="space-y-4">
          <Field label="Uso">
            <select value={uso} onChange={e => setUso(e.target.value)}
              className="w-full text-sm border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#0369A1] bg-white">
              <option>Uso Interno</option>
              <option>Uso Externo</option>
              <option>Uso Tópico</option>
              <option>Uso Injetável</option>
              <option>Uso Inalatório</option>
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
        <ModalFooter onClose={onClose}
          onSave={() => onSalvar({ uso, medicamentos, posologia })}
          saveLabel={salvando ? 'Salvando…' : 'Salvar & Imprimir PDF'}
          color="#0369A1" disabled={salvando || !medicamentos.trim()} />
      </ModalBox>
    </Backdrop>
  )
}

// ─── Modal Laudo Técnico ──────────────────────────────────────────────────────

function LaudoModal({ onClose, onSalvar, salvando, erro }: {
  onClose: () => void; onSalvar: (d: Record<string, unknown>) => void
  salvando: boolean; erro: string | null
}) {
  const [titulo, setTitulo] = useState('Laudo Médico Especializado')
  const [corpo,  setCorpo]  = useState('')
  return (
    <Backdrop onClose={onClose}>
      <ModalBox title="Emitir Laudo Técnico" icon="description" iconColor="#6D28D9" onClose={onClose}>
        <div className="space-y-4">
          <Field label="Título do Documento">
            <input value={titulo} onChange={e => setTitulo(e.target.value)}
              className="w-full text-sm border-2 border-[#6D28D9] rounded-xl px-4 py-2.5 outline-none focus:border-[#5B21B6]" />
          </Field>
          <Field label="Corpo do Laudo / Parecer *">
            <textarea value={corpo} onChange={e => setCorpo(e.target.value)}
              placeholder="Descreva o parecer técnico detalhadamente..."
              className="w-full h-40 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#6D28D9] resize-none" />
          </Field>
        </div>
        {erro && <ErroBanner msg={erro} />}
        <ModalFooter onClose={onClose}
          onSave={() => onSalvar({ titulo, corpo })}
          saveLabel={salvando ? 'Salvando…' : 'Salvar & Imprimir PDF'}
          color="#6D28D9" disabled={salvando || !corpo.trim()} />
      </ModalBox>
    </Backdrop>
  )
}

// ─── Modal Atestado ───────────────────────────────────────────────────────────

function AtestadoModal({ onClose, onSalvar, salvando, erro }: {
  onClose: () => void; onSalvar: (d: Record<string, unknown>) => void
  salvando: boolean; erro: string | null
}) {
  const [dias,       setDias]       = useState('')
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0,10))
  const [cid,        setCid]        = useState('')
  const [observacoes,setObservacoes]= useState('')
  return (
    <Backdrop onClose={onClose}>
      <ModalBox title="Emitir Atestado Médico" icon="stethoscope" iconColor="#065F46" onClose={onClose}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dias de Afastamento">
              <input value={dias} onChange={e => setDias(e.target.value)} type="number" min="1"
                placeholder="Ex: 3"
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#065F46]" />
            </Field>
            <Field label="Data de Início">
              <input value={dataInicio} onChange={e => setDataInicio(e.target.value)} type="date"
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#065F46]" />
            </Field>
          </div>
          <Field label="CID (opcional)">
            <input value={cid} onChange={e => setCid(e.target.value)} placeholder="Ex: M54.5 — pode ser omitido (LGPD)"
              className="w-full text-sm border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#065F46]" />
          </Field>
          <Field label="Observações">
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)}
              placeholder="Informações complementares..."
              className="w-full h-20 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#065F46] resize-none" />
          </Field>
        </div>
        {erro && <ErroBanner msg={erro} />}
        <ModalFooter onClose={onClose}
          onSave={() => onSalvar({ dias: dias ? Number(dias) : null, data_inicio: dataInicio, cid, observacoes })}
          saveLabel={salvando ? 'Salvando…' : 'Salvar & Imprimir PDF'}
          color="#065F46" disabled={salvando} />
      </ModalBox>
    </Backdrop>
  )
}

// ─── Modal Copiloto Clínico por Voz ──────────────────────────────────────────

function CopilotoModal({ onClose, onSalvar, salvando, erro }: {
  onClose: () => void; onSalvar: (d: Record<string, unknown>) => void
  salvando: boolean; erro: string | null
}) {
  const [gravando,    setGravando]    = useState(false)
  const [canal,       setCanal]       = useState('Presencial')
  const [profissional,setProfissional]= useState('')
  const [pa,          setPa]          = useState('')
  const [fc,          setFc]          = useState('')
  const [temp,        setTemp]        = useState('')
  const [queixa,      setQueixa]      = useState('')
  const [anamnese,    setAnamnese]    = useState('')
  const [conduta,     setConduta]     = useState('')
  const [cid,         setCid]         = useState('')
  const [anotacoes,   setAnotacoes]   = useState('')

  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function toggleGravacao() {
    if (gravando) {
      mediaRef.current?.stop()
      setGravando(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        // Aqui poderia transcrever via OpenAI Whisper
      }
      mr.start()
      mediaRef.current = mr
      setGravando(true)
    } catch {
      alert('Permita o acesso ao microfone para usar esta função.')
    }
  }

  const dados = {
    canal, profissional, queixa, anamnese, conduta, cid, anotacoes,
    sinais_vitais: { pa, fc, temp },
  }

  return (
    <Backdrop onClose={onClose}>
      <ModalBox title="Copiloto Clínico por Voz (AI Scribe)" icon="auto_awesome" iconColor="#BE185D" onClose={onClose}>
        <p className="text-xs text-[#64748B] mb-4">
          Grave o relato do atendimento ou faça o upload de áudio. Nossa IA estruturará sua consulta
          em termos médicos estruturados e sinais vitais.
        </p>

        {/* Gravador */}
        <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-6 flex flex-col items-center gap-3 mb-5">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
            gravando ? 'bg-red-100 shadow-lg shadow-red-200 animate-pulse' : 'bg-[#EDE9FE]'
          }`}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: gravando ? '#EF4444' : '#7C3AED' }}>
              {gravando ? 'mic' : 'mic_none'}
            </span>
          </div>
          <p className="text-xs text-[#64748B]">
            {gravando ? 'Gravando... clique para parar' : 'Clique no microfone para iniciar a gravação'}
          </p>
          <div className="flex gap-2">
            <button onClick={toggleGravacao}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all ${
                gravando ? 'bg-red-500 hover:bg-red-600' : 'hover:opacity-90'
              }`}
              style={!gravando ? { background: 'linear-gradient(135deg,#7C3AED,#DB2777)' } : {}}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{gravando ? 'stop' : 'mic'}</span>
              {gravando ? 'Parar' : 'Gravar Relato'}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>upload</span>
              Upload de Áudio
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Profissional + Canal */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Profissional Responsável *">
              <input value={profissional} onChange={e => setProfissional(e.target.value)}
                placeholder="Nome do profissional"
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2.5 outline-none focus:border-[#BE185D]" />
            </Field>
            <Field label="Canal de Atendimento *">
              <select value={canal} onChange={e => setCanal(e.target.value)}
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2.5 outline-none focus:border-[#BE185D] bg-white">
                <option>Presencial</option>
                <option>Teleconsulta</option>
                <option>Domiciliar</option>
              </select>
            </Field>
          </div>

          {/* Sinais Vitais */}
          <div className="bg-[#FFF1F2] rounded-xl p-3 border border-pink-100">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#BE185D' }}>favorite</span>
              <span className="text-xs font-bold text-[#BE185D] uppercase tracking-wide">Sinais Vitais do Atendimento</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label:'Pressão Arterial (PA)', placeholder:'Ex: 120/80', value:pa, set:setPa },
                { label:'Freq. Cardíaca (FC)',   placeholder:'Ex: 80 bpm',  value:fc, set:setFc },
                { label:'Temperatura (°C)',      placeholder:'Ex: 36.5',    value:temp, set:setTemp },
              ].map(f => (
                <div key={f.label}>
                  <p className="text-[10px] text-[#94A3B8] mb-1">{f.label}</p>
                  <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    className="w-full text-xs border border-[#E2E8F0] rounded-lg px-2 py-2 outline-none focus:border-[#BE185D] bg-white" />
                </div>
              ))}
            </div>
          </div>

          <Field label="Queixa Principal *">
            <input value={queixa} onChange={e => setQueixa(e.target.value)}
              placeholder="Ex: Cefaleia constante acompanhada de picos febris..."
              className="w-full text-sm border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#BE185D]" />
          </Field>
          <Field label="Anamnese / Histórico Clínico">
            <textarea value={anamnese} onChange={e => setAnamnese(e.target.value)}
              placeholder="Descreva o histórico clínico e achados do exame do paciente..."
              className="w-full h-24 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#BE185D] resize-none" />
          </Field>
          <Field label="Conduta Terapêutica / Prescrição">
            <textarea value={conduta} onChange={e => setConduta(e.target.value)}
              placeholder="Medicamentos orientados, encaminhamentos e recomendações..."
              className="w-full h-24 text-sm border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#BE185D] resize-none" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hipótese Diagnóstica (CID)">
              <input value={cid} onChange={e => setCid(e.target.value)}
                placeholder="Ex: Cefaleia holocraniana (CID R51)"
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2.5 outline-none focus:border-[#BE185D]" />
            </Field>
            <Field label="Anotações Internas">
              <input value={anotacoes} onChange={e => setAnotacoes(e.target.value)}
                placeholder="Observações administrativas..."
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2.5 outline-none focus:border-[#BE185D]" />
            </Field>
          </div>
        </div>

        {erro && <ErroBanner msg={erro} />}
        <div className="flex gap-2 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9] transition-colors">
            Descartar
          </button>
          <button onClick={() => onSalvar(dados)} disabled={salvando || !queixa.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: '#1E293B' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
            {salvando ? 'Salvando…' : 'Salvar Atendimento Clínico'}
          </button>
        </div>
      </ModalBox>
    </Backdrop>
  )
}

// ─── Modal Plano de Tratamento ────────────────────────────────────────────────

function PlanoModal({ onClose, onSalvar, salvando, erro }: {
  onClose: () => void
  onSalvar: (p: { diagnostico_clinico: string; cid10?: string; sessoes_previstas?: number; data_inicio?: string; observacoes?: string }) => void
  salvando: boolean; erro: string | null
}) {
  const [diag,    setDiag]    = useState('')
  const [cid10,   setCid10]   = useState('')
  const [sessoes, setSessoes] = useState('')
  const [inicio,  setInicio]  = useState(new Date().toISOString().slice(0,10))
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
        <ModalFooter onClose={onClose}
          onSave={() => onSalvar({ diagnostico_clinico: diag, cid10, sessoes_previstas: sessoes ? Number(sessoes) : undefined, data_inicio: inicio, observacoes: obs })}
          saveLabel={salvando ? 'Salvando…' : 'Salvar Plano'} color="#7C3AED" disabled={salvando || !diag.trim()} />
      </ModalBox>
    </Backdrop>
  )
}

// ─── Helper Field ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#64748B] mb-1.5">{label}</label>
      {children}
    </div>
  )
}
