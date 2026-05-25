import { redirect } from 'next/navigation'

// Esta rota foi consolidada em /equipe (aba Colaboradores).
export default function UsuariosPage() {
  redirect('/equipe')
}
