'use client'

import { useState } from 'react'
import { ArrowLeft, Save, Check, Lock } from 'lucide-react'
import { MODULOS, ACOES, ACOES_LABEL, countAtivas, type PerfilDef, type Acao } from '@/lib/permissoes'

interface Props {
  perfil: PerfilDef
  onBack: () => void
  onSave: (p: PerfilDef) => void
}

export function PerfilEditor({ perfil: inicial, onBack, onSave }: Props) {
  const [perfil, setPerfil] = useState<PerfilDef>(inicial)

  // Perfil Desenvolvedor é IMUTÁVEL: garante que um admin não possa
  // remover suas próprias permissões por engano e ficar trancado fora.
  const locked = perfil.id === 'dev'

  function setAcao(moduloId: string, acao: Acao, valor: boolean) {
    if (locked) return
    setPerfil(p => {
      const atual = p.permissoes[moduloId] ?? { visualizar: false, criar: false, editar: false, excluir: false }
      return {
        ...p,
        permissoes: {
          ...p.permissoes,
          [moduloId]: { ...atual, [acao]: valor },
        },
      }
    })
  }

  function setAllModulo(moduloId: string, ativo: boolean) {
    if (locked) return
    setPerfil(p => ({
      ...p,
      permissoes: {
        ...p.permissoes,
        [moduloId]: { visualizar: ativo, criar: ativo, editar: ativo, excluir: ativo },
      },
    }))
  }

  const total = countAtivas(perfil)
  const modulosVisiveis = MODULOS.filter(m => !m.devOnly || perfil.id === 'dev')

  return (
    <div className="space-y-6">
      {/* Header com Voltar + Identidade + Salvar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onBack}
            className="text-sm text-[#7F8C8D] hover:text-[#2C3E50] flex items-center gap-1 flex-shrink-0"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${perfil.cor}1A`, color: perfil.cor }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>{perfil.icon}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-[#2C3E50] text-lg leading-tight truncate">{perfil.nome}</h2>
                {locked && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#8E44AD] bg-[#8E44AD]/10 border border-[#8E44AD]/20 rounded-full px-2 py-0.5 flex-shrink-0">
                    <Lock size={11} />
                    Bloqueado
                  </span>
                )}
              </div>
              <p className="text-xs text-[#7F8C8D] truncate">
                {perfil.descricao} · <span className="font-semibold text-[#2C3E50]">{total}</span> permissões ativas
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => onSave(perfil)}
          disabled={locked}
          className="flex items-center gap-2 bg-[#4A3AE8] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#3829c7] shadow-md flex-shrink-0 disabled:bg-[#BDC3C7] disabled:hover:bg-[#BDC3C7] disabled:cursor-not-allowed disabled:shadow-none"
        >
          <Save size={16} />
          Salvar
        </button>
      </div>

      {/* Aviso de bloqueado — só aparece no perfil Desenvolvedor */}
      {locked && (
        <div className="flex items-start gap-3 bg-[#8E44AD]/5 border border-[#8E44AD]/20 rounded-2xl px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-[#8E44AD]/15 text-[#8E44AD] flex items-center justify-center flex-shrink-0">
            <Lock size={14} />
          </div>
          <div className="text-sm">
            <p className="font-semibold text-[#2C3E50]">Este perfil é imutável.</p>
            <p className="text-[#7F8C8D] text-xs mt-0.5">
              O <strong>Desenvolvedor</strong> mantém acesso total ao sistema permanentemente — isso impede que um administrador
              remova suas próprias permissões por engano e fique trancado fora do CinesioPro.
            </p>
          </div>
        </div>
      )}

      {/* Grid de módulos */}
      <div className="grid grid-cols-2 gap-4">
        {modulosVisiveis.map(modulo => {
          const perms = perfil.permissoes[modulo.id] ?? { visualizar: false, criar: false, editar: false, excluir: false }
          const ativas = ACOES.filter(a => perms[a]).length
          const todas  = ativas === 4

          return (
            <div
              key={modulo.id}
              className={`bg-white rounded-2xl border border-[#E8E8E8] p-5 ${locked ? 'opacity-95' : ''}`}
            >
              {/* Cabeçalho do módulo */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#4A3AE8]/10 text-[#4A3AE8] flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{modulo.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-[#2C3E50] text-sm">{modulo.nome}</h4>
                    <p className="text-xs text-[#7F8C8D]">{ativas}/4 ativas</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-[#7F8C8D]">{todas ? 'Todas' : ativas === 0 ? 'Nenhuma' : 'Algumas'}</span>
                  <button
                    onClick={() => setAllModulo(modulo.id, !todas)}
                    disabled={locked}
                    aria-label={todas ? 'Desativar todas' : 'Ativar todas'}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      todas ? 'bg-[#4A3AE8]' : 'bg-[#E8E8E8]'
                    } ${locked ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow ${
                        todas ? 'translate-x-[22px]' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* As 4 ações */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {ACOES.map(acao => {
                  const on = perms[acao]
                  return (
                    <button
                      key={acao}
                      onClick={() => setAcao(modulo.id, acao, !on)}
                      disabled={locked}
                      className={`flex items-center gap-2 text-sm group ${locked ? 'cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                          on
                            ? 'bg-[#27AE60] text-white'
                            : 'bg-white border-2 border-[#E8E8E8] text-transparent group-hover:border-[#BDC3C7]'
                        }`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span className={on ? 'text-[#2C3E50]' : 'text-[#7F8C8D]'}>{ACOES_LABEL[acao]}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
