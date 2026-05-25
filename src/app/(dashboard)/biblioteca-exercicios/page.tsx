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

  // Coleta erros para exibir diagnóstico
  const erros = [
    'error' in exerciciosRes ? `Exercícios: ${exerciciosRes.error}` : null,
    'error' in sequenciasRes ? `Sequências: ${sequenciasRes.error}` : null,
    'error' in planosRes ? `Planos: ${planosRes.error}` : null,
  ].filter(Boolean)

  const exercicios = 'exercicios' in exerciciosRes ? exerciciosRes.exercicios : []
  const sequencias = 'sequencias' in sequenciasRes ? sequenciasRes.sequencias : []
  const planos = 'planos' in planosRes ? planosRes.planos : []
  const pacientes = 'pacientes' in pacientesRes ? pacientesRes.pacientes : []
  const profissionais = 'profissionais' in profissionaisRes ? profissionaisRes.profissionais : []

  return (
    <>
      {erros.length > 0 && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <p className="font-semibold mb-1">⚠ Erro ao carregar dados. Verifique se as migrations foram aplicadas:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {erros.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
          <p className="mt-2 text-xs text-red-500">Execute as migrations 014 e 015 e os seeds no Supabase SQL Editor.</p>
        </div>
      )}
      <BibliotecaClient
        exerciciosIniciais={exercicios}
        sequenciasIniciais={sequencias}
        planosIniciais={planos}
        pacientes={pacientes}
        profissionais={profissionais}
      />
    </>
  )
}
