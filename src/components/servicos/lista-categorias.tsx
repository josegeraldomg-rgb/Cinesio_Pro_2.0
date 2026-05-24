'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { excluirCategoriaAction } from '@/app/(dashboard)/servicos/actions'
import type { Categoria, Servico } from '@/app/(dashboard)/servicos/servicos-client'

interface Props {
  categorias: Categoria[]
  servicos: Servico[]
  podeEditar: boolean
  onEdit: (c: Categoria) => void
}

export function ListaCategorias({ categorias, servicos, podeEditar, onEdit }: Props) {
  if (categorias.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-12 text-center">
        <p className="text-sm text-[#7F8C8D]">
          Nenhuma categoria cadastrada. {podeEditar && 'Clique em "Nova Categoria" para criar a primeira.'}
        </p>
      </div>
    )
  }

  async function excluir(c: Categoria) {
    const qt = servicos.filter(s => s.categoria_id === c.id).length
    const msg = qt > 0
      ? `Excluir "${c.nome}"? Os ${qt} serviço(s) vinculados ficarão sem categoria.`
      : `Excluir a categoria "${c.nome}"?`
    if (!confirm(msg)) return
    await excluirCategoriaAction(c.id)
    window.location.reload()
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {[...categorias].sort((a, b) => a.ordem - b.ordem).map(c => {
        const qt = servicos.filter(s => s.categoria_id === c.id).length
        return (
          <div key={c.id} className="bg-white rounded-2xl border border-[#E8E8E8] p-5">
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: `${c.cor}15`, color: c.cor }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>{c.icone}</span>
              </div>
              <span className="text-[10px] font-semibold text-[#7F8C8D] bg-[#F8F9FA] border border-[#E8E8E8] rounded-full px-2.5 py-0.5">
                Ordem: {c.ordem}
              </span>
            </div>
            <h3 className="font-bold text-[#2C3E50] text-base mb-1">{c.nome}</h3>
            {c.descricao && (
              <p className="text-xs text-[#7F8C8D] mb-3 line-clamp-2">{c.descricao}</p>
            )}
            <div className="flex items-center justify-between text-xs pt-4 border-t border-[#F0F0F0]">
              <span className="text-[#7F8C8D]">{qt} {qt === 1 ? 'serviço' : 'serviços'}</span>
              {podeEditar && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(c)}
                    className="p-1.5 rounded-lg text-[#4A3AE8] hover:bg-[#4A3AE8]/10 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => excluir(c)}
                    className="p-1.5 rounded-lg text-[#E74C3C] hover:bg-[#E74C3C]/10 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
