'use client'

import { AvatarUpload } from '@/components/ui/avatar-upload'
import { uploadFotoPacienteAction } from '@/app/(dashboard)/perfil/actions'

interface Props {
  pacienteId: string
  nome: string
  fotoUrl: string | null
}

export function AvatarPaciente({ pacienteId, nome, fotoUrl }: Props) {
  return (
    <AvatarUpload
      name={nome}
      src={fotoUrl}
      size={64}
      onUpload={(fd) => uploadFotoPacienteAction(pacienteId, fd)}
    />
  )
}
