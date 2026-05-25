import { redirect } from 'next/navigation'

// Esta rota foi consolidada em /equipe (aba Serviços).
export default function ServicosPage() {
  redirect('/equipe?aba=servicos')
}
