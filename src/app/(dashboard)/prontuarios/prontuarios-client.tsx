'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PacienteResumo } from './actions'

function iniciais(nome: string) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

function formatarTelefone(tel: string | null): string {
  if (!tel) return ''
  const d = tel.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return tel
}

export function ProntuariosClient({ pacientes }: { pacientes: PacienteResumo[] }) {
  const router = useRouter()
  const [busca, setBusca] = useState('')

  const filtrados = pacientes.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (p.email ?? '').toLowerCase().includes(busca.toLowerCase()) ||
    (p.telefone ?? '').includes(busca)
  )

  return (
    <div className="min-h-screen" style={{ background: '#EDEFF3' }}>
      <div className="max-w-3xl mx-auto px-4 py-4">

        {/* Busca */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm px-4 py-3 mb-5 flex items-center gap-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2} width={18} height={18} className="flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
          </svg>
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar prontuário por nome do paciente..."
            className="flex-1 text-sm text-[#334155] placeholder:text-[#94A3B8] outline-none bg-transparent"
          />
        </div>

        {/* Lista */}
        <div className="space-y-2">
          {filtrados.length === 0 && (
            <div className="text-center py-16 text-[#94A3B8]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={40} height={40} className="mx-auto mb-3 opacity-40">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/>
              </svg>
              <p className="text-sm font-medium">Nenhum prontuário encontrado</p>
            </div>
          )}

          {filtrados.map(pac => {
            const pendente = pac.status !== 'ativo'
            const tel = formatarTelefone(pac.telefone)

            return (
              <button
                key={pac.id}
                onClick={() => router.push(`/prontuarios/${pac.id}`)}
                className={`w-full text-left bg-white rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm transition-all cursor-pointer hover:bg-[#F8FAFC] hover:shadow-md hover:-translate-y-0.5 ${
                  pendente ? 'border border-dashed border-orange-300' : 'border border-[#E2E8F0] hover:border-[#CBD5E1]'
                }`}
              >
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                  style={{ background: '#3B82F6' }}
                >
                  {iniciais(pac.nome)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[#1E293B] text-sm">{pac.nome}</span>
                    {pendente && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-600 flex-shrink-0">
                        Pendente Ativação
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[12px] text-[#64748B] flex-wrap">
                    {/* Contador */}
                    <span className="flex items-center gap-1">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={12} height={12}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/>
                      </svg>
                      {pac.total_registros > 0
                        ? `${pac.total_registros} registro${pac.total_registros !== 1 ? 's' : ''}`
                        : 'Nenhum registro'}
                    </span>
                    {tel && <><span className="text-[#CBD5E1]">•</span><span>{tel}</span></>}
                    {!tel && <><span className="text-[#CBD5E1]">•</span><span className="text-[#94A3B8]">Sem telefone</span></>}
                    {pac.email && <><span className="text-[#CBD5E1]">•</span><span className="truncate max-w-[180px]">{pac.email}</span></>}
                  </div>
                </div>

                {/* Chevron */}
                <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth={2} width={18} height={18} className="flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                </svg>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
