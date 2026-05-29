// Utilitários compartilhados entre server actions e client components.
// Este arquivo NÃO tem 'use server' — pode exportar constantes e funções síncronas.

export const ORIENTACAO_TAGS: { tag: string; label: string; exemplo: string }[] = [
  { tag: '[[cliente_nome]]',      label: 'Nome do paciente',  exemplo: 'Maria Silva'          },
  { tag: '[[servico_nome]]',      label: 'Nome do serviço',   exemplo: 'Avaliação Física'      },
  { tag: '[[profissional_nome]]', label: 'Profissional',      exemplo: 'Dr. João Oliveira'     },
  { tag: '[[data_agendamento]]',  label: 'Data',              exemplo: '28/05/2026'            },
  { tag: '[[hora_agendamento]]',  label: 'Horário',           exemplo: '14:30'                 },
]

export function renderOrientacao(
  mensagem: string,
  vars: Record<string, string>,
): string {
  return Object.entries(vars).reduce(
    (acc, [key, val]) => acc.split(`[[${key}]]`).join(val),
    mensagem,
  )
}
