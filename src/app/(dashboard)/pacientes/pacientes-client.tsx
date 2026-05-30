'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Plus, Search, X, Users, Zap, GraduationCap, ClipboardList,
  Banknote, History, ExternalLink, Paperclip, PenLine,
  Pencil, UserX, UserCheck, MoreHorizontal, ChevronRight,
} from 'lucide-react'
import { PacienteForm, type PacienteCompleto } from '@/components/pacientes/paciente-form'
import { PacienteRapidoForm } from '@/components/pacientes/paciente-rapido-form'
import { MatriculaAlunoModal } from '@/components/turmas/matricula-aluno-modal'
import { AvatarUpload } from '@/components/ui/avatar-upload'
import { uploadFotoPacienteAction } from '@/app/(dashboard)/perfil/actions'
import { alterarStatusPacienteAction } from './actions'
import { formatDate } from '@/lib/utils'
import type { PlanoServico, SlotComVagas } from '@/app/(dashboard)/turmas/actions'
import { ProntuarioClient } from '@/app/(dashboard)/prontuarios/[id]/prontuario-client'
import { buscarProntuarioAction, listarTimelineAction } from '@/app/(dashboard)/prontuarios/actions'
import type { ProntuarioDetalhe, RegistroTimeline } from '@/app/(dashboard)/prontuarios/actions'

// ── Avatar clicável com upload e fallback por sexo ────────────────────────────
function AvatarPaciente({ pacienteId, nome, sexo, foto_url }: {
  pacienteId: string; nome: string; sexo: string | null; foto_url: string | null
}) {
  // Fallback colorido baseado no sexo (para o AvatarUpload mostrar quando não há foto)
  // AvatarUpload usa iniciais; customizamos cor via className não disponível,
  // então quando não há foto e há sexo, mostramos ícone de gênero sobreposto.
  return (
    <div className="relative flex-shrink-0">
      <AvatarUpload
        name={nome}
        src={foto_url}
        size={36}
        onUpload={(fd) => uploadFotoPacienteAction(pacienteId, fd)}
      />
    </div>
  )
}

// ── Célula de ações com menu de contexto ─────────────────────────────────────
interface AcaoItem {
  key: string
  icon: React.ReactNode
  label: string
  color: string
  href?: string
  onClick?: () => void
  disabled?: boolean
}

function AcoesCell({
  p,
  onEditar,
}: {
  p: PacienteRow
  onEditar: () => void
}) {
  const router = useRouter()
  const [menuAberto, setMenuAberto] = useState(false)
  const [menuPos,    setMenuPos]    = useState({ top: 0, right: 0 })
  const [ocupado,    setOcupado]    = useState(false)
  const btnRef  = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fechar ao clicar fora ou rolar
  useEffect(() => {
    if (!menuAberto) return
    function onOut(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current  && !btnRef.current.contains(e.target as Node)
      ) setMenuAberto(false)
    }
    function onScroll() { setMenuAberto(false) }
    document.addEventListener('mousedown', onOut)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onOut)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [menuAberto])

  function abrirMenu() {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    setMenuAberto(v => !v)
  }

  async function handleStatus() {
    const inativo   = p.status === 'inativo'
    const novoStatus = inativo ? 'ativo' : 'inativo'
    const msg = inativo
      ? `Reativar "${p.nome}"?`
      : `Desativar "${p.nome}"? O paciente será marcado como inativo.`
    if (!confirm(msg)) return
    setOcupado(true)
    const res = await alterarStatusPacienteAction(p.id, novoStatus)
    setOcupado(false)
    setMenuAberto(false)
    if (res && 'error' in res) alert(res.error)
    else router.refresh()
  }

  const isInativo = p.status === 'inativo'

  const acoes: AcaoItem[] = [
    {
      key: 'financeiro',
      icon: <Banknote size={14} />,
      label: 'Financeiro',
      color: '#27AE60',
      href: `/financeiro?paciente=${p.id}`,
    },
    {
      key: 'historico',
      icon: <History size={14} />,
      label: 'Histórico de Atendimentos',
      color: '#3498DB',
      href: `/agenda?paciente=${p.id}`,
    },
    {
      key: 'pagina',
      icon: <ExternalLink size={14} />,
      label: 'Página do Paciente',
      color: '#9B59B6',
      href: `/pacientes/${p.id}`,
    },
    {
      key: 'arquivo',
      icon: <Paperclip size={14} />,
      label: 'Adicionar Arquivo',
      color: '#F39C12',
      href: `/prontuarios/${p.id}?novo=arquivo`,
    },
    {
      key: 'anotacao',
      icon: <PenLine size={14} />,
      label: 'Adicionar Anotação',
      color: '#1ABC9C',
      href: `/prontuarios/${p.id}?novo=anotacao`,
    },
    {
      key: 'editar',
      icon: <Pencil size={14} />,
      label: 'Editar Perfil',
      color: '#4A3AE8',
      onClick: onEditar,
    },
    {
      key: 'status',
      icon: isInativo ? <UserCheck size={14} /> : <UserX size={14} />,
      label: isInativo ? 'Reativar Paciente' : 'Desativar Paciente',
      color: isInativo ? '#27AE60' : '#E74C3C',
      onClick: handleStatus,
      disabled: ocupado,
    },
  ]

  return (
    <div className="flex items-center gap-1 justify-end">
      {acoes.map(a =>
        a.href ? (
          <Link
            key={a.key}
            href={a.href}
            title={a.label}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 hover:brightness-90"
            style={{ background: `${a.color}18`, color: a.color }}
          >
            {a.icon}
          </Link>
        ) : (
          <button
            key={a.key}
            onClick={a.onClick}
            title={a.label}
            disabled={a.disabled}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 hover:brightness-90 disabled:opacity-40"
            style={{ background: `${a.color}18`, color: a.color }}
          >
            {a.icon}
          </button>
        )
      )}

      {/* ⋯ mais opções */}
      <button
        ref={btnRef}
        onClick={abrirMenu}
        title="Mais opções"
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors text-[#7F8C8D] bg-[#F4F4F4] hover:bg-[#E8E8E8]"
      >
        <MoreHorizontal size={14} />
      </button>

      {menuAberto && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="bg-white border border-[#E8E8E8] rounded-2xl shadow-2xl py-1.5 min-w-[230px]"
        >
          {acoes.map(a =>
            a.href ? (
              <Link
                key={a.key}
                href={a.href}
                onClick={() => setMenuAberto(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#2C3E50] hover:bg-[#F8F9FA] transition-colors"
              >
                <span style={{ color: a.color }} className="flex-shrink-0">{a.icon}</span>
                {a.label}
              </Link>
            ) : (
              <button
                key={a.key}
                onClick={() => { setMenuAberto(false); a.onClick?.() }}
                disabled={a.disabled}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[#2C3E50] hover:bg-[#F8F9FA] transition-colors text-left disabled:opacity-40"
              >
                <span style={{ color: a.color }} className="flex-shrink-0">{a.icon}</span>
                {a.label}
              </button>
            )
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
type StatusFilter = 'ativos' | 'inativos' | 'alta' | 'todos'

interface Servico { id: string; nome: string }

interface PacienteRow {
  id: string
  nome: string
  cpf: string | null
  email: string | null
  data_nascimento: string | null
  sexo_biologico: string | null
  ddi: string | null
  telefone: string | null
  responsavel_id: string | null
  contato_emergencia: string | null
  observacoes: string | null
  endereco: any
  status: string
  foto_url: string | null
  token_completar: string | null
  token_expires_at: string | null
  agendamentos: { data_hora: string; status: string; servicos: { tipo: string } | null }[] | null
}

interface Props {
  pacientes: PacienteRow[]
  servicos?: Servico[]
  planosServico?: PlanoServico[]
  slotsComVagas?: SlotComVagas[]
  prontuarioCount?: Record<string, number>
  aulasSemanaisPorPaciente?: Record<string, number>
}

export function PacientesClient({ pacientes, servicos = [], planosServico = [], slotsComVagas = [], prontuarioCount = {}, aulasSemanaisPorPaciente = {} }: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const prontuarioId = searchParams.get('prontuario')

  // ── Aba activa ────────────────────────────────────────────────────────────
  const abaAtiva: 'pacientes' | 'prontuario' = prontuarioId ? 'prontuario' : 'pacientes'

  // ── Estado do prontuário carregado ────────────────────────────────────────
  const [pronDetalhe,  setPronDetalhe]  = useState<ProntuarioDetalhe | null>(null)
  const [pronTimeline, setPronTimeline] = useState<RegistroTimeline[]>([])
  const [pronLoading,  setPronLoading]  = useState(false)
  const [pronErro,     setPronErro]     = useState<string | null>(null)

  useEffect(() => {
    if (!prontuarioId) {
      setPronDetalhe(null)
      setPronTimeline([])
      setPronErro(null)
      return
    }
    let cancelled = false
    setPronLoading(true)
    setPronErro(null)
    Promise.all([
      buscarProntuarioAction(prontuarioId),
      listarTimelineAction(prontuarioId, 'todos'),
    ]).then(([ponRes, tlRes]) => {
      if (cancelled) return
      if ('error' in ponRes) {
        setPronErro(ponRes.error)
      } else {
        setPronDetalhe(ponRes.data)
      }
      if ('data' in tlRes) setPronTimeline(tlRes.data)
      setPronLoading(false)
    })
    return () => { cancelled = true }
  }, [prontuarioId])

  function voltarParaPacientes() {
    router.push('/pacientes')
  }

  // ── Lista state ───────────────────────────────────────────────────────────
  const [busca, setBusca]             = useState('')
  const [filtroStatus, setFiltroSt]   = useState<StatusFilter>('ativos')
  const [filtroVinculo, setVinculo]   = useState<'todos' | 'titulares' | 'dependentes' | 'pendentes'>('todos')

  const [novoCompleto, setNovoCompleto]     = useState(false)
  const [novoRapido, setNovoRapido]         = useState(false)
  const [editando, setEditando]             = useState<PacienteCompleto | null>(null)
  const [matriculandoPaciente, setMatriculandoPaciente] = useState<{ id: string; nome: string; telefone: string | null } | null>(null)

  // Resumo para o ResponsavelSelector
  const pacientesResumo = useMemo(
    () => pacientes.map(p => ({
      id: p.id, nome: p.nome, ddi: p.ddi, telefone: p.telefone, responsavel_id: p.responsavel_id,
    })),
    [pacientes]
  )

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return pacientes.filter(p => {
      if (filtroStatus !== 'todos' && p.status !== (filtroStatus === 'ativos' ? 'ativo' : filtroStatus === 'inativos' ? 'inativo' : 'alta')) return false
      if (filtroVinculo === 'titulares' && p.responsavel_id) return false
      if (filtroVinculo === 'dependentes' && !p.responsavel_id) return false
      if (filtroVinculo === 'pendentes' && !p.token_completar) return false
      if (q) {
        const hay = (p.nome + ' ' + (p.cpf ?? '') + ' ' + (p.telefone ?? '') + ' ' + (p.email ?? '')).toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [pacientes, busca, filtroStatus, filtroVinculo])

  const filtrosAtivos = !!(busca || filtroStatus !== 'ativos' || filtroVinculo !== 'todos')

  function limpar() {
    setBusca('')
    setFiltroSt('ativos')
    setVinculo('todos')
  }

  return (
    <div className="space-y-0">

      {/* ── Barra de abas ────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E8E8E8] rounded-2xl shadow-sm mb-5 flex items-end px-2 pt-2">
        {/* Aba Pacientes */}
        <button
          onClick={voltarParaPacientes}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl border-b-2 -mb-px transition-all ${
            abaAtiva === 'pacientes'
              ? 'border-[#4A3AE8] text-[#4A3AE8] bg-[#4A3AE8]/5'
              : 'border-transparent text-[#7F8C8D] hover:text-[#2C3E50] hover:bg-slate-50'
          }`}
        >
          <Users size={15} />
          Pacientes
          <span className="text-[11px] font-bold bg-[#F0F0F0] text-[#7F8C8D] px-1.5 py-0.5 rounded-full leading-none">
            {pacientes.length}
          </span>
        </button>

        {/* Aba Prontuário */}
        <div
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl border-b-2 -mb-px transition-all ${
            abaAtiva === 'prontuario'
              ? 'border-[#4A3AE8] text-[#4A3AE8] bg-[#4A3AE8]/5'
              : prontuarioId
                ? 'border-transparent text-[#7F8C8D]'
                : 'border-transparent text-[#BDC3C7] cursor-default select-none'
          }`}
        >
          <ClipboardList size={15} />
          {pronDetalhe
            ? <>Prontuário <span className="font-black">— {pronDetalhe.paciente.nome}</span></>
            : 'Prontuário'}
          {pronLoading && (
            <div className="w-3.5 h-3.5 border-2 border-[#4A3AE8] border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Linha separadora que preenche o restante */}
        <div className="flex-1 border-b border-[#E8E8E8] mb-0" />
      </div>

      {/* ── Aba: Pacientes ─────────────────────────────────────────────────── */}
      {abaAtiva === 'pacientes' && (
      <div className="space-y-5">
      {/* Header: contador + botões */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-[#7F8C8D]">
          {filtrados.length} de {pacientes.length} pacientes
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNovoRapido(true)}
            className="flex items-center gap-2 bg-white border border-[#E8E8E8] text-[#2C3E50] px-4 py-2.5 rounded-full text-sm font-semibold hover:border-[#F39C12] hover:text-[#F39C12] shadow-sm"
          >
            <Zap size={15} />
            Cadastro Rápido
          </button>
          <button
            onClick={() => setNovoCompleto(true)}
            className="flex items-center gap-2 bg-[#4A3AE8] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#3829c7] shadow-md"
          >
            <Plus size={16} />
            Novo Paciente
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-[#E8E8E8] rounded-2xl p-3 flex items-center gap-2 flex-wrap shadow-sm">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, CPF, telefone ou email…"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#F8F9FA] border border-transparent text-sm outline-none focus:bg-white focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
          />
        </div>

        <div className="inline-flex bg-[#F8F9FA] rounded-lg p-0.5">
          {(['ativos','inativos','alta','todos'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setFiltroSt(s)}
              className={`px-3 h-8 text-xs font-semibold rounded-md transition-colors capitalize ${
                filtroStatus === s ? 'bg-white text-[#2C3E50] shadow-sm' : 'text-[#7F8C8D] hover:text-[#2C3E50]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <select
          value={filtroVinculo}
          onChange={(e) => setVinculo(e.target.value as any)}
          className="h-9 px-3 rounded-lg bg-[#F8F9FA] border border-transparent text-sm outline-none focus:bg-white focus:border-[#4A3AE8] cursor-pointer"
        >
          <option value="todos">Todos os vínculos</option>
          <option value="titulares">Apenas titulares</option>
          <option value="dependentes">Apenas dependentes</option>
          <option value="pendentes">Auto-cadastro pendente</option>
        </select>

        {filtrosAtivos && (
          <button
            onClick={limpar}
            className="flex items-center gap-1 h-9 px-3 rounded-lg text-xs font-semibold text-[#E74C3C] hover:bg-[#E74C3C]/10"
          >
            <X size={12} />
            Limpar
          </button>
        )}
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-12 text-center">
          <Users className="w-10 h-10 mx-auto mb-3 text-[#BDC3C7]" />
          <p className="text-sm text-[#7F8C8D]">
            {pacientes.length === 0
              ? 'Nenhum paciente cadastrado ainda. Use "Cadastro Rápido" para começar.'
              : 'Nenhum paciente encontrado com esses filtros.'}
          </p>
          {filtrosAtivos && (
            <button onClick={limpar} className="mt-3 text-sm font-semibold text-[#4A3AE8] hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F8F9FA] border-b border-[#E8E8E8]">
              <tr>
                <th className="text-left text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">Paciente</th>
                <th className="text-left text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">Última sessão</th>
                <th className="text-left text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">Turmas</th>
                <th className="text-left text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">Prontuário</th>
                <th className="text-right text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3 w-64">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => {
                const ultimaSessao = p.agendamentos?.sort(
                  (a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()
                )?.[0]
                return (
                  <tr key={p.id} className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#F8F9FA]/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <AvatarPaciente nome={p.nome} sexo={p.sexo_biologico} foto_url={p.foto_url} />
                        <div className="min-w-0">
                          <Link
                            href={`/pacientes/${p.id}`}
                            className="text-sm font-semibold text-[#2C3E50] hover:text-[#4A3AE8] truncate block"
                          >
                            {p.nome}
                          </Link>
                          {p.telefone ? (
                            <Link
                              href={`/whatsapp?paciente=${p.id}`}
                              className="inline-flex items-center gap-1 text-xs text-[#25D366] hover:text-[#128C7E] truncate mt-0.5 transition-colors"
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor" width={11} height={11}>
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                              +{p.ddi ?? '55'} {p.telefone}
                            </Link>
                          ) : (
                            <p className="text-xs text-[#BDC3C7] mt-0.5">Sem telefone</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#7F8C8D]">
                      {ultimaSessao ? formatDate(ultimaSessao.data_hora) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        {(() => {
                          const aulas = aulasSemanaisPorPaciente[p.id] ?? 0
                          return aulas > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#27AE60] bg-[#27AE60]/10 px-2.5 py-1 rounded-full">
                              <GraduationCap size={11} />
                              {aulas} aula{aulas !== 1 ? 's' : ''}/sem
                            </span>
                          ) : (
                            <span className="text-xs text-[#BDC3C7]">—</span>
                          )
                        })()}
                        {planosServico.length > 0 && p.status === 'ativo' && (
                          <button
                            onClick={() => setMatriculandoPaciente({ id: p.id, nome: p.nome, telefone: p.telefone })}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#27AE60] hover:text-[#1e8449] hover:underline transition-colors"
                            title="Matricular em turma"
                          >
                            <Plus size={10} />
                            Matricular
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        {(() => {
                          const total = prontuarioCount[p.id] ?? 0
                          return total > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#4A3AE8] bg-[#4A3AE8]/8 px-2.5 py-1 rounded-full">
                              <ClipboardList size={11} />
                              {total} registro{total !== 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-[#BDC3C7]">
                              <ClipboardList size={11} />
                              Sem registros
                            </span>
                          )
                        })()}
                        <Link
                          href={`/pacientes?prontuario=${p.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4A3AE8] hover:text-[#3829c7] hover:underline transition-colors"
                        >
                          Prontuário
                          <ChevronRight size={11} />
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <AcoesCell
                        p={p}
                        onEditar={() => setEditando({
                          id: p.id, nome: p.nome, cpf: p.cpf, email: p.email,
                          data_nascimento: p.data_nascimento, sexo_biologico: p.sexo_biologico,
                          ddi: p.ddi, telefone: p.telefone, responsavel_id: p.responsavel_id,
                          contato_emergencia: p.contato_emergencia, observacoes: p.observacoes,
                          endereco: p.endereco, foto_url: p.foto_url,
                        })}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modais da aba Pacientes */}
      {(novoCompleto || editando) && (
        <PacienteForm
          paciente={editando}
          pacientes={pacientesResumo}
          onClose={() => {
            setNovoCompleto(false)
            setEditando(null)
          }}
        />
      )}

      {novoRapido && (
        <PacienteRapidoForm onClose={() => setNovoRapido(false)} />
      )}

      {matriculandoPaciente && (
        <MatriculaAlunoModal
          pacientePre={matriculandoPaciente}
          pacientes={pacientes.map(p => ({ id: p.id, nome: p.nome, telefone: p.telefone }))}
          servicos={servicos}
          planosServico={planosServico}
          slotsComVagas={slotsComVagas}
          onClose={() => setMatriculandoPaciente(null)}
          onConfirmado={() => setMatriculandoPaciente(null)}
        />
      )}
      </div>
      )} {/* fim aba Pacientes */}

      {/* ── Aba: Prontuário ────────────────────────────────────────────────── */}
      {abaAtiva === 'prontuario' && (
        <>
          {/* Carregando */}
          {pronLoading && !pronDetalhe && (
            <div className="bg-white rounded-2xl border border-[#E8E8E8] p-14 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-[3px] border-[#4A3AE8] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#7F8C8D]">Carregando prontuário…</p>
            </div>
          )}

          {/* Erro */}
          {pronErro && !pronLoading && (
            <div className="bg-white rounded-2xl border border-red-100 p-10 text-center">
              <p className="text-sm font-medium text-red-500 mb-3">{pronErro}</p>
              <button
                onClick={voltarParaPacientes}
                className="text-sm font-semibold text-[#4A3AE8] hover:underline"
              >
                ← Voltar para Pacientes
              </button>
            </div>
          )}

          {/* Prontuário carregado */}
          {pronDetalhe && !pronErro && (
            <ProntuarioClient
              detalhe={pronDetalhe}
              timelineInicial={pronTimeline}
              onVoltar={voltarParaPacientes}
            />
          )}
        </>
      )}

    </div>
  )
}
