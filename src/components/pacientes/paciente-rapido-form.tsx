'use client'

import { useState } from 'react'
import { X, AlertCircle, Send, Copy, CheckCircle2, ExternalLink, Zap } from 'lucide-react'
import { DDISelector } from './ddi-selector'
import { criarPacienteRapidoAction } from '@/app/(dashboard)/pacientes/actions'

interface Props {
  onClose: () => void
}

interface ResultadoRapido {
  link: string
  enviado: boolean
}

export function PacienteRapidoForm({ onClose }: Props) {
  const [ddi, setDdi]           = useState('55')
  const [telefone, setTelefone] = useState('')
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoRapido | null>(null)
  const [copiado, setCopiado]   = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setErr(null)
    const r = await criarPacienteRapidoAction(new FormData(e.currentTarget))
    setLoading(false)
    if (r?.error) {
      setErr(r.error)
    } else {
      setResultado({
        link: r.link ?? '',
        enviado: !!r.whatsapp?.enviado,
      })
    }
  }

  function copiar() {
    if (!resultado?.link) return
    navigator.clipboard.writeText(resultado.link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1800)
  }

  function fechar() {
    onClose()
    if (resultado) window.location.reload()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8]">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-[#F39C12]" />
            <h2 className="font-bold text-[#2C3E50] text-lg">Cadastro Rápido</h2>
          </div>
          <button onClick={fechar} className="p-2 rounded-full hover:bg-[#F8F9FA] text-[#7F8C8D]">
            <X size={18} />
          </button>
        </div>

        {/* RESULTADO — após criar */}
        {resultado ? (
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 bg-[#27AE60]/10 border border-[#27AE60]/30 rounded-xl p-3">
              <CheckCircle2 size={18} className="text-[#27AE60] mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-[#2C3E50]">Paciente criado!</p>
                <p className="text-xs text-[#7F8C8D] mt-0.5">
                  {resultado.enviado
                    ? 'O link de auto-cadastro foi enviado por WhatsApp.'
                    : 'O envio automático ainda não está configurado — use o link abaixo manualmente.'}
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">
                Link único para o paciente completar (válido por 7 dias)
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={resultado.link}
                  className="flex-1 h-10 px-3 rounded-lg border border-[#E8E8E8] bg-[#F8F9FA] text-xs font-mono text-[#2C3E50] outline-none"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={copiar}
                  className="flex items-center gap-1.5 px-3 h-10 rounded-lg bg-[#4A3AE8] text-white text-xs font-semibold hover:bg-[#3829c7] shadow-sm flex-shrink-0"
                >
                  {copiado ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copiado ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            {!resultado.enviado && (
              <a
                href={`https://wa.me/${ddi}${telefone.replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Para finalizar seu cadastro: ' + resultado.link)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-[#27AE60] text-white text-sm font-semibold hover:bg-[#1f8b4d] shadow-md"
              >
                <ExternalLink size={14} />
                Abrir WhatsApp Web com mensagem pronta
              </a>
            )}

            <button
              onClick={fechar}
              className="w-full px-4 h-10 rounded-full text-sm font-medium text-[#7F8C8D] hover:bg-[#F8F9FA] border border-[#E8E8E8]"
            >
              Fechar
            </button>
          </div>
        ) : (
          /* FORM — antes de criar */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-xs text-[#7F8C8D] -mt-2">
              Cadastre só o essencial agora — o restante o próprio paciente preenche via link.
            </p>

            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Nome *</label>
              <input
                name="nome"
                required
                placeholder="Nome do paciente"
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              />
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

            <label className="flex items-start gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                name="enviar_completar"
                defaultChecked
                className="peer sr-only"
              />
              <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-md border-2 border-[#27AE60] peer-checked:bg-[#27AE60] transition-colors flex-shrink-0 mt-0.5">
                <CheckCircle2 size={11} className="text-white opacity-0 peer-checked:opacity-100" />
              </span>
              <div>
                <span className="text-sm font-medium text-[#2C3E50] flex items-center gap-1">
                  <Send size={12} />
                  Enviar para o paciente completar
                </span>
                <span className="text-xs text-[#7F8C8D]">
                  Gera link único e dispara mensagem por WhatsApp.
                </span>
              </div>
            </label>

            {err && (
              <div className="flex items-start gap-2 text-xs text-[#E74C3C] bg-[#E74C3C]/10 border border-[#E74C3C]/30 rounded-lg px-3 py-2">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{err}</span>
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
                type="submit"
                disabled={loading}
                className="bg-[#4A3AE8] text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#3829c7] disabled:opacity-50 shadow-md"
              >
                {loading ? 'Criando…' : 'Cadastrar e gerar link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
