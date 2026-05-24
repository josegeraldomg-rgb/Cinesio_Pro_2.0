'use client'

import { Lock } from 'lucide-react'
import { countAtivas, type PerfilDef } from '@/lib/permissoes'
import type { UsuarioRow } from '@/app/(dashboard)/usuarios/usuarios-client'

interface Props {
  perfis: PerfilDef[]
  usuarios: UsuarioRow[]
  onEdit: (id: string) => void
}

export function PerfisGrid({ perfis, usuarios, onEdit }: Props) {
  function contarUsuarios(perfilId: string) {
    return usuarios.filter(u => u.perfil === perfilId).length
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {perfis.map(perfil => {
        const total = countAtivas(perfil)
        const qt = contarUsuarios(perfil.id)
        return (
          <button
            key={perfil.id}
            onClick={() => onEdit(perfil.id)}
            className="text-left bg-white rounded-2xl p-5 border border-[#E8E8E8] hover:border-[#4A3AE8] hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: `${perfil.cor}1A`, color: perfil.cor }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>{perfil.icon}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {perfil.id === 'dev' && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                    style={{ color: perfil.cor, background: `${perfil.cor}15`, border: `1px solid ${perfil.cor}30` }}
                  >
                    <Lock size={10} />
                    Bloqueado
                  </span>
                )}
                {perfil.padrao && perfil.id !== 'dev' && (
                  <span className="text-[10px] font-semibold text-[#7F8C8D] bg-[#F8F9FA] border border-[#E8E8E8] rounded-full px-2.5 py-0.5">
                    Padrão
                  </span>
                )}
              </div>
            </div>
            <h3 className="font-bold text-[#2C3E50] text-base mb-1">{perfil.nome}</h3>
            <p className="text-sm text-[#7F8C8D] mb-5 line-clamp-2 min-h-[2.5rem]">{perfil.descricao}</p>
            <div className="flex items-center justify-between text-xs pt-4 border-t border-[#F0F0F0]">
              <span className="text-[#7F8C8D]">{total} permissões</span>
              <span className="text-[#7F8C8D]">{qt} {qt === 1 ? 'usuário' : 'usuários'}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
