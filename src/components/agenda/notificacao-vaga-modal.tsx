'use client'

import { useState } from 'react'
import { Bell, BellOff, Phone, MessageCircle, X, Clock, Calendar, User2, Stethoscope, CheckCircle2 } from 'lucide-react'
import type { EntradaListaEspera } from '@/app/(dashboard)/agenda/lista-espera-actions'
import { mudarStatusListaEsperaAction } from '@/app/(dashboard)/agenda/lista-espera-actions'

interface Props {
  entradas: EntradaListaEspera[]   // compatÃ­veis com o slot vago
  slotData: string                  // "YYYY-MM-DD"
  slotHora: string                  // "HH:MM"
  profissionalNome?: string
  onClose: () => void
  onNotificado: (id: string) => void
}

function fmtData(d: string) {
  const [ano, mes, dia] = d.split('-')
  return `${dia}/${mes}/${ano}`
}

function buildWhatsApp(telefone: string, ddi: string, texto: string): string {
  const numero = (ddi + telefone).replace(/\D/g, '')
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
}

export function NotificacaoVagaModal({ entradas, slotData, slotHora, profissionalNome, onClose, onNotificado }: Props) {
  const [salvando, setSalvando] = useState<Record<string, boolean>>({})
  const [notificados, setNotificados] = useState<Set<string>>(new Set())

  async function marcarNotificado(id: string, metodo: 'manual' | 'whatsapp', entrada: EntradaListaEspera) {
    setSalvando(s => ({ ...s, [id]: true }))
    try {
      if (metodo === 'whatsapp' && entrada.paciente_telefone) {
        const texto = `OlÃ¡, ${entrada.paciente_nome}! ðŸ˜Š Uma vaga abriu na nossa agenda para o dia ${fmtData(slotData)} Ã s ${slotHora}${profissionalNome ? ` com ${profissionalNome}` : ''}. Entre em contato para confirmar seu agendamento!`
        window.open(buildWhatsApp(entrada.paciente_telefone, entrada.paciente_ddi ?? '55', texto), '_blank')
      }
      const res = await mudarStatusListaEsperaAction(id, 'notificado')
      if ('success' in res) {
        setNotificados(prev => new Set(prev).add(id))
        onNotificado(id)
      }
    } finally {
      setSalvando(s => ({ ...s, [id]: false }))
    }
  }

  const pendentes  = entradas.filter(e => !notificados.has(e.id))
  const resolvidas = entradas.filter(e => notificados.has(e.id))

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8] flex-shrink-0">
          <div>
            <h2 className="font-bold text-[#2C3E50] text-base flex items-center gap-2">
              <Bell size={18} className="text-orange-500" />
              Vaga DisponÃ­vel â€” Lista de Espera
            </h2>
            <p className="text-xs text-[#7F8C8D] mt-0.5">
              {fmtData(slotData)} Ã s {slotHora}{profissionalNome ? ` Â· ${profissionalNome}` : ''} Â·{' '}
              <span className="font-medium text-orange-500">{pendentes.length} paciente{pendentes.length !== 1 ? 's' : ''} compatÃ­ve{pendentes.length !== 1 ? 'is' : 'l'}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-[#F8F9FA] flex items-center justify-center text-[#7F8C8D]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {pendentes.length === 0 && resolvidas.length > 0 && (
            <div className="text-center py-8">
              <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-[#2C3E50]">Todos os pacientes foram notificados!</p>
              <p className="text-xs text-[#7F8C8D] mt-1">VocÃª pode fechar este painel.</p>
            </div>
          )}

          {pendentes.map(entrada => (
            <EntradaNotificacaoCard
              key={entrada.id}
              entrada={entrada}
              salvando={salvando[entrada.id] ?? false}
              onIgnorar={() => {
                setNotificados(prev => new Set(prev).add(entrada.id))
              }}
              onManual={() => marcarNotificado(entrada.id, 'manual', entrada)}
              onWhatsApp={() => marcarNotificado(entrada.id, 'whatsapp', entrada)}
            />
          ))}

          {resolvidas.length > 0 && pendentes.length > 0 && (
            <p className="text-xs text-[#7F8C8D] text-center pt-2">
              {resolvidas.length} jÃ¡ notificado{resolvidas.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-[#E8E8E8] flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full text-sm font-semibold text-[#7F8C8D] hover:bg-[#F8F9FA] border border-[#E8E8E8]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

function EntradaNotificacaoCard({ entrada, salvando, onIgnorar, onManual, onWhatsApp }: {
  entrada: EntradaListaEspera
  salvando: boolean
  onIgnorar: () => void
  onManual: () => void
  onWhatsApp: () => void
}) {
  const temWhatsApp = !!entrada.paciente_telefone

  return (
    <div className="rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] p-4 space-y-3">
      {/* Info do paciente */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <User2 size={14} className="text-[#7F8C8D] flex-shrink-0" />
            <span className="font-bold text-[#2C3E50] text-sm">{entrada.paciente_nome}</span>
            {entrada.notificar_automaticamente
              ? <span className="flex items-center gap-1 text-[10px] text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5"><Bell size={9} />Auto</span>
              : <span className="flex items-center gap-1 text-[10px] text-[#7F8C8D] bg-[#F8F9FA] border border-[#E8E8E8] rounded-full px-2 py-0.5"><BellOff size={9} />Manual</span>
            }
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#7F8C8D]">
            {entrada.servico_nome && (
              <span className="flex items-center gap-1">
                <Stethoscope size={11} />
                {entrada.servico_nome}
              </span>
            )}
            {entrada.profissional_nome && (
              <span className="flex items-center gap-1">
                <User2 size={11} />
                {entrada.profissional_nome}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {fmtData(entrada.data_inicio)}
              {entrada.data_fim !== entrada.data_inicio && ` â†’ ${fmtData(entrada.data_fim)}`}
            </span>
            {entrada.hora_inicio && (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {entrada.hora_inicio}{entrada.hora_fim ? ` â€“ ${entrada.hora_fim}` : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* AÃ§Ãµes */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <button
          onClick={onIgnorar}
          disabled={salvando}
          className="px-4 py-1.5 rounded-full text-xs font-medium text-[#7F8C8D] border border-[#E8E8E8] hover:bg-[#F8F9FA] disabled:opacity-50"
        >
          Ignorar
        </button>
        <button
          onClick={onManual}
          disabled={salvando}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium text-[#2C3E50] border border-[#E8E8E8] hover:bg-[#F8F9FA] disabled:opacity-50"
        >
          <Phone size={12} />
          Liguei / Avisei
        </button>
        {temWhatsApp && (
          <button
            onClick={onWhatsApp}
            disabled={salvando}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-[#25D366] hover:bg-[#1ebe5d] disabled:opacity-50"
          >
            <MessageCircle size={12} />
            WhatsApp
          </button>
        )}
        {salvando && (
          <span className="text-xs text-[#7F8C8D] animate-pulse">Salvandoâ€¦</span>
        )}
      </div>
    </div>
  )
}

