'use client'

import { useState } from 'react'
import { Shield, Users, LayoutGrid, Activity } from 'lucide-react'
import { PERFIS_PADRAO, type PerfilDef } from '@/lib/permissoes'
import { PerfisGrid } from '@/components/permissoes/perfis-grid'
import { PerfilEditor } from '@/components/permissoes/perfil-editor'
import { UsuariosTab } from '@/components/permissoes/usuarios-tab'
import { MatrizTab } from '@/components/permissoes/matriz-tab'
import { LogsTab } from '@/components/permissoes/logs-tab'

type Tab = 'perfis' | 'usuarios' | 'matriz' | 'logs'

export interface UsuarioRow {
  id: string
  nome: string
  email: string
  perfil: string
  ativo: boolean | null
  created_at: string | null
  avatar_url?: string | null
}

export interface ServicoResumo {
  id: string
  nome: string
  duracao_minutos: number
  valor: number
  cor: string | null
  icone: string | null
  categoria_id: string | null
  ativo: boolean
}

interface Props {
  usuarios: UsuarioRow[]
  servicos: ServicoResumo[]
  perfilAtual: string
}

export function UsuariosClient({ usuarios, servicos, perfilAtual }: Props) {
  const [tab, setTab] = useState<Tab>('perfis')
  const [perfis, setPerfis] = useState<PerfilDef[]>(PERFIS_PADRAO)
  const [editingId, setEditingId] = useState<string | null>(null)

  const editing = perfis.find(p => p.id === editingId)

  function savePerfil(updated: PerfilDef) {
    setPerfis(prev => prev.map(p => (p.id === updated.id ? updated : p)))
    setEditingId(null)
    // TODO: persistir em DB quando existir tabela `perfis`
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'perfis',   label: 'Perfis',   icon: <Shield size={15} /> },
    { id: 'usuarios', label: 'Usuários', icon: <Users size={15} /> },
    { id: 'matriz',   label: 'Matriz',   icon: <LayoutGrid size={15} /> },
    { id: 'logs',     label: 'Logs',     icon: <Activity size={15} /> },
  ]

  // Quando está editando um perfil, esconde as tabs e mostra o editor
  if (editing) {
    return (
      <PerfilEditor
        perfil={editing}
        onBack={() => setEditingId(null)}
        onSave={savePerfil}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs (pill group) */}
      <div className="inline-flex p-1 bg-white rounded-full border border-[#E8E8E8] shadow-sm">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-[#F8F9FA] text-[#2C3E50] shadow-sm'
                : 'text-[#7F8C8D] hover:text-[#2C3E50]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'perfis'   && <PerfisGrid perfis={perfis} usuarios={usuarios} onEdit={setEditingId} />}
      {tab === 'usuarios' && <UsuariosTab usuarios={usuarios} perfis={perfis} servicos={servicos} podeCriar={['admin', 'dev'].includes(perfilAtual)} />}
      {tab === 'matriz'   && <MatrizTab perfis={perfis} />}
      {tab === 'logs'     && <LogsTab />}
    </div>
  )
}
