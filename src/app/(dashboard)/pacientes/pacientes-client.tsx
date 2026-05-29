'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Search, X, Users, Zap, Phone, Link2, Clock } from 'lucide-react'
import { PacienteForm, type PacienteCompleto } from '@/components/pacientes/paciente-form'
import { PacienteRapidoForm } from '@/components/pacientes/paciente-rapido-form'
import { getDDI } from '@/lib/ddis'
import { formatDate } from '@/lib/utils'

type StatusFilter = 'ativos' | 'inativos' | 'alta' | 'todos'

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
}

export function PacientesClient({ pacientes }: Props) {
  const [busca, setBusca]             = useState('')
  const [filtroStatus, setFiltroSt]   = useState<StatusFilter>('ativos')
  const [filtroVinculo, setVinculo]   = useState<'todos' | 'titulares' | 'dependentes' | 'pendentes'>('todos')

  const [novoCompleto, setNovoCompleto]     = useState(false)
  const [novoRapido, setNovoRapido]         = useState(false)
  const [editando, setEditando]             = useState<PacienteCompleto | null>(null)

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

  function nomeResponsavel(rid: string | null) {
    if (!rid) return null
    return pacientes.find(p => p.id === rid)?.nome ?? null
  }

  function limpar() {
    setBusca('')
    setFiltroSt('ativos')
    setVinculo('todos')
  }

  return (
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
                <th className="text-left text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">Telefone</th>
                <th className="text-left text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">Última sessão</th>
                <th className="text-left text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">Vínculo</th>
                <th className="text-right text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => {
                const ultimaSessao = p.agendamentos?.sort(
                  (a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()
                )?.[0]
                const ddiObj = getDDI(p.ddi ?? '55')
                const respNome = nomeResponsavel(p.responsavel_id)
                const cadastroPendente = !!p.token_completar

                return (
                  <tr key={p.id} className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#F8F9FA]/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {p.foto_url ? (
                          <img
                            src={p.foto_url}
                            alt={p.nome}
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-[#E8E8E8]"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#4A3AE8]/15 text-[#4A3AE8] flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {p.nome.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link
                            href={`/pacientes/${p.id}`}
                            className="text-sm font-semibold text-[#2C3E50] hover:text-[#4A3AE8] truncate block"
                          >
                            {p.nome}
                          </Link>
                          <p className="text-xs text-[#7F8C8D] truncate">{p.email ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {p.telefone ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-[#7F8C8D]">
                          <span title={ddiObj.pais}>{ddiObj.flag}</span>
                          +{p.ddi ?? '55'} {p.telefone}
                        </span>
                      ) : <span className="text-xs text-[#BDC3C7]">—</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-[#7F8C8D]">
                      {ultimaSessao ? formatDate(ultimaSessao.data_hora) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {cadastroPendente ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#F39C12] bg-[#F39C12]/10 px-2.5 py-1 rounded-full">
                          <Clock size={11} />
                          Aguardando paciente
                        </span>
                      ) : respNome ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#3498DB] bg-[#3498DB]/10 px-2.5 py-1 rounded-full" title={`Dependente de ${respNome}`}>
                          <Link2 size={11} />
                          Dependente
                        </span>
                      ) : (
                        <span className="text-xs text-[#7F8C8D]">Titular</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setEditando({
                          id: p.id, nome: p.nome, cpf: p.cpf, email: p.email,
                          data_nascimento: p.data_nascimento, sexo_biologico: p.sexo_biologico,
                          ddi: p.ddi, telefone: p.telefone, responsavel_id: p.responsavel_id,
                          contato_emergencia: p.contato_emergencia, observacoes: p.observacoes,
                          endereco: p.endereco,
                        })}
                        className="text-xs font-semibold text-[#4A3AE8] hover:underline px-3 py-1.5"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modais */}
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
    </div>
  )
}
