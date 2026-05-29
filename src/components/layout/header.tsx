'use client'

import { Search, Bell, MessageSquare, Settings } from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

// Título e descrição por rota — define o cabeçalho dinâmico de cada tela
const PAGE_META: Record<string, { title: string; description: string }> = {
  '/dashboard':     { title: 'Painel',             description: 'Visão geral da clínica em tempo real' },
  '/agenda':        { title: 'Agenda',             description: 'Gerencie consultas, sessões e turmas' },
  '/pacientes':     { title: 'Pacientes',          description: 'Cadastro, evolução clínica e histórico' },
  '/prontuarios':   { title: 'Prontuários',        description: 'Ficha clínica completa do paciente' },
  '/turmas':        { title: 'Turmas',             description: 'Aulas em grupo, alunos e presenças' },
  '/equipe':        { title: 'Equipe',             description: 'Colaboradores, serviços e horários de trabalho' },
  '/financeiro':    { title: 'Financeiro',         description: 'Receitas, despesas, comissões e inadimplência' },
  '/relatorios':    { title: 'Relatórios',         description: 'Documentos clínicos e relatórios com IA' },
  '/whatsapp':      { title: 'WhatsApp',           description: 'Mensagens, lembretes e atendimento' },
  '/formularios':   { title: 'Formulários',        description: 'Crie e envie formulários aos pacientes' },
  '/portal':        { title: 'Portal do Paciente', description: 'Experiência do paciente: progresso e agendamentos' },
  '/configuracoes':         { title: 'Configurações',         description: 'Empresa, equipe, serviços e integrações' },
  '/biblioteca-exercicios': { title: 'Biblioteca de Exercícios', description: 'Gerencie exercícios, sequências de aula e planos de tratamento' },
}

function getPageMeta(pathname: string) {
  // Prefer exact match; fallback to first segment match
  if (PAGE_META[pathname]) return PAGE_META[pathname]
  const segment = '/' + (pathname.split('/').filter(Boolean)[0] ?? '')
  return PAGE_META[segment] ?? { title: '', description: '' }
}

export function Header({ marginLeft }: { marginLeft?: number }) {
  const [search, setSearch] = useState('')
  const pathname = usePathname()

  // Título dinâmico: páginas como prontuário individual enviam o nome via evento
  const [dynamicMeta, setDynamicMeta] = useState<{ title: string; description: string } | null>(null)
  useEffect(() => {
    function handler(e: Event) {
      const { title, description } = (e as CustomEvent<{ title: string; description: string }>).detail
      setDynamicMeta(title ? { title, description } : null)
    }
    window.addEventListener('page-title-change', handler)
    return () => window.removeEventListener('page-title-change', handler)
  }, [])

  // Limpa o título dinâmico ao navegar para outra rota
  useEffect(() => { setDynamicMeta(null) }, [pathname])

  const { title, description } = dynamicMeta ?? getPageMeta(pathname)

  return (
    <header
      className="h-20 flex items-center justify-between px-6 fixed top-0 right-0 z-40 transition-[left] duration-300 ease-in-out"
      style={{ background: 'transparent', left: marginLeft ?? 280 }}
    >
      {/* Título + descrição da tela */}
      <div className="flex flex-col justify-center min-w-0">
        <h1 className="text-[#2C3E50] font-bold text-2xl leading-tight truncate">
          {title}
        </h1>
        {description && (
          <p className="text-[#7F8C8D] text-sm mt-0.5 leading-tight truncate">
            {description}
          </p>
        )}
      </div>

      {/* Busca + ações (alinhados à direita) */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="h-9 w-56 pl-9 pr-4 rounded-full bg-white/70 backdrop-blur border border-[#E8E8E8] text-sm text-[#2C3E50] placeholder:text-[#7F8C8D] outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10 focus:w-72 transition-all"
          />
        </div>

        <Link
          href="/notificacoes"
          className="relative p-2.5 rounded-full bg-white/70 backdrop-blur hover:bg-white text-[#7F8C8D] hover:text-[#2C3E50] transition-colors"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E74C3C] rounded-full" />
        </Link>
        <Link
          href="/whatsapp"
          className="p-2.5 rounded-full bg-white/70 backdrop-blur hover:bg-white text-[#7F8C8D] hover:text-[#2C3E50] transition-colors"
        >
          <MessageSquare size={18} />
        </Link>
        <Link
          href="/configuracoes"
          className="p-2.5 rounded-full bg-white/70 backdrop-blur hover:bg-white text-[#7F8C8D] hover:text-[#2C3E50] transition-colors"
        >
          <Settings size={18} />
        </Link>
      </div>
    </header>
  )
}
