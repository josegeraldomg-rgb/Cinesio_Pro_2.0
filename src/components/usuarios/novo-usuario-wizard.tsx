'use client'

import { useState } from 'react'
import { X, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Plus, Trash2, Clock, Briefcase, UserCog } from 'lucide-react'
import { DDISelector } from '@/components/pacientes/ddi-selector'
import { DIAS_SEMANA } from '@/lib/scheduling/gerar-slots'
import { criarUsuarioAction, type TurnoNovo, type VinculoServicoNovo, type NovoProfissionalExtra } from '@/app/(dashboard)/usuarios/actions'
import type { PerfilDef } from '@/lib/permissoes'
import type { ServicoResumo } from '@/app/(dashboard)/usuarios/usuarios-client'

interface Props {
  perfis: PerfilDef[]
  servicos: ServicoResumo[]
  onClose: () => void
}

interface TurnoLocal extends TurnoNovo {
  _id: string  // uid local p/ key/remoção
}

export function NovoUsuarioWizard({ perfis, servicos, onClose }: Props) {
  // Passo 1 — dados de acesso
  const [nome, setNome]     = useState('')
  const [email, setEmail]   = useState('')
  const [senha, setSenha]   = useState('')
  const [perfil, setPerfil] = useState<string>('recepcionista')

  // Passo 2 — só p/ profissional
  const [ddi, setDdi]                  = useState('55')
  const [telefone, setTelefone]        = useState('')
  const [intervalo, setIntervalo]      = useState<number>(0)
  const [turnos, setTurnos]            = useState<TurnoLocal[]>([
    { _id: crypto.randomUUID(), dias_semana: [1,2,3,4,5], hora_inicio: '08:00', hora_fim: '12:00' },
  ])
  const [servicosSel, setServicosSel]  = useState<Map<string, VinculoServicoNovo>>(new Map())

  const [step, setStep]       = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState<string | null>(null)
  const [ok, setOk]           = useState<string | null>(null)

  const isProfissional = perfil === 'profissional'

  // ── Turnos: add / remove / atualizar ──
  function addTurno() {
    setTurnos(t => [...t, { _id: crypto.randomUUID(), dias_semana: [], hora_inicio: '13:00', hora_fim: '17:00' }])
  }
  function removeTurno(id: string) {
    setTurnos(t => t.filter(x => x._id !== id))
  }
  function updateTurno(id: string, patch: Partial<TurnoLocal>) {
    setTurnos(t => t.map(x => x._id === id ? { ...x, ...patch } : x))
  }
  function toggleDia(id: string, dia: number) {
    setTurnos(t => t.map(x => {
      if (x._id !== id) return x
      const has = x.dias_semana.includes(dia)
      return { ...x, dias_semana: has ? x.dias_semana.filter(d => d !== dia) : [...x.dias_semana, dia].sort() }
    }))
  }

  // ── Serviços ──
  function toggleServico(servicoId: string) {
    setServicosSel(prev => {
      const next = new Map(prev)
      if (next.has(servicoId)) next.delete(servicoId)
      else next.set(servicoId, { servico_id: servicoId, valor_override: null, duracao_override: null })
      return next
    })
  }
  function updateOverride(servicoId: string, field: 'valor_override' | 'duracao_override', valor: string) {
    setServicosSel(prev => {
      const next = new Map(prev)
      const atual = next.get(servicoId)
      if (!atual) return prev
      next.set(servicoId, {
        ...atual,
        [field]: valor.trim() === ''
          ? null
          : field === 'duracao_override'
            ? parseInt(valor, 10)
            : parseFloat(valor.replace(',', '.')),
      })
      return next
    })
  }

  function podeAvancar(): boolean {
    if (!nome.trim() || !email.trim() || !senha.trim() || !perfil) return false
    if (senha.length < 6) return false
    return true
  }

  function avancar() {
    if (!podeAvancar()) {
      setErr('Preencha nome, email, senha (mín. 6) e perfil.')
      return
    }
    setErr(null)
    if (isProfissional) setStep(2)
    else handleSubmit()
  }

  async function handleSubmit() {
    setLoading(true); setErr(null)

    const extra: NovoProfissionalExtra | undefined = isProfissional
      ? {
          ddi,
          telefone,
          intervalo_minutos: intervalo,
          turnos: turnos.map(({ _id, ...t }) => t),
          servicos: [...servicosSel.values()],
        }
      : undefined

    const r = await criarUsuarioAction({ nome, email, senha, perfil, extra })
    setLoading(false)

    if (r?.error) setErr(r.error)
    else {
      setOk(('mensagem' in r ? r.mensagem : null) ?? 'Usuário criado!')
      setTimeout(() => { onClose(); window.location.reload() }, 1400)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8] sticky top-0 bg-white rounded-t-3xl z-10">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-[#2C3E50] text-lg">Novo Usuário</h2>
            {isProfissional && (
              <div className="flex items-center gap-1 text-xs">
                <span className={`px-2 py-0.5 rounded-full font-semibold ${step === 1 ? 'bg-[#4A3AE8] text-white' : 'bg-[#27AE60] text-white'}`}>1</span>
                <span className="text-[#BDC3C7]">─</span>
                <span className={`px-2 py-0.5 rounded-full font-semibold ${step === 2 ? 'bg-[#4A3AE8] text-white' : 'bg-[#E8E8E8] text-[#7F8C8D]'}`}>2</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#F8F9FA] text-[#7F8C8D]">
            <X size={18} />
          </button>
        </div>

        {/* ═══════ PASSO 1: DADOS DE ACESSO ═══════ */}
        {step === 1 && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2">
              <UserCog size={18} className="text-[#4A3AE8]" />
              <h3 className="font-bold text-[#2C3E50]">Dados de acesso</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Nome completo *</label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Senha provisória * (mín. 6)</label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={6}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Perfil *</label>
                <select
                  value={perfil}
                  onChange={(e) => setPerfil(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm bg-white outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
                >
                  {perfis.filter(p => p.id !== 'dev').map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {isProfissional && (
              <div className="flex items-start gap-2 bg-[#4A3AE8]/5 border border-[#4A3AE8]/15 rounded-xl px-3 py-2.5 text-xs text-[#2C3E50]">
                <Briefcase size={14} className="mt-0.5 flex-shrink-0 text-[#4A3AE8]" />
                <p>
                  Como o perfil é <strong>Profissional</strong>, no próximo passo vamos configurar
                  telefone, horários de trabalho, intervalo entre slots e serviços que ele executa —
                  tudo para deixar a agenda 100% operacional.
                </p>
              </div>
            )}

            {err && (
              <div className="flex items-start gap-2 text-xs text-[#E74C3C] bg-[#E74C3C]/10 border border-[#E74C3C]/30 rounded-lg px-3 py-2">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{err}</span>
              </div>
            )}

            {ok && (
              <div className="flex items-start gap-2 text-xs text-[#27AE60] bg-[#27AE60]/10 border border-[#27AE60]/30 rounded-lg px-3 py-2">
                <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
                <span>{ok}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E8E8]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-sm font-medium text-[#7F8C8D] hover:bg-[#F8F9FA]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={avancar}
                disabled={loading || !podeAvancar()}
                className="flex items-center gap-1.5 bg-[#4A3AE8] text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-[#3829c7] disabled:opacity-50 shadow-md"
              >
                {loading
                  ? 'Salvando…'
                  : isProfissional
                    ? <>Próximo <ChevronRight size={14} /></>
                    : 'Criar usuário'}
              </button>
            </div>
          </div>
        )}

        {/* ═══════ PASSO 2: DADOS DO PROFISSIONAL ═══════ */}
        {step === 2 && (
          <div className="p-6 space-y-5">
            {/* Contato */}
            <div>
              <div className="flex items-center gap-2 pb-2 mb-2 border-b border-[#F0F0F0]">
                <Briefcase size={16} className="text-[#4A3AE8]" />
                <h3 className="font-bold text-[#2C3E50] text-sm">Contato</h3>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Telefone (WhatsApp) *</label>
                <DDISelector
                  ddi={ddi}
                  telefone={telefone}
                  onDDIChange={setDdi}
                  onTelefoneChange={setTelefone}
                  required
                />
              </div>
            </div>

            {/* Granularidade dos slots */}
            <div>
              <div className="flex items-center gap-2 pb-2 mb-2 border-b border-[#F0F0F0]">
                <Clock size={16} className="text-[#4A3AE8]" />
                <h3 className="font-bold text-[#2C3E50] text-sm">Intervalo entre slots</h3>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  value={intervalo}
                  onChange={(e) => setIntervalo(parseInt(e.target.value) || 0)}
                  placeholder="Ex: 30"
                  className="w-24 h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm text-center outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
                />
                <span className="text-sm text-[#7F8C8D]">minutos entre cada slot oferecido</span>
              </div>
              <p className="text-[11px] text-[#7F8C8D] mt-1">
                De quantos em quantos minutos os horários aparecem na agenda
                (ex: 30min → 08:00, 08:30, 09:00…). Se ficar 0, usa a duração do serviço.
              </p>
            </div>

            {/* Horários */}
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F0F0F0]">
                <h3 className="font-bold text-[#2C3E50] text-sm">Horários de trabalho</h3>
                <button
                  type="button"
                  onClick={addTurno}
                  className="flex items-center gap-1 text-xs font-semibold text-[#4A3AE8] hover:bg-[#4A3AE8]/10 px-2 py-1 rounded-full"
                >
                  <Plus size={12} />
                  Adicionar turno
                </button>
              </div>

              <div className="space-y-3">
                {turnos.map((t, idx) => (
                  <div key={t._id} className="bg-[#F8F9FA] border border-[#E8E8E8] rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[#7F8C8D]">Turno {idx + 1}</p>
                      {turnos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTurno(t._id)}
                          className="p-1 text-[#E74C3C] hover:bg-[#E74C3C]/10 rounded"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                    {/* Dias da semana */}
                    <div className="flex flex-wrap gap-1.5">
                      {DIAS_SEMANA.map(d => {
                        const on = t.dias_semana.includes(d.id)
                        return (
                          <button
                            type="button"
                            key={d.id}
                            onClick={() => toggleDia(t._id, d.id)}
                            className={`flex-1 min-w-[42px] py-1.5 rounded-lg text-xs font-bold transition-colors ${
                              on ? 'bg-[#4A3AE8] text-white' : 'bg-white text-[#7F8C8D] border border-[#E8E8E8] hover:bg-[#E8E8E8]'
                            }`}
                          >
                            {d.sigla}
                          </button>
                        )
                      })}
                    </div>

                    {/* Atalhos */}
                    <div className="flex gap-2 text-[11px]">
                      <button type="button" onClick={() => updateTurno(t._id, { dias_semana: [1,2,3,4,5] })} className="text-[#4A3AE8] font-semibold hover:underline">Dias úteis</button>
                      <span className="text-[#BDC3C7]">·</span>
                      <button type="button" onClick={() => updateTurno(t._id, { dias_semana: [0,6] })} className="text-[#4A3AE8] font-semibold hover:underline">Fim de semana</button>
                      <span className="text-[#BDC3C7]">·</span>
                      <button type="button" onClick={() => updateTurno(t._id, { dias_semana: [0,1,2,3,4,5,6] })} className="text-[#4A3AE8] font-semibold hover:underline">Todos</button>
                    </div>

                    {/* Horas */}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="time"
                        value={t.hora_inicio}
                        onChange={(e) => updateTurno(t._id, { hora_inicio: e.target.value })}
                        className="h-9 px-3 rounded-lg border border-[#E8E8E8] text-sm bg-white outline-none focus:border-[#4A3AE8]"
                      />
                      <input
                        type="time"
                        value={t.hora_fim}
                        onChange={(e) => updateTurno(t._id, { hora_fim: e.target.value })}
                        className="h-9 px-3 rounded-lg border border-[#E8E8E8] text-sm bg-white outline-none focus:border-[#4A3AE8]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-[#7F8C8D] mt-2">
                Para criar "horário de almoço", crie dois turnos separados (ex: 08:00–12:00 e 13:00–18:00).
              </p>
            </div>

            {/* Serviços */}
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F0F0F0]">
                <h3 className="font-bold text-[#2C3E50] text-sm">
                  Serviços executados
                  <span className="ml-2 font-normal text-[#7F8C8D]">({servicosSel.size} selecionado{servicosSel.size === 1 ? '' : 's'})</span>
                </h3>
              </div>

              {servicos.length === 0 ? (
                <div className="text-center py-6 text-sm text-[#7F8C8D] bg-[#F8F9FA] rounded-xl">
                  Nenhum serviço cadastrado ainda. Cadastre serviços em <strong>/servicos</strong> para vincular aqui.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {servicos.map(s => {
                    const vinculo = servicosSel.get(s.id)
                    const on = !!vinculo
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                          on ? 'border-[#4A3AE8]/40 bg-[#4A3AE8]/5' : 'border-[#E8E8E8] bg-white'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleServico(s.id)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                            on ? 'bg-[#4A3AE8]' : 'bg-[#E8E8E8]'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#2C3E50] truncate">{s.nome}</p>
                          <p className="text-[11px] text-[#7F8C8D]">{s.duracao_minutos}min · R$ {s.valor.toFixed(2)}</p>
                        </div>

                        {on && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <input
                              type="number"
                              placeholder={`${s.duracao_minutos}`}
                              value={vinculo.duracao_override ?? ''}
                              onChange={(e) => updateOverride(s.id, 'duracao_override', e.target.value)}
                              title="Duração customizada (min)"
                              className="w-16 h-8 px-2 rounded-md border border-[#E8E8E8] text-xs text-center outline-none focus:border-[#4A3AE8]"
                            />
                            <input
                              type="number"
                              step="0.01"
                              placeholder={`${s.valor}`}
                              value={vinculo.valor_override ?? ''}
                              onChange={(e) => updateOverride(s.id, 'valor_override', e.target.value)}
                              title="Preço customizado"
                              className="w-20 h-8 px-2 rounded-md border border-[#E8E8E8] text-xs text-center outline-none focus:border-[#4A3AE8]"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {err && (
              <div className="flex items-start gap-2 text-xs text-[#E74C3C] bg-[#E74C3C]/10 border border-[#E74C3C]/30 rounded-lg px-3 py-2">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{err}</span>
              </div>
            )}

            {ok && (
              <div className="flex items-start gap-2 text-xs text-[#27AE60] bg-[#27AE60]/10 border border-[#27AE60]/30 rounded-lg px-3 py-2">
                <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
                <span>{ok}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-[#E8E8E8] sticky bottom-0 bg-white rounded-b-3xl">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm text-[#7F8C8D] hover:text-[#2C3E50] px-3 py-2 rounded-full"
              >
                <ChevronLeft size={14} />
                Voltar
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full text-sm font-medium text-[#7F8C8D] hover:bg-[#F8F9FA]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-[#4A3AE8] text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#3829c7] disabled:opacity-50 shadow-md"
                >
                  {loading ? 'Criando profissional…' : 'Criar profissional'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
