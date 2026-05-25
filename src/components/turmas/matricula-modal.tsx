'use client'

import { useState, useMemo } from 'react'
import { X, Search, UserPlus, Check, Users } from 'lucide-react'
import { matricularAlunoAction } from '@/app/(dashboard)/turmas/actions'
import type { TurmaSlot, TurmaPlano } from '@/app/(dashboard)/turmas/actions'

interface Paciente { id: string; nome: string; telefone: string | null }

interface Props {
  turmaId: string
  turmaNome: string
  slots: TurmaSlot[]
  planos: TurmaPlano[]
  pacientes: Paciente[]
  onClose: () => void
  onConfirmado: () => void
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function MatriculaModal({ turmaId, turmaNome, slots, planos, pacientes, onClose, onConfirmado }: Props) {
  const [busca, setBusca]           = useState('')
  const [pacienteIds, setPacientes] = useState<string[]>([])
  const [planoId, setPlano]         = useState(planos[0]?.id ?? '')
  const [slotIds, setSlotIds]       = useState<string[]>([])
  const [dataMatricula, setData]    = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving]         = useState(false)
  const [err, setErr]               = useState('')
  const [resultado, setResultado]   = useState<{ ok: string[]; erros: { nome: string; msg: string }[] } | null>(null)

  const planoSel = useMemo(() => planos.find(p => p.id === planoId), [planoId, planos])
  const slotsAtivos = slots.filter(s => s.ativo)

  const pacientesFiltrados = useMemo(() => {
    const q = busca.toLowerCase()
    return pacientes
      .filter(p => !pacienteIds.includes(p.id) && p.nome.toLowerCase().includes(q))
      .slice(0, 30)
  }, [busca, pacienteIds, pacientes])

  function addPaciente(id: string) {
    setPacientes(prev => [...prev, id])
    setBusca('')
  }

  function removePaciente(id: string) {
    setPacientes(prev => prev.filter(p => p !== id))
  }

  function toggleSlot(id: string) {
    setSlotIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const slotValido = planoSel ? slotIds.length === planoSel.frequencia_semanal : slotIds.length > 0

  async function salvar() {
    if (pacienteIds.length === 0) { setErr('Selecione ao menos um paciente.'); return }
    if (!planoSel) { setErr('Selecione um plano.'); return }
    if (!slotValido) { setErr(`Selecione exatamente ${planoSel?.frequencia_semanal} slot(s) para este plano.`); return }
    setSaving(true); setErr('')

    const resultados = await Promise.all(
      pacienteIds.map(pid =>
        matricularAlunoAction({ turma_id: turmaId, paciente_id: pid, plano_id: planoId || null, slot_ids: slotIds, data_matricula: dataMatricula })
          .then(r => ({ pid, r }))
      )
    )

    setSaving(false)

    const ok: string[] = []
    const erros: { nome: string; msg: string }[] = []
    for (const { pid, r } of resultados) {
      const nome = pacientes.find(p => p.id === pid)?.nome ?? pid
      if ('error' in r) erros.push({ nome, msg: r.error })
      else ok.push(nome)
    }

    setResultado({ ok, erros })
    if (erros.length === 0) {
      setTimeout(() => { onConfirmado() }, 1500)
    }
  }

  const selectedPacientes = pacientes.filter(p => pacienteIds.includes(p.id))

  // Tela de resultado
  if (resultado) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#4A3AE8]/10 flex items-center justify-center">
                <UserPlus size={18} className="text-[#4A3AE8]" />
              </div>
              <div>
                <p className="font-bold text-[#2C3E50] text-sm">Resultado das Matrículas</p>
                <p className="text-[11px] text-[#7F8C8D]">{turmaNome}</p>
              </div>
            </div>
            <button onClick={resultado.erros.length === 0 ? onConfirmado : onClose} className="text-[#7F8C8D] hover:text-[#2C3E50]"><X size={18} /></button>
          </div>
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
            {resultado.ok.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-green-700 mb-2">{resultado.ok.length} matriculado{resultado.ok.length > 1 ? 's' : ''} com sucesso</p>
                {resultado.ok.map(nome => (
                  <p key={nome} className="text-xs text-green-600 flex items-center gap-1"><Check size={12} /> {nome}</p>
                ))}
              </div>
            )}
            {resultado.erros.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-red-700 mb-2">{resultado.erros.length} erro{resultado.erros.length > 1 ? 's' : ''}</p>
                {resultado.erros.map(e => (
                  <p key={e.nome} className="text-xs text-red-600"><span className="font-medium">{e.nome}:</span> {e.msg}</p>
                ))}
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-[#E8E8E8]">
            <button onClick={resultado.erros.length === 0 ? onConfirmado : onClose}
              className="w-full h-11 rounded-xl bg-[#4A3AE8] text-white font-semibold text-sm hover:bg-[#3D2ED6]">
              Fechar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#4A3AE8]/10 flex items-center justify-center">
              <UserPlus size={18} className="text-[#4A3AE8]" />
            </div>
            <div>
              <p className="font-bold text-[#2C3E50] text-sm">Matricular Alunos</p>
              <p className="text-[11px] text-[#7F8C8D]">{turmaNome}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#7F8C8D] hover:text-[#2C3E50]"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

          {/* Busca de pacientes — multi-select */}
          <div>
            <label className="block text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-2">
              Pacientes
              {pacienteIds.length > 0 && (
                <span className="ml-2 bg-[#4A3AE8] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {pacienteIds.length}
                </span>
              )}
            </label>

            {/* Chips dos selecionados */}
            {selectedPacientes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedPacientes.map(p => (
                  <span key={p.id} className="flex items-center gap-1 bg-[#4A3AE8]/10 text-[#4A3AE8] text-xs font-medium px-2.5 py-1 rounded-full">
                    {p.nome}
                    <button onClick={() => removePaciente(p.id)} className="hover:text-red-500 ml-0.5 leading-none">×</button>
                  </span>
                ))}
              </div>
            )}

            {/* Campo de busca */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder={pacienteIds.length === 0 ? 'Buscar paciente…' : 'Adicionar mais pacientes…'}
                className="w-full h-10 pl-9 pr-4 border border-[#E8E8E8] rounded-xl text-sm outline-none focus:border-[#4A3AE8]"
              />
            </div>
            {busca.length > 1 && (
              <div className="border border-[#E8E8E8] rounded-xl overflow-hidden max-h-44 overflow-y-auto mt-1">
                {pacientesFiltrados.map(p => (
                  <button key={p.id} onClick={() => addPaciente(p.id)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#F8F9FA] border-b border-[#F0F0F0] last:border-0 flex items-center gap-2">
                    <Users size={13} className="text-[#7F8C8D] flex-shrink-0" />
                    {p.nome}
                  </button>
                ))}
                {pacientesFiltrados.length === 0 && (
                  <p className="px-4 py-3 text-xs text-[#7F8C8D]">Nenhum paciente encontrado</p>
                )}
              </div>
            )}
          </div>

          {/* Plano */}
          <div>
            <label className="block text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-2">Plano</label>
            <div className="grid grid-cols-2 gap-2">
              {planos.map(p => (
                <button key={p.id} onClick={() => { setPlano(p.id); setSlotIds([]) }}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${planoId === p.id ? 'border-[#4A3AE8] bg-[#4A3AE8]/5' : 'border-[#E8E8E8] hover:border-[#4A3AE8]/30'}`}>
                  <p className="font-semibold text-sm text-[#2C3E50]">{p.nome}</p>
                  <p className="text-xs text-[#7F8C8D]">{p.frequencia_semanal}x/semana · R$ {p.valor_mensal.toFixed(2)}/mês</p>
                </button>
              ))}
            </div>
          </div>

          {/* Seleção de slots */}
          <div>
            <label className="block text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-1">
              Dias / Horários
              {planoSel && <span className="ml-2 text-[#4A3AE8]">— escolha {planoSel.frequencia_semanal} slot(s)</span>}
            </label>
            <div className="space-y-2">
              {slotsAtivos.map(s => {
                const sel = slotIds.includes(s.id)
                return (
                  <button key={s.id} onClick={() => toggleSlot(s.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${sel ? 'border-[#4A3AE8] bg-[#4A3AE8]/5' : 'border-[#E8E8E8] hover:border-[#4A3AE8]/30'}`}>
                    <span className="text-sm font-medium text-[#2C3E50]">{DIAS[s.dia_semana]} · {s.hora_inicio}–{s.hora_fim}</span>
                    {sel && <Check size={16} className="text-[#4A3AE8]" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Data de início */}
          <div>
            <label className="block text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-2">Data de Início</label>
            <input type="date" value={dataMatricula} onChange={e => setData(e.target.value)}
              className="h-10 px-3 border border-[#E8E8E8] rounded-xl text-sm outline-none focus:border-[#4A3AE8] w-full" />
          </div>

          {err && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E8E8E8] flex-shrink-0">
          <button onClick={salvar} disabled={saving || pacienteIds.length === 0 || !slotValido}
            className="w-full h-11 rounded-xl bg-[#4A3AE8] text-white font-semibold text-sm hover:bg-[#3D2ED6] disabled:opacity-50 shadow-sm">
            {saving
              ? 'Matriculando…'
              : pacienteIds.length > 1
                ? `Matricular ${pacienteIds.length} alunos`
                : 'Confirmar Matrícula'}
          </button>
        </div>
      </div>
    </div>
  )
}
