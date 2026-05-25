import { redirect } from 'next/navigation'

// Esta rota foi consolidada em /equipe (aba Horários).
export default function HorariosPage() {
  redirect('/equipe?aba=horarios')
}
