import { listarExerciciosBibliotecaAction, listarSequenciasBibliotecaAction, listarPlanosExerciciosAction, listarPacientesAction, listarProfissionaisAction } from './actions'
import { BibliotecaClient } from './biblioteca-client'

export default async function BibliotecaExerciciosPage() {
  const [exerciciosRes, sequenciasRes, planosRes, pacientesRes, profissionaisRes] = await Promise.all([
    listarExerciciosBibliotecaAction(),
    listarSequenciasBibliotecaAction(),
    listarPlanosExerciciosAction(),
    listarPacientesAction(),
    listarProfissionaisAction(),
  ])

  const exercicios = 'exercicios' in exerciciosRes ? exerciciosRes.exercicios : []
  const sequencias = 'sequencias' in sequenciasRes ? sequenciasRes.sequencias : []
  const planos = 'planos' in planosRes ? planosRes.planos : []
  const pacientes = 'pacientes' in pacientesRes ? pacientesRes.pacientes : []
  const profissionais = 'profissionais' in profissionaisRes ? profissionaisRes.profissionais : []

  return (
    <BibliotecaClient
      exerciciosIniciais={exercicios}
      sequenciasIniciais={sequencias}
      planosIniciais={planos}
      pacientes={pacientes}
      profissionais={profissionais}
    />
  )
}
