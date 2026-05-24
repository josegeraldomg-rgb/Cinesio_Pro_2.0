'use client'

import { Clock, Globe, Users, Pencil, Power } from 'lucide-react'
import { toggleServicoAtivoAction } from '@/app/(dashboard)/servicos/actions'
import { formatCurrency } from '@/lib/utils'
import type { Servico, Categoria, Profissional, Vinculo } from '@/app/(dashboard)/servicos/servicos-client'

interface Props {
  servicos: Servico[]
  categorias: Categoria[]
  vinculos: Vinculo[]
  profissionais: Profissional[]
  podeEditar: boolean
  onEdit: (s: Servico) => void
  onVincular: (s: Servico) => void
}

export function ListaServicos({ servicos, categorias, vinculos, profissionais, podeEditar, onEdit, onVincular }: Props) {
  if (servicos.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-12 text-center">
        <p className="text-sm text-[#7F8C8D]">
          Nenhum serviço cadastrado ainda. {podeEditar && 'Clique em "Novo Serviço" para começar.'}
        </p>
      </div>
    )
  }

  // Agrupa por categoria
  const semCategoria: Servico[] = []
  const porCategoria = new Map<string, Servico[]>()
  for (const s of servicos) {
    if (!s.categoria_id) semCategoria.push(s)
    else {
      const arr = porCategoria.get(s.categoria_id) ?? []
      arr.push(s)
      porCategoria.set(s.categoria_id, arr)
    }
  }

  const categoriasOrdenadas = [...categorias].sort((a, b) => a.ordem - b.ordem)

  function countProfissionais(servicoId: string) {
    return vinculos.filter(v => v.servico_id === servicoId).length
  }

  function renderGrupo(titulo: string, cor: string, icone: string, lista: Servico[]) {
    if (lista.length === 0) return null
    return (
      <div key={titulo} className="space-y-3">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${cor}15`, color: cor }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icone}</span>
          </span>
          <h3 className="font-bold text-[#2C3E50] text-sm">{titulo}</h3>
          <span className="text-xs text-[#7F8C8D]">· {lista.length}</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {lista.map(s => {
            const qtProf = countProfissionais(s.id)
            const ativo = s.ativo
            const corPill = s.cor || cor
            return (
              <div
                key={s.id}
                className={`bg-white rounded-2xl border border-[#E8E8E8] p-5 flex flex-col ${
                  !ativo ? 'opacity-60' : ''
                }`}
              >
                {/* Cabeçalho */}
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${corPill}15`, color: corPill }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                      {s.icone || icone}
                    </span>
                  </div>
                  {s.permite_agendamento_online && (
                    <span
                      title="Disponível para agendamento online"
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#27AE60] bg-[#27AE60]/10 rounded-full px-2 py-0.5"
                    >
                      <Globe size={11} />
                      Online
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-[#2C3E50] text-base mb-1 truncate">{s.nome}</h4>
                {s.descricao && (
                  <p className="text-xs text-[#7F8C8D] mb-3 line-clamp-2 min-h-[2rem]">{s.descricao}</p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-[#7F8C8D] mt-auto pt-3 border-t border-[#F0F0F0]">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {s.duracao_minutos}min
                  </span>
                  <span className="font-bold text-[#27AE60]">{formatCurrency(s.valor)}</span>
                  <button
                    onClick={() => onVincular(s)}
                    className="flex items-center gap-1 ml-auto hover:text-[#4A3AE8] transition-colors"
                    title="Vincular profissionais"
                  >
                    <Users size={12} />
                    {qtProf}
                  </button>
                </div>

                {/* Ações — sempre visíveis (Server Action valida permissão) */}
                <div className="flex items-center gap-1 pt-3 mt-3 border-t border-[#F0F0F0]">
                  <button
                    onClick={() => onEdit(s)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#4A3AE8] hover:bg-[#4A3AE8]/5 rounded-lg py-1.5 transition-colors"
                  >
                    <Pencil size={12} />
                    Editar
                  </button>
                  <button
                    onClick={() => onVincular(s)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#3498DB] hover:bg-[#3498DB]/5 rounded-lg py-1.5 transition-colors"
                  >
                    <Users size={12} />
                    Profissionais
                  </button>
                  <button
                    onClick={async () => {
                      await toggleServicoAtivoAction(s.id, !ativo)
                      window.location.reload()
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg py-1.5 transition-colors ${
                      ativo
                        ? 'text-[#E67E22] hover:bg-[#E67E22]/5'
                        : 'text-[#27AE60] hover:bg-[#27AE60]/5'
                    }`}
                  >
                    <Power size={12} />
                    {ativo ? 'Pausar' : 'Ativar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {categoriasOrdenadas.map(c =>
        renderGrupo(c.nome, c.cor, c.icone, porCategoria.get(c.id) ?? [])
      )}
      {renderGrupo('Sem categoria', '#7F8C8D', 'help', semCategoria)}
    </div>
  )
}
