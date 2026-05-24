'use client'

import { Check, Minus } from 'lucide-react'
import { MODULOS, ACOES, ACOES_LABEL, type PerfilDef } from '@/lib/permissoes'

interface Props {
  perfis: PerfilDef[]
}

export function MatrizTab({ perfis }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F8F9FA] border-b border-[#E8E8E8]">
              <th
                rowSpan={2}
                className="text-left text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider px-4 py-3 sticky left-0 bg-[#F8F9FA] z-10 border-r border-[#E8E8E8]"
              >
                Módulo
              </th>
              {perfis.map(p => (
                <th
                  key={p.id}
                  colSpan={4}
                  className="text-center text-xs font-bold uppercase tracking-wider px-4 py-3 border-l border-[#E8E8E8]"
                  style={{ color: p.cor }}
                >
                  {p.nome}
                </th>
              ))}
            </tr>
            <tr className="bg-[#F8F9FA] border-b border-[#E8E8E8]">
              {perfis.flatMap(p =>
                ACOES.map(a => (
                  <th
                    key={`${p.id}-${a}`}
                    className="text-[10px] font-semibold text-[#7F8C8D] px-2 py-2 border-l border-[#E8E8E8] uppercase"
                    title={ACOES_LABEL[a]}
                  >
                    {ACOES_LABEL[a].slice(0, 3)}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {MODULOS.map((modulo, idx) => (
              <tr
                key={modulo.id}
                className={`${idx % 2 === 1 ? 'bg-[#FAFBFC]' : 'bg-white'} border-b border-[#F0F0F0] last:border-0`}
              >
                <td className={`px-4 py-3 sticky left-0 ${idx % 2 === 1 ? 'bg-[#FAFBFC]' : 'bg-white'} border-r border-[#E8E8E8]`}>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#7F8C8D]" style={{ fontSize: 18 }}>
                      {modulo.icon}
                    </span>
                    <span className="text-sm font-medium text-[#2C3E50]">{modulo.nome}</span>
                    {modulo.devOnly && (
                      <span className="text-[9px] uppercase font-bold text-[#8E44AD] bg-[#8E44AD]/10 rounded px-1.5 py-0.5">
                        Dev
                      </span>
                    )}
                  </div>
                </td>
                {perfis.flatMap(p =>
                  ACOES.map(a => {
                    const on = p.permissoes[modulo.id]?.[a] ?? false
                    return (
                      <td
                        key={`${p.id}-${a}-${modulo.id}`}
                        className="px-2 py-3 text-center border-l border-[#F0F0F0]"
                      >
                        {on ? (
                          <span className="inline-flex w-5 h-5 rounded-full bg-[#27AE60] text-white items-center justify-center">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        ) : (
                          <span className="inline-flex w-5 h-5 rounded-full bg-[#F0F0F0] text-[#BDC3C7] items-center justify-center">
                            <Minus size={12} />
                          </span>
                        )}
                      </td>
                    )
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
