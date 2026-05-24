'use client'

import { useState, useMemo } from 'react'
import { X, User, Stethoscope, CalendarCheck, Flag, Check, AlertTriangle } from 'lucide-react'
import type { Paciente, Profissional, Servico, Vinculo, Ausencia } from '@/app/(dashboard)/agenda/agenda-page-client'
import { criarAgendamentoAction, criarAgendamentoRecorrenteAction } from '@/app/(dashboard)/agenda/actions'
import { PassoPaciente, type PacienteSelecionado } from './passo-paciente'
import { PassoProfissional } from './passo-profissional'
import { PassoServicos, type ServicoEscolhido } from './passo-servicos'
import { PassoDataHora } from './passo-data-hora'
import { PassoFinalizar } from './passo-finalizar'
import { formatCurrency } from '@/lib/utils'
import type { RecorrenciaConfig } from '@/lib/scheduling/gerar-ocorrencias'

export interface InicialAgendamento {
  profissionalId?: string
  data?: string
  hora?: string
}

interface Props {
  pacientes: Paciente[]
  profissionais: Profissional[]
  servicos: Servico[]
  vinculos: Vinculo[]
  ausencias: Ausencia[]
  inicial?: InicialAgendamento
  onClose: () => void
}

export function NovoAgendamentoModal(props: Props) {
  // ── Estado dos passos ──
  const [paciente, setPaciente]         = useState<PacienteSelecionado | null>(null)
  const [profissional, setProfissional] = useState<Profissional | null>(
    () => props.inicial?.profissionalId
      ? props.profissionais.find(p => p.id === props.inicial!.profissionalId) ?? null
      : null
  )
  const [servico, setServico]           = useState<ServicoEscolhido | null>(null)
  const [data, setData]                 = useState<string>(props.inicial?.data ?? '')
  const [hora, setHora]                 = useState<string>(props.inicial?.hora ?? '')
  const [forcarOverbooking, setForcar]  = useState(false)

  // Passo finalizar
  const [observacoes, setObservacoes]   = useState('')
  const [descontoPct, setDescontoPct]   = useState(0)
  const [telemedicina, setTelemedicina] = useState(false)
  const [recorrencia, setRecorrencia]   = useState<RecorrenciaConfig | null>(null)

  const [loading, setLoading]           = useState(false)
  const [err, setErr]                   = useState<string | null>(null)
  const [ok, setOk]                     = useState<string | null>(null)
  const [pulados, setPulados]           = useState<string[]>([])

  // ── Stepper meta ──
  const passos = [
    { id: 1, label: 'Paciente',     Icon: User,          done: !!paciente },
    { id: 2, label: 'Profissional', Icon: Stethoscope,   done: !!profissional },
    { id: 3, label: 'Data/Hora',    Icon: CalendarCheck, done: !!(data && hora) },
    { id: 4, label: 'Finalizar',    Icon: Flag,          done: false },
  ]
  const passoAtivo =
    !paciente ? 1
    : !profissional ? 2
    : !(servico && data && hora) ? 3
    : 4

  // ── Cálculos financeiros ──
  const valorBase  = servico?.valor ?? 0
  const valorFinal = valorBase * (1 - descontoPct / 100)
  const isGratuito = valorBase === 0

  // ── Salvar ──
  async function salvar(comCobranca: boolean) {
    if (!paciente || !profissional || !servico || !data || !hora) {
      setErr('Preencha todos os passos antes de agendar.')
      return
    }

    setLoading(true)
    setErr(null)

    // ── Agendamento recorrente ──
    if (recorrencia) {
      // Valida config mínima
      if (recorrencia.tipo_fim === 'sessoes' && (!recorrencia.total_sessoes || recorrencia.total_sessoes < 2)) {
        setErr('Informe ao menos 2 sessões para criar uma série recorrente.')
        setLoading(false)
        return
      }
      if (recorrencia.tipo_fim === 'data' && !recorrencia.data_fim) {
        setErr('Informe a data de término da recorrência.')
        setLoading(false)
        return
      }
      if (recorrencia.frequencia === 'personalizado' && (!recorrencia.intervalo_dias || recorrencia.intervalo_dias < 1)) {
        setErr('Informe um intervalo válido (mínimo 1 dia) para a frequência personalizada.')
        setLoading(false)
        return
      }

      const r = await criarAgendamentoRecorrenteAction({
        paciente_id:      paciente.id,
        profissional_id:  profissional.id,
        servico_id:       servico.id,
        hora,
        duracao_minutos:  servico.duracaoFinal,
        observacoes:      observacoes.trim() || null,
        telemedicina,
        forcar_overbooking: forcarOverbooking,
        recorrencia: { ...recorrencia, data_inicio: data },
      })

      setLoading(false)
      if ('error' in r) {
        setErr(r.error)
      } else {
        const msg = r.pulados.length > 0
          ? `${r.criados} agendamento${r.criados !== 1 ? 's' : ''} criado${r.criados !== 1 ? 's' : ''} · ${r.pulados.length} data${r.pulados.length !== 1 ? 's' : ''} com conflito pulada${r.pulados.length !== 1 ? 's' : ''}`
          : `${r.criados} agendamento${r.criados !== 1 ? 's' : ''} criado${r.criados !== 1 ? 's' : ''} com sucesso!`
        setOk(msg)
        setPulados(r.pulados)
        setTimeout(() => { props.onClose(); window.location.reload() }, 2200)
      }
      return
    }

    // ── Agendamento único (fluxo original) ──
    const r = await criarAgendamentoAction({
      paciente_id:      paciente.id,
      profissional_id:  profissional.id,
      servico_id:       servico.id,
      data_hora:        `${data}T${hora}:00`,
      duracao_minutos:  servico.duracaoFinal,
      observacoes:      observacoes.trim() || null,
      desconto_percentual: descontoPct,
      valor_final:      valorFinal,
      telemedicina,
      com_cobranca:     comCobranca && !isGratuito,
      forcar_overbooking: forcarOverbooking,
    })

    setLoading(false)
    if (r?.error) {
      setErr(r.error)
    } else {
      setOk('Agendamento criado com sucesso!')
      setTimeout(() => { props.onClose(); window.location.reload() }, 1100)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-8 flex flex-col" style={{ maxHeight: 'calc(100vh - 4rem)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8] flex-shrink-0">
          <h2 className="font-bold text-[#2C3E50] text-lg">Novo Agendamento</h2>
          <button onClick={props.onClose} className="p-2 rounded-full hover:bg-[#F8F9FA] text-[#7F8C8D]">
            <X size={18} />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 py-4 border-b border-[#E8E8E8] flex-shrink-0 bg-[#F8F9FA]/30">
          <div className="flex items-center justify-between">
            {passos.map((p, idx) => {
              const ativo = passoAtivo === p.id
              const done  = p.done
              return (
                <div key={p.id} className="flex items-center flex-1 last:flex-initial">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                      done  ? 'bg-[#27AE60] text-white' :
                      ativo ? 'bg-[#4A3AE8] text-white shadow-md' :
                              'bg-white border border-[#E8E8E8] text-[#BDC3C7]'
                    }`}>
                      {done ? <Check size={16} strokeWidth={3} /> : <p.Icon size={16} />}
                    </div>
                    <span className={`text-[11px] font-semibold mt-1.5 ${
                      ativo ? 'text-[#4A3AE8]' : done ? 'text-[#27AE60]' : 'text-[#7F8C8D]'
                    }`}>{p.label}</span>
                  </div>
                  {idx < passos.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-5 ${p.done ? 'bg-[#27AE60]' : 'bg-[#E8E8E8]'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          <PassoPaciente
            pacientes={props.pacientes}
            selecionado={paciente}
            onSelect={setPaciente}
          />

          {(paciente || profissional) && (
            <PassoProfissional
              profissionais={props.profissionais}
              selecionado={profissional}
              onSelect={(p) => {
                setProfissional(p)
                if (servico) setServico(null)
                if (hora) setHora('')
              }}
            />
          )}

          {profissional && (
            <PassoServicos
              profissional={profissional}
              servicos={props.servicos}
              vinculos={props.vinculos}
              selecionado={servico}
              onSelect={setServico}
            />
          )}

          {profissional && (servico || data) && (
            <PassoDataHora
              profissionalId={profissional.id}
              ausencias={props.ausencias}
              duracaoMinutos={servico?.duracaoFinal ?? 30}
              data={data}
              hora={hora}
              forcar={forcarOverbooking}
              onChangeData={(d) => { setData(d); setHora('') }}
              onChangeHora={setHora}
              onChangeForcar={setForcar}
            />
          )}

          {paciente && profissional && servico && data && hora && (
            <PassoFinalizar
              observacoes={observacoes}
              onObservacoes={setObservacoes}
              descontoPct={descontoPct}
              onDescontoPct={setDescontoPct}
              telemedicina={telemedicina}
              onTelemedicina={setTelemedicina}
              valorBase={valorBase}
              valorFinal={valorFinal}
              recorrenciaConfig={recorrencia}
              onRecorrencia={setRecorrencia}
              dataBase={data}
            />
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-4 border-t border-[#E8E8E8] flex-shrink-0 bg-white rounded-b-3xl">
          {err && (
            <div className="mb-3 text-xs text-[#E74C3C] bg-[#E74C3C]/10 border border-[#E74C3C]/30 rounded-lg px-3 py-2">
              {err}
            </div>
          )}

          {ok && (
            <div className="mb-3 space-y-1">
              <div className="text-xs text-[#27AE60] bg-[#27AE60]/10 border border-[#27AE60]/30 rounded-lg px-3 py-2 flex items-center gap-2">
                <Check size={14} />
                {ok}
              </div>
              {pulados.length > 0 && (
                <div className="text-xs text-[#E67E22] bg-[#E67E22]/10 border border-[#E67E22]/30 rounded-lg px-3 py-2 flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>
                    Datas puladas por conflito:{' '}
                    {pulados.map(d => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')).join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#7F8C8D] uppercase font-semibold tracking-wider">
                {recorrencia ? 'Valor por sessão' : 'Valor Total'}
              </p>
              <p className="text-xl font-bold text-[#2C3E50]">
                {formatCurrency(valorFinal)}
                {descontoPct > 0 && (
                  <span className="text-xs text-[#7F8C8D] font-normal ml-2 line-through">
                    {formatCurrency(valorBase)}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={props.onClose}
                className="px-4 py-2 rounded-full text-sm font-medium text-[#7F8C8D] hover:bg-[#F8F9FA]"
              >
                Cancelar
              </button>

              {isGratuito || recorrencia ? (
                <button
                  onClick={() => salvar(false)}
                  disabled={loading || !paciente || !profissional || !servico || !data || !hora}
                  className="bg-[#27AE60] text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#1f8b4d] disabled:opacity-50 shadow-md"
                >
                  {loading ? 'Agendando…' : recorrencia ? 'Agendar Série' : 'Agendar'}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => salvar(false)}
                    disabled={loading || !paciente || !profissional || !servico || !data || !hora}
                    className="bg-white border border-[#4A3AE8] text-[#4A3AE8] px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#4A3AE8]/5 disabled:opacity-50"
                  >
                    Agendar Sem Cobrança
                  </button>
                  <button
                    onClick={() => salvar(true)}
                    disabled={loading || !paciente || !profissional || !servico || !data || !hora}
                    className="bg-[#4A3AE8] text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-[#3829c7] disabled:opacity-50 shadow-md"
                  >
                    {loading ? 'Agendando…' : 'Agendar com Cobrança'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
