'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { UsuariosClient, type UsuarioRow } from '../usuarios/usuarios-client'
import { ServicosClient, type Servico, type Categoria, type Vinculo } from '../servicos/servicos-client'
import { HorariosClient, type Profissional, type Turno } from '../horarios/horarios-client'

// Profissional é o superset de horarios (usuario_id + ativo),
// que satisfaz estruturalmente o tipo menor de servicos (sem esses campos).

type Aba = 'colaboradores' | 'servicos' | 'horarios'

interface Props {
  usuarios:          UsuarioRow[]
  servicos:          Servico[]        // superset de ServicoResumo — serve para ambas as abas
  categorias:        Categoria[]
  vinculos:          Vinculo[]
  profissionais:     Profissional[]   // superset — serve para ServicosClient e HorariosClient
  turnos:            Turno[]
  perfilAtual:       string
  podeEditar:        boolean          // admin/dev
  podeEditarHorarios: boolean         // admin/dev/profissional
}

const ABAS: { id: Aba; label: string; icon: string }[] = [
  { id: 'colaboradores', label: 'Colaboradores', icon: 'manage_accounts' },
  { id: 'servicos',      label: 'Serviços',      icon: 'medical_services' },
  { id: 'horarios',      label: 'Horários',      icon: 'schedule' },
]

function abaFromParam(param: string | null): Aba {
  if (param === 'servicos' || param === 'horarios') return param
  return 'colaboradores'
}

export function EquipeClient({
  usuarios, servicos, categorias, vinculos,
  profissionais, turnos,
  perfilAtual, podeEditar, podeEditarHorarios,
}: Props) {
  const searchParams = useSearchParams()
  const [aba, setAba] = useState<Aba>(() => abaFromParam(searchParams.get('aba')))

  return (
    <div className="space-y-6">
      {/* ── Barra de abas ─────────────────────────────────────────────── */}
      <div className="inline-flex p-1 bg-white rounded-full border border-[#E8E8E8] shadow-sm">
        {ABAS.map(a => {
          const active = aba === a.id
          return (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${
                active
                  ? 'bg-[#4A3AE8] text-white shadow-sm'
                  : 'text-[#7F8C8D] hover:text-[#2C3E50]'
              }`}
            >
              <span
                className="material-symbols-outlined leading-none"
                style={{
                  fontSize: 17,
                  fontVariationSettings: active ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400",
                }}
              >
                {a.icon}
              </span>
              {a.label}
            </button>
          )
        })}
      </div>

      {/* ── Conteúdo da aba ───────────────────────────────────────────── */}
      {aba === 'colaboradores' && (
        <UsuariosClient
          usuarios={usuarios}
          servicos={servicos}
          perfilAtual={perfilAtual}
        />
      )}

      {aba === 'servicos' && (
        <ServicosClient
          servicos={servicos}
          categorias={categorias}
          profissionais={profissionais}
          vinculos={vinculos}
          podeEditar={podeEditar}
        />
      )}

      {aba === 'horarios' && (
        <HorariosClient
          profissionais={profissionais}
          turnos={turnos}
          ausencias={[]}
          podeEditar={podeEditarHorarios}
        />
      )}
    </div>
  )
}
