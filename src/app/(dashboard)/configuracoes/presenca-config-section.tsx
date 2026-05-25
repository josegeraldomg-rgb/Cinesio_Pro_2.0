'use client'

import { useState, useTransition } from 'react'
import { Clock, Gift, Save, CheckCircle2 } from 'lucide-react'
import { salvarConfigPresencaAction } from '@/app/(dashboard)/turmas/[id]/presenca/actions'
import type { ConfigPresenca } from '@/app/(dashboard)/turmas/[id]/presenca/actions'

interface Props {
  config: ConfigPresenca
}

export function PresencaConfigSection({ config }: Props) {
  const [travasHoras, setTravaHoras] = useState(config.trava_horas)
  const [validadeDias, setValidadeDias] = useState(config.validade_credito_dias)
  const [isPending, startTransition] = useTransition()
  const [ok, setOk] = useState(false)
  const [erro, setErro] = useState('')

  function salvar() {
    setErro('')
    startTransition(async () => {
      const res = await salvarConfigPresencaAction({
        trava_horas: travasHoras,
        validade_credito_dias: validadeDias,
      })
      if ('error' in res) {
        setErro(res.error)
      } else {
        setOk(true)
        setTimeout(() => setOk(false), 3000)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-[#7F8C8D] block mb-1.5">
            Travar edição após (horas)
          </label>
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-[#7F8C8D]" />
            <input
              type="number"
              min={1}
              max={720}
              value={travasHoras}
              onChange={e => setTravaHoras(Number(e.target.value))}
              className="w-24 border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A3AE8]/30"
            />
            <span className="text-sm text-[#7F8C8D]">horas após a sessão</span>
          </div>
          <p className="text-xs text-[#7F8C8D] mt-1">
            Após este prazo, a chamada não pode mais ser editada.
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-[#7F8C8D] block mb-1.5">
            Crédito de reposição válido por (dias)
          </label>
          <div className="flex items-center gap-2">
            <Gift size={15} className="text-[#7F8C8D]" />
            <input
              type="number"
              min={1}
              max={365}
              value={validadeDias}
              onChange={e => setValidadeDias(Number(e.target.value))}
              className="w-24 border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A3AE8]/30"
            />
            <span className="text-sm text-[#7F8C8D]">dias</span>
          </div>
          <p className="text-xs text-[#7F8C8D] mt-1">
            Prazo para o aluno usar o crédito de reposição gerado.
          </p>
        </div>
      </div>

      {erro && (
        <p className="text-sm text-red-600">{erro}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={salvar}
          disabled={isPending}
          className="flex items-center gap-2 bg-[#4A3AE8] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#3829c7] disabled:opacity-60 transition-colors"
        >
          <Save size={14} />
          {isPending ? 'Salvando…' : 'Salvar'}
        </button>
        {ok && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
            <CheckCircle2 size={14} />
            Salvo!
          </span>
        )}
      </div>
    </div>
  )
}
