'use client'

import { useState } from 'react'
import { Plus, Shield } from 'lucide-react'
import type { PerfilDef } from '@/lib/permissoes'
import type { UsuarioRow, ServicoResumo } from '@/app/(dashboard)/usuarios/usuarios-client'
import { NovoUsuarioWizard } from '@/components/usuarios/novo-usuario-wizard'
import { Avatar } from '@/components/ui/avatar'

interface Props {
  usuarios: UsuarioRow[]
  perfis: PerfilDef[]
  servicos: ServicoResumo[]
  podeCriar: boolean
}

export function UsuariosTab({ usuarios, perfis, servicos, podeCriar }: Props) {
  const [showWizard, setShowWizard] = useState(false)

  function perfilDe(id: string) {
    return perfis.find(p => p.id === id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#7F8C8D]">
          {usuarios.length} {usuarios.length === 1 ? 'usuário cadastrado' : 'usuários cadastrados'}
        </p>
        {podeCriar && (
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 bg-[#4A3AE8] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#3829c7] shadow-md"
          >
            <Plus size={16} />
            Novo Usuário
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F8F9FA] border-b border-[#E8E8E8]">
            <tr>
              <th className="text-left text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">Usuário</th>
              <th className="text-left text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">Perfil</th>
              <th className="text-left text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-right text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider px-5 py-3">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-sm text-[#7F8C8D]">
                  Nenhum usuário cadastrado ainda
                </td>
              </tr>
            ) : (
              usuarios.map(u => {
                const p = perfilDe(u.perfil)
                const ativo = u.ativo !== false
                return (
                  <tr key={u.id} className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#F8F9FA]/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.nome || u.email} src={u.avatar_url} size="md" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#2C3E50] truncate">{u.nome || '—'}</p>
                          <p className="text-xs text-[#7F8C8D] truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{
                          color: p?.cor ?? '#7F8C8D',
                          background: p ? `${p.cor}15` : '#F0F0F0',
                        }}
                      >
                        <Shield size={12} />
                        {p?.nome ?? u.perfil}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${
                          ativo
                            ? 'text-[#27AE60] bg-[#27AE60]/10'
                            : 'text-[#7F8C8D] bg-[#F0F0F0]'
                        }`}
                      >
                        {ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-[#7F8C8D]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {showWizard && podeCriar && (
        <NovoUsuarioWizard
          perfis={perfis}
          servicos={servicos}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  )
}
