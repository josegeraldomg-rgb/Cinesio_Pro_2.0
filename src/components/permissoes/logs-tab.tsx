'use client'

import { Activity, UserPlus, ShieldCheck, Settings, LogIn } from 'lucide-react'

// Stub: quando a tabela auditoria_log estiver populada, substituir por fetch real.
const MOCK = [
  { icon: UserPlus,    user: 'José Geraldo', action: 'criou o usuário',         target: 'Maria Silva',       when: 'há 2 minutos' },
  { icon: ShieldCheck, user: 'José Geraldo', action: 'alterou permissões do perfil', target: 'Recepcionista', when: 'há 1 hora'   },
  { icon: Settings,    user: 'Sistema',      action: 'atualizou configurações de',   target: 'WhatsApp',     when: 'há 3 horas'  },
  { icon: LogIn,       user: 'Ana Oliveira', action: 'fez login',                target: '',                 when: 'há 5 horas'  },
] as const

export function LogsTab() {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8]">
      {(MOCK as readonly unknown[]).length === 0 ? (
        <div className="text-center py-12 text-[#7F8C8D]">
          <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum evento registrado ainda</p>
        </div>
      ) : (
        <ul className="divide-y divide-[#F0F0F0]">
          {MOCK.map((l, i) => {
            const Icon = l.icon
            return (
              <li key={i} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-9 h-9 rounded-full bg-[#4A3AE8]/10 text-[#4A3AE8] flex items-center justify-center flex-shrink-0">
                  <Icon size={16} />
                </div>
                <div className="flex-1 text-sm min-w-0">
                  <span className="font-semibold text-[#2C3E50]">{l.user}</span>{' '}
                  <span className="text-[#7F8C8D]">{l.action}</span>
                  {l.target && (
                    <>
                      {' '}<span className="font-semibold text-[#2C3E50]">{l.target}</span>
                    </>
                  )}
                </div>
                <span className="text-xs text-[#7F8C8D] flex-shrink-0">{l.when}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
