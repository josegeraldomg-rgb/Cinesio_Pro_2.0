'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { ModalEnviarFormulario } from './modal-enviar-formulario'

interface Props {
  pacienteId:       string
  pacienteNome:     string
  pacienteTelefone?: string
  pacienteDdi?:     string
  /** Estilo visual: 'button' (padrão) ou 'icon' (compacto) */
  variante?: 'button' | 'icon'
}

export function BtnAplicarFormulario({
  pacienteId, pacienteNome, pacienteTelefone, pacienteDdi, variante = 'button',
}: Props) {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      {variante === 'button' ? (
        <button
          onClick={() => setAberto(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: '#5b5fcf', boxShadow: '0 4px 12px rgba(91,95,207,0.3)' }}
        >
          <Send size={15} />
          Aplicar Formulário
        </button>
      ) : (
        <button
          onClick={() => setAberto(true)}
          title="Aplicar formulário"
          className="flex items-center justify-center w-9 h-9 rounded-xl text-[#5b5fcf] hover:bg-[#5b5fcf]/10 transition-colors"
        >
          <Send size={16} />
        </button>
      )}

      {aberto && (
        <ModalEnviarFormulario
          pacienteId={pacienteId}
          pacienteNome={pacienteNome}
          pacienteTelefone={pacienteTelefone}
          pacienteDdi={pacienteDdi}
          onClose={() => setAberto(false)}
        />
      )}
    </>
  )
}
